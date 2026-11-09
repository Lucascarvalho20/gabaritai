# GabaritAI

Plataforma SaaS de preparação para concursos públicos. Aplicação Next.js 14 fullstack em produção, com **166 endpoints de API**, banco PostgreSQL de **45 modelos** e orquestração de múltiplos provedores de LLM.

> ⚠️ **Preencher antes de publicar:** a URL de produção. O domínio `gabaritai.app`
> pertence a outra empresa — não usar.

---

## O problema

Quem estuda para concurso de alta concorrência enfrenta três coisas que nenhuma planilha resolve: não saber **o que** estudar (editais com pesos diferentes por banca), não saber **quando revisar** (a curva do esquecimento não espera), e não ter **diagnóstico real** do próprio desempenho por matéria.

O GabaritAI ataca os três com algoritmos determinísticos — não com prompt de IA pedindo "monte um cronograma", que alucina datas e não tem rigor matemático.

---

## Arquitetura

```mermaid
flowchart TB
    Browser["Navegador<br/>React 18 + Tailwind"]

    subgraph Next["Next.js 14 — App Router (Vercel)"]
        RSC["Server Components<br/>(render + data fetching)"]
        API["166 Route Handlers<br/>/api/*"]
    end

    subgraph Dominio["Camada de domínio — src/lib"]
        SCHED["schedule-algorithm.ts<br/>cronograma determinístico"]
        SIM["simulado-generator.ts<br/>regras por banca"]
        SM2["SM-2<br/>repetição espaçada"]
        SEC["cpf · totp · rate-limit<br/>segurança e LGPD"]
        FULFILL["checkout-fulfillment.ts<br/>transação ACID"]
    end

    AI["ai-client.ts<br/>roteador multi-provider"]
    DB[("PostgreSQL · Supabase<br/>45 modelos via Prisma")]
    PAY["Mercado Pago<br/>webhooks"]

    Browser --> RSC & API
    API --> Dominio
    Dominio --> DB
    Dominio --> AI
    AI -->|"fallback em cascata"| LLM["Groq · Gemini<br/>Claude · OpenAI"]
    PAY -->|webhook| FULFILL
```

Não há `middleware.ts`: a sessão é verificada dentro de cada rota com `getUserFromRequest`/`verifyToken` (`src/lib/auth-server.ts`, `src/lib/jwt.ts`). É mais verboso que um middleware global, mas deixa explícito em cada endpoint quem pode chamá-lo.

**Por que Next.js App Router e não um backend separado?** O projeto chegou a ter um serviço NestJS (`apps/api`, ~1.9k linhas), mas o caminho de produção ficou nos Route Handlers do Next. Motivo prático: com um único deploy na Vercel, Server Components leem o banco direto sem round-trip HTTP, e as rotas `/api/*` cobrem o que precisa de contrato REST (webhooks, cron, cliente mobile futuro). Para um time de uma pessoa, a separação em dois deploys custava mais do que entregava.

---

## Decisões técnicas que valem explicação

### 1. Cronograma determinístico, não gerado por LLM

[`src/lib/schedule-algorithm.ts`](src/lib/schedule-algorithm.ts) · 303 linhas

LLM erra data, inventa carga horária e custa dinheiro a cada regeração. O algoritmo aqui é aritmética pura e **reprodutível** — mesma entrada, mesma saída, sempre:

1. Conta os dias entre hoje e a prova, filtrando só os dias da semana que o aluno marcou como disponíveis.
2. Multiplica por horas/dia → `totalMinAvailable`.
3. Calcula o necessário a partir dos pesos de cada matéria no edital → `totalMinRecommended`.
4. Distribui as matérias em **round-robin ponderado** pelo peso da banca, em blocos de 50 min, na proporção 65% teoria / 20% revisão / 15% questões.
5. Se `recomendado > disponível`, devolve `isFeasible: false` com o déficit em minutos — o aluno descobre **antes** que não vai dar tempo, e ajusta.

### 2. Repetição espaçada SM-2

[`src/app/api/me/flashcards/[id]/review/route.ts`](src/app/api/me/flashcards/[id]/review/route.ts)

O mesmo algoritmo do Anki. O aluno nota a resposta de 0 a 5 e o intervalo até a próxima revisão se ajusta pelo *ease factor*:

```
EF' = max(1.3, EF + (0.1 − (5−q) × (0.08 + (5−q) × 0.02)))
```

Nota < 3 reseta o intervalo para 1 dia. Nota ≥ 3 multiplica o intervalo anterior pelo EF.

Dois detalhes que não são óbvios:
- **IDOR.** O endpoint recebe um `id` na URL. Antes de qualquer escrita, ele confere se o flashcard pertence ao usuário autenticado ou é público. Sem essa checagem, trocar o id na URL deixaria qualquer aluno ler e sobrescrever o progresso de outro.
- **Concorrência.** `upsert` sobre a constraint composta `@@unique([userId, flashcardId])` — duas revisões simultâneas do mesmo card não criam registro duplicado.

### 3. Roteador de LLM com fallback em cascata

[`src/lib/ai-client.ts`](src/lib/ai-client.ts) · 230 linhas

Depender de um provedor só significa herdar o downtime e o rate limit dele. E usar um modelo caro para extrair texto de uma questão é desperdício. A fila muda conforme a natureza da tarefa:

| Tipo de tarefa | Ordem de tentativa |
|---|---|
| Extração mecânica | Groq → Gemini Flash → OpenAI → Claude |
| Geração de conteúdo | Gemini Flash → Claude → OpenAI → Groq |
| Correção de redação | Claude → OpenAI → Gemini → Groq |

Cada provedor que falha (erro, timeout, cota) cai para o próximo sem o usuário perceber.

Junto vem `parseAIJson`, que existe porque **modelo de linguagem não respeita contrato de saída**: às vezes devolve o JSON embrulhado em ```` ```json ````, às vezes precedido de "Claro! Aqui está:". A função limpa a marcação, e se o `JSON.parse` ainda falhar, extrai o primeiro `{...}` ou `[...]` por regex antes de desistir com erro rastreável.

### 4. Pagamento: três camadas de defesa contra o dinheiro sumir

[`src/lib/checkout-fulfillment.ts`](src/lib/checkout-fulfillment.ts) · [`src/lib/payment-sync.ts`](src/lib/payment-sync.ts) · [`src/lib/mercadopago.ts`](src/lib/mercadopago.ts)

O pior bug possível de um SaaS é **dinheiro cobrado, acesso não liberado** — e ele tem mais de uma causa. Cada uma pede uma defesa diferente.

**Atomicidade.** Quando o pagamento é confirmado, cinco escritas precisam acontecer ou nenhuma: atualizar o plano, matricular nos cursos, incrementar vendas, registrar o cupom e gravar auditoria. Tudo num `prisma.$transaction`. Um erro no meio não pode deixar o aluno pago e sem acesso.

**Idempotência, em dois níveis.** O Mercado Pago reenvia webhook — por retry, por timeout, por evento duplicado. A liberação é **reivindicada** com um `UPDATE ... WHERE fulfilledAt IS NULL` que devolve quantas linhas mudou: só um processo consegue, e quem decide é o Postgres, não a ordem de chegada. A versão anterior lia `paidAt` e depois decidia — uma janela de *time-of-check to time-of-use* por onde dois webhooks simultâneos passavam. O teste de integração dispara três notificações com `Promise.all` contra um Postgres real e confere que a venda conta uma vez. No outro extremo do fluxo, uma cobrança PIX pendente é reaproveitada em vez de gerar outra. Uma camada evita **liberar** duas vezes; a outra evita **cobrar** duas vezes.

**Três caminhos de confirmação, uma regra.** O webhook é o caminho normal, mas pode se perder. A tela de PIX consulta a API a cada 4 s — mas só com a aba aberta. E um cron diário ([`reconciliar-pagamentos`](src/app/api/cron/reconciliar-pagamentos/route.ts)) pergunta ao MP o estado de todo pagamento pendente dos últimos 3 dias, cobrindo o caso em que os outros dois falham juntos. Os três chamam a mesma função ([`applyMpPaymentToLocal`](src/lib/payment-sync.ts)) — a regra é escrita uma vez, e não em três implementações que divergem com o tempo. E o webhook distingue erro temporário de permanente: API do MP fora do ar devolve 503 (o MP reenvia), pagamento inexistente devolve 200 (reenviar não adianta).

**Status só anda pra frente.** O Mercado Pago manda várias notificações do mesmo pagamento, às vezes simultâneas, e cada uma consulta a API deles. Duas consultas paralelas podem voltar em ordem trocada — a que perguntou um instante antes da aprovação responde "pending" depois da que respondeu "approved", e sobrescreve. Isso aconteceu de verdade num pagamento real. A defesa não é ordenar as notificações (não há como), é tornar a escrita monotônica: [`transicaoPermitida`](src/lib/payment-status.ts) dá um nível a cada status e só aceita troca para nível igual ou maior. Notificação atrasada vira no-op; `APPROVED` só sai para `REFUNDED`.

Junto: validação HMAC-SHA256 da assinatura do webhook com janela anti-replay de 5 minutos, e checagem de valor divergente que rejeita o pagamento se o valor aprovado não bate com o cobrado.

Um detalhe de interface que também é correção de bug: `/api/checkout/status` devolve **por que** não confirmou (`sincronizado`, `erro_mp:…`, `sem_provider_payment_id`), em vez de só devolver que não confirmou. Antes, uma falha de rede e um PIX legitimamente pendente apareciam idênticos para o usuário — um erro disfarçado de estado normal é um erro que ninguém reporta.

### 5. Dados pessoais sob LGPD

[`src/lib/cpf.ts`](src/lib/cpf.ts) · [`src/lib/totp.ts`](src/lib/totp.ts) · [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)

O CPF é gravado em **duas colunas com funções diferentes**, e a razão é que uma só não resolve:

- `cpfHash` — SHA-256 com salt. Determinístico, então aceita índice `@unique` e responde "esse CPF já existe?" em O(1). Irreversível.
- `cpfEncrypted` — AES-256-GCM, IV aleatório de 12 bytes, authentication tag. Reversível só sob necessidade fiscal. GCM e não CBC porque é autenticado: detecta adulteração do payload no banco, não só protege o sigilo.

Hash sozinho não permitiria devolver o dado ao titular; criptografia sozinha não permitiria checar unicidade sem decifrar a base inteira.

Também aqui: **2FA TOTP (RFC 6238)** implementado com o `crypto` nativo do Node — decode Base32, HMAC-SHA1 do contador de 8 bytes, truncamento dinâmico, módulo 10⁶, tolerância de ±1 janela para clock drift. E **rate limiting** em janela deslizante por `identifier:ip`: 5 tentativas em 15 min, lockout de 30 min, com trilha em `login_attempts` e `audit_logs`.

### 6. Segredo ausente é erro, nunca valor padrão

[`src/lib/segredo.ts`](src/lib/segredo.ts) · [`src/lib/cron-auth.ts`](src/lib/cron-auth.ts) · [`src/lib/setup-auth.ts`](src/lib/setup-auth.ts)

O padrão `process.env.CHAVE ?? 'valor-de-desenvolvimento'` é comum e, num repositório público, perigoso: se a variável faltar em algum ambiente, o sistema não quebra — passa a operar com uma chave que qualquer pessoa lê no GitHub. Uma auditoria procurando essa classe de bug achou o padrão na chave de criptografia de CPF, nos salts de hash e no token dos crons.

A regra agora é uma só: fora de produção o fallback existe (para `next dev` funcionar sem configuração); em build de produção, incluindo previews, segredo ausente é erro explícito. Comparações de token usam `timingSafeEqual` sobre SHA-256, para não vazar o segredo pelo tempo de resposta.

Mesma auditoria, outro achado: o `/api/health` público fazia uma chamada real a cada provedor de IA por acesso. Abrir em loop esgotava a cota gratuita que atende os alunos. Hoje a versão pública só responde `{ ok, versao }` — o commit no ar — e o diagnóstico completo exige admin, com cache de 5 minutos.

### 7. IA: RAG com escopo, agente com ferramentas, cronograma adaptativo

[`src/lib/rag/`](src/lib/rag/) · [`src/lib/agente/`](src/lib/agente/) · [`src/lib/peso-adaptativo.ts`](src/lib/peso-adaptativo.ts)

**RAG no mentor.** O material dos cursos é fatiado por seção, transformado em vetores (Gemini, 1.536 dimensões) e guardado com **pgvector** no próprio Postgres, com índice HNSW. Cada pergunta busca os trechos mais próximos **só nas matérias do edital do aluno** — os materiais são compartilhados entre cursos, e sem esse filtro um aluno recebia trecho de matéria que a prova dele não cobra. A resposta mostra as fontes. pgvector em vez de um banco vetorial separado porque o vetor fica na mesma tabela que o resto: filtrar por matéria é um `WHERE`, não uma sincronização entre dois sistemas. Um cron diário indexa material novo; material sem texto ganha uma "lápide" que impede a fila de travar sobre ele.

**Agente de diagnóstico.** O modelo decide quais ferramentas chamar — desempenho por matéria, tópicos fracos, erros recentes, busca no material, dias até a prova — e entrega um plano validado. Três decisões de desenho:

- **A conta fica fora do modelo.** "Onde o aluno perde mais pontos" é uma função pura e testada (`fatia da prova × (1 − acerto suavizado)`); o modelo a chama e explica. LLM erra aritmética e não é reprodutível.
- **O modelo não escolhe de quem são os dados.** O id do aluno vem da sessão e fica preso no *closure* das ferramentas; nenhuma recebe id de usuário como argumento. Prompt injection não tem por onde alcançar outro aluno — o teste de integração planta um segundo aluno e confere que nada dele aparece.
- **O loop recebe o modelo injetado.** Nos testes, um modelo falso com respostas roteirizadas exercita erro de ferramenta, ferramenta inventada, JSON quebrado e teto de passos — sem rede, sem custo, reprodutível.

Formato OpenAI de *tool calling*, que Groq e Gemini também aceitam; como a API é sem estado, o fallback entre provedores acontece por chamada, no meio da conversa.

**Cronograma adaptativo (opcional).** O algoritmo de cronograma não muda: antes dele, o peso de cada matéria é multiplicado por um fator de desempenho, limitado a [0,6; 1,6] para nenhuma matéria sumir. O acerto passa por **suavização bayesiana** — `(acertos + 0,7 × 10) / (tentativas + 10)` —, então errar 2 de 2 questões quase não mexe e errar 20 de 20 mexe: transição contínua, sem limiar arbitrário.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Linguagem | TypeScript 5 |
| Framework | Next.js 14.2 (App Router), React 18 |
| Banco | PostgreSQL (Supabase) · Prisma 5 · 45 modelos |
| Auth | JWT próprio via `jose` · cookies httpOnly · bcrypt · TOTP próprio · Google OAuth 2.0 |
| Validação | Zod · React Hook Form |
| Estado | Zustand · TanStack Query |
| UI | Tailwind · Framer Motion · Recharts · KaTeX |
| IA | Groq · Google Gemini · Anthropic Claude · OpenAI |
| Pagamento | Mercado Pago (PIX transparente, Checkout Pro) |
| Deploy | Vercel |

---

## Rodando localmente

```bash
npm install
cp .env.example .env     # preencha as variáveis
npx prisma migrate dev
npx prisma db seed
npm run dev              # http://localhost:3000
```

Nenhum segredo é versionado. Todo `.env` está no `.gitignore`; o `.env.example` traz só os nomes das variáveis e valores de exemplo.

---

## Ambientes e promoção

Mudança nenhuma vai direto para quem está pagando. O caminho é sempre o mesmo, e cada etapa só existe porque a anterior pode deixar passar algo:

```mermaid
flowchart LR
    F["branch de trabalho"] -->|pull request| CI{"Verificar<br/>tipos · lint · testes"}
    CI -->|falhou| F
    CI -->|passou| H["homologacao<br/>deploy de preview"]
    H -->|teste manual<br/>no preview| CI2{"Verificar<br/>de novo"}
    CI2 -->|passou| M["main<br/>produção"]
    M --> V["gabaritai-red.vercel.app"]
```

| Etapa | O que roda | O que pega |
|---|---|---|
| Pull request | `typecheck`, `lint`, `test` (95 testes unitários) | Erro de tipo, regressão nas funções puras |
| Pull request | `test:integracao` — 16 cenários contra PostgreSQL + pgvector descartável | SQL escrito à mão, filtros do Prisma, **concorrência** |
| `homologacao` | Deploy de preview da Vercel, URL própria | Erro que só aparece com build real e banco |
| `main` | Deploy de produção | — |

As checagens rodam de novo na promoção para `main`, porque entre o teste no preview e o merge o `main` pode ter andado.

O build **não** roda no CI de propósito: ele exige `DATABASE_URL` e as chaves de API, e segredo de produção em runner de CI é risco sem retorno. A Vercel já builda cada branch e falha lá.

**Reprodutibilidade.** O `package-lock.json` é versionado. Sem ele, dois deploys do mesmo commit podem instalar versões diferentes e produzir sites diferentes — falha que não aparece em nenhum diff.

---

## O que ainda não existe

Sendo honesto sobre o estado do projeto:

- **Cobertura ampla de teste.** 95 testes unitários e 16 cenários de integração, concentrados onde o erro custa dinheiro ou dado pessoal: pagamento, segurança, algoritmo de cronograma e IA. O SM-2 e o gerador de simulado ainda não têm.
- **CI ativo no GitHub.** O workflow está escrito (incluindo o job de integração com pgvector como serviço), mas aguarda um token com escopo `workflow` para ser publicado.
- **Avaliação do RAG.** A busca funciona, mas sem medição de qualidade. O próximo passo é um conjunto de perguntas com o trecho esperado, medindo *recall@5*.
- **Separação de banco por ambiente.** O preview de `homologacao` ainda aponta para o mesmo Postgres da produção. Enquanto for assim, homologação testa o código, não os dados — um `DATABASE_URL` próprio no ambiente de Preview da Vercel resolve.
- **Observabilidade.** Logs da Vercel apenas. Sem métricas, sem tracing, sem alerta.
- **Cache.** O Redis está previsto no desenho mas ainda não entrou — hoje todo rate limit e leitura quente vai direto ao Postgres. O rate limit é um `Map` em memória, então na prática limita por instância, não globalmente.

---

## Estrutura

```
src/
├─ app/
│  ├─ api/            166 route handlers
│  │  ├─ admin/       68  gestão de conteúdo, cursos, usuários
│  │  ├─ me/          35  dados do próprio usuário (flashcards, progresso)
│  │  ├─ auth/        10  login, registro, OAuth, 2FA
│  │  ├─ simulados/    8  geração e correção
│  │  ├─ schedule/     7  cronograma
│  │  ├─ cron/         6  jobs agendados
│  │  └─ ai/           4  endpoints de IA
│  └─ (páginas do App Router)
├─ lib/               domínio: algoritmos, segurança, integrações
└─ components/        UI
```

---

*Projeto pessoal desenvolvido e mantido por João Lucas.*
