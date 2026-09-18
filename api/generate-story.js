const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// Google Translate TTS
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

// Edge-TTS
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
  if (voice && (voice.includes("thiha" ) || voice === "google-my-male")) {
    try { return await fetchEdgeTTS(text, "edge-thiha"); } catch (eErr) { return await fetchGoogleTTSSafe(text); }
  }
  try { return await fetchEdgeTTS(text, voice); } catch (e) { return await fetchGoogleTTSSafe(text); }
}

async function runAI(prompt) {
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];
  if (process.env.GEMINI_API_KEY) {
    for (const m of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({ model: m, contents: prompt });
        if (response && response.text) return response.text.trim();
      } catch (e) {}
    }
  }
  if (process.env.GROQ_API_KEY) {
    try {
      const gRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: "You are a Burmese storyteller. Output pure Burmese only." }, { role: "user", content: prompt }]
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {}
  }
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "system", content: "Output pure Burmese narrative only." }, { role: "user", content: prompt }] })
  });
  if (res.ok) return (await res.text()).trim();
  throw new Error("AI ဆာဗာ အလုပ်မလုပ်ပါ။");
}

function cleanBurmese(raw) {
  if (!raw) return "";
  let text = raw.replace(/```/g, "").trim();
  text = text.replace(/(?:(?:\d+\s+words|Let's|Count|Words?|Note|Here\s+is|Sure)[\s\S]*)/i, "").trim();
  const lines = text.split("\n");
  const filtered = lines.filter(l => {
    const t = l.trim();
    if (!t) return false;
    return !(/^[A-Za-z0-9\s.,'":;!?()\-–—_#*]{8,}$/.test(t));
  });
  return filtered.join("\n").trim() || text;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, durationMinutes, scriptText, voice, photoCount } = req.body;

    // အဆင့် ၁: ပုံပြင်စာသား နှင့် အသံဖိုင် တပြိုင်နက် ထုတ်ယူခြင်း
    if (action === "generate_story_and_audio") {
      if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
      const words = (parseInt(durationMinutes) || 1) * 105;
      
      const prompt = `Write a complete storytelling script in 100% pure Burmese about "${topic}" (${genre}). Length: approx ${words} words. No English words allowed. Output only the story narrative.`;
      const rawStory = await runAI(prompt);
      const storyText = cleanBurmese(rawStory);

      const audioBase64 = await fetchAudioSafe(storyText, voice);
      return res.status(200).json({ story_text: storyText, audioBase64 });
    }

    // အဆင့် ၂: စာသားမှ ဓာတ်ပုံဆွဲရန် Prompts များ ထုတ်ယူခြင်း
    if (action === "generate_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;
      const prompt = `Based on this story snippet: "${scriptText.substring(0, 400)}", write exactly ${count} cinematic scene descriptions in English for image generation. Format them as plain lines, one per line.`;
      
      const rawPrompts = await runAI(prompt);
      const promptLines = rawPrompts.split("\n").map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(l => l.length > 5);
      
      const finalPrompts = [];
      for (let i = 0; i < count; i++) {
        finalPrompts.push(promptLines[i] || `cinematic 8k scene ${i + 1}, masterpiece, highly detailed`);
      }
      return res.status(200).json({ prompts: finalPrompts });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
