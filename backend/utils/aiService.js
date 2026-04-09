const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const generateFlashcardContent = async (text, option) => {
    try {
        // Instantiate fresh each call so .env key changes take effect without restart
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // gemini-1.5-flash is stable and fast for serverless environments
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log(`[AI Service] Generating content with option: ${option} | Key: ...${process.env.GEMINI_API_KEY?.slice(-6)}`);

        let prompt = "";
        if (option === 'visualize') {
            prompt = `
            You are a study assistant. Create a clear, simple ASCII ART diagram to explain the concept.
            Do NOT use Mermaid or graph code. Use standard characters (|, -, +, >) to draw boxes and arrows.
            Keep it compact and fit within 30 characters width.
            Text: ${text}
            `;
        } else if (option === 'simplify') {
            prompt = `
            You are a study assistant. Summarize the following text into MAXIMUM 5 concise bullet points.
            - Each bullet must be very short (under 10 words).
            - Use emojis to make it visual.
            - Focus ONLY on the core concept.
            Text: ${text}
            `;
        } else {
            console.log('[AI Service] Option is raw, returning original text.');
            return text;
        }

        const aiPromise = model.generateContent(prompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 7000));

        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = await result.response;
        let output = response.text();

        // Cleanup markdown code blocks if present
        output = output.replace(/```mermaid/g, '').replace(/```/g, '').trim();

        console.log('[AI Service] Generation successful.');
        return output;
    } catch (error) {
        console.error("AI Generation Issue (Falling back to Raw):", error.message);
        // CRITICAL: Return original text so the save doesn't fail
        return text;
    }
};

module.exports = { generateFlashcardContent };
