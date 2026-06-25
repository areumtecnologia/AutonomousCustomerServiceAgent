'use strict';

const { AgenticCore } = require('./AgenticCore');

// ─────────────────────────────────────────────────────────────────────────────
// AgentManager — armazena e gerencia múltiplas instâncias de agentes
// ─────────────────────────────────────────────────────────────────────────────
class AgentManager {
    constructor() {
        this.agents = new Map();
    }

    add(id, agent) {
        if (!(agent instanceof AgenticCore)) {
            throw new TypeError('Only instances of AgenticCore can be added.');
        }
        this.agents.set(id, agent);
    }

    get(id) {
        return this.agents.get(id);
    }

    remove(id) {
        return this.agents.delete(id);
    }

    list() {
        return Array.from(this.agents.keys());
    }

    clear() {
        this.agents.clear();
    }
}

module.exports = { AgentManager };