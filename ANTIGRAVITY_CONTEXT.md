# ANTIGRAVITY_CONTEXT.md — Contexto do Projeto Gabaritai

> **LEIA ESTE ARQUIVO ANTES DE QUALQUER TAREFA NO PROJETO.**
> Este documento serve como briefing para o agente IA (Antigravity/Gemini) que vai trabalhar neste projeto junto comigo (proprietário: João Lucas) e com o Claude Code (que faz tarefas de código complexo e materiais de Direito).

---

## 1. O QUE É O GABARITAI

Plataforma educacional brasileira para preparação em **concursos públicos** (foco inicial: carreiras policiais — PF, PRF, PCDF, PMDF, PCGO, PMGO, etc.). Domínio: **gabaritai-red.vercel.app**.

Funcionalidades centrais:
- Materiais educacionais por tópico de edital (estilo NotebookLM)
- Banco de questões com diagnóstico personalizado
- Flashcards com algoritmo SM-2 (repetição espaçada)
- Simulados de provas anteriores
- Ciclo de estudo integrado (material → questões → flashcards → simulado)

---

## 2. STACK TÉCNICA

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 14 (App Router)** com Server Components |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| ORM | Prisma 5.22 |
| Banco | PostgreSQL (Supabase — project id `lfguljdirnoebhvwfmfm`) |
| Auth | Supabase Auth |
| Deploy | Vercel |
| E-mail | Resend |
| Pagamento | Stripe |

---

## 3. ESTRUTURA DE PASTAS

```
/Users/joaolucas/gabaritai/
├── apps/
│   └── web/                          ← App Next.js principal
│       ├── prisma/
│       │   ├── schema.prisma         ← Schema do banco (NÃO ALTERE sem confirmar)
│       │   └── migrations/           ← SQLs para Supabase (PADRÃO está aqui)
│       ├── src/
│       │   ├── app/
│       │   │   ├── api/              ← Rotas de API
│       │   │   ├── (admin)/admin/    ← Área administrativa
│       │   │   ├── (dashboard)/      ← Área do aluno
│       │   │   └── ...
│       │   ├── components/           ← Componentes React
│       │   └── lib/                  ← Utilitários
│       └── package.json
├── ANTIGRAVITY_CONTEXT.md            ← Este arquivo
└── ...
```

---

## 4. REGRAS CRÍTICAS — NÃO VIOLE

### 🚫 NUNCA habilitar RLS no Supabase
O app usa Prisma **server-side** com `service_role`. Quando o Supabase pedir para habilitar Row Level Security em alguma tabela, **SEMPRE escolha "Run without RLS"**. Habilitar RLS quebra todas as APIs.

### 🚫 NUNCA mexa em arquivos sensíveis na raiz
Os seguintes arquivos contêm chaves API e credenciais — **estão fora do git e devem permanecer assim**:
- `/Users/joaolucas/gabaritai/DEPLOY_VERCEL.md`
- `/Users/joaolucas/gabaritai/SETUP_DEPLOY.md`
- `/Users/joaolucas/gabaritai/CHAVES_API.md`

NÃO commite, NÃO leia em voz alta, NÃO mencione conteúdo desses arquivos.

### 🚫 NUNCA altere `prisma/schema.prisma` sem confirmar
Alterações no schema exigem migração + risco de perda de dados em produção. Antes de qualquer mudança, **pergunte ao usuário**.

### 🚫 NUNCA faça `git push --force` em main
Reescrever história em produção pode apagar trabalho. Sempre confirme antes de operações destrutivas em git.

### ⚡ REGRA OBRIGATÓRIA — USE DOLLAR-QUOTING (`$material$...$material$`)
**A partir de agora, NÃO use mais `E'...'` para o conteúdo grande.** Use `$material$...$material$` (dollar-quoted strings do PostgreSQL).

#### Por quê?
O Supabase SQL Editor às vezes interpreta mal strings `E'...'` quando o conteúdo tem `;`, `'` ou caracteres especiais, gerando erros mesmo com escape correto (`''`). Dollar-quoting é 100% imune.

#### ❌ ANTIGO — não use mais:
```sql
SELECT upsert_material(
  'informatica',
  'Tópico',
  'Título',
  E'# Conteúdo aqui com aspas '' escapadas e tudo mais...',
  'Resumo aqui'
);
```

#### ✅ NOVO — use sempre assim:
```sql
SELECT upsert_material(
  'informatica',
  'Tópico',
  'Título',
  $material$# Conteúdo aqui pode ter ' aspas livres, ; semicolons, "tudo"!$material$,
  'Resumo aqui'
);
```

**Vantagens do `$material$...$material$`:**
- Não precisa escapar aspas simples internas (escreva apenas `'`, não `''`)
- Não confunde o parser do Supabase
- Não quebra com `;` no conteúdo
- Aceita qualquer caractere até encontrar literalmente `$material$` de novo
- Você pode escrever Excel/HTML/JS livremente sem se preocupar com escape

**Para os outros parâmetros menores** (slug, topic_name, title, resumo) — pode continuar usando `'...'` normal (eles são curtos e não têm aspas internas).

**Se o resumo (p_resumo) tiver aspas internas**, também use dollar-quoting:
```sql
  $resumo$Aqui posso usar ' aspas e ; semicolons livremente$resumo$
```

---

### 🚫 NUNCA inclua comandos SQL como exemplo dentro do conteúdo markdown
**ERRO CRÍTICO COMETIDO ANTES — não repita.**

O conteúdo de cada material é inserido como string PostgreSQL via `E'...'`. Quando o conteúdo markdown contém comandos SQL completos como exemplo didático (em tabelas, code blocks ou texto), o **SQL Editor do Supabase pode interpretar mal** e tentar executar esses comandos como SQL real, gerando erros do tipo:

```
ERROR: 42P01: relation "servidores" does not exist
ERROR: 42P01: relation "policiais" does not exist
```

#### ❌ ERRADO — NÃO faça isso:
```markdown
| **SELECT** | Consulta dados | `SELECT nome FROM servidores WHERE cargo = ''Agente''` |
| **INSERT** | Insere registros | `INSERT INTO policiais (nome) VALUES (''João'')` |
| **CREATE TABLE** | Cria tabela | `CREATE TABLE servidores (id INT)` |
```

#### ✅ CORRETO — Use placeholders genéricos sem aspas internas:
```markdown
| **SELECT** | Consulta dados | SELECT nome FROM tabela_exemplo WHERE cargo = X |
| **INSERT** | Insere registros | INSERT INTO tabela_exemplo (nome) VALUES (Y) |
| **CREATE TABLE** | Cria tabela | CREATE TABLE tabela_exemplo (id INT) |
```

**Regras gerais para conteúdo com SQL didático:**
1. **NÃO** use backticks ` ao redor de exemplos SQL no conteúdo
2. **NÃO** use aspas (simples ou duplas) dentro de exemplos SQL
3. Use nomes genéricos: `tabela_exemplo`, `coluna_x`, `valor_y` — NUNCA `servidores`, `policiais`, `usuarios`, ou outras palavras que possam coincidir com tabelas reais
4. Para mostrar comandos SQL longos, descreva em prosa em vez de bloco de código
5. O mesmo vale para JavaScript/HTML — evite aspas e palavras-chave que o parser PG possa interpretar

**Antes de gerar o arquivo SQL final, sempre faça mentalmente este check:**
- Há comandos `SELECT/INSERT/UPDATE/DELETE/CREATE/DROP` dentro do conteúdo markdown? → REESCREVA
- Há aspas simples dentro de aspas simples (mesmo escapadas com `''`) em exemplos didáticos? → REESCREVA
- O conteúdo tem nomes de tabelas que poderiam existir no banco (servidores, policiais, usuarios, materiais)? → SUBSTITUA por placeholders

### ✅ SEMPRE crie branches para experimentos
```bash
cd /Users/joaolucas/gabaritai/apps/web
git checkout -b antigravity-<descricao-da-tarefa>
```

### ✅ SEMPRE rode `git status` antes e depois de mudanças
Garante que você só commita o que pretende.

---

## 5. PADRÕES DE CÓDIGO E ARQUIVO

### Tabelas chave no Supabase

#### `topics`
```
(id, subjectId, name, slug, weight, order, createdAt)
```
**IMPORTANTE: NÃO tem coluna `updatedAt`.** Se INSERT/UPDATE tentar setar updatedAt, dá erro.

#### `materials`
```
(id, subjectId, topicId, cacheKey, title, type, content, active, status, origin, createdAt, updatedAt)
```
- `cacheKey` segue o padrão: `'topic-' || topicId`
- `status`: enum `MaterialStatus` (DRAFT, REVIEWED, PUBLISHED)
- **PRESERVE status REVIEWED/PUBLISHED** ao fazer upsert (não sobrescrever para DRAFT)

#### `material_resumos`
```
(id, materialId, resumo, generatedBy, generatedAt)
```
- 1:1 com materials (uniqueIndex em materialId)

---

## 6. PADRÃO SQL PARA NOVOS MATERIAIS

**TEMPLATE OBRIGATÓRIO** para criar materiais. Copie de:
```
/Users/joaolucas/gabaritai/apps/web/prisma/migrations/2026-06-07-granular-penal-batch1.sql
```

### Estrutura esperada:

```sql
-- Header com descrição

CREATE OR REPLACE FUNCTION upsert_material(
  p_subject_slug text, p_topic_name text, p_title text, p_content text, p_resumo text
) RETURNS void AS $func$
DECLARE
  v_topic_id text; v_subject_id text; v_material_id text; v_cache_key text;
BEGIN
  SELECT t.id, t."subjectId" INTO v_topic_id, v_subject_id
  FROM "topics" t JOIN "subjects" s ON s.id = t."subjectId"
  WHERE s.slug = p_subject_slug AND t.name = p_topic_name LIMIT 1;
  IF v_topic_id IS NULL THEN
    RAISE NOTICE 'Tópico não encontrado: % / %', p_subject_slug, p_topic_name;
    RETURN;
  END IF;
  v_cache_key := 'topic-' || v_topic_id;
  INSERT INTO "materials" (id, "subjectId", "topicId", "cacheKey", title, type, content, active, status, origin, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_subject_id, v_topic_id, v_cache_key, p_title, 'TEXTO', p_content, true, 'DRAFT', 'ai', NOW(), NOW())
  ON CONFLICT ("cacheKey") DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    status = CASE WHEN "materials".status IN ('REVIEWED', 'PUBLISHED') THEN "materials".status ELSE 'DRAFT'::"MaterialStatus" END,
    "updatedAt" = NOW()
  RETURNING id INTO v_material_id;
  IF v_material_id IS NULL THEN
    SELECT id INTO v_material_id FROM "materials" WHERE "cacheKey" = v_cache_key;
  END IF;
  INSERT INTO "material_resumos" (id, "materialId", resumo, "generatedBy", "generatedAt")
  VALUES (gen_random_uuid()::text, v_material_id, p_resumo, 'ai', NOW())
  ON CONFLICT ("materialId") DO UPDATE SET resumo = p_resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- Para CADA material (8 por batch):
SELECT upsert_material(
  'slug-da-materia',         -- ex: 'lingua-portuguesa'
  'Nome Exato do Tópico',    -- deve bater com topics.name
  'Título do Material',
  E'# Markdown do conteúdo aqui\n\n... 1500-2000 palavras ...',
  'Resumo de 1-2 parágrafos do material'
);

-- Limpeza no fim:
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
```

### Características do conteúdo
- **1500-2000 palavras por material** (denso, didático)
- **Markdown puro** (vai ser renderizado no front)
- Estrutura: introdução → conceitos → exemplos → tópicos de prova → conclusão
- Tom: **acessível mas técnico**, voltado para concursando
- Inclua **legislação pertinente**, jurisprudência (STF/STJ), súmulas relevantes
- Termine sempre com seção **"Tópicos de prova"** com pegadinhas frequentes

### Nome do arquivo SQL
Padrão: `YYYY-MM-DD-granular-<materia>-batch<N>.sql`

Exemplos:
- `2026-06-08-granular-portugues-batch1.sql`
- `2026-06-08-granular-informatica-batch1.sql`
- `2026-06-08-granular-rlm-batch1.sql`

---

## 7. SUBJECTS (MATÉRIAS) E SLUGS

Slugs existentes no banco (verifique antes de usar):

- `direito-administrativo` ✅ COMPLETO (84 materiais)
- `direito-penal` ⏳ EM PRODUÇÃO (16 materiais)
- `direito-constitucional` ⏳ pendente
- `direito-processual-penal` ⏳ pendente
- `direito-civil` ⏳ pendente
- `direito-processual-civil` ⏳ pendente
- `direito-tributario` ⏳ pendente
- `lingua-portuguesa` ⏳ pendente
- `informatica` ⏳ pendente
- `raciocinio-logico-matematico` ⏳ pendente
- `atualidades` ⏳ pendente
- `direitos-humanos` ⏳ pendente

**Antes de criar material, verifique se subject e topic existem no Supabase.** A função SQL já dá `RAISE NOTICE` se não encontrar — mas é melhor verificar antes.

---

## 8. DIVISÃO DE TRABALHO (com Claude Code)

### Antigravity (você) faz:
- **Português, Informática, RLM, Atualidades** (matérias mais padronizadas)
- **Landing pages** (HTML/CSS/JS simples) para projetos paralelos
- **Editar imagens** com Nano Banana (banners, capas de material)
- **Componentes React simples** isolados
- **Documentação interna** (README, guias)

### Claude Code faz:
- **Materiais de Direito** (Penal, Const, Processual — precisão jurídica)
- **Refatorações complexas** do Gabaritai
- **Bugs de integração** Supabase/Prisma
- **APIs novas** com lógica de negócio
- **Migrations de schema**

### NotebookLM (incluído no Google AI Pro) faz:
- **Áudios dos materiais** prontos (carrega o markdown, gera podcast)
- Diferencial: aluno escuta material no carro/academia

---

## 9. COMANDOS GIT COMUNS

```bash
# Sempre comece criando branch
cd /Users/joaolucas/gabaritai/apps/web
git checkout -b antigravity-<tarefa>

# Após mudanças, sempre revise
git status
git diff

# Commit (mensagem clara)
git add <arquivos-especificos>
git commit -m "feat: descrição clara"

# Volta para main e faz merge só após revisão do João
git checkout main
git merge antigravity-<tarefa>
git push origin main
```

**NÃO use `git add -A` ou `git add .`** — pode pegar arquivos sensíveis. Adicione arquivos por nome.

---

## 10. DEPLOY E TESTES

- **Vercel** faz deploy automático ao push em `main`
- **NÃO** rode `npm run build` localmente para "testar deploy" — demora e gasta CPU
- Para testar mudanças, rode `npm run dev` em `/apps/web/`
- TypeScript checa tipos: `npm run typecheck`

---

## 11. WORKFLOW IDEAL

Quando o João pedir uma tarefa nova:

1. **Confirme entendimento**: repita o que entendeu antes de começar
2. **Crie branch**: `git checkout -b antigravity-<tarefa>`
3. **Faça pequenas mudanças**: prefira commits incrementais
4. **Mostre o resultado** ao João antes de mergear pra main
5. **Aguarde aprovação** antes de qualquer git push em main
6. **Documente** o que mudou (no commit message + se preciso, README)

---

## 12. EM CASO DE DÚVIDA

**Quando não souber**, NÃO invente. Pergunte ao João:
- "Esse arquivo já existe? Devo sobrescrever?"
- "Esse subject slug existe no banco?"
- "Posso alterar essa configuração ou prefere que eu pergunte ao Claude?"

Melhor parar e perguntar do que quebrar produção.

---

## 13. ARQUIVOS DE REFERÊNCIA

Estude estes arquivos para entender padrões:

| O que ver | Arquivo |
|---|---|
| Padrão SQL de materiais | `apps/web/prisma/migrations/2026-06-07-granular-penal-batch1.sql` |
| Schema do banco | `apps/web/prisma/schema.prisma` |
| Layout admin | `apps/web/src/app/(admin)/admin/layout.tsx` |
| Layout dashboard | `apps/web/src/app/(dashboard)/dashboard/layout.tsx` |
| API materials | `apps/web/src/app/api/admin/materials/` |
| Página de material | `apps/web/src/app/(dashboard)/dashboard/material/[topicId]/` |

---

## 14. CONTATO E HISTÓRICO

Proprietário: **João Lucas**
- E-mail: j.lucas.jol45@gmail.com
- GitHub: Lucascarvalho20
- Repo: github.com/Lucascarvalho20/gabaritai

Para histórico de decisões e contexto profundo, consultar:
- `/Users/joaolucas/.claude/projects/-Users-joaolucas-gabaritai/memory/` (memórias do Claude Code)

---

## 15. FILA DE TAREFAS — Próximos Batches a Produzir

> **Status:** atualizada em 2026-06-09
> Trabalhe na ordem abaixo. Quando concluir um batch, mostre o arquivo ao João para revisar ANTES de commitar. Aguarde aprovação.

### ✅ JÁ ENTREGUE PELO ANTIGRAVITY
- [x] Português Batch 1 — 8 materiais (concordância, regência, crase, colocação, pontuação, compreensão, ortografia, formação de palavras)
- [x] Português Batch 2 — 8 materiais (acentuação, sinonímia/antonímia, sintaxe, tipologia, coesão/coerência, equivalência, paralelismo, redação oficial)
- [x] RLM Batch 1 — 8 materiais (raciocínio lógico-matemático)
- [x] Direitos Humanos Batch 1 — 8 materiais
- [x] Informática Batch 1 — 8 materiais (CORRIGIDO após erro de SQL embutido)

### 🎯 PRÓXIMAS TAREFAS NA ORDEM

#### TAREFA 1 — Informática Batch 2 (8 materiais)
Verifique no banco quais tópicos de `informatica` ainda não têm material e cubra os 8 mais cobrados em concursos policiais. Sugestões prováveis (verifique antes):
1. Computação em Nuvem (IaaS, PaaS, SaaS, modelos público/privado/híbrido)
2. Backup e Recuperação de Dados (tipos, mídias, estratégia 3-2-1)
3. Compactação de Arquivos (ZIP, RAR, 7Z, formatos)
4. Hardware (CPU, memória RAM, HD/SSD, periféricos)
5. Sistemas de Arquivos (NTFS, FAT32, exFAT, ext4)
6. Redes Sociais e Comunicação Digital
7. Crimes Cibernéticos (Lei 12.737/12 - Carolina Dieckmann, Lei 14.155/21)
8. LGPD para concursos (princípios, agentes, direitos do titular)

Arquivo: `2026-06-08-granular-informatica-batch2.sql`
⚠️ **CUIDADO:** não inclua comandos SQL/HTML/JS como exemplo no conteúdo markdown (ver seção 4)

#### TAREFA 2 — RLM Batch 2 (8 materiais)
Tópicos de Raciocínio Lógico-Matemático faltantes. Sugestões:
1. Proposições e Lógica Sentencial (operadores, tabelas-verdade)
2. Tautologia, Contradição e Contingência
3. Equivalências Lógicas (De Morgan, contrapositiva)
4. Argumentos Lógicos e Validade
5. Quantificadores (universal e existencial)
6. Sequências Lógicas (numéricas, alfanuméricas, figurais)
7. Análise Combinatória (princípio fundamental, permutação, combinação, arranjo)
8. Probabilidade (espaço amostral, eventos, independência)

Arquivo: `2026-06-08-granular-rlm-batch2.sql`

#### TAREFA 3 — Atualidades Batch 1 (8 materiais)
Verifique tópicos de `atualidades` no banco. Sugestões:
1. Política Internacional Contemporânea
2. Geopolítica Brasileira
3. Mudanças Climáticas e Sustentabilidade
4. Tecnologia e Inteligência Artificial
5. Economia Brasileira (PIB, inflação, taxa Selic)
6. Conflitos Internacionais Atuais
7. Brasil e Mercosul
8. Direitos Humanos no Mundo Contemporâneo

Arquivo: `2026-06-08-granular-atualidades-batch1.sql`

#### TAREFA 4 — Direitos Humanos Batch 2 (8 materiais)
Continue cobrindo tópicos de `direitos-humanos` não cobertos no Batch 1. Foque em:
1. Declaração Universal dos Direitos Humanos (DUDH) - artigos completos
2. Pacto Internacional sobre Direitos Civis e Políticos
3. Pacto Internacional sobre Direitos Econômicos, Sociais e Culturais
4. Convenção Americana de Direitos Humanos (Pacto de São José)
5. Corte Interamericana de Direitos Humanos
6. Direitos Humanos e Segurança Pública
7. Uso da Força e Diretrizes Internacionais (Princípios Básicos da ONU)
8. Direitos das Pessoas Privadas de Liberdade

Arquivo: `2026-06-08-granular-dh-batch2.sql`

#### TAREFA 5 — Português Batch 3 (8 materiais)
Tópicos restantes de `lingua-portuguesa`:
1. Morfossintaxe
2. Funções de Linguagem
3. Figuras de Linguagem
4. Discurso Direto, Indireto e Indireto Livre
5. Pronomes (pessoais, possessivos, demonstrativos, relativos)
6. Verbos (modos, tempos, vozes, conjugação)
7. Estrutura e Formação de Palavras (composição e derivação)
8. Plural de Substantivos e Adjetivos

Arquivo: `2026-06-08-granular-portugues-batch3.sql`

#### TAREFA 6 — RLM Batch 3 (8 materiais)
Tópicos avançados:
1. Estatística Descritiva (média, mediana, moda, desvio padrão)
2. Razão e Proporção (regra de três simples e composta)
3. Porcentagem (descontos, acréscimos, juros simples)
4. Juros Compostos
5. Sistemas de Equações
6. Geometria Plana (áreas e perímetros)
7. Lógica de Argumentação (silogismos)
8. Conjuntos (operações, diagramas de Venn)

Arquivo: `2026-06-08-granular-rlm-batch3.sql`

#### TAREFA 7 — Informática Batch 3 (8 materiais)
Tópicos avançados:
1. Modelos OSI e TCP/IP detalhados
2. DNS e Servidores Web
3. Firewall e IDS/IPS
4. VPN (tipos, protocolos)
5. Criptografia avançada (RSA, AES, hash MD5/SHA)
6. Certificação Digital e ICP-Brasil
7. Vírus e Antivírus (heurística, sandbox)
8. Engenharia Social e Phishing avançado

Arquivo: `2026-06-08-granular-informatica-batch3.sql`

---

### 📋 REGRAS DE TRABALHO NA FILA

1. **Trabalhe na ordem**: termine um batch antes de iniciar o próximo
2. **Verifique tópicos no banco** antes de gerar o SQL — se o nome não bater, pergunte ao João
3. **Mostre o arquivo gerado** ao João antes de commitar — aguarde aprovação
4. **Crie branch separada** para cada batch: `antigravity-<materia>-batch<N>`
5. **NÃO inclua SQL embutido no conteúdo** — ver seção 4 do CONTEXT
6. **Cada material 1500-2000 palavras**
7. **Seção "Como cai em prova" obrigatória** com 2-3 questões CESPE/FGV/VUNESP comentadas
8. **Foco em concursos policiais** (PF, PRF, PCDF, PCSP, PMDF, PMGO)

### 🚦 STATUS DE EXECUÇÃO

Sempre que terminar um batch, atualize o status desta lista (marque com [x]) no próximo commit. Assim o João sabe onde paramos.

---

**Bem-vindo ao projeto. Trabalhe com cuidado, pergunte quando tiver dúvida, e respeite as regras críticas acima.**
