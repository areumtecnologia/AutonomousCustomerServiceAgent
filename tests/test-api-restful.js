/*
  Exemplo de API RESTful usando Express para gerenciar sessões
  e processar mensagens com o AutonomousCustomerServiceAgent.

  Para executar este exemplo:
    npm install express
    node tests/test-api-restful.js
*/

require('dotenv').config();
const express = require('express');
const { AutonomousCustomerServiceAgent, Type } = require('../src/index');

const app = express();
app.use(express.json());

const agent = new AutonomousCustomerServiceAgent({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
  company: {
    name: 'Poranduba Amazônia Turismo',
    details: 'Ecoturismo premium na Amazônia. Especialistas em turismo sustentável desde 2010.',
  },
  agent: {
    name: 'Monnalisa',
    mission: {
      objective: 'Atuar como agente de vendas especialista em qualificação e conversão de leads.',
      instructions: `
        1. Cumprimente o lead de forma profissional e acolhedora.
        2. Descubra as necessidades do lead antes de usar ferramentas.
        3. Use ferramentas quando necessário para obter dados atualizados.
        4. Responda com precisão e contextualização.
      `,
    },
  },
  failureHandlingMode: 'async',
  retryScheduleMinutes: 5,
  retryScheduleAttempts: 24,
  unavailabilityMessage: 'Estamos com uma indisponibilidade temporária. Entraremos em contato assim que o problema for sanado.',
});

// Registrar um exemplo de tool para demonstração
agent.registerTool({
  name: 'get_current_datetime',
  description: 'Retorna a data e hora atual no fuso horário do Brasil.',
  parameters: { type: Type.OBJECT, properties: {} },
}, async () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));

app.post('/sessions', (req, res) => {
  const { name, phone, origin } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'name and phone are required' });
  }

  const sessionId = agent.createSession({
    name,
    phone,
    origin: origin || { type: 'api', description: 'Lead via API RESTful' },
  });

  res.status(201).json({ sessionId });
});

app.post('/sessions/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const response = await agent.processMessage(message, sessionId);
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/sessions/:sessionId/clear', (req, res) => {
  const { sessionId } = req.params;
  const cleared = agent.clearSession(sessionId);
  if (!cleared) {
    return res.status(404).json({ error: 'session not found' });
  }
  res.json({ cleared: true });
});

app.get('/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = agent.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'session not found' });
  }
  res.json(session);
});

app.get('/', (req, res) => {
  res.json({ message: 'AutonomousCustomerServiceAgent REST API is running.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`REST API listening on http://localhost:${PORT}`);
});
