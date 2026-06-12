require('dotenv').config();

const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const {
    AutonomousCustomerServiceAgent,
    AgentConfig,
    GoogleProvider,
    OpenAIProvider,
    AnthropicProvider,
    OllamaProvider
} = require('../src');

// Imagem PNG de 1x1 pixel vermelha válida em base64
const RED_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function testGoogleReal() {
    console.log('--- 1. Testando chamada real com Gemini (GoogleProvider) ---');
    if (!GOOGLE_GEMINI_API_KEY) {
        console.log('Ignorando teste real do Google pois GOOGLE_GEMINI_API_KEY não está definida.');
        return;
    }

    const agent = new AutonomousCustomerServiceAgent({
        apiKey: GOOGLE_GEMINI_API_KEY,
        model: 'gemini-2.5-flash', // Modelo multimodal adequado
        thinkingLevel: 'OFF',      // Desativa o pensamento para evitar erro de compatibilidade
        retryOptions: { maxAttempts: 1 }, // Evita loops demorados no teste
        retryScheduleMinutes: 0.05,       // Se falhar, retenta rápido
        agent: new AgentConfig(
            'AtendenteMultimodal',
            'Empresa de Teste',
            'Teste multimodal.',
            'Sua missão é responder de que cor é a imagem.',
            'Seja curto e direto e responda a cor em português.',
            'pt-BR'
        )
    });

    const sessionId = `session_multi_${Date.now()}`;
    agent.createSession(sessionId, { name: 'Cliente Multi', phone: '5511999999999', email: 'multi@test.com' });

    try {
        console.log('[Teste] Enviando imagem e texto usando a nova assinatura...');
        const res = await agent.processMessage(
            sessionId,
            'De que cor é esta imagem?',
            { base64: RED_PNG_BASE64, mimetype: 'image/png' }
        );
        console.log('Resposta do Agente:', res.response);
    } catch (error) {
        console.error('Erro no teste real do Google:', error);
    }
}

async function testProviderTranslations() {
    console.log('\n--- 2. Validando tradução de formatos nos outros Providers ---');

    // Turno do usuário simulado contendo a imagem base64
    const contents = [
        {
            role: 'user',
            parts: [
                {
                    inlineData: {
                        data: RED_PNG_BASE64,
                        mimeType: 'image/png'
                    }
                },
                {
                    text: 'O que é isso?'
                }
            ]
        }
    ];

    // Mock do fetch global para interceptar o body enviado para as APIs
    const originalFetch = globalThis.fetch;
    let lastRequestBody = null;

    globalThis.fetch = async (url, options) => {
        lastRequestBody = JSON.parse(options.body || '{}');
        // Retorna uma resposta mockada de sucesso para evitar erro na requisição
        return {
            ok: true,
            status: 200,
            json: async () => {
                if (url.includes('anthropic.com')) {
                    return {
                        content: [{ type: 'text', text: 'Mock Anthropic Response' }],
                        usage: { input_tokens: 10, output_tokens: 5 }
                    };
                }
                if (url.includes('/api/chat')) {
                    return {
                        model: 'gemma4:e4b',
                        message: { role: 'assistant', content: 'Mock Ollama Response' },
                        done: true,
                        prompt_eval_count: 8,
                        eval_count: 4
                    };
                }
                return {
                    choices: [{ message: { content: 'Mock OpenAI Response' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
                };
            }
        };
    };

    try {
        // A. Validando OpenAI / Ollama
        console.log('\n[OpenAI/Ollama] Traduzindo turno multimodal...');
        const openAI = new OpenAIProvider({ apiKey: 'mock-key', model: 'gpt-4o' });
        await openAI.generateContent({
            contents,
            systemInstruction: 'System test',
            tools: [],
            config: { temperature: 0.7, maxOutputTokens: 100 }
        });

        console.log('Mensagens enviadas para OpenAI no body da requisição:');
        console.log(JSON.stringify(lastRequestBody.messages, null, 2));

        // Validação básica do formato
        const userMsg = lastRequestBody.messages.find(m => m.role === 'user');
        if (userMsg && Array.isArray(userMsg.content)) {
            console.log('✓ OpenAI traduzido com sucesso para formato array/multimodal!');
        } else {
            console.error('✗ Erro: OpenAI não traduziu para formato de array!');
        }

        // B. Validando Anthropic
        console.log('\n[Anthropic] Traduzindo turno multimodal...');
        const anthropic = new AnthropicProvider({ apiKey: 'mock-key', model: 'claude-3-5-sonnet-20241022' });
        await anthropic.generateContent({
            contents,
            systemInstruction: 'System test',
            tools: [],
            config: { temperature: 0.7, maxOutputTokens: 100 }
        });

        console.log('Mensagens enviadas para Anthropic no body da requisição:');
        console.log(JSON.stringify(lastRequestBody.messages, null, 2));

        const anthropicUserMsg = lastRequestBody.messages.find(m => m.role === 'user');
        if (anthropicUserMsg && Array.isArray(anthropicUserMsg.content)) {
            const hasImageSource = anthropicUserMsg.content.some(c => c.type === 'image' && c.source?.type === 'base64');
            if (hasImageSource) {
                console.log('✓ Anthropic traduzido com sucesso para formato image/base64!');
            } else {
                console.error('✗ Erro: Anthropic não incluiu a estrutura da imagem base64!');
            }
        } else {
            console.error('✗ Erro: Anthropic não traduziu para formato de array!');
        }

        // C. Validando Ollama
        console.log('\n[Ollama] Traduzindo turno multimodal (imagem e áudio)...');
        const contentsWithAudio = [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: RED_PNG_BASE64,
                            mimeType: 'image/png'
                        }
                    },
                    {
                        inlineData: {
                            data: 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==',
                            mimeType: 'audio/wav'
                        }
                    },
                    {
                        text: 'Transcreva e descreva a imagem'
                    }
                ]
            }
        ];
        const ollama = new OllamaProvider({ model: 'gemma4:e4b' });
        await ollama.generateContent({
            contents: contentsWithAudio,
            systemInstruction: 'System test',
            tools: [],
            config: { temperature: 0.7, maxOutputTokens: 100 }
        });

        console.log('Mensagens enviadas para Ollama no body da requisição:');
        console.log(JSON.stringify(lastRequestBody.messages, null, 2));

        const ollamaUserMsg = lastRequestBody.messages.find(m => m.role === 'user');
        if (
            ollamaUserMsg &&
            Array.isArray(ollamaUserMsg.images) &&
            ollamaUserMsg.images[0] === RED_PNG_BASE64 &&
            Array.isArray(ollamaUserMsg.audio) &&
            ollamaUserMsg.audio[0] === 'UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='
        ) {
            console.log('✓ Ollama traduzido com sucesso para formato nativo com arrays "images" e "audio" de base64!');
        } else {
            console.error('✗ Erro: Ollama não traduziu corretamente para o formato nativo com arrays "images" e "audio"!');
        }

    } catch (error) {
        console.error('Erro na validação de traduções:', error);
    } finally {
        // Restaura o fetch global original
        globalThis.fetch = originalFetch;
    }
}

async function run() {
    await testGoogleReal();
    await testProviderTranslations();
}

run();
