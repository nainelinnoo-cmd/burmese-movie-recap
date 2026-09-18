const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

async function fetchGoogleTTS(text) {
  const chunks = text.match(/[^။!?\n]+[။!?\n]?/g) || [text];
  const audioBuffers = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=my&client=tw-ob`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(buf));
    }
  }
  if (audioBuffers.length > 0) return Buffer.concat(audioBuffers).toString("base64");
  throw new Error("Google TTS Failed");
}

async function fetchBurmeseVoice(text, voice) {
  if (voice && voice.startsWith("google-")) {
    try { return await fetchGoogleTTS(text); } catch (e) {}
  }

  const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text] }),
  });

  if (!postRes.ok) throw new Error("HF Space Connect Error");
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
  throw new Error("အသံဒေတာ ရယူ၍မရပါ");
}

async function runLLMCompletion(prompt) {
  // ၁။ Gemini စံ Models များဖြင့် စတင်စမ်းသပ်ခြင်း
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  if (process.env.GEMINI_API_KEY) {
    for (const m of geminiModels) {
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        if (res && res.text) return res.text.trim();
      } catch (e) {
        console.warn(`Gemini (${m}) failed, trying fallback...`);
      }
    }
  }

  // ၂။ Groq အခမဲ့ Models များဖြင့် Fallback ခေါ်ယူခြင်း (404 Error ကင်းစင်စေသော List)
  const groqModels = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "llama3-70b-8192"];
  for (const gm of groqModels) {
    try {
      const gRes = await groq.chat.completions.create({
        model: gm,
        messages: [
          { role: "system", content: "You output strictly valid JSON only." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {
      console.warn(`Groq (${gm}) failed:`, err.message);
    }
  }

  throw new Error("AI Models များအားလုံးမှ တုံ့ပြန်မှု မရရှိပါ");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { topic, genre, voice, format, durationMinutes, fetchAudioOnly, scriptText } = req.body;

    if (fetchAudioOnly && scriptText) {
      const audioBase64 = await fetchBurmeseVoice(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    const wordsPerMinute = 130;
    const totalWords = (parseInt(durationMinutes) || 2) * wordsPerMinute;

    if (format === "movie") {
      const prompt = `Write a complete movie script in Burmese for topic: "${topic}" (${genre}). Length: approximately ${totalWords} words. Output JSON: {"movie_title": "ခေါင်းစဉ်", "story_text": "ဇာတ်လမ်းစာသား"}`;
      const jsonStr = await runLLMCompletion(prompt);
      return res.status(200).json(JSON.parse(jsonStr));
    } else {
      const epWords = Math.round(totalWords / 6);
      const prompt = `Write a 6-episode continuous story series in Burmese for topic: "${topic}" (${genre}). Each episode must have around ${epWords} words. Output JSON: {"series_title": "ခေါင်းစဉ်", "episodes": [{"ep": 1, "title": "အပိုင်း ၁", "text": "စာသား"}, {"ep": 2, "title": "အပိုင်း ၂", "text": "စာသား"}, {"ep": 3, "title": "အပိုင်း ၃", "text": "စာသား"}, {"ep": 4, "title": "အပိုင်း ၄", "text": "စာသား"}, {"ep": 5, "title": "အပိုင်း ၅", "text": "စာသား"}, {"ep": 6, "title": "အပိုင်း ၆", "text": "စာသား"}]}`;
      const jsonStr = await runLLMCompletion(prompt);
      return res.status(200).json({ series: JSON.parse(jsonStr) });
    }

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်း ဖန်တီးမှု မအောင်မြင်ပါ" });
  }
};
