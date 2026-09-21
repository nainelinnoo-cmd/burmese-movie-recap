const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

// ============================================================
// Recaps Studio - generate-recap.js
// One Gemini multimodal call: audio + up to 2 images + prompt.
// Groq is only a compatibility fallback.
// ============================================================

const GEMINI_MODEL = process.env.GEMINI_RECAP_MODEL || "gemini-2.5-flash";
const GROQ_RECAP_MODEL = process.env.GROQ_RECAP_MODEL || "openai/gpt-oss-120b";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

function cleanText(value) {
  return String(value || "")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getMimeType(mime, base64) {
  if (typeof mime === "string" && mime.startsWith("audio/")) {
    return mime.split(";")[0].trim();
  }
  if (typeof base64 === "string" && base64.startsWith("UklGR")) {
    return "audio/wav";
  }
  return "audio/webm";
}

function sendEvent(res, payload) {
  res.write(JSON.stringify(payload) + "\n");
}

function errorMessage(err) {
  return String(
    err?.message ||
    err?.error?.message ||
    err?.response?.data?.error?.message ||
    err ||
    "Unknown error"
  );
}

function isOldGroqModelError(message) {
  return /llama-3\.3-70b-versatile|model.*(does not exist|not found)|model_not_found/i.test(message);
}

// ------------------------------------------------------------
// Gemini: ONE multimodal request
// ------------------------------------------------------------
async function generateWithGemini({ audioBase64, audioMimeType, frames, prompt }) {
  if (!gemini) {
    throw new Error("GEMINI_API_KEY မသတ်မှတ်ထားပါ");
  }

  const parts = [
    { text: prompt },
    {
      inlineData: {
        mimeType: getMimeType(audioMimeType, audioBase64),
        data: audioBase64
      }
    }
  ];

  for (const frame of Array.isArray(frames) ? frames.slice(0, 2) : []) {
    if (typeof frame !== "string" || frame.length < 50) continue;

    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.replace(/^data:image\/[^;]+;base64,/, "")
      }
    });
  }

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: parts
  });

  const text = cleanText(response?.text);
  if (!text) {
    throw new Error("Gemini က Recap စာသား အလွတ်ပြန်ပေးခဲ့ပါတယ်");
  }

  return text;
}

// ------------------------------------------------------------
// Groq fallback: Whisper -> LLM
// ------------------------------------------------------------
async function generateWithGroq({ audioBase64, audioMimeType, prompt }) {
  if (!groq) {
    throw new Error("GROQ_API_KEY မသတ်မှတ်ထားပါ");
  }

  const mime = getMimeType(audioMimeType, audioBase64);
  const extension = mime.includes("webm") ? "webm" : mime.includes("wav") ? "wav" : "mp3";
  const buffer = Buffer.from(audioBase64, "base64");
  const file = await toFile(buffer, `recap-audio.${extension}`);

  let transcript;

  try {
    transcript = await groq.audio.transcriptions.create({
      file,
      model: GROQ_WHISPER_MODEL,
      response_format: "json"
    });
  } catch (firstWhisperError) {
    const firstMessage = errorMessage(firstWhisperError);

    if (GROQ_WHISPER_MODEL === "whisper-large-v3") {
      throw new Error(`Groq Whisper error: ${firstMessage}`);
    }

    try {
      transcript = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        response_format: "json"
      });
    } catch (secondWhisperError) {
      throw new Error(
        `Groq Whisper မအောင်မြင်ပါ: ${errorMessage(secondWhisperError)}`
      );
    }
  }

  const transcriptText = cleanText(transcript?.text);
  if (!transcriptText) {
    throw new Error("Whisper မှ အသံစာသား မရပါ");
  }

  const systemPrompt =
    "You are a movie recap storyteller. Output ONLY fluent natural Burmese spoken-script text. No title, markdown, quotes, bullets, or explanation.";

  async function callModel(model) {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${prompt}\n\nSOURCE AUDIO TRANSCRIPT:\n${transcriptText}`
        }
      ],
      temperature: 0.55,
      max_tokens: 700
    });

    return cleanText(response?.choices?.[0]?.message?.content);
  }

  try {
    const result = await callModel(GROQ_RECAP_MODEL);
    if (result) return result;
    throw new Error("Groq က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်");
  } catch (firstError) {
    const firstMessage = errorMessage(firstError);

    // Never call the retired llama-3.3-70b-versatile model.
    if (GROQ_RECAP_MODEL === "qwen/qwen3.8-27b") {
      throw new Error(`Groq recap error: ${firstMessage}`);
    }

    try {
      const result = await callModel("qwen/qwen3.8-27b");
      if (result) return result;
      throw new Error("Qwen က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်");
    } catch (secondError) {
      const secondMessage = errorMessage(secondError);

      if (isOldGroqModelError(firstMessage)) {
        throw new Error(`Groq model error: ${secondMessage}`);
      }

      throw new Error(`Groq recap မအောင်မြင်ပါ: ${secondMessage}`);
    }
  }
}

// ------------------------------------------------------------
// Vercel API handler
// ------------------------------------------------------------
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const body = req.body || {};
    const audioBase64 = body.audioBase64;
    const audioMimeType = body.audioMimeType;
    const frames = Array.isArray(body.frames) ? body.frames : [];
    const tone = String(body.tone || "dramatic");
    const duration = Math.max(10, Math.min(600, Math.round(Number(body.videoDuration) || 30)));

    if (!audioBase64 || typeof audioBase64 !== "string") {
      sendEvent(res, {
        type: "error",
        error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ"
      });
      return res.end();
    }

    const targetWords = Math.max(25, Math.round((duration / 60) * 105));
    const minWords = Math.max(18, targetWords - 12);

    const prompt = `
You are an expert movie recap storyteller writing natural spoken Burmese.

The attached audio is the source narration/dialogue. Listen to the audio directly.
The attached JPEG images are scene snapshots from the same video and may be used to clarify visible scene details.
Do not invent story details that are not supported by the audio or images.

VIDEO DURATION: ${duration} seconds
TONE: ${tone}
TARGET LENGTH: ${minWords}-${targetWords} Burmese spoken words

RULES:
- Preserve the important story events.
- Remove filler and repetition.
- Use natural Burmese suitable for AI voice-over.
- Use short spoken sentences and natural punctuation.
- Stay within the requested word limit.
- Output ONLY the Burmese spoken recap.
- No title.
- No markdown.
- No bullets.
- No quotation marks.
- No explanation.
`;

    sendEvent(res, { type: "stage", stage: "starting" });

    let script = "";
    let geminiError = "";
    let groqError = "";

    // Preferred: one Gemini multimodal API call.
    if (gemini) {
      sendEvent(res, { type: "stage", stage: "ai" });

      try {
        script = await generateWithGemini({
          audioBase64,
          audioMimeType,
          frames,
          prompt
        });
      } catch (err) {
        geminiError = errorMessage(err);
        console.error("Gemini recap error:", geminiError);
      }
    }

    // Compatibility fallback.
    if (!script && groq) {
      sendEvent(res, { type: "stage", stage: "fallback" });

      try {
        script = await generateWithGroq({
          audioBase64,
          audioMimeType,
          prompt
        });
      } catch (err) {
        groqError = errorMessage(err);
        console.error("Groq recap error:", groqError);
      }
    }

    if (!script) {
      const details = [
        geminiError && `Gemini: ${geminiError}`,
        groqError && `Groq: ${groqError}`
      ].filter(Boolean).join(" | ");

      throw new Error(
        details ||
        "GEMINI_API_KEY သို့မဟုတ် GROQ_API_KEY မရှိပါ"
      );
    }

    sendEvent(res, {
      type: "result",
      script
    });

    return res.end();
  } catch (err) {
    const message = errorMessage(err);
    console.error("generate-recap error:", message);

    sendEvent(res, {
      type: "error",
      error: message
    });

    return res.end();
  }
};
