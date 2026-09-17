const { Groq } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("edge-tts-node");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  try {
    const { audioBase64 } = JSON.parse(event.body);
    const audioBuffer = Buffer.from(audioBase64, "base64");

    const transcription = await groq.audio.transcriptions.create({
      file: new File([audioBuffer], "audio.mp3", { type: "audio/mp3" }),
      model: "whisper-large-v3",
    });

    const prompt = `Based on this movie dialogue transcript: "${transcription.text}", write an engaging, concise movie recap narration in natural Burmese language. Keep it under 100 words.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const burmeseScript = response.text;

    const tts = new MsEdgeTTS();
    await tts.setMetadata("my-MM-ThihaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = tts.toStream(burmeseScript);
    
    const chunks = [];
    for await (const chunk of readable) chunks.push(chunk);
    const ttsAudioBuffer = Buffer.concat(chunks);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        script: burmeseScript,
        voiceoverBase64: ttsAudioBuffer.toString("base64"),
      }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
