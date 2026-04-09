const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function testV1() {
    console.log('Testing Gemini API with explicit v1 RequestOption...');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Try passing apiVersion in the second argument (RequestOptions)
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" }, 
            { apiVersion: 'v1' }
        );
        
        console.log('Requesting content...');
        const result = await model.generateContent('Say exactly: API V1 Working');
        const response = await result.response;
        console.log('✅ Success:', response.text());
        
    } catch (err) {
        console.log('❌ v1 test failed:', err.message);
    }
}

testV1();
