const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    console.log('Listing available models for the provided API key...');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // We can't actually "list" via the GenAI SDK easily without the full client, 
        // but we can test which ones respond.
        
        const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
        const versions = ['v1', 'v1beta'];
        
        for (const v of versions) {
            console.log(`--- Testing Version: ${v} ---`);
            for (const m of models) {
                try {
                    const model = genAI.getGenerativeModel({ model: m }, { apiVersion: v });
                    const result = await model.generateContent('hi');
                    console.log(`✅ ${m} @ ${v}: SUCCESS`);
                    break; // if one works in this version, we found our version
                } catch (e) {
                    console.log(`❌ ${m} @ ${v}: FAILED - ${e.message.split('\n')[0]}`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Script Error:', err);
    }
}

listModels();
