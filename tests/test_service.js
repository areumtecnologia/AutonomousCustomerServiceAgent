require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const { AutonomousCustomerServiceAgent, Type, AgentEvents, AgentConfig } = require('../src') //require('@areumtecnologia/autonomouscustomerserviceagent');

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
  const productCategories = ['Passeios', 'Trilhas', 'Hospedagem', 'VIP', 'Noturno', 'Luxo', 'Econômico', 'Iniciantes', 'Barco'];

  const products = [
    { id: 1, name: 'Passeios de Barco', price: 'R$ 200', details: 'Passeio de 4 horas pelos igarapés.', tags: ['Passeios', 'Barco'], daily_vacancies: 10 },
    { id: 2, name: 'Trilhas', price: 'R$ 150', details: 'Trilha de 3 horas na floresta.', tags: ['Trilhas'], daily_vacancies: 10 },
    { id: 3, name: 'Hospedagem', price: 'R$ 500/noite', details: 'Quarto confortável com vista para o rio.', tags: ['Hospedagem'], daily_vacancies: 10 },
    { id: 4, name: 'Passeios de Barco VIP', price: 'R$ 400', details: 'Passeio exclusivo de 6 horas com guia privado.', tags: ['Passeios', 'Barco', 'VIP'], daily_vacancies: 10 },
    { id: 5, name: 'Trilhas Noturnas', price: 'R$ 180', details: 'Trilha de 2 horas para observar a vida noturna da floresta.', tags: ['Trilhas', 'Noturno'], daily_vacancies: 10 },
    { id: 6, name: 'Hospedagem Luxo', price: 'R$ 800/noite', details: 'Suíte de luxo com todas as comodidades.', tags: ['Hospedagem', 'Luxo'], daily_vacancies: 10 },
    { id: 7, name: 'Passeios de Barco Econômico', price: 'R$ 100', details: 'Passeio de 2 horas pelos igarapés.', tags: ['Passeios', 'Barco', 'Econômico'], daily_vacancies: 10 },
    { id: 8, name: 'Trilhas para Iniciantes', price: 'R$ 120', details: 'Trilha de 1 hora para iniciantes.', tags: ['Trilhas', 'Iniciantes'], daily_vacancies: 10 },
    { id: 9, name: 'Hospedagem Econômica', price: 'R$ 300/noite', details: 'Quarto econômico com vista para o jardim.', tags: ['Hospedagem', 'Econômica'], daily_vacancies: 10 },
  ];
  // Simular base de reservas com 9 reservas no dia 30 de maio e 1 reserva no dia 31 de maio
  const reservations = [
    { id: 1, product_id: 1, date: '2026-05-30', quantity: 2 },
    { id: 2, product_id: 2, date: '2026-05-30', quantity: 1 },
    { id: 3, product_id: 3, date: '2026-05-30', quantity: 1 },
    { id: 4, product_id: 4, date: '2026-05-30', quantity: 1 },
    { id: 5, product_id: 5, date: '2026-05-30', quantity: 1 },
    { id: 6, product_id: 6, date: '2026-05-30', quantity: 1 },
    { id: 7, product_id: 7, date: '2026-05-30', quantity: 1 },
    { id: 8, product_id: 8, date: '2026-05-30', quantity: 1 },
    { id: 9, product_id: 9, date: '2026-05-30', quantity: 1 },
    { id: 10, product_id: 1, date: '2026-05-31', quantity: 1 },
  ]
  const customerAgent = new AutonomousCustomerServiceAgent({
    apiKey: GOOGLE_GEMINI_API_KEY,
    // model: 'gemma-4-31b-it', // 'gemma-4-26b-a4b-it',
    // temperature: 0.1,
    agent: new AgentConfig(
      'Monnalisa',
      'Poranduba Amazônia Turismo',
      'Ecoturismo premium na Amazônia. Especialistas em turismo sustentável desde 2010.',
      'Sua missão é atuar como agente de vendas, especializado em qualificação e conversão de leads.',
      `1. Cumprimente o lead de forma imediata, profissional e acolhedora usando expressões comuns do dia-a-dia (Bom dia, Boa tarde, Boa noite, etc). 
          Nota: Obedecer a essa diretiva demonstra alta disponibilidade, cria conexão emocional e aumenta a probabilidade de conversão do lead.
        2. Descubra as necessidades e interesses do lead, antes de chamar ferramentas. 
        3. Após o lead expressar claramente suas necessidades ou questões, utilize as ferramentas disponíveis para obter dados atualizados.
        4. Forneça respostas precisas e contextualizadas, incorporando os resultados das tools de forma natural.
        5. Classifique o lead com base nas informações coletadas.
        6. Efetive a venda, se aplicável, utilizando as ferramentas de checkout disponíveis.
        7. Mantenha o foco no direcionamento da conversa. Se o lead tentar desviar do assunto ou fazer perguntas irrelevantes, gentilmente redirecione a conversa de volta para o que você precisa saber.
        8. Ao final da conversa, agradeça o lead pelo contato e informe que você está à disposição para futuras dúvidas ou necessidades.`,
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
    name: 'get_product_data',
    description: 'Obtém informações de produtos e serviços da empresa (preços, disponibilidade, detalhes) com base em tags ou palavras-chave.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: productCategories },
          description: 'Categorias a consultar. Null ou omitido retorna todas.',
        },
      },
    },
  }, async ({ tags } = {}) => {
    const categories = tags?.length ? tags : productCategories;
    return JSON.stringify(products.filter(p => categories.some(category => p.tags.includes(category))));
  });

  customerAgent.registerTool({
    name: 'check_availability',
    description: 'Verifica a disponibilidade de vagas para uma reserva em determinada data.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        tags: {
          type: Type.ARRAY,
          items: { type: Type.STRING, enum: productCategories },
          description: 'Categorias a consultar. Null ou omitido retorna todas.',
        },
        date: { type: Type.STRING, description: 'Data desejada no formato YYYY-MM-DD' }
      },
      required: ['tags', 'date']
    }
  }, async ({ tags, date }, _signal) => {
    // Primeiro verifica que dia é hoje e retorna resposta se o dia ja passou
    const today = new Date();
    const reservationDate = new Date(date);
    if (reservationDate < today) {
      return JSON.stringify({ disponivel: false, message: 'Data já passou.' });
    }
    const reservacao = reservations.find(r => r.product_id === tags[0].id && r.date === date);
    if (!reservacao) {
      return JSON.stringify({ disponivel: true, vagas_restantes: 10 });
    }

    const totalVacancies = products.find(p => p.tags.includes(tags[0])).daily_vacancies;

    console.log(`[check_availability] Reservado: ${reservacao.quantity}, Total: ${totalVacancies}`);
    return JSON.stringify({ disponivel: totalVacancies - reservacao.quantity > 0, vagas_restantes: totalVacancies - reservacao.quantity });
  });

  customerAgent.registerTool({
    name: 'checkout',
    description: 'Finaliza a compra usando informacoes do lead, dos produtos/servicos selecionados e retorna os detalhes da transação.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        product_id: {
          type: Type.INTEGER,
          description: 'ID do produto a ser comprado.'
        },
        customer_info: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Nome do cliente.' },
            phone: { type: Type.STRING, description: 'Telefone do cliente.' },
            email: { type: Type.STRING, description: 'Email do cliente.' },
          },
        }
      }
    },
  }, async () => {
    /* Lógica de checkout */
    return JSON.stringify({ success: true, order_id: 'ABC123', message: 'Compra finalizada com sucesso!' });
  }
  );


  // ── Conversa multi-turno ──────────────────────────────────────────────────
  const session = customerAgent.createSession(Date.now().toString(), {
    name: 'Renan',
    phone: '5591981648646',
    origin: { id: '12345', type: 'whatsapp', description: 'Lead via WhatsApp.' }
  });

  customerAgent.registerTool({
    name: 'clear_session',
    description: 'Limpa a sessão atual, após concluir a conversa.',
    parameters: { type: Type.OBJECT, properties: {} },
  }, async () => {
    console.log('\x1b[90m%s\x1b[0m', '[Tool] O Agente chamou clear_session - limpando sessão para encerrar conversa.');
    customerAgent.clearSession(session.id)

  }
  );

  // Turno 1 → agente atenderá o lead com boas-vindas
  console.log('\x1b[33m%s\x1b[0m', `\n[Lead]: Olá!`); // Simula mensagem do lead
  const r1 = await customerAgent.processMessage(session.id, 'Olá!');

  // Turno 2 → agente usará get_product_data
  console.log('\x1b[33m%s\x1b[0m', `\n[Lead]: Quais os valores dos passeios de barco?`); // Simula mensagem do lead
  const r2 = await customerAgent.processMessage(session.id, 'Quais os valores dos passeios de barco?');

  // Turno 3 → agente usará a tool recém criada programaticamente 'check_availability'
  console.log('\x1b[33m%s\x1b[0m', `\n[Lead]: Tem disponibilidade para o dia 30 de maio?`); // Simula mensagem do lead
  const r3 = await customerAgent.processMessage(session.id, 'Tem disponibilidade para o dia 30 de maio?');

  // Turno 4 - Cliente aceita a oferta
  console.log('\x1b[33m%s\x1b[0m', `\n[Lead]: Perfeito, quero reservar!`); // Simula mensagem do lead
  const r4 = await customerAgent.processMessage(session.id, 'Perfeito, quero reservar!');

  // Turno 5 - Cliente fornece informações para checkout
  console.log('\x1b[33m%s\x1b[0m', `\n[Lead]: Meu nome é Renan, meu telefone é 5591981648646 e meu email é renan@example.com`); // Simula mensagem do lead
  const r5 = await customerAgent.processMessage(session.id, 'Meu nome é Renan, meu telefone é 5591981648646 e meu email é renan@example.com');

  // Mostra o numero de sessoes ativas concomitantes
  console.log('\x1b[36m%s\x1b[0m', `\n[Sessões Ativas] ${customerAgent.activeSessionsCount()} sessão(ões) ativa(s) no momento.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar estado de erro em resposta do agente:
// 
//   if (response.service_unavailable) {
//     console.log('Serviço indisponível, recovery agendado');
//     console.log('Tentativas:', response.recovery_attempts);
//   }
// ─────────────────────────────────────────────────────────────────────────────

// Delay entre execuções
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Executa o teste consecutivamente para validar estabilidade e performance
(async () => {
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < 1; i++) {
    try {
      console.log(`\n\x1b[36m%s\x1b[0m`, `\n=== Execução de Teste ${i + 1} ===`);
      await example();
      successCount++;
    } catch (err) {
      const msg = err?.message || String(err);
      console.error('\x1b[31m%s\x1b[0m', `[Erro Fatal]`, err);
      failureCount++;
    }
    // Aguarda 2 segundos entre testes para evitar rate limiting
    if (i < 4) {
      console.log('\x1b[90m%s\x1b[0m', '[Aguardando 2s antes do próximo teste...]');
      await delay(2000);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log('\n\x1b[36m%s\x1b[0m', '\n=== Testes Concluídos ===');
  console.log(`✓ Sucessos: ${successCount}`);
  console.log(`✗ Falhas: ${failureCount}`);
  console.log(`⏱ Duração: ${duration.toFixed(1)}s`);
})();