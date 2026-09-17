const { Groq, toFile } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    // ၂။ Gemini AI ဖြင့် မြန်မာ Recap Script ရေးသားခြင်း
    const prompt = `Based on this movie dialogue transcript: "${transcription.text}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const burmeseScript = response.text;

    // ၃။ Edge-TTS ဖြင့် မြန်မာအသံ ထုတ်ယူခြင်း
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
