'use strict';

const { BaseProvider } = require('./BaseProvider');

// ─────────────────────────────────────────────────────────────────────────────
// OpenAIProvider — implementação para a API Chat Completions da OpenAI
// Também compatível com APIs que seguem o padrão OpenAI (Qwen, Together, etc.)
// Usa fetch nativo do Node.js (>= 18) para evitar dependências externas.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

class OpenAIProvider extends BaseProvider {
    #apiKey;
    #baseURL;

    /**
     * @param {object} options
     * @param {string} options.apiKey   Chave de API
     * @param {string} options.model    Nome do modelo (ex: 'gpt-4o', 'gpt-4o-mini')
     * @param {string} [options.baseURL='https://api.openai.com/v1']  URL base da API
     */
    constructor({ apiKey, model, baseURL = DEFAULT_BASE_URL } = {}) {
        super({ model });
        if (!apiKey) throw new TypeError('[OpenAIProvider] apiKey is required.');
        this.#apiKey = apiKey;
        this.#baseURL = baseURL.replace(/\/+$/, ''); // remove trailing slash
    }

    getName() {
        return 'openai';
    }

    /**
     * @param {object} params
     * @param {object[]} params.contents
     * @param {string}   params.systemInstruction
     * @param {object[]} params.tools
     * @param {object}   params.config
     * @param {AbortSignal} [params.signal]
     * @returns {Promise<import('./BaseProvider').ProviderResponse>}
     */
    async generateContent({ contents, systemInstruction, tools, config, signal }) {
        const messages = this.#translateContentsToMessages(contents, systemInstruction);
        const openAITools = this.#translateToolDeclarations(tools);

        const body = {
            model: this.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxOutputTokens,
            top_p: config.topP,
        };

        if (openAITools.length > 0) {
            body.tools = openAITools;
        }

        const response = await fetch(`${this.#baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.#apiKey}`,
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            const err = new Error(`[OpenAIProvider] API error ${response.status} ${response.statusText}: ${errorBody}`);
            err.status = response.status;
            throw err;
        }

        const data = await response.json();
        return this.#translateResponseToProvider(data);
    }

    // ── Tradução: Histórico (Gemini → OpenAI) ────────────────────────────────

    /**
     * Converte o histórico de contents (formato Gemini) para o formato messages da OpenAI.
     * @param {object[]} contents
     * @param {string}   systemInstruction
     * @returns {object[]}
     */
    #translateContentsToMessages(contents, systemInstruction) {
        const messages = [];

        if (systemInstruction) {
            messages.push({ role: 'system', content: systemInstruction });
        }

        for (let i = 0; i < contents.length; i++) {
            const turn = contents[i];

            if (turn.role === 'user') {
                messages.push(...this.#translateUserTurn(turn));
            } else if (turn.role === 'model') {
                const toolCallIds = this.#translateModelTurn(turn, messages);
                // Verifica se o próximo turno é tool e associa os IDs
                if (toolCallIds.length > 0 && i + 1 < contents.length && contents[i + 1].role === 'tool') {
                    contents[i + 1]._openAIToolCallIds = toolCallIds;
                }
            } else if (turn.role === 'tool') {
                this.#translateToolTurn(turn, messages);
            }
        }

        return messages;
    }

    /**
     * @param {object} turn
     * @returns {object[]}
     */
    #translateUserTurn(turn) {
        const text = turn.parts.filter(p => p.text).map(p => p.text).join('\n');
        return [{ role: 'user', content: text }];
    }

    /**
     * @param {object} turn
     * @param {object[]} messages
     * @returns {string[]}  IDs gerados para tool_calls (para correlacionar com o turno tool seguinte)
     */
    #translateModelTurn(turn, messages) {
        const assistantMsg = { role: 'assistant' };
        const toolCallIds = [];

        // Texto de resposta (ignora thoughts)
        const textParts = turn.parts.filter(p => p.text && !p.thought);
        if (textParts.length > 0) {
            assistantMsg.content = textParts.map(p => p.text).join('\n');
        }

        // Chamadas de função
        const functionCallParts = turn.parts.filter(p => p.functionCall);
        if (functionCallParts.length > 0) {
            assistantMsg.tool_calls = functionCallParts.map((p, idx) => {
                const id = `call_${p.functionCall.name}_${idx}`;
                toolCallIds.push(id);
                return {
                    id,
                    type: 'function',
                    function: {
                        name: p.functionCall.name,
                        arguments: JSON.stringify(p.functionCall.args ?? {}),
                    },
                };
            });
        }

        messages.push(assistantMsg);
        return toolCallIds;
    }

    /**
     * @param {object} turn
     * @param {object[]} messages
     */
    #translateToolTurn(turn, messages) {
        const toolCallIds = turn._openAIToolCallIds || [];

        turn.parts.forEach((part, index) => {
            const fnResponse = part.functionResponse;
            const toolCallId = toolCallIds[index] || `call_${fnResponse.name}_${index}`;
            const content = typeof fnResponse.response?.result === 'string'
                ? fnResponse.response.result
                : JSON.stringify(fnResponse.response?.result ?? {});

            messages.push({
                role: 'tool',
                tool_call_id: toolCallId,
                content,
            });
        });
    }

    // ── Tradução: Tools (Gemini → OpenAI) ────────────────────────────────────

    /**
     * Converte declarações de tools do formato Gemini/neutro para o formato OpenAI.
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

    // ── Tradução: Resposta (OpenAI → Gemini) ─────────────────────────────────

    /**
     * Converte a resposta da API OpenAI para o formato padronizado (ProviderResponse).
     * @param {object} data  Resposta bruta da API OpenAI
     * @returns {import('./BaseProvider').ProviderResponse}
     */
    #translateResponseToProvider(data) {
        const choice = data.choices?.[0];
        if (!choice) {
            throw new Error('[OpenAIProvider] API returned no choices.');
        }

        const message = choice.message;
        const parts = [];

        if (message.content) {
            parts.push({ text: message.content });
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
            for (const tc of message.tool_calls) {
                parts.push({
                    functionCall: {
                        name: tc.function.name,
                        args: this.#safeParseJSON(tc.function.arguments),
                    },
                });
            }
        }

        return {
            candidates: [{
                content: {
                    role: 'model',
                    parts,
                },
            }],
            usageMetadata: {
                promptTokenCount: data.usage?.prompt_tokens ?? 0,
                candidatesTokenCount: data.usage?.completion_tokens ?? 0,
                totalTokenCount: data.usage?.total_tokens ?? 0,
            },
        };
    }

    // ── Utilitários ──────────────────────────────────────────────────────────

    /**
     * Converte recursivamente os valores de `type` para lowercase (Gemini usa 'STRING', OpenAI usa 'string').
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
     * Parse seguro de JSON com fallback para evitar crash em argumentos malformados.
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

module.exports = { OpenAIProvider };
