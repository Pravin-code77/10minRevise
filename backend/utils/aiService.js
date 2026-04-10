const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const MODEL_FALLBACK_CHAIN = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

const generateFlashcardContent = async (text, option) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const promptMap = {
            'visualize': `Generate a structured, top-down ASCII text diagram of the concept below. Use symbols like |, -, +, and > to show flow and hierarchy. IMPORTANT: Return ONLY the ASCII diagram. Do not include any introductory text, explanations, or markdown code blocks. Concept: "${text}"`,
            'simplify': `Condense the following text into 3-5 concise, high-impact bullet points. Use simple language. IMPORTANT: Return ONLY the bullet points. Do not include any introductory text, conclusions, or conversational filler. Text: "${text}"`,
            'raw': text
        };

        const prompt = promptMap[option] || text;
        if (option === 'raw') return text;

        console.log(`[AI Service] Attempting generation with option: ${option}`);

        let lastError = null;
        for (const modelName of MODEL_FALLBACK_CHAIN) {
            try {
                console.log(`[AI Service] Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName }); // Remove forced apiVersion for better compatibility
                
                const aiPromise = model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, // Lower temperature for more consistent, non-conversational output
                        maxOutputTokens: 500,
                    }
                });
                
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI Timeout')), 10000));

                const result = await Promise.race([aiPromise, timeoutPromise]);
                const response = await result.response;
                let output = response.text();

                // Aggressive Cleanup: Remove conversational filler and markdown
                output = output.replace(/Here is.*:|Here's.*:|In summary.*|Simplified:|Diagram:|^```[a-z]*\n|```$/gim, '').trim();
                // If the AI still included code blocks, strip them
                output = output.replace(/```/g, '').trim();

                console.log(`[AI Service] ✅ Success with ${modelName}`);
                return output;

            } catch (err) {
                lastError = err;
                console.log(`[AI Service] ❌ ${modelName} failed: ${err.message.split('\n')[0]}`);
                continue;
            }
        }

        console.error("[AI Service] All models in fallback chain failed.");
        throw lastError || new Error("All AI models failed to respond");

    } catch (error) {
        console.error("AI Generation Issue (Falling back to Raw):", error.message);
        return text;
    }
};

module.exports = { generateFlashcardContent };
