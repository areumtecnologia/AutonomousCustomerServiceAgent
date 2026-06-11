'use strict';

const { GoogleGenAI } = require('@google/genai');
const { BaseProvider } = require('./BaseProvider');

// ─────────────────────────────────────────────────────────────────────────────
// GoogleProvider — implementação usando o SDK @google/genai
// ─────────────────────────────────────────────────────────────────────────────

class GoogleProvider extends BaseProvider {
    #ai;

    /**
     * @param {object} options
     * @param {string} options.apiKey   Chave de API do Google AI Studio / Vertex
     * @param {string} options.model    Nome do modelo (ex: 'gemini-2.5-flash', 'gemma-4-26b-a4b-it')
     */
    constructor({ apiKey, model } = {}) {
        super({ model });
        if (!apiKey) throw new TypeError('[GoogleProvider] apiKey is required.');
        this.#ai = new GoogleGenAI({ apiKey });
    }

    getName() {
        return 'google';
    }

    /**
     * @param {object} params
     * @param {object[]} params.contents
     * @param {string}   params.systemInstruction
     * @param {object[]} params.tools               Array de { declaration, handler }
     * @param {object}   params.config
     * @param {AbortSignal} [params.signal]
     * @returns {Promise<import('./BaseProvider').ProviderResponse>}
     */
    async generateContent({ contents, systemInstruction, tools, config, signal }) {
        const functionDeclarations = this.#buildFunctionDeclarations(tools);
        const geminiConfig = this.#buildGeminiConfig(functionDeclarations, systemInstruction, config);

        const response = await this.#ai.models.generateContent({
            model: this.model,
            contents,
            config: geminiConfig,
        });

        // O SDK do Google já retorna no formato esperado pelo core (candidates + usageMetadata)
        return response;
    }

    /**
     * Extrai as declarações de funções a partir do registry de tools.
     * @param {object[]} tools  Array de { declaration, handler }
     * @returns {object[]}
     */
    #buildFunctionDeclarations(tools) {
        if (!tools || tools.length === 0) return [];
        return tools.map(t => t.declaration || t);
    }

    /**
     * Monta o objeto de configuração no formato esperado pelo SDK do Google.
     * @param {object[]} functionDeclarations
     * @param {string}   systemInstruction
     * @param {object}   config
     * @returns {object}
     */
    #buildGeminiConfig(functionDeclarations, systemInstruction, config) {
        const geminiConfig = {
            maxOutputTokens: config.maxOutputTokens,
            temperature: config.temperature,
            topP: config.topP,
            systemInstruction: [{ text: systemInstruction }],
        };

        if (functionDeclarations.length > 0) {
            geminiConfig.tools = [{ functionDeclarations }];
        }

        if (config.thinkingLevel && config.thinkingLevel !== 'OFF') {
            geminiConfig.thinkingConfig = {
                thinkingLevel: config.thinkingLevel,
            };
        }

        return geminiConfig;
    }
}

module.exports = { GoogleProvider };
