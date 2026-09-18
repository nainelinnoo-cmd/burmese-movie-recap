const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ Google Translate TTS
async function fetchGoogleTTSSafe(text) {
  const sentences = text.match(/[^။!?\n]+[။!?\n]?/g) || [text];
  const chunks = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.length > 50) {
      const parts = trimmed.match(/.{1,50}/g) || [trimmed];
      chunks.push(...parts);
    } else {
      chunks.push(trimmed);
    }
  }

  const audioBuffers = await Promise.all(
    chunks.map(async (chunk) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=my&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://translate.google.com/"
        }
      });
      if (!res.ok) throw new Error("Google TTS Fail");
      return Buffer.from(await res.arrayBuffer());
    })
  );

  return Buffer.concat(audioBuffers).toString("base64");
}

// ၂။ Hugging Face Edge-TTS
async function fetchEdgeTTS(text, voice = "edge-thiha") {
  const voiceName = (voice && voice.includes("nilar")) ? "my-MM-NilarNeural" : "my-MM-ThihaNeural";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text, voiceName] }),
    signal: controller.signal
  }).catch(() => null);

  if (!postRes || !postRes.ok) {
    postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text] }),
      signal: controller.signal
    });
  }
  clearTimeout(timeoutId);

  if (!postRes.ok) throw new Error("HF Space Connect Fail");
  const { event_id } = await postRes.json();

  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
  const streamText = await streamRes.text();

  for (const line of streamText.split("\n")) {
    if (line.startsWith("data:")) {
      const parsed = JSON.parse(line.replace("data:", "").trim());
      if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    }
  }
  throw new Error("HF Space Audio Empty");
}

async function fetchAudioSafe(text, voice) {
  if (voice === "google-my-female") {
    try { return await fetchGoogleTTSSafe(text); } catch (gErr) { return await fetchEdgeTTS(text, "edge-nilar"); }
  }
  if (voice && voice.includes("nilar")) {
    try { return await fetchEdgeTTS(text, "edge-nilar"); } catch (eErr) { return await fetchGoogleTTSSafe(text); }
  }
  if (voice && (voice.includes("thiha") || voice === "google-my-male")) {
    try { return await fetchEdgeTTS(text, "edge-thiha"); } catch (eErr) { return await fetchGoogleTTSSafe(text); }
  }
  try { return await fetchEdgeTTS(text, voice); } catch (e) { return await fetchGoogleTTSSafe(text); }
}

// ၃။ အဆင့်ဆင့် Fallback စနစ်ဖြင့် AI ခေါ်ယူခြင်း
async function runStoryAI(prompt) {
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

  if (process.env.GEMINI_API_KEY) {
    for (const m of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt
        });
        if (response && response.text) return response.text.trim();
      } catch (e) {}
    }
  }

  // Pollinations AI (Always Online & Key မလို)
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a Burmese storyteller. Output strictly in pure Burmese language only." },
          { role: "user", content: prompt }
        ]
      })
    });
    if (res.ok) {
      const text = await res.text();
      if (text) return text.trim();
    }
  } catch (e) {}

  throw new Error("AI ဆာဗာ ခေတ္တမအားလပ်ပါ။ ခေတ္တစောင့်ပြီး ပြန်လည်ကြိုးစားပေးပါခင်ဗျာ။");
}

// English စာကြောင်းများ (We need about 105 words... စသည်) ကို သန့်စင်ပေးသည့် စနစ်
function cleanPureBurmeseText(raw) {
  if (!raw) return "";
  let text = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  // AI ၏ English Reasoning စကားလုံးများကို ဖြတ်ထုတ်ခြင်း
  text = text.replace(/We need about[\s\S]*/i, "")
             .replace(/Let's write[\s\S]*/i, "")
             .replace(/Here is the story[\s\S]*?:/i, "")
             .replace(/Sure, here is[\s\S]*?:/i, "")
             .trim();

  // အင်္ဂလိပ်စာလုံး သီးသန့်ဖြစ်နေသော အောက်ခြေစာကြောင်းများကို ဖယ်ထုတ်ခြင်း
  const lines = text.split("\n");
  const filtered = lines.filter(l => {
    const t = l.trim();
    if (!t) return false;
    const isPureEng = /^[A-Za-z0-9\s.,'":;!?()\-–—_#*]+$/.test(t);
    return !isPureEng;
  });

  return filtered.join("\n").trim() || text;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = req.body;

    // အဆင့် ၃: Text to Speech
    if (action === "generate_audio" || req.body.fetchAudioOnly) {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    // အဆင့် ၂: စာသားမှ ဓာတ်ပုံဆွဲရန် Prompts များ ထုတ်ယူခြင်း
    if (action === "generate_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Based on this story snippet: "${scriptText.substring(0, 400)}", write exactly ${count} cinematic scene descriptions in English for AI image generation.
Format:
SCENE 1: [description]
SCENE 2: [description]
...
Output ONLY the scenes.`;

      let rawPrompts = "";
      try {
        rawPrompts = await runStoryAI(prompt);
      } catch (e) {}

      const promptLines = rawPrompts.split("\n")
        .map(l => l.replace(/^SCENE\s*\d+:\s*/i, "").trim())
        .filter(l => l.length > 10);

      const finalPrompts = [];
      for (let i = 0; i < count; i++) {
        finalPrompts.push(promptLines[i] || `cinematic scene ${i + 1}, ultra realistic lighting, 8k masterpiece`);
      }

      return res.status(200).json({ prompts: finalPrompts });
    }

    // အဆင့် ၁: ပုံပြင်စာသား ရေးသားခြင်း (Movie သို့မဟုတ် Series)
    if (action === "generate_script" || topic) {
      if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
      const selectedMins = parseInt(durationMinutes) || 1;
      const words = selectedMins * 105;

      if (format === "series") {
        const prompt = `Write a continuous 6-episode story series in 100% pure Burmese about "${topic}" (${genre}).
Each episode MUST contain around ${words} Burmese words.
Strict Rule: Pure Burmese language only. Do NOT write any English notes or reasoning.
Format:
=== အပိုင်း ၁ ===
[ဇာတ်လမ်းစာသား]
=== အပိုင်း ၂ ===
[ဇာတ်လမ်းစာသား]
=== အပိုင်း ၃ ===
[ဇာတ်လမ်းစာသား]
=== အပိုင်း ၄ ===
[ဇာတ်လမ်းစာသား]
=== အပိုင်း ၅ ===
[ဇာတ်လမ်းစာသား]
=== အပိုင်း ၆ ===
[ဇာတ်လမ်းစာသား]`;

        const rawResult = await runStoryAI(prompt);
        const parts = rawResult.split(/=== အပိုင်း\s*\d+\s*===/);

        const episodes = [];
        for (let i = 1; i <= 6; i++) {
          const epText = cleanPureBurmeseText(parts[i] || parts[i - 1] || "");
          episodes.push({
            ep: i,
            title: `အပိုင်း ${i}`,
            text: epText || `${topic} အပိုင်း ${i} ဇာတ်လမ်းစာသား`
          });
        }

        return res.status(200).json({
          series_title: topic,
          episodes: episodes
        });

      } else {
        // Movie Story: စာသားစစ်စစ် တိုက်ရိုက် ရေးသားစေခြင်း
        const prompt = `Write a complete movie storytelling script in 100% pure Burmese about "${topic}" (${genre}).
Length: approximately ${words} Burmese words.
CRITICAL RULES:
- Output ONLY the spoken Burmese story text.
- Do NOT output any English words, English translation, notes, or thoughts.
- Fluent and captivating Burmese for narration.`;

        const rawStory = await runStoryAI(prompt);
        const finalStory = cleanPureBurmeseText(rawStory);

        return res.status(200).json({
          movie_title: topic,
          story_text: finalStory
        });
      }
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
