const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ Google Translate TTS
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

// ၂။ Edge-TTS
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

// ၃။ တိုက်ရိုက်ခေါ်ယူမည့် AI Engine
async function runAIWithModel(prompt, systemInstruction = "") {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // အဆင့် ၁: Gemini REST API တိုက်ရိုက် ချိတ်ဆက်ခြင်း
  if (geminiKey) {
    const geminiModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
    for (const m of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const gRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (gRes.ok) {
          const data = await gRes.json();
          const out = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (out && out.trim()) return { text: out.trim(), modelUsed: m };
        }
      } catch (e) {}
    }
  }

  // အဆင့် ၂: Groq API တိုက်ရိုက် ချိတ်ဆက်ခြင်း
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt }
          ]
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (groqRes.ok) {
        const data = await groqRes.json();
        const out = data.choices?.[0]?.message?.content;
        if (out && out.trim()) return { text: out.trim(), modelUsed: "Groq (Llama-3.3)" };
      }
    } catch (e) {}
  }

  // အဆင့် ၃: Pollinations AI POST (Key မလိုဘဲ အမြဲအလုပ်လုပ်သော Fallback)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    const pRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: prompt }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (pRes.ok) {
      const pText = await pRes.text();
      if (pText && pText.trim()) return { text: pText.trim(), modelUsed: "Pollinations AI" };
    }
  } catch (e) {}

  throw new Error("AI ဆာဗာများနှင့် ချိတ်ဆက်၍ မရနိုင်ပါ။ Vercel Environment Variables ထဲတွင် GEMINI_API_KEY မှန်မမှန် စစ်ဆေးပေးပါ။");
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
Translate the visual scenes into exactly ${count} cinematic English image prompts for AI generation.
Output format: ${count} descriptive English lines only. No numbers.`;

      const aiRes = await runAIWithModel(prompt, "You are a prompt engineer. Output English image prompts only, one per line. No numbers.");
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
    const systemPrompt = "You are a professional Burmese author. Output strictly continuous Burmese story narration. No numbers, no lists, no English words.";

    if (format === "series") {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
အခန်းဆက် ၆ ပိုင်းပါဝင်သော မြန်မာပုံပြင် ရေးပေးပါ။
အပိုင်းတစ်ခုစီတွင် စာလုံးရေ ${words} လုံးခန့် ပါဝင်ရပါမည်။ နံပါတ်စဉ် မတပ်ပါနှင့်။
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

      const aiRes = await runAIWithModel(prompt, systemPrompt);
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
စည်းမျဉ်း: နံပါတ်စဉ် လုံးဝမတပ်ရပါ။ အင်္ဂလိပ်စာလုံး လုံးဝမပါရပါ။ စကားပြေသက်သက်သာ ရေးပါ။`;

      const aiRes = await runAIWithModel(prompt, systemPrompt);
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
