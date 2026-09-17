const { GoogleGenAI } = require("@google/genai");
const { Groq } = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { promptText } = req.body;
    const prompt = `Write a short, powerful, single-sentence quote or caption in Burmese related to: "${promptText || 'Life and Inspiration'}". Keep it under 15 words. Return ONLY the Burmese text.`;

    let caption = "";

    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: prompt,
        });
        if (response && response.text) caption = response.text.trim();
      } catch (err) {
        console.warn("Gemini motion caption failed, using fallback:", err.message);
      }
    }

    if (!caption) {
      const groqCompletion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a creative writer. Output ONLY a short Burmese sentence." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });
      caption = groqCompletion.choices[0]?.message?.content?.trim() || "";
    }

    return res.status(200).json({
      caption: caption || promptText,
    });
  } catch (error) {
    console.error("Motion API Error:", error);
    return res.status(500).json({
      error: error.message || "Motion Caption ထုတ်လုပ်မှု မအောင်မြင်ပါ",
    });
  }
};
