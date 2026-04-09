const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro'];

const generateFlashcardContent = async (text, option) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const promptMap = {
            'visualize': `Convert the following study text into a descriptive image prompt for Mermaid.js or DALL-E. Focus on visual relationships. Text: "${text}"`,
            'simplify': `Explain the following concept as if I am 10 years old. Be concise but clear. Concept: "${text}"`,
            'raw': text
        };

        const prompt = promptMap[option] || text;
        if (option === 'raw') return text;

        console.log(`[AI Service] Attempting generation with option: ${option}`);

        let lastError = null;
        for (const modelName of MODEL_FALLBACK_CHAIN) {
            try {
                console.log(`[AI Service] Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                
                const aiPromise = model.generateContent(prompt);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 8000));

                const result = await Promise.race([aiPromise, timeoutPromise]);
                const response = await result.response;
                let output = response.text();

                // Cleanup markdown code blocks if present
                output = output.replace(/```mermaid/g, '').replace(/```/g, '').trim();

                console.log(`[AI Service] ✅ Success with ${modelName}`);
                return output;

            } catch (err) {
                lastError = err;
                console.log(`[AI Service] ❌ ${modelName} failed: ${err.message.split('\n')[0]}`);
                
                // If it's a timeout, maybe the next model will also time out, but we try anyway.
                // If it's a 429 (Quota), the next model might have different quota.
                continue;
            }
        }

        console.error("[AI Service] All models in fallback chain failed.");
        throw lastError || new Error("All AI models failed to respond");

    } catch (error) {
        console.error("AI Generation Issue (Falling back to Raw):", error.message);
        // CRITICAL: Return original text so the save doesn't fail
        return text;
    }
};

module.exports = { generateFlashcardContent };
