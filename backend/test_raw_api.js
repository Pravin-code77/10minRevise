// Using built-in https module
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

const data = JSON.stringify({
  contents: [{ parts: [{ text: "hi" }] }]
});

console.log('Testing Raw HTTPS Request to Gemini...');
console.log('URL (masked key):', url.replace(key, 'REDACTED'));

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  console.log('Status Code:', res.statusCode);
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Response Body:', body);
    try {
        const parsed = JSON.parse(body);
        if (parsed.error) {
            console.log('❌ API Error Detail:', parsed.error.message);
        } else {
            console.log('✅ API Success!');
        }
    } catch (e) {
        console.log('Raw body was not JSON.');
    }
  });
});

req.on('error', (e) => {
  console.error('HTTPS Request Error:', e);
});

req.write(data);
req.end();
