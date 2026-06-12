require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const { AutonomousCustomerServiceAgent, AgentEvents, AgentConfig } = require('../src');

// Delay utilitário
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Execução do Teste de Simulação
// ─────────────────────────────────────────────────────────────────────────────
async function runSimulation() {
    console.log('=== Iniciando Simulação de Concorrência Transparente com AbortSignal ===\n');

    // Instancia o agente com o debounceMs configurado diretamente
    const customerAgent = new AutonomousCustomerServiceAgent({
        apiKey: GOOGLE_GEMINI_API_KEY,
        debounceMs: 1000, // 1 segundo de debounce configurado nativamente!
        agent: new AgentConfig(
            'AtendenteTeste',
            'Empresa de Teste',
            'Empresa fictícia de testes de integração.',
            'Sua missão é responder às dúvidas de forma curta, direta e objetiva.',
            'Responda sempre em poucas palavras para acelerar a resposta.',
            'pt-BR'
        )
    });

    // Registrar logs de eventos para verificar se o cancelamento e as tentativas de retry se comportam corretamente
    customerAgent.on(AgentEvents.TURN_START, ({ depth, session }) => {
        console.log(`[Agente -> Evento] Turno ${depth} iniciado para a sessão ${session.id}`);
    });
    customerAgent.on(AgentEvents.ERROR, ({ error, source }) => {
        console.log(`[Agente -> Evento] Erro capturado (${source || 'core'}): ${error.message}`);
    });
    customerAgent.on(AgentEvents.RETRY, ({ attempt, error }) => {
        console.log(`[Agente -> Evento] Tentando recuperar (tentativa ${attempt}): ${error.message}`);
    });

    const sessionId = `session_${Date.now()}`;
    customerAgent.createSession(sessionId, {
        name: 'Usuário Concorrente',
        phone: '5511999999999',
        email: 'user@test.com'
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 1: Enviar mensagens consecutivas ANTES de disparar (Debounce Puro)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- CASO 1: Debounce de mensagens em sequência rápida ---');
    console.log('[Teste] Disparando 3 chamadas diretas a processMessage com intervalos de 100ms...');
    
    // Dispara 3 mensagens em sequência rápida diretamente no agente
    const p1 = customerAgent.processMessage('Olá!', sessionId);
    await delay(100);
    const p2 = customerAgent.processMessage('Tudo bem?', sessionId);
    await delay(100);
    const p3 = customerAgent.processMessage('Queria saber se vocês atendem aos finais de semana.', sessionId);

    // Aguarda a resolução de todas. As duas primeiras devem ser unificadas na terceira por debounce.
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    console.log('\n--- Resultados CASO 1 ---');
    console.log('Resposta 1 (deve conter a resposta unificada):', r1?.response);
    console.log('Resposta 2 (deve conter a resposta unificada):', r2?.response);
    console.log('Resposta 3 (deve conter a resposta unificada):', r3?.response);

    // Valida histórico da sessão
    const sessionState = customerAgent.getSession(sessionId);
    console.log('\nHistórico atual da sessão após Caso 1 (esperado apenas 1 turno de usuário concatenado e 1 resposta):');
    console.log(JSON.stringify(sessionState.getHistory(), null, 2));

    // ─────────────────────────────────────────────────────────────────────────────
    // CASO 2: Enviar mensagem ENQUANTO a resposta da chamada anterior está sendo gerada
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('\n--- CASO 2: Cancelamento de requisição ativa no LLM ---');
    console.log('[Teste] Enviando uma mensagem direta para processMessage...');

    // Dispara uma mensagem diretamente e deixa o debounce expirar para iniciar o processamento no LLM
    const activePromise = customerAgent.processMessage('Vocês têm cupom de desconto?', sessionId);
    
    // Espera expirar o debounce (1.0s) + 400ms adicionais para garantir que a chamada ao LLM iniciou
    console.log('[Teste] Aguardando o debounce expirar (1000ms) + tempo de inicialização da chamada ao LLM (400ms)...');
    await delay(1400);

    // Agora, envia uma segunda mensagem enquanto o LLM está gerando a resposta
    console.log('[Teste] Enviando segunda mensagem direta com a primeira ainda ativa no LLM...');
    const incomingPromise = customerAgent.processMessage('Ah, e esqueci de perguntar: qual o horário de atendimento?', sessionId);

    // Aguarda ambas resoluções
    const [resPrev, resNew] = await Promise.all([activePromise, incomingPromise]);

    console.log('\n--- Resultados CASO 2 ---');
    console.log('Resposta anterior (deve ser abortada):', resPrev);
    console.log('Resposta nova (concatenada e finalizada):', resNew?.response);

    // Valida o histórico final da sessão
    const finalSessionState = customerAgent.getSession(sessionId);
    console.log('\nHistórico final da sessão após Caso 2:');
    console.log(JSON.stringify(finalSessionState.getHistory(), null, 2));

    console.log('\n=== Simulação Finalizada com Sucesso! ===');
}

runSimulation().catch(console.error);
