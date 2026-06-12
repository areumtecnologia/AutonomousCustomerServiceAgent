'use strict';

const { BaseProvider } = require('./BaseProvider');

// ─────────────────────────────────────────────────────────────────────────────
// AnthropicProvider — implementação para a API Messages da Anthropic (Claude)
// Usa fetch nativo do Node.js (>= 18) para evitar dependências externas.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

class AnthropicProvider extends BaseProvider {
    #apiKey;
    #baseURL;
    #anthropicVersion;

    /**
     * @param {object} options
     * @param {string} options.apiKey             Chave de API da Anthropic
     * @param {string} [options.model='claude-sonnet-4-20250514']  Nome do modelo
     * @param {string} [options.baseURL]          URL base da API
     * @param {string} [options.anthropicVersion] Versão da API Anthropic
     */
    constructor({
        apiKey,
        model = 'claude-sonnet-4-20250514',
        baseURL = DEFAULT_BASE_URL,
        anthropicVersion = DEFAULT_ANTHROPIC_VERSION,
    } = {}) {
        super({ model });
        if (!apiKey) throw new TypeError('[AnthropicProvider] apiKey is required.');
        this.#apiKey = apiKey;
        this.#baseURL = baseURL.replace(/\/+$/, '');
        this.#anthropicVersion = anthropicVersion;
    }

    getName() {
        return 'anthropic';
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
        const messages = this.#translateContentsToMessages(contents);
        const anthropicTools = this.#translateToolDeclarations(tools);

        const body = {
            model: this.model,
            messages,
            max_tokens: config.maxOutputTokens || 4096,
            temperature: config.temperature,
            top_p: config.topP,
        };

        if (systemInstruction) {
            body.system = systemInstruction;
        }

        if (anthropicTools.length > 0) {
            body.tools = anthropicTools;
        }

        const response = await fetch(`${this.#baseURL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.#apiKey,
                'anthropic-version': this.#anthropicVersion,
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            const err = new Error(`[AnthropicProvider] API error ${response.status} ${response.statusText}: ${errorBody}`);
            err.status = response.status;
            throw err;
        }

        const data = await response.json();
        return this.#translateResponseToProvider(data);
    }

    // ── Tradução: Histórico (Gemini → Anthropic) ─────────────────────────────

    /**
     * Converte o histórico de contents (formato Gemini) para o formato messages da Anthropic.
     * Nota: Anthropic exige que turns de tool_result sejam mensagens com role='user'.
     * @param {object[]} contents
     * @returns {object[]}
     */
    #translateContentsToMessages(contents) {
        const messages = [];

        for (let i = 0; i < contents.length; i++) {
            const turn = contents[i];

            if (turn.role === 'user') {
                messages.push(...this.#translateUserTurn(turn));
            } else if (turn.role === 'model') {
                const toolUseIds = this.#translateModelTurn(turn, messages);
                // Associa os IDs de tool_use ao turno tool seguinte
                if (toolUseIds.length > 0 && i + 1 < contents.length && contents[i + 1].role === 'tool') {
                    contents[i + 1]._anthropicToolUseIds = toolUseIds;
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
        const hasInlineData = turn.parts.some(p => p.inlineData);

        if (!hasInlineData) {
            const text = turn.parts.filter(p => p.text).map(p => p.text).join('\n');
            return [{ role: 'user', content: text }];
        }

        const content = [];
        for (const part of turn.parts) {
            if (part.text) {
                content.push({
                    type: 'text',
                    text: part.text
                });
            } else if (part.inlineData) {
                const { mimeType, data } = part.inlineData;
                const isPDF = mimeType === 'application/pdf';
                const type = isPDF ? 'document' : 'image';

                if (isPDF) {
                    content.push({
                        type: 'document',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data
                        }
                    });
                } else {
                    content.push({
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: mimeType,
                            data
                        }
                    });
                }
            }
        }
        return [{ role: 'user', content }];
    }

    /**
     * Traduz um turno do modelo para o formato Anthropic.
     * @param {object} turn
     * @param {object[]} messages
     * @returns {string[]}  IDs gerados para tool_use blocks
     */
    #translateModelTurn(turn, messages) {
        const contentBlocks = [];
        const toolUseIds = [];

        for (const part of turn.parts) {
            if (part.text && !part.thought) {
                contentBlocks.push({ type: 'text', text: part.text });
            } else if (part.functionCall) {
                const id = `toolu_${part.functionCall.name}_${toolUseIds.length}`;
                toolUseIds.push(id);
                contentBlocks.push({
                    type: 'tool_use',
                    id,
                    name: part.functionCall.name,
                    input: part.functionCall.args ?? {},
                });
            }
        }

        messages.push({ role: 'assistant', content: contentBlocks });
        return toolUseIds;
    }

    /**
     * Traduz um turno de resultados de tools para o formato Anthropic.
     * Anthropic exige que tool_result blocks venham dentro de uma mensagem com role='user'.
     * @param {object} turn
     * @param {object[]} messages
     */
    #translateToolTurn(turn, messages) {
        const toolUseIds = turn._anthropicToolUseIds || [];
        const contentBlocks = [];

        turn.parts.forEach((part, index) => {
            const fnResponse = part.functionResponse;
            const toolUseId = toolUseIds[index] || `toolu_${fnResponse.name}_${index}`;
            const content = typeof fnResponse.response?.result === 'string'
                ? fnResponse.response.result
                : JSON.stringify(fnResponse.response?.result ?? {});

            contentBlocks.push({
                type: 'tool_result',
                tool_use_id: toolUseId,
                content,
            });
        });

        messages.push({ role: 'user', content: contentBlocks });
    }

    // ── Tradução: Tools (Gemini → Anthropic) ─────────────────────────────────

    /**
     * Converte declarações de tools do formato Gemini/neutro para o formato Anthropic.
     * @param {object[]} tools  Array de { declaration, handler }
     * @returns {object[]}
     */
    #translateToolDeclarations(tools) {
        if (!tools || tools.length === 0) return [];

        return tools.map(t => {
            const decl = t.declaration || t;
            const inputSchema = this.#convertTypesToLowerCase(
                JSON.parse(JSON.stringify(decl.parameters || { type: 'object', properties: {} }))
            );

            return {
                name: decl.name,
                description: decl.description,
                input_schema: inputSchema,
            };
        });
    }

    // ── Tradução: Resposta (Anthropic → Gemini) ──────────────────────────────

    /**
     * Converte a resposta da API Anthropic para o formato padronizado (ProviderResponse).
     * @param {object} data  Resposta bruta da API Anthropic
     * @returns {import('./BaseProvider').ProviderResponse}
     */
    #translateResponseToProvider(data) {
        const parts = [];

        if (!data.content || data.content.length === 0) {
            throw new Error('[AnthropicProvider] API returned no content blocks.');
        }

        for (const block of data.content) {
            if (block.type === 'text') {
                parts.push({ text: block.text });
            } else if (block.type === 'tool_use') {
                parts.push({
                    functionCall: {
                        name: block.name,
                        args: block.input ?? {},
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
                promptTokenCount: data.usage?.input_tokens ?? 0,
                candidatesTokenCount: data.usage?.output_tokens ?? 0,
                totalTokenCount: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
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
}

module.exports = { AnthropicProvider };
