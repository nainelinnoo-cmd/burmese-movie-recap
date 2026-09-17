const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

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

  // Groq Llama-3.3 Fallback
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

    // ၁။ Groq Whisper ဖြင့် အသံမှ စာသား ထုတ်ယူခြင်း
    const file = await toFile(audioBuffer, "audio.mp3");
    const transcription = await groq.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    // ၂။ Gemini 3.6-flash ဖြင့် မြန်မာ Recap Script ရေးသားခြင်း
    const burmeseScript = await generateBurmeseRecap(transcription.text);

    // ၃။ Edge-TTS အသံထုတ်ယူခြင်း (agent error နှင့် stream ပျက်ကျမှု ကာကွယ်ထားသော အပိုင်း)
    let ttsAudioBuffer;
    try {
      const ttsOptions = {};
      const tts = new MsEdgeTTS(ttsOptions);
      const format = OUTPUT_FORMAT ? OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3 : "audio-24khz-48kbitrate-mono-mp3";
      await tts.setMetadata("my-MM-ThihaNeural", format);

      const streamResult = tts.toStream(burmeseScript, ttsOptions);
      const stream = streamResult?.audioStream || streamResult;

      const chunks = [];
      for await (const chunk of stream) {
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
    return res.status(500).json({
      error: error.message || error.toString() || "Server Process ပျက်ကျသွားပါသည်",
    });
  }
};
