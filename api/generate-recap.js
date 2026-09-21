const { GoogleGenAI } = require("@google/genai");
const { Groq, toFile } = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ""
});

// ===============================
// AI MODEL SETTINGS
// ===============================

const GEMINI_MODEL =
  process.env.GEMINI_RECAP_MODEL || "gemini-2.5-flash";

const WHISPER_MODEL =
  process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

// IMPORTANT:
// llama-3.3-70b-versatile is deprecated.
// Use GPT-OSS 120B first, then Qwen fallback.
const GROQ_RECAP_MODEL =
  process.env.GROQ_RECAP_MODEL || "openai/gpt-oss-120b";


// ===============================
// HELPERS
// ===============================

function cleanModelText(text) {
  return String(text || "")
    .replace(/^```(?:text|markdown)?/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*["“]/, "")
    .replace(/["”]\s*$/, "")
    .trim();
}


function sendEvent(res, event) {
  try {
    res.write(JSON.stringify(event) + "\n");
  } catch (err) {
    console.error("Streaming event error:", err);
  }
}


function normalizeMime(mime, base64) {
  if (mime && /^audio\//i.test(mime)) {
    return mime.split(";")[0];
  }

  // WAV fallback
  if (base64?.startsWith("UklGR")) {
    return "audio/wav";
  }

  // Default browser recording format
  return "audio/webm";
}


// ===============================
// GEMINI ONE-CALL RECAP
// ===============================

async function runGeminiOneCall({
  audioBase64,
  audioMimeType,
  frames,
  prompt
}) {
  if (!process.env.GEMINI_API_KEY) {
    return "";
  }

  const contents = [
    {
      inlineData: {
        mimeType: normalizeMime(
          audioMimeType,
          audioBase64
        ),
        data: audioBase64
      }
    },

    {
      text: prompt
    }
  ];


  // Only send maximum 2 small JPEG frames.
  // Audio + images + prompt = ONE Gemini API call.

  for (
    const frame of Array.isArray(frames)
      ? frames.slice(0, 2)
      : []
  ) {
    if (
      typeof frame !== "string" ||
      frame.length < 50
    ) {
      continue;
    }

    contents.push({
      inlineData: {
        mimeType: "image/jpeg",

        data: frame.replace(
          /^data:image\/\w+;base64,/,
          ""
        )
      }
    });
  }


  const response =
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents
    });


  return cleanModelText(
    response?.text
  );
}


// ===============================
// GROQ FALLBACK
// ===============================

async function runGroqFallback(
  audioBase64,
  audioMimeType,
  prompt
) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY မတွေ့ပါ"
    );
  }


  // =============================
  // 1. AUDIO -> TEXT
  // =============================

  const mime =
    normalizeMime(
      audioMimeType,
      audioBase64
    );

  const ext =
    mime.split("/")[1] || "webm";

  const audioBuffer =
    Buffer.from(
      audioBase64,
      "base64"
    );


  const file = await toFile(
    audioBuffer,
    `audio.${ext}`
  );


  let transcript;


  try {
    transcript =
      await groq.audio.transcriptions.create({
        file,

        model:
          WHISPER_MODEL,

        response_format:
          "json"
      });

  } catch (err) {

    console.error(
      `Whisper ${WHISPER_MODEL} failed:`,
      err?.message || err
    );


    // Fallback Whisper model
    if (
      WHISPER_MODEL !==
      "whisper-large-v3"
    ) {

      transcript =
        await groq.audio.transcriptions.create({
          file,

          model:
            "whisper-large-v3",

          response_format:
            "json"
        });

    } else {
      throw err;
    }
  }


  const transcriptText =
    String(
      transcript?.text || ""
    ).trim();


  if (!transcriptText) {
    throw new Error(
      "အသံမှ စာသားမရရှိပါ"
    );
  }


  // =============================
  // 2. TEXT -> BURMESE RECAP
  // =============================

  let response;


  try {

    response =
      await groq.chat.completions.create({

        model:
          GROQ_RECAP_MODEL,

        messages: [

          {
            role: "system",

            content:
              "You are a movie recap storyteller. " +
              "Output ONLY fluent Burmese spoken-script text. " +
              "No title, markdown, quotes, or explanation."
          },

          {
            role: "user",

            content:
              `${prompt}\n\n` +
              `AUDIO TRANSCRIPT:\n` +
              transcriptText
          }

        ],

        temperature: 0.55,

        max_tokens: 500
      });


  } catch (err) {

    console.error(
      `Groq recap model ${GROQ_RECAP_MODEL} failed:`,
      err?.message || err
    );


    // ==================================
    // SECOND GROQ MODEL FALLBACK
    // ==================================

    if (
      GROQ_RECAP_MODEL !==
      "qwen/qwen3.8-27b"
    ) {

      response =
        await groq.chat.completions.create({

          model:
            "qwen/qwen3.8-27b",

          messages: [

            {
              role: "system",

              content:
                "You are a movie recap storyteller. " +
                "Output ONLY fluent Burmese spoken-script text. " +
                "No title, markdown, quotes, or explanation."
            },

            {
              role: "user",

              content:
                `${prompt}\n\n` +
                `AUDIO TRANSCRIPT:\n` +
                transcriptText
            }

          ],

          temperature: 0.55,

          max_tokens: 500
        });

    } else {

      throw err;

    }
  }


  return cleanModelText(
    response
      ?.choices?.[0]
      ?.message
      ?.content
  );
}


// ===============================
// API HANDLER
// ===============================

module.exports = async function handler(
  req,
  res
) {

  // =============================
  // METHOD CHECK
  // =============================

  if (req.method !== "POST") {

    return res
      .status(405)
      .json({
        error:
          "Method Not Allowed"
      });
  }


  // =============================
  // STREAMING RESPONSE
  // =============================

  res.setHeader(
    "Content-Type",
    "application/x-ndjson; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache, no-transform"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.setHeader(
    "X-Accel-Buffering",
    "no"
  );


  try {

    // ===========================
    // REQUEST DATA
    // ===========================

    const {
      audioBase64,
      audioMimeType,
      frames = [],
      tone = "dramatic",
      videoDuration
    } = req.body || {};


    // ===========================
    // AUDIO CHECK
    // ===========================

    if (!audioBase64) {

      sendEvent(res, {
        type: "error",
        error:
          "အသံဖိုင်ဒေတာ မပါဝင်ပါ"
      });

      return res.end();
    }


    // ===========================
    // DURATION
    // ===========================

    const duration =
      Math.max(
        10,
        Math.round(
          Number(videoDuration) || 30
        )
      );


    // ===========================
    // WORD COUNT
    // ===========================

    const targetWordCount =
      Math.max(
        15,
        Math.round(
          (duration / 60) * 105
        )
      );


    const minWords =
      Math.max(
        12,
        targetWordCount - 8
      );


    // ===========================
    // AI PROMPT
    // ===========================

    const prompt = `
You are an expert movie recap storyteller writing natural spoken Burmese.

The attached audio is the source narration/dialogue.
Listen to it directly; do NOT ask for a separate transcript.

The attached images are scene snapshots from the same video.
Use them only to clarify visible actions, characters, locations,
and scene progression.

Do not invent details that are not supported by the audio
or the images.

STRICT OUTPUT RULES:

- Video duration: exactly ${duration} seconds.
- Write ${minWords}-${targetWordCount} Burmese spoken words.
- Never exceed ${targetWordCount} words.
- Tone: ${String(tone)}.
- Prefer short, natural spoken phrases.
- Use commas naturally for speaking pauses.
- Preserve important story events.
- Remove filler and repetition.
- Make the script sound natural when read by AI voice.
- Output ONLY the spoken Burmese script.
- No title.
- No quotes.
- No markdown.
- No bullets.
- No transcript.
- No explanation.
`;


    // ===========================
    // STREAM STATUS
    // ===========================

    sendEvent(res, {
      type: "stage",
      stage: "transcribing"
    });


    let recapScript = "";


    // ==================================================
    // GEMINI PATH
    // ONE API CALL
    // AUDIO + 2 IMAGES + PROMPT
    // ==================================================

    if (
      process.env.GEMINI_API_KEY
    ) {

      sendEvent(res, {
        type: "stage",
        stage: "writing"
      });


      try {

        recapScript =
          await runGeminiOneCall({

            audioBase64,

            audioMimeType,

            frames,

            prompt

          });


      } catch (err) {

        console.error(
          `Gemini one-call recap failed (${GEMINI_MODEL}):`,
          err?.message || err
        );

        recapScript = "";
      }
    }


    // ==================================================
    // GROQ FALLBACK
    // ==================================================

    if (
      !recapScript &&
      process.env.GROQ_API_KEY
    ) {

      sendEvent(res, {
        type: "stage",
        stage: "transcribing"
      });


      recapScript =
        await runGroqFallback(
          audioBase64,
          audioMimeType,
          prompt
        );
    }


    // ===========================
    // FINAL CHECK
    // ===========================

    if (!recapScript) {

      throw new Error(
        "AI မှ Recap စာသား မရရှိပါ"
      );
    }


    // ===========================
    // RESULT
    // ===========================

    sendEvent(res, {
      type: "result",
      script: recapScript
    });


    res.end();


  } catch (err) {

    console.error(
      "Recap generation error:",
      err
    );


    sendEvent(res, {
      type: "error",

      error:
        err?.message ||
        "Recap စာသား ရေးသားမှု မအောင်မြင်ပါ"
    });


    res.end();
  }
};
