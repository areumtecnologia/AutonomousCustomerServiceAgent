'use strict';

const readline = require('readline');

/**
 * Permite expor o AgenticCore como um MCP Server por Stdio JSON-RPC 2.0.
 * Isso permite que ferramentas do agente sejam invocadas por clientes externos (Claude Desktop, Cursor, etc.).
 */
class McpServer {
    /**
     * @param {AgenticCore} agent Instância do agente de atendimento
     * @param {object} [options]
     */
    constructor(agent, options = {}) {
        if (!agent) throw new TypeError('[McpServer] agent is required.');
        this.agent = agent;
        this.options = options;
        this.rl = null;
    }

    /**
     * Inicia a escuta no canal Stdio (stdin/stdout) para processar requisições JSON-RPC.
     */
    start() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        });

        this.rl.on('line', async (line) => {
            if (!line.trim()) return;
            try {
                const message = JSON.parse(line);
                await this.#handleMessage(message);
            } catch (e) {
                this.#sendError(null, -32700, `Parse error: ${e.message}`);
            }
        });
    }

    /**
     * Encerra a escuta no canal Stdio.
     */
    stop() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }

    async #handleMessage(message) {
        if (message.jsonrpc !== '2.0') {
            return this.#sendError(message.id, -32600, 'Invalid Request');
        }

        const { id, method, params } = message;

        switch (method) {
            case 'initialize':
                return this.#sendResponse(id, {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        tools: {}
                    },
                    serverInfo: {
                        name: 'autonomous-customer-service-agent-server',
                        version: '2.4.0'
                    }
                });

            case 'tools/list':
                // Expõe as ferramentas disponíveis
                const tools = [
                    {
                        name: 'ask_agent',
                        description: 'Envia uma mensagem para o agente de atendimento e recebe a resposta textual do atendimento.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                sessionId: { type: 'string', description: 'ID exclusivo da sessão' },
                                name: { type: 'string', description: 'Nome do cliente' },
                                phone: { type: 'string', description: 'Telefone do cliente' },
                                message: { type: 'string', description: 'Mensagem enviada pelo cliente' }
                            },
                            required: ['sessionId', 'name', 'phone', 'message']
                        }
                    }
                ];
                return this.#sendResponse(id, { tools });

            case 'tools/call':
                if (params && params.name === 'ask_agent') {
                    const args = params.arguments || {};
                    const { sessionId, name, phone, message } = args;

                    if (!sessionId || !name || !phone || !message) {
                        return this.#sendError(id, -32602, 'Invalid parameters. Required fields: sessionId, name, phone, message');
                    }
                    
                    try {
                        // Obtém ou cria a sessão correspondente no agente
                        let session = this.agent.getSession(sessionId);
                        if (!session) {
                            session = this.agent.createSession(sessionId, { name, phone });
                        }

                        // Processa a mensagem do usuário e responde
                        const agentResponse = await this.agent.processMessage(sessionId, message);
                        
                        return this.#sendResponse(id, {
                            content: [
                                {
                                    type: 'text',
                                    text: agentResponse.response
                                }
                            ]
                        });
                    } catch (e) {
                        return this.#sendError(id, -32000, `Agent execution error: ${e.message}`);
                    }
                }
                return this.#sendError(id, -32601, `Method not found: tool "${params ? params.name : ''}"`);

            default:
                // Ignora notificações sem ID
                if (id === undefined || id === null) return;
                return this.#sendError(id, -32601, `Method not found: "${method}"`);
        }
    }

    #sendResponse(id, result) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
    }

    #sendError(id, code, message) {
        process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code, message }
        }) + '\n');
    }
}

module.exports = { McpServer };
