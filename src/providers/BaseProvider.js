'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// BaseProvider — contrato que todo provedor de IA deve implementar
// ─────────────────────────────────────────────────────────────────────────────

class BaseProvider {
    /** @type {string} Nome/identificador do modelo */
    model;

    /**
     * @param {object} options
     * @param {string} options.model  Nome do modelo a ser utilizado
     */
    constructor({ model } = {}) {
        if (new.target === BaseProvider) {
            throw new TypeError('[BaseProvider] Cannot instantiate BaseProvider directly. Use a concrete implementation.');
        }
        if (!model) {
            throw new TypeError(`[${this.constructor.name}] model is required.`);
        }
        this.model = model;
    }

    /**
     * Gera conteúdo a partir do modelo de IA.
     *
     * @param {object} params
     * @param {object[]} params.contents       Histórico de mensagens no formato estruturado (padrão Gemini)
     * @param {string}   params.systemInstruction  Instrução do sistema (system prompt)
     * @param {object[]} params.tools          Lista de declarações de ferramentas ({ declaration, handler })
     * @param {object}   params.config         Configurações de inferência
     * @param {number}   params.config.temperature
     * @param {number}   params.config.topP
     * @param {number}   params.config.maxOutputTokens
     * @param {string}   [params.config.thinkingLevel]
     * @param {AbortSignal} [params.signal]    Signal para cancelamento/timeout
     * @returns {Promise<ProviderResponse>}    Resposta padronizada
     */
    async generateContent({ contents, systemInstruction, tools, config, signal }) {
        throw new Error(`[${this.constructor.name}] Method generateContent() must be implemented.`);
    }

    /**
     * Retorna o identificador humano do provedor.
     * @returns {string}
     */
    getName() {
        throw new Error(`[${this.constructor.name}] Method getName() must be implemented.`);
    }
}

/**
 * @typedef {object} ProviderResponse
 * @property {object[]} candidates                        Lista de candidatos de resposta
 * @property {object}   candidates[].content
 * @property {string}   candidates[].content.role         Sempre 'model'
 * @property {object[]} candidates[].content.parts        Partes da resposta (text, functionCall, thought)
 * @property {object}   [usageMetadata]
 * @property {number}   [usageMetadata.promptTokenCount]
 * @property {number}   [usageMetadata.candidatesTokenCount]
 * @property {number}   [usageMetadata.totalTokenCount]
 */

module.exports = { BaseProvider };
