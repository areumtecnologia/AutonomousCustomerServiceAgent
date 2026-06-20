# Autonomous Customer Service Agent

> **v2.3.1** — Agente autônomo de atendimento ao cliente baseado em IA, com suporte a múltiplos provedores redundantes (Google Gemini, OpenAI, Claude, Ollama), failover automático em caso de falhas 5xx, suporte a mídias (imagens, áudio, vídeo), gerenciamento concorrente transparente (debounce + abort) e sessões integradas.

---

## ✨ Características

| Recurso | Descrição |
|---|---|
| **Multi-Provider Nativo** | Suporte a **Google Gemini**, **OpenAI GPT**, **Anthropic Claude** e **Ollama** (modelos locais). |
| **Redundância e Failover** | Possibilidade de configurar múltiplos modelos/provedores. Transição automática imediata em caso de indisponibilidade (erro 5xx/rate limit/timeout). |
| **Suporte Multimídia** | Envio de anexos (imagens, áudio, vídeo) em Base64 no processamento de mensagens. |
| **Concorrência Transparente** | Gerenciamento automático de mensagens consecutivas (`debounceMs`) com cancelamento ativo no LLM. |
| **Agentic Loop Completo** | Tool calls encadeados com execução recursiva e contextualizada |
| **Gerenciamento de Sessões** | TTL configurável com renovação automática por atividade |
| **Retry com Backoff Exponencial** | Recuperação automática de falhas com jitter configurável |
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
- Chave de API de um provedor compatível (Google Gemini, OpenAI, Anthropic) ou Ollama rodando localmente

---

## ⚙️ Configuração

Copie o arquivo de exemplo e configure suas credenciais:

```bash
cp .env.example .env
```

```env
# .env
GOOGLE_GEMINI_API_KEY=sua-chave-aqui
# Se usar outros provedores:
OPENAI_API_KEY=sua-chave-openai-aqui
ANTHROPIC_API_KEY=sua-chave-anthropic-aqui
```

---

## 🚀 Quickstart

### Exemplo com Provedor Google (Gemini)

```javascript
require('dotenv').config();
const { 
  AutonomousCustomerServiceAgent, 
  AgentConfig, 
  AgentEvents, 
  Type, 
  GoogleProvider 
} = require('@areumtecnologia/autonomouscustomerserviceagent');

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

// 2. Instanciar o agente usando múltiplos provedores ou modelos redundantes (Failover automático)
const agent = new AutonomousCustomerServiceAgent({
  // Aceita também model como array de strings (ex: ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'])
  // ou providers como array de instâncias/objetos de configuração
  providers: [
    new GoogleProvider({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: 'gemma-4-26b-a4b-it'
    }),
    new GoogleProvider({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
      model: 'gemma-4-31b-it'
    })
  ],
  debounceMs: 1500, // 1.5s de debounce transparente para mensagens consecutivas
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

// 4. Criar sessão
const session = agent.createSession('session-001', {
  name: 'João Silva',
  phone: '+55 11 98765-4321',
  email: 'joao@exemplo.com',
  origin: { type: 'whatsapp', id: '12345', description: 'Lead via WhatsApp.' },
});

// 5. Processar mensagens
const response = await agent.processMessage(session.id, 'Olá!');
console.log(response.response);
// → "Olá, João! Bem-vindo à Minha Empresa. Como posso ajudá-lo?"
```

---

## 🔮 Provedores de IA Suportados

A biblioteca suporta diferentes provedores de IA de forma intercambiável. Basta instanciar o provedor desejado e passá-lo na propriedade `provider` (ou `providers`) do construtor.

### Redundância e Failover (Múltiplos Provedores/Modelos)
Você pode configurar múltiplos modelos e/ou provedores para failover automático em caso de indisponibilidade (erro 5xx, rate limits ou timeouts).

```javascript
const { GoogleProvider, OpenAIProvider, AutonomousCustomerServiceAgent } = require('@areumtecnologia/autonomouscustomerserviceagent');

const agent = new AutonomousCustomerServiceAgent({
  // O campo providers aceita instâncias de BaseProvider ou objetos de configuração
  providers: [
    new GoogleProvider({ apiKey: 'key1', model: 'gemma-4-26b-a4b-it' }),
    { type: 'google', apiKey: 'key1', model: 'gemma-4-31b-it' },
    { type: 'openai', apiKey: 'key2', model: 'gpt-4o' }
  ],
  agent: agentConfig
});

// Se preferir usar o provedor padrão (GoogleProvider) para múltiplos modelos:
const agentSimplificado = new AutonomousCustomerServiceAgent({
  apiKey: 'sua-gemini-key',
  model: ['gemma-4-26b-a4b-it', 'gemma-4-31b-it'], // Failover automático entre os modelos caso um falhe
  agent: agentConfig
});
```

### 1. Google Gemini Provider
```javascript
const { GoogleProvider } = require('@areumtecnologia/autonomouscustomerserviceagent');

const provider = new GoogleProvider({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
  model: 'gemma-4-26b-a4b-it' // ou 'gemini-2.5-flash', 'gemini-2.5-pro'
});
```

### 2. OpenAI Provider
```javascript
const { OpenAIProvider } = require('@areumtecnologia/autonomouscustomerserviceagent');

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o' // ou 'gpt-4o-mini'
});
```

### 3. Anthropic Claude Provider
```javascript
const { AnthropicProvider } = require('@areumtecnologia/autonomouscustomerserviceagent');

const provider = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-latest'
});
```

### 4. Ollama Provider (Modelos Locais)
Perfeito para rodar offline ou em servidores locais compatíveis com a API do OpenAI:
```javascript
const { OllamaProvider } = require('@areumtecnologia/autonomouscustomerserviceagent');

const provider = new OllamaProvider({
  model: 'gemma4',                  // Nome do modelo baixado no Ollama
  baseURL: 'http://localhost:11434/v1' // Opcional, padrão da API local do Ollama
});
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
| `provider` | `BaseProvider \| object \| Array` | — | Provedor de IA. Aceita uma instância de `BaseProvider`, um objeto de configuração (ex: `{ type: 'google', apiKey: '...' }`) ou um array de provedores/configurações para failover em caso de indisponibilidade (erro 5xx). |
| `providers` | `BaseProvider \| object \| Array` | — | Equivalente a `provider`. Permite a declaração legível de múltiplos provedores redundantes. |
| `apiKey` | `string` | — | Chave Gemini (retrocompatível — instancia o `GoogleProvider` internamente caso nenhum provedor seja fornecido). |
| `agent` | `AgentConfig` | **Obrigatório** | Instância de `AgentConfig` |
| `debounceMs` | `number` | `0` | Tempo em ms para debounce e concatenação transparente de mensagens rápidas. `0` mantém desativado. |
| `model` | `string \| string[]` | `'gemma-4-26b-a4b-it'` | Modelo Gemini (ou array de modelos) a ser usado no fallback do GoogleProvider. Se passado como array de strings, o agente realiza failover entre os modelos. |
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

#### `agent.createSession(id, user, options?)` → `SessionSnapshot`

Cria uma nova sessão de atendimento. O `id` deve ser único — uma exceção é lançada caso já exista uma sessão com o mesmo ID.

- **`id`**: `string` - ID único da sessão.
- **`user`**: `object` - Informações do usuário (`name`, `phone`, `email`, etc.).
- **`options`** (opcional): `object` - Opções extras de configuração da sessão:
  - **`idleTimeout`** (opcional): `number` - Tempo de inatividade em milissegundos para disparar um evento e resposta automática de acompanhamento (`SESSION_IDLE_TIMEOUT`). Se for `null`, `undefined` ou `0`, o recurso permanece desativado (comportamento padrão).
  - **`idleRepeat`** (opcional): `boolean` - Se definido como `true`, repete o evento de inatividade periodicamente (a cada período de `idleTimeout`) enquanto o usuário não responder.

```javascript
const session = agent.createSession('session-abc', {
  name: 'Maria Souza',
  phone: '5511999999999',
  email: 'maria@exemplo.com',
  origin: { type: 'instagram', id: '999', description: 'Lead via DM.' },
}, {
  idleTimeout: 300000, // 5 minutos de inatividade
  idleRepeat: true     // Repetir a cada 5 minutos até obter resposta
});
```

#### `agent.processMessage(sessionId, text, attachment?, options?)` → `Promise<AgentResponse>`

Processa uma mensagem dentro de uma sessão existente. Gerencia todo o histórico de conversa, mídias enviadas, concorrência interna (se `debounceMs` estiver ativo) e o loop de ferramentas internamente.

> [!NOTE]
> A partir da versão **v2.2.x**, a ordem de parâmetros foi invertida para colocar o `sessionId` em primeiro lugar, permitindo suporte limpo a anexos opcionais.

- **`sessionId`**: `string` - ID da sessão de atendimento.
- **`text`**: `string` - Mensagem de texto enviada pelo usuário.
- **`attachment`** (opcional): `object` - Anexo de mídia no formato `{ base64: string, mimeType: string }`.
- **`options`** (opcional): `object` - Opções extras da chamada (ex: `{ signal: abortSignal }`).

**Exemplo básico:**
```javascript
const response = await agent.processMessage(session.id, 'Quero saber sobre seus produtos.');
console.log(response.response);
```

**Exemplo enviando imagem (Multimídia):**
```javascript
const response = await agent.processMessage(
  session.id,
  'O que tem nessa imagem?',
  {
    base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
    mimeType: 'image/png'
  }
);
console.log(response.response);
```

**Exemplo passando AbortSignal manual:**
```javascript
const controller = new AbortController();
const response = await agent.processMessage(
  session.id,
  'Buscar informações pesadas...',
  {},
  { signal: controller.signal }
);
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

Remove uma sessão manualmente, cancelando seu TTL, retentativas agendadas e buffers concorrentes pendentes. Emite `SESSION_CLEARED`.

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
  sent_at: string;                             // Timestamp (DD/MM/YYYY HH:mm:ss, fuso Brasília)
  reasoning: string;                           // Raciocínio nativo do modelo (extraído de parts com thought === true)
  response: string;                            // Texto final da resposta enviada ao usuário
  vulnerability_exploration_attempts?: number; // Tentativas de exploração detectadas na sessão
}
```

---

## 🔄 Gestão Concorrente Transparente (Debounce & Abort)

Em canais de mensagens instantâneas (como o WhatsApp e Telegram), os usuários costumam enviar várias mensagens consecutivas ("Oi!", "Tudo bem?", "Queria saber os horários...").

Quando `debounceMs` é configurado (ex: `1500`):
1. **Debounce Temporal**: O agente aguarda até que o usuário pare de digitar pelo tempo definido antes de submeter o texto concatenado ao LLM.
2. **Cancelamento Ativo (Abort)**: Se o usuário enviar uma mensagem no momento em que o LLM estiver gerando a resposta anterior:
   - A requisição ativa é abortada no LLM imediatamente (economizando custos de API e processamento).
   - O turno de usuário incompleto é removido do histórico da sessão (garantindo que o histórico permaneça consistente).
   - A Promise correspondente à mensagem abortada resolve instantaneamente com `{ aborted: true }` (prevenindo travamento do event loop).
   - O agente inicia um novo debounce para processar as mensagens seguintes unificadas.

---

## 🎯 Eventos

Use `agent.on(AgentEvents.EVENT_NAME, callback)` para monitorar o ciclo de vida completo.

```javascript
const { AgentEvents } = require('@areumtecnologia/autonomouscustomerserviceagent');

agent
  // ── Sessões ─────────────────────────────────────────────────────────────
  .on(AgentEvents.SESSION_CREATED, ({ session }) =>
    console.log(`Sessão criada: ${session.id}`))

  .on(AgentEvents.SESSION_EXPIRED, ({ sessionId }) =>
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

  // ── Ferramentas ──────────────────────────────────────────────────────────
  .on(AgentEvents.TOOL_CALL, ({ name, args, session }) =>
    console.log(`Tool chamada: ${name}`, args))

  .on(AgentEvents.TOOL_RESULT, ({ name, result, session }) =>
    console.log(`Tool resultado: ${name}`, result))

  // ── Retry e Falhas ───────────────────────────────────────────────────────
  .on(AgentEvents.RETRY, ({ attempt, delay, error, session }) =>
    console.warn(`Retry ${attempt} em ${delay}ms`))

  .on(AgentEvents.PROVIDER_FALLBACK, ({ failedProvider, failedModel, nextProvider, nextModel, error, session }) =>
    console.warn(`Fallback na sessão ${session.id}: ${failedProvider} (${failedModel}) falhou com erro ${error.status || error.message}. Migrando para ${nextProvider} (${nextModel})`))
  
  .on(AgentEvents.ERROR, ({ error, source, session }) =>
    console.error(`Erro${source ? ` [${source}]` : ''}:`, error.message));
```

---

## 🔄 Modos de Tratamento de Falhas

### `failureHandlingMode: 'sync'` (padrão)

Quando o processamento falha, o agente bloqueia novas requisições da **mesma sessão** e tenta o reprocessamento em intervalos regulares até atingir o limite de tentativas ou a janela de tempo. Outras sessões são bloqueadas durante o retry.

### `failureHandlingMode: 'async'`

O agente responde imediatamente com a `unavailabilityMessage` e agenda retentativas em background. O atendimento de outras sessões **não é bloqueado**.

---

## 🗂️ `AgentManager` — Múltiplos Agentes

Gerencie múltiplos agentes em um único processo:

```javascript
const { AgentManager, AutonomousCustomerServiceAgent, AgentConfig } = require('@areumtecnologia/autonomouscustomerserviceagent');

const manager = new AgentManager();

manager.add('vendas', new AutonomousCustomerServiceAgent({ provider: providerVendas, agent: configVendas }));
manager.add('suporte', new AutonomousCustomerServiceAgent({ provider: providerSuporte, agent: configSuporte }));

const agenteVendas = manager.get('vendas');
agenteVendas.createSession('s-001', { name: 'Lead', phone: '...' });
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
│   ├── providers/                        # Provedores de IA suportados (Google, OpenAI, Anthropic, Ollama)
│   └── utils.js                          # withRetry (backoff exponencial + jitter)
├── tests/
│   ├── test.js                           # Testes de integração e exemplos
│   └── test_debounce_abort.js            # Simulação e validação de concorrência
├── logs/                                 # Logs de execução (gerados em runtime)
├── .env.example                          # Template de variáveis de ambiente
├── package.json
└── README.md
```

---

## 🧪 Testes

```bash
npm test
```

---

## 🔐 Segurança

### Proteção contra Exploração

O agente possui mecanismo embutido de detecção de tentativas de exploração (prompt injection, extração de system prompt, engenharia social e bypass de regras) usando a ferramenta interna `report_vulnerability_attempt` disponibilizada ao modelo.

Quando o modelo detecta um comportamento hostil do usuário, ele aciona essa ferramenta. O acionamento emite o evento `VULNERABILITY_EXPLORATION_DETECTED` e incrementa o contador da sessão. Após `maxVulnerabilityAttempts` tentativas registradas na sessão ativa, a mesma é encerrada automaticamente e `session.terminated = true`.

---

## 📄 Licença

ISC

## 👤 Autor

**Áreum Tecnologia** — Software and AI Development Team
