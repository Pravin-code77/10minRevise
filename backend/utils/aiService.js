const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const generateFlashcardContent = async (text, option) => {
    try {
        // Instantiate fresh each call so .env key changes take effect without restart
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // gemini-2.0-flash is verified to work with the current API Key (see available_models.txt)
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let output = response.text();

        // Cleanup markdown code blocks if present
        output = output.replace(/```mermaid/g, '').replace(/```/g, '').trim();

        console.log('[AI Service] Generation successful.');
        return output;
    } catch (error) {
        console.error("AI Generation Error Full Details:", JSON.stringify(error, null, 2));

        // Check for 429 Quota Exceeded
        if (error.message.includes('429') || error.message.includes('Quota exceeded')) {
            throw new Error(`Daily Limit Reached. Please try again later or verify your API Data Plan.`);
        }

        // Log generic message but throw specific
        console.error("AI Generation Error Message:", error.message);
        throw new Error(`AI Service Failed: ${error.message}`);
    }
};

module.exports = { generateFlashcardContent };
