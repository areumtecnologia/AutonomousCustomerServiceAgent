
// ─────────────────────────────────────────────────────────────────────────────
// AgentSession — encapsula todo o estado de uma conversa -Incluir evento que dispara sempre que o historico e modificado
// ─────────────────────────────────────────────────────────────────────────────
const { v4: uuid } = require('uuid');
const EventEmitter = require('events');

class AgentSession extends EventEmitter {
  /** @type {string}   */ id;
  /** @type {object}   */ user;
  /** @type {object[]} */ history = [];        // `contents` acumulado (todos os turns)
  /** @type {number}   */ vulnerabilityCount = 0;
  /** @type {boolean}  */ terminated = false;
  /** @type {Date}     */ createdAt = new Date();
  /** @type {Date}     */ lastActivity = new Date();
  /** @type {object|null} */ retryState = null;
  /** @type {number}   */ idleTimeoutMs = 0;
  /** @type {boolean}  */ idleRepeat = false;

    #ttlTimer = null;
    #onExpire;
    #idleTimer = null;
    #onIdle;

    constructor(id, user, onExpire, onIdle) {
        super();
        this.id = id || uuid();
        this.user = Object.freeze({ ...user });
        this.#onExpire = onExpire;
        this.#onIdle = onIdle;
        this.history = [];
    }

    touch() { this.lastActivity = new Date(); }

    scheduleTTL(ms) {
        this.cancelTTL();
        this.#ttlTimer = setTimeout(() => this.#onExpire(this.id), ms);
        this.#ttlTimer.unref?.(); // não bloqueia shutdown do processo
    }

    cancelTTL() {
        if (this.#ttlTimer) { clearTimeout(this.#ttlTimer); this.#ttlTimer = null; }
    }

    scheduleIdle(ms) {
        this.cancelIdle();
        if (!ms || ms <= 0) return;
        this.#idleTimer = setTimeout(() => this.#onIdle?.(this.id), ms);
        this.#idleTimer.unref?.(); // não bloqueia shutdown do processo
    }

    cancelIdle() {
        if (this.#idleTimer) { clearTimeout(this.#idleTimer); this.#idleTimer = null; }
    }

    appendHistory(...turns) {
        this.history.push(...turns);
        this.emit(AgentSessionEvents.HISTORY_UPDATED, this.history);
    }

    // Obtem o historico da conversa
    getHistory() {
        return this.history;
    }

    // Restaura o historico e turnos da conversa
    setHistory(history) {
        if (!Array.isArray(history)) throw new TypeError('[AgentSession] history must be an array.');
        this.history = history;
        this.emit(AgentSessionEvents.HISTORY_UPDATED, this.history);
    }

    toJSON() {
        return {
            id: this.id,
            user: this.user,
            vulnerabilityCount: this.vulnerabilityCount,
            terminated: this.terminated,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            turns: this.history.length,
            history: this.history,
            idleTimeoutMs: this.idleTimeoutMs,
            idleRepeat: this.idleRepeat,
        };
    }
}

// AgentSessionEvents
const AgentSessionEvents = {
    HISTORY_UPDATED: 'history_updated',
};

module.exports = { AgentSession, AgentSessionEvents };