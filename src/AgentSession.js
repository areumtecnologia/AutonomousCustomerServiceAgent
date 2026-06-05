
// ─────────────────────────────────────────────────────────────────────────────
// AgentSession — encapsula todo o estado de uma conversa
// ─────────────────────────────────────────────────────────────────────────────

class AgentSession {
  /** @type {string}   */ id;
  /** @type {object}   */ user;
  /** @type {object[]} */ history = [];        // `contents` acumulado (todos os turns)
  /** @type {number}   */ vulnerabilityCount = 0;
  /** @type {boolean}  */ terminated = false;
  /** @type {Date}     */ createdAt = new Date();
  /** @type {Date}     */ lastActivity = new Date();
  /** @type {object|null} */ retryState = null;

    #ttlTimer = null;
    #onExpire;

    constructor(id, user, onExpire) {
        this.id = id;
        this.user = Object.freeze({ ...user });
        this.#onExpire = onExpire;
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

    appendHistory(...turns) { this.history.push(...turns); }

    toJSON() {
        return {
            id: this.id,
            user: this.user,
            vulnerabilityCount: this.vulnerabilityCount,
            terminated: this.terminated,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            turns: this.history.length,
        };
    }
}

module.exports = { AgentSession };