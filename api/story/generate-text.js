const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ Google TTS (စာသားရှည်ပါက ပုဒ်မ/ပုဒ်ကလေးအလိုက် Chunk ခွဲထုတ်ခြင်း)
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

// ၂။ Edge-TTS (Cold Start အတွက် Timeout ကို ၂၀ စက္ကန့် သတ်မှတ်ထားခြင်း)
async function fetchEdgeTTS(text, voice = "edge-thiha") {
  const voiceName = (voice && voice.includes("nilar")) ? "my-MM-NilarNeural" : "my-MM-ThihaNeural";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

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

// ၃။ တကယ်ရှိသော Gemini Models (gemini-1.5-flash / gemini-2.0-flash) နှင့် ချိတ်ဆက်ခြင်း
async function callDirectGemini(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

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

  if (!res.ok) throw new Error(`Gemini status ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty text from Gemini");
  return text.trim();
}

async function runReliableAI(prompt) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey) {
    const models = ["gemini-1.5-flash", "gemini-2.0-flash"];
    for (const m of models) {
      try {
        const text = await callDirectGemini(geminiKey, m, prompt);
        if (text) return { text, modelUsed: m };
      } catch (e) {}
    }
  }

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const out = data.choices?.[0]?.message?.content;
        if (out && out.trim()) return { text: out.trim(), modelUsed: "Groq (Llama-3.3)" };
      }
    } catch (e) {}
  }

  // Pollinations POST Fallback (Truncation မဖြစ်စေရန် POST သုံးခြင်း)
  try {
    const pRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (pRes.ok) {
      const pText = await pRes.text();
      if (pText && pText.trim()) return { text: pText.trim(), modelUsed: "Pollinations AI" };
    }
  } catch (e) {}

  throw new Error("AI မော်ဒယ်များနှင့် ချိတ်ဆက်မရပါ။ Vercel Variables ထဲတွင် GEMINI_API_KEY ရှိမရှိ စစ်ဆေးပါ။");
}

// ၄။ လမ်းညွှန်ချက်အတိုင်း Line အစရှိ နံပါတ်စဉ်များ (၁၊ ၂၊ 3.) အားလုံး ဖယ်ရှားသည့် Regex
function filterStrictBurmeseStory(rawText) {
  if (!rawText) return "";
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/```[a-z]*\n?/gi, "").replace(/```/g, "")
                    .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  // စာကြောင်းတိုင်း၏ အစတွင် ကပ်ပါလာသော နံပါတ်စဉ်များနှင့် သင်္ကေတများ ဖြတ်ထုတ်ခြင်း
  text = text.replace(/^[\s\d၀-၉\.\)\-–—:၊။]+/gm, "");

  const lines = text.split("\n");
  const cleanParts = [];

  for (let line of lines) {
    let t = line.trim();
    if (!t) continue;

    const engMatches = t.match(/[a-zA-Z]/g) || [];
    if (engMatches.length > 2) continue;

    t = t.replace(/[0-9၀-၉_\-–—#*@$%&+=<>{}\[\]\\\/^~`|]/g, "").trim();

    if (t.length > 0 && /[\u1000-\u109F]/.test(t)) {
      cleanParts.push(t);
    }
  }

  let finalStory = cleanParts.join(" ").replace(/\s+/g, " ").trim();
  finalStory = finalStory.replace(/။\s*/g, "။\n\n").trim();
  return finalStory || text.match(/[\u1000-\u104F\s၊။]+/g)?.join(" ").trim() || "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, voice, photoCount } = req.body;

    // အသံစမ်းနားထောင်ခြင်း
    if (action === "generate_audio") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const audioBase64 = await fetchAudioSafe(scriptText, voice);
      const voiceLabel = (voice && voice.includes("nilar")) ? "Edge-TTS (နီလာ)" : (voice && voice.includes("thiha")) ? "Edge-TTS (သီဟ)" : "Google TTS";
      return res.status(200).json({ audioBase64, model_used: voiceLabel });
    }

    // English Prompts ဘာသာပြန်ခြင်း
    if (action === "translate_to_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Read this Burmese story: "${scriptText.substring(0, 450)}"
Extract key visual scenes and translate into exactly ${count} cinematic English image prompts for AI generation.
Output format: Output ONLY ${count} English prompts, one per line. Do not write numbers, bullets, or explanations.`;

      const aiRes = await runReliableAI(prompt);
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

    // ဇာတ်လမ်းစာသား ရေးထုတ်ခြင်း
    if (!topic) return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });

    const selectedMins = parseInt(durationMinutes) || 1;
    const words = selectedMins * 105;

    if (format === "series") {
      const prompt = `Write a continuous 6-episode Burmese story about "${topic}" (${genre}).
Each episode must be around ${words} words. Output ONLY pure Burmese story text. Do NOT write line numbers (1, 2, 3), bullet points, or English notes.
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

      const aiRes = await runReliableAI(prompt);
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
      const prompt = `Write a complete movie storytelling script in 100% pure Burmese about "${topic}" (${genre}).
Length: approximately ${words} Burmese words.
Rules:
- Output ONLY Burmese narrative prose.
- Absolutely NO line numbers (1, 2, 3), NO English notes, NO planning thoughts.`;

      const aiRes = await runReliableAI(prompt);
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
