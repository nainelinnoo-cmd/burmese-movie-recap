const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function generateBurmeseRecap(transcript) {
  const prompt = `Based on this movie dialogue transcript: "${transcript}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words. Return ONLY the Burmese narration text without any English explanation.`;

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
        console.warn(`Gemini model ${modelName} failed:`, err.message);
      }
    }
  }

  // Gemini မရပါက Groq Llama-3.3 သို့ ကူးပြောင်းခြင်း
  const groqCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a Burmese movie recap narrator. Output ONLY fluent Burmese text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const resultText = groqCompletion.choices[0]?.message?.content;
  if (resultText) return resultText.trim();

  throw new Error("AI Script ရေးသားမည့် Model အားလုံး မအောင်မြင်ပါ");
}

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

    // အဆင့် ၁ - Groq Whisper STT
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // အဆင့် ၂ - Gemini 3.6-flash / Groq Recap Script
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // အဆင့် ၃ - Edge-TTS အသံထုတ်ယူခြင်း
    let ttsAudioBuffer;
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata("my-MM-ThihaNeural", "audio-24khz-48kbitrate-mono-mp3");
      const readable = tts.toStream(burmeseScript);

      const chunks = [];
      for await (const chunk of readable) {
        chunks.push(chunk);
      }
      ttsAudioBuffer = Buffer.concat(chunks);
    } catch (ttsErr) {
      throw new Error("Edge-TTS အသံထုတ်ယူခြင်း မအောင်မြင်ပါ: " + (ttsErr.message || ttsErr));
    }

    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: ttsAudioBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Backend Error Detail:", error);
    // Error အစစ်အမှန်ကို Screen ပေါ် အတိအကျ ဖော်ပြပေးရန် ပြင်ဆင်ထားခြင်း
    return res.status(500).json({
      error: error.message || error.toString() || "Server Process ပျက်ကျသွားပါသည်",
    });
  }
};
