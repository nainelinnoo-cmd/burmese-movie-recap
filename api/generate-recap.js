// Recaps Studio V2 — api/generate-recap.js
// Robust provider router: Gemini retries + model rotation -> Groq Whisper -> Groq LLM rotation.

const GEMINI_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const GROQ_KEY = String(process.env.GROQ_API_KEY || '').trim();

const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
];

const GROQ_TEXT_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

const GROQ_WHISPER_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3'
];

const MAX_DURATION = 600;
const MAX_AUDIO_BASE64 = 3600000;
const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function text(v) {
  return String(v == null ? '' : v)
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function errorMessage(err) {
  return String(err?.message || err?.error?.message || err || 'Unknown error');
}

async function readBody(response) {
  const raw = await response.text();
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return { raw }; }
}

function providerError(provider, response, data) {
  const message = data?.error?.message || data?.message || data?.raw || response.statusText || 'Unknown error';
  return new Error(`${provider} HTTP ${response.status}: ${message}`);
}

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(15000, Math.max(250, retryAfter * 1000));
  }
  const base = Math.min(12000, 900 * (2 ** attempt));
  return base + Math.floor(Math.random() * 350);
}

function isTransient(status) {
  return TRANSIENT_STATUS.has(Number(status));
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, label, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      const data = await readBody(response);
      const err = providerError(label, response, data);
      lastError = err;
      if (!isTransient(response.status) || attempt === attempts - 1) throw err;
      await sleep(retryDelay(response, attempt));
    } catch (err) {
      lastError = err;
      if (attempt === attempts - 1) throw err;
      if (err?.name === 'AbortError') throw err;
      await sleep(Math.min(12000, 900 * (2 ** attempt)) + Math.floor(Math.random() * 350));
    }
  }
  throw lastError || new Error(`${label} failed`);
}

function mimeType(mime, b64) {
  const m = String(mime || '').split(';')[0].trim().toLowerCase();
  if (/^(audio|video)\//.test(m)) return m;
  if (String(b64 || '').startsWith('UklGR')) return 'audio/wav';
  return 'audio/webm';
}

function extension(mime) {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4')) return 'mp4';
  return 'webm';
}

function send(res, payload) {
  try { res.write(JSON.stringify(payload) + '\n'); } catch (_) {}
}

async function geminiOnce(model, audioBase64, audioMime, frames, prompt) {
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: audioMime, data: audioBase64 } }
  ];
  for (const frame of Array.isArray(frames) ? frames.slice(0, 2) : []) {
    if (typeof frame !== 'string' || frame.length < 100) continue;
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frame.replace(/^data:image\/[^;]+;base64,/, '') } });
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 900 }
      })
    },
    `Gemini ${model}`,
    3
  );

  const data = await readBody(response);
  const out = text((data?.candidates || [])
    .flatMap(c => c?.content?.parts || [])
    .map(p => p?.text || '')
    .join('\n'));
  if (!out) throw new Error(`Gemini ${model} returned empty text`);
  return out;
}

async function runGemini(audioBase64, audioMime, frames, prompt, onStage) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY မရှိပါ');
  let last = null;
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    onStage?.(`Gemini ${model} ကို စမ်းနေပါသည်...`);
    try {
      return await geminiOnce(model, audioBase64, audioMime, frames, prompt);
    } catch (err) {
      last = err;
      console.error(`Gemini ${model} failed:`, errorMessage(err));
      if (i < GEMINI_MODELS.length - 1) {
        onStage?.(`${model} မရသဖြင့် နောက် Gemini model သို့ ပြောင်းနေပါသည်...`);
      }
    }
  }
  throw last || new Error('Gemini failed');
}

async function groqWhisper(audioBase64, audioMime, onStage) {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY မရှိပါ');
  const buffer = Buffer.from(audioBase64, 'base64');
  if (!buffer.length) throw new Error('Audio data အလွတ်ဖြစ်နေပါတယ်');
  const fileName = `recap.${extension(audioMime)}`;
  let last = null;

  for (let i = 0; i < GROQ_WHISPER_MODELS.length; i++) {
    const model = GROQ_WHISPER_MODELS[i];
    onStage?.(`Groq ${model} ဖြင့် အသံစာသားပြောင်းနေပါသည်...`);
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: audioMime }), fileName);
    form.append('model', model);
    form.append('response_format', 'json');

    try {
      const response = await fetchWithRetry(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        { method: 'POST', headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form },
        `Groq Whisper ${model}`,
        3
      );
      const data = await readBody(response);
      const out = text(data?.text);
      if (out) return out;
      throw new Error(`Groq Whisper ${model} returned empty transcript`);
    } catch (err) {
      last = err;
      console.error(`Groq Whisper ${model} failed:`, errorMessage(err));
    }
  }
  throw last || new Error('Groq Whisper failed');
}

async function groqComplete(model, prompt, transcript) {
  const response = await fetchWithRetry(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You write natural spoken Burmese movie recaps. Output ONLY the spoken Burmese script. No title, markdown, bullets, quotes, or explanation.'
          },
          { role: 'user', content: `${prompt}\n\nSOURCE AUDIO TRANSCRIPT:\n${transcript}` }
        ],
        temperature: 0.55,
        max_tokens: 900
      })
    },
    `Groq ${model}`,
    3
  );
  const data = await readBody(response);
  const out = text(data?.choices?.[0]?.message?.content);
  if (!out) throw new Error(`Groq ${model} returned empty text`);
  return out;
}

async function runGroq(audioBase64, audioMime, prompt, onStage) {
  const transcript = await groqWhisper(audioBase64, audioMime, onStage);
  let last = null;
  for (let i = 0; i < GROQ_TEXT_MODELS.length; i++) {
    const model = GROQ_TEXT_MODELS[i];
    onStage?.(`Groq ${model} ဖြင့် recap ရေးနေပါသည်...`);
    try {
      return await groqComplete(model, prompt, transcript);
    } catch (err) {
      last = err;
      console.error(`Groq ${model} failed:`, errorMessage(err));
      if (i < GROQ_TEXT_MODELS.length - 1) {
        onStage?.(`${model} မရသဖြင့် နောက် fallback model သို့ ပြောင်းနေပါသည်...`);
      }
    }
  }
  throw last || new Error('Groq recap failed');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const audioBase64 = String(body.audioBase64 || '');
    const audioMime = mimeType(body.audioMimeType, audioBase64);
    const frames = Array.isArray(body.frames) ? body.frames : [];
    const duration = Math.max(1, Math.min(MAX_DURATION, Math.round(Number(body.videoDuration) || 30)));
    const tone = text(body.tone || 'dramatic').slice(0, 60) || 'dramatic';

    if (!audioBase64) throw new Error('အသံဖိုင်ဒေတာ မပါဝင်ပါ');
    if (audioBase64.length > MAX_AUDIO_BASE64) {
      throw new Error('Recap request အရွယ်အစားကြီးလွန်းပါသည်။ Video ကိုတိုအောင် သို့မဟုတ် audio bitrate ကိုလျှော့ပြီး ပြန်စမ်းပါ။');
    }
    if (!GEMINI_KEY && !GROQ_KEY) throw new Error('GEMINI_API_KEY သို့မဟုတ် GROQ_API_KEY တစ်ခုခုလိုအပ်ပါသည်');

    const target = Math.max(25, Math.round(duration / 60 * 105));
    const min = Math.max(18, target - 12);
    const prompt = `
Write a natural spoken Burmese movie recap.

VIDEO DURATION: ${duration} seconds
TONE: ${tone}
TARGET: ${min}-${target} Burmese spoken words

The attached audio is the source narration/dialogue. The optional JPEG snapshots are visual grounding only.
Do not invent events, characters, locations, or outcomes not supported by the provided media.
Preserve important story events, remove filler and repetition, and use short natural sentences for voice-over.
Output ONLY the Burmese spoken recap. No title, markdown, bullets, quotes, or explanation.
`;

    send(res, { type: 'stage', stage: 'starting', message: 'AI engine စတင်နေပါသည်...' });

    let script = '';
    const errors = [];

    if (GEMINI_KEY) {
      try {
        send(res, { type: 'stage', stage: 'gemini', message: 'Gemini ကို အသုံးပြုနေပါသည်...' });
        script = await runGemini(audioBase64, audioMime, frames, prompt, message => send(res, { type: 'stage', stage: 'retry', message }));
      } catch (err) {
        errors.push(`Gemini: ${errorMessage(err)}`);
      }
    }

    if (!script && GROQ_KEY) {
      try {
        send(res, { type: 'stage', stage: 'groq', message: 'Gemini မရသဖြင့် Groq fallback ကို အသုံးပြုနေပါသည်...' });
        script = await runGroq(audioBase64, audioMime, prompt, message => send(res, { type: 'stage', stage: 'fallback', message }));
      } catch (err) {
        errors.push(`Groq: ${errorMessage(err)}`);
      }
    }

    if (!script) throw new Error(errors.join(' | ') || 'AI recap မရရှိပါ');

    send(res, { type: 'result', script });
    return res.end();
  } catch (err) {
    const message = errorMessage(err);
    console.error('Recaps Studio V2:', message);
    send(res, { type: 'error', error: message });
    return res.end();
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: '5mb' }
  },
  maxDuration: 300
};
