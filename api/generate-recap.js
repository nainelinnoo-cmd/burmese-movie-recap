const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");
const { toFile } = require("groq-sdk");

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

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { audioBase64, voice, tone, videoDuration } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });

    // ၁။ STT: Groq Whisper
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // ၂။ LLM: ဗီဒီယို ကြာချိန် (Duration) နှင့် ကိုက်ညီသော စကားလုံးအရေအတွက် တွက်ချက်ခြင်း
    const duration = videoDuration || 60;
    const targetWordCount = Math.round((duration / 60) * 135);

    const prompt = `You are a movie recap storyteller. Based on this audio transcript: "${transcript.text}", write a complete Burmese movie recap in a "${tone}" tone.
IMPORTANT: The video is exactly ${duration} seconds long. You MUST write approximately ${targetWordCount} Burmese words so the voiceover covers the entire video without ending early. Output ONLY fluent Burmese script text.`;

    let recapScript = "";
    try {
      const gRes = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      if (gRes && gRes.text) recapScript = gRes.text.trim();
    } catch (e) {
      const groqRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      });
      recapScript = groqRes.choices[0]?.message?.content?.trim();
    }

    // ၃။ TTS: Hugging Face Edge-TTS
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

    // ၄။ SRT File တည်ဆောက်ခြင်း
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
