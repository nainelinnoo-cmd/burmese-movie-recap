const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// တကယ် အလုပ်လုပ်သော Gemini Model ကို Auto ရှာဖွေပြီး Script ထုတ်ပေးသည့် Function
async function generateBurmeseRecapWithAutoModel(prompt) {
  let activeModels = [];

  // ၁။ API Key ဖြင့် အသုံးပြုခွင့်ရှိသော Models စာရင်းကို အရင် ဆွဲထုတ်စစ်ဆေးခြင်း
  try {
    const modelList = await ai.models.list();
    for await (const m of modelList) {
      const name = m.name ? m.name.replace(/^models\//, "") : "";
      if (name.includes("gemini") && (name.includes("flash") || name.includes("pro"))) {
        activeModels.push(name);
      }
    }
  } catch (err) {
    console.warn("Model list error (fallback models will be used):", err.message);
  }

  // အမြန်ဆုံးနှင့် အသုံးအများဆုံး Fallback Models စာရင်း
  const fallbackCandidates = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
  ];

  // စာရင်းနှစ်ခုလုံးကို ပေါင်းစပ်ပြီး ဦးစားပေး စီတန်းခြင်း
  const modelsToTry = Array.from(new Set([...activeModels, ...fallbackCandidates]));

  let lastError = null;

  // ၂။ မော်ဒယ်များကို တစ်ခုပြီးတစ်ခု အလုပ်လုပ်သည်အထိ Auto စမ်းသပ် Run ခြင်း
  for (const modelName of modelsToTry) {
    try {
      console.log(`Running with model: ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });

      if (response && response.text) {
        return response.text; // အောင်မြင်စွာ ရရှိသည်နှင့် တိုက်ရိုက် ပြန်ပို့ပေးမည်
      }
    } catch (error) {
      console.warn(`Model ${modelName} failed, trying next... Error:`, error.message);
      lastError = error;
      continue; // Error တက်ပါက နောက် Model တစ်ခုသို့ အလိုအလျောက် ကူးပြောင်းမည်
    }
  }

  throw new Error(`အသုံးပြုနိုင်သော Gemini Model ရှာမတွေ့ပါ: ${lastError?.message || "Unknown error"}`);
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

    // ၁။ Groq Whisper API ဖြင့် အသံမှ စာသား ထုတ်ယူခြင်း
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // ၂။ Gemini AI မော်ဒယ်များကို Auto စစ်ဆေးပြီး မြန်မာ Recap Script ဖန်တီးခြင်း
    const prompt = `Based on this movie dialogue transcript: "${transcription.text}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words.`;
    const burmeseScript = await generateBurmeseRecapWithAutoModel(prompt);

    // ၃။ Edge-TTS ဖြင့် မြန်မာအသံဖိုင် ဖန်တီးခြင်း
    const tts = new MsEdgeTTS();
    await tts.setMetadata("my-MM-ThihaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = tts.toStream(burmeseScript);

    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    const ttsAudioBuffer = Buffer.concat(chunks);

    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: ttsAudioBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Function Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
