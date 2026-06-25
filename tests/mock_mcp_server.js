'use strict';

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const message = JSON.parse(line);
        handleMessage(message);
    } catch (e) {
        sendError(null, -32700, `Parse error: ${e.message}`);
    }
});

function handleMessage(message) {
    if (message.jsonrpc !== '2.0') {
        return sendError(message.id, -32600, 'Invalid Request');
    }

    const { id, method, params } = message;

    switch (method) {
        case 'initialize':
            return sendResponse(id, {
                protocolVersion: '2024-11-05',
                capabilities: {
                    tools: {}
                },
                serverInfo: {
                    name: 'mock-mcp-server',
                    version: '1.0.0'
                }
            });

        case 'notifications/initialized':
            // Notificações não retornam resposta JSON-RPC
            return;

        case 'tools/list':
            return sendResponse(id, {
                tools: [
                    {
                        name: 'calculate_discount',
                        description: 'Calcula o desconto para um determinado cliente baseado no seu valor de compra.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                purchaseValue: {
                                    type: 'number',
                                    description: 'O valor total da compra do cliente.'
                                },
                                customerType: {
                                    type: 'string',
                                    description: 'O tipo do cliente (ex: vip, regular).'
                                }
                            },
                            required: ['purchaseValue', 'customerType']
                        }
                    }
                ]
            });

        case 'tools/call':
            if (params.name === 'calculate_discount') {
                const { purchaseValue, customerType } = params.arguments || {};
                let rate = 0.05; // 5% regular
                if (customerType === 'vip') {
                    rate = 0.15; // 15% VIP
                }
                const discount = purchaseValue * rate;
                return sendResponse(id, {
                    content: [
                        {
                            type: 'text',
                            text: `O desconto calculado para o cliente ${customerType} é de R$ ${discount.toFixed(2)} (taxa de ${(rate * 100)}%).`
                        }
                    ]
                });
            }
            return sendError(id, -32601, `Method not found: tool ${params.name}`);

        default:
            if (id === undefined) return;
            return sendError(id, -32601, `Method not found: ${method}`);
    }
}

function sendResponse(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id, code, message) {
    process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code, message }
    }) + '\n');
}
