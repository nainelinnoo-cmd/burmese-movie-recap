const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

// AI Engine (Gemini 2.0 Flash -> Groq -> Pollinations)
async function runAIWithModel(prompt, systemInstruction = "") {
  const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"];

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
      } catch (e) {}
    }
  }

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

// English Reasoning နှင့် Planning စာသားများကို အမြစ်ပြတ် သန့်စင်သည့် Sanitizer
function filterStrictBurmeseStory(rawText) {
  if (!rawText) return "";
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "")
                    .replace(/```json/gi, "").replace(/```/g, "")
                    .replace(/\\n/g, "\n").replace(/\\"/g, '"');

  // ပထမဆုံး မြန်မာအက္ခရာ စတင်တွေ့သည့်နေရာမှသာ ရှေ့ပိုင်းကို အကုန်ဖြတ်ထုတ်ခြင်း
  const firstBurmeseIdx = text.search(/[\u1000-\u109F]/);
  if (firstBurmeseIdx !== -1) {
    text = text.substring(firstBurmeseIdx);
  }

  // စာကြောင်းတစ်ကြောင်းချင်းစီ စစ်ဆေးပြီး မြန်မာစာမပါသော စာကြောင်းအားလုံးကို ဖယ်ရှားခြင်း
  const lines = text.split("\n");
  const pureBurmeseLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // အင်္ဂလိပ်စာလုံး ၂ လုံးထက် ပိုပါနေပါက ဖယ်ထုတ်မည်
    const engCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (engCount > 2) return false;

    // မြန်မာစာလုံး အနည်းဆုံး ၃ လုံး ပါမှသာ လက်ခံမည်
    const myanCount = (trimmed.match(/[\u1000-\u109F]/g) || []).length;
    return myanCount >= 3;
  });

  return pureBurmeseLines.join("\n").trim() || text.match(/[\u1000-\u104F\s၊။]+/g)?.join(" ").trim() || "";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { topic, genre, format, durationMinutes } = req.body;
    if (!topic) return res.status(400).json({ error: "ဇာတ်လမ်းခေါင်းစဉ် မပါဝင်ပါ" });

    const selectedMins = parseInt(durationMinutes) || 1;
    const words = selectedMins * 105;

    const systemPrompt = "You are a professional Burmese author. Output strictly in pure Burmese language narrative. Never output English words, notes, thinking process, or word counts.";

    // ၁။ Series (၆ ပိုင်းတွဲ) ဖြစ်ပါက
    if (format === "series") {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
အခန်းဆက် ၆ ပိုင်းပါဝင်သော မြန်မာပုံပြင်ဇာတ်လမ်း ရေးပေးပါ။
အပိုင်းတစ်ခုချင်းစီတွင် စာလုံးရေ ${words} လုံးခန့် ပါဝင်ရပါမည်။
စည်းမျဉ်း: အင်္ဂလိပ်စာလုံး လုံးဝမပါရပါ။ မြန်မာစာသက်သက်သာ ရေးပါ။
အပိုင်းများကို အောက်ပါအတိုင်း ခွဲခြားပေးပါ-
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
      const rawText = aiRes.text;
      const parts = rawText.split(/=== အပိုင်း\s*\d+\s*===/);

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

    // ၂။ Movie (တစ်ပိုင်းတည်း) ဖြစ်ပါက
    } else {
      const prompt = `ခေါင်းစဉ်: "${topic}" (${genre})
ပြီးပြည့်စုံသော ရုပ်ရှင်ပုံပြင် ဇာတ်လမ်းစာသားကို မြန်မာဘာသာသက်သက်ဖြင့် ရေးပေးပါ။
စာလုံးရေ ခန့်မှန်းခြေ: ${words} လုံး။
အဓိက စည်းမျဉ်း: အင်္ဂလိပ်စာလုံး၊ အတွေးမှတ်ချက်၊ ခေါင်းစဉ်ရှင်းလင်းချက် လုံးဝ မပါရပါ။ မြန်မာဇာတ်လမ်းစာသား တိုက်ရိုက်သာ ရေးပေးပါ။`;

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
