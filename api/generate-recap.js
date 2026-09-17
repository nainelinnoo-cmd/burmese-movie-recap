const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Hugging Face Space URL
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ AI Recap Script ရေးသားခြင်း (Gemini 3.6-flash + Groq Llama Fallback)
async function generateBurmeseRecap(transcript) {
  const prompt = `Based on this movie dialogue transcript: "${transcript}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words. Return ONLY the Burmese narration text without English explanations.`;

  const geminiModels = [
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  if (process.env.GEMINI_API_KEY) {
    for (const modelName of geminiModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        console.warn(`Gemini (${modelName}) failed:`, err.message);
      }
    }
  }

  // Gemini အဆင်မပြေပါက Groq Llama-3.3 သို့ ကူးပြောင်းခြင်း
  const groqCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a professional Burmese movie recap narrator. Output ONLY fluent Burmese text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const resultText = groqCompletion.choices[0]?.message?.content;
  if (resultText) return resultText.trim();

  throw new Error("AI Script ရေးသားမည့် Model အားလုံး မအောင်မြင်ပါ");
}

// ၂။ Hugging Face Gradio စနစ်မှ မြန်မာ Neural အသံ ဆွဲယူခြင်း
async function fetchBurmeseVoice(text) {
  console.log("Hugging Face Space သို့ မြန်မာအသံ တောင်းဆိုနေပါသည်...");

  // Gradio SSE API စတင်ခေါ်ယူခြင်း
  const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text] }),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Hugging Face Call Error: ${postRes.status} - ${err}`);
  }

  const { event_id } = await postRes.json();

  // ထွက်လာသော Event Result ကို လှမ်းယူခြင်း
  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
  const streamText = await streamRes.text();

  const lines = streamText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const parsed = JSON.parse(line.replace("data:", "").trim());
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0]; // Base64 Audio String
      }
    }
  }

  throw new Error("Hugging Face မှ အသံဖိုင်ဒေတာ ပြန်မရရှိပါ");
}

// ၃။ Vercel Serverless Function အဓိက လုပ်ငန်းစဉ်
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    // အဆင့် ၁ - Groq Whisper STT (အသံမှ စာသားဖတ်ယူခြင်း)
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // အဆင့် ၂ - Gemini / Groq ဖြင့် မြန်မာ Recap Script ရေးသားခြင်း
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // အဆင့် ၃ - Hugging Face မှ မြန်မာ Neural အသံ ရယူခြင်း
    const voiceoverBase64 = await fetchBurmeseVoice(burmeseScript);

    // အဆင့် ၄ - Frontend သို့ စာသားနှင့် အသံ Base64 ပေးပို့ခြင်း
    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: voiceoverBase64,
    });
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({
      error: error.message || "Server လုပ်ငန်းစဉ် မအောင်မြင်ပါ",
    });
  }
};
