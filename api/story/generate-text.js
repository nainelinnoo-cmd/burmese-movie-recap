const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

// တောင်းဆိုထားသော Gemini မော်ဒယ်များ အစဉ်လိုက် စစ်ဆေးခေါ်ယူခြင်း
async function runAIWithModel(prompt, systemInstruction = "") {
  const GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash"
  ];

  if (process.env.GEMINI_API_KEY) {
    for (const m of GEMINI_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : {}
        });
        if (response && response.text) {
          return { text: response.text.trim(), modelUsed: m };
        }
      } catch (e) {
        // အကယ်၍ ထို model version စမ်းသပ်ခွင့်မရှိပါက နောက် model သို့ ဆက်သွားမည်
      }
    }
  }

  // Groq Fallback
  if (process.env.GROQ_API_KEY) {
    try {
      const gRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: prompt }
        ]
      });
      const content = gRes.choices[0]?.message?.content?.trim();
      if (content) return { text: content, modelUsed: "Groq (Llama-3.1)" };
    } catch (err) {}
  }

  // Pollinations Fallback
  const res = await fetch("https://text.pollinations.ai/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
        { role: "user", content: prompt }
      ]
    })
  });
  if (res.ok) {
    const pText = await res.text();
    return { text: pText.trim(), modelUsed: "Pollinations AI" };
  }

  throw new Error("AI မော်ဒယ်များနှင့် ချိတ်ဆက်၍ မရနိုင်ပါ။");
}

// နံပါတ်စဉ်များ၊ English စာလုံးများနှင့် အမှိုက်များ အားလုံးကို အမြစ်ပြတ် ဖယ်ရှားသည့် စနစ်
function filterStrictBurmeseStory(rawText) {
  if (!rawText) return "";
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/```json/gi, "").replace(/```/g, "")
                    .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  // ပထမဆုံး မြန်မာအက္ခရာ တွေ့သည့်နေရာမှသာ ယူခြင်း
  const firstBurmeseIdx = text.search(/[\u1000-\u109F]/);
  if (firstBurmeseIdx !== -1) {
    text = text.substring(firstBurmeseIdx);
  }

  const lines = text.split("\n");
  const cleanPhrases = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    // အင်္ဂလိပ်စာလုံး ၂ လုံးထက် ပိုပါနေပါက အတွေးစာကြောင်းဖြစ်၍ ဖယ်ထုတ်မည်
    const engCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (engCount > 2) continue;

    // စာကြောင်းအစတွင် ကပ်ပါလာသော နံပါတ်များ (ဥပမာ "2 ", "3. ", "၄-") ကို ဖြတ်ပစ်ခြင်း
    trimmed = trimmed.replace(/^[\s\d၀-၉\.\)\-–—:]+/g, "").trim();

    // အင်္ဂလိပ်နှင့် သင်္ကေတ အကြွင်းအကျန်များကို ဖယ်ရှားခြင်း
    trimmed = trimmed.replace(/[a-zA-Z0-9_\-–—#*@$%&+=<>{}\[\]\\\/^~`|]/g, "").trim();

    // မြန်မာစာလုံး အနည်းဆုံး ၂ လုံး ပါမှသာ လက်ခံမည်
    const myanCount = (trimmed.match(/[\u1000-\u109F]/g) || []).length;
    if (myanCount >= 2) {
      cleanPhrases.push(trimmed);
    }
  }

  // အပိုဒ်လိုက် ဖြစ်သွားစေရန် ပေါင်းစပ်ခြင်း
  let finalStory = cleanPhrases.join(" ").replace(/\s+/g, " ").trim();
  // ပုဒ်မ (။) အဆုံးများတွင် စာကြောင်းခွဲပေးခြင်း
  finalStory = finalStory.replace(/။\s*/g, "။\n\n").trim();

  return finalStory || text.match(/[\u1000-\u104F\s၊။]+/g)?.join(" ").trim() || "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { action, topic, genre, format, durationMinutes, scriptText, photoCount } = req.body;

    // အဆင့် ၂ အတွက်: မြန်မာစာသားမှ English Photo Prompts သို့ ဘာသာပြန်ခြင်း
    if (action === "translate_to_prompts") {
      if (!scriptText) return res.status(400).json({ error: "စာသား မပါဝင်ပါ" });
      const count = parseInt(photoCount) || 4;

      const prompt = `Read this Burmese story:
"${scriptText.substring(0, 500)}"

Task: Extract exactly ${count} visual cinematic scenes and translate them into highly descriptive, photorealistic English image prompts for AI generation.
Output format: Output ONLY the ${count} prompts, each on a separate line. Do NOT write numbers, bullet points, or intros.`;

      const aiRes = await runAIWithModel(prompt, "You are a prompt engineer. Output only English image prompts, one per line. No numbers.");
      const rawLines = aiRes.text.split("\n")
        .map(l => l.replace(/^[\s\d\.\)\-]+/, "").replace(/^SCENE\s*\d+:\s*/i, "").trim())
        .filter(l => l.length > 8);

      const promptsList = [];
      for (let i = 0; i < count; i++) {
        promptsList.push(rawLines[i] || `cinematic scene ${i + 1}, ultra realistic lighting, 8k masterpiece, dramatic atmosphere`);
      }

      return res.status(200).json({
        prompts_text: promptsList.join("\n\n"),
        prompts_array: promptsList,
        model_used: aiRes.modelUsed
      });
    }

    // အဆင့် ၁ အတွက်: ပုံပြင်စာသား ရေးထုတ်ခြင်း
    if (!topic) return res.status(400).json({ error: "ဇာတ်လမ်းခေါင်းစဉ် မပါဝင်ပါ" });

    const selectedMins = parseInt(durationMinutes) || 1;
    const words = selectedMins * 105;

    const systemPrompt = "You are a professional Burmese author. Output strictly in continuous, natural Burmese story narration. Under NO circumstances should you output line numbers, sentence counts, list numbers (like 1, 2, 3), English words, or thoughts.";

    if (format === "series") {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
အခန်းဆက် ၆ ပိုင်းပါဝင်သော မြန်မာပုံပြင်ဇာတ်လမ်း ရေးပေးပါ။
အပိုင်းတစ်ခုချင်းစီတွင် စာလုံးရေ ${words} လုံးခန့် ပါဝင်ရပါမည်။
စည်းမျဉ်း: နံပါတ်စဉ်များ၊ အင်္ဂလိပ်စာလုံးများ လုံးဝမပါရပါ။ သဘာဝကျသော စကားပြေဖြင့် ရေးပါ။
အပိုင်းများကို အောက်ပါအတိုင်းသာ ခွဲခြားပေးပါ-
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
      // Movie format
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
ပြီးပြည့်စုံသော ရုပ်ရှင်ပုံပြင် ဇာတ်လမ်းစာသားကို မြန်မာဘာသာသက်သက်ဖြင့် စာပိုဒ်လိုက် ရေးပေးပါ။
စာလုံးရေ ခန့်မှန်းခြေ: ${words} လုံး။
အဓိက စည်းမျဉ်း: နံပါတ်စဉ်များ (၁၊ ၂၊ ၃ သို့မဟုတ် 1, 2, 3) လုံးဝမတပ်ရပါ။ အင်္ဂလိပ်စာလုံး လုံးဝ မပါရပါ။ ပုံပြင်စကားပြေ သက်သက်သာ ရေးပေးပါ။`;

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
    console.error("Story Text Generation Error:", err);
    return res.status(500).json({ error: err.message || "ဇာတ်လမ်းစာသား ထုတ်ယူမှု မအောင်မြင်ပါ" });
  }
};
