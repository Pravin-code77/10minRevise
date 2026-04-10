const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '../backend/.env' });

const testAI = async () => {
    console.log("Key:", process.env.GEMINI_API_KEY ? "Found" : "MISSING");
    if (!process.env.GEMINI_API_KEY) return;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent("Say hello world");
        const response = await result.response;
        console.log("Output:", response.text());
    } catch (err) {
        console.error("Error:", err.message);
    }
};

testAI();
