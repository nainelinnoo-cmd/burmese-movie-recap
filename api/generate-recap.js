const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function runGeminiRecapFast(prompt) {
  const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  if (process.env.GEMINI_API_KEY) {
    for (const model of ACTIVE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        // Fallback to next active model
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
    const { audioBase64, tone, videoDuration } = req.body;
    if (!audioBase64) return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });

    // အဆင့် ၁: Groq Whisper STT (၁ စက္ကန့်ခန့်)
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const file = await toFile(audioBuffer, "audio.wav");
    const transcript = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // အဆင့် ၂: Gemini Recap ရေးသားခြင်း (၁.၅ စက္ကန့်ခန့်)
    const duration = videoDuration || 60;
    const targetWordCount = Math.round((duration / 60) * 135);

    const prompt = `You are a movie recap storyteller. Based on this audio transcript: "${transcript.text}", write a complete Burmese movie recap in a "${tone}" tone.
IMPORTANT: The video is ${duration} seconds long. Write approximately ${targetWordCount} Burmese words. Use commas and short phrases. Output ONLY fluent Burmese script text without markdown.`;

    const recapScript = await runGeminiRecapFast(prompt);

    // Timeout ကင်းစေရန် စာသားကို ချက်ချင်း ပြန်ပို့ပေးခြင်း
    return res.status(200).json({
      script: recapScript
    });

  } catch (err) {
    console.error("Recap STT/LLM Error:", err);
    return res.status(500).json({ error: err.message || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ" });
  }
};
