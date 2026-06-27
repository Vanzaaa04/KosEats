require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
    const data = await response.json();
    console.log("Models available for this key:");
    console.log(data.models.map(m => m.name).filter(n => n.includes('gemini')));
  } catch (err) {
    console.error(err);
  }
}
main();
