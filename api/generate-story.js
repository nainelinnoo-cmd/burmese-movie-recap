const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

async function generateEpisodicStory(topic, genre) {
  const prompt = `
You are a master Burmese series/movie scriptwriter.
Write an engaging 6-episode continuous story series in Burmese based on the topic: "${topic}" (Genre: ${genre}).
The story MUST connect logically from Ep 1 to Ep 6:
- Ep 1: Introduction & Mysterious Event
- Ep 2: Rising Suspense & First Clue
- Ep 3: The Threat Intensifies
- Ep 4: Major Plot Twist & Shocking Secret
- Ep 5: Climax & Confrontation
- Ep 6: Final Resolution & Meaningful Ending

OUTPUT FORMAT: Return strictly valid JSON only without markdown formatting.
JSON schema:
{
  "series_title": "ခေါင်းစဉ်",
  "episodes": [
    { "ep": 1, "title": "အပိုင်း ၁ ခေါင်းစဉ်", "text": "အပိုင်း ၁ ဇာတ်လမ်းစာသား (100-150 words in Burmese)" },
    { "ep": 2, "title": "အပိုင်း ၂ ခေါင်းစဉ်", "text": "အပိုင်း ၂ ဇာတ်လမ်းစာသား" },
    { "ep": 3, "title": "အပိုင်း ၃ ခေါင်းစဉ်", "text": "အပိုင်း ၃ ဇာတ်လမ်းစာသား" },
    { "ep": 4, "title": "အပိုင်း ၄ ခေါင်းစဉ်", "text": "အပိုင်း ၄ ဇာတ်လမ်းစာသား" },
    { "ep": 5, "title": "အပိုင်း ၅ ခေါင်းစဉ်", "text": "အပိုင်း ၅ ဇာတ်လမ်းစာသား" },
    { "ep": 6, "title": "အပိုင်း ၆ ခေါင်းစဉ်", "text": "အပိုင်း ၆ ဇာတ်လမ်းစာသား" }
  ]
}
`;

  let responseText = "";
  if (process.env.GEMINI_API_KEY) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      if (response && response.text) responseText = response.text.trim();
    } catch (err) {
      console.warn("Gemini episodic failed, trying Groq fallback:", err.message);
    }
  }

  if (!responseText) {
    const groqRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You output strictly valid JSON format only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    responseText = groqRes.choices[0]?.message?.content?.trim();
  }

  return JSON.parse(responseText);
}

async function fetchBurmeseVoice(text, voice) {
  const edgeVoice = voice === "edge-nilar" ? "my-MM-NilarNeural" : "my-MM-ThihaNeural";
  const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text] }),
  });

  if (!postRes.ok) throw new Error("Hugging Face Space ခေါ်ယူမှု မအောင်မြင်ပါ");
  const { event_id } = await postRes.json();

  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
  const streamText = await streamRes.text();
  const lines = streamText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const parsed = JSON.parse(line.replace("data:", "").trim());
      if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    }
  }
  throw new Error("အသံဒေတာ ပြန်မရပါ");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { topic, genre, voice, fetchAudioOnly, scriptText } = req.body;

    // အကယ်၍ Episode အသစ်အတွက် အသံတစ်ခုတည်း တောင်းဆိုခြင်းဖြစ်လျှင်
    if (fetchAudioOnly && scriptText) {
      const audioBase64 = await fetchBurmeseVoice(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    const seriesData = await generateEpisodicStory(topic, genre || "horror");
    // Ep 1 အတွက် အသံကို စတင်ထုတ်ယူပေးခြင်း
    const ep1Audio = await fetchBurmeseVoice(seriesData.episodes[0].text, voice);

    return res.status(200).json({
      series: seriesData,
      initialAudioBase64: ep1Audio
    });
  } catch (err) {
    console.error("Story Series Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်းတွဲ ဖန်တီးမှု မအောင်မြင်ပါ" });
  }
};
