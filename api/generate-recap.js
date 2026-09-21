// ============================================================
// Recaps Studio - api/generate-recap.js
//
// Production-safe version:
// - Native fetch only (no AI SDK version dependency)
// - Primary: ONE Gemini multimodal generateContent call
// - Fallback: Groq Whisper -> Groq text model
// - NDJSON progress stream
// - Old/deprecated model environment values are ignored
// ============================================================

const MAX_AUDIO_BASE64_CHARS = 3800000;
const MAX_DURATION_SECONDS = 600;

// Current stable Gemini Flash models only.
const ALLOWED_GEMINI_MODELS = new Set([
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
]);

const configuredGeminiModel = String(
  process.env.GEMINI_RECAP_MODEL || ""
).trim();

const GEMINI_MODEL = ALLOWED_GEMINI_MODELS.has(configuredGeminiModel)
  ? configuredGeminiModel
  : "gemini-3.8-flash";

// Current Groq production text models only.
const ALLOWED_GROQ_MODELS = new Set([
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
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

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GROQ_API_KEY = String(process.env.GROQ_API_KEY || "").trim();

function cleanText(value) {
  return String(value || "")
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function getMimeType(mime, base64) {
  if (typeof mime === "string" && /^audio\//i.test(mime)) {
    return mime.split(";")[0].trim().toLowerCase();
  }

  if (typeof base64 === "string" && base64.startsWith("UklGR")) {
    return "audio/wav";
  }

  return "audio/webm";
}

function getExtension(mime) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "audio";
}

function sendEvent(res, payload) {
  try {
    res.write(JSON.stringify(payload) + "\n");
  } catch (_) {
    // Browser may have disconnected.
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

function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (_) {
      throw new Error("Request JSON မမှန်ပါ");
    }
  }

  return {};
}

async function readJsonOrText(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (_) {
    return { raw };
  }
}

function formatProviderError(provider, response, data) {
  const message =
    data?.error?.message ||
    data?.message ||
    data?.error ||
    data?.raw ||
    `HTTP ${response.status}`;

  return `${provider}: ${message}`;
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  return cleanText(
    parts
      .map((part) => part?.text || "")
      .filter(Boolean)
      .join("\n")
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
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY မသတ်မှတ်ထားပါ");
  }

  const contents = [
    {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: getMimeType(audioMimeType, audioBase64),
            data: audioBase64
          }
        }
      ]
    }
  ];

  // At most 2 tiny JPEGs. They add scene grounding without a large payload.
  for (const frame of Array.isArray(frames) ? frames.slice(0, 2) : []) {
    if (typeof frame !== "string" || frame.length < 50) continue;

    contents[0].parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame.replace(/^data:image\/[^;]+;base64,/, "")
      }
    });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ contents })
  });

  const data = await readJsonOrText(response);

  if (!response.ok) {
    throw new Error(formatProviderError("Gemini", response, data));
  }

  const script = extractGeminiText(data);
  if (!script) {
    const blockReason =
      data?.promptFeedback?.blockReason ||
      data?.candidates?.[0]?.finishReason ||
      "empty response";
    throw new Error(`Gemini returned no recap text (${blockReason})`);
  }

  return script;
}

// ============================================================
// GROQ FALLBACK
// Audio -> Whisper -> text model
// ============================================================
async function transcribeWithGroq(audioBase64, audioMimeType) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY မသတ်မှတ်ထားပါ");
  }

  const mime = getMimeType(audioMimeType, audioBase64);
  const extension = getExtension(mime);
  const audioBuffer = Buffer.from(audioBase64, "base64");

  if (!audioBuffer.length) {
    throw new Error("Audio data အလွတ်ဖြစ်နေပါတယ်");
  }

  async function callWhisper(model) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([audioBuffer], { type: mime }),
      `recap-audio.${extension}`
    );
    form.append("model", model);
    form.append("response_format", "json");

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: form
      }
    );

    const data = await readJsonOrText(response);
    if (!response.ok) {
      throw new Error(formatProviderError("Groq Whisper", response, data));
    }

    return cleanText(data?.text);
  }

  try {
    const text = await callWhisper(GROQ_WHISPER_MODEL);
    if (text) return text;
    throw new Error("Whisper က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်");
  } catch (firstError) {
    if (GROQ_WHISPER_MODEL === "whisper-large-v3") {
      throw new Error(getErrorMessage(firstError));
    }

    try {
      const text = await callWhisper("whisper-large-v3");
      if (text) return text;
      throw new Error("Whisper fallback က အလွတ်စာသားပြန်ပေးခဲ့ပါတယ်");
    } catch (secondError) {
      throw new Error(
        `Groq Whisper မအောင်မြင်ပါ: ${getErrorMessage(firstError)} | Fallback: ${getErrorMessage(secondError)}`
      );
    }
  }
}

async function completeWithGroq(model, prompt, transcriptText) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a movie recap storyteller. " +
              "Output ONLY fluent natural Burmese spoken-script text. " +
              "No title, markdown, quotes, bullets, or explanation."
          },
          {
            role: "user",
            content:
              `${prompt}\n\nSOURCE AUDIO TRANSCRIPT:\n${transcriptText}`
          }
        ],
        temperature: 0.55,
        max_tokens: 700
      })
    }
  );

  const data = await readJsonOrText(response);
  if (!response.ok) {
    throw new Error(formatProviderError("Groq recap", response, data));
  }

  return cleanText(data?.choices?.[0]?.message?.content);
}

async function generateWithGroq({
  audioBase64,
  audioMimeType,
  prompt
}) {
  const transcriptText = await transcribeWithGroq(
    audioBase64,
    audioMimeType
  );

  if (!transcriptText) {
    throw new Error("Whisper မှ အသံစာသား မရပါ");
  }

  try {
    const result = await completeWithGroq(
      GROQ_RECAP_MODEL,
      prompt,
      transcriptText
    );

    if (result) return result;
    throw new Error("Groq က အလွတ် recap ပြန်ပေးခဲ့ပါတယ်");
  } catch (firstError) {
    const firstMessage = getErrorMessage(firstError);

    try {
      const result = await completeWithGroq(
        GROQ_RECAP_FALLBACK_MODEL,
        prompt,
        transcriptText
      );

      if (result) return result;
      throw new Error("Groq fallback model က အလွတ် recap ပြန်ပေးခဲ့ပါတယ်");
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
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  try {
    const body = getBody(req);
    const audioBase64 = body.audioBase64;
    const audioMimeType = body.audioMimeType;
    const frames = Array.isArray(body.frames) ? body.frames : [];
    const tone = String(body.tone || "dramatic").slice(0, 80);

    const duration = Math.max(
      1,
      Math.min(
        MAX_DURATION_SECONDS,
        Math.round(Number(body.videoDuration) || 30)
      )
    );

    if (!audioBase64 || typeof audioBase64 !== "string") {
      sendEvent(res, {
        type: "error",
        error: "အသံဖိုင်ဒေတာ မပါဝင်ပါ"
      });
      return res.end();
    }

    if (audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
      sendEvent(res, {
        type: "error",
        error: "အသံ request အရွယ်အစားကြီးလွန်းပါသည်။ ၁၀ မိနစ်အောက် video ကို အသုံးပြုပါ။"
      });
      return res.end();
    }

    const targetWords = Math.max(
      25,
      Math.round((duration / 60) * 105)
    );
    const minWords = Math.max(18, targetWords - 12);

    const prompt = `
You are an expert movie recap storyteller writing natural spoken Burmese.

The attached audio is the source narration/dialogue. Listen to the audio directly.
The attached JPEG images are scene snapshots from the same video and may clarify visible scene details.
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

    sendEvent(res, { type: "stage", stage: "transcribing" });

    let script = "";
    let geminiError = "";
    let groqError = "";

    // PRIMARY: one Gemini multimodal call.
    if (GEMINI_API_KEY) {
      sendEvent(res, { type: "stage", stage: "writing" });

      try {
        script = await generateWithGemini({
          audioBase64,
          audioMimeType,
          frames,
          prompt
        });
      } catch (err) {
        geminiError = getErrorMessage(err);
        console.error("Gemini recap error:", geminiError);
      }
    }

    // FALLBACK: Groq is used only if Gemini failed/unavailable.
    if (!script && GROQ_API_KEY) {
      sendEvent(res, { type: "stage", stage: "transcribing" });

      try {
        script = await generateWithGroq({
          audioBase64,
          audioMimeType,
          prompt
        });
      } catch (err) {
        groqError = getErrorMessage(err);
        console.error("Groq recap error:", groqError);
      }
    }

    if (!script) {
      const details = [
        geminiError ? `Gemini: ${geminiError}` : "",
        groqError ? `Groq: ${groqError}` : ""
      ]
        .filter(Boolean)
        .join(" | ");

      throw new Error(
        details ||
        "GEMINI_API_KEY သို့မဟုတ် GROQ_API_KEY မရှိပါ"
      );
    }

    sendEvent(res, { type: "result", script });
    return res.end();
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("generate-recap error:", message);
    sendEvent(res, { type: "error", error: message });
    return res.end();
  }
};

// Vercel Node function request parser limit.
module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb"
    }
  }
};
