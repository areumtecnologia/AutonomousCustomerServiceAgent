require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function test() {
  console.log("Iniciando chamada de teste ao Gemini...");
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  console.log("API Key:", apiKey ? `${apiKey.substring(0, 7)}...` : "não definida");
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Olá, responda com apenas um "OK" se você receber esta mensagem.',
    });
    console.log("Resposta do modelo:", response.text);
  } catch (error) {
    console.error("Erro na chamada:", error.status, error.message);
  }
}

test();
