const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ၁။ AI Recap Script ရေးသားမည့် Function (Gemini 3.6-flash + Groq Fallback)
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
        console.log(`Running with Gemini model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn(`Gemini (${modelName}) failed: ${err.message}`);
      }
    }
  }

  // Groq Llama-3.3 Fallback
  console.log("Groq Llama-3.3 သို့ အလိုအလျောက် ပြောင်းသုံးနေပါသည်...");
  const groqCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a professional Burmese movie recap narrator. Write natural, engaging movie recaps exclusively in fluent Burmese (Myanmar language).",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const resultText = groqCompletion.choices[0]?.message?.content;
  if (resultText) return resultText.trim();

  throw new Error("AI မော်ဒယ်များအားလုံးမှ Script ထုတ်ယူ၍ မရနိုင်သေးပါ");
}

// ၂။ Vercel Serverless Function
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: "ဗီဒီယိုထဲမှ အသံဖိုင်ဒေတာ မပါဝင်ပါ" });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    // အဆင့် ၁ - Groq Whisper API ဖြင့် အသံမှ စာသား ထုတ်ယူခြင်း
    console.log("Transcribing audio with Groq Whisper...");
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // အဆင့် ၂ - gemini-3.6-flash ဖြင့် မြန်မာ Recap Script ဖန်တီးခြင်း
    console.log("Generating Burmese recap script...");
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // အဆင့် ၃ - Edge-TTS ဖြင့် မြန်မာအသံဖိုင် ဖန်တီးခြင်း (agent error ပြင်ဆင်ထားသော အပိုင်း)
    console.log("Synthesizing Burmese voice with Edge-TTS...");
    const tts = new MsEdgeTTS({}); // options အလွတ် ထည့်သွင်းထားခြင်းဖြင့် agent error ကို ရှင်းထုတ်ထားပါသည်
    await tts.setMetadata("my-MM-ThihaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const readable = tts.toStream(burmeseScript, {});

    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    const ttsAudioBuffer = Buffer.concat(chunks);

    // အဆင့် ၄ - Frontend ဆီသို့ ပြန်လည်ပေးပို့ခြင်း
    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: ttsAudioBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Function Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
