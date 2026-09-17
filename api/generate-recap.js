const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ၁။ မြန်မာ Recap Script ရေးသားမည့် Function (Gemini 3.6-flash + Groq Fallback)
async function generateBurmeseRecap(transcript) {
  const prompt = `Based on this movie dialogue transcript: "${transcript}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 80 words. Return ONLY the Burmese narration text without English explanations.`;

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
        console.warn(`Gemini (${modelName}) failed: ${err.message}`);
      }
    }
  }

  // Gemini မရပါက Groq Llama-3.3 သို့ ကူးပြောင်းခြင်း
  const groqCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a professional Burmese movie recap narrator. Output ONLY fluent Burmese text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  const resultText = groqCompletion.choices[0]?.message?.content;
  if (resultText) return resultText.trim();

  throw new Error("AI Script ရေးသားမည့် Model အားလုံး မအောင်မြင်ပါ");
}

// ၂။ Vercel IP Block လုံးဝ မခံရသော Google Cloud မြန်မာ TTS Fallback Function
async function getGoogleTTSBuffer(text) {
  // စာသားများကို အပိုင်းလိုက် ခွဲထုတ်ခြင်း
  const parts = text.match(/[^၊။!?,.\n]+[၊။!?,.\n]?/g) || [text];
  const audioChunks = [];

  for (const part of parts) {
    const cleanText = part.trim();
    if (!cleanText) continue;

    const encoded = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=my&client=tw-ob&q=${encoded}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      audioChunks.push(Buffer.from(arrayBuffer));
    }
  }

  if (audioChunks.length === 0) {
    throw new Error("Google TTS အသံထုတ်ယူ၍ မရရှိပါ");
  }

  return Buffer.concat(audioChunks);
}

// ၃။ Edge-TTS စမ်းသပ်ပြီး ပျက်ကျပါက Google TTS သို့ Auto ပြောင်းမည့် Function
async function generateBurmeseVoice(burmeseText) {
  try {
    console.log("Edge-TTS ဖြင့် အသံဖိုင် ဖန်တီးနေပါသည်...");
    const tts = new MsEdgeTTS({});
    const format = OUTPUT_FORMAT ? OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3 : "audio-24khz-48kbitrate-mono-mp3";
    await tts.setMetadata("my-MM-ThihaNeural", format);

    const streamResult = tts.toStream(burmeseText, {});
    const stream = streamResult?.audioStream || streamResult;

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (edgeErr) {
    console.warn("Microsoft Edge-TTS Cloud IP Block ဖြစ်သွားပါသည်၊ Google TTS သို့ အလိုအလျောက် ပြောင်းသုံးနေပါသည်...");
    // Microsoft Server ချိတ်မရပါက Google TTS ဖြင့် အစားထိုး အသံထုတ်ယူခြင်း
    return await getGoogleTTSBuffer(burmeseText);
  }
}

// ၄။ Vercel Serverless Function အဓိက လုပ်ငန်းစဉ်
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

    // အဆင့် ၂ - Gemini 3.6-flash / Groq Llama (မြန်မာ Recap ရေးသားခြင်း)
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // အဆင့် ၃ - Dual-TTS Fallback ဖြင့် မြန်မာအသံ ထုတ်ယူခြင်း
    const voiceoverBuffer = await generateBurmeseVoice(burmeseScript);

    // အဆင့် ၄ - Frontend သို့ စာသားနှင့် အသံ Base64 ပြန်ပို့ခြင်း
    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: voiceoverBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({
      error: error.message || error.toString() || "Server Process ပျက်ကျသွားပါသည်",
    });
  }
};
