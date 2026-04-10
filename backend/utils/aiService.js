const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Standard Gemini models with fallback. Updated based on current API availability (April 2026).
const MODEL_FALLBACK_CHAIN = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-1.5-flash'];


/**
 * Generates flashcard content using Google's Generative AI.
 * Implements a fallback chain and aggressive cleanup to ensure prompt-only output.
 */
const generateFlashcardContent = async (text, option) => {
    if (!text || option === 'raw') return text;

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        const promptMap = {
            'visualize': `Generate a structured, top-down ASCII text diagram of the concept below. 
Use symbols like |, -, +, and > to show flow and hierarchy. 
IMPORTANT: Return ONLY the ASCII diagram. No text before or after. No markdown blocks.
Concept: "${text}"`,
            'simplify': `Condense the following text into 3-5 concise, high-impact bullet points. 
Use simple, clear language. 
IMPORTANT: Return ONLY the bullet points. No introductory text, no "Sure!", no conclusions.
Text: "${text}"`,
        };

        const prompt = promptMap[option] || text;
        console.log(`[AI Service] Attempting generation for [${option}]...`);

        let lastError = null;
        for (const modelName of MODEL_FALLBACK_CHAIN) {
            try {
                console.log(`[AI Service] Trying model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                // Set a reasonable timeout for slower models
                const aiPromise = model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1, 
                        maxOutputTokens: 1000,
                    }
                });
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('AI Timeout')), 15000)
                );

                const result = await Promise.race([aiPromise, timeoutPromise]);
                const response = await result.response;
                let output = response.text();

                if (!output) throw new Error("Empty AI response");

                // Aggressive Cleanup: Remove conversational filler and markdown blocks
                output = output
                    .replace(/^.*here is.*:|^.*here's.*:|^.*simplified.*:|^.*diagram.*:/gim, '')
                    .replace(/```[a-z]*\n/gim, '')
                    .replace(/```/g, '')
                    .trim();

                console.log(`[AI Service] ✅ Success with ${modelName}`);
                return output;

            } catch (err) {
                lastError = err;
                console.log(`[AI Service] ❌ ${modelName} failed: ${err.message.split('\n')[0]}`);
                continue;
            }
        }

        console.error("[AI Service] All fallback models failed.");
        throw lastError || new Error("All AI models failed");

    } catch (error) {
        console.error("AI Generation Issue (Falling back to Raw):", error.message);
        return text;
    }
};

module.exports = { generateFlashcardContent };

