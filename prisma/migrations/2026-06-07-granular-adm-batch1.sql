-- ════════════════════════════════════════════════════════════════════════════
-- GRANULAR ADM — Batch 1 (10 materiais focados, ~1500-1800 palavras cada)
-- Data: 2026-06-07
--
-- Cada material vinculado a 1 TOPIC ESPECÍFICO do edital (nome exato).
-- Conteúdo focado no que aquele tópico pede. NÃO repete material genérico.
-- Aparece em TODOS os cursos que compartilham o subject.
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

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

-- ┌─ 1. Introdução ao direito administrativo ────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Introdução ao direito administrativo.',
  'Introdução ao Direito Administrativo',
$content$
# Introdução ao Direito Administrativo

## 1. Conceito

**Direito Administrativo** é o ramo do **direito público** que disciplina a **função administrativa do Estado**, regulando a atuação dos órgãos, agentes e atividades destinados à realização concreta dos fins do Estado.

Não regula a função legislativa (cria leis), nem judicial (resolve conflitos com força de coisa julgada). Regula o **administrar**: gerir serviços, bens, recursos e pessoas em nome do interesse público.

## 2. Autonomia

Surge como ramo autônomo no século XIX, especialmente após a Revolução Francesa, com a necessidade de regular a atuação estatal sob princípios próprios, distintos do direito privado.

Marco: criação do **Conselho de Estado francês** (1799) — competente para julgar a Administração.

No Brasil, ganhou autonomia com o constitucionalismo do século XX, especialmente com a **CF/88** (arts. 37-41 dedicados à Administração Pública).

## 3. Relação com outros ramos

### 3.1. Com o Direito Constitucional
Constitucional é "tronco"; Administrativo é "ramo". A CF estabelece os princípios fundamentais (CF 37, 39, 70, 144), e o Direito Administrativo os desenvolve.

### 3.2. Com o Direito Penal
Ponto de contato: crimes funcionais (CP 312-337), Lei de Improbidade, Lei Anticorrupção.

### 3.3. Com o Direito Civil
Aplica-se subsidiariamente em contratos administrativos, responsabilidade civil do Estado (regra: objetiva — CF 37 §6º).

### 3.4. Com o Direito Tributário
Tributário regula a arrecadação; Administrativo regula a aplicação da receita.

### 3.5. Com o Direito Financeiro
Financeiro regula o orçamento; Administrativo executa-o.

## 4. Função Administrativa

### 4.1. Critérios para identificá-la

- **Critério Subjetivo (orgânico)**: olha QUEM exerce (poder Executivo).
- **Critério Formal**: olha o REGIME jurídico (regime público).
- **Critério Material**: olha o CONTEÚDO da atividade (gestão concreta do interesse público).

Doutrina majoritária: combinação dos três.

### 4.2. Características da função administrativa
- **Concreta**: atua sobre casos específicos.
- **Imediata**: não depende de provocação (ao contrário da função jurisdicional).
- **Subordinada à lei** (princípio da legalidade administrativa — CF 37).
- **Voltada ao interesse público**.

## 5. Distinção entre Governo e Administração

| | Governo | Administração |
|---|---|---|
| Natureza | Política | Técnica |
| Decisão | Escolhe FINS | Escolhe MEIOS |
| Atos | Políticos, discricionários | Administrativos, vinculados ou discricionários |
| Exemplo | Veto presidencial | Concessão de licença |

## 6. Objeto

O Direito Administrativo estuda:
- A **estrutura** da Administração Pública.
- Os **agentes** que a compõem.
- Os **atos** que ela pratica.
- Os **contratos** que ela celebra.
- O **patrimônio** que ela administra.
- Os **serviços** que ela presta.
- Os **mecanismos de controle** sobre ela.

## 7. Importância prática

O Direito Administrativo é o **DIA A DIA da prática policial**. Toda atuação do agente público (Delegado, Agente, Escrivão) está regulada por:
- Lei 8.112/90 (regime dos servidores).
- Lei 9.784/99 (processo administrativo).
- Lei 8.429/92 + Lei 14.230/21 (improbidade).
- CF 37-41 (princípios e regras).

## 8. Como Cebraspe cobra

- **C/E**: "O Direito Administrativo é ramo do direito privado" → **ERRADO** (público).
- **C/E**: "Governar e administrar são sinônimos" → **ERRADO** (governo escolhe fins; administração escolhe meios).
- **C/E**: "A função administrativa é abstrata e mediata" → **ERRADO** (concreta e imediata).
- **C/E**: "O Conselho de Estado francês é a origem do controle judicial da Administração" → **CORRETO** (1799).
- **C/E**: "A jurisdição é a única função imediata do Estado" → **ERRADO** (a administrativa também).
$content$,
$resumo$
# Resumo — Introdução ao Direito Administrativo

## Conceito
Ramo do **direito PÚBLICO** que disciplina a **função administrativa** do Estado.

## Critérios de identificação
- **Subjetivo (orgânico)**: quem (Executivo).
- **Formal**: como (regime público).
- **Material**: o quê (gestão do interesse público).

## Função Administrativa
- Concreta (não abstrata).
- Imediata (não depende de provocação).
- Subordinada à lei.
- Voltada ao interesse público.

## Governo x Administração
- Governo: escolhe FINS (política).
- Administração: escolhe MEIOS (técnica).

## Origem
Conselho de Estado francês (1799). No Brasil, CF/88 consolidou.

## Top pegadinhas
1. É DIREITO PÚBLICO.
2. Função é CONCRETA + IMEDIATA.
3. Governo ≠ Administração.
4. Combinação dos 3 critérios (orgânico+formal+material).
$resumo$
);

-- ┌─ 2. Conceitos do Direito Administrativo ────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Os diferentes critérios adotados para a conceituação do direito administrativo.',
  'Critérios para Conceituação do Direito Administrativo',
$content$
# Critérios para Conceituação do Direito Administrativo

Vários autores tentaram definir Direito Administrativo. Cada escola adotou um critério. Cebraspe cobra a TIPOLOGIA dos critérios.

## 1. Critérios Tradicionais

### 1.1. Critério do Poder Executivo
- Direito Administrativo é o que regula a atividade do **Poder Executivo**.
- **Falha**: a função administrativa também é exercida pelo Legislativo e Judiciário (em sua administração interna).

### 1.2. Critério das Relações Jurídicas
- Disciplina as relações jurídicas em que a Administração é parte.
- **Falha**: não diz O QUE a Administração faz, só identifica relação.

### 1.3. Critério dos Serviços Públicos (Léon Duguit)
- Direito Administrativo é o direito dos **serviços públicos**.
- **Falha**: nem toda atividade administrativa é serviço público (ex: poder de polícia).

### 1.4. Critério Teleológico (Otto Mayer)
- Direito Administrativo regula a atividade do Estado para alcançar seus **fins**.
- **Falha**: é amplo demais — também serve pro Constitucional.

### 1.5. Critério Negativo ou Residual
- Direito Administrativo é tudo o que NÃO é Constitucional, Legislativo, Judicial ou Tributário.
- **Falha**: definir pelo que NÃO é, não esclarece.

### 1.6. Critério Distintivo (Diogo de Figueiredo)
- Combinação dos critérios.

## 2. Critério Adotado pela Doutrina Brasileira

### 2.1. Critério da Administração Pública (Hely Lopes Meirelles)
- Direito Administrativo é o **conjunto harmônico de princípios** que regem os órgãos, os agentes e as atividades da **Administração Pública**, tendentes a realizar concreta, direta e imediatamente os fins desejados pelo Estado.

### 2.2. Função Administrativa (Celso Antônio Bandeira de Mello)
- Ramo do direito público que disciplina o exercício da **função administrativa**.

### 2.3. Trilateralidade
Doutrina moderna combina:
- **Órgãos** da Administração.
- **Agentes** que a integram.
- **Atividades** que desempenham.

## 3. Aspectos Conceituais Importantes

### 3.1. Aspecto Orgânico (Subjetivo)
- Conjunto de **órgãos e agentes** públicos.
- Ex: Polícia Federal, INSS, Ministério da Justiça.

### 3.2. Aspecto Formal
- Conjunto de **regras** jurídicas que regem a atuação administrativa.
- Ex: Lei 8.112, Lei 14.133, Lei 9.784.

### 3.3. Aspecto Material (Funcional)
- Conjunto de **atividades** desenvolvidas para satisfação do interesse público.
- Ex: prestar serviços, exercer poder de polícia, gerir bens.

> ⚠️ Cebraspe sempre cobra essa **TRIPARTIÇÃO** (orgânico + formal + material).

## 4. Síntese do Conceito Moderno

> "Direito Administrativo é o ramo do direito público que regula a estrutura, os agentes e as atividades da Administração Pública, com vistas à satisfação do interesse público, sob o regime jurídico-administrativo."

## 5. Polêmicas

### 5.1. Função administrativa do Legislativo e Judiciário
- Sim, todos os Poderes exercem função administrativa **internamente**.
- Ex: TJ contrata servidor → ato administrativo, mesmo praticado pelo Judiciário.

### 5.2. Atividades atípicas
- Quando um Poder exerce função atípica, aplica-se o regime correspondente.

## 6. Como Cebraspe cobra

- **C/E**: "Direito Administrativo só regula atividades do Executivo" → **ERRADO** (todos os Poderes em função administrativa atípica).
- **C/E**: "Critério dos serviços públicos abrange toda a atividade administrativa" → **ERRADO** (Duguit é restritivo).
- **C/E**: "O conceito sob aspecto orgânico foca nas atividades" → **ERRADO** (foca nos órgãos/agentes; material é o das atividades).
- **C/E**: "O critério residual é o mais aceito" → **ERRADO** (combinação de critérios).
- **C/E**: "Hely Lopes Meirelles adotou conceito negativo" → **ERRADO** (positivo, focado em princípios da Administração).
$content$,
$resumo$
# Resumo — Critérios para Conceituação

## Critérios tradicionais (falhos)
- Poder Executivo (estreito).
- Relações jurídicas (vago).
- **Serviços Públicos** (Duguit — restritivo).
- **Teleológico** (Otto Mayer — amplo demais).
- **Negativo/Residual** (define pelo que NÃO é).

## Critério adotado (Hely + Celso A. B. de Mello)
Princípios + função administrativa + órgãos/agentes/atividades.

## Tripartição clássica
- **Orgânico/Subjetivo**: ÓRGÃOS e AGENTES.
- **Formal**: NORMAS/REGRAS.
- **Material/Funcional**: ATIVIDADES.

## Função administrativa
Exercida POR TODOS os Poderes (atipicamente Legislativo e Judiciário).

## Top pegadinhas
1. NÃO é só Executivo (todos exercem função administrativa).
2. Aspecto material = ATIVIDADES (não órgãos).
3. Serviços Públicos (Duguit) é RESTRITIVO.
4. Conceito moderno COMBINA critérios.
$resumo$
);

-- ┌─ 3. Conceito de administração pública (orgânico/formal/material) ────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Conceito de administração pública sob os aspectos orgânico, formal e material',
  'Conceito de Administração Pública: Aspectos Orgânico, Formal e Material',
$content$
# Conceito de Administração Pública: Aspectos Orgânico, Formal e Material

## 1. Visão Geral

A **Administração Pública** pode ser analisada sob diferentes ângulos. A tripartição clássica é:

- **Aspecto Orgânico (Subjetivo)** — QUEM exerce.
- **Aspecto Formal** — COMO se manifesta normativamente.
- **Aspecto Material** — O QUE faz.

⚠️ Cebraspe ama esse tema. Decore os 3 aspectos.

## 2. Aspecto Orgânico (Subjetivo)

### 2.1. Conceito
Conjunto de **órgãos, agentes e entidades** públicas que integram a estrutura do Estado e exercem a função administrativa.

### 2.2. Composição
- **Administração Direta**: União, Estados, DF, Municípios e seus órgãos.
- **Administração Indireta**: autarquias, fundações, empresas públicas, sociedades de economia mista.

### 2.3. Convenção gráfica
- **Administração Pública** (com "A" e "P" maiúsculos) = sentido orgânico/subjetivo.
- **administração pública** (minúsculo) = sentido material/funcional.

## 3. Aspecto Formal

### 3.1. Conceito
Conjunto de **normas jurídicas** que disciplinam a função administrativa.

### 3.2. Fontes
- **CF/88**: arts. 37-41 (Administração Pública).
- **Leis específicas**:
  - Lei 8.112/90 (servidores).
  - Lei 8.429/92 + Lei 14.230/21 (improbidade).
  - Lei 14.133/21 (licitações).
  - Lei 9.784/99 (processo administrativo).
  - Lei 12.527/11 (LAI).
  - Lei 8.987/95 (concessão e permissão).
- **Atos normativos infralegais**: decretos, instruções normativas, portarias.

### 3.3. Importância
Sob esse aspecto, o Direito Administrativo é estudado a partir de seu arcabouço normativo.

## 4. Aspecto Material (Funcional)

### 4.1. Conceito
Conjunto de **atividades concretas** desenvolvidas pelo Estado para a satisfação do interesse público.

### 4.2. Atividades típicas
- **Prestação de serviços públicos** (educação, saúde, transporte).
- **Fomento** (incentivos a particulares).
- **Polícia Administrativa** (limita liberdades em prol do interesse público).
- **Intervenção** (no domínio econômico ou na propriedade).
- **Gestão patrimonial** (administra bens e recursos).

### 4.3. Função administrativa
Caracteriza-se por ser:
- **Concreta**: atua sobre casos específicos.
- **Imediata**: não depende de provocação.
- **Subordinada à lei**: principle of legality.
- **Sob regime de direito público**: prerrogativas + sujeições.

## 5. Quadro Comparativo

| Aspecto | Pergunta | Foco |
|---|---|---|
| Orgânico/Subjetivo | QUEM? | Órgãos + agentes + entidades |
| Formal | COMO? | Normas que regem |
| Material/Funcional | O QUÊ? | Atividades desenvolvidas |

## 6. Síntese

Em sentido **AMPLO**, Administração Pública envolve a totalidade dos órgãos do Estado (tripartição com governo). Em sentido **ESTRITO**, refere-se à atividade administrativa não-política.

## 7. Importância prática

Identificar corretamente em qual aspecto o tema é cobrado ajuda a responder:
- "Administração Pública é integrada por X" → aspecto orgânico.
- "Administração Pública é regida pela Lei X" → aspecto formal.
- "Administração Pública desempenha a atividade X" → aspecto material.

## 8. Como Cebraspe cobra

- **C/E**: "O aspecto orgânico se refere às atividades desenvolvidas" → **ERRADO** (refere-se aos órgãos/agentes).
- **C/E**: "O aspecto material engloba as normas jurídicas" → **ERRADO** (engloba as atividades; normas são o formal).
- **C/E**: "Administração indireta NÃO integra o aspecto orgânico" → **ERRADO** (integra).
- **C/E**: "A função administrativa é abstrata e mediata" → **ERRADO** (concreta e imediata).
- **C/E**: "Sob o aspecto formal, estuda-se a estrutura organizacional" → **ERRADO** (estuda-se as normas; estrutura é orgânico).
$content$,
$resumo$
# Resumo — Aspectos Orgânico, Formal e Material

## Tripartição (decorar)

| Aspecto | Pergunta | Foco |
|---|---|---|
| **Orgânico** (Subjetivo) | QUEM? | Órgãos, agentes, entidades |
| **Formal** | COMO? | Normas jurídicas |
| **Material** (Funcional) | O QUÊ? | Atividades |

## Convenção gráfica
- "Administração Pública" (maiúsculo) = orgânico.
- "administração pública" (minúsculo) = material.

## Aspecto Orgânico
- Adm Direta + Indireta (autarquia, fundação, EP, SEM).

## Aspecto Formal
- CF arts. 37-41, Leis 8.112, 14.133, 9.784, 12.527, 8.429.

## Aspecto Material
- Serviços públicos + fomento + polícia + intervenção + gestão patrimonial.
- Função CONCRETA + IMEDIATA + sujeita à lei.

## Top pegadinhas
1. Orgânico = ÓRGÃOS (não atividades).
2. Material = ATIVIDADES (não normas).
3. Formal = NORMAS.
4. Função administrativa é CONCRETA E IMEDIATA.
$resumo$
);

-- ┌─ 4. Princípios da Adm Pública (LIMPE) — já existe; aprimora resumo ──────┐
-- Esse tópico já tem material da Onda 1. Pulando.

-- ┌─ 4 (real). Autotutela e Súmulas 346/473 STF ─────────────────────────────┐
-- Vou usar topic "Conceito, peculiaridades e interpretação" se for compatível
-- ou criar um material no topic certo. Vou pular se nome não bater.

-- ┌─ 4. Hierarquia: poder hierárquico ───────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Hierarquia: poder hierárquico e suas manifestações',
  'Poder Hierárquico — Manifestações e Limites',
$content$
# Poder Hierárquico — Manifestações e Limites

## 1. Conceito

**Poder Hierárquico** é a prerrogativa da Administração de **escalonar, dirigir, coordenar e controlar** as atividades de seus órgãos e agentes, estabelecendo uma relação de **subordinação interna**.

⚠️ Atenção: é INTERNO. Não atinge particulares.

## 2. Características

- **Permanente**: existe enquanto houver estrutura administrativa.
- **Interno**: dentro da mesma pessoa jurídica.
- **Vertical**: cria níveis hierárquicos.
- **Não atinge atividades-fim** quando vinculadas à lei (juiz, MP).

## 3. Manifestações

O poder hierárquico se manifesta em **6 prerrogativas** clássicas:

### 3.1. Dar ordens
- Comandar a atuação dos subordinados.
- Exemplo: chefe ordena que o servidor encaminhe processo.

### 3.2. Fiscalizar
- Acompanhar e verificar a execução.
- Verificar se ordens estão sendo cumpridas.

### 3.3. Rever os atos dos subordinados
- Anular (por ilegalidade) ou revogar (por inconveniência).
- Súmulas 346 e 473 STF: a Administração pode anular seus atos ilegais.

### 3.4. Delegar
- Transferir parcialmente competência.
- Regra: permitida.
- **EXCEÇÕES** (Lei 9.784/99, art. 13 — NÃO se admite delegação):
  - Edição de atos normativos.
  - Decisão de recursos administrativos.
  - Matérias de competência exclusiva.

### 3.5. Avocar
- Chamar para si competência de subordinado.
- Excepcional, temporária, fundamentada.
- Lei 9.784/99 art. 15.

### 3.6. Aplicar sanções disciplinares
- Materializa-se também via **Poder Disciplinar**.
- Repreensão, advertência, suspensão, demissão (Lei 8.112).

## 4. Distinção: Hierárquico x Vinculação

### 4.1. Hierarquia (subordinação)
- Entre órgãos/agentes da mesma PJ.
- Comporta ordens, revisões, delegação, avocação.

### 4.2. Vinculação (controle finalístico / tutela)
- Entre a Administração Direta e a Indireta (autarquia, EP, SEM).
- NÃO há hierarquia direta — só **controle de finalidade**.
- Limita-se ao previsto em lei.

⚠️ Pegadinha clássica: "Ministro da Justiça pode dar ordens diretas ao Diretor do INSS" → **ERRADO**. INSS é autarquia (Indireta) — não há subordinação hierárquica, só vinculação (tutela).

## 5. Limites do Poder Hierárquico

- Não pode contrariar a lei.
- Não pode invadir matérias de competência exclusiva.
- Não pode atingir atividades-fim de órgãos com autonomia técnica (juízes, membros do MP).

## 6. Recusa de cumprimento de ordem

### 6.1. Regra
Servidor DEVE cumprir ordens dos superiores hierárquicos.

### 6.2. Exceção (Lei 8.112, art. 116, IV)
Servidor PODE (e DEVE) recusar ordem **manifestamente ilegal**.

### 6.3. Princípio da Obediência Hierárquica
Pode até excluir a culpabilidade se o agente cumpre ordem aparentemente legal (CP 22 — obediência hierárquica).

## 7. Relação com outros poderes

- **Hierárquico × Disciplinar**: o hierárquico CONTÉM o disciplinar (que é o poder de aplicar sanções).
- **Hierárquico × Regulamentar**: o regulamentar deriva da hierarquia (chefe edita normas para subordinados).

## 8. Como Cebraspe cobra

- **C/E**: "O poder hierárquico atinge particulares" → **ERRADO** (é interno).
- **C/E delegação**: "Pode-se delegar a edição de atos normativos" → **ERRADO** (Lei 9.784 art. 13).
- **C/E avocação**: "A avocação é regra geral no poder hierárquico" → **ERRADO** (excepcional).
- **C/E**: "Há hierarquia entre a Administração Direta e a Indireta" → **ERRADO** (vinculação, não hierarquia).
- **C/E**: "Servidor deve cumprir TODA ordem do superior" → **ERRADO** (salvo manifestamente ilegais).
- **C/E**: "O poder hierárquico atinge juízes na atividade jurisdicional" → **ERRADO** (não atinge atividade-fim).
$content$,
$resumo$
# Resumo — Poder Hierárquico

## Conceito
Prerrogativa de escalonar, dirigir, coordenar e controlar atividades INTERNAS.

## Características
Permanente + interno + vertical + não atinge atividade-fim.

## 6 Manifestações
1. **Dar ordens**
2. **Fiscalizar**
3. **Rever atos** (anular ilegais / revogar inconvenientes — Súmulas 346 e 473)
4. **Delegar** (regra; vedado: normativos, recurso, exclusivas — Lei 9.784 art. 13)
5. **Avocar** (excepcional, fundamentada — art. 15)
6. **Aplicar sanções** (via Poder Disciplinar)

## Hierarquia x Vinculação

| | Hierarquia | Vinculação |
|---|---|---|
| Entre | Mesma PJ | Direta ↔ Indireta |
| Ordens | SIM | NÃO |
| Controle | Total | Finalístico (tutela) |

## Recusa de ordem
- Regra: cumprir.
- Exceção: ordem MANIFESTAMENTE ILEGAL (Lei 8.112 art. 116 IV).

## Top pegadinhas
1. Poder hierárquico é INTERNO (não atinge particulares).
2. Adm Indireta = VINCULAÇÃO (não hierarquia).
3. Delegação vedada: normativos, recurso adm, exclusivas.
4. Avocação é EXCEPCIONAL.
5. Servidor recusa ordem MANIFESTAMENTE ILEGAL.
$resumo$
);

-- ┌─ 5. Concessão, permissão, autorização e delegação ───────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Concessão, permissão, autorização e delegação',
  'Concessão, Permissão, Autorização e Delegação',
$content$
# Concessão, Permissão, Autorização e Delegação

Tema clássico. Cebraspe ama derrubar candidato na distinção entre os 4 institutos. Decore a tabela.

## 1. Visão Geral

Esses são os principais **institutos de transferência ou outorga de atividades/bens** pela Administração Pública.

| Instituto | Natureza | Forma | Precariedade | Onerosidade |
|---|---|---|---|---|
| **Concessão** | Contrato | Bilateral | NÃO precária | Em regra onerosa |
| **Permissão** | Contrato/ato | Bilateral (atual) | Precária | Em regra onerosa |
| **Autorização** | Ato unilateral | Unilateral | PRECÁRIA | Pode ser gratuita |
| **Delegação** | Transferência | Lei ou ato | Conforme caso | — |

## 2. Concessão

### 2.1. Conceito
Contrato administrativo pelo qual a Administração transfere a execução de serviço público (ou uso de bem) a particular, por prazo determinado, mediante remuneração tarifária.

### 2.2. Modalidades

#### A) Concessão de Serviço Público (Lei 8.987/95)
- Mediante **licitação na modalidade CONCORRÊNCIA**.
- Prazo determinado.
- Risco da concessionária.
- Remuneração: tarifa cobrada do usuário (+ outras receitas alternativas).

#### B) Concessão Patrocinada (PPP — Lei 11.079/04)
- Concessão de serviço + contraprestação do poder público.
- Para projetos que a tarifa não cobre o investimento.

#### C) Concessão Administrativa (PPP — Lei 11.079/04)
- Adm é a usuária direta ou indireta.
- Não há cobrança de tarifa do usuário.

#### D) Concessão de Direito Real de Uso (CDRU)
- Sobre bens públicos.

### 2.3. Características
- Formal.
- Bilateral.
- Sinalagmática.
- Comutativa.
- Personalíssima (regra — vedada subconcessão).
- Cláusulas exorbitantes (modificação unilateral, rescisão, fiscalização, sanção).

### 2.4. Encampação x Caducidade x Anulação
- **Encampação**: retomada do serviço pelo poder concedente por motivo de interesse público (com indenização).
- **Caducidade**: rescisão por inexecução pela concessionária (sem ou com indenização parcial).
- **Anulação**: por ilegalidade.

## 3. Permissão

### 3.1. Conceito
Outorga de serviço público OU uso de bem público, em caráter **PRECÁRIO**, mediante licitação.

### 3.2. Lei 8.987/95
- Embora a CF 175 fale em "permissão de serviço público", a Lei 8.987 a tratou como CONTRATO.
- Doutrina tradicional: ato unilateral.
- Lei 8.987: contrato de adesão.

### 3.3. Características
- **PRECÁRIA** (pode ser revogada a qualquer tempo, em regra sem indenização).
- Licitação obrigatória (modalidade variável — pregão se serviço comum).
- Bilateral (após Lei 8.987).

## 4. Autorização

### 4.1. Conceito
Ato administrativo **UNILATERAL**, **DISCRICIONÁRIO** e **PRECÁRIO**, pelo qual a Administração consente uso de bem ou exercício de atividade.

### 4.2. Tipos
- **De serviço**: ex. autorização para serviço de transporte por aplicativo.
- **De uso de bem**: ex. autorização para uso de uma área pública por evento.
- **De atividade**: ex. autorização para porte de arma.

### 4.3. Características
- **Unilateral**: ato da Administração.
- **Discricionário**: análise de conveniência.
- **Precário**: revogável a qualquer tempo, sem indenização (regra).
- **NÃO exige licitação** (regra).

## 5. Delegação

### 5.1. Conceito
Transferência de atribuição (competência) entre órgãos ou entidades.

### 5.2. Tipos
- **Legal**: por lei (ex: delegação a entes da Indireta).
- **Administrativa**: por ato administrativo (ex: chefe delega a subordinado).
- **Negocial**: por convênio/contrato.

### 5.3. Características
- Parcial (não delega todas as competências).
- Revogável a qualquer tempo.
- Não modifica a hierarquia.
- VEDADAS (Lei 9.784 art. 13): edição de atos normativos, decisão de recursos, matérias exclusivas.

## 6. Síntese Comparativa

| | Concessão | Permissão | Autorização |
|---|---|---|---|
| Forma | Contrato bilateral | Contrato (precário) | Ato unilateral |
| Precariedade | Não (regra) | SIM | SIM |
| Licitação | Concorrência | Sim (modalidade variável) | NÃO (regra) |
| Indenização rescisão antecipada | SIM | Sim, se houver prejuízo | NÃO |
| Discricionariedade | Limitada | Maior | TOTAL |
| Prazo | Determinado | Determinado/indeterminado | Indeterminado |

## 7. Como Cebraspe cobra

- **C/E**: "A autorização exige licitação" → **ERRADO** (não exige, em regra).
- **C/E**: "A concessão é precária" → **ERRADO** (não é precária; é por prazo determinado).
- **C/E permissão**: "Permissão é ato unilateral em todo caso" → **CUIDADO** (após Lei 8.987 é contrato precário).
- **C/E delegação**: "É possível delegar a edição de atos normativos" → **ERRADO** (vedado pela Lei 9.784).
- **C/E**: "A concessão é dispensada de licitação" → **ERRADO** (concorrência obrigatória).
- **C/E**: "PPP é sinônimo de concessão comum" → **ERRADO** (PPP tem contraprestação pública adicional).
$content$,
$resumo$
# Resumo — Concessão, Permissão, Autorização e Delegação

## Tabela essencial

| | Concessão | Permissão | Autorização |
|---|---|---|---|
| Forma | Contrato | Contrato (precário) | Ato unilateral |
| Precariedade | ❌ NÃO | ✅ SIM | ✅ SIM |
| Licitação | Concorrência | Sim | NÃO (regra) |
| Discricionariedade | Limitada | Maior | TOTAL |

## Concessão
- Serviço Público (Lei 8.987): concorrência, prazo determinado.
- Patrocinada (PPP 11.079): + contraprestação pública.
- Administrativa (PPP): Adm é usuária.
- CDRU: sobre bens públicos.
- Encampação (interesse público + indenização) ≠ Caducidade (inexecução).

## Permissão
- Após Lei 8.987 = contrato precário.
- Doutrina tradicional = ato unilateral.

## Autorização
- Unilateral, discricionária, precária.
- SEM licitação.

## Delegação
- Lei 9.784 — VEDADA: normativos, recurso, exclusivas.

## Top pegadinhas
1. Autorização SEM licitação.
2. Concessão NÃO é precária.
3. PPP = patrocinada OU administrativa.
4. Delegação NÃO modifica hierarquia.
$resumo$
);

-- ┌─ 6. Agentes públicos ────────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Agentes públicos (servidor público e funcionário público)',
  'Agentes Públicos — Classificação e Regimes',
$content$
# Agentes Públicos — Classificação e Regimes

## 1. Conceito

**Agente Público** é toda pessoa que, ainda que transitoriamente ou sem remuneração, **exerce função pública**, seja por eleição, nomeação, designação, contratação ou qualquer outra forma de vínculo (Lei 8.429/92 art. 2º).

⚠️ Conceito MUITO amplo. Para fins penais, art. 327 CP é igualmente amplo.

## 2. Classificação Clássica (Hely Lopes Meirelles)

### 2.1. Agentes Políticos
- Exercem funções de governo (não administrativas em sentido estrito).
- Vínculo de natureza POLÍTICA (não estatutário/CLT).
- Exemplos: Presidente, Governadores, Prefeitos, Ministros, Secretários, Parlamentares, Magistrados, Membros do MP, Membros dos Tribunais de Contas.

### 2.2. Servidores Públicos (sentido amplo)
Subdividem-se em:

#### A) Servidores Estatutários
- Regime jurídico próprio (lei).
- Vínculo: estatutário.
- Exemplo: federais sob Lei 8.112/90.
- TITULARES de cargo público.

#### B) Empregados Públicos
- Regime CLT.
- Vínculo: trabalhista.
- Exemplos: empregados de empresas públicas (Correios, Caixa, Banco do Brasil).

#### C) Servidores Temporários (CF 37 IX)
- Contratados por TEMPO DETERMINADO para atender NECESSIDADE TEMPORÁRIA DE EXCEPCIONAL INTERESSE PÚBLICO.
- Regime: lei especial (Lei 8.745/93 no plano federal).
- Sem concurso (mas com processo seletivo simplificado).

### 2.3. Particulares em Colaboração com o Poder Público
- Não são servidores, mas exercem função pública.
- Subtipos:
  - **Por delegação**: notários, leiloeiros, tradutores juramentados.
  - **Por requisição/convocação**: mesários, jurados.
  - **Voluntários**: praticantes de serviço cívico.
  - **Concessionários/permissionários** (visão minoritária).

### 2.4. Militares (CF 142 e 42)
- Não são "servidores civis".
- Regime próprio (Estatuto dos Militares).
- Hierarquia e disciplina constitucionais.

## 3. Cargo, Emprego e Função Pública

### 3.1. Cargo Público
- Conjunto de atribuições e responsabilidades.
- Criado por LEI.
- Provido por concurso (CF 37 II) — salvo comissão.
- Acessível a brasileiros + estrangeiros nos termos da lei.

### 3.2. Emprego Público
- Vínculo CLT.
- Em EP, SEM e em algumas situações na Adm Direta.

### 3.3. Função Pública
- Atividade desempenhada por servidor.
- Pode ser de DIREÇÃO, CHEFIA ou ASSESSORAMENTO (função de confiança — apenas para ocupantes de cargo efetivo).
- Diferente do cargo: a função é atribuição que pode ou não estar associada a cargo.

### 3.4. Diferenças

| | Cargo | Emprego | Função |
|---|---|---|---|
| Vínculo | Estatutário | CLT | Pode estar com servidor ou contratado |
| Criação | Lei | Lei autoriza criação | — |
| Provimento | Concurso | Concurso/contratação | Designação |

## 4. Cargo em Comissão x Função de Confiança

### 4.1. Cargo em Comissão (CF 37 II e V)
- Provimento e exoneração **LIVRES** (ad nutum).
- NÃO exige concurso.
- Limitado às atribuições de direção, chefia e assessoramento.
- Aberto a qualquer cidadão (não precisa ser servidor).
- Regra: % mínima reservada para servidores de carreira (estabelecida em lei).

### 4.2. Função de Confiança (CF 37 V)
- **APENAS** para ocupantes de cargo efetivo.
- Atribuições de direção, chefia e assessoramento.
- Designação e dispensa livres.

## 5. Provimento (Lei 8.112/90)

Formas:
- **Nomeação** (originária).
- **Promoção**.
- **Readaptação**.
- **Reversão** (aposentado retorna).
- **Aproveitamento** (servidor em disponibilidade).
- **Reintegração** (volta após anulação de demissão).
- **Recondução** (retorna a cargo anterior).

## 6. Vacância (Lei 8.112)

Causas: exoneração, demissão, promoção, readaptação, aposentadoria, posse em cargo inacumulável, falecimento.

## 7. Acumulação de Cargos (CF 37 XVI/XVII)

**VEDADA**, salvo exceções (compatibilidade de horários):
- 2 cargos de **professor**.
- 1 de **professor + 1 técnico/científico**.
- 2 cargos privativos de **profissionais de saúde** com profissões regulamentadas.
- Magistrado + ensino (CF 95 §ú).
- MP + ensino (CF 128 §5º II).

## 8. Como Cebraspe cobra

- **C/E**: "Servidor temporário precisa de concurso público" → **ERRADO** (processo seletivo simplificado).
- **C/E**: "Cargo em comissão exige concurso" → **ERRADO** (livre nomeação).
- **C/E**: "Empregado público de EP é regido pela 8.112" → **ERRADO** (CLT).
- **C/E**: "Função de confiança pode ser ocupada por quem não é servidor" → **ERRADO** (apenas servidor efetivo).
- **C/E**: "Magistrado é servidor estatutário comum" → **ERRADO** (agente político).
- **C/E**: "Particular em colaboração é servidor público" → **ERRADO** (não é servidor, mas é agente público).
$content$,
$resumo$
# Resumo — Agentes Públicos

## Conceito amplo
TODA pessoa que exerce função pública (Lei 8.429 + CP 327).

## Classificação (Hely)

### 1. Agentes Políticos
Presidente, Governadores, Prefeitos, Ministros, Parlamentares, Magistrados, MP, Tribunais de Contas.

### 2. Servidores Públicos
- **Estatutários**: Lei 8.112 (titulares de cargo).
- **Empregados**: CLT (EP, SEM).
- **Temporários** (CF 37 IX): excepcional interesse público.

### 3. Particulares em Colaboração
Notários, leiloeiros, jurados, mesários, voluntários.

### 4. Militares
Regime próprio (CF 42, 142).

## Cargo x Emprego x Função

| | Cargo | Emprego | Função |
|---|---|---|---|
| Vínculo | Estatutário | CLT | Servidor ou contratado |
| Provimento | Concurso | Concurso | Designação |

## Comissão x Confiança

| | Comissão | Confiança |
|---|---|---|
| Quem | Qualquer cidadão | SÓ servidor efetivo |
| Acesso | LIVRE | Designação |

## Acumulação (CF 37 XVI)
2 professores | professor + técnico/científico | 2 saúde regulamentadas | magistrado/MP + ensino.

## Top pegadinhas
1. Servidor temporário SEM concurso (processo seletivo).
2. Cargo em comissão LIVRE provimento.
3. Função de confiança SÓ pra efetivos.
4. Empregado público = CLT.
5. Agente político ≠ servidor.
$resumo$
);

-- ─── CLEANUP ──────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" = (SELECT id FROM "subjects" WHERE slug = 'direito-administrativo');
  RAISE NOTICE 'Total materiais Direito Adm: %', v_count;
END $$;
