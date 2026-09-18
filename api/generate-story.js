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
      chunks.push(...(trimmed.match(/.{1,50}/g) || [trimmed]));
    } else {
      chunks.push(trimmed);
    }
  }

  const audioBuffers = await Promise.all(
    chunks.map(async (chunk) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=my&client=tw-ob`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://translate.google.com/" } });
      if (!res.ok) throw new Error("Google TTS Fail");
      return Buffer.from(await res.arrayBuffer());
    })
  );
  return Buffer.concat(audioBuffers).toString("base64");
}

// ၂။ Edge-TTS
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

// ၃။ Model Tracker Engine (လက်ရှိသုံးနေသော Model ကို အတိအကျ ပြန်ပို့ပေးသည်)
async function runStoryAIWithModel(prompt) {
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

  if (process.env.GEMINI_API_KEY) {
    for (const m of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({ model: m, contents: prompt });
        if (response && response.text) {
          return { text: response.text.trim(), modelUsed: m };
        }
      } catch (e) {}
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const gRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }]
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return { text: content, modelUsed: "Groq (Llama-3.1-8B)" };
    } catch (err) {}
  }

  // Pollinations API
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
  });
  if (res.ok) {
    const pText = await res.text();
    return { text: pText.trim(), modelUsed: "Pollinations AI" };
  }

  throw new Error("AI ဆာဗာ အားလုံး ချိတ်ဆက်မရပါ။ ခေတ္တစောင့်ပြီး ထပ်ကြိုးစားပေးပါ။");
}

// Reasoning Tokens နှင့် JSON အမှိုက်များကို လုံးဝဖယ်ရှားသည့် Sanitizer
function cleanPureBurmese(raw) {
  if (!raw) return "";
  let text = raw.trim();

  try {
    if (text.startsWith("{") && text.endsWith("}")) {
      const obj = JSON.parse(text);
      text = obj.content || obj.story_text || obj.text || obj.story || text;
    }
  } catch (e) {}

  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "")
             .replace(/{"role":"assistant"[\s\S]*?"content":\s*"/gi, "")
             .replace(/{"reasoning"[\s\S]*?"content":\s*"/gi, "")
             .replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")
             .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  text = text.replace(/(?:(?:We need about|Let's write|Word count|I'll count|Sure, here is)[\s\S]*?\n)/gi, "");

  const lines = text.split("\n");
  const burmeseOnly = lines.filter(line => {
    const t = line.trim();
    if (!t) return false;
    if (/^(reasoning|content|role|assistant|words?|count|note):/i.test(t)) return false;
    return /[\u1000-\u109F]/.test(t);
  });

  return burmeseOnly.join("\n").trim() || text.replace(/[a-zA-Z0-9{}\"\\:;]/g, "").trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = req.body;

    // အဆင့် ၁: ပုံပြင်စာသား ရေးထုတ်ခြင်း (စာသားသက်သက်)
    if (action === "generate_story_text") {
      if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
      const words = (parseInt(durationMinutes) || 1) * 105;

      const prompt = `Write an engaging storytelling narrative in 100% pure Burmese about "${topic}" (${genre}).
Approximate word count: ${words} Burmese words.
CRITICAL RULES:
- Output ONLY the Burmese story narration.
- Do NOT output any English letters, planning notes, thinking tokens, or explanations.`;

      const aiRes = await runStoryAIWithModel(prompt);
      const storyText = cleanPureBurmese(aiRes.text);

      return res.status(200).json({
        story_text: storyText,
        model_used: aiRes.modelUsed
      });
    }

    // အဆင့် ၂: မြန်မာစာသားမှ English Photo Prompts သို့ Translate လုပ်ခြင်း
    if (action === "translate_to_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Read this Burmese story snippet:
"${scriptText.substring(0, 500)}"

Task: Extract exactly ${count} cinematic scene descriptions for AI image generation.
Translate the key visual scenes into descriptive, atmospheric English image prompts.
Output format: Output ONLY the ${count} English prompts, each on a new line, without numbers or introductory text.`;

      const aiRes = await runStoryAIWithModel(prompt);
      const rawLines = aiRes.text.split("\n")
        .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^SCENE\s*\d+:\s*/i, "").trim())
        .filter(l => l.length > 8);

      const promptsList = [];
      for (let i = 0; i < count; i++) {
        promptsList.push(rawLines[i] || `cinematic scene ${i + 1} masterpiece, photorealistic, 8k resolution, dramatic lighting`);
      }

      return res.status(200).json({
        prompts_text: promptsList.join("\n\n"),
        prompts_array: promptsList,
        model_used: aiRes.modelUsed
      });
    }

    // အဆင့် ၄: Text to Speech (TTS) ထုတ်ယူခြင်း
    if (action === "generate_audio") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      const voiceLabel = (voice && voice.includes("nilar")) ? "Edge-TTS (နီလာ)" : (voice && voice.includes("thiha")) ? "Edge-TTS (သီဟ)" : "Google TTS";
      return res.status(200).json({ audioBase64, model_used: voiceLabel });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
