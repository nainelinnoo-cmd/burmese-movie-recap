const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// Google Translate TTS ခေါ်ယူခြင်း (စက်ရုပ်သံမဆန်သော သဘာဝ မြန်မာအသံ)
async function fetchGoogleTTS(text) {
  const chunks = text.match(/[^။!?\n]+[။!?\n]?/g) || [text];
  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=my&client=tw-ob`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }
  }
  if (audioBuffers.length > 0) {
    return Buffer.concat(audioBuffers).toString("base64");
  }
  throw new Error("Google TTS မှ အသံရယူ၍ မရပါ");
}

// Edge-TTS (Hugging Face ZeroGPU) ခေါ်ယူခြင်း
async function fetchBurmeseVoice(text, voice) {
  if (voice && voice.startsWith("google-")) {
    try {
      return await fetchGoogleTTS(text);
    } catch (err) {
      console.warn("Google TTS fallback to Edge-TTS:", err.message);
    }
  }

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

// ၁။ တစ်ပိုင်းတည်းအပြီး Movie ရေးသားခြင်း
async function generateSingleMovie(topic, genre) {
  const prompt = `
You are a master Burmese screenwriter.
Write an engaging, complete, standalone movie story script in Burmese based on the topic: "${topic}" (Genre: ${genre}).
Length: 200-250 words.
Make it deeply cinematic and captivating.

OUTPUT FORMAT: Return strictly valid JSON only:
{
  "movie_title": "ရုပ်ရှင် ခေါင်းစဉ်",
  "story_text": "ရုပ်ရှင် ဇာတ်လမ်း စာသားအပြည့်အစုံ"
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
      console.warn("Gemini Movie failed, using Groq:", err.message);
    }
  }

  if (!responseText) {
    const groqRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You output strictly valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    responseText = groqRes.choices[0]?.message?.content?.trim();
  }

  return JSON.parse(responseText);
}

// ၂။ အခန်းဆက် ၆ ပိုင်း Series ရေးသားခြင်း
async function generateEpisodicStory(topic, genre) {
  const prompt = `
You are a master Burmese series scriptwriter.
Write an engaging 6-episode continuous story series in Burmese based on the topic: "${topic}" (Genre: ${genre}).
The story MUST connect logically from Ep 1 to Ep 6:
- Ep 1: Introduction & Mystery Hook
- Ep 2: Rising Suspense
- Ep 3: The Danger Deepens
- Ep 4: Major Plot Twist
- Ep 5: Climax Battle/Confrontation
- Ep 6: Final Resolution & Ending

OUTPUT FORMAT: Return strictly valid JSON only:
{
  "series_title": "ခေါင်းစဉ်",
  "episodes": [
    { "ep": 1, "title": "အပိုင်း ၁ ခေါင်းစဉ်", "text": "အပိုင်း ၁ ဇာတ်လမ်းစာသား (100-140 words)" },
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
      console.warn("Gemini Series failed, using Groq:", err.message);
    }
  }

  if (!responseText) {
    const groqRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You output strictly valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    responseText = groqRes.choices[0]?.message?.content?.trim();
  }

  return JSON.parse(responseText);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { topic, genre, voice, format, fetchAudioOnly, scriptText } = req.body;

    if (fetchAudioOnly && scriptText) {
      const audioBase64 = await fetchBurmeseVoice(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    if (format === "movie") {
      const movieData = await generateSingleMovie(topic, genre || "horror");
      const audioBase64 = await fetchBurmeseVoice(movieData.story_text, voice);
      return res.status(200).json({
        movie_title: movieData.movie_title,
        story_text: movieData.story_text,
        audioBase64: audioBase64
      });
    } else {
      const seriesData = await generateEpisodicStory(topic, genre || "horror");
      const ep1Audio = await fetchBurmeseVoice(seriesData.episodes[0].text, voice);
      return res.status(200).json({
        series: seriesData,
        initialAudioBase64: ep1Audio
      });
    }
  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်းဖန်တီးမှု မအောင်မြင်ပါ" });
  }
};
