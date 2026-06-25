'use strict';

require('dotenv').config();
const assert = require('assert');
const { AutonomousCustomerServiceAgent, AgentConfig, NvidiaProvider } = require('../src');

async function runMockTest() {
    console.log('=== Executando Teste Mockado para NvidiaProvider ===');

    // Salva o fetch original
    const originalFetch = global.fetch;

    // Mock simples de fetch
    global.fetch = async (url, options) => {
        assert.strictEqual(url, 'https://integrate.api.nvidia.com/v1/chat/completions');
        assert.strictEqual(options.method, 'POST');
        assert.strictEqual(options.headers['Authorization'], 'Bearer mock-nvidia-key');
        
        const body = JSON.parse(options.body);
        assert.strictEqual(body.model, 'minimaxai/minimax-m3');
        assert.strictEqual(body.temperature, 0.7);
        assert.strictEqual(body.max_tokens, 100);
        
        // Verifica se a estrutura de mensagens contém o system prompt
        assert.strictEqual(body.messages[0].role, 'system');
        assert.strictEqual(body.messages[0].content.includes('Você é um assistente virtual'), true);

        // Mensagem do usuário
        assert.strictEqual(body.messages[1].role, 'user');
        assert.strictEqual(body.messages[1].content.includes('Qual o sentido da vida?'), true);

        // Retorna resposta mockada com sucesso
        return {
            ok: true,
            json: async () => ({
                id: 'chatcmpl-mock-id',
                object: 'chat.completion',
                created: Date.now(),
                model: 'minimaxai/minimax-m3',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'O sentido da vida é aprender e evoluir.'
                        },
                        finish_reason: 'stop'
                    }
                ],
                usage: {
                    prompt_tokens: 15,
                    completion_tokens: 10,
                    total_tokens: 25
                }
            })
        };
    };

    try {
        const agent = new AutonomousCustomerServiceAgent({
            apiKey: 'mock-nvidia-key',
            provider: {
                type: 'nvidia',
                model: 'minimaxai/minimax-m3'
            },
            temperature: 0.7,
            maxOutputTokens: 100,
            agent: new AgentConfig(
                'TestBot',
                'Empresa Teste',
                'Detalhes da Empresa',
                'Ajudar o usuário.',
                'Você é um assistente virtual amigável.',
                'pt-BR'
            )
        });

        const session = agent.createSession('session-nvidia-mock', {
            name: 'Renan',
            phone: '5591981648646',
            email: 'renan@exemplo.com'
        });

        const response = await agent.processMessage(session.id, 'Qual o sentido da vida?');
        
        console.log('Resposta Recebida:', response);
        assert.strictEqual(response.response, 'O sentido da vida é aprender e evoluir.');
        console.log('✔ Teste mockado concluído com sucesso!\n');
    } finally {
        // Restaura o fetch original
        global.fetch = originalFetch;
    }
}

async function runRealTest() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.log('NVIDIA_API_KEY não definida no .env. Pulando teste real com a API da Nvidia.');
        return;
    }

    console.log('=== Executando Teste Real com API da Nvidia ===');
    const agent = new AutonomousCustomerServiceAgent({
        apiKey: apiKey,
        provider: new NvidiaProvider({
            apiKey: apiKey,
            model: 'minimaxai/minimax-m3' // Modelo minimaxm3 conforme exemplo
        }),
        temperature: 0.7,
        maxOutputTokens: 150,
        agent: new AgentConfig(
            'TestBotReal',
            'Empresa Real',
            'Detalhes Reais',
            'Responder perguntas gerais de forma muito curta e objetiva.',
            'Seja super direto e responda em poucas palavras.',
            'pt-BR'
        )
    });

    const session = agent.createSession('session-nvidia-real', {
        name: 'Renan',
        phone: '5591981648646',
        email: 'renan@exemplo.com'
    });

    try {
        const response = await agent.processMessage(session.id, 'Responda apenas com a palavra: OK');
        console.log('Resposta Real Recebida:', response);
        assert.strictEqual(response.response.toUpperCase().includes('OK'), true);
        console.log('✔ Teste real concluído com sucesso!\n');
    } catch (err) {
        console.error('❌ Erro no teste real com a API da Nvidia:', err);
    }
}

async function main() {
    try {
        await runMockTest();
        await runRealTest();
    } catch (err) {
        console.error('❌ Testes falharam:', err);
        process.exit(1);
    }
}

main();
