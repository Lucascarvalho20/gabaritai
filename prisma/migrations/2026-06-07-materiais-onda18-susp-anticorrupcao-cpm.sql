-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 18 — Estatuto SUSP + Anticorrupção + CPM aprofundado
-- Data: 2026-06-07
-- FECHAMENTO de conteúdo policial.
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Leg Especial: Estatuto Geral das Polícias / SUSP (Lei 13.675/18) + PNSP
--  - Penal: Crimes contra Adm Pública aprofundado (CP 312-337) + Lei Anticorrupção 12.846/13
--  - Penal Militar: CPM Lei 1.001/69 + Lei 13.491/17 + Crimes Militares aprofundado
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Sistema Único de Segurança Pública (SUSP — Lei 13.675/18) e PNSP', 'leg-susp-pnsp', 1.4, 300, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Sistema Único de Segurança Pública (SUSP — Lei 13.675/18) e PNSP');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Crimes contra Administração Pública aprofundado + Lei Anticorrupção 12.846/13', 'pen-adm-publica-anticorrupcao', 1.5, 700, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Crimes contra Administração Pública aprofundado + Lei Anticorrupção 12.846/13');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal-militar';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'CPM (Lei 1.001/69) + Lei 13.491/17 + Crimes Militares aprofundado', 'penmil-cpm-13491-crimes-aprofundado', 1.5, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'CPM (Lei 1.001/69) + Lei 13.491/17 + Crimes Militares aprofundado');
  END IF;
END $topics$;

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
  ON CONFLICT ("materialId") DO UPDATE SET resumo = EXCLUDED.resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ┌─ 1. SUSP + PNSP ─────────────────────────────────────────────────────────┐
SELECT upsert_material(
  'legislacao-especial',
  'Sistema Único de Segurança Pública (SUSP — Lei 13.675/18) e PNSP',
  'Sistema Único de Segurança Pública (SUSP) e Política Nacional de Segurança Pública',
$content$
# Sistema Único de Segurança Pública (SUSP) e Política Nacional de Segurança Pública

Lei 13.675/18 instituiu o SUSP. Cebraspe cobra DIRETO da letra: composição, princípios, integração com a Política Nacional de Segurança Pública e Defesa Social (PNSPDS).

## 1. Base Constitucional (CF 144)

> "Art. 144 — A segurança pública, dever do Estado, direito e responsabilidade de todos, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio..."

### 1.1. Órgãos do art. 144 (rol TAXATIVO antes; expandido com EC 104/19 + EC 130/24)

1. **Polícia Federal**.
2. **Polícia Rodoviária Federal**.
3. **Polícia Ferroviária Federal**.
4. **Polícias Civis**.
5. **Polícias Militares + Corpos de Bombeiros Militares**.
6. **Polícias Penais** (federal, estaduais e do DF) — incluídas pela EC 104/19.

⚠️ Após EC 104/19, **Polícia Penal** entrou no rol. Concursos pós-2019 podem cobrar.

### 1.2. Atribuições principais

| Órgão | Atribuição |
|---|---|
| PF | Polícia da União; polícia judiciária da União; PMA (marítima/aeroportuária/fronteiras); reprimir tráfico drogas internacional |
| PRF | Patrulhamento rodovias FEDERAIS |
| PFF | Patrulhamento ferrovias federais |
| PC | Polícia judiciária estadual + apuração de infrações penais (salvo militares e da União) |
| PM | Polícia ostensiva + preservação da ordem pública |
| CBM | Defesa civil + extinção de incêndios |
| Polícia Penal | Segurança dos estabelecimentos penais |

### 1.3. Lei 13.675/18 — Visão geral

- Criada em 2018.
- Institui o **SUSP**.
- Cria a **PNSPDS** (Política Nacional de Segurança Pública e Defesa Social).
- Cria o **SINESP** (Sistema Nacional de Informações de Segurança Pública).

## 2. SUSP — Sistema Único de Segurança Pública

### 2.1. Integrantes (art. 9º)

#### Integrantes ESTRATÉGICOS
- Ministério da Justiça e Segurança Pública (coordenador).
- Conselho Nacional de Segurança Pública e Defesa Social.

#### Integrantes OPERACIONAIS
- Polícia Federal.
- Polícia Rodoviária Federal.
- Polícia Ferroviária Federal.
- Polícias Civis.
- Polícias Militares.
- Polícias Penais (federal, estaduais e DF).
- Corpos de Bombeiros Militares.
- Agentes penitenciários federais.
- **GUARDAS MUNICIPAIS** (incluídas).
- Secretarias estaduais e municipais de segurança pública.

⚠️ Guardas Municipais incluídas — importante novidade.

#### Integrantes ESPECIAIS
- Agentes de trânsito.
- Profissionais de outras áreas que tenham relação com segurança pública.
- **Agentes socioeducativos**.
- **Conselhos Tutelares**.

### 2.2. Princípios (art. 4º)

- Proteção dos direitos humanos.
- Resolução pacífica de conflitos.
- Eficiência, eficácia, qualidade.
- Profissionalização e valorização dos servidores.
- Inteligência e produção de conhecimento.
- Atendimento humanizado às vítimas.
- Participação social.
- Confidencialidade quando necessário.
- Integração entre os entes federativos.

### 2.3. Diretrizes (art. 6º)

- Atendimento imediato ao cidadão.
- **Planejamento estratégico** + emprego de inteligência.
- Padronização tecnológica e equipamentos.
- Mediação de conflitos.
- Política criminal racional.

## 3. PNSPDS — Política Nacional de Segurança Pública e Defesa Social

### 3.1. Objetivos (art. 5º)

- **Combater à criminalidade**.
- **Promover a integração**.
- **Garantir efetividade**.
- **Estimular e apoiar a integração** entre os entes federativos.
- **Promover gestão democrática**.

### 3.2. Instrumentos

- Plano Nacional de Segurança Pública e Defesa Social.
- Planos Estaduais.
- Planos Municipais.

### 3.3. Plano Nacional

- Vigência: **10 anos**.
- Aprovado por decreto.
- Estabelece metas, prioridades, ações.

## 4. SINESP — Sistema Nacional de Informações

### 4.1. Conceito

Sistema que reúne, integra e dissemina dados sobre segurança pública.

### 4.2. Banco de Dados

- Pessoas (suspeitos, vítimas, testemunhas).
- Ocorrências.
- Inquéritos.
- Mandados de prisão.
- Veículos.

### 4.3. Acesso

- Órgãos do SUSP.
- Compartilhamento conforme regras.

## 5. Conselho Nacional de Segurança Pública e Defesa Social

### 5.1. Composição

- Representantes dos órgãos federais, estaduais, municipais.
- Sociedade civil.

### 5.2. Atribuições

- Propor diretrizes.
- Avaliar políticas.
- Promover articulação.

## 6. Política Nacional vs. SUSP

| | PNSPDS | SUSP |
|---|---|---|
| O que é | Política (estratégia/plano) | Sistema (estrutura/integrantes) |
| Forma | Plano com metas | Conjunto de órgãos integrados |
| Vigência | 10 anos (Plano Nacional) | Permanente |

## 7. Como Cebraspe cobra

- **C/E**: "Guardas municipais NÃO integram o SUSP" → **ERRADO** (integram).
- **C/E**: "Polícia Penal está prevista no art. 144 CF antes da EC 104/19" → **ERRADO** (inserida pela EC).
- **C/E**: "SUSP e PNSPDS são sinônimos" → **ERRADO** (SUSP = sistema/órgãos; PNSPDS = política/plano).
- **C/E**: "Plano Nacional vigora por 4 anos" → **ERRADO** (10 anos).
- **C/E**: "PRF patrulha estradas estaduais" → **ERRADO** (federais).
- **C/E**: "Conselhos Tutelares integram o SUSP como integrante operacional" → **ERRADO** (especial).
$content$,
$resumo$
# Resumo — SUSP + PNSPDS

## CF 144 — Órgãos

| Órgão | Função |
|---|---|
| PF | Polícia da União, judiciária União, marítima/aeroportuária/fronteiras |
| PRF | Rodovias FEDERAIS |
| PFF | Ferrovias federais |
| PC | Polícia judiciária estadual |
| PM | Ostensiva, ordem pública |
| CBM | Defesa civil, incêndios |
| **Polícia Penal** | EC 104/19 — segurança estabelecimentos penais |

## Lei 13.675/18 cria:

1. **SUSP** (Sistema Único de Segurança Pública).
2. **PNSPDS** (Política Nacional Segurança Pública e Defesa Social).
3. **SINESP** (Sistema Nacional Informações).

## SUSP — Integrantes

### Estratégicos
MJSP + Conselho Nacional SP.

### Operacionais
PF, PRF, PFF, PC, PM, CBM, Polícia Penal, GUARDAS MUNICIPAIS, Sec. estaduais/municipais.

### Especiais
Agentes trânsito, agentes socioeducativos, Conselhos Tutelares.

⚠️ Guardas Municipais INTEGRAM.

## PNSPDS

- Plano Nacional: vigência **10 anos**.
- Aprovado por decreto.

## Top pegadinhas Cebraspe

1. Guardas Municipais INTEGRAM SUSP.
2. Polícia Penal entrou no 144 com EC 104/19.
3. SUSP ≠ PNSPDS (sistema ≠ política).
4. Plano Nacional = 10 anos.
5. PRF NÃO atua em estradas estaduais.
6. PF é polícia judiciária da União.
$resumo$
);

-- ┌─ 2. CRIMES CONTRA ADM PÚBLICA + ANTICORRUPÇÃO ───────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Crimes contra Administração Pública aprofundado + Lei Anticorrupção 12.846/13',
  'Crimes contra a Administração Pública (CP 312-337) e Lei Anticorrupção (12.846/13)',
$content$
# Crimes contra a Administração Pública e Lei Anticorrupção

Bloco crítico (cap. VIII do CP — arts. 312-337). Cebraspe cobra muito a definição de funcionário público (CP 327) + os tipos clássicos. Lei 12.846/13 é responsabilização CIVIL e ADMINISTRATIVA de PJ.

## 1. Funcionário Público (CP 327)

### 1.1. Conceito amplo

> "Considera-se funcionário público, para os efeitos penais, quem, embora transitoriamente ou sem remuneração, exerce cargo, emprego ou função pública."

### 1.2. Equiparados (CP 327 §1º)

- Quem exerce função em entidade paraestatal.
- Quem trabalha em empresa prestadora de serviço contratada/conveniada para atividade típica da Adm.

### 1.3. Causa de aumento (CP 327 §2º)

- Pena aumentada de 1/3 se autor é OCUPANTE de cargo em comissão OU de função de DIREÇÃO/ASSESSORAMENTO.

## 2. Crimes Praticados por Funcionário Público (CP 312-326)

### 2.1. Peculato (CP 312)

> "Apropriar-se o funcionário público de dinheiro, valor ou qualquer outro bem móvel, público ou particular, de que tem a posse em razão do cargo, ou desviá-lo, em proveito próprio ou alheio."

- **Pena**: reclusão 2-12 anos + multa.
- **§1º — Peculato-furto**: subtrai (não tem a posse).
- **§2º — Peculato culposo**: por culpa.
- **§3º**: reparação integral do dano ANTES da sentença → extingue punibilidade (peculato culposo).

### 2.2. Peculato mediante erro de outrem (CP 313)

### 2.3. Inserção de dados falsos em sistema de informações (CP 313-A)

### 2.4. Concussão (CP 316)

> "Exigir, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida."

- **Pena**: reclusão 2-12 anos + multa.
- Difere da corrupção: na concussão, o funcionário EXIGE (constrangimento); na corrupção, ele recebe vantagem oferecida.

### 2.5. Excesso de exação (CP 316 §1º)

### 2.6. Corrupção passiva (CP 317)

> "Solicitar ou receber, para si ou para outrem, direta ou indiretamente, ainda que fora da função, mas em razão dela, vantagem indevida, ou aceitar promessa de tal vantagem."

- **Pena**: reclusão 2-12 anos + multa.
- §2º: aumento se em razão da vantagem retarda ou omite ato.

### 2.7. Prevaricação (CP 319)

> "Retardar ou deixar de praticar, indevidamente, ato de ofício, ou praticá-lo contra disposição expressa de lei, para satisfazer interesse ou sentimento pessoal."

- **Pena**: detenção 3 meses a 1 ano + multa.

### 2.8. Condescendência criminosa (CP 320)

### 2.9. Advocacia administrativa (CP 321)

- Patrocinar interesse privado perante a administração, valendo-se da qualidade de funcionário.

### 2.10. Violência arbitrária (CP 322)

### 2.11. Abandono de função (CP 323)

### 2.12. Exercício funcional ilegalmente antecipado ou prolongado (CP 324)

### 2.13. Violação de sigilo funcional (CP 325)

### 2.14. Violação do sigilo de proposta de concorrência (CP 326)

## 3. Crimes Praticados por Particular contra a Administração (CP 328-337-A)

### 3.1. Usurpação de função pública (CP 328)

### 3.2. Resistência (CP 329)

### 3.3. Desobediência (CP 330)

### 3.4. Desacato (CP 331)

> "Desacatar funcionário público no exercício da função ou em razão dela."

- **Pena**: detenção 6 meses a 2 anos OU multa.

### 3.5. Tráfico de influência (CP 332)

### 3.6. Corrupção ativa (CP 333)

> "Oferecer ou prometer vantagem indevida a funcionário público, para determiná-lo a praticar, omitir ou retardar ato de ofício."

- **Pena**: reclusão 2-12 anos + multa.

### 3.7. Contrabando ou descaminho (CP 334 e 334-A)

- **Contrabando**: importar/exportar mercadoria PROIBIDA.
- **Descaminho**: iludir tributos devidos na importação/exportação de mercadoria lícita.

### 3.8. Crimes em licitações (CP 337-E a 337-O)

Inseridos pela Lei 14.133/21 (já visto na Onda 17).

## 4. Lei Anticorrupção — Lei 12.846/13

### 4.1. Objeto

Responsabilização **CIVIL** e **ADMINISTRATIVA** de **pessoas jurídicas** por atos lesivos à administração pública NACIONAL ou ESTRANGEIRA.

⚠️ Não trata da responsabilização penal de PJ — essa só existe em crimes ambientais (Lei 9.605/98).

### 4.2. Atos lesivos (art. 5º)

- Prometer, oferecer ou dar vantagem indevida.
- Comprovadamente, financiar, custear, patrocinar ato lesivo.
- Comprovadamente, utilizar-se de interposta pessoa.
- Fraudar licitação ou contrato.
- Frustrar caráter competitivo.
- Afastar ou procurar afastar licitante.
- Dificultar a fiscalização.

### 4.3. Responsabilidade da PJ

- **Objetiva** (não exige dolo/culpa).
- Sucede-se em caso de fusão, incorporação, cisão (limitada ao patrimônio transferido).
- Sociedade-controladora, controlada, coligada ou consorciada: SOLIDÁRIA até o limite da multa e ressarcimento.

### 4.4. Sanções administrativas (art. 6º)

- **Multa**: 0,1% a 20% do faturamento bruto do exercício anterior.
- **Publicação extraordinária** da decisão condenatória.

### 4.5. Sanções judiciais (art. 19)

- Perdimento de bens, direitos ou valores.
- Suspensão ou interdição parcial de atividades.
- Dissolução compulsória da PJ.
- Proibição de receber incentivos.

### 4.6. Acordo de Leniência (art. 16)

- A PJ pode firmar acordo com a Adm.
- Requisitos: identificar coautores + cooperar + acesso a informações.
- Benefícios: redução de até 2/3 da multa + isenção da publicação + isenção de proibição de receber incentivos.

### 4.7. Programa de Compliance / Integridade

- Implementação de programa pode REDUZIR sanções.
- Auditoria, código de conduta, canal de denúncias.

## 5. Súmulas e jurisprudência relevantes

- **Súmula Vinculante 24 STF**: não cabe inquérito policial por crime contra ordem tributária antes do encerramento administrativo. ⚠️ NÃO se aplica a corrupção.
- **STF (HC 156.184)**: desacato continua sendo crime (não houve descriminalização).

## 6. Como Cebraspe cobra

- **C/E peculato**: "O peculato culposo NÃO admite reparação extintiva" → **ERRADO** (admite — §3º).
- **C/E corrupção**: "Na concussão, o funcionário recebe; na corrupção, exige" → **ERRADO** (inverso: na concussão EXIGE).
- **C/E funcionário**: "Estagiário de órgão público NÃO é funcionário para fins penais" → **ERRADO** (basta exercer função, mesmo sem remuneração).
- **C/E anticorrupção**: "Lei 12.846 prevê responsabilidade subjetiva da PJ" → **ERRADO** (objetiva).
- **C/E desacato**: "Desacato foi descriminalizado pelo STF" → **ERRADO** (não foi).
- **C/E leniência**: "Acordo de leniência exclui completamente as sanções" → **ERRADO** (reduz até 2/3).
$content$,
$resumo$
# Resumo — Crimes Adm Pública + Anticorrupção

## Funcionário Público (CP 327)

Quem exerce cargo, emprego ou função pública (mesmo transitório / sem remuneração).
Equiparados: paraestatal, empresa prestadora de serviço.
Aumento 1/3 se cargo em comissão / direção / assessoramento.

## Crimes por Funcionário

| Art. | Crime | Pena |
|---|---|---|
| 312 | Peculato (apropriar/desviar) | Reclusão 2-12 anos |
| 312 §2 | Peculato culposo | Reclusão 2-12 anos (reparação ANTES sentença = EXTINGUE) |
| 316 | Concussão (EXIGE) | Reclusão 2-12 anos |
| 317 | Corrupção passiva (recebe) | Reclusão 2-12 anos |
| 319 | Prevaricação | Detenção 3m-1a |
| 321 | Advocacia administrativa | — |
| 325 | Violação sigilo | — |

## Crimes por Particular

| Art. | Crime |
|---|---|
| 329 | Resistência |
| 330 | Desobediência |
| 331 | Desacato (não foi descriminalizado) |
| 333 | Corrupção ativa (oferece) |
| 334/334-A | Descaminho/Contrabando |

## Lei Anticorrupção (12.846/13)

- Responsabilidade **CIVIL + ADMINISTRATIVA** de PJ.
- **OBJETIVA** (sem dolo/culpa).
- Atos lesivos: prometer vantagem, fraudar licitação, dificultar fiscalização.

### Sanções
- Multa: 0,1%-20% faturamento bruto.
- Publicação extraordinária.

### Sanções judiciais
- Perdimento, interdição, dissolução, proibição incentivos.

### Acordo de Leniência
Redução até 2/3 + isenção publicação + isenção proibição.

### Compliance
Programa de integridade pode REDUZIR sanções.

## Top pegadinhas Cebraspe

1. Peculato culposo: reparação antes sentença EXTINGUE.
2. Concussão = EXIGE; Corrupção passiva = recebe.
3. Estagiário = funcionário (CP 327).
4. Lei 12.846: responsabilidade OBJETIVA da PJ.
5. Desacato continua crime (não descriminalizado).
6. Leniência reduz até 2/3 (não isenta totalmente).
$resumo$
);

-- ┌─ 3. CPM + Lei 13.491/17 ─────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-penal-militar',
  'CPM (Lei 1.001/69) + Lei 13.491/17 + Crimes Militares aprofundado',
  'Código Penal Militar (CPM) + Lei 13.491/17 + Crimes Militares aprofundado',
$content$
# Código Penal Militar (CPM) + Lei 13.491/17 + Crimes Militares aprofundado

PMDF, PMGO Soldado/Oficial cobram MUITO. Foco aqui: aplicação do CPM, distinção crime militar próprio/impróprio, Lei 13.491/17 que ampliou a competência da Justiça Militar.

## 1. Conceito

### 1.1. Crime Militar

> Conduta tipificada no Código Penal Militar (Decreto-Lei 1.001/69) E cometida nas hipóteses do art. 9º do CPM.

### 1.2. Crime Militar PRÓPRIO

- Tipificado SOMENTE no CPM (não existe equivalente no CP comum).
- Só pode ser praticado por militar.
- Exemplos:
  - **Deserção** (CPM 187): ausentar-se da unidade por mais de 8 dias.
  - **Insubordinação**.
  - **Recusa de obediência**.
  - **Abandono de posto**.
  - **Embriaguez em serviço**.
  - **Dormir em serviço**.
  - **Motim e revolta**.

### 1.3. Crime Militar IMPRÓPRIO

- Tipificado também no CP comum, mas cometido por militar em circunstâncias militares.
- Pode ser praticado por militar OU civil em situações específicas.
- Exemplos:
  - Homicídio cometido por militar em serviço.
  - Lesão corporal contra militar.
  - Furto em organização militar.

## 2. Aplicação do CPM (art. 9º)

### 2.1. Crime militar em tempo de PAZ

**Hipóteses gerais** (art. 9º, II):
- Por militar contra militar (em situação de atividade).
- Por militar em atividade contra civil, em local sob administração militar OU em razão da função.
- Por militar em atividade, durante manobras ou exercícios.
- Por militar contra patrimônio sob administração militar.

### 2.2. Por civil contra instituições militares (art. 9º, III)

- Crimes em CPM (exceto os SÓ militares) cometidos por civil quando atingem:
  - Patrimônio das instituições militares.
  - Segurança das instituições.

### 2.3. Crime militar em tempo de GUERRA (art. 10)

Outras hipóteses específicas se aplicam em guerra.

## 3. Lei 13.491/17 — Ampliação da Competência

### 3.1. Alteração no art. 9º do CPM

ANTES da Lei 13.491/17, o art. 9º II definia crime militar quando o tipo penal estivesse APENAS no CPM ou tivesse equivalente no CP.

DEPOIS da Lei 13.491/17:
> "Os crimes dolosos contra a VIDA praticados por militares federais contra civil, em determinadas situações, serão de competência da JUSTIÇA MILITAR DA UNIÃO."

### 3.2. Exceção — competência do JÚRI

Crimes dolosos contra a vida cometidos por militar estadual contra civil → **TRIBUNAL DO JÚRI** (regra geral).

EXCEÇÃO Federal (Lei 13.491/17):
- Militar das forças armadas em operação de Garantia da Lei e da Ordem (GLO).
- Em operação atribuída pelo Presidente.
- Em ação militar autorizada.

→ Competência: Justiça Militar Federal (Auditoria Militar).

### 3.3. Crítica

- Foi recebida com debate (parte da doutrina considera retrocesso por afastar júri popular).

## 4. Penas no CPM

### 4.1. Penas previstas

- **Morte** (apenas tempo de guerra).
- **Reclusão**: 1 a 30 anos.
- **Detenção**: 30 dias a 10 anos.
- **Prisão**: até 6 meses (transgressões — mais grave que disciplinar).
- **Impedimento**: privação parcial de liberdade.
- **Suspensão do exercício do posto**.
- **Reforma**.

### 4.2. Pena de morte (tempo de guerra)

- Apenas em hipóteses específicas (traição, motim militar em campanha).
- Executada por fuzilamento.

## 5. Crimes Militares — Tipologia (CPM)

### 5.1. Crimes contra a autoridade e disciplina militares

#### A) Insubordinação (CPM 161-166)

#### B) Violência contra superior (CPM 157-160)
- Pena: detenção 1-3 anos.

#### C) Desrespeito (CPM 160 §2º)

### 5.2. Crimes contra o serviço militar

#### A) Deserção (CPM 187-194)
- Ausentar-se por mais de 8 dias.
- Pena: detenção 6 meses a 2 anos (oficial) / 6 meses a 2 anos (praça).

#### B) Insurreição/Motim/Revolta (CPM 149-152)

#### C) Embriaguez em serviço (CPM 202)

#### D) Dormir em serviço (CPM 203)

#### E) Abandono de posto (CPM 195)

### 5.3. Crimes contra a Administração Militar

- Peculato militar.
- Concussão militar.
- Corrupção militar.

### 5.4. Crimes contra patrimônio sob administração militar

### 5.5. Crimes contra a Saúde

### 5.6. Crimes contra o Sentimento do Dever Militar

## 6. Diferenças CPM x CP comum

| | CPM | CP |
|---|---|---|
| Aplicação | Militares em situação descrita art. 9º | Geral |
| Crimes próprios | Só CPM | — |
| Tipologia | Voltada à hierarquia/disciplina | Geral |
| Pena de morte | Tempo de guerra | Não há |

## 7. Justiça Militar

### 7.1. Federal

- **STM** (Superior Tribunal Militar): última instância.
- Auditorias Militares: 1º grau.
- Julga militares das Forças Armadas + civis em crime contra Forças Armadas + casos da Lei 13.491.

### 7.2. Estadual

- **Tribunais de Justiça Militar** dos Estados (existem em SP, MG, RS).
- Auditorias Militares Estaduais.
- Julga militares estaduais (PM/CBM).
- Em estados sem TJM: o TJ comum julga militar em câmara especializada.

## 8. Como Cebraspe/AOCP cobra

- **C/E**: "Crime militar próprio pode ser praticado por civil" → **ERRADO** (só militar).
- **C/E**: "Após Lei 13.491/17, todos os crimes dolosos contra a vida de militar contra civil vão à Justiça Militar" → **ERRADO** (só em situações específicas das Forças Armadas em GLO).
- **C/E**: "Deserção exige ausência de 30 dias" → **ERRADO** (8 dias).
- **C/E**: "Pena de morte existe no CPM em tempo de paz" → **ERRADO** (só guerra).
- **C/E**: "Embriaguez em serviço é transgressão disciplinar, não crime" → **ERRADO** (crime — CPM 202).
- **C/E**: "Militares estaduais matando civil dolosamente sempre vão a júri popular" → **ERRADO** (regra é júri, mas há exceções pós Lei 13.491).
$content$,
$resumo$
# Resumo — CPM + Lei 13.491/17

## Crime Militar

- **PRÓPRIO**: só no CPM (deserção, insubordinação, abandono de posto, motim).
- **IMPRÓPRIO**: também no CP, cometido por militar em circunstâncias militares.

## Aplicação do CPM (art. 9º)

### Tempo de PAZ
- Militar vs militar.
- Militar em atividade vs civil em local sob administração militar.
- Manobras/exercícios.
- Patrimônio militar.

### Tempo de GUERRA
- Art. 10.

## Lei 13.491/17

Dolosos contra a vida de militar federal vs civil em GLO/operação autorizada → **Justiça Militar Federal**.

⚠️ Militar estadual vs civil = JÚRI POPULAR (regra geral).

## Penas no CPM

| Pena | Quando |
|---|---|
| Morte | SÓ tempo de guerra (fuzilamento) |
| Reclusão | 1-30 anos |
| Detenção | 30 dias-10 anos |
| Prisão | até 6 meses |
| Impedimento | privação parcial |
| Suspensão posto | — |
| Reforma | — |

## Crimes principais

- **Deserção** (187): ausência > 8 DIAS.
- **Insubordinação** (161-166).
- **Violência contra superior** (157-160).
- **Embriaguez em serviço** (202).
- **Dormir em serviço** (203).
- **Abandono de posto** (195).
- **Motim/Revolta** (149-152).
- Peculato/Concussão/Corrupção militares.

## Justiça Militar

- **Federal**: STM + Auditorias (Forças Armadas).
- **Estadual**: TJM (SP, MG, RS) + Auditorias (PM/CBM).

## Top pegadinhas

1. Crime militar PRÓPRIO só por MILITAR.
2. Deserção = 8 DIAS (não 30).
3. Pena de morte SÓ guerra.
4. Embriaguez em serviço é CRIME (não só transgressão).
5. Lei 13.491: SÓ militar FEDERAL em GLO vai à Justiça Militar.
6. Militar estadual matando civil: REGRA = júri popular.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('legislacao-especial', 'direito-penal', 'direito-penal-militar')
  );
  RAISE NOTICE 'Onda 18 OK — total de materiais nesses subjects: %', v_count;
END $$;
