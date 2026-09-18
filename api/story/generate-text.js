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
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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

async function callDirectGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
    }),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini Status ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}

async function callDirectGroq(apiKey, prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1200
    }),
    signal: controller.signal
  });
  clearTimeout(timeout);

  if (!res.ok) throw new Error("Groq API Error");
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim();
}

async function runFastAI(prompt) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey) {
    const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
    for (const m of models) {
      try {
        const result = await callDirectGemini(geminiKey, m, prompt);
        if (result) return { text: result, modelUsed: m };
      } catch (e) {}
    }
  }

  if (groqKey) {
    try {
      const gResult = await callDirectGroq(groqKey, prompt);
      if (gResult) return { text: gResult, modelUsed: "Groq (Llama-3.3)" };
    } catch (e) {}
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const pRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (pRes.ok) {
      const pText = await pRes.text();
      if (pText) return { text: pText.trim(), modelUsed: "Pollinations AI" };
    }
  } catch (e) {}

  throw new Error("AI မော်ဒယ် ချိတ်ဆက်မှု မအောင်မြင်ပါ။ Vercel Environment Variables ထဲတွင် GEMINI_API_KEY ထည့်သွင်းထားခြင်း ရှိမရှိ စစ်ဆေးပေးပါ။");
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

      const prompt = `Read this Burmese story snippet: "${scriptText.substring(0, 400)}"
Extract exactly ${count} cinematic scenes and translate into vivid English image generation prompts.
Output format: Output ONLY ${count} English prompts, one per line. No numbers, no bullet points.`;

      const aiRes = await runFastAI(prompt);
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
      const prompt = `Write a continuous 6-episode Burmese storytelling script about "${topic}" (${genre}).
Each episode around ${words} words. Output ONLY pure Burmese story text. Under NO circumstances output numbers (1, 2, 3) or English notes.
Separate episodes strictly with:
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

      const aiRes = await runFastAI(prompt);
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
      const prompt = `Write a complete movie story narration in 100% pure Burmese script about "${topic}" (${genre}).
Length: approximately ${words} Burmese words.
Rules:
- Output ONLY the Burmese narrative prose.
- Absolutely NO numbers (1, 2, 3), NO English words, NO planning notes.`;

      const aiRes = await runFastAI(prompt);
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
