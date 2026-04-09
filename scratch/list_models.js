const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function listModels() {
    console.log('Listing available models for the provided API key...');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // The SDK doesn't have a direct listModels on the genAI object usually, 
        // it uses the fetch API or a specific client, but we can try a few common names.
        
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent('hi');
                console.log(`✅ Model ${m} is AVAILABLE`);
            } catch (e) {
                console.log(`❌ Model ${m} is NOT AVAILABLE: ${e.message.split('\n')[0]}`);
            }
        }
    } catch (err) {
        console.error('❌ Script Error:', err);
    }
}

listModels();
