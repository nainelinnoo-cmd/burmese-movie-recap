const { Groq } = require("groq-sdk");
const { GoogleGenAI } = require("@google/genai");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const HF_SPACE_URL = "https://nlopro-burmese-tts-api.hf.space";

// ၁။ AI ဇာတ်လမ်း ရေးသားခြင်း
async function generateStoryScript(topic, genre) {
  const genrePrompts = {
    horror: "Write a short, spine-chilling horror ghost story in Burmese",
    motivation: "Write an inspiring, motivational life lesson story in Burmese",
    fairy: "Write an enchanting fairy tale or folk fable in Burmese",
  };

  const instruction = genrePrompts[genre] || "Write a captivating short story in Burmese";
  const prompt = `${instruction} about the topic: "${topic}". Keep it engaging, natural, and under 150 words. Return ONLY the Burmese story text without English explanations.`;

  const geminiModels = [
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  if (process.env.GEMINI_API_KEY) {
    for (const modelName of geminiModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        if (response && response.text) return response.text.trim();
      } catch (err) {
        console.warn(`Gemini (${modelName}) failed:`, err.message);
      }
    }
  }

  // Groq Fallback
  const groqCompletion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a master Burmese storyteller. Output ONLY fluent Burmese text." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const resultText = groqCompletion.choices[0]?.message?.content;
  if (resultText) return resultText.trim();

  throw new Error("AI Story Script ရေးသားမည့် Model မအောင်မြင်ပါ");
}

// ၂။ Hugging Face Gradio မှ မြန်မာအသံ ရယူခြင်း
async function fetchBurmeseVoice(text, voice) {
  const postRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [text] }),
  });

  if (!postRes.ok) {
    const err = await postRes.text();
    throw new Error(`Hugging Face Call Error: ${postRes.status} - ${err}`);
  }

  const { event_id } = await postRes.json();

  const streamRes = await fetch(`${HF_SPACE_URL}/gradio_api/call/predict/${event_id}`);
  const streamText = await streamRes.text();

  const lines = streamText.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const parsed = JSON.parse(line.replace("data:", "").trim());
      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0];
      }
    }
  }

  throw new Error("Hugging Face မှ အသံဖိုင်ဒေတာ ပြန်မရပါ");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { topic, genre, voice } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "ခေါင်းစဉ် မပါဝင်ပါ" });
    }

    const storyText = await generateStoryScript(topic, genre);
    const audioBase64 = await fetchBurmeseVoice(storyText, voice || "my-MM-ThihaNeural");

    return res.status(200).json({
      storyText: storyText,
      audioBase64: audioBase64,
    });
  } catch (error) {
    console.error("Story API Error:", error);
    return res.status(500).json({
      error: error.message || "ဇာတ်လမ်းဖန်တီးမှု မအောင်မြင်ပါ",
    });
  }
};
