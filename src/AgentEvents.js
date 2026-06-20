// ─────────────────────────────────────────────────────────────────────────────
// AgentEvents — fonte única de verdade para nomes de eventos
// ─────────────────────────────────────────────────────────────────────────────

const AgentEvents = Object.freeze({
    RESPONSE: 'response',               // Resposta final estruturada
    RAW_RESPONSE: 'raw_response',           // Resposta bruta do modelo (candidatos)
    TOOL_CALL: 'tool_call',               // Antes de executar uma tool
    TOOL_RESULT: 'tool_result',             // Após a tool resolver
    VULNERABILITY_EXPLORATION_DETECTED: 'vulnerability_exploration_detected',  // Tentativa de exploração detectada
    ERROR: 'error',                   // Erro irrecuperável
    TURN_START: 'turn_start',              // Início de um turno do loop
    TURN_END: 'turn_end',               // Fim de um turno do loop
    SESSION_CREATED: 'session_created',         // Nova sessão criada
    SESSION_EXPIRED: 'session_expired',         // Sessão expirou por TTL
    SESSION_CLEARED: 'session_cleared',         // Sessão removida manualmente
    RETRY: 'retry',                  // Retry após falha na API
    ASYNC_RETRY_SCHEDULED: 'async_retry_scheduled',   // Retry assíncrono agendado
    ASYNC_RETRY_COMPLETED: 'async_retry_completed',   // Retry assíncrono concluído
    SYNC_RETRY_STARTED: 'sync_retry_started',      // Retry síncrono iniciado
    SYNC_RETRY_COMPLETED: 'sync_retry_completed',    // Retry síncrono concluído
    PROVIDER_FALLBACK: 'provider_fallback',          // Transição automática de provedor por erro 5xx
    SESSION_IDLE_TIMEOUT: 'session_idle_timeout',    // Sessão ficou ociosa (usuário demorou a responder)
});

module.exports = { AgentEvents };