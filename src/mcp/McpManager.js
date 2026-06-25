'use strict';

const EventEmitter = require('events');
const { McpClient } = require('./McpClient');
const { Type } = require('../types');

/**
 * Gerenciador que orquestra conexões a múltiplos servidores MCP e 
 * as integra dinamicamente com o AgenticCore.
 */
class McpManager extends EventEmitter {
    /**
     * @param {AgenticCore} agent Instância do agente de atendimento
     */
    constructor(agent) {
        super();
        if (!agent) throw new TypeError('[McpManager] agent is required.');
        this.agent = agent;
        this.clients = new Map();
    }

    /**
     * Conecta a um novo servidor MCP e registra suas ferramentas no agente.
     * 
     * @param {string} name Nome exclusivo do servidor
     * @param {object} config Configuração de transporte
     * @param {string} [transport='stdio'] Tipo de transporte ('stdio' | 'sse')
     */
    async registerServer(name, config, transport = 'stdio') {
        if (this.clients.has(name)) {
            throw new Error(`[McpManager] Server "${name}" is already registered.`);
        }

        const client = new McpClient({ name, transport, config });
        
        client.on('error', (err) => {
            this.emit('error', { server: name, error: err });
        });

        client.on('close', (code) => {
            this.emit('close', { server: name, code });
        });

        await client.connect();
        this.clients.set(name, client);

        try {
            // Obtém as ferramentas suportadas pelo servidor
            const tools = await client.listTools();
            for (const tool of tools) {
                this.#registerToolInAgent(name, tool);
            }
        } catch (err) {
            client.disconnect();
            this.clients.delete(name);
            throw err;
        }
    }

    #registerToolInAgent(serverName, tool) {
        // Prefixa o nome da ferramenta com o nome do servidor para evitar conflitos de nomes
        const agentToolName = `${serverName}_${tool.name}`;
        
        // Mapeia o JSON Schema do MCP para o formato simplificado esperado pelo agente
        const parameters = this.#convertSchema(tool.inputSchema);

        this.agent.registerTool({
            name: agentToolName,
            description: tool.description,
            parameters
        }, async (args, signal) => {
            const client = this.clients.get(serverName);
            if (!client) {
                throw new Error(`[McpManager] Server "${serverName}" is not connected.`);
            }
            
            // Invoca a ferramenta no servidor MCP
            const content = await client.callTool(tool.name, args);
            
            // Une as partes de texto retornadas pelo servidor
            const textResponse = content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');

            return textResponse || JSON.stringify(content);
        });
    }

    #convertSchema(mcpSchema) {
        if (!mcpSchema) return { type: Type.OBJECT, properties: {} };
        
        try {
            // Deep clone
            const parsed = JSON.parse(JSON.stringify(mcpSchema));
            
            const mapTypes = (obj) => {
                if (obj && typeof obj === 'object') {
                    if (typeof obj.type === 'string') {
                        // O SDK do agente espera os tipos mapeados no Types.js (maiúsculo)
                        const upperType = obj.type.toUpperCase();
                        if (Object.values(Type).includes(upperType)) {
                            obj.type = upperType;
                        }
                    }
                    if (obj.properties) {
                        for (const key of Object.keys(obj.properties)) {
                            mapTypes(obj.properties[key]);
                        }
                    }
                    if (obj.items) {
                        mapTypes(obj.items);
                    }
                }
            };
            
            mapTypes(parsed);
            return parsed;
        } catch (e) {
            return { type: Type.OBJECT, properties: {} };
        }
    }

    /**
     * Encerra todas as conexões ativas com os servidores MCP
     */
    shutdown() {
        for (const [name, client] of this.clients.entries()) {
            try {
                client.disconnect();
            } catch (e) {
                // Silencia erros no cleanup
            }
        }
        this.clients.clear();
    }
}

module.exports = { McpManager };
