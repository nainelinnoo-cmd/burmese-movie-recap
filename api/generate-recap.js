const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

// ============================================================
// Recaps Studio - api/generate-recap.js
//
// Primary: ONE Gemini multimodal request
//   audio + up to 2 JPEG scene frames + prompt
//
// Fallback: Groq Whisper -> Groq text model
// ============================================================

const GEMINI_MODEL = process.env.GEMINI_RECAP_MODEL || "gemini-2.5-flash";

// Only allow currently supported Groq recap models.
// An old/invalid environment variable is ignored automatically.
const ALLOWED_GROQ_MODELS = new Set([
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
]);

const configuredGroqModel = String(
  process.env.GROQ_RECAP_MODEL || ""
).trim();

const GROQ_RECAP_MODEL = ALLOWED_GROQ_MODELS.has(configuredGroqModel)
  ? configuredGroqModel
  : "openai/gpt-oss-120b";

const GROQ_RECAP_FALLBACK_MODEL =
  GROQ_RECAP_MODEL === "openai/gpt-oss-20b"
    ? "openai/gpt-oss-120b"
    : "openai/gpt-oss-20b";

const GROQ_WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL === "whisper-large-v3"
    ? "whisper-large-v3"
    : "whisper-large-v3-turbo";

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// ============================================================
// HELPERS
// ============================================================

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
  try {
    res.write(JSON.stringify(payload) + "\n");
  } catch (_) {
    // Client may have disconnected.
  }
}

function getErrorMessage(err) {
  return String(
    err?.message ||
    err?.error?.message ||
    err?.response?.data?.error?.message ||
    err ||
    "Unknown error"
  );
}

// ============================================================
// GEMINI - ONE MULTIMODAL API CALL
// ============================================================

async function generateWithGemini({
  audioBase64,
  audioMimeType,
  frames,
  prompt
}) {
  if (!gemini) {
    throw new Error("GEMINI_API_KEY မသတ်မှတ်ထားပါ");
  }

  const contents = [
    {
      inlineData: {
        mimeType: getMimeType(audioMimeType, audioBase64),
        data: audioBase64
      }
    },
    {
      text: prompt
    }
  ];

  // Maximum 2 small JPEG scene frames.
  for (const frame of Array.isArray(frames) ? frames.slice(0, 2) : []) {
    if (typeof frame !== "string" || frame.length < 50) continue;

    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.replace(/^data:image\/[^;]+;base64,/, "")
      }
    });
  }

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents
  });

  const script = cleanText(response?.text);

  if (!script) {
    throw new Error("Gemini က Recap စာသား အလွတ်ပြန်ပေးခဲ့ပါတယ်");
  }

  return script;
}

// ============================================================
// GROQ FALLBACK
// Audio -> Whisper -> text model
// ============================================================

async function generateWithGroq({
  audioBase64,
  audioMimeType,
  prompt
}) {
  if (!groq) {
    throw new Error("GROQ_API_KEY မသတ်မှတ်ထားပါ");
  }

  const mime = getMimeType(audioMimeType, audioBase64);
  const extension = mime.includes("webm")
    ? "webm"
    : mime.includes("wav")
      ? "wav"
      : "mp3";

  const audioBuffer = Buffer.from(audioBase64, "base64");

  if (!audioBuffer.length) {
    throw new Error("Audio data အလွတ်ဖြစ်နေပါတယ်");
  }

  const file = await toFile(
    audioBuffer,
    `recap-audio.${extension}`
  );

  // ----------------------------------------------------------
  // Whisper
  // ----------------------------------------------------------

  let transcript;

  try {
    transcript = await groq.audio.transcriptions.create({
      file,
      model: GROQ_WHISPER_MODEL,
      response_format: "json"
    });
  } catch (firstWhisperError) {
    if (GROQ_WHISPER_MODEL === "whisper-large-v3") {
      throw new Error(
        `Groq Whisper မအောင်မြင်ပါ: ${getErrorMessage(firstWhisperError)}`
      );
    }

    try {
      transcript = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        response_format: "json"
      });
    } catch (secondWhisperError) {
      throw new Error(
        `Groq Whisper မအောင်မြင်ပါ: ${getErrorMessage(secondWhisperError)}`
      );
    }
  }

  const transcriptText = cleanText(transcript?.text);

  if (!transcriptText) {
    throw new Error("Whisper မှ အသံစာသား မရပါ");
  }

  // ----------------------------------------------------------
  // Groq text model
  // ----------------------------------------------------------

  const systemPrompt =
    "You are a movie recap storyteller. " +
    "Output ONLY fluent natural Burmese spoken-script text. " +
    "No title, markdown, quotes, bullets, or explanation.";

  async function callTextModel(model) {
    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content:
            `${prompt}\n\n` +
            `SOURCE AUDIO TRANSCRIPT:\n${transcriptText}`
        }
      ],
      temperature: 0.55,
      max_tokens: 700
    });

    return cleanText(
      response?.choices?.[0]?.message?.content
    );
  }

  try {
    const result = await callTextModel(GROQ_RECAP_MODEL);

    if (result) return result;

    throw new Error("Groq က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်");
  } catch (firstError) {
    const firstMessage = getErrorMessage(firstError);

    // Try another currently supported production model.
    try {
      const result = await callTextModel(
        GROQ_RECAP_FALLBACK_MODEL
      );

      if (result) return result;

      throw new Error(
        "Groq fallback model က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်"
      );
    } catch (secondError) {
      throw new Error(
        `Groq recap မအောင်မြင်ပါ: ${firstMessage} | Fallback: ${getErrorMessage(secondError)}`
      );
    }
  }
}

// ============================================================
// VERCEL API HANDLER
// ============================================================

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  // NDJSON streaming response.
  res.setHeader(
    "Content-Type",
    "application/x-ndjson; charset=utf-8"
  );
  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );
  res.setHeader(
    "X-Accel-Buffering",
    "no"
  );

  try {
    const body = req.body || {};

    const audioBase64 = body.audioBase64;
    const audioMimeType = body.audioMimeType;
    const frames = Array.isArray(body.frames)
      ? body.frames
      : [];
    const tone = String(
      body.tone || "dramatic"
    );

    const duration = Math.max(
      10,
      Math.min(
        600,
        Math.round(
          Number(body.videoDuration) || 30
        )
      )
    );

    if (
      !audioBase64 ||
      typeof audioBase64 !== "string"
    ) {
      sendEvent(res, {
        type: "error",
        error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ"
      });
      return res.end();
    }

    // Rough spoken-word target based on video duration.
    const targetWords = Math.max(
      25,
      Math.round((duration / 60) * 105)
    );

    const minWords = Math.max(
      18,
      targetWords - 12
    );

    const prompt = `
You are an expert movie recap storyteller writing natural spoken Burmese.

The attached audio is the source narration/dialogue. Listen to the audio directly.
The attached JPEG images are scene snapshots from the same video and may be used to clarify visible scene details.
Do not invent story details that are not supported by the audio or images.

VIDEO DURATION: ${duration} seconds
TONE: ${tone}
TARGET LENGTH: ${minWords}-${targetWords} Burmese spoken words

RULES:
- Preserve important story events.
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

    // Keep these stage names compatible with the existing frontend.
    sendEvent(res, {
      type: "stage",
      stage: "transcribing"
    });

    let script = "";
    let geminiError = "";
    let groqError = "";

    // ----------------------------------------------------------
    // PRIMARY: ONE GEMINI MULTIMODAL CALL
    // ----------------------------------------------------------

    if (gemini) {
      sendEvent(res, {
        type: "stage",
        stage: "writing"
      });

      try {
        script = await generateWithGemini({
          audioBase64,
          audioMimeType,
          frames,
          prompt
        });
      } catch (err) {
        geminiError = getErrorMessage(err);
        console.error(
          "Gemini recap error:",
          geminiError
        );
      }
    }

    // ----------------------------------------------------------
    // FALLBACK: GROQ
    // ----------------------------------------------------------

    if (!script && groq) {
      sendEvent(res, {
        type: "stage",
        stage: "transcribing"
      });

      try {
        script = await generateWithGroq({
          audioBase64,
          audioMimeType,
          prompt
        });
      } catch (err) {
        groqError = getErrorMessage(err);
        console.error(
          "Groq recap error:",
          groqError
        );
      }
    }

    // ----------------------------------------------------------
    // NO RESULT
    // ----------------------------------------------------------

    if (!script) {
      const details = [
        geminiError
          ? `Gemini: ${geminiError}`
          : "",
        groqError
          ? `Groq: ${groqError}`
          : ""
      ]
        .filter(Boolean)
        .join(" | ");

      throw new Error(
        details ||
        "GEMINI_API_KEY သို့မဟုတ် GROQ_API_KEY မရှိပါ"
      );
    }

    // ----------------------------------------------------------
    // SUCCESS
    // ----------------------------------------------------------

    sendEvent(res, {
      type: "result",
      script
    });

    return res.end();
  } catch (err) {
    const message = getErrorMessage(err);

    console.error(
      "generate-recap error:",
      message
    );

    sendEvent(res, {
      type: "error",
      error: message
    });

    return res.end();
  }
};
