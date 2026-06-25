'use strict';

const assert = require('assert');
const { AutonomousCustomerServiceAgent, AgenticCore, AgentConfig } = require('../src');

console.log('=== Iniciando testes de retrocompatibilidade ===\n');

try {
    assert.ok(AutonomousCustomerServiceAgent, 'AutonomousCustomerServiceAgent deve ser exportado');
    assert.ok(AgenticCore, 'AgenticCore deve ser exportado');
    
    assert.strictEqual(
        AutonomousCustomerServiceAgent,
        AgenticCore,
        'AutonomousCustomerServiceAgent deve ser exatamente a mesma classe que AgenticCore (alias)'
    );
    console.log('[PASS] Verificação de Alias: AutonomousCustomerServiceAgent === AgenticCore');

    const agentOld = new AutonomousCustomerServiceAgent({
        apiKey: 'fake-key',
        agent: new AgentConfig('Test', 'Company', 'Details', 'Objective', 'Instructions')
    });

    const agentNew = new AgenticCore({
        apiKey: 'fake-key',
        agent: new AgentConfig('Test', 'Company', 'Details', 'Objective', 'Instructions')
    });

    assert.strictEqual(
        agentOld.constructor.name,
        'AgenticCore',
        'O construtor da instância criada com o nome antigo deve ser AgenticCore'
    );
    assert.strictEqual(
        agentNew.constructor.name,
        'AgenticCore',
        'O construtor da instância criada com o novo nome deve ser AgenticCore'
    );
    console.log('[PASS] Verificação de Construtor: Instâncias possuem o mesmo construtor (AgenticCore)');

    console.log('\n=== [SUCESSO] Todos os testes de retrocompatibilidade passaram! ===');
    process.exit(0);
} catch (e) {
    console.error('[FAIL] Falha no teste de retrocompatibilidade:', e.message);
    process.exit(1);
}
