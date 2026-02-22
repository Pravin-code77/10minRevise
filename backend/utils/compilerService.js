const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const SUPPORTED_LANGUAGES = ['javascript', 'python', 'java', 'c', 'cpp'];

const runCode = async (language, code) => {
    const lang = language.toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        return {
            stdout: null,
            stderr: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
            status: { description: 'Error' }
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `You are a ${lang} code interpreter. Execute the following ${lang} code exactly as a real interpreter would and return ONLY the output.

Rules:
- Return ONLY what would appear in stdout if this code ran successfully.
- If there is a runtime error or syntax error, return ONLY the error message that would appear in stderr, prefixed with "STDERR:".
- Do NOT add explanations, markdown, code blocks, or any extra text.
- Do NOT say "Here is the output" or similar phrases.
- Simulate the EXACT output a real ${lang} interpreter/compiler would produce.

Code:
\`\`\`${lang}
${code}
\`\`\``;

        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim();

        // Detect stderr vs stdout
        if (raw.startsWith('STDERR:')) {
            return {
                stdout: null,
                stderr: raw.replace(/^STDERR:\s*/i, '').trim(),
                compile_output: raw,
                status: { description: 'Error' }
            };
        }

        return {
            stdout: raw,
            stderr: null,
            compile_output: raw,
            status: { description: 'Accepted' }
        };

    } catch (error) {
        console.error('Compiler (Gemini) Error:', error.message);
        return {
            stdout: null,
            stderr: `Code execution failed: ${error.message}`,
            status: { description: 'Error' }
        };
    }
};

module.exports = { runCode };
