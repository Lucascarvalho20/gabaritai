-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 17 — Lei 14.133 + Violência Doméstica + Investigação Moderna
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Adm: Lei 14.133/21 (Nova Lei de Licitações) detalhada — modalidades, fases, sanções
--  - Penal/Processual: Lei Maria da Penha (11.340/06) + Feminicídio + Joana D'Arc (14.811/24)
--  - Legislação Especial: Investigação Criminal moderna + Lei 12.830/13 (delegado) + atribuições
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Nova Lei de Licitações (Lei 14.133/21) — detalhada', 'adm-licitacoes-14133-detalhada', 1.5, 400, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Nova Lei de Licitações (Lei 14.133/21) — detalhada');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Lei Maria da Penha + Feminicídio + Lei Joana D''Arc', 'pen-maria-penha-feminicidio-joana', 1.4, 600, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Lei Maria da Penha + Feminicídio + Lei Joana D''Arc');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Investigação Criminal Moderna + Lei 12.830/13 + Atribuições PF', 'leg-investigacao-moderna-12830', 1.4, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Investigação Criminal Moderna + Lei 12.830/13 + Atribuições PF');
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

-- ┌─ 1. ADM — Nova Lei de Licitações 14.133/21 ──────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Nova Lei de Licitações (Lei 14.133/21) — detalhada',
  'Nova Lei de Licitações e Contratos Administrativos (Lei 14.133/21)',
$content$
# Nova Lei de Licitações e Contratos Administrativos (Lei 14.133/21)

Vigência total: **abril 2023**. Substituiu a Lei 8.666/93. Cebraspe cobra muito modalidades + fases + sanções. Decore as tabelas.

## 1. Visão Geral

### 1.1. Aplicação

- União, Estados, DF, Municípios.
- Administração direta + indireta (autarquias, fundações públicas).
- Empresas públicas e sociedades de economia mista NÃO se submetem (regime próprio — Lei 13.303/16).

### 1.2. Princípios (art. 5º)

LIMPE + outros:
- Legalidade, impessoalidade, moralidade, publicidade, eficiência, igualdade.
- Planejamento, transparência, segregação de funções, motivação, vinculação ao edital, julgamento objetivo, segurança jurídica, razoabilidade, competitividade, proporcionalidade, celeridade, economicidade, desenvolvimento nacional sustentável.

### 1.3. Conceitos importantes

- **Contratação direta**: dispensa OU inexigibilidade.
- **Sistema de Registro de Preços (SRP)**: registro de preços pra contratações futuras.
- **Microempresa e EPP**: tratamento favorecido.

## 2. Modalidades de Licitação (art. 28)

### 2.1. PREGÃO

- Forma OBRIGATÓRIA para bens/serviços comuns.
- Eletrônico (regra) ou presencial.
- Critério: menor preço OU maior desconto.
- Inversão de fases: julgamento ANTES da habilitação.

### 2.2. CONCORRÊNCIA

- Para serviços e obras de qualquer valor.
- Critérios variados (menor preço, técnica, melhor combinação).
- Quaisquer interessados.

### 2.3. CONCURSO

- Para escolha de trabalho técnico, científico, artístico.
- Prêmio ou remuneração.

### 2.4. LEILÃO

- Venda de bens móveis inservíveis OU produtos legalmente apreendidos OU bens imóveis adquiridos em procedimentos judiciais.
- Maior lance.

### 2.5. DIÁLOGO COMPETITIVO

**NOVIDADE da Lei 14.133.**
- Para contratações de objetos que envolvam inovação ou complexidade.
- Diálogo prévio com licitantes pra desenvolver soluções.
- Após o diálogo, apresentam-se as propostas.

### 2.6. ⚠️ Modalidades EXTINTAS

- TOMADA DE PREÇOS (extinta).
- CONVITE (extinta).

### 2.7. Critérios de Julgamento (art. 33)

- Menor preço.
- Maior desconto.
- Melhor técnica ou conteúdo artístico.
- Técnica e preço.
- Maior lance (leilão).
- Maior retorno econômico.

## 3. Fases do Processo

### 3.1. Sequência (art. 17)

1. **Preparatória**: planejamento, ETP, projeto básico/termo de referência.
2. **Divulgação do edital**.
3. **Apresentação de propostas e lances**.
4. **Julgamento**.
5. **Habilitação**.
6. **Recursal**.
7. **Homologação**.

### 3.2. ⚠️ Inversão de fases (regra)

Julgamento ANTES da habilitação (igual ao pregão). Inverte-se a sequência clássica da 8.666.

## 4. Contratação Direta

### 4.1. Dispensa (art. 75)

Casos taxativos:
- Valor: até R$ 100 mil (obras/eng) OU R$ 50 mil (outros) — atualizados anualmente.
- Emergência/calamidade.
- Compras de hortifrutigranjeiros.
- Aquisição de bens e contratação de serviços com órgãos públicos.
- Fornecimento de energia/combustível.
- Material/equipamento militar.
- Mais 30+ hipóteses.

### 4.2. Inexigibilidade (art. 74)

Hipóteses:
- Fornecedor exclusivo.
- Profissional consagrado.
- Serviço técnico singular com profissional/empresa de notória especialização.
- Credenciamento.
- Aquisição/locação de imóvel cujas características atendam o interesse.

## 5. Habilitação (art. 62)

### 5.1. Tipos

- Jurídica.
- Técnica.
- Fiscal/social/trabalhista.
- Econômico-financeira.

### 5.2. Documentos

- CNPJ, contrato social.
- Atestados técnicos.
- CND, CRF FGTS, CNDT.
- Balanço, certidão negativa falência.

## 6. Contratos

### 6.1. Prazo

- Vinculado ao crédito orçamentário (regra) ou à vigência do PPA (em alguns casos).
- Plurianual permitido para serviços e fornecimentos contínuos.

### 6.2. Prerrogativas da Administração

- Modificar unilateralmente.
- Rescindir unilateralmente.
- Fiscalizar.
- Aplicar sanções.
- Ocupar provisoriamente.

### 6.3. Garantias (art. 96)

Até **5%** do valor contratado (regra) — até **10%** para obras/serviços de alta complexidade.

### 6.4. Reajustes e revisão

- **Reajuste**: índice predeterminado, periodicidade anual.
- **Repactuação**: serviços contínuos com mão de obra.
- **Revisão (reequilíbrio)**: alteração imprevisível (álea extraordinária).

## 7. Sanções (art. 156)

Para licitante/contratado:
- **Advertência**.
- **Multa**.
- **Impedimento de licitar e contratar**: até 3 anos.
- **Declaração de inidoneidade**: até 6 anos.

⚠️ Mudança vs 8.666: prazo de inidoneidade era 2 anos; agora 6.

## 8. Crimes em licitações (CP 337-E a 337-O — inseridos pela Lei 14.133)

A Lei 14.133 transferiu os crimes de licitação do art. 89-99 da Lei 8.666 para o Código Penal:
- **Contratação direta ilegal** (CP 337-E).
- **Frustração do caráter competitivo** (CP 337-F).
- **Patrocínio de contratação indevida** (CP 337-G).
- **Modificação ou pagamento irregular em contrato** (CP 337-H).
- **Perturbação de procedimento** (CP 337-I).
- **Violação de sigilo** (CP 337-J).
- **Afastamento de licitante** (CP 337-K).
- **Fraude em licitação** (CP 337-L).
- **Contratação inidônea** (CP 337-M).
- **Impedimento de proposta** (CP 337-N).
- **Omissão grave de dado** (CP 337-O).

Penas: variam de 4 a 8 anos de reclusão + multa, com causas de aumento.

## 9. Como Cebraspe cobra

- **C/E**: "Tomada de preços é modalidade da Lei 14.133/21" → **ERRADO** (extinta).
- **C/E**: "Diálogo competitivo é modalidade nova" → **CORRETO**.
- **C/E inversão**: "Habilitação precede julgamento na regra da 14.133" → **ERRADO** (inverso — julgamento antes).
- **C/E pregão**: "Pregão pode ser usado para qualquer contratação" → **ERRADO** (bens e serviços COMUNS).
- **C/E inidoneidade**: "Declaração de inidoneidade dura até 2 anos" → **ERRADO** (até 6 anos pós-14.133).
- **C/E**: "Crimes de licitação continuam na Lei 8.666" → **ERRADO** (no CP arts. 337-E a 337-O).
$content$,
$resumo$
# Resumo — Lei 14.133/21 (Nova Licitações)

## Modalidades

| Modalidade | Quando |
|---|---|
| **Pregão** | Bens/serviços COMUNS (regra eletrônico) |
| **Concorrência** | Serviços/obras qualquer valor |
| **Concurso** | Trabalho técnico/científico/artístico |
| **Leilão** | Venda de bens (maior lance) |
| **Diálogo Competitivo** | NOVO — inovação/complexidade |

⚠️ EXTINTAS: Tomada de Preços + Convite.

## Critérios de Julgamento

Menor preço | Maior desconto | Técnica/conteúdo artístico | Técnica e preço | Maior lance | Maior retorno econômico.

## Fases

1. Preparatória → 2. Divulgação edital → 3. Propostas/lances → 4. Julgamento → 5. Habilitação → 6. Recursal → 7. Homologação.

⚠️ INVERSÃO: julgamento ANTES da habilitação.

## Contratação Direta

- **Dispensa** (75): valor, emergência, exclusividade.
- **Inexigibilidade** (74): fornecedor único, notória especialização, credenciamento.

## Contratos

- Prazo: vinculado ao crédito ou PPA.
- Garantia: até 5% (regra) / até 10% (alta complexidade).
- Reajuste: índice anual.
- Revisão: álea extraordinária.

## Sanções

| Sanção | Prazo |
|---|---|
| Advertência | — |
| Multa | — |
| Impedimento | até 3 anos |
| Inidoneidade | até **6 anos** (era 2) |

## Crimes (transferidos pra CP 337-E a 337-O)

Contratação direta ilegal, frustração competitividade, patrocínio indevido, pagamento irregular, perturbação, violação sigilo, fraude.

## Top pegadinhas Cebraspe

1. Tomada de Preços + Convite EXTINTAS.
2. Diálogo Competitivo é NOVA modalidade.
3. Inversão: julgamento ANTES habilitação.
4. Pregão só pra COMUNS.
5. Inidoneidade até 6 ANOS (era 2).
6. Crimes agora no CP (337-E a 337-O).
$resumo$
);

-- ┌─ 2. PENAL — Maria da Penha + Feminicídio + Joana D'Arc ──────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Lei Maria da Penha + Feminicídio + Lei Joana D''Arc',
  'Violência Doméstica — Lei Maria da Penha + Feminicídio + Lei Joana D''Arc',
$content$
# Violência Doméstica — Lei Maria da Penha + Feminicídio + Lei Joana D'Arc

Bloco TOP de prova policial moderna. Lei 11.340/06 + Lei do Feminicídio (13.104/15) + Lei 14.811/24 (Joana D'Arc).

## 1. Lei Maria da Penha — Lei 11.340/06

### 1.1. Contexto

- Decorre da Convenção de Belém do Pará (1994).
- Recomendação da Comissão Interamericana de DH no caso Maria da Penha vs Brasil.
- Vigor: 22/09/2006.

### 1.2. Sujeito passivo

- **Mulher** em situação de violência doméstica/familiar OU em qualquer relação íntima de afeto.
- INCLUI mulheres trans (jurisprudência STF e STJ).
- NÃO importa orientação sexual da vítima.

### 1.3. Âmbito de aplicação (art. 5º)

- **Doméstico**: espaço de convívio permanente.
- **Familiar**: relação por parentesco, casamento ou afinidade.
- **Relação íntima de afeto**: namoro, ex-namorado, "ficante", etc.

### 1.4. Tipos de violência (art. 7º)

- **Física**: lesão corporal.
- **Psicológica**: dano emocional, ofensa, humilhação, ameaça, vigilância obsessiva (stalking).
- **Sexual**: constrangimento a manter relação sexual ou prática sexual.
- **Patrimonial**: subtração/destruição de bens, documentos, recursos.
- **Moral**: calúnia, difamação, injúria.

### 1.5. Medidas Protetivas (art. 22-24)

#### A) Pessoais (contra o agressor)
- Suspensão do porte de arma.
- Afastamento do lar/convívio.
- Proibição de contato/aproximação.
- Restrição/suspensão de visitas a filhos.
- Prestação de alimentos provisórios.

#### B) Para a vítima
- Encaminhamento a programa de proteção.
- Recondução ao domicílio após afastamento do agressor.
- Separação de corpos.

#### C) Prazo
- Mantidas enquanto necessárias.
- Lei 13.827/19: delegado pode conceder medida em caso de risco iminente quando município não tem JVDFM.

### 1.6. Procedimento

- BO + Termo Circunstanciado podem ser feitos pela vítima.
- Audiência preliminar (NÃO obriga conciliação).
- Suspensão condicional do processo NÃO se aplica (STJ).
- ANPP NÃO se aplica (STJ).

### 1.7. Vedações específicas

- ⚠️ **Não cabe pena de cesta básica** (Súmula 588 STJ).
- **NÃO cabe transação penal** (Lei 9.099 NÃO aplicável — Súmula 542 STJ).
- **NÃO cabe Lei 9.099 em geral**.

### 1.8. Crime de descumprimento de medida protetiva (art. 24-A)

- Inserido em 2018.
- Pena: detenção 3 meses a 2 anos.

### 1.9. Crime de coação sexual em violência doméstica

## 2. Lei do Feminicídio — Lei 13.104/15

### 2.1. Conceito

Inseriu o **feminicídio como qualificadora do homicídio** (CP 121 §2º VI).

> "Contra a mulher por razões da condição de SEXO FEMININO."

### 2.2. Razões da condição (CP 121 §2º-A)

- Violência doméstica e familiar.
- Menosprezo ou discriminação à condição de mulher.

### 2.3. Pena

- Reclusão 12 a 30 anos.
- Hediondo.

### 2.4. Causas de aumento (art. 121 §7º)

- Durante gestação ou nos 3 meses posteriores.
- Contra menor de 14 ou maior de 60 anos.
- Na presença de ascendente/descendente.
- Em descumprimento de medida protetiva.

## 3. Lei Joana D'Arc — Lei 14.811/24

### 3.1. Contexto

Nome em homenagem a Joana D'Arc Bandeira, vítima de feminicídio. Vigor: 2024.

### 3.2. Mudanças

- Criou crimes de **bullying** e **cyberbullying** no CP.
- **Bullying** (CP 146-A): atos de violência psicológica reiterada. Detenção 6 meses-2 anos + multa.
- **Cyberbullying** (CP 146-A §1º): por meio digital. Detenção 1-2 anos + multa.
- Causa de aumento de pena em crimes contra criança/adolescente se em ambiente educacional.

### 3.3. Outras mudanças

- Aumentou pena em crimes hediondos contra crianças e adolescentes.
- Sistema de proteção a crianças vítimas.

## 4. Estupro — Atualizações (CP 213 + LEis recentes)

### 4.1. Estupro (CP 213)
- Conjunção carnal OU outro ato libidinoso mediante violência/grave ameaça.
- Pena: 6-10 anos.
- §1º: lesão grave → 8-12 anos.
- §2º: morte → 12-30 anos.

### 4.2. Estupro de vulnerável (CP 217-A)
- Vítima < 14 anos OU não conseguir oferecer resistência.
- Pena: 8-15 anos.

### 4.3. Importunação sexual (CP 215-A — Lei 13.718/18)
- Ato libidinoso sem consentimento (ex: ato no transporte público).
- Pena: 1-5 anos.

### 4.4. Divulgação de cena de estupro/nudez (CP 218-C — Lei 13.718/18)
- Pena: 1-5 anos.

## 5. Como Cebraspe cobra

- **C/E**: "Lei Maria da Penha protege somente mulheres em casamento" → **ERRADO** (qualquer relação íntima).
- **C/E**: "Mulher trans não é protegida pela Lei Maria da Penha" → **ERRADO** (STF/STJ entendem que sim).
- **C/E**: "Cabe transação penal em violência doméstica" → **ERRADO** (Súmula 542 STJ).
- **C/E**: "Feminicídio é tipo penal autônomo" → **ERRADO** (qualificadora do homicídio).
- **C/E**: "Bullying é crime no Brasil" → **CORRETO** (após Lei 14.811/24).
- **C/E descumprimento**: "Descumprir medida protetiva é falta administrativa" → **ERRADO** (crime — art. 24-A LMP).
$content$,
$resumo$
# Resumo — Violência Doméstica + Feminicídio

## Lei Maria da Penha (11.340/06)

### Sujeito passivo
Mulher (incluindo trans). Vínculo doméstico, familiar OU relação íntima de afeto.

### Tipos de violência (art. 7)
Física, psicológica, sexual, patrimonial, moral.

### Medidas protetivas
- Suspensão porte arma.
- Afastamento do lar.
- Proibição de contato/aproximação.
- Restrição visitas filhos.
- Alimentos provisórios.

Delegado pode conceder em risco iminente (Lei 13.827/19).

### Vedações
- NÃO cabe transação penal (Súmula 542).
- NÃO cabe cesta básica (Súmula 588).
- NÃO se aplica Lei 9.099.
- NÃO cabe ANPP.

### Crime art. 24-A
Descumprir medida protetiva = detenção 3m-2a.

## Feminicídio (Lei 13.104/15)

Qualificadora do homicídio (CP 121 §2º VI).
Razões: violência doméstica OU menosprezo/discriminação.
Pena: 12-30 anos. HEDIONDO.
Aumento: gestante/pós-parto, <14 ou >60, presença de asc/desc, descumprimento de medida.

## Lei Joana D'Arc (14.811/24)

- Bullying (CP 146-A): det 6m-2a.
- Cyberbullying (CP 146-A §1): det 1-2a.
- Causa aumento em crimes contra criança em ambiente educacional.

## Estupro

- 213: 6-10 anos.
- 217-A vulnerável (< 14): 8-15 anos.
- 215-A importunação: 1-5 anos.
- 218-C divulgação: 1-5 anos.

## Top pegadinhas Cebraspe

1. LMP protege MULHER (inclui trans).
2. Transação penal NÃO cabe.
3. Feminicídio é QUALIFICADORA (não autônomo).
4. Bullying é crime DESDE Lei 14.811/24.
5. Descumprir medida = CRIME (art. 24-A).
6. Estupro vulnerável < 14 anos.
$resumo$
);

-- ┌─ 3. LEG ESPECIAL — Investigação Moderna + Lei 12.830 ────────────────────┐
SELECT upsert_material(
  'legislacao-especial',
  'Investigação Criminal Moderna + Lei 12.830/13 + Atribuições PF',
  'Investigação Criminal Moderna — Lei 12.830/13, Atribuições PF (Lei 10.446/02) e Lei 13.060/14',
$content$
# Investigação Criminal Moderna — Lei 12.830/13, Atribuições PF e Lei 13.060/14

Fecha o bloco de Legislação Especial pra concursos policiais. Foco em **atribuição do Delegado** + **PF como polícia da União** + **uso de instrumentos de menor potencial ofensivo**.

## 1. Lei 12.830/13 — Investigação Criminal pelo Delegado de Polícia

### 1.1. Contexto

Reforçou as atribuições do Delegado de Polícia como autoridade que **conduz com autonomia** a investigação criminal.

### 1.2. Natureza do Delegado (art. 2º §1º)

> "As funções de polícia judiciária e a apuração de infrações penais exercidas pelo delegado de polícia são de natureza JURÍDICA, essenciais e exclusivas de Estado."

### 1.3. Garantias do Delegado

- **Direção da investigação**: cabe ao delegado escolher os meios de produção da prova.
- **Indiciamento**: ato exclusivo, fundamentado, do delegado (art. 2º §6º).
- **Remoção**: ato motivado, com prévia decisão judicial.

### 1.4. Indiciamento (art. 2º §6º)

> "O indiciamento, privativo do delegado, dar-se-á por ato fundamentado, mediante análise técnico-jurídica do fato, que deverá indicar a autoria, materialidade e suas circunstâncias."

⚠️ **Não pode ser determinado por ordem do MP ou do Juiz** (STJ).

### 1.5. Princípio do Promotor Natural / Delegado Natural

- Delegado natural: investigação conduzida por aquele com atribuição legal.
- Não pode ser substituído arbitrariamente.

## 2. Lei 10.446/02 — Atribuições da PF

### 2.1. Objeto

Define crimes de **repercussão interestadual ou internacional** que a PF pode investigar mesmo que originalmente sejam atribuição estadual.

### 2.2. Crimes (art. 1º)

#### A) Sequestro, cárcere privado e extorsão mediante sequestro (I)
Inclusive contra estrangeiros ou em fronteiras.

#### B) Formação de cartel (II)

#### C) Relativos a violação de DH (III)
A serem decididos pelo Min. Justiça.

#### D) Furto, roubo ou receptação de cargas em transporte interestadual/internacional (IV)

#### E) Falsificação, corrupção, adulteração ou alteração de medicamentos (V)

#### F) Furto, roubo ou dano contra instituições financeiras (VI)
Inclusive com técnicas sofisticadas, "novos rumos", etc.

#### G) Outros — Lei 13.124/15 acrescentou
Tráfico de pessoas, lavagem, terrorismo, etc.

### 2.3. Atuação concorrente

- PF + polícia estadual.
- Quando PF atua, há comunicação ao MPF ou MP estadual.

## 3. Lei 13.060/14 — Instrumentos de Menor Potencial Ofensivo

Já abordada na Onda 15 (DH). Resumo aqui:

- Disciplina uso de instrumentos menos letais por agentes de segurança.
- Princípios: necessidade + proporcionalidade.
- Definição (art. 4º): instrumentos com REDUZIDA probabilidade de causar morte ou lesão permanente.
- Capacitação obrigatória.
- Registro do uso em BO ou equivalente.

## 4. Investigação Criminal Moderna

### 4.1. Tipos de investigação

- **Tradicional**: oitivas, perícias, busca/apreensão.
- **Cibernética**: análise de dados, interceptação telemática, infiltração virtual (Lei 13.441/17 — CPP 190-A).
- **Patrimonial**: rastreamento financeiro, COAF (Lei 9.613/98).
- **Por colaboração premiada**: Lei 12.850/13.

### 4.2. Provas digitais

#### A) Cadeia de Custódia (CPP 158-A a 158-F — após Anticrime 2019)

10 fases:
1. **Reconhecimento**: identificar o vestígio.
2. **Isolamento**: proteger.
3. **Fixação**: registrar (foto, esboço).
4. **Coleta**: recolher.
5. **Acondicionamento**: embalar com etiquetação.
6. **Transporte**: levar.
7. **Recebimento**: por perito.
8. **Processamento**: exame.
9. **Armazenamento**: até a destinação final.
10. **Descarte** ou devolução.

#### B) Hash (MD5, SHA-256)
Assina integridade do arquivo. Verificação garantida.

#### C) Espelhamento (clonagem)
Cópia bit-a-bit do dispositivo. Examina-se a cópia, não o original.

### 4.3. Interceptação telefônica/telemática (Lei 9.296/96)

- Autorização judicial PRÉVIA.
- Prazo: 15 dias, prorrogável.
- Crimes punidos com reclusão.
- Pacote Anticrime atualizou casos de captação ambiental.

### 4.4. Infiltração de agentes

- **Tradicional** (Lei 12.850/13): em organização criminosa.
- **Virtual** (Lei 13.441/17 — CPP 190-A): crimes contra dignidade sexual de crianças/adolescentes online.
- Sempre com autorização judicial.

### 4.5. Inteligência policial

- ABIN (federal civil).
- DIP/SIO da PF, Inteligência das polícias estaduais.
- Análise de redes, comportamento, padrões.

## 5. Atribuições da PF (CF 144 §1º)

Polícia da União. Funções:
- Apurar infrações penais contra a ordem política e social ou em detrimento de bens, serviços e interesses da União.
- Prevenir e reprimir tráfico ilícito de entorpecentes e contrabando.
- Exercer **polícia marítima, aeroportuária e de fronteiras**.
- Exercer, com exclusividade, funções de **polícia judiciária da União**.

## 6. Como Cebraspe cobra

- **C/E**: "Indiciamento pode ser determinado pelo MP" → **ERRADO** (atribuição exclusiva do delegado — STJ).
- **C/E**: "PF investiga qualquer crime que tenha repercussão" → **CUIDADO** (lista taxativa Lei 10.446 + decisão Min. Justiça).
- **C/E cadeia de custódia**: "Cadeia de custódia tem 8 fases" → **ERRADO** (10).
- **C/E hash**: "Hash MD5 modifica a integridade do arquivo" → **ERRADO** (verifica integridade).
- **C/E**: "Infiltração virtual cabe em qualquer crime" → **ERRADO** (só crimes contra dignidade sexual de crianças/adolescentes online).
- **C/E**: "PF tem atuação concorrente com polícia estadual em todos os crimes" → **ERRADO** (PF SÓ nos casos do art. 144 §1º CF + Lei 10.446).
$content$,
$resumo$
# Resumo — Investigação Moderna + Lei 12.830 + Atribuições

## Lei 12.830/13

### Delegado de Polícia
Funções essenciais e exclusivas de Estado. NATUREZA JURÍDICA.

### Indiciamento (art. 2 §6)
- PRIVATIVO do delegado.
- Ato fundamentado.
- NÃO pode ser ordem MP/Juiz (STJ).

### Remoção
Motivada + prévia decisão judicial.

## Lei 10.446/02 — Atribuições PF concorrentes

- Sequestro/cárcere com fronteira.
- Cartel.
- Violação DH (Min. Justiça decide).
- Furto/roubo cargas interestadual.
- Falsificação medicamentos.
- Crimes vs instituições financeiras.
- Tráfico de pessoas, lavagem, terrorismo.

## Cadeia de Custódia (CPP 158-A — 10 fases)

Reconhecimento → Isolamento → Fixação → Coleta → Acondicionamento → Transporte → Recebimento → Processamento → Armazenamento → Descarte/devolução.

## Provas digitais

- Hash (MD5/SHA): integridade.
- Espelhamento: examina cópia bit-a-bit.

## Interceptação (Lei 9.296/96)

- Autorização judicial prévia.
- 15 dias prorrogáveis.
- Só crimes c/ reclusão.

## Infiltração de agentes

- Tradicional (12.850): org criminosa.
- Virtual (CPP 190-A): dignidade sexual de crianças online.

## Atribuições PF (CF 144 §1)

Crimes ordem política/social, bens União, tráfico drogas internacional, polícia marítima/aeroportuária/fronteiras, polícia judiciária EXCLUSIVA da União.

## Top pegadinhas Cebraspe

1. Indiciamento é PRIVATIVO do delegado.
2. Cadeia custódia = 10 FASES.
3. Infiltração virtual SÓ p/ crimes sexuais contra crianças online.
4. PF NÃO atua em qualquer crime.
5. Hash NÃO modifica arquivo (VERIFICA integridade).
6. MP/Juiz não ordena indiciamento.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('direito-administrativo', 'direito-penal', 'legislacao-especial')
  );
  RAISE NOTICE 'Onda 17 OK — total de materiais nesses subjects: %', v_count;
END $$;
