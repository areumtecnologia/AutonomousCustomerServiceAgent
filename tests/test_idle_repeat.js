require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const { AutonomousCustomerServiceAgent, AgentEvents, AgentConfig } = require('../src');

async function runTests() {
    console.log("Iniciando testes de inatividade (Idle Timeout)...");

    if (!GOOGLE_GEMINI_API_KEY) {
        console.error("ERRO: GOOGLE_GEMINI_API_KEY não está definido no arquivo .env.");
        process.exit(1);
    }

    const customerAgent = new AutonomousCustomerServiceAgent({
        apiKey: GOOGLE_GEMINI_API_KEY,
        model: ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'],
        agent: new AgentConfig(
            'Lumina',
            'Áreum Tecnologia',
            'Somos uma empresa de tecnologia especializada em soluções de Inteligência Artificial e Automação.',
            'Sua missão é atuar como assistente de testes de inatividade',
            'Seja amigável e breve.',
            'pt-BR'
        )
    });

    let errors = [];

    // --- TESTE 1: idleTimeout nulo ou 0 (Recurso Desativado) ---
    console.log("\n--- TESTE 1: idleTimeout nulo ou 0 (Recurso Desativado) ---");
    let test1IdleDispatched = false;

    const listener1 = ({ session }) => {
        console.log(`[Teste 1] Evento SESSION_IDLE_TIMEOUT disparado incorretamente para sessão: ${session.id}`);
        test1IdleDispatched = true;
    };
    customerAgent.on(AgentEvents.SESSION_IDLE_TIMEOUT, listener1);

    // Criamos com idleTimeout = 0
    const session1 = customerAgent.createSession("session-test-disabled-1", {
        name: 'Cliente Teste 1',
        phone: '5591999999991'
    }, {
        idleTimeout: 0
    });

    console.log("[Teste 1] Enviando primeira mensagem...");
    await customerAgent.processMessage(session1.id, "Olá! Este é um teste com inatividade desativada.");

    console.log("[Teste 1] Aguardando 4 segundos para certificar que nada dispara...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    customerAgent.off(AgentEvents.SESSION_IDLE_TIMEOUT, listener1);
    customerAgent.clearSession(session1.id);

    if (test1IdleDispatched) {
        errors.push("Falha: Evento SESSION_IDLE_TIMEOUT disparou mesmo com idleTimeout = 0");
    } else {
        console.log("Sucesso: Recurso de inatividade permaneceu desativado com idleTimeout = 0");
    }

    // Criamos com idleTimeout = null
    console.log("\n--- TESTE 1.2: idleTimeout = null (Recurso Desativado) ---");
    let test12IdleDispatched = false;

    const listener12 = ({ session }) => {
        console.log(`[Teste 1.2] Evento SESSION_IDLE_TIMEOUT disparado incorretamente para sessão: ${session.id}`);
        test12IdleDispatched = true;
    };
    customerAgent.on(AgentEvents.SESSION_IDLE_TIMEOUT, listener12);

    const session12 = customerAgent.createSession("session-test-disabled-2", {
        name: 'Cliente Teste 1.2',
        phone: '5591999999992'
    }, {
        idleTimeout: null
    });

    console.log("[Teste 1.2] Enviando primeira mensagem...");
    await customerAgent.processMessage(session12.id, "Olá! Este é um teste com inatividade null.");

    console.log("[Teste 1.2] Aguardando 4 segundos para certificar que nada dispara...");
    await new Promise(resolve => setTimeout(resolve, 4000));

    customerAgent.off(AgentEvents.SESSION_IDLE_TIMEOUT, listener12);
    customerAgent.clearSession(session12.id);

    if (test12IdleDispatched) {
        errors.push("Falha: Evento SESSION_IDLE_TIMEOUT disparou mesmo com idleTimeout = null");
    } else {
        console.log("Sucesso: Recurso de inatividade permaneceu desativado com idleTimeout = null");
    }

    // --- TESTE 2: idleRepeat = true (Repetição Periódica) ---
    console.log("\n--- TESTE 2: idleRepeat = true (Repetição Periódica) ---");
    let idleTimeoutCount = 0;
    let responsesAfterIdle = [];

    const listenerIdle = ({ session }) => {
        idleTimeoutCount++;
        console.log(`[Teste 2] [Inatividade] Evento SESSION_IDLE_TIMEOUT disparado (${idleTimeoutCount}ª vez) para sessão: ${session.id}`);
    };

    const listenerResponse = ({ response, session }) => {
        if (idleTimeoutCount > 0) {
            console.log(`[Teste 2] [Agente] Resposta automática recebida: "${response}"`);
            responsesAfterIdle.push(response);
        }
    };

    customerAgent.on(AgentEvents.SESSION_IDLE_TIMEOUT, listenerIdle);
    customerAgent.on(AgentEvents.RESPONSE, listenerResponse);

    // Criamos com idleTimeout de 3 segundos (3000 ms) e idleRepeat = true
    const session2 = customerAgent.createSession("session-test-repeat-1", {
        name: 'Cliente Teste 2',
        phone: '5591999999993'
    }, {
        idleTimeout: 3000,
        idleRepeat: true
    });

    console.log("[Teste 2] Enviando primeira mensagem...");
    await customerAgent.processMessage(session2.id, "Olá! Preciso de suporte.");

    console.log("[Teste 2] Aguardando silêncio de 10 segundos para observar se o timeout se repete...");
    // A cada 3 segundos inativo + tempo de resposta do LLM, o evento deve disparar
    // Esperamos 10 segundos para dar tempo de ocorrer pelo menos 2 disparos de inatividade
    await new Promise(resolve => setTimeout(resolve, 10000));

    customerAgent.off(AgentEvents.SESSION_IDLE_TIMEOUT, listenerIdle);
    customerAgent.off(AgentEvents.RESPONSE, listenerResponse);
    customerAgent.clearSession(session2.id);

    console.log(`\nDisparos de inatividade registrados: ${idleTimeoutCount}`);
    console.log(`Respostas automáticas geradas: ${responsesAfterIdle.length}`);

    if (idleTimeoutCount < 2) {
        errors.push(`Falha: Esperava-se pelo menos 2 disparos de inatividade (ocorreram ${idleTimeoutCount})`);
    } else if (responsesAfterIdle.length < 2) {
        errors.push(`Falha: Esperava-se pelo menos 2 respostas automáticas do agente (ocorreram ${responsesAfterIdle.length})`);
    } else {
        console.log("Sucesso: Evento de inatividade se repetiu periodicamente conforme configurado!");
    }

    // --- RELATÓRIO FINAL ---
    console.log("\n--- RESULTADO GERAL DOS TESTES ---");
    if (errors.length > 0) {
        console.error("ERRO: Um ou mais testes falharam:");
        errors.forEach(err => console.error(` - ${err}`));
        process.exit(1);
    } else {
        console.log("SUCESSO: Todos os testes de inatividade e repetição passaram perfeitamente!");
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error("Erro inesperado durante a execução dos testes:", err);
    process.exit(1);
});
