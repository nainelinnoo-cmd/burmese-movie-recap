const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
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
    try {
      return await fetchGoogleTTSSafe(text);
    } catch (gErr) {
      return await fetchEdgeTTS(text, "edge-nilar");
    }
  }

  if (voice && voice.includes("nilar")) {
    try {
      return await fetchEdgeTTS(text, "edge-nilar");
    } catch (eErr) {
      return await fetchGoogleTTSSafe(text);
    }
  }

  if (voice && (voice.includes("thiha") || voice === "google-my-male")) {
    try {
      return await fetchEdgeTTS(text, "edge-thiha");
    } catch (eErr) {
      return await fetchGoogleTTSSafe(text);
    }
  }

  try {
    return await fetchEdgeTTS(text, voice);
  } catch (e) {
    return await fetchGoogleTTSSafe(text);
  }
}

// ၃။ ပထမမူရင်း Gemini Models & Groq Model စနစ်
async function runGeminiOrGroq(prompt, isJson = false) {
  const ACTIVE_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash"
  ];

  if (process.env.GEMINI_API_KEY) {
    for (const model of ACTIVE_MODELS) {
      try {
        const config = isJson ? { responseMimeType: "application/json" } : {};
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: config
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        // Fallback to next active model
      }
    }
  }

  // မူရင်း Groq Fallback Model
  try {
    const gRes = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: isJson ? "You output strictly valid JSON only." : "You are a creative Burmese storyteller." },
        { role: "user", content: prompt }
      ],
      response_format: isJson ? { type: "json_object" } : undefined
    });
    const content = gRes.choices[0]?.message?.content?.trim();
    if (content) return content;
  } catch (err) {
    // llama-3.3-70b မရရှိပါက အလိုအလျောက် fallback ခံပေးခြင်း
    const gRes2 = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: isJson ? "You output strictly valid JSON only." : "You are a creative Burmese storyteller." },
        { role: "user", content: prompt }
      ],
      response_format: isJson ? { type: "json_object" } : undefined
    });
    return gRes2.choices[0]?.message?.content?.trim();
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice } = req.body;

    // အသံဖိုင် သီးသန့် ထုတ်ယူခြင်း (Step 3 & Recaps Studio Fallback)
    if (action === "generate_audio" || req.body.fetchAudioOnly) {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      return res.status(200).json({ audioBase64 });
    }

    // အဆင့် ၂: စာသားမှ ဓာတ်ပုံဆွဲရန် Prompts ၄ ခု ထုတ်ယူခြင်း
    if (action === "generate_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const prompt = `Based on this story snippet: "${scriptText.substring(0, 400)}", write exactly 4 cinematic scene descriptions in English for AI image generation.
Output strictly valid JSON:
{
  "prompts": [
    "cinematic scene 1...",
    "cinematic scene 2...",
    "cinematic scene 3...",
    "cinematic scene 4..."
  ]
}`;
      const jsonStr = await runGeminiOrGroq(prompt, true);
      return res.status(200).json(JSON.parse(jsonStr));
    }

    // အဆင့် ၁: ပုံပြင်စာသား ရေးသားခြင်း (Series Ep 1 to 6 သို့မဟုတ် Movie)
    if (action === "generate_script" || topic) {
      if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
      const selectedMins = parseInt(durationMinutes) || 1;
      const words = selectedMins * 105;

      if (format === "series") {
        const prompt = `Write a continuous 6-episode story series in Burmese for topic: "${topic}" (${genre}).
Each episode MUST contain around ${words} Burmese words.
Output strictly valid JSON:
{
  "series_title": "${topic}",
  "episodes": [
    {"ep": 1, "title": "အပိုင်း ၁ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 2, "title": "အပိုင်း ၂ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 3, "title": "အပိုင်း ၃ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 4, "title": "အပိုင်း ၄ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 5, "title": "အပိုင်း ၅ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 6, "title": "အပိုင်း ၆ ခေါင်းစဉ်", "text": "ဇာတ်လမ်းစာသား..."}
  ]
}`;
        const jsonStr = await runGeminiOrGroq(prompt, true);
        return res.status(200).json(JSON.parse(jsonStr));
      } else {
        const prompt = `Write a complete movie story script in Burmese about: "${topic}" (${genre}).
Length: approximately ${words} Burmese words. Break into short spoken phrases using commas.
Output strictly valid JSON:
{
  "movie_title": "${topic}",
  "story_text": "ဇာတ်လမ်းစာသား..."
}`;
        const jsonStr = await runGeminiOrGroq(prompt, true);
        return res.status(200).json(JSON.parse(jsonStr));
      }
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
