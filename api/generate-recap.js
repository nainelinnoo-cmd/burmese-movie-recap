const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function runGeminiRecapFast(prompt, frames = []) {
  const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  const contents = [{ text: prompt }];

  if (Array.isArray(frames) && frames.length > 0) {
    for (const f of frames) {
      if (typeof f === "string" && f.length > 50) {
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: f.replace(/^data:image\/\w+;base64,/, "")
          }
        });
      }
    }
  }

  if (process.env.GEMINI_API_KEY) {
    for (const model of ACTIVE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: contents,
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        // Fallback to next active flash model
      }
    }
  }

  // Fallback to Groq Llama 3.3
  const gRes = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a movie recap storyteller. Output ONLY fluent Burmese script text." },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });
  return gRes.choices[0]?.message?.content?.trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { audioBase64, frames, tone, videoDuration } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });

    // Step 1: STT Transcription via Whisper
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // Step 2: စကားလုံး အရေအတွက်ကို ဗီဒီယိုစက္ကန့်အတိုင်း ကွက်တိကန့်သတ်ခြင်း (၁ မိနစ်လျှင် ၁၀၅ လုံးနှုန်း)
    const duration = Math.max(10, parseInt(videoDuration) || 30);
    const targetWordCount = Math.max(15, Math.round((duration / 60) * 105));

    const prompt = `You are an expert movie recap storyteller.
Audio transcript: "${transcript.text}".
Visual snapshots showing scene action are attached.

CRITICAL LENGTH RULE:
- The video is EXACTLY ${duration} seconds long.
- Write STRICTLY between ${Math.max(12, targetWordCount - 8)} and ${targetWordCount} Burmese words.
- DO NOT write more than ${targetWordCount} words.
- Tone: "${tone}". Use short phrases with commas.
- Output ONLY the spoken Burmese script text without titles, quotes, markdown, or asterisks.`;

    const recapScript = await runGeminiRecapFast(prompt, frames);

    return res.status(200).json({
      script: recapScript
    });

  } catch (err) {
    console.error("Recap STT/LLM Error:", err);
    return res.status(500).json({ error: err.message || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ" });
  }
};
