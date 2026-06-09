# Autonomous Customer Service Agent

> **v2.0.6** — Agente autônomo de atendimento ao cliente baseado em IA, desenvolvido com Google Gemini. Suporta múltiplas sessões concorrentes, ferramentas customizadas, retry com backoff exponencial e modos de tratamento de falhas `sync` e `async`.

---

## ✨ Características

| Recurso | Descrição |
|---|---|
| **Agentic Loop Completo** | Tool calls encadeados com execução recursiva e contextualizada |
| **Gerenciamento de Sessões** | TTL configurável com renovação automática por atividade |
| **Retry com Backoff Exponencial** | Recuperação automática com jitter configurável |
| **Timeouts Granulares** | AbortController por turno (padrão 90s) e por ferramenta (70% do turno) |
| **Registro Programático de Tools** | Schema JSON completo + handler assíncrono |
| **Modos de Falha `sync` / `async`** | Controle de indisponibilidade com retry agendado |
| **Detecção de Vulnerabilidades** | Rastreamento via ferramenta interna de segurança e encerramento automático de sessões suspeitas |
| **Eventos Estruturados** | `EventEmitter` para monitoramento e integração externos |
| **Raciocínio Nativo (`thought === true`)** | Separação nativa de raciocínio (internal thoughts) e resposta final para o usuário |
| **`AgentManager`** | Gerenciador de múltiplos agentes independentes |

---

## 📦 Instalação

### Via npm (GitHub Packages)

```bash
npm install github:areumtecnologia/AutonomousCustomerServiceAgent
```

### Via clone local

```bash
git clone https://github.com/areumtecnologia/AutonomousCustomerServiceAgent.git
cd AutonomousCustomerServiceAgent
npm install
```

### Pré-requisitos

- Node.js `>=16.0.0`
- Chave de API do Google Gemini

---

## ⚙️ Configuração

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

```env
# .env
GOOGLE_GEMINI_API_KEY=sua-chave-aqui
```

---

## 🚀 Quickstart

```javascript
require('dotenv').config();
const { AutonomousCustomerServiceAgent, AgentConfig, AgentEvents, Type } = require('@areumtecnologia/autonomouscustomerserviceagent');

// 1. Configurar o agente
const agentConfig = new AgentConfig(
  'Monnalisa',                                          // Nome do agente
  'Minha Empresa',                                      // Nome da empresa
  'Descrição da empresa e seus serviços.',              // Detalhes da empresa
  'Atuar como agente de vendas e atendimento.',         // Objetivo da missão
  `1. Cumprimente o lead de forma acolhedora.
   2. Identifique as necessidades do lead.
   3. Utilize as ferramentas disponíveis para obter dados.
   4. Efetive a venda, se aplicável.`,                  // Instruções da missão
  'pt-BR'                                               // Idioma do raciocínio interno
);

// 2. Instanciar o agente
const agent = new AutonomousCustomerServiceAgent({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
  agent: agentConfig,
});

// 3. Registrar ferramentas
agent.registerTool({
  name: 'get_product_info',
  description: 'Obtém informações de produtos disponíveis.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, description: 'Categoria do produto.' },
    },
  },
}, async ({ category }, signal) => {
  return JSON.stringify({ products: ['Produto A', 'Produto B'] });
});

// 4. Criar sessão (ID externo + dados do usuário)
const session = agent.createSession('session-001', {
  name: 'João Silva',
  phone: '+55 11 98765-4321',
  email: 'joao@exemplo.com',
  origin: { type: 'whatsapp', id: '12345', description: 'Lead via WhatsApp.' },
});

// 5. Processar mensagens
const response = await agent.processMessage('Olá!', session.id);
console.log(response.response);
// → "Olá, João! Bem-vindo à Minha Empresa. Como posso ajudá-lo?"
```

---

## 📋 API de Referência

### `new AgentConfig(name, companyName, companyDetails, objective, instructions, reasoningLanguage?)`

Constrói a configuração do agente. **Obrigatório** — o construtor de `AutonomousCustomerServiceAgent` exige uma instância de `AgentConfig`.

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `name` | `string` | — | Nome do agente |
| `companyName` | `string` | — | Nome da empresa |
| `companyDetails` | `string` | — | Descrição da empresa |
| `objective` | `string` | — | Objetivo da missão |
| `instructions` | `string` | — | Protocolo de execução (instruções detalhadas) |
| `reasoningLanguage` | `string` | `'en_us'` | Idioma do campo `reasoning` nas respostas |

---

### `new AutonomousCustomerServiceAgent(options)`

| Opção | Tipo | Padrão | Descrição |
|---|---|---|---|
| `apiKey` | `string` | **Obrigatório** | Chave da API Google Gemini |
| `agent` | `AgentConfig` | **Obrigatório** | Instância de `AgentConfig` |
| `model` | `string` | `'gemma-4-26b-a4b-it'` | Modelo Gemini a ser usado |
| `maxAgenticLoopTurns` | `number` | `9` | Máx. de iterações do agentic loop por mensagem |
| `sessionTTL` | `number` | `1800000` | TTL da sessão em ms (padrão: 30 min) |
| `turnTimeoutMs` | `number` | `90000` | Timeout por turno do loop em ms |
| `maxVulnerabilityAttempts` | `number` | `3` | Tentativas antes de encerrar a sessão |
| `temperature` | `number` | `1` | Temperatura do modelo (0–1) |
| `topP` | `number` | `0.95` | Probabilidade de núcleo (top-p sampling) |
| `thinkingLevel` | `string` | `'HIGH'` | Nível de raciocínio interno do modelo |
| `maxOutputTokens` | `number` | `32768` | Tokens máximos na resposta |
| `failureHandlingMode` | `'sync' \| 'async'` | `'sync'` | Modo de tratamento de falhas |
| `retryScheduleMinutes` | `number` | `5` | Intervalo entre tentativas agendadas (min) |
| `retryScheduleAttempts` | `number` | `24` | Máximo de tentativas agendadas |
| `retryScheduleWindowMs` | `number` | `86400000` | Janela total de retentativas (24h) |
| `unavailabilityMessage` | `string` | `'We are experiencing a temporary outage. We will contact you as soon as the problem is resolved.'` | Mensagem exibida ao usuário em caso de indisponibilidade |
| `retryOptions` | `object` | `{ maxAttempts: 3, baseDelayMs: 900, maxDelayMs: 9000 }` | Opções do retry com backoff exponencial |

---

### Métodos de Sessão

#### `agent.createSession(id, user)` → `SessionSnapshot`

Cria uma nova sessão de atendimento. O `id` deve ser único — uma exceção é lançada caso já exista uma sessão com o mesmo ID.

```javascript
const session = agent.createSession('session-abc', {
  name: 'Maria Souza',
  phone: '5511999999999',
  email: 'maria@exemplo.com',
  origin: { type: 'instagram', id: '999', description: 'Lead via DM.' },
});
// session.id → 'session-abc'
```

#### `agent.processMessage(message, sessionId)` → `Promise<AgentResponse>`

Processa uma mensagem dentro de uma sessão existente. Gerencia todo o histórico de conversa e agentic loop internamente.

```javascript
const response = await agent.processMessage('Quero saber sobre seus produtos.', 'session-abc');
console.log(response.response);    // Texto para o usuário
console.log(response.reasoning);   // Raciocínio interno do modelo
console.log(response.sent_at);     // Timestamp no fuso de Brasília
```

#### `agent.getSession(sessionId)` → `SessionSnapshot | null`

Retorna um snapshot read-only da sessão.

#### `agent.getSessionByUser(filter)` → `SessionSnapshot | null`

Busca uma sessão por nome, telefone ou origem do usuário. Aceita string (nome ou telefone) ou objeto de filtro.

```javascript
// Por telefone (string)
const s1 = agent.getSessionByUser('5511999999999');

// Por objeto de filtro composto
const s2 = agent.getSessionByUser({
  name: 'Maria Souza',
  origin: { type: 'instagram' },
});
```

#### `agent.clearSession(sessionId)` → `boolean`

Remove uma sessão manualmente, cancelando seu TTL e retentativas agendadas. Emite `SESSION_CLEARED`.

#### `agent.activeSessions` → `number`

Getter que retorna o número de sessões ativas no momento.

#### `agent.activeSessionsCount()` → `number`

Método equivalente ao getter `activeSessions`.

#### `agent.agentName` → `string`

Getter que retorna o nome do agente configurado.

---

### Registro de Ferramentas

#### `agent.registerTool(declaration, handler)` → `this` (chainable)

Registra ou substitui uma ferramenta customizada.

**Registrar nova tool (declaração completa):**

```javascript
agent.registerTool({
  name: 'check_availability',
  description: 'Verifica disponibilidade de vagas para uma data.',
  parameters: {
    type: Type.OBJECT,
    required: ['date'],
    properties: {
      date: { type: Type.STRING, description: 'Data no formato YYYY-MM-DD.' },
    },
  },
}, async ({ date }, signal) => {
  // signal: AbortSignal — use para cancelamentos com timeout
  return JSON.stringify({ available: true, slots: 5 });
});
```

**Substituir apenas o handler de uma tool existente:**

```javascript
agent.registerTool('check_availability', async ({ date }, signal) => {
  // Novo handler com lógica atualizada
  const data = await myApi.fetchAvailability(date, { signal });
  return JSON.stringify(data);
});
```

> **Nota:** O handler recebe `(args: object, signal: AbortSignal)`. O `signal` é fornecido pelo timeout interno da tool (70% do `turnTimeoutMs`). Use-o em chamadas externas para garantir cancelamento correto.

---

### `AgentResponse` — Estrutura da Resposta

A resposta de `processMessage` é gerada em formato livre e estruturada pela biblioteca ao separar as partes de raciocínio (`thought === true`) e a resposta final do modelo:

```typescript
{
  sent_at: string;                         // Timestamp (DD/MM/YYYY HH:mm:ss, fuso Brasília)
  reasoning: string;                       // Raciocínio nativo do modelo (extraído de parts com thought === true)
  response: string;                        // Texto final da resposta enviada ao usuário
  vulnerability_exploration_attempts?: number; // Tentativas de exploração detectadas na sessão
}
```

---

## 🎯 Eventos

Use `agent.on(AgentEvents.EVENT_NAME, callback)` para monitorar o ciclo de vida completo.

```javascript
const { AgentEvents } = require('@areumtecnologia/autonomouscustomerserviceagent');

agent
  // ── Sessões ─────────────────────────────────────────────────────────────
  .on(AgentEvents.SESSION_CREATED, ({ session }) =>
    console.log(`Sessão criada: ${session.id}`))

  .on(AgentEvents.SESSION_EXPIRED, ({ sessionId, user }) =>
    console.log(`Sessão expirada: ${sessionId}`))

  .on(AgentEvents.SESSION_CLEARED, ({ session }) =>
    console.log(`Sessão limpa: ${session.id}`))

  // ── Agentic Loop ─────────────────────────────────────────────────────────
  .on(AgentEvents.TURN_START, ({ depth, session }) =>
    console.log(`Turno ${depth} iniciado — sessão ${session.id}`))

  .on(AgentEvents.TURN_END, ({ depth, type, session }) =>
    console.log(`Turno ${depth} finalizado (${type}) — sessão ${session.id}`))

  .on(AgentEvents.RESPONSE, ({ response, reasoning, session, usageMetadata }) =>
    console.log(`[${session.id}]`, response))

  .on(AgentEvents.RAW_RESPONSE, ({ rawResponse, session }) => { /* resposta bruta do modelo */ })

  // ── Ferramentas ──────────────────────────────────────────────────────────
  .on(AgentEvents.TOOL_CALL, ({ name, args, session }) =>
    console.log(`Tool chamada: ${name}`, args))

  .on(AgentEvents.TOOL_RESULT, ({ name, result, session }) =>
    console.log(`Tool resultado: ${name}`, result))

  // ── Retry e Falhas ───────────────────────────────────────────────────────
  .on(AgentEvents.RETRY, ({ attempt, delay, error, session }) =>
    console.warn(`Retry ${attempt} em ${delay}ms`))

  .on(AgentEvents.ASYNC_RETRY_SCHEDULED, ({ session, delay, attempts }) =>
    console.log(`Retry async agendado em ${delay}ms`))

  .on(AgentEvents.ASYNC_RETRY_COMPLETED, ({ session, attempts, result }) =>
    console.log(`Retry async concluído após ${attempts} tentativas`))

  .on(AgentEvents.SYNC_RETRY_STARTED, ({ session, attempt }) =>
    console.log(`Retry sync tentativa ${attempt}`))

  .on(AgentEvents.SYNC_RETRY_COMPLETED, ({ session, attempt, result }) =>
    console.log(`Retry sync concluído na tentativa ${attempt}`))

  // ── Segurança ────────────────────────────────────────────────────────────
  .on(AgentEvents.VULNERABILITY_EXPLORATION_DETECTED, ({ session, attempts, threshold }) =>
    console.error(`Exploração detectada — ${attempts}/${threshold} tentativas`))

  .on(AgentEvents.ERROR, ({ error, source, session }) =>
    console.error(`Erro${source ? ` [${source}]` : ''}:`, error.message));
```

### Referência de Eventos (`AgentEvents`)

| Constante | Valor | Descrição |
|---|---|---|
| `RESPONSE` | `'response'` | Resposta final estruturada do agente |
| `RAW_RESPONSE` | `'raw_response'` | Resposta bruta do modelo (candidatos) |
| `TOOL_CALL` | `'tool_call'` | Antes de executar uma ferramenta |
| `TOOL_RESULT` | `'tool_result'` | Após a ferramenta resolver |
| `TURN_START` | `'turn_start'` | Início de um turno do agentic loop |
| `TURN_END` | `'turn_end'` | Fim de um turno do agentic loop |
| `SESSION_CREATED` | `'session_created'` | Nova sessão criada |
| `SESSION_EXPIRED` | `'session_expired'` | Sessão expirada por TTL |
| `SESSION_CLEARED` | `'session_cleared'` | Sessão removida manualmente |
| `RETRY` | `'retry'` | Retry de curto prazo após falha na API |
| `ASYNC_RETRY_SCHEDULED` | `'async_retry_scheduled'` | Retry assíncrono de longo prazo agendado |
| `ASYNC_RETRY_COMPLETED` | `'async_retry_completed'` | Retry assíncrono concluído com sucesso |
| `SYNC_RETRY_STARTED` | `'sync_retry_started'` | Retry síncrono iniciado |
| `SYNC_RETRY_COMPLETED` | `'sync_retry_completed'` | Retry síncrono concluído com sucesso |
| `VULNERABILITY_EXPLORATION_DETECTED` | `'vulnerability_exploration_detected'` | Tentativa de exploração detectada |
| `ERROR` | `'error'` | Erro irrecuperável ou de ferramenta |

---

## 🔄 Modos de Tratamento de Falhas

### `failureHandlingMode: 'sync'` (padrão)

Quando o processamento falha, o agente bloqueia novas requisições da **mesma sessão** e tenta o reprocessamento em intervalos regulares até atingir o limite de tentativas ou a janela de tempo. Outras sessões são bloqueadas durante o retry.

```
Mensagem recebida → falha na API
       ↓
  Retry sync #1 (aguarda retryScheduleMinutes)
       ↓
  Retry sync #2 ...
       ↓
  Limite atingido → resposta de indisponibilidade
```

### `failureHandlingMode: 'async'`

O agente responde imediatamente com a `unavailabilityMessage` e agenda retentativas em background. O atendimento de outras sessões **não é bloqueado**.

```
Mensagem recebida → falha na API
       ↓
  Retorna unavailabilityMessage imediatamente
       ↓
  Retry async agendado em retryScheduleMinutes
       ↓ (background)
  Retry #1, #2 ... até limite → emite ASYNC_RETRY_COMPLETED ou ERROR
```

```javascript
const agent = new AutonomousCustomerServiceAgent({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
  agent: agentConfig,
  failureHandlingMode: 'async',
  retryScheduleMinutes: 5,       // intervalo entre tentativas
  retryScheduleAttempts: 24,     // máx. tentativas (= até 2h com intervalo de 5min)
  retryScheduleWindowMs: 2 * 60 * 60 * 1000, // janela de 2 horas
  unavailabilityMessage: 'Estamos com uma instabilidade temporária. Entraremos em contato em breve.',
});
```

---

## 🗂️ `AgentManager` — Múltiplos Agentes

Gerencie múltiplos agentes em um único processo:

```javascript
const { AgentManager, AutonomousCustomerServiceAgent, AgentConfig } = require('@areumtecnologia/autonomouscustomerserviceagent');

const manager = new AgentManager();

manager.add('vendas', new AutonomousCustomerServiceAgent({ apiKey, agent: configVendas }));
manager.add('suporte', new AutonomousCustomerServiceAgent({ apiKey, agent: configSuporte }));

const agenteVendas = manager.get('vendas');
agenteVendas.createSession('s-001', { name: 'Lead', phone: '...' });

manager.list();    // → ['vendas', 'suporte']
manager.remove('suporte');
manager.clear();
```

---

## 🏗️ Estrutura do Projeto

```
AutonomousCustomerServiceAgent/
├── src/
│   ├── index.js                          # Ponto de entrada — exports públicos
│   ├── AutonomousCustomerServiceAgent.js # Classe principal do agente
│   ├── AgentConfig.js                    # Builder de configuração do agente
│   ├── AgentSession.js                   # Estado de uma sessão de conversa
│   ├── AgentEvents.js                    # Constantes de eventos (EventEmitter)
│   ├── AgentManager.js                   # Gerenciador de múltiplos agentes
│   └── utils.js                          # withRetry (backoff exponencial + jitter)
├── tests/
│   └── test.js                           # Exemplo completo multi-turno com tools
├── logs/                                 # Logs de execução (gerado em runtime)
├── .env.example                          # Template de variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

### Exports Públicos (`src/index.js`)

```javascript
const {
  AutonomousCustomerServiceAgent, // Classe principal
  AgentConfig,                    // Builder de configuração
  AgentEvents,                    // Constantes de eventos
  AgentManager,                   // Gerenciador de múltiplos agentes
  Type,                           // Re-export de @google/genai (para schemas de tools)
  ThinkingLevel,                  // Re-export de @google/genai
} = require('@areumtecnologia/autonomouscustomerserviceagent');
```

---

## 🧪 Testes

```bash
npm test
```

O script `tests/test.js` demonstra um exemplo completo com:
- Configuração do agente com `AgentConfig`
- Registro de múltiplas ferramentas com schemas completos (`get_current_datetime`, `get_product_data`, `check_availability`, `checkout`, `clear_session`)
- Conversa multi-turno (5 turnos: boas-vindas → consulta de produtos → disponibilidade → reserva → checkout)
- Eventos de monitoramento completos
- Execução consecutiva para validação de estabilidade (5 iterações)

---

## 🔐 Segurança

> ⚠️ **Nunca** commite o arquivo `.env` com credenciais reais.

O arquivo `.gitignore` já ignora:
- `.env` — credenciais da API
- `node_modules/` — dependências
- `logs/` — arquivos de log

### Proteção contra Exploração

O agente possui mecanismo embutido de detecção de tentativas de exploração (prompt injection, extração de system prompt, engenharia social e bypass de regras) usando a ferramenta interna `report_vulnerability_attempt` disponibilizada ao modelo Gemini.

Quando o modelo detecta um comportamento hostil do usuário, ele aciona essa ferramenta. O acionamento emite o evento `VULNERABILITY_EXPLORATION_DETECTED` com a mensagem `"Attempt to exploit vulnerability detected"` e incrementa o contador da sessão. Após `maxVulnerabilityAttempts` tentativas registradas na sessão ativa, a mesma é encerrada automaticamente e `session.terminated = true`.

---

## 📄 Licença

ISC

## 👤 Autor

**Áreum Tecnologia** — Software and AI Development Team
