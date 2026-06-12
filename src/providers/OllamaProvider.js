'use strict';

const { BaseProvider } = require('./BaseProvider');

// ─────────────────────────────────────────────────────────────────────────────
// OllamaProvider — provedor para modelos locais via Ollama
//
// O Ollama expõe nativamente a API em /api/chat. Esta classe implementa
// a integração direta com a API nativa do Ollama.
// ─────────────────────────────────────────────────────────────────────────────

class OllamaProvider extends BaseProvider {
    #baseURL;
    #apiKey;

    /**
     * @param {object} options
     * @param {string} options.model    Nome do modelo local (ex: 'gemma4:e4b')
     * @param {string} [options.baseURL='http://localhost:11434']  URL base do Ollama
     * @param {string} [options.apiKey] Chave de API opcional (para proxies)
     */
    constructor({ model, baseURL = 'http://localhost:11434', apiKey } = {}) {
        super({ model });
        this.#baseURL = baseURL.replace(/\/+$/, ''); // remove trailing slash
        this.#apiKey = apiKey;
    }

    getName() {
        return 'ollama';
    }

    /**
     * Gera conteúdo a partir do modelo de IA usando a API nativa do Ollama.
     *
     * @param {object} params
     * @param {object[]} params.contents       Histórico de mensagens no formato estruturado (padrão Gemini)
     * @param {string}   params.systemInstruction  Instrução do sistema (system prompt)
     * @param {object[]} params.tools          Lista de declarações de ferramentas ({ declaration, handler })
     * @param {object}   params.config         Configurações de inferência
     * @param {AbortSignal} [params.signal]    Signal para cancelamento/timeout
     * @returns {Promise<import('./BaseProvider').ProviderResponse>} Resposta padronizada
     */
    async generateContent({ contents, systemInstruction, tools, config, signal }) {
        const messages = this.#translateContentsToMessages(contents, systemInstruction);
        const ollamaTools = this.#translateToolDeclarations(tools);

        // O endpoint nativo do Ollama é /api/chat
        // Se a baseURL informada terminar em /v1, ajustamos para a raiz do Ollama
        const cleanBase = this.#baseURL.endsWith('/v1') ? this.#baseURL.slice(0, -3) : this.#baseURL;
        const url = `${cleanBase}/api/chat`;

        const body = {
            model: this.model,
            messages,
            stream: false,
        };

        // Configuração de opções (parâmetros de inferência)
        const options = {};
        if (config.temperature !== undefined) {
            options.temperature = config.temperature;
        }
        if (config.topP !== undefined) {
            options.top_p = config.topP;
        }
        if (config.maxOutputTokens !== undefined) {
            options.num_predict = config.maxOutputTokens;
        }
        if (Object.keys(options).length > 0) {
            body.options = options;
        }

        if (ollamaTools.length > 0) {
            body.tools = ollamaTools;
        }

        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.#apiKey) {
            headers['Authorization'] = `Bearer ${this.#apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            const err = new Error(`[OllamaProvider] API error ${response.status} ${response.statusText}: ${errorBody}`);
            err.status = response.status;
            throw err;
        }

        const data = await response.json();
        return this.#translateResponseToProvider(data);
    }

    // ── Tradução de Histórico (Gemini → Ollama) ────────────────────────────────

    /**
     * Converte o histórico de contents para o formato do Ollama /api/chat.
     * @param {object[]} contents
     * @param {string}   systemInstruction
     * @returns {object[]}
     */
    #translateContentsToMessages(contents, systemInstruction) {
        const messages = [];

        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        for (const turn of contents) {
            if (turn.role === 'user') {
                messages.push(this.#translateUserTurn(turn));
            } else if (turn.role === 'model') {
                messages.push(this.#translateModelTurn(turn));
            } else if (turn.role === 'tool') {
                messages.push(...this.#translateToolTurn(turn));
            }
        }

        return messages;
    }

    /**
     * Traduz o turno do usuário extraindo textos, imagens e áudios.
     * @param {object} turn
     * @returns {object}
     */
    #translateUserTurn(turn) {
        const textParts = [];
        const images = [];
        const audio = [];

        for (const part of turn.parts) {
            if (part.text) {
                textParts.push(part.text);
            } else if (part.inlineData) {
                const { mimeType, data } = part.inlineData;
                const rawData = this.#getRawBase64(data);
                if (mimeType.startsWith('image/')) {
                    images.push(rawData);
                } else if (mimeType.startsWith('audio/')) {
                    audio.push(rawData);
                }
            }
        }

        const msg = {
            role: 'user',
            content: textParts.join('\n')
        };

        if (images.length > 0) {
            msg.images = images;
        }

        if (audio.length > 0) {
            msg.audio = audio;
        }

        return msg;
    }

    /**
     * Traduz o turno do assistente/modelo incluindo chamadas de tool.
     * @param {object} turn
     * @returns {object}
     */
    #translateModelTurn(turn) {
        const assistantMsg = { role: 'assistant', content: '' };

        // Texto de resposta (ignora pensamentos)
        const textParts = turn.parts.filter(p => p.text && !p.thought);
        if (textParts.length > 0) {
            assistantMsg.content = textParts.map(p => p.text).join('\n');
        }

        // Chamadas de função
        const functionCallParts = turn.parts.filter(p => p.functionCall);
        if (functionCallParts.length > 0) {
            assistantMsg.tool_calls = functionCallParts.map(p => ({
                function: {
                    name: p.functionCall.name,
                    arguments: p.functionCall.args ?? {},
                },
            }));
        }

        return assistantMsg;
    }

    /**
     * Traduz o turno de retorno de ferramentas.
     * Cada functionResponse se torna uma mensagem separada com role: 'tool' no Ollama.
     * @param {object} turn
     * @returns {object[]}
     */
    #translateToolTurn(turn) {
        const toolMessages = [];

        turn.parts.forEach(part => {
            if (part.functionResponse) {
                const fnResponse = part.functionResponse;
                const content = typeof fnResponse.response?.result === 'string'
                    ? fnResponse.response.result
                    : JSON.stringify(fnResponse.response?.result ?? {});

                toolMessages.push({
                    role: 'tool',
                    tool_name: fnResponse.name,
                    content,
                });
            }
        });

        return toolMessages;
    }

    // ── Tradução de Tools (Gemini → Ollama) ────────────────────────────────────

    /**
     * Converte declarações de tools para o formato do Ollama (JSON Schema).
     * @param {object[]} tools  Array de { declaration, handler }
     * @returns {object[]}
     */
    #translateToolDeclarations(tools) {
        if (!tools || tools.length === 0) return [];

        return tools.map(t => {
            const decl = t.declaration || t;
            const parameters = this.#convertTypesToLowerCase(
                JSON.parse(JSON.stringify(decl.parameters || { type: 'object', properties: {} }))
            );

            return {
                type: 'function',
                function: {
                    name: decl.name,
                    description: decl.description,
                    parameters,
                },
            };
        });
    }

    // ── Tradução de Resposta (Ollama → Gemini) ─────────────────────────────────

    /**
     * Converte a resposta da API Ollama para o formato padronizado (ProviderResponse).
     * @param {object} data  Resposta bruta da API Ollama
     * @returns {import('./BaseProvider').ProviderResponse}
     */
    #translateResponseToProvider(data) {
        const message = data.message;
        if (!message) {
            throw new Error('[OllamaProvider] API returned no message in response.');
        }

        const parts = [];

        if (message.content) {
            parts.push({ text: message.content });
        }

        if (message.thinking) {
            parts.push({ thought: message.thinking });
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const tc of message.tool_calls) {
                let args = tc.function.arguments;
                if (typeof args === 'string') {
                    args = this.#safeParseJSON(args);
                }
                parts.push({
                    functionCall: {
                        name: tc.function.name,
                        args: args ?? {},
                    },
                });
            }
        }

        const promptTokens = data.prompt_eval_count ?? 0;
        const completionTokens = data.eval_count ?? 0;

        return {
            candidates: [{
                content: {
                    role: 'model',
                    parts,
                },
            }],
            usageMetadata: {
                promptTokenCount: promptTokens,
                candidatesTokenCount: completionTokens,
                totalTokenCount: promptTokens + completionTokens,
            },
        };
    }

    // ── Utilitários ──────────────────────────────────────────────────────────

    /**
     * Converte recursivamente os valores de `type` para lowercase.
     * @param {object} obj
     * @returns {object}
     */
    #convertTypesToLowerCase(obj) {
        if (!obj || typeof obj !== 'object') return obj;

        if (typeof obj.type === 'string') {
            obj.type = obj.type.toLowerCase();
        }
        if (obj.properties) {
            for (const key of Object.keys(obj.properties)) {
                this.#convertTypesToLowerCase(obj.properties[key]);
            }
        }
        if (obj.items) {
            this.#convertTypesToLowerCase(obj.items);
        }
        return obj;
    }

    /**
     * Extrai apenas a string base64 se houver prefixo data URI.
     * @param {string} data
     * @returns {string}
     */
    #getRawBase64(data) {
        if (typeof data !== 'string') return '';
        const match = data.match(/^data:[^;]+;base64,(.+)$/);
        return match ? match[1] : data;
    }

    /**
     * Parse seguro de JSON.
     * @param {string} str
     * @returns {object}
     */
    #safeParseJSON(str) {
        try {
            return JSON.parse(str || '{}');
        } catch {
            return { _raw: str };
        }
    }
}

module.exports = { OllamaProvider };
