# Autonomous Customer Service Agent

Um agente autônomo de atendimento ao cliente baseado em IA, desenvolvido com Google Gemini, capaz de gerenciar múltiplas sessões, executar ferramentas customizadas e aplicar retry com backoff exponencial. Suporta modos de tratamento de indisponibilidade `async` e `sync` para garantir continuidade do atendimento.

## ✨ Características

- **Gerenciamento de Sessões**: TTL configurável com renovação automática por atividade
- **Agentic Loop Completo**: Suporte a tool calls com execução contextualizada
- **Retry com Backoff Exponencial**: Recuperação automática de falhas com jitter
- **Timeouts Granulares**: Por turno e por ferramenta via AbortController
- **Registro Programático de Ferramentas**: Schemas customizados + handlers
- **Detecção de Vulnerabilidades**: Rastreamento de tentativas de exploração
- **Eventos Estruturados**: EventEmitter para monitoramento completo

## 🚀 Quickstart

### Pré-requisitos

- Node.js 16+
- npm ou yarn
- Chave de API do Google Gemini

### Instalação

```bash
# Clone ou extraia o projeto
cd AutonomousCustomerServiceAgent

# Instale as dependências
npm install
```

### Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Configure suas credenciais em `.env`:

```env
GOOGLE_GEMINI_API_KEY=sua-chave-aqui
```

### Uso Básico

```javascript
const { AutonomousCustomerServiceAgent, Type } = require('./src/index');

const agent = new AutonomousCustomerServiceAgent({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
  company: {
    name: 'Sua Empresa',
    details: 'Descrição da empresa'
  },
  agent: {
    name: 'Assistente',
    mission: {
      objective: 'Atuar como agente de atendimento e vendas',
      instructions: 'Siga as diretrizes de qualificação e conversão.'
    }
  },
  // Exemplo: modo de tratamento de falhas ("sync" ou "async")
  failureHandlingMode: 'async',
  retryScheduleMinutes: 5,
  retryScheduleAttempts: 24,
  // Mensagem enviada ao lead em caso de indisponibilidade temporária (modo async)
  unavailabilityMessage: 'Estamos com uma indisponibilidade temporária. Entraremos em contato assim que o problema for sanado.'
});

// Registrar ferramentas customizadas
agent.registerTool({
  name: 'get_product_info',
  description: 'Obtém informações de produtos',
  parameters: { type: Type.OBJECT, properties: {} }
}, async () => {
  return JSON.stringify({ products: [] });
});

// Criar sessão
const sessionId = agent.createSession({
  name: 'João Silva',
  phone: '+55 11 98765-4321',
  origin: { type: 'whatsapp' }
});

// Processar mensagem
const response = await agent.processMessage('Olá!', sessionId);
console.log(response.response);
```

Novos parâmetros relacionados a tratamento de indisponibilidade:

```javascript
failureHandlingMode: 'sync' | 'async',     // 'sync' bloqueia outras solicitações até conclusão; 'async' agenda tentativas e continua atendendo
retryScheduleMinutes: 5,                  // minutos entre tentativas agendadas
retryScheduleAttempts: 24,                // número máximo de tentativas agendadas
retryScheduleWindowMs: 24 * 60 * 60 * 1000, // janela total para tentativas (em ms)
unavailabilityMessage: string,            // mensagem customizável enviada ao lead em modo async
```

### Executar Testes

```bash
npm test
```

## 📋 Configuração Avançada

Todas as opções de configuração com seus padrões:

```javascript
new AutonomousCustomerServiceAgent({
  apiKey: string,                           // Obrigatório
  customer: { name: string, details?: string },
  agent: {
    name: string,
    system_prompt_identity: string,
    system_prompt_mission: string,
    system_prompt_mission_instructions?: string
  },
  model: 'gemma-4-26b-a4b-it',             // Modelo Gemini
  maxAgenticLoopTurns: 8,                   // Max turns do agentic loop
  sessionTTL: 1800000,                      // 30 min
  turnTimeoutMs: 90000,                     // Timeout por turno
  maxVulnerabilityAttempts: 3,              // Limite de tentativas suspeitas
  temperature: 0.2,                         // Criatividade (0-1)
  topP: 0.95,                               // Diversidade
  thinkingLevel: 'MINIMAL',                 // Raciocínio interno
  maxOutputTokens: 4096,                    // Tokens máximos
  retryOptions: {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 8000
  }
});
```

## 🎯 Eventos

```javascript
agent.on('response', ({ response, sessionId }) => {});
agent.on('tool_call', ({ name, args }) => {});
agent.on('tool_result', ({ name, result }) => {});
agent.on('error', ({ error, source }) => {});
agent.on('session_created', ({ sessionId }) => {});
agent.on('session_expired', ({ sessionId }) => {});
agent.on('vulnerability_detected', ({ sessionId, reason }) => {});
agent.on('retry', ({ attempt, delay, error, sessionId }) => {});
// Eventos adicionados para os modos async/sync
agent.on('async_retry_scheduled', ({ sessionId, delay, attempts }) => {});
agent.on('async_retry_completed', ({ sessionId, attempts, result }) => {});
agent.on('sync_retry_started', ({ sessionId, attempt }) => {});
agent.on('sync_retry_completed', ({ sessionId, attempt, result }) => {});
```

## 🛠️ API

### Métodos Principais

- `createSession(lead)` - Cria nova sessão
- `processMessage(message, sessionId)` - Processa mensagem do cliente
- `registerTool(declaration, handler)` - Registra ferramenta customizada
- `clearSession(sessionId)` - Remove sessão
- `getSessionStatus(sessionId)` - Status da sessão

## 📝 Estrutura do Projeto

```
AutonomousCustomerServiceAgent/
├── src/
│   └── index.js              # Agente principal
├── tests/
│   └── test.js               # Exemplo de uso
├── .env.example              # Template de variáveis
├── .gitignore               # Arquivos ignorados
├── package.json             # Dependências
└── README.md                # Este arquivo
```

## 🔐 Segurança

⚠️ **Nunca** commite o arquivo `.env` com credenciais reais no repositório!

O arquivo `.gitignore` já está configurado para ignorar:
- `.env` (credenciais)
- `node_modules/` (dependências)
- Logs e arquivos temporários

## 📄 Licença

ISC

## 👤 Autor

Áreum Tecnologia
