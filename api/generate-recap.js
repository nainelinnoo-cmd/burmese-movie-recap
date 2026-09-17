const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ၁။ Gemini 3.x Models အစုံနှင့် Groq Fallback ပါဝင်သော AI Script Generation Function
async function generateBurmeseRecap(transcript) {
  const prompt = `Based on this movie dialogue transcript: "${transcript}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words. Return ONLY the Burmese narration text without any English explanation.`;

  // လက်ရှိ တကယ် အသုံးပြုနိုင်သော Gemini 3.x Models စာရင်း (ဦးစားပေး အစဉ်လိုက်)
  const geminiModels = [
    "gemini-3.6-flash",      // Google API Error မှ တိုက်ရိုက် ညွှန်းထားသော အဓိက မော်ဒယ်
    "gemini-3.8-flash",      // အသစ်ဆုံး Generation
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro"
  ];

  // (က) Gemini မော်ဒယ်များကို တစ်ခုပြီးတစ်ခု အလုပ်လုပ်သည်အထိ စမ်းသပ် Run ခြင်း
  if (process.env.GEMINI_API_KEY) {
    for (const modelName of geminiModels) {
      try {
        console.log(`Trying Gemini model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        if (response && response.text) {
          console.log(`Successfully generated using Gemini model: ${modelName}`);
          return response.text.trim();
        }
      } catch (err) {
        console.warn(`Gemini (${modelName}) failed: ${err.message}`);
        // 404 သို့မဟုတ် အခြား Error ဖြစ်ပါက နောက် model သို့ အလိုအလျောက် ကူးပြောင်းမည်
      }
    }
  }

  // (ခ) အကယ်၍ Gemini Models အားလုံး 404 သို့မဟုတ် Error တက်ပါက Groq Llama-3.3 သို့ အလိုအလျောက် ပြောင်းသုံးခြင်း
  console.log("Gemini မရသဖြင့် Groq Llama-3.3 သို့ အလိုအလျောက် လွှဲပြောင်းနေပါသည်...");
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
  if (resultText) {
    console.log("Successfully generated using Groq Llama-3.3");
    return resultText.trim();
  }

  throw new Error("AI မော်ဒယ်များအားလုံးမှ Script ထုတ်ယူ၍ မရနိုင်သေးပါ (API Keys စစ်ဆေးပါ)");
}

// ၂။ Vercel Serverless Function အဓိက လုပ်ငန်းစဉ်
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

    // အဆင့် ၁ - Groq Whisper API ဖြင့် အသံမှ စာသား (Transcript) ထုတ်ယူခြင်း
    console.log("Transcribing audio with Groq Whisper...");
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // အဆင့် ၂ - gemini-3.6-flash နှင့် မော်ဒယ်အသစ်များဖြင့် မြန်မာ Recap Script ဖန်တီးခြင်း
    console.log("Generating Burmese recap script...");
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // အဆင့် ၃ - Edge-TTS ဖြင့် မြန်မာအသံဖိုင် (Voiceover) ဖန်တီးခြင်း
    console.log("Synthesizing Burmese voice with Edge-TTS...");
    const tts = new MsEdgeTTS();
    await tts.setMetadata("my-MM-ThihaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = tts.toStream(burmeseScript);

    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(chunk);
    }
    const ttsAudioBuffer = Buffer.concat(chunks);

    // အဆင့် ၄ - Frontend ဆီသို့ စာသားနှင့် အသံ Base64 ပြန်လည်ပေးပို့ခြင်း
    return res.status(200).json({
      script: burmeseScript,
      voiceoverBase64: ttsAudioBuffer.toString("base64"),
    });
  } catch (error) {
    console.error("Function Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};
