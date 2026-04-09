const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function testV1() {
    console.log('Testing Gemini API with v1 endpoint...');
    try {
        // Force v1 in the options (some SDK versions support this in the second param or as an option object)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // In the latest SDK, you can also specify the model version in the name sometimes
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Alternatively, try a different model name that might be v1 compatible
        console.log('Trying gemini-1.5-flash standard...');
        const result = await model.generateContent('Say hello');
        const response = await result.response;
        console.log('✅ Success with v1 (default):', response.text());
        
    } catch (err) {
        console.log('❌ v1 (default) failed:', err.message);
        
        console.log('Trying with explicit v1 bypass (if possible via SDK internal)...');
        // If the above failed with v1beta 404, the SDK is definitely targeting beta.
    }
}

testV1();
