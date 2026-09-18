"use strict";

const HF_SPACE_URL =
  process.env.HF_SPACE_URL ||
  "https://nlopro-burmese-tts-api.hf.space";

const DEFAULT_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash"
];

const GEMINI_MODELS = process.env.GEMINI_PRIMARY_MODEL
  ? [
      process.env.GEMINI_PRIMARY_MODEL,
      ...DEFAULT_GEMINI_MODELS.filter(
        (m) => m !== process.env.GEMINI_PRIMARY_MODEL
      )
    ]
  : DEFAULT_GEMINI_MODELS;

const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const LIMITS = {
  maxTopicLength: 500,
  maxGenreLength: 200,
  maxScriptLength: 50000,
  maxPromptLength: 50000,
  maxPhotoCount: 20,
  maxDurationMinutes: 120
};

const TIMEOUTS = {
  gemini: 15000,
  groq: 12000,
  pollinations: 15000,
  hfTTS: 20000,
  googleTTS: 12000
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(text) {
  if (!isNonEmptyString(text)) return "";

  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\uFEFF/g, "")
    .trim();
}

function getEnv(name) {
  const value = process.env[name];
  return isNonEmptyString(value) ? value.trim() : null;
}

function getClientIP(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => { controller.abort(); }, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function countBurmese(text) {
  return (String(text).match(/[\u1000-\u109F]/g) || []).length;
}

function countLatin(text) {
  return (String(text).match(/[A-Za-z]/g) || []).length;
}

function cleanAIFormatting(text) {
  if (!text) return "";
  let result = String(text);
  result = result
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:text|markdown|burmese|myanmar)?/gi, "")
    .replace(/```/g, "")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  return result.trim();
}

function filterStrictBurmeseStory(rawText) {
  if (!rawText) return "";
  let text = cleanAIFormatting(rawText);

  text = text
    .replace(/^(ဇာတ်လမ်း|ဇာတ်ကြောင်း|ဇာတ်ညွှန်း|story|narration)\s*[:\-–—]*/i, "")
    .trim();

  const lines = text.split("\n");
  const output = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    line = line.replace(/^\s*(?:[-*•]+|\d+[.)]|[၀-၉]+[.)])\s*/, "");
    line = line.replace(/^\s*(?:scene|episode|အပိုင်း|ဇာတ်ဝင်ခန်း)\s*[\d၀-၉]*\s*[:.)\-–—]*/i, "");
    line = line.trim();
    if (!line) continue;

    const myCount = countBurmese(line);
    const latinCount = countLatin(line);

    if (myCount >= 2) {
      if (latinCount > 8 && myCount < latinCount) continue;
      output.push(line);
    }
  }

  let finalStory = output.join(" ");
  finalStory = finalStory
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  finalStory = finalStory
    .replace(/\s+။/g, "။")
    .replace(/။\s*/g, "။ ")
    .replace(/\s+၊/g, "၊")
    .replace(/၊\s*/g, "၊ ");

  return finalStory.trim();
}

function validateScript(scriptText) {
  const script = normalizeText(scriptText);
  if (!script) throw new Error("စာသား မပါဝင်ပါ");
  if (script.length < 2) throw new Error("စာသား အလွန်တိုနေပါသည်");
  if (script.length > LIMITS.maxScriptLength) {
    throw new Error(`Script သည် ${LIMITS.maxScriptLength.toLocaleString()} characters ထက် မကျော်ရပါ`);
  }
  return script;
}

function splitTextForTTS(text, maxLength = 180) {
  const clean = normalizeText(text);
  if (!clean) return [];

  const sentences = clean.match(/[^။!?！？\n]+[။!?！？\n]?/g) || [clean];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    let part = sentence.trim();
    if (!part) continue;

    if ((current + " " + part).trim().length <= maxLength) {
      current = `${current} ${part}`.trim();
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    while (part.length > maxLength) {
      let cut = part.lastIndexOf(" ", maxLength);
      if (cut < Math.floor(maxLength * 0.5)) cut = maxLength;
      chunks.push(part.slice(0, cut).trim());
      part = part.slice(cut).trim();
    }

    if (part) current = part;
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

// ============================================================
// TTS ENGINE (EDGE 5 + GOOGLE 2)
// ============================================================

async function fetchGoogleTTSChunk(text) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=my&client=tw-ob`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Referer: "https://translate.google.com/"
    }
  }, TIMEOUTS.googleTTS);

  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (!buffer.length) throw new Error("Google TTS returned empty audio");
  return buffer;
}

async function fetchGoogleTTS(text) {
  const chunks = splitTextForTTS(text, 180);
  if (!chunks.length) throw new Error("Google TTS: Empty text");

  const buffers = [];
  for (const chunk of chunks) {
    const buffer = await fetchGoogleTTSChunk(chunk);
    buffers.push(buffer);
    if (chunks.length > 1) await sleep(80);
  }
  return Buffer.concat(buffers).toString("base64");
}

function resolveVoiceMeta(voiceKey) {
  const key = String(voiceKey || "").toLowerCase();

  if (key === "thiha-deep") {
    return { isEdge: true, voiceName: "my-MM-ThihaNeural", rate: "-4%", pitch: "-8Hz", label: "သီဟ (ဩဇာကြီး)" };
  }
  if (key === "thiha-fast") {
    return { isEdge: true, voiceName: "my-MM-ThihaNeural", rate: "+12%", pitch: "+0Hz", label: "သီဟ (သွက်လက်)" };
  }
  if (key === "thiha-regular" || key === "edge-thiha") {
    return { isEdge: true, voiceName: "my-MM-ThihaNeural", rate: "+0%", pitch: "+0Hz", label: "သီဟ (ပုံမှန်)" };
  }
  if (key === "nilar-warm") {
    return { isEdge: true, voiceName: "my-MM-NilarNeural", rate: "-6%", pitch: "-4Hz", label: "နီလာ (နွေးထွေး)" };
  }
  if (key === "nilar-clear" || key === "edge-nilar") {
    return { isEdge: true, voiceName: "my-MM-NilarNeural", rate: "+0%", pitch: "+4Hz", label: "နီလာ (ကြည်လင်)" };
  }
  if (key === "google-male") {
    return { isEdge: true, voiceName: "my-MM-ThihaNeural", rate: "+0%", pitch: "-2Hz", label: "Google (ကျား)" };
  }
  if (key === "google-female" || key === "google-my-female") {
    return { isEdge: false, voiceName: "google-female", rate: "+0%", pitch: "+0Hz", label: "Google (မ)" };
  }

  return { isEdge: true, voiceName: "my-MM-ThihaNeural", rate: "+0%", pitch: "+0Hz", label: "သီဟ (ပုံမှန်)" };
}

async function startHFJob(text, meta) {
  const url = `${HF_SPACE_URL}/gradio_api/call/predict`;

  let res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [text, meta.voiceName, meta.rate, meta.pitch]
    })
  }, TIMEOUTS.hfTTS).catch(() => null);

  if (!res || !res.ok) {
    res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text, meta.voiceName] })
    }, TIMEOUTS.hfTTS).catch(() => null);
  }

  if (!res || !res.ok) {
    const errorText = res ? await res.text().catch(() => "") : "";
    throw new Error(`HF TTS POST failed ${errorText.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => null);
  if (data?.event_id) return data.event_id;
  if (data?.data) return { immediate: data.data };
  throw new Error("HF TTS did not return event_id");
}

function extractGradioAudio(value) {
  if (!value) return null;
  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    try {
      const parsed = JSON.parse(value);
      if (parsed) return extractGradioAudio(parsed);
    } catch (_) {}
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractGradioAudio(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const k of ["url", "path", "name", "file", "data"]) {
      const found = extractGradioAudio(value[k]);
      if (found) return found;
    }
  }
  return null;
}

async function waitForHFResult(eventId) {
  if (eventId && typeof eventId === "object") return eventId.immediate || eventId;

  const url = `${HF_SPACE_URL}/gradio_api/call/predict/${encodeURIComponent(eventId)}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Accept: "text/event-stream" }
  }, 35000);

  if (!res.ok) throw new Error(`HF TTS stream HTTP ${res.status}`);
  const streamText = await res.text();
  const lines = streamText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) throw new Error(String(parsed.error));
      const audio = extractGradioAudio(parsed);
      if (audio) return audio;
    } catch (err) {
      if (err.message && !String(err.message).includes("Unexpected token")) throw err;
    }
  }
  throw new Error("HF TTS returned no audio result");
}

async function resolveHFFileToBase64(audioValue) {
  if (!audioValue) throw new Error("HF TTS audio result is empty");

  if (typeof audioValue === "string" && audioValue.startsWith("data:audio/")) {
    return audioValue.split(",")[1] || "";
  }
  if (typeof audioValue === "string" && /^https?:\/\//i.test(audioValue)) {
    const res = await fetchWithTimeout(audioValue, {}, TIMEOUTS.hfTTS);
    if (!res.ok) throw new Error(`HF audio download HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  }
  if (typeof audioValue === "string" && (audioValue.startsWith("/file=") || audioValue.startsWith("/tmp/") || audioValue.includes("/gradio/"))) {
    const encodedPath = audioValue.replace(/^\/+/, "");
    const url = `${HF_SPACE_URL}/file=${encodeURIComponent(encodedPath)}`;
    const res = await fetchWithTimeout(url, {}, TIMEOUTS.hfTTS);
    if (!res.ok) throw new Error(`HF file download HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer()).toString("base64");
  }
  if (typeof audioValue === "string" && /^[A-Za-z0-9+/=\r\n]+$/.test(audioValue) && audioValue.length > 100) {
    return audioValue.replace(/\s+/g, "");
  }
  throw new Error("Unsupported HF audio result format");
}

async function fetchEdgeTTSDirect(text, meta) {
  const chunks = splitTextForTTS(text, 180);
  if (!chunks.length) throw new Error("Edge TTS: Empty text");

  const audioBuffers = [];
  for (const chunk of chunks) {
    const job = await startHFJob(chunk, meta);
    const result = await waitForHFResult(job);
    const base64 = await resolveHFFileToBase64(result);
    if (!base64) throw new Error("Edge TTS returned empty audio");
    audioBuffers.push(Buffer.from(base64, "base64"));
    if (chunks.length > 1) await sleep(100);
  }
  return Buffer.concat(audioBuffers).toString("base64");
}

async function fetchAudioSafe(text, voiceKey) {
  const script = validateScript(text);
  const meta = resolveVoiceMeta(voiceKey);
  const errors = [];

  if (!meta.isEdge) {
    try {
      const audio = await fetchGoogleTTS(script);
      return { audioBase64: audio, provider: "Google TTS", voice: meta.label };
    } catch (err) {
      errors.push(`Google TTS: ${err.message}`);
    }
  }

  try {
    const audio = await fetchEdgeTTSDirect(script, meta);
    return { audioBase64: audio, provider: "Edge-TTS (သဘာဝ)", voice: meta.label };
  } catch (err) {
    errors.push(`Edge-TTS (${meta.label}): ${err.message}`);
  }

  try {
    const audio = await fetchGoogleTTS(script);
    return { audioBase64: audio, provider: "Google TTS", voice: "Google (မ)" };
  } catch (err) {
    errors.push(`Google Fallback: ${err.message}`);
  }

  throw new Error(`TTS ဝန်ဆောင်မှု မအောင်မြင်ပါ။ ${errors.join(" | ")}`);
}

// ============================================================
// AI GENERATION (GEMINI MODELS & GROQ)
// ============================================================

async function callDirectGemini(apiKey, model, prompt, options = {}) {
  if (!apiKey) throw new Error("Gemini API key မရှိပါ");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
      maxOutputTokens: Number(options.maxOutputTokens) || 4000
    }
  };

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, options.timeout || TIMEOUTS.gemini);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
    error.status = res.status;
    error.provider = "Gemini";
    error.model = model;
    throw error;
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const result = parts.map((part) => part?.text || "").join("").trim();
  if (!result) throw new Error(`Gemini ${model}: Empty response`);
  return result;
}

async function callDirectGroq(apiKey, prompt) {
  if (!apiKey) throw new Error("Groq API key မရှိပါ");
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000
    })
  }, TIMEOUTS.groq);

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data?.error?.message || `Groq HTTP ${res.status}`);
    error.status = res.status;
    error.provider = "Groq";
    throw error;
  }

  const result = data?.choices?.[0]?.message?.content?.trim();
  if (!result) throw new Error("Groq returned empty response");
  return result;
}

async function callPollinations(prompt) {
  const res = await fetchWithTimeout("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
  }, TIMEOUTS.pollinations);

  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  const result = await res.text();
  if (!result.trim()) throw new Error("Pollinations returned empty response");
  return result.trim();
}

async function runFastAI(prompt, options = {}) {
  const errors = [];
  const geminiKey = getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_API_KEY");
  const groqKey = getEnv("GROQ_API_KEY");

  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const result = await callDirectGemini(geminiKey, model, prompt, {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 4000
        });
        return { text: result, modelUsed: `Gemini (${model})`, provider: "Gemini" };
      } catch (err) {
        errors.push(`Gemini ${model}: ${err.message}`);
      }
    }
  }

  if (groqKey) {
    try {
      const result = await callDirectGroq(groqKey, prompt);
      return { text: result, modelUsed: `Groq (${GROQ_MODEL})`, provider: "Groq" };
    } catch (err) {
      errors.push(`Groq: ${err.message}`);
    }
  }

  try {
    const result = await callPollinations(prompt);
    return { text: result, modelUsed: "Pollinations AI", provider: "Pollinations" };
  } catch (err) {
    errors.push(`Pollinations: ${err.message}`);
  }

  throw new Error("AI မော်ဒယ် ချိတ်ဆက်မှု မအောင်မြင်ပါ။ " + errors.join(" | "));
}

function buildScenePrompt(scriptText, count) {
  const safeCount = clamp(parseInt(count, 10) || 4, 1, LIMITS.maxPhotoCount);
  const script = normalizeText(scriptText);
  const paragraphs = script.split(/\n{2,}|(?<=။)\s+/).map((x) => x.trim()).filter(Boolean);

  let selected = paragraphs;
  if (selected.length < safeCount) {
    const approxSize = Math.ceil(script.length / safeCount);
    selected = [];
    for (let i = 0; i < safeCount; i++) {
      const start = i * approxSize;
      selected.push(script.slice(start, start + approxSize));
    }
  }

  const maxInput = 24000;
  if (script.length > maxInput) {
    const part = Math.floor(maxInput / 3);
    selected = [
      script.slice(0, part),
      script.slice(Math.floor(script.length / 2) - part / 2, Math.floor(script.length / 2) + part / 2),
      script.slice(-part)
    ];
  }

  return { count: safeCount, source: selected.join("\n\n") };
}

async function generateScenePrompts(scriptText, photoCount) {
  const { count, source } = buildScenePrompt(scriptText, photoCount);
  const prompt = `
You are a professional cinematic storyboard and image-prompt writer.
Read the Burmese story below.
Create exactly ${count} DIFFERENT cinematic scenes that cover the story from beginning to end.

IMPORTANT:
- Output exactly ${count} lines.
- English only.
- One complete image-generation prompt per line.
- Do not number the lines.
- Do not use bullet points.
- Do not write explanations.
- Do not write "Scene 1", "Scene 2", etc.
- Keep the same main characters visually consistent.
- Preserve age, gender, clothing, hairstyle and important objects when the story provides them.
- Each scene must represent a different moment from the story.
- Photorealistic cinematic movie still, 16:9, no text, no watermark.

STORY:
${source}
`.trim();

  const aiRes = await runFastAI(prompt, { temperature: 0.55, maxOutputTokens: 5000 });
  const rawLines = cleanAIFormatting(aiRes.text)
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, "").replace(/^scene\s*\d+\s*[:.)\-–—]\s*/i, "").trim())
    .filter((line) => line.length > 20 && countLatin(line) > 10);

  const prompts = [];
  for (let i = 0; i < count; i++) {
    prompts.push(
      rawLines[i] ||
      `Cinematic photorealistic movie scene ${i + 1}, natural environment, realistic characters, dramatic cinematic lighting, detailed composition, realistic film still, 16:9, no text, no watermark`
    );
  }

  return { prompts, modelUsed: aiRes.modelUsed };
}

async function generateMovieStory({ topic, genre, durationMinutes }) {
  const selectedMins = clamp(parseInt(durationMinutes, 10) || 1, 1, LIMITS.maxDurationMinutes);
  const targetChars = selectedMins * 700;

  const prompt = `
ရေးသားသူသည် မြန်မာဘာသာ ဇာတ်လမ်း narration ရေးသားသူတစ်ဦးဖြစ်သည်။
ခေါင်းစဉ်: ${topic}
အမျိုးအစား: ${genre || "ဇာတ်လမ်း"}
အရှည်: ခန့်မှန်းအားဖြင့် ${selectedMins} မိနစ်စာ narration ဖြစ်အောင် မြန်မာစာ ${targetChars} characters ဝန်းကျင် ရေးပါ။

လိုက်နာရန်:
- သဘာဝကျသော မြန်မာဘာသာဖြင့် ရေးပါ။
- ဇာတ်လမ်းအစ၊ အလယ်၊ အဆုံး ရှိရမည်။
- English စာကြောင်းများ မထည့်ပါနှင့်။
- Markdown, Bullet, Planning notes မထည့်ပါနှင့်။
- ခေါင်းစဉ်နှင့် နံပါတ်စဉ် မထည့်ပါနှင့်။
Output သည် ဇာတ်လမ်း narration တစ်ခုတည်းသာ ဖြစ်ရမည်။
`.trim();

  const aiRes = await runFastAI(prompt, {
    temperature: 0.82,
    maxOutputTokens: Math.min(12000, Math.max(3000, selectedMins * 1200))
  });

  const story = filterStrictBurmeseStory(aiRes.text);
  if (!story || countBurmese(story) < 20) throw new Error("AI က မှန်ကန်သော မြန်မာဇာတ်လမ်း မထုတ်ပေးနိုင်ပါ");

  return {
    format: "movie",
    title: topic,
    story_text: story,
    model_used: aiRes.modelUsed
  };
}

async function generateSeriesStory({ topic, genre, durationMinutes }) {
  const selectedMins = clamp(parseInt(durationMinutes, 10) || 1, 1, LIMITS.maxDurationMinutes);
  const charsPerEpisode = selectedMins * 650;

  const prompt = `
မြန်မာဘာသာဖြင့် ဆက်စပ်နေသော ဇာတ်လမ်းတွဲ ၆ ပိုင်း ရေးပါ။
ခေါင်းစဉ်: ${topic}
အမျိုးအစား: ${genre || "ဇာတ်လမ်း"}
Episode တစ်ပိုင်းစီ: ခန့်မှန်း ${charsPerEpisode} characters ဝန်းကျင်။

အရေးကြီး:
- အပိုင်း ၆ ပိုင်းလုံးသည် ဇာတ်လမ်းတစ်ခုတည်းအဖြစ် ဆက်စပ်နေရမည်။
- Pure Burmese narration ဖြစ်ရမည်။ English, Markdown, Bullet, နံပါတ်စဉ် မရေးပါနှင့်။

အပိုင်းများကို အောက်ပါ marker များဖြင့်သာ ခွဲပါ။
=== အပိုင်း ၁ ===
ဇာတ်လမ်း
=== အပိုင်း ၂ ===
ဇာတ်လမ်း
=== အပိုင်း ၃ ===
ဇာတ်လမ်း
=== အပိုင်း ၄ ===
ဇာတ်လမ်း
=== အပိုင်း ၅ ===
ဇာတ်လမ်း
=== အပိုင်း ၆ ===
ဇာတ်လမ်း
`.trim();

  const aiRes = await runFastAI(prompt, { temperature: 0.82, maxOutputTokens: 20000 });
  const cleaned = cleanAIFormatting(aiRes.text);
  const markerRegex = /===\s*(?:အပိုင်း|episode)\s*[၀-၉0-9]+\s*===/gi;
  const parts = cleaned.split(markerRegex);

  const episodes = [];
  for (let i = 0; i < 6; i++) {
    const rawEpisode = parts[i + 1] || "";
    const text = filterStrictBurmeseStory(rawEpisode);
    episodes.push({
      ep: i + 1,
      title: `အပိုင်း ${i + 1}`,
      text: text || `${topic} အကြောင်း ဆက်လက်ဖြစ်ပွားနေသော ဇာတ်လမ်းအပိုင်း။`
    });
  }

  return {
    format: "series",
    title: topic,
    episodes,
    model_used: aiRes.modelUsed
  };
}

function getBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch (_) {
    throw new Error("Invalid JSON request body");
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed", allowed: ["POST"] });
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const body = getBody(req);
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = body;

    if (action === "generate_audio") {
      const script = validateScript(scriptText);
      const result = await fetchAudioSafe(script, voice);
      return res.status(200).json({
        success: true,
        action: "generate_audio",
        audioBase64: result.audioBase64,
        mime_type: "audio/mpeg",
        model_used: result.provider,
        voice_used: result.voice,
        request_id: requestId
      });
    }

    if (action === "translate_to_prompts") {
      const script = validateScript(scriptText);
      const count = clamp(parseInt(photoCount, 10) || 4, 1, LIMITS.maxPhotoCount);
      const result = await generateScenePrompts(script, count);
      return res.status(200).json({
        success: true,
        action: "translate_to_prompts",
        prompts_text: result.prompts.join("\n\n"),
        prompts_array: result.prompts,
        count,
        model_used: result.modelUsed,
        request_id: requestId
      });
    }

    if (action === "generate_script" || action === "generate_story" || !action) {
      if (!isNonEmptyString(topic)) {
        return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ", request_id: requestId });
      }

      const cleanTopic = topic.trim().slice(0, LIMITS.maxTopicLength);
      const cleanGenre = isNonEmptyString(genre) ? genre.trim().slice(0, LIMITS.maxGenreLength) : "ဇာတ်လမ်း";
      const selectedFormat = format === "series" ? "series" : "movie";

      if (selectedFormat === "series") {
        const result = await generateSeriesStory({ topic: cleanTopic, genre: cleanGenre, durationMinutes });
        return res.status(200).json({ success: true, ...result, request_id: requestId });
      }

      const result = await generateMovieStory({ topic: cleanTopic, genre: cleanGenre, durationMinutes });
      return res.status(200).json({ success: true, ...result, request_id: requestId });
    }

    return res.status(400).json({
      error: "Unknown action",
      supported_actions: ["generate_script", "generate_story", "generate_audio", "translate_to_prompts"],
      request_id: requestId
    });

  } catch (err) {
    console.error(`[Story API Error ${requestId}]`, {
      message: err?.message,
      provider: err?.provider,
      model: err?.model,
      status: err?.status,
      ip: getClientIP(req)
    });

    const status = (err?.status >= 400 && err?.status < 500) ? err.status : 500;
    return res.status(status).json({
      success: false,
      error: err?.message || "ဇာတ်လမ်းလုပ်ဆောင်မှု မအောင်မြင်ပါ",
      request_id: requestId
    });
  }
};
