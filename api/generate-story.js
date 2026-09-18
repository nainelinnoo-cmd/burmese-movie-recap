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

async function fetchAudioSafe(text, voice) {
  if (voice && voice.startsWith("google-")) {
    return await fetchGoogleTTS(text);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text] }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (postRes.ok) {
      const { event_id } = await postRes.json();
      const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
      const streamText = await streamRes.text();

      for (const line of streamText.split("\n")) {
        if (line.startsWith("data:")) {
          const parsed = JSON.parse(line.replace("data:", "").trim());
          if (Array.isArray(parsed) && parsed[0]) return parsed[0];
        }
      }
    }
  } catch (err) {
    console.warn("HF Space error, fallback to Google TTS:", err.message);
  }

  return await fetchGoogleTTS(text);
}

async function runGeminiStoryJson(prompt) {
  const ACTIVE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite"
  ];

  let lastError = null;

  if (process.env.GEMINI_API_KEY) {
    for (const m of ACTIVE_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        if (res && res.text) return res.text.trim();
      } catch (e) {
        lastError = e.message;
        console.warn(`Gemini (${m}) error:`, e.message);
      }
    }
  } else {
    lastError = "GEMINI_API_KEY ထည့်သွင်းထားခြင်း မရှိပါ";
  }

  // Fallback to Groq
  try {
    const gRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You output strictly valid JSON only." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    const content = gRes.choices[0]?.message?.content?.trim();
    if (content) return content;
  } catch (groqErr) {
    console.warn("Groq fallback error:", groqErr.message);
  }

  throw new Error(`AI Model Error: ${lastError}`);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { topic, genre, voice, format, durationMinutes, fetchAudioOnly, scriptText } = req.body;

    if (fetchAudioOnly && scriptText) {
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    const selectedMins = parseInt(durationMinutes) || 1;
    const wordsPerMinute = 135;

    if (format === "movie") {
      const totalWords = selectedMins * wordsPerMinute;
      const prompt = `Write a complete movie script in Burmese for topic: "${topic}" (${genre}). Length: approximately ${totalWords} words. Use short phrases. Output JSON: {"movie_title": "ခေါင်းစဉ်", "story_text": "ဇာတ်လမ်းစာသား"}`;
      const jsonStr = await runGeminiStoryJson(prompt);
      return res.status(200).json(JSON.parse(jsonStr));
    } else {
      const epWords = selectedMins * wordsPerMinute;
      const prompt = `Write a 6-episode continuous series script in Burmese for topic: "${topic}" (${genre}). 
IMPORTANT: Each episode MUST contain around ${epWords} Burmese words. Total story spans across all 6 episodes. Use commas and short phrases.
Output strictly valid JSON: 
{
  "series_title": "ခေါင်းစဉ်",
  "episodes": [
    {"ep": 1, "title": "အပိုင်း ၁ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"},
    {"ep": 2, "title": "အပိုင်း ၂ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"},
    {"ep": 3, "title": "အပိုင်း ၃ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"},
    {"ep": 4, "title": "အပိုင်း ၄ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"},
    {"ep": 5, "title": "အပိုင်း ၅ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"},
    {"ep": 6, "title": "အပိုင်း ၆ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား"}
  ]
}`;
      const jsonStr = await runGeminiStoryJson(prompt);
      return res.status(200).json({ series: JSON.parse(jsonStr) });
    }

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်း ဖန်တီးမှု မအောင်မြင်ပါ" });
  }
};
