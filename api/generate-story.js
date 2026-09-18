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

// ၃။ AI Text Engine
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
        messages: [{ role: "user", content: prompt }]
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {}
  }

  // Pollinations API
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (res.ok) return (await res.text()).trim();

  throw new Error("AI ဆာဗာ အလုပ်မလုပ်ပါ။");
}

// Reasoning JSON အမှိုက်များ နှင့် English စာစုများကို အပြီးတိုင် သန့်စင်ပေးသည့် စနစ်
function cleanPureBurmeseText(raw) {
  if (!raw) return "";
  let text = raw.trim();

  // JSON format ဖြင့် ထွက်လာပါက parse ပြုလုပ်ပြီး content ကိုသာ ယူခြင်း
  try {
    if (text.startsWith("{") && text.endsWith("}")) {
      const obj = JSON.parse(text);
      text = obj.content || obj.story_text || obj.text || obj.story || text;
    }
  } catch (e) {}

  // DeepSeek reasoning သို့မဟုတ် raw json tags များ ဖြတ်ထုတ်ခြင်း
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "")
             .replace(/{"role":"assistant"[\s\S]*?"content":\s*"/gi, "")
             .replace(/{"reasoning"[\s\S]*?"content":\s*"/gi, "")
             .replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")
             .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  // AI ၏ English Planning စာသားများကို အပြီးအပိုင် ဖြတ်ထုတ်ခြင်း
  text = text.replace(/(?:(?:We need about|Let's write|Word count|I'll count|Sure, here is)[\s\S]*?\n)/gi, "");

  const lines = text.split("\n");
  const burmeseLines = lines.filter(line => {
    const t = line.trim();
    if (!t) return false;
    const isMetaEng = /^(reasoning|content|role|assistant|words?|count|note):/i.test(t);
    if (isMetaEng) return false;
    // မြန်မာစာလုံး ပါဝင်သော စာကြောင်းများကိုသာ ကောက်ယူမည်
    return /[\u1000-\u109F]/.test(t);
  });

  return burmeseLines.join("\n").trim() || text.replace(/[a-zA-Z0-9{}\"\\:;]/g, "").trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = req.body;

    // အဆင့် ၁: ပုံပြင်စာသား နှင့် အသံဖိုင် (TTS) ကို မြန်မာလို သီးသန့် ထုတ်ယူခြင်း
    if (action === "generate_story_and_audio") {
      if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
      const selectedMins = parseInt(durationMinutes) || 1;
      const words = selectedMins * 105;

      if (format === "series") {
        const prompt = `Write a continuous 6-episode story series in 100% pure Burmese about "${topic}" (${genre}).
Each episode MUST contain around ${words} Burmese words.
CRITICAL: Write strictly in pure Burmese script. Absolutely NO English words, thoughts, or reasoning.
Separate episodes with:
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

        const rawResult = await runAI(prompt);
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

        const audioBase64 = await fetchAudioSafe(episodes[0].text, voice);
        return res.status(200).json({
          format: "series",
          series_title: topic,
          episodes: episodes,
          audioBase64: audioBase64
        });

      } else {
        // Movie format
        const prompt = `Write a complete movie narrative story script in 100% pure Burmese about "${topic}" (${genre}).
Length: approximately ${words} Burmese words. Break thoughts into short sentences using commas.
CRITICAL RULES:
- Output ONLY the spoken Burmese story text.
- Do NOT output any English words, translation, word counts, or reasoning.
- Write purely in Burmese script.`;

        const rawStory = await runAI(prompt);
        const storyText = cleanPureBurmeseText(rawStory);

        const audioBase64 = await fetchAudioSafe(storyText, voice);
        return res.status(200).json({
          format: "movie",
          movie_title: topic,
          story_text: storyText,
          audioBase64: audioBase64
        });
      }
    }

    // အဆင့် ၂: မြန်မာစာသားကို အခြေခံပြီး English Photo Prompts သီးသန့် ဘာသာပြန် ထုတ်ယူခြင်း
    if (action === "generate_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Read this Burmese story:
"${scriptText.substring(0, 500)}"

Task: Extract the key visual scenes from this Burmese story and translate them into exactly ${count} highly descriptive, cinematic image generation prompts in English.
Make them ultra realistic, 8k resolution, atmospheric lighting, masterpiece quality.
Output ONLY the ${count} prompts, one prompt per line, without numbers.`;

      const rawPrompts = await runAI(prompt);
      const promptLines = rawPrompts.split("\n")
        .map(l => l.replace(/^\d+[\.\)]\s*/, "").replace(/^SCENE\s*\d+:\s*/i, "").trim())
        .filter(l => l.length > 8);

      const finalPrompts = [];
      for (let i = 0; i < count; i++) {
        finalPrompts.push(promptLines[i] || `cinematic 8k scene ${i + 1}, dark atmospheric environment, ultra detailed, photorealistic`);
      }

      return res.status(200).json({ prompts: finalPrompts });
    }

    // အသံဖိုင် သီးသန့် ထုတ်ယူခြင်း (Series Episode ပြောင်းလဲသည့်အခါ)
    if (action === "generate_audio") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
