const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const GEMINI_MODEL = process.env.GEMINI_RECAP_MODEL || "gemini-2.5-flash";
const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

function cleanModelText(text) {
  return String(text || "")
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*["“]|["”]\s*$/g, "")
    .trim();
}

function sendEvent(res, event) {
  res.write(JSON.stringify(event) + "\n");
}

function normalizeMime(mime, base64) {
  if (mime && /^audio\//i.test(mime)) return mime.split(";")[0];
  // WAV fallback from the client.
  if (base64?.startsWith("UklGR")) return "audio/wav";
  return "audio/webm";
}

async function runGeminiOneCall({ audioBase64, audioMimeType, frames, prompt }) {
  if (!process.env.GEMINI_API_KEY) return "";

  const contents = [
    {
      inlineData: {
        mimeType: normalizeMime(audioMimeType, audioBase64),
        data: audioBase64
      }
    },
    { text: prompt }
  ];

  // Only two tiny JPEGs are sent. The audio + images + prompt are handled in ONE Gemini call.
  for (const frame of Array.isArray(frames) ? frames.slice(0, 2) : []) {
    if (typeof frame !== "string" || frame.length < 50) continue;
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.replace(/^data:image\/\w+;base64,/, "")
      }
    });
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents
  });
  return cleanModelText(response?.text);
}

async function runGroqFallback(audioBase64, audioMimeType, prompt) {
  // Compatibility fallback only. Normal Gemini path is one multimodal API call.
  const ext = normalizeMime(audioMimeType, audioBase64).split("/")[1] || "webm";
  const audioBuffer = Buffer.from(audioBase64, "base64");
  const file = await toFile(audioBuffer, `audio.${ext}`);
  let transcript;

  try {
    transcript = await groq.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      response_format: "json"
    });
  } catch (err) {
    if (WHISPER_MODEL !== "whisper-large-v3") {
      transcript = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        response_format: "json"
      });
    } else {
      throw err;
    }
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a movie recap storyteller. Output ONLY fluent Burmese spoken-script text. No title, markdown, quotes, or explanation."
      },
      {
        role: "user",
        content: `${prompt}\n\nAUDIO TRANSCRIPT:\n${String(transcript?.text || "").trim()}`
      }
    ],
    temperature: 0.55,
    max_tokens: 500
  });

  return cleanModelText(response.choices?.[0]?.message?.content);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // NDJSON lets the browser receive progress events without opening multiple API requests.
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const {
      audioBase64,
      audioMimeType,
      frames = [],
      tone = "dramatic",
      videoDuration
    } = req.body || {};

    if (!audioBase64) {
      sendEvent(res, { type: "error", error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ" });
      return res.end();
    }

    const duration = Math.max(10, Math.round(Number(videoDuration) || 30));
    const targetWordCount = Math.max(15, Math.round((duration / 60) * 105));
    const minWords = Math.max(12, targetWordCount - 8);

    const prompt = `You are an expert movie recap storyteller writing natural spoken Burmese.

The attached audio is the source narration/dialogue. Listen to it directly; do NOT ask for a separate transcript.
The attached images are scene snapshots from the same video. Use them only to clarify visible actions, characters, locations, and scene progression. Do not invent details not supported by the audio or images.

STRICT OUTPUT RULES:
- Video duration: exactly ${duration} seconds.
- Write ${minWords}-${targetWordCount} Burmese spoken words.
- Never exceed ${targetWordCount} words.
- Tone: ${String(tone)}.
- Prefer short, natural spoken phrases and commas for pacing.
- Preserve important story events; remove filler and repetition.
- Output ONLY the spoken Burmese script. No title, quotes, markdown, bullets, transcript, or explanation.`;

    sendEvent(res, { type: "stage", stage: "transcribing" });

    let recapScript = "";
    if (process.env.GEMINI_API_KEY) {
      // Preferred path: ONE Gemini multimodal request handles audio understanding + visual grounding + recap writing.
      sendEvent(res, { type: "stage", stage: "writing" });
      try {
        recapScript = await runGeminiOneCall({
          audioBase64,
          audioMimeType,
          frames,
          prompt
        });
      } catch (err) {
        console.error(`Gemini one-call recap failed (${GEMINI_MODEL}):`, err?.message || err);
      }
    }

    if (!recapScript && process.env.GROQ_API_KEY) {
      // Compatibility fallback when Gemini is not configured or fails.
      sendEvent(res, { type: "stage", stage: "transcribing" });
      recapScript = await runGroqFallback(audioBase64, audioMimeType, prompt);
    }

    if (!recapScript) {
      throw new Error("AI မှ Recap စာသား မရရှိပါ");
    }

    sendEvent(res, { type: "result", script: recapScript });
    res.end();
  } catch (err) {
    console.error("Recap generation error:", err);
    sendEvent(res, { type: "error", error: err.message || "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ" });
    res.end();
  }
};
