'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos neutros de parâmetros para declarações de Tools
// Substitui a dependência direta do @google/genai para definições de schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapeamento neutro dos tipos de dados para declaração de parâmetros de Tools.
 * Compatível com o formato do Google Gemini SDK e traduzível para OpenAI/Anthropic.
 * @readonly
 * @enum {string}
 */
const Type = Object.freeze({
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT',
});

/**
 * Níveis de raciocínio interno do modelo.
 * Suportado nativamente pelo Google Gemini; ignorado por provedores que não suportam.
 * @readonly
 * @enum {string}
 */
const ThinkingLevel = Object.freeze({
    OFF: 'OFF',
    MINIMAL: 'MINIMAL',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
});

module.exports = { Type, ThinkingLevel };
