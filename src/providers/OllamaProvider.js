'use strict';

const { OpenAIProvider } = require('./OpenAIProvider');

// ─────────────────────────────────────────────────────────────────────────────
// OllamaProvider — provedor para modelos locais via Ollama
//
// O Ollama expõe nativamente uma API compatível com o formato OpenAI
// em http://localhost:11434/v1, portanto herda toda a lógica do OpenAIProvider.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

class OllamaProvider extends OpenAIProvider {
    /**
     * @param {object} options
     * @param {string} options.model    Nome do modelo local (ex: 'llama3', 'mistral', 'qwen2')
     * @param {string} [options.baseURL='http://localhost:11434/v1']  URL base do Ollama
     */
    constructor({ model, baseURL = DEFAULT_OLLAMA_BASE_URL } = {}) {
        // Ollama local não exige apiKey; usamos placeholder para satisfazer a validação do OpenAIProvider
        super({ apiKey: 'ollama', model, baseURL });
    }

    getName() {
        return 'ollama';
    }
}

module.exports = { OllamaProvider };
