require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const { AutonomousCustomerServiceAgent, AgentEvents, AgentConfig } = require('../src');

async function testIdleTimeout() {
    console.log("Iniciando teste de Idle Timeout...");

    if (!GOOGLE_GEMINI_API_KEY) {
        console.error("ERRO: GOOGLE_GEMINI_API_KEY não está definido no arquivo .env.");
        process.exit(1);
    }

    const customerAgent = new AutonomousCustomerServiceAgent({
        apiKey: GOOGLE_GEMINI_API_KEY,
        model: ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'], // Usando um modelo disponível padrão
        agent: new AgentConfig(
            'Lumina',
            'Áreum Tecnologia',
            'Somos uma empresa de tecnologia especializada em soluções de Inteligência Artificial e Automação.',
            'Sua missão é atuar como assistente de testes de inatividade',
            'Seja amigável e breve.',
            'pt-BR'
        )
    });

    let idleEventDispatched = false;
    let responseEventDispatched = false;
    let idleResponseText = "";

    customerAgent.on(AgentEvents.SESSION_CREATED, ({ session }) => {
        console.log(`[Sessão] Criada: ${session.id}`);
    });

    customerAgent.on(AgentEvents.SESSION_IDLE_TIMEOUT, ({ session }) => {
        console.log(`[Sessão] Ociosa detectada: ${session.id}. Aguardando o agente processar o follow-up...`);
        idleEventDispatched = true;
    });

    customerAgent.on(AgentEvents.RESPONSE, ({ response, reasoning, session }) => {
        console.log(`[Agente] Resposta recebida: "${response}"`);
        if (idleEventDispatched) {
            responseEventDispatched = true;
            idleResponseText = response;
        }
    });

    customerAgent.on(AgentEvents.ERROR, ({ error, source }) => {
        console.error(`[Erro] Fonte: ${source || 'desconhecida'} - ${error.message}`);
    });

    // Criamos a sessão com idleTimeout de 3 segundos (3000 ms)
    const session = customerAgent.createSession("session-test-idle-123", {
        name: 'Cliente Teste',
        phone: '5591999999999'
    }, {
        idleTimeout: 3000
    });

    console.log("Enviando primeira mensagem...");
    await customerAgent.processMessage(session.id, "Olá! Preciso de ajuda com meu plano de internet.");

    console.log("Mensagem processada. Agora vamos aguardar o silêncio do usuário disparar o Idle Timeout (3 segundos)...");

    // Aguardamos 5 segundos para dar tempo do idle timeout disparar (3s) e o modelo responder
    await new Promise((resolve) => setTimeout(resolve, 6000));

    // Verificações
    console.log("\n--- RESULTADOS DO TESTE ---");
    console.log(`Evento SESSION_IDLE_TIMEOUT disparado: ${idleEventDispatched ? "SIM (PASSOU)" : "NÃO (FALHOU)"}`);
    console.log(`Resposta do agente gerada após ociosidade: ${responseEventDispatched ? "SIM (PASSOU)" : "NÃO (FALHOU)"}`);
    if (responseEventDispatched) {
        console.log(`Mensagem de lembrete gerada: "${idleResponseText}"`);
    }

    if (idleEventDispatched && responseEventDispatched) {
        console.log("\nSUCESSO: O teste de Idle Timeout passou perfeitamente!");
        customerAgent.clearSession(session.id);
        process.exit(0);
    } else {
        console.log("\nFALHA: Um ou mais comportamentos esperados não ocorreram.");
        customerAgent.clearSession(session.id);
        process.exit(1);
    }
}

testIdleTimeout().catch(err => {
    console.error("Erro durante a execução do teste:", err);
    process.exit(1);
});
