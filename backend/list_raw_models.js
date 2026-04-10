const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log('Listing available models via direct GET request...');

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log('Response Body:', body);
    try {
        const parsed = JSON.parse(body);
        if (parsed.models) {
            console.log('✅ Models found:', parsed.models.map(m => m.name));
        } else if (parsed.error) {
            console.log('❌ API Error Detail:', parsed.error.message);
        }
    } catch (e) {
        console.log('Raw body was not JSON.');
    }
  });
}).on('error', (e) => {
  console.error('HTTPS Request Error:', e);
});
