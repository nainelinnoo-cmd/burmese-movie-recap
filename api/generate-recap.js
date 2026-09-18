const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ Google Translate TTS (မြန်မာအသံ ပျက်စီးမှုမရှိ အမြန်ရယူခြင်း)
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
  throw new Error("Google TTS မှ အသံရယူ၍ မရပါ");
}

// ၂။ အသံဖန်တီးမှု စနစ် (HF Space ကို ၅ စက္ကန့်သာ စောင့်ပြီး အဆင်မပြေပါက Google TTS သို့ တန်းကူးခြင်း)
async function fetchAudioFast(text, voice) {
  if (voice && voice.startsWith("google-")) {
    return await fetchGoogleTTS(text);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

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
    console.warn("HF Space နှေးကွေးသဖြင့် Google TTS သို့ အလိုအလျောက် ပြောင်းလဲလိုက်ပါသည်:", err.message);
  }

  return await fetchGoogleTTS(text);
}

// ၃။ လက်ရှိ Active ဖြစ်သော Gemini Flash Models များဖြင့် Recap ရေးသားခြင်း
async function runGeminiRecap(prompt) {
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
    for (const model of ACTIVE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        lastError = err.message;
        console.warn(`Gemini (${model}) error:`, err.message);
      }
    }
  } else {
    lastError = "Vercel တွင် GEMINI_API_KEY ထည့်သွင်းထားခြင်း မရှိပါ";
  }

  // Fallback to Groq Llama 3.3
  try {
    const gRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a movie recap storyteller. Output ONLY fluent Burmese script text." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });
    const text = gRes.choices[0]?.message?.content?.trim();
    if (text) return text;
  } catch (groqErr) {
    console.warn("Groq fallback failed:", groqErr.message);
  }

  throw new Error(`AI Model Error: ${lastError}`);
}

// ၄။ Main Handler Function
const handler = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { audioBase64, voice, tone, videoDuration } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });

    // Step A: Groq Whisper ဖြင့် အသံဖတ်ယူခြင်း
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // Step B: Gemini ဖြင့် ဗီဒီယိုကြာချိန်နှင့် ကိုက်ညီအောင် Recap ရေးသားခြင်း
    const duration = videoDuration || 60;
    const targetWordCount = Math.round((duration / 60) * 135);

    const prompt = `You are a movie recap storyteller. Based on this audio transcript: "${transcript.text}", write a complete Burmese movie recap in a "${tone}" tone.
IMPORTANT: The video is ${duration} seconds long. Write approximately ${targetWordCount} Burmese words so the voiceover covers the entire video. Use commas and short phrases. Output ONLY fluent Burmese script text without markdown.`;

    const recapScript = await runGeminiRecap(prompt);

    // Step C: အသံဖိုင် ရယူခြင်း
    const voiceoverBase64 = await fetchAudioFast(recapScript, voice);

    return res.status(200).json({
      script: recapScript,
      voiceoverBase64: voiceoverBase64
    });

  } catch (err) {
    console.error("Recap Handler Error:", err);
    return res.status(500).json({ error: err.message || "Recap မအောင်မြင်ပါ" });
  }
};

// Vercel Serverless Function Config ကို Overwrite မဖြစ်အောင် တိုက်ရိုက် သတ်မှတ်ခြင်း
handler.config = {
  maxDuration: 60,
};

module.exports = handler;
