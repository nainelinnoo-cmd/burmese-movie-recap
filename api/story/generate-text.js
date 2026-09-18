const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

async function fetchGoogleTTS(text) {
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

async function fetchEdgeTTS(text, voice = "edge-thiha") {
  const voiceName = (voice && voice.includes("nilar")) ? "my-MM-NilarNeural" : "my-MM-ThihaNeural";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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

  if (!postRes.ok) throw new Error("HF TTS Fail");
  const { event_id } = await postRes.json();

  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
  const streamText = await streamRes.text();

  for (const line of streamText.split("\n")) {
    if (line.startsWith("data:")) {
      const parsed = JSON.parse(line.replace("data:", "").trim());
      if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    }
  }
  throw new Error("TTS Empty");
}

async function fetchAudioSafe(text, voice) {
  if (voice === "google-my-female") {
    try { return await fetchGoogleTTS(text); } catch (e) { return await fetchEdgeTTS(text, "edge-nilar"); }
  }
  if (voice && voice.includes("nilar")) {
    try { return await fetchEdgeTTS(text, "edge-nilar"); } catch (e) { return await fetchGoogleTTS(text); }
  }
  try { return await fetchEdgeTTS(text, "edge-thiha"); } catch (e) { return await fetchGoogleTTS(text); }
}

async function runAIWithModel(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (apiKey) {
    const REAL_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const m of REAL_GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt
        });
        if (response && response.text && response.text.trim()) {
          return { text: response.text.trim(), modelUsed: m };
        }
      } catch (e) {
        try {
          const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
          const gRes = await fetch(restUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
          });
          if (gRes.ok) {
            const data = await gRes.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (txt && txt.trim()) return { text: txt.trim(), modelUsed: m };
          }
        } catch (restErr) {}
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      const gRes = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }]
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return { text: content, modelUsed: "Groq (Llama-3.3)" };
    } catch (err) {}
  }

  try {
    const pRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "openai"
      })
    });
    if (pRes.ok) {
      const pText = await pRes.text();
      if (pText && pText.trim()) return { text: pText.trim(), modelUsed: "Pollinations AI" };
    }
  } catch (e) {}

  throw new Error("AI မော်ဒယ်များနှင့် ချိတ်ဆက်မရပါ။ ခေတ္တစောင့်ပြီး ထပ်မံကြိုးစားပေးပါ။");
}

function filterStrictBurmeseStory(rawText) {
  if (!rawText) return "";
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")
                    .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  const firstBurmeseIdx = text.search(/[\u1000-\u109F]/);
  if (firstBurmeseIdx !== -1) {
    text = text.substring(firstBurmeseIdx);
  }

  const lines = text.split("\n");
  const cleanPhrases = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    const engCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (engCount > 2) continue;

    trimmed = trimmed.replace(/^[\s\d၀-၉\.\)\-–—:]+/g, "").trim();
    trimmed = trimmed.replace(/[a-zA-Z0-9_\-–—#*@$%&+=<>{}\[\]\\\/^~`|]/g, "").trim();

    const myanCount = (trimmed.match(/[\u1000-\u109F]/g) || []).length;
    if (myanCount >= 2) {
      cleanPhrases.push(trimmed);
    }
  }

  let finalStory = cleanPhrases.join(" ").replace(/\s+/g, " ").trim();
  finalStory = finalStory.replace(/။\s*/g, "။\n\n").trim();

  return finalStory || text.match(/[\u1000-\u104F\s၊။]+/g)?.join(" ").trim() || "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = req.body;

    if (action === "generate_audio") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      const voiceLabel = (voice && voice.includes("nilar")) ? "Edge-TTS (နီလာ)" : (voice && voice.includes("thiha")) ? "Edge-TTS (သီဟ)" : "Google TTS";
      return res.status(200).json({ audioBase64, model_used: voiceLabel });
    }

    if (action === "translate_to_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Read this story snippet: "${scriptText.substring(0, 450)}"
Extract exactly ${count} cinematic scene descriptions and translate into descriptive English image prompts.
Output format: ${count} English prompts, one per line. No numbering, no introduction.`;

      const aiRes = await runAIWithModel(prompt);
      const rawLines = aiRes.text.split("\n")
        .map(l => l.replace(/^[\s\d\.\)\-]+/, "").replace(/^SCENE\s*\d+:\s*/i, "").trim())
        .filter(l => l.length > 8);

      const promptsList = [];
      for (let i = 0; i < count; i++) {
        promptsList.push(rawLines[i] || `cinematic scene ${i + 1}, ultra realistic lighting, 8k masterpiece`);
      }

      return res.status(200).json({
        prompts_text: promptsList.join("\n\n"),
        prompts_array: promptsList,
        model_used: aiRes.modelUsed
      });
    }

    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    const selectedMins = parseInt(durationMinutes) || 1;
    const words = selectedMins * 105;

    if (format === "series") {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
အခန်းဆက် ၆ ပိုင်းပါဝင်သော မြန်မာပုံပြင် ရေးပေးပါ။
အပိုင်းတစ်ခုစီတွင် စာလုံးရေ ${words} လုံးခန့် ပါဝင်ရပါမည်။ နံပါတ်စဉ် မတပ်ပါနှင့်။ အင်္ဂလိပ်စာလုံး လုံးဝမပါရပါ။
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

      const aiRes = await runAIWithModel(prompt);
      const parts = aiRes.text.split(/=== အပိုင်း\s*\d+\s*===/);

      const episodes = [];
      for (let i = 1; i <= 6; i++) {
        const epContent = filterStrictBurmeseStory(parts[i] || parts[i - 1] || "");
        episodes.push({
          ep: i,
          title: `အပိုင်း ${i}`,
          text: epContent || `${topic} အပိုင်း ${i} ဇာတ်လမ်းစာသား`
        });
      }

      return res.status(200).json({
        format: "series",
        title: topic,
        episodes: episodes,
        model_used: aiRes.modelUsed
      });

    } else {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
ပြီးပြည့်စုံသော ရုပ်ရှင်ပုံပြင် ဇာတ်လမ်းစာသားကို မြန်မာဘာသာသက်သက်ဖြင့် စာပိုဒ်လိုက် ရေးပေးပါ။
စာလုံးရေ ခန့်မှန်းခြေ: ${words} လုံး။
စည်းမျဉ်း: နံပါတ်စဉ် (၁၊ ၂၊ ၃ သို့မဟုတ် 1, 2, 3) လုံးဝမတပ်ရပါ။ အင်္ဂလိပ်စာလုံး လုံးဝမပါရပါ။ ပုံပြင်စကားပြေ သက်သက်သာ ရေးပါ။`;

      const aiRes = await runAIWithModel(prompt);
      const cleanStory = filterStrictBurmeseStory(aiRes.text);

      return res.status(200).json({
        format: "movie",
        title: topic,
        story_text: cleanStory,
        model_used: aiRes.modelUsed
      });
    }

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်းစာသား ထုတ်ယူမှု မအောင်မြင်ပါ" });
  }
};
