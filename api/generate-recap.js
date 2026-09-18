const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Gemini Flash မော်ဒယ်များထံ အသံစာသား + ဗီဒီယိုမြင်ကွင်း ဓာတ်ပုံများ (Multimodal) ပေးပို့ခြင်း
async function runGeminiRecapFast(prompt, frames = []) {
  const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  // Multimodal Parts တည်ဆောက်ခြင်း (Prompt Text + Visual Snapshots)
  const contents = [{ text: prompt }];

  if (Array.isArray(frames) && frames.length > 0) {
    for (const f of frames) {
      if (typeof f === "string" && f.length > 100) {
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
        console.warn(`Gemini (${model}) multimodal error:`, err.message);
      }
    }
  }

  // Fallback to Groq Llama 3.3 (Text-Only)
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

    // Step 1: STT Transcription via Groq Whisper
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // Step 2: ဗီဒီယိုကြာချိန်နှင့် ကိုက်ညီအောင် စကားလုံးအရေအတွက် တွက်ချက်ခြင်း (၁ မိနစ်လျှင် ၁၂၅ လုံးနှုန်း)
    const duration = videoDuration || 60;
    const targetWordCount = Math.max(120, Math.round((duration / 60) * 125));

    const prompt = `You are an expert movie recap storyteller.
I have provided:
1. Audio transcript of the video: "${transcript.text}"
2. Visual snapshots taken throughout the video scene showing what is happening visually.

CRITICAL INSTRUCTIONS:
- Carefully observe BOTH the visual snapshots (character actions, funny expressions, fighting, movement, who is doing what) AND the audio transcript.
- If characters are performing actions without speaking, describe those visual scenes vividly.
- The video is EXACTLY ${duration} seconds long (about ${Math.floor(duration / 60)} minutes and ${Math.round(duration % 60)} seconds).
- You MUST write approximately ${targetWordCount} Burmese words in a "${tone}" tone so the voiceover covers the entire video length without finishing early.
- Break thoughts into short, clean phrases using commas and Burmese punctuation.
- Output ONLY the spoken Burmese script text without markdown, titles, or asterisks.`;

    const recapScript = await runGeminiRecapFast(prompt, frames);

    return res.status(200).json({
      script: recapScript
    });

  } catch (err) {
    console.error("Recap STT/LLM Error:", err);
    return res.status(500).json({ error: err.message || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ" });
  }
};
