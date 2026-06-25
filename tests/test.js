require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const IMAGE_BASE64 = process.env.IMAGE_BASE64;
const AUDIO_BASE64 = process.env.AUDIO_BASE64;
const VIDEO_BASE64 = process.env.VIDEO_BASE64;
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const { AutonomousCustomerServiceAgent, Type, AgentEvents, AgentConfig, OllamaProvider, NvidiaProvider } = require('../src') //require('@areumtecnologia/autonomouscustomerserviceagent');

// ─────────────────────────────────────────────────────────────────────────────
// Exemplo de uso completo (multi-turno com tool call real)
// 
// Recursos de Tratamento de Erros e Recovery:
//   • SERVICE_UNAVAILABLE: Emitido quando há erro irrecuperável
//   • RECOVERY_SCHEDULED: Tentativa automática agendada em X minutos
//   • RECOVERY_ATTEMPT: Tentativa de recuperação em execução
//   • inErrorState: Flag que marca sessão em erro (graceful degradation)
//   • Resposta de indisponibilidade customizável (errorMessages)
// ─────────────────────────────────────────────────────────────────────────────

async function example() {
  const customerAgent = new AutonomousCustomerServiceAgent({
    // apiKey: GOOGLE_GEMINI_API_KEY,
    // model: 'gemma-4-31b-it', // 'gemma-4-26b-a4b-it',
    provider: new NvidiaProvider({
      apiKey: NVIDIA_API_KEY,
      model: 'minimaxai/minimax-m3' // Modelo minimaxm3 conforme exemplo
    }),
    // temperature: 0.1,
    agent: new AgentConfig(
      'Monnalisa',
      'Áreum Tecnologia',
      'Somos uma empresa de tecnologia especializada em soluções de Inteligência Artificial e Automação de Processos. Estamos localizados em Belém, Pará, Brasil.',
      'Sua missão é atuar como assistente util',
      `Atenda o usuario da melhor forma possível, utilizando as tools disponíveis para obter dados atualizados.`,
      'pt-BR'
    )
  });

  // ── Eventos ───────────────────────────────────────────────────────────────
  customerAgent
    .on(AgentEvents.SESSION_CREATED, ({ session }) => console.log(`[Sessão] Criada: ${session.id}`))
    .on(AgentEvents.SESSION_CLEARED, ({ session }) => console.log(`[Sessão] Limpa: ${session.id}`))
    .on(AgentEvents.TURN_START, ({ depth, session }) => console.log(`[Loop] Turno ${depth} — sessão ${session.id}`))
    .on(AgentEvents.TURN_END, ({ depth, session }) => console.log(`[Loop] Turno ${depth} finalizado — sessão ${session.id}`))
    .on(AgentEvents.RESPONSE, ({ response, reasoning, session, usageMetadata }) => {
      console.log(`[Reasoning] Sessão ${session.id}:`, reasoning);
      console.log('\x1b[32m%s\x1b[0m', `[Agente] Sessão ${session.id}:`, response);
      console.log(`[UsageMetadata] Sessão ${session.id}:`, usageMetadata);

    })
    // .on(AgentEvents.RAW_RESPONSE, ({ rawResponse, session }) => console.log(`[Raw Response] Sessão ${session.id}:`, rawResponse, rawResponse.candidates[0].content.parts))
    .on(AgentEvents.TOOL_CALL, ({ name, args }) => console.log(`[Tool →] ${name}`, args))
    .on(AgentEvents.TOOL_RESULT, ({ name, result }) => console.log(`[Tool ←] ${name}:`, result))
    .on(AgentEvents.RETRY, ({ attempt, delay, error }) => {
      const msg = error?.message || error?.error?.message || String(error);
      console.warn(`[Retry] Tentativa ${attempt} em ${Math.round(delay)}ms - ${msg}`);
    })
    .on(AgentEvents.VULNERABILITY_EXPLORATION_DETECTED, ({ session, attempts }) => {
      console.error(`\x1b[31m%s\x1b[0m`, `[Vulnerability Exploration Detected] - ${session.id} has made ${attempts} attempts. Session details: ${JSON.stringify(session)}`);
    })
    .on(AgentEvents.ERROR, ({ error, source }) => {
      const msg = error?.message || error?.error?.message || String(error);
      console.error(`\x1b[31m%s\x1b[0m`, `[Erro]${source ? ` [${source}]` : ''} - ${msg}`);
    });


  // ── Registra NOVA tool programaticamente (informando o Schema completo) ───
  customerAgent.registerTool({
    name: 'get_current_datetime',
    description: 'Retorna a data e hora atual no fuso horário do Brasil (America/Sao_Paulo).',
    parameters: { type: Type.OBJECT, properties: {} },
  }, async () =>
    new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  );

  customerAgent.registerTool({
    name: 'who_i_am',
    description: 'Retorna informações sobre quem sou eu.',
    parameters: { type: Type.OBJECT, properties: {} },
  }, async () => {
    return 'Eu sou um assistente virtual chamado Monnalisa, criado pela Áreum Tecnologia para auxiliar clientes com suas solicitações.'
  });

  const session = customerAgent.createSession(Date.now().toString(), {
    name: 'Renan',
    phone: '5591981648646',
    origin: { id: '12345', type: 'whatsapp', description: 'Lead via WhatsApp.' }
  });

  // await customerAgent.processMessage(session.id, "O que é isso?", { base64: IMAGE_BASE64, mimeType: 'image/png' });
  await customerAgent.processMessage(session.id, "Olá, quem é você?", {});

  await new Promise(resolve => setTimeout(resolve, 1000));

  await customerAgent.processMessage(session.id, "Qual o seu nome?", {});

  await new Promise(resolve => setTimeout(resolve, 1000));

  await customerAgent.processMessage(session.id, "Que horas são?", {});
};

example();