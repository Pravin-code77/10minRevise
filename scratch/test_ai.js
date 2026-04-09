const path = require('path');
const { generateFlashcardContent } = require(path.join(__dirname, '../backend/utils/aiService'));
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function testAI() {
    console.log('Testing Gemini API with key:', process.env.GEMINI_API_KEY ? 'Present' : 'MISSING');
    try {
        const result = await generateFlashcardContent('Test text to simplify.', 'simplify');
        console.log('AI Result:', result);
        if (result && result.length > 0 && result !== 'Test text to simplify.') {
            console.log('✅ AI is working properly on this machine!');
        } else {
            console.log('❌ AI returned raw text (fallback occurred).');
        }
    } catch (err) {
        console.error('❌ AI Script Error:', err);
    }
}

testAI();
