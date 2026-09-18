const { Groq } = require("groq-sdk");

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

// ၃။ AI Engine (Gemini Official Direct API + Groq + Pollinations)
async function callOfficialGemini(prompt, isJson = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const validModels = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ];

  for (const model of validModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: isJson ? { responseMimeType: "application/json" } : {}
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {}
  }
  return null;
}

async function callGroqFallback(prompt, isJson = false) {
  if (!process.env.GROQ_API_KEY) return null;
  const groqModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama3-8b-8192"];

  for (const m of groqModels) {
    try {
      const gRes = await groq.chat.completions.create({
        model: m,
        messages: [
          { role: "system", content: isJson ? "You output strictly valid JSON." : "You are a creative Burmese storyteller." },
          { role: "user", content: prompt }
        ],
        response_format: isJson ? { type: "json_object" } : undefined
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return content;
    } catch (err) {}
  }
  return null;
}

async function callPollinationsAI(prompt, isJson = false) {
  try {
    const res = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: isJson ? "Output valid JSON only." : "You are a creative Burmese storyteller." },
          { role: "user", content: prompt }
        ],
        jsonMode: isJson
      })
    });
    if (res.ok) {
      const text = await res.text();
      if (text) return text.trim();
    }
  } catch (e) {}
  return null;
}

async function runReliableStoryAI(prompt, isJson = false) {
  let result = await callOfficialGemini(prompt, isJson);
  if (result) return result;

  result = await callGroqFallback(prompt, isJson);
  if (result) return result;

  result = await callPollinationsAI(prompt, isJson);
  if (result) return result;

  throw new Error("AI မော်ဒယ်များ ခေတ္တ အလုပ်မလုပ်နိုင်ပါ။ ပြန်လည်ကြိုးစားပေးပါခင်ဗျာ။");
}

function cleanJsonString(raw) {
  if (!raw) return "{}";
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice } = req.body;

    // အဆင့် ၃: Text to Speech
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
      const jsonStr = await runReliableStoryAI(prompt, true);
      let parsedPrompts = [];
      try {
        const pObj = JSON.parse(cleanJsonString(jsonStr));
        parsedPrompts = pObj.prompts || Object.values(pObj);
      } catch (e) {
        parsedPrompts = [
          "cinematic masterpiece scene, 8k resolution, dramatic lighting",
          "cinematic action wide shot, ultra realistic, highly detailed",
          "cinematic character closeup, emotional atmospheric environment",
          "cinematic ending scene, mysterious cinematic landscape"
        ];
      }
      return res.status(200).json({ prompts: parsedPrompts });
    }

    // အဆင့် ၁: ပုံပြင်စာသား ရေးသားခြင်း (Series Ep 1-6 သို့မဟုတ် Movie)
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
    {"ep": 1, "title": "အပိုင်း ၁", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 2, "title": "အပိုင်း ၂", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 3, "title": "အပိုင်း ၃", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 4, "title": "အပိုင်း ၄", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 5, "title": "အပိုင်း ၅", "text": "ဇာတ်လမ်းစာသား..."},
    {"ep": 6, "title": "အပိုင်း ၆", "text": "ဇာတ်လမ်းစာသား..."}
  ]
}`;
        const jsonStr = await runReliableStoryAI(prompt, true);
        let parsedSeries = {};
        try {
          parsedSeries = JSON.parse(cleanJsonString(jsonStr));
        } catch (e) {
          parsedSeries = {
            series_title: topic,
            episodes: Array.from({ length: 6 }, (_, i) => ({
              ep: i + 1,
              title: `အပိုင်း ${i + 1}`,
              text: `${topic} အပိုင်း ${i + 1} ဇာတ်လမ်းစာသားကို ဤနေရာတွင် စိတ်ကြိုက် ပြင်ဆင်ရေးသားနိုင်ပါသည်။`
            }))
          };
        }

        if (Array.isArray(parsedSeries.episodes)) {
          parsedSeries.episodes = parsedSeries.episodes.map((ep, i) => ({
            ep: ep.ep || i + 1,
            title: ep.title || `အပိုင်း ${i + 1}`,
            text: ep.text || ep.story || ep.script || ep.content || ""
          }));
        }

        return res.status(200).json(parsedSeries);

      } else {
        // Movie format
        const prompt = `Write a complete movie story script in Burmese about: "${topic}" (${genre}).
Length: approximately ${words} Burmese words. Break into short spoken phrases using commas.
Output strictly valid JSON:
{
  "movie_title": "${topic}",
  "story_text": "ဇာတ်လမ်းစာသား အပြည့်အစုံ..."
}`;
        const jsonStr = await runReliableStoryAI(prompt, true);
        let movieObj = {};
        try {
          movieObj = JSON.parse(cleanJsonString(jsonStr));
        } catch (e) {
          movieObj = { story_text: jsonStr };
        }

        // Key မည်သို့ထွက်လာစေကာမူ စာသားမပျောက်စေရန် အလိုအလျောက် ညှိပေးခြင်း
        const finalStory = movieObj.story_text || movieObj.story || movieObj.script || movieObj.text || movieObj.content || (typeof movieObj === 'string' ? movieObj : jsonStr);
        const finalTitle = movieObj.movie_title || movieObj.title || topic;

        return res.status(200).json({
          movie_title: finalTitle,
          story_text: finalStory,
          script: finalStory,
          text: finalStory
        });
      }
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (err) {
    console.error("Story API Error:", err);
    return res.status(500).json({ error: err.message || "လုပ်ဆောင်မှု မအောင်မြင်ပါ" });
  }
};
