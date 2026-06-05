'use strict';

/**
 * AutonomousCustomerServiceAgent
 * ──────────────────────────────
 * Agente de atendimento autônomo com:
 *  1. Sessões internas com TTL e renovação por atividade
 *  2. Rastreamento externo de tentativas de exploração (não depende do LLM)
 *  3. Retry com backoff exponencial + jitter
 *  4. Timeout por turno e por tool via AbortController
 *  5. Agentic loop completo: tool call → resultado → resposta contextualizada
 *  6. Registro programático de Tools customizadas (schema + handler)
 *  7. Consciência temporal e humanização de boas-vindas no primeiro contato
 */

const { AgentEvents } = require('./AgentEvents');
const { AgentManager } = require('./AgentManager');
const { AgentConfig } = require('./AgentConfig');
const { AutonomousCustomerServiceAgent } = require('./AutonomousCustomerServiceAgent');
const { Type, ThinkingLevel } = require('@google/genai');

module.exports = { AutonomousCustomerServiceAgent, AgentEvents, Type, ThinkingLevel, AgentManager, AgentConfig };