
// ──────────────────────────────────────────────────────────────────────────────
// AgentConfig — construtor de configuração para o agente, usado internamente para complementar o prompt de sistema
// ──────────────────────────────────────────────────────────────────────────────
class AgentConfig {
    constructor(agentName, agentCompanyName, agentCompanyDetails, missionObjective, missionInstructions, reasoningLanguage = 'en_us') {
        this.agentName = agentName;
        this.agentCompanyName = agentCompanyName;
        this.agentCompanyDetails = agentCompanyDetails;
        this.missionObjective = missionObjective;
        this.missionInstructions = missionInstructions;
        this.reasoningLanguage = reasoningLanguage;
    }

    build() {
        return {
            name: this.agentName,
            company: {
                name: this.agentCompanyName,
                details: this.agentCompanyDetails
            },
            mission: {
                objective: this.missionObjective,
                instructions: this.missionInstructions
            },
            reasoningLanguage: this.reasoningLanguage
        };
    }
}

module.exports = { AgentConfig };
