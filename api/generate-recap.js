const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

function buildSrtString(scriptText, totalDuration) {
  const sentences = scriptText.match(/[^။!?\n]+[။!?\n]?/g) || [scriptText];
  const cleaned = sentences.map(s => s.trim()).filter(Boolean);
  const timePerCue = totalDuration / (cleaned.length || 1);

  let srt = "";
  cleaned.forEach((sentence, idx) => {
    const startSec = idx * timePerCue;
    const endSec = Math.min((idx + 1) * timePerCue, totalDuration);

    const fmt = (s) => {
      const hrs = Math.floor(s / 3600).toString().padStart(2, "0");
      const mins = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
      const secs = Math.floor(s % 60).toString().padStart(2, "0");
      const ms = Math.floor((s % 1) * 1000).toString().padStart(3, "0");
      return `${hrs}:${mins}:${secs},${ms}`;
    };

    srt += `${idx + 1}\n${fmt(startSec)} --> ${fmt(endSec)}\n${sentence}\n\n`;
  });
  return srt;
}

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
    lastError = "GEMINI_API_KEY ထည့်သွင်းထားခြင်း မရှိပါ";
  }

  // Fallback to Groq
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
    console.warn("Groq fallback error:", groqErr.message);
  }

  throw new Error(`AI Model Error: ${lastError}`);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { audioBase64, voice, tone, videoDuration } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    const duration = videoDuration || 60;
    const targetWordCount = Math.round((duration / 60) * 135);

    const prompt = `You are a movie recap storyteller. Based on this audio transcript: "${transcript.text}", write a complete Burmese movie recap in a "${tone}" tone.
IMPORTANT: The video is ${duration} seconds long. Write approximately ${targetWordCount} Burmese words so the voiceover covers the entire video without ending early. Output ONLY fluent Burmese script text without markdown.`;

    const recapScript = await runGeminiRecap(prompt);

    const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [recapScript] }),
    });
    const { event_id } = await postRes.json();
    const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
    const streamText = await streamRes.text();

    let voiceoverBase64 = "";
    for (const line of streamText.split("\n")) {
      if (line.startsWith("data:")) {
        const parsed = JSON.parse(line.replace("data:", "").trim());
        if (Array.isArray(parsed) && parsed[0]) {
          voiceoverBase64 = parsed[0];
          break;
        }
      }
    }

    const srtText = buildSrtString(recapScript, duration);

    return res.status(200).json({
      script: recapScript,
      voiceoverBase64: voiceoverBase64,
      srtText: srtText
    });

  } catch (err) {
    console.error("Recap Error:", err);
    return res.status(500).json({ error: err.message || "Recap မအောင်မြင်ပါ" });
  }
};
