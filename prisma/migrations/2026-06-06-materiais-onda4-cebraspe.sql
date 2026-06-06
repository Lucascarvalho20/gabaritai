-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 4 — Cebraspe (Penal + ProcPenal restantes)
-- Data: 2026-06-06
--
-- 8 materiais densos (DRAFT — aguarda revisão admin):
--  - Penal: Teoria do Crime, Crimes contra Pessoa, Crimes contra Patrimônio,
--    Crimes contra Adm Pública, Lei de Drogas
--  - ProcPenal: Prova, Prisões e Liberdade Provisória, Recursos
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED. Depende da onda 1 (topics-universais).
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
  ON CONFLICT ("materialId") DO UPDATE SET resumo = EXCLUDED.resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Teoria do Crime
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Teoria do Crime: fato típico, ilicitude e culpabilidade',
  'Teoria do Crime (Tripartite)',
  $md$
# Teoria do Crime

A doutrina majoritária no Brasil adota a **Teoria Tripartite**: crime é fato típico + ilícito + culpável. Cebraspe cobra elementos de cada categoria + excludentes.

## Conceito Analítico de Crime

**Crime = Fato Típico + Ilicitude + Culpabilidade** (teoria tripartite — adotada pelo Brasil)

Outras teorias:
- **Bipartite**: crime = fato típico + ilicitude (culpabilidade é pressuposto de aplicação da pena, não elemento). Adotada por DAMÁSIO.
- **Quadripartite**: + punibilidade como 4º elemento.

## 1. FATO TÍPICO

Elementos:
- **Conduta** (ação ou omissão dolosa ou culposa)
- **Resultado** (modificação no mundo exterior)
- **Nexo causal** (Art 13 CP — teoria da equivalência dos antecedentes/conditio sine qua non)
- **Tipicidade** (formal: enquadramento na lei + material: lesão ou perigo ao bem jurídico)

### Conduta — Teoria Final da Ação
- Adotada pelo Brasil
- Conduta tem **finalidade** (consciente e voluntária)
- Dolo está no tipo (não na culpabilidade — diferente da teoria causal)

### Dolo (Art 18, I CP)
- **Direto**: agente quer o resultado
- **Eventual**: assume o risco de produzir o resultado
- "Foda-se" (assume risco) = dolo eventual; "vai dar certo" (não assume) = culpa consciente

### Culpa (Art 18, II CP)
Modalidades (memorize: **N-I-I**):
- **N**egligência (omissão de cuidado)
- **I**mprudência (excesso de cuidado positivo)
- **I**mperícia (falta de aptidão técnica)

### Crimes Omissivos
- **Próprios** (puros): conduta omissiva descrita no tipo (ex.: omissão de socorro Art 135 CP)
- **Impróprios** (comissivos por omissão): resultado material — Art 13, §2º CP — só quando agente tem **dever jurídico de agir** (lei, contrato, ingerência, comunhão de perigo)

### Tipicidade Material e o Princípio da Insignificância
- STF HC 84.412 (vetores **MARI**): **M**ínima ofensividade, **A**usência de periculosidade, **R**eduzido grau de reprovabilidade, **I**nexpressividade da lesão
- NÃO se aplica a: militar, racismo, tráfico de drogas, contra Administração Pública (em geral)

## 2. ILICITUDE (ANTIJURIDICIDADE)

Conduta típica é, em regra, ilícita. **Excludentes de ilicitude** (Art 23 CP):

### I — Estado de Necessidade (Art 24)
- Perigo atual a direito próprio ou alheio
- Não provocado pelo agente
- Sacrifício de direito de igual ou menor valor
- Razoabilidade da escolha

### II — Legítima Defesa (Art 25)
- Repele injusta agressão **atual ou iminente**
- Direito próprio ou alheio
- Meios moderados
- Pacote Anticrime (Lei 13.964/19) admitiu legítima defesa para agente público em conflito armado

### III — Estrito Cumprimento de Dever Legal
- Agente público no exercício da função
- Ex.: policial detendo flagrante

### IV — Exercício Regular de Direito
- Ex.: prática de esporte violento autorizado, médico em cirurgia

### Excesso (Art 23, §único)
- Doloso, culposo ou exculpante (cabe culpabilidade)

## 3. CULPABILIDADE

Pressuposto: conduta típica e ilícita. Elementos (memorize: **I-P-E**):
- **I**mputabilidade
- **P**otencial conhecimento da ilicitude
- **E**xigibilidade de conduta diversa

### Imputabilidade
**Inimputáveis** (não respondem penalmente):
- Menores de 18 anos (Art 27 CP)
- Doentes mentais (Art 26 CP) — medida de segurança
- Embriaguez completa por caso fortuito ou força maior (Art 28, II, §1º)

**Imputabilidade reduzida** (semi-imputáveis):
- Perturbação de saúde mental — Art 26, §único — redução de pena de 1/3 a 2/3
- Menores de 21 e maiores de 70 — circunstância atenuante (Art 65)

### Potencial Conhecimento da Ilicitude
- **Erro de proibição** (Art 21): erro sobre ilicitude do fato
- Evitável: redução de pena de 1/6 a 1/3
- Inevitável: isenta de pena

### Exigibilidade de Conduta Diversa
- **Coação moral irresistível** (Art 22)
- **Obediência hierárquica** a ordem **não manifestamente ilegal**

## Iter Criminis e Tentativa

### Fases (memorize: **C-P-E-C**)
1. **C**ogitação (impunível)
2. **P**reparação (em regra impunível — exceções: petrechos, associação criminosa)
3. **E**xecução (atos diretos — punível)
4. **C**onsumação (todos elementos do tipo)

### Tentativa (Art 14, II)
> Iniciada a execução, não se consuma por circunstâncias alheias à vontade do agente.

- Redução de pena: **1/3 a 2/3** (Art 14, §único)
- NÃO cabe em crimes culposos, preterdolosos, omissivos próprios, unissubsistentes, contravenções

### Desistência voluntária (Art 15)
> Agente desiste de prosseguir na execução. Responde só pelos atos já praticados.

### Arrependimento eficaz (Art 15)
> Agente, após executar, impede a consumação. Responde só pelos atos.

### Arrependimento posterior (Art 16)
> Crime sem violência ou grave ameaça. Reparação do dano antes da denúncia. Redução de pena 1/3 a 2/3.

## Como cai na Cebraspe

**Item 1 (CERTO):** "Adota-se no Brasil a teoria tripartite do conceito de crime, que exige a presença de fato típico, ilicitude e culpabilidade."

**Item 2 (ERRADO):** "O dolo eventual ocorre quando o agente prevê o resultado e confia em sua não ocorrência, baseando-se em sua habilidade."
> Errado: isso é **culpa consciente**. Dolo eventual = ASSUME o risco.

**Item 3 (CERTO):** "A legítima defesa exige agressão injusta atual ou iminente, repelida com moderação dos meios necessários."

**Item 4 (ERRADO):** "Conforme o princípio da insignificância, é possível aplicá-lo aos crimes de tráfico de drogas quando a quantidade for pequena."
> Errado: STF e STJ rejeitam — bem jurídico (saúde pública) é difuso.

## Súmulas críticas
- **STF HC 84.412 (MARI)**: vetores da insignificância
- **Súmula 444 STJ**: vedada utilização de inquéritos em curso pra agravar pena-base

## Estratégia
- Memorize tripartite (T+I+C) + bipartite/quadripartite
- Excludentes ilicitude (Art 23): **E-L-E-E** (Necessidade, Legítima def, dEver, Direito)
- Culpabilidade: I-P-E
- Iter criminis: C-P-E-C; tentativa só de E pra frente
- Insignificância: MARI; não cai em tráfico/militar/racismo
$md$,
  $resumo$
## Resumo — Teoria do Crime

### Conceito tripartite (Brasil)
**Crime = Fato Típico + Ilícito + Culpável**

### 1. FATO TÍPICO
- Conduta (final/voluntária) + Resultado + Nexo causal + Tipicidade
- **Dolo**: direto / eventual (assume risco)
- **Culpa (N-I-I)**: Negligência, Imprudência, Imperícia
- Omissivos: próprios (no tipo) / impróprios (dever de agir — Art 13, §2º)
- **Insignificância (MARI)**: Mínima ofensividade, Ausência periculosidade, Reduzido grau reprovabilidade, Inexpressividade lesão

### 2. ILICITUDE — Excludentes (Art 23)
- Estado de necessidade
- Legítima defesa (agressão **atual ou iminente**)
- Estrito cumprimento do dever legal
- Exercício regular de direito

### 3. CULPABILIDADE (I-P-E)
- **I**mputabilidade
- **P**otencial conhecimento da ilicitude
- **E**xigibilidade de conduta diversa

### Inimputáveis
- < 18 anos
- Doentes mentais (Art 26)
- Embriaguez fortuita/força maior

### Iter Criminis (C-P-E-C)
Cogitação → Preparação → Execução → Consumação
- **Tentativa** (Art 14, II): redução 1/3 a 2/3
- **Desistência voluntária / arrependimento eficaz** (Art 15)
- **Arrependimento posterior** (Art 16): só sem violência/grave ameaça

### Pegadinhas Cebraspe
- Dolo eventual ≠ culpa consciente (assume × confia)
- Insignificância NÃO cai em tráfico, militar, racismo
- Tentativa NÃO cabe em culposo, omissivo próprio, contravenção
- Legítima defesa: agressão ATUAL OU IMINENTE (não passada)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Crimes contra a Pessoa
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Crimes contra a Pessoa (Homicídio, Lesão, Sequestro)',
  'Crimes contra a Pessoa',
  $md$
# Crimes contra a Pessoa (Parte Especial do CP)

Bloco crítico pra carreiras policiais. Cobra **literalidade** + **qualificadoras** + **causas de aumento**.

## Homicídio (Art 121 CP)

### Simples (caput)
> Matar alguém: pena 6 a 20 anos.

### Privilegiado (§1º)
- Motivo de relevante valor social ou moral
- Sob domínio de violenta emoção, logo após injusta provocação da vítima
- Redução de 1/6 a 1/3

### Qualificado (§2º)
Aumenta pena pra 12 a 30 anos:
- I — paga ou recompensa, ou motivo torpe
- II — motivo fútil
- III — emprego de veneno, fogo, explosivo, asfixia, tortura ou meio insidioso
- IV — traição, emboscada, dissimulação, recurso que dificulte defesa
- V — pra assegurar execução, ocultação, impunidade ou vantagem de outro crime
- VI — **feminicídio** (contra mulher por condição de sexo feminino — Lei 13.104/15)
- VII — contra autoridade ou agente da segurança pública (Lei 13.142/15)
- VIII — com arma de fogo de uso restrito ou proibido

### Feminicídio (§2º, VI)
> Considera-se que há razões de condição de sexo feminino quando o crime envolve:
> I — violência doméstica e familiar
> II — menosprezo ou discriminação à condição de mulher

Causas de aumento (§2º-A):
- 1/3 a 1/2 se: gestante ou 3 meses pós-parto, < 14 anos, > 60 anos, PCD, presença de ascendente/descendente/cônjuge

### Causas de aumento (§4º)
- 1/3 se vítima < 14 anos ou > 60 anos
- 1/4 a 2/3 se vítima funcionário público em razão da função

### Hediondez
- TODO homicídio qualificado é hediondo
- Homicídio simples praticado em atividade típica de **grupo de extermínio** = hediondo
- Feminicídio = hediondo

## Lesão Corporal (Art 129)

### Simples (caput): 3 meses a 1 ano

### Leve = caput (3m-1a)

### Grave (§1º): 1 a 5 anos
- Incapacidade > 30 dias
- Perigo de vida
- Debilidade permanente
- Aceleração de parto

### Gravíssima (§2º): 2 a 8 anos
- Incapacidade permanente para trabalho
- Enfermidade incurável
- Perda ou inutilização de membro/órgão
- Deformidade permanente
- Aborto

### Seguida de morte (§3º): 4 a 12 anos
- **Preterdolo**: dolo na lesão, culpa na morte

### Lei Maria da Penha (violência doméstica)
- Art 129, §9º — pena 3 meses a 3 anos
- Aumento se vítima portadora de deficiência (§11)

## Sequestro e Cárcere Privado (Art 148)

> Privar alguém de sua liberdade, mediante sequestro ou cárcere privado.
> Pena: 1 a 3 anos.

### Qualificadoras (§1º)
- Vítima é ascendente, descendente, cônjuge, companheiro ou < 18 anos
- Pretexto de internação
- Sequestro > 15 dias
- Internação em casa de saúde sem motivo
- Maus tratos/grave sofrimento

### Forma qualificada (§2º)
- Grave sofrimento físico ou moral: pena 2 a 8 anos

## Extorsão Mediante Sequestro (Art 159) — CRIME HEDIONDO

> Sequestrar pessoa com fim de obter, pra si ou pra outrem, qualquer vantagem como condição/preço do resgate.
> Pena: 8 a 15 anos.

### Causas de aumento
- §1º — vítima < 18 anos / > 60 / sequestro > 24h / cometido por bando: 12 a 20 anos
- §2º — lesão corporal grave: 16 a 24 anos
- §3º — morte: 24 a 30 anos

### Delação premiada (§4º)
- Coautor delata → liberta vítima → redução 1/3 a 2/3
- Importante: instituto **pioneiro** da delação no DP brasileiro

## Crimes contra Honra

### Calúnia (Art 138)
> Imputar falsamente fato definido como crime.

### Difamação (Art 139)
> Imputar fato ofensivo à reputação (não precisa ser crime).

### Injúria (Art 140)
> Ofender dignidade ou decoro.

### Injúria Racial (§3º)
> Injúria com referência a raça, cor, etnia, religião, origem, idade, condição de PCD.
> Pena: 1 a 3 anos + multa.
> **Hediondo** (Lei 14.532/23).
> STJ atualmente equipara à racismo (imprescritível e inafiançável).

## Como cai na Cebraspe

**Item 1 (CERTO):** "O feminicídio, na sistemática do CP, é qualificadora do homicídio e configura crime hediondo."

**Item 2 (ERRADO):** "A lesão corporal seguida de morte é crime doloso quanto à lesão e quanto ao resultado morte."
> Errado: preterdolo — DOLO na lesão, CULPA na morte.

**Item 3 (CERTO):** "Conforme entendimento do STJ, a injúria racial equipara-se ao crime de racismo, sendo imprescritível e inafiançável."

**Item 4 (ERRADO):** "A extorsão mediante sequestro é crime contra o patrimônio e não admite a delação premiada."
> Errado: admite delação (Art 159, §4º — instituto pioneiro).

## Súmulas e Jurisprudência
- **STJ Súmula 593**: estupro de vulnerável é objetivo, independe de consentimento
- **STF**: feminicídio é qualificadora objetiva (RHC 159.491)

## Estratégia
- Decore qualificadoras do Homicídio (Art 121, §2º) — todos hediondos
- Lesão: caput=leve, §1º=grave, §2º=gravíssima, §3º=seguida morte
- Maria da Penha = §9º do 129 (não confundir com lei 11.340)
- Extorsão mediante sequestro = hediondo + delação pioneira
$md$,
  $resumo$
## Resumo — Crimes contra a Pessoa

### Homicídio (Art 121)
- **Simples**: 6-20 anos
- **Privilegiado** (§1º): redução 1/6-1/3 (relevante valor, violenta emoção)
- **Qualificado** (§2º): 12-30 anos — todos HEDIONDOS
  - Torpe, fútil, meio cruel, traição, conexão, **feminicídio**, autoridade segurança, arma uso restrito

### Feminicídio (Art 121, §2º, VI)
- Razões de gênero: viol. doméstica OU menosprezo à condição de mulher
- Aumento se: gestante, < 14a, > 60a, PCD, presença familiar

### Lesão Corporal (Art 129)
- **Leve** (caput): 3m-1a
- **Grave** (§1º): 1-5a (incapacidade > 30 dias, debilidade)
- **Gravíssima** (§2º): 2-8a (incapacidade permanente, deformidade, aborto)
- **Seguida de morte** (§3º): 4-12a — **PRETERDOLO** (dolo lesão + culpa morte)
- **Maria da Penha** (§9º): 3m-3a

### Sequestro e Cárcere (Art 148): 1-3a

### Extorsão Mediante Sequestro (Art 159) — HEDIONDO
- 8-15 anos
- §1º: vítima < 18 ou > 60 / > 24h / bando: 12-20a
- §2º: lesão grave: 16-24a
- §3º: morte: 24-30a
- §4º: **delação premiada pioneira** — 1/3 a 2/3

### Honra
- **Calúnia** (Art 138): fato definido como crime
- **Difamação** (Art 139): fato ofensivo
- **Injúria** (Art 140): dignidade/decoro
- **Injúria racial** (§3º): HEDIONDA (STJ equipara a racismo — imprescritível)

### Pegadinhas Cebraspe
- Feminicídio = qualificadora objetiva (STF)
- Lesão seguida de morte = PRETERDOLO
- Insignificância NÃO se aplica a lesão dolosa
- Extorsão mediante sequestro = HEDIONDO + delação
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Crimes contra o Patrimônio
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Crimes contra o Patrimônio (Furto, Roubo, Extorsão, Estelionato)',
  'Crimes contra o Patrimônio',
  $md$
# Crimes contra o Patrimônio

Bloco com **alto índice de cobrança**. Cebraspe insiste em distinguir Furto × Roubo × Extorsão + qualificadoras.

## Furto (Art 155)

> Subtrair, para si ou para outrem, **coisa alheia móvel**.
> Pena: 1 a 4 anos.

### Furto NOTURNO (§1º)
- Cometido durante o repouso noturno → **aumento de 1/3**
- STJ Súmula 511: aplicável também na forma qualificada

### Privilegiado (§2º)
- Primário + coisa de pequeno valor → juiz substitui pena, reduz, ou só multa

### Qualificado (§4º): 2 a 8 anos
- I — destruição/rompimento de obstáculo
- II — abuso de confiança ou mediante fraude, escalada, destreza
- III — chave falsa
- IV — concurso de duas ou mais pessoas

### Qualificado por explosivo (§4º-A)
- Pena 4 a 10 anos

### Furto de semovente (§5º)
- Subtração de coisa essencial pra exploração rural

### Furto de coisa comum (Art 156)
- Sócio, condômino, herdeiro contra herança

## Roubo (Art 157)

> Subtrair coisa alheia móvel, **para si ou para outrem**, mediante **grave ameaça ou violência** ou depois de havê-la, por qualquer meio, reduzido a impossibilidade de resistência.
> Pena: 4 a 10 anos.

### Roubo Impróprio (§1º)
- Logo APÓS subtração, agente usa violência ou ameaça pra assegurar posse
- Mesma pena do caput

### Causas de aumento (§2º) — 1/3 a 1/2
- I — REVOGADO (Lei 13.654/18 incorporou arma)
- II — concurso de pessoas
- III — vítima em transporte de valores
- IV — subtração de veículo automotor a ser transportado pra outro Estado/exterior
- V — vítima em serviço pra empresa pública/SEM

### Causa de aumento (§2º-A) — 2/3
- I — emprego de arma de fogo
- II — destruição de obstáculo/explosivo
- III — emprego de arma de fogo de USO RESTRITO ou PROIBIDO (DOBRA)

### Latrocínio (§3º) — Crime Hediondo (Art 1º Lei 8.072)
> Lesão corporal grave: 7-18 anos
> Morte: 20-30 anos

**Súmula 610 STF**: latrocínio quando há morte, ainda que não haja consumação da subtração.

## Extorsão (Art 158)

> Constranger alguém, mediante violência ou grave ameaça, com o intuito de obter para si ou pra outrem vantagem econômica indevida.

### Diferença Roubo × Extorsão
- **Roubo**: vítima NÃO PRECISA fazer nada — agente subtrai
- **Extorsão**: vítima FAZ ALGO (entrega, assina) — colaboração indispensável

### Súmula 96 STJ
> "O crime de extorsão consuma-se independentemente da obtenção da vantagem indevida."
> = Crime FORMAL (basta a conduta).

### Causas de aumento
- 1/3 a 1/2: cometida por 2+ pessoas / com emprego de arma
- Sequestro relâmpago (§3º) — 6 a 12 anos

## Extorsão Mediante Sequestro (Art 159) — visto em "Crimes contra a Pessoa"

## Estelionato (Art 171)

> Obter, para si ou pra outrem, vantagem ilícita, em prejuízo alheio, induzindo ou mantendo alguém em **erro**, mediante artifício, ardil ou qualquer outro meio fraudulento.
> Pena: 1 a 5 anos.

### Diferença Estelionato × Furto Qualificado por Fraude
- **Furto**: fraude pra DISTRAIR/AFASTAR vítima — agente subtrai sem que ela perceba
- **Estelionato**: fraude pra ILUDIR vítima — ela entrega voluntariamente, achando que é negócio legítimo

### Estelionato eletrônico (§2º-A, Lei 14.155/21)
- Cometido com uso de dispositivo eletrônico (PIX, transferência, etc.)
- Pena 4 a 8 anos
- Aumento de 1/3 a 2/3 se cometido contra idoso ou vulnerável

### Súmula 17 STJ
> "Quando o falso se exaure no estelionato, sem mais potencialidade lesiva, é por este absorvido."

### Ação Penal (§5º)
- Antes: pública incondicionada
- Lei 13.964/19 (Pacote Anticrime): regra é **pública condicionada à representação**
- Exceções (continuam incondicionada): vítima é Adm Pública, criança/adolescente, PCD, idoso, vulnerável

## Apropriação Indébita (Art 168)

> Apropriar-se de coisa alheia móvel **de que tem posse ou detenção**.
> Pena: 1 a 4 anos.

### Diferença Furto × Apropriação Indébita
- **Furto**: agente NÃO tem a posse — subtrai
- **Apropriação Indébita**: agente JÁ TEM a posse legítima — passa a se comportar como dono

### Causas de aumento (§único)
- Em razão de ofício, emprego ou profissão
- Tutela, curatela, sequestro de bens

## Receptação (Art 180)

> Adquirir, receber, transportar, conduzir, ocultar coisa que sabe ser produto de crime.

### Modalidades
- **Própria**: tem por objeto coisa produto de crime, dolo direto
- **Imprópria**: influencia 3º a adquirir, etc.
- **Culposa** (§3º): deveria saber pela natureza ou desproporção do preço

## Como cai na Cebraspe

**Item 1 (CERTO):** "O latrocínio, ainda que não haja consumação da subtração, configura-se quando há morte da vítima, conforme Súmula 610 do STF."

**Item 2 (ERRADO):** "O crime de extorsão somente se consuma com a obtenção da vantagem indevida."
> Errado: Súmula 96 STJ — crime **formal**, basta a conduta.

**Item 3 (CERTO):** "Após o Pacote Anticrime, o estelionato é, em regra, crime de ação penal pública condicionada à representação."

**Item 4 (ERRADO):** "No furto qualificado por fraude, a vítima entrega o bem voluntariamente, achando tratar-se de negócio legítimo."
> Errado: isso é **estelionato**. No furto qualificado por fraude, a vítima é DISTRAÍDA.

## Súmulas críticas
- **Súmula 17 STJ**: falso absorvido pelo estelionato
- **Súmula 96 STJ**: extorsão é crime formal
- **Súmula 610 STF**: latrocínio configurado com morte
- **Súmula 511 STJ**: causa de aumento do repouso noturno aplica-se ao qualificado

## Estratégia
- Distinção essencial: Furto (sem violência/ameaça) × Roubo (com)
- Extorsão = vítima FAZ algo; Roubo = vítima NÃO precisa fazer
- Estelionato após Pacote Anticrime: representação (regra)
- Latrocínio = HEDIONDO. Súmula 610 vital.
- Memorize causas de aumento Roubo (§2º + §2º-A)
$md$,
  $resumo$
## Resumo — Crimes contra o Patrimônio

### Furto (Art 155): 1-4a
- **Noturno** (§1º): +1/3
- **Privilegiado** (§2º): primário + pequeno valor
- **Qualificado** (§4º): 2-8a (destruição, fraude, chave falsa, concurso)
- **Por explosivo** (§4º-A): 4-10a

### Roubo (Art 157): 4-10a
- **Impróprio** (§1º): violência APÓS subtração
- **Aumentos** (§2º): 1/3 a 1/2 (concurso, transporte de valores)
- **Aumento ARMA DE FOGO** (§2º-A): 2/3
- **Arma USO RESTRITO**: DOBRA
- **Latrocínio** (§3º): lesão grave 7-18a, **morte 20-30a HEDIONDO**

### Súmula 610 STF
Latrocínio configurado com MORTE, ainda que sem consumação da subtração

### Extorsão (Art 158)
- Vítima FAZ algo (colabora) — diferente do roubo
- **Súmula 96 STJ**: crime FORMAL (basta conduta)
- Sequestro relâmpago: 6-12a

### Estelionato (Art 171): 1-5a
- Vítima ENTREGA voluntariamente (iludida)
- **Eletrônico** (§2º-A — Lei 14.155/21): 4-8a
- Pacote Anticrime: **AÇÃO PENAL PÚBLICA CONDICIONADA** (regra)
- Exceções: Adm Pub, criança, idoso, vulnerável → INCONDICIONADA
- **Súmula 17 STJ**: falso absorvido

### Apropriação Indébita (Art 168)
- Agente JÁ TINHA a posse legítima

### Receptação (Art 180)
- Própria, imprópria, culposa (§3º)

### Pegadinhas Cebraspe
- Furto qualificado por fraude (vítima distraída) ≠ Estelionato (vítima iludida)
- Extorsão é FORMAL (Sum 96 STJ)
- Latrocínio com morte = HEDIONDO + Súmula 610
- Estelionato hoje: representação (Pacote Anticrime)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Crimes contra a Administração Pública
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Crimes contra a Administração Pública (Peculato, Concussão, Corrupção)',
  'Crimes contra a Administração Pública',
  $md$
# Crimes contra a Administração Pública

Tema VITAL pra carreiras públicas — Cebraspe cobra a literalidade dos tipos. Os 5 crimes mais cobrados: **Peculato, Corrupção Passiva, Corrupção Ativa, Concussão e Prevaricação**.

## Conceito de Funcionário Público (Art 327)

> Considera-se funcionário público, para os efeitos penais, **quem exerce, embora transitoriamente ou sem remuneração, cargo, emprego ou função pública**.

### Equiparados (§1º)
- Quem exerce cargo/emprego/função em entidade paraestatal
- Trabalha pra empresa prestadora de serviço contratada/conveniada com Adm

### Aumento de pena (§2º)
- Aumenta 1/3 se autor é ocupante de cargo em comissão ou função de direção

## 1. Peculato (Art 312)

> Apropriar-se o funcionário público de **dinheiro, valor ou qualquer outro bem móvel**, público ou particular, de que tem posse em razão do cargo.
> Pena: 2 a 12 anos.

### Modalidades
- **Apropriação** (caput): agente tem posse legítima e se apropria
- **Desvio** (caput): desvia de finalidade pública
- **Furto** (§1º): NÃO tem posse mas se vale do cargo pra subtrair
- **Mediante erro de outrem** (Art 313 — Peculato-estelionato): apropria-se de algo que recebeu por erro

### Culposo (§2º)
- Concorre culposamente para crime de outrem
- Pena 3 meses a 1 ano
- Reparação do dano antes de sentença extingue punibilidade (§3º)

## 2. Concussão (Art 316)

> **Exigir**, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, **vantagem indevida**.
> Pena: 2 a 12 anos.

### Característica
- Verbo: **EXIGIR** (imposição)
- Diferença pra corrupção passiva: aqui o agente IMPÕE; lá ele SOLICITA/RECEBE

### Excesso de exação (§único)
> Exigir tributo ou contribuição que sabe indevida.
> Pena 3 a 8 anos.

## 3. Corrupção Passiva (Art 317)

> **Solicitar ou receber**, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida, ou aceitar promessa de tal vantagem.
> Pena: 2 a 12 anos.

### Verbos: SOLICITAR / RECEBER / ACEITAR PROMESSA
- "Solicitar" = pedir (mais leve que exigir)
- "Receber" = consumar
- "Aceitar promessa" = consumar mesmo sem receber

### Aumento (§1º)
- 1/3 se em consequência age, retarda ou omite ato com violação de dever
- Pena 4 a 12 anos com aumento

### Corrupção Passiva Privilegiada (§2º)
- Cede a pedido ou influência de outrem pra praticar/retardar/omitir ato com violação do dever
- Pena 3 meses a 1 ano

## 4. Corrupção Ativa (Art 333)

> Oferecer ou prometer vantagem indevida a funcionário público, para determiná-lo a praticar, omitir ou retardar ato de ofício.
> Pena: 2 a 12 anos.

### Aumento (§único)
- 1/3 se em consequência o funcionário pratica/retarda/omite

### Detalhe importante
- Crime do **EXTRANEUS** (particular)
- Não exige que funcionário aceite — basta a oferta/promessa

## 5. Prevaricação (Art 319)

> Retardar ou deixar de praticar, indevidamente, ato de ofício, ou praticá-lo contra disposição expressa de lei, **para satisfazer interesse ou sentimento pessoal**.
> Pena: 3 meses a 1 ano.

### Crítica
- Elemento subjetivo difícil: "interesse ou sentimento pessoal"
- Sem isso, não há prevaricação (pode haver advocacia administrativa, etc.)

## Outros Crimes Cobrados

### Emprego Irregular de Verbas/Rendas Públicas (Art 315)
- Dar destinação diversa daquela em lei

### Advocacia Administrativa (Art 321)
- Funcionário público patrocina interesse particular perante a administração

### Abandono de Função (Art 323)
- Abandonar cargo público

### Exercício Funcional Antes da Posse (Art 324)
- Exercer função sem ter sido empossado regularmente

### Violação de Sigilo Funcional (Art 325)
- Revelar fato sigiloso por razão do cargo

### Tráfico de Influência (Art 332)
- Solicitar/exigir/cobrar vantagem alegando influência sobre funcionário

### Denunciação Caluniosa (Art 339)
- Dar causa a instauração de IP, PAD, contra alguém que sabe inocente

## Lei 12.846/13 — Anticorrupção (Resp. PJ)

- Responsabilidade OBJETIVA da PJ por atos lesivos contra Adm
- Sanções administrativas (multa até 20% do faturamento) e judiciais
- Acordo de leniência

## Como cai na Cebraspe

**Item 1 (CERTO):** "O peculato culposo pode ter sua punibilidade extinta pela reparação integral do dano antes de a sentença irrecorrível ser proferida."

**Item 2 (ERRADO):** "Na concussão, o funcionário público solicita vantagem indevida, enquanto na corrupção passiva, ele a exige."
> Errado: INVERTIDO. Concussão = EXIGIR; Corrupção Passiva = SOLICITAR/RECEBER.

**Item 3 (CERTO):** "A corrupção ativa configura-se com a mera oferta ou promessa de vantagem indevida, independentemente da aceitação pelo funcionário público."

**Item 4 (ERRADO):** "Constitui prevaricação a omissão de ato funcional, ainda que praticada sem o elemento subjetivo de interesse ou sentimento pessoal."
> Errado: SEM "interesse ou sentimento pessoal", NÃO há prevaricação.

## Súmulas
- **Súmula 209 STJ**: compete Justiça Federal processar crimes praticados em detrimento de bens, serviços ou interesse da União

## Estratégia
- Decore verbos: Concussão = EXIGIR; Corrupção Passiva = SOLICITAR/RECEBER; Corrupção Ativa = OFERECER/PROMETER
- Peculato: 4 formas (apropriação, desvio, furto, estelionato)
- Conceito de funcionário público (Art 327) é AMPLO
- Prevaricação exige interesse pessoal
$md$,
  $resumo$
## Resumo — Crimes contra a Administração Pública

### Funcionário Público (Art 327)
Conceito AMPLO: cargo/emprego/função, ainda que transitória ou sem remuneração

### Peculato (Art 312): 2-12 anos
4 formas:
- **Apropriação** (tem posse, se apropria)
- **Desvio** (desvia finalidade)
- **Furto** (§1º — não tem posse, se vale do cargo)
- **Estelionato** (Art 313 — recebe por erro)

### Peculato CULPOSO (§2º): 3m-1a
- Reparação do dano antes da sentença = EXTINGUE PUNIBILIDADE

### Concussão (Art 316): 2-12a
- Verbo: **EXIGIR** (impõe)
- §único: excesso de exação (tributo indevido) 3-8a

### Corrupção Passiva (Art 317): 2-12a
- Verbos: **SOLICITAR / RECEBER / ACEITAR PROMESSA**
- §1º: +1/3 se age/retarda/omite

### Corrupção Ativa (Art 333): 2-12a
- Verbos: **OFERECER / PROMETER**
- Crime do PARTICULAR (extraneus)
- Consuma com OFERTA, não precisa de aceitação

### Prevaricação (Art 319): 3m-1a
- Retardar/deixar de praticar ato POR INTERESSE/SENTIMENTO PESSOAL
- Sem o elemento subjetivo, NÃO há crime

### Outros
- Advocacia Administrativa (321)
- Abandono de Função (323)
- Violação de Sigilo Funcional (325)
- Tráfico de Influência (332)
- Denunciação Caluniosa (339)

### Lei 12.846/13 — Anticorrupção
- Resp. OBJETIVA da PJ
- Multa até 20% faturamento
- Acordo de leniência

### Pegadinhas Cebraspe
- Concussão (EXIGIR) ≠ Corrupção Passiva (SOLICITAR/RECEBER)
- Corrupção Ativa: consuma com OFERTA
- Prevaricação exige interesse PESSOAL
- Peculato culposo: reparação extingue
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Lei de Drogas (Lei 11.343/2006)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Lei de Drogas (Lei 11.343/2006)',
  'Lei de Drogas — Lei 11.343/2006',
  $md$
# Lei de Drogas (Lei 11.343/2006)

Lei essencial pra PRF, PF, PCDF (cargo policial). Cobra **distinção uso × tráfico**, **penas**, **tráfico privilegiado** e **medidas de proteção**.

## Estrutura da Lei
- **Crimes de uso**: Art 28 (usuário)
- **Crimes de tráfico**: Art 33 a 39

## Art 28 — POSSE PARA USO PESSOAL

> Adquirir, guardar, ter em depósito, transportar ou trazer consigo, para consumo pessoal, drogas sem autorização ou em desacordo com determinação legal ou regulamentar.

### Penas (NÃO é privativa de liberdade!)
- Advertência sobre os efeitos das drogas
- Prestação de serviços à comunidade
- Medida educativa de comparecimento a programa

### Critério (§2º)
Juiz analisa: natureza/quantidade da droga, local/condições da ação, circunstâncias sociais/pessoais do agente

### Despenalização (NÃO descriminalização)
- A conduta CONTINUA sendo crime, mas sem privação de liberdade
- STF reconheceu repercussão geral (Tema 506) — descriminalização do uso ainda em julgamento

## Art 33 — TRÁFICO DE DROGAS

> Importar, exportar, remeter, preparar, produzir, fabricar, adquirir, vender, expor à venda, oferecer, ter em depósito, transportar, trazer consigo, guardar, prescrever, ministrar, entregar a consumo ou fornecer drogas, ainda que gratuitamente, sem autorização ou em desacordo com determinação legal ou regulamentar.
> **Pena: 5 a 15 anos** + multa.

### 18 verbos!
Decoreba pesada — vou listar os principais: importar, exportar, vender, transportar, trazer consigo, guardar, oferecer, fornecer.

### "Ainda que gratuitamente"
- TRÁFICO mesmo se não houver lucro!
- Dar maconha pra amigo = tráfico (não uso compartilhado)

### Equiparado a tráfico (§1º)
- Matéria-prima/insumo destinada a preparo de drogas
- Semente, plantio
- Utilização de local pra preparar/produzir
- Cessão ESPORÁDICA de droga pra consumo conjunto, sem objetivo de lucro (= TRÁFICO MENOR — §3º, ver abaixo)

## Art 33, §3º — USO COMPARTILHADO (Tráfico Menor)

> Oferecer droga, EVENTUALMENTE e sem objetivo de lucro, a pessoa de seu relacionamento, para juntos a consumirem.
> **Pena: detenção 6 meses a 1 ano** + multa.

### Características essenciais
- EVENTUAL (não habitual)
- SEM lucro
- Pessoa do RELACIONAMENTO
- CONSUMO CONJUNTO
- Falta qualquer um = tráfico (Art 33 caput)

## Art 33, §4º — TRÁFICO PRIVILEGIADO

> Nos delitos definidos no caput e no §1º, as penas poderão ser **reduzidas de 1/6 a 2/3**, vedada a conversão em penas restritivas de direitos, desde que o agente seja:
> 1. PRIMÁRIO
> 2. De BONS ANTECEDENTES
> 3. NÃO se dedique a atividades criminosas
> 4. NÃO integre organização criminosa

### Mudança HISTÓRICA (Pacote Anticrime)
- STF removeu vedação à conversão em PRD → mais flexibilidade
- Não é mais considerado HEDIONDO em sua forma privilegiada (STF, HC 118.533 — Tema 600)

## Art 34 — Maquinários para Produção de Drogas
> Fabricar, adquirir, utilizar, transportar maquinário pra produção
> Pena: 3 a 10 anos + multa

## Art 35 — Associação Para o Tráfico
> Associarem-se duas ou mais pessoas para cometer reiteradamente os crimes do Art 33 e 34
> Pena: 3 a 10 anos + multa

### Diferença pra Organização Criminosa
- Associação tráfico: 2+ pessoas
- ORCRIM (Lei 12.850): 4+ pessoas, estruturada, hierárquica

## Art 36 — Financiamento ao Tráfico
> Pena: 8 a 20 anos

## Art 37 — Informante do Tráfico
> Colaborar como informante
> Pena: 2 a 6 anos

## Art 40 — Causas de Aumento (1/6 a 2/3)
- I — natureza ou procedência ou destino transnacional
- II — pra fim mercantil
- III — em transporte público
- IV — envolvendo criança/adolescente
- V — em dependências/imediações de escolas, hospitais, presídios
- VI — envolvendo violência ou armas de fogo
- VII — em comunidades indígenas

## Apreensão e Destruição (Art 50 a 64)

### Auto de prisão em flagrante
- Inquérito policial tem prazo de **30 dias se PRESO** e **90 se SOLTO** (Lei especial, Art 51)

### Lei 13.840/19
- Internação INVOLUNTÁRIA de dependentes mediante representação familiar

## Como cai na Cebraspe

**Item 1 (CERTO):** "A conduta tipificada no art. 28 da Lei de Drogas — posse de droga para consumo pessoal — sofreu processo de despenalização, mas continua sendo crime."

**Item 2 (ERRADO):** "Para a configuração do tráfico de drogas, é indispensável a comprovação de finalidade lucrativa por parte do agente."
> Errado: "ainda que gratuitamente" — tráfico mesmo sem lucro.

**Item 3 (CERTO):** "Conforme entendimento do STF, o tráfico privilegiado (art. 33, §4º) não é equiparado a crime hediondo."

**Item 4 (ERRADO):** "O uso compartilhado de drogas configura crime de tráfico em sua forma simples (caput do art. 33)."
> Errado: configura §3º (uso compartilhado), pena mais branda 6 meses a 1 ano.

## Súmulas e jurisprudência
- **STF, HC 118.533 / Tema 600**: tráfico privilegiado NÃO é hediondo
- **STF, RE 635.659 / Tema 506**: descriminalização do uso (em julgamento)
- **STJ Súmula 587**: tráfico privilegiado nas atividades de educação/saúde NÃO mais

## Estratégia
- Decore os 5 requisitos do uso compartilhado (§3º): EVENTUAL + SEM LUCRO + RELACIONAMENTO + CONSUMO CONJUNTO
- Tráfico privilegiado: 4 requisitos cumulativos
- Aumentos do Art 40: principais — transnacional, transporte público, criança/adolescente
- Despenalização ≠ Descriminalização
$md$,
  $resumo$
## Resumo — Lei de Drogas (Lei 11.343/2006)

### Art 28 — Posse pra USO
- Penas: advertência, prestação de serviços, programa educativo
- **NÃO há prisão** — despenalização (mas continua crime)
- Tema 506 STF: descriminalização em julgamento

### Art 33 — TRÁFICO: 5-15 anos + multa
- 18 verbos (importar, vender, transportar, guardar, etc.)
- **"Ainda que gratuitamente"** = tráfico mesmo sem lucro
- §1º: matéria-prima, plantio, cessão para preparo

### Art 33, §3º — Uso Compartilhado: 6m-1a
5 requisitos CUMULATIVOS:
1. EVENTUAL
2. SEM lucro
3. Pessoa do RELACIONAMENTO
4. CONSUMO CONJUNTO
5. Falta qualquer um = TRÁFICO (caput)

### Art 33, §4º — TRÁFICO PRIVILEGIADO
Redução 1/6 a 2/3 se cumulativamente:
1. PRIMÁRIO
2. Bons antecedentes
3. NÃO se dedique a atividades criminosas
4. NÃO integre ORCRIM
- **NÃO é HEDIONDO** (STF Tema 600)

### Art 35 — Associação Tráfico: 3-10a (2+ pessoas)
### Art 36 — Financiamento: 8-20a
### Art 37 — Informante: 2-6a

### Art 40 — Aumentos (1/6 a 2/3)
- I: Transnacional, II: mercantil, III: transporte público
- IV: criança/adolescente, V: escola/hospital/presídio
- VI: violência/arma, VII: comunidade indígena

### Prazos
- IP preso: 30 dias
- IP solto: 90 dias

### Pegadinhas Cebraspe
- Tráfico SEM LUCRO ainda é tráfico
- Uso compartilhado ≠ tráfico do caput
- Privilegiado NÃO é hediondo (STF)
- Despenalização ≠ descriminalização
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PROC PENAL — Prova
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-processual-penal',
  'Prova: meios, ônus, valoração, prova ilícita',
  'Teoria da Prova no Processo Penal',
  $md$
# Teoria da Prova no Processo Penal

Tema crítico (cai SEMPRE Cebraspe). Cobra **sistemas de valoração**, **prova ilícita**, **ônus** e **provas em espécie**.

## Sistemas de Valoração da Prova

### 1. Sistema da Prova Tarifada (legal)
- Lei estabelece "peso" de cada prova
- NÃO adotado pelo Brasil (exceções pontuais — ex.: prova de menoridade só por documento)

### 2. Sistema da Íntima Convicção
- Juiz decide sem fundamentar
- Adotado SÓ no Tribunal do Júri (jurados leigos)

### 3. Sistema do Livre Convencimento Motivado (Persuasão Racional) — REGRA NO BRASIL
- Art 155 CPP
- Juiz aprecia livremente, mas FUNDAMENTA a decisão
- Provas devem constar dos autos
- Contraditório judicial
- **EXCEÇÃO**: provas cautelares, não repetíveis e antecipadas

## Art 155 CPP — Livre Convencimento Motivado
> "O juiz formará sua convicção pela **livre apreciação da prova produzida em contraditório judicial**, não podendo fundamentar sua decisão exclusivamente nos elementos informativos colhidos na investigação, ressalvadas as provas cautelares, não repetíveis e antecipadas."

### Decoreba importante
- Decisão pode usar prova do IP **se em conjunto** com prova judicial
- Decisão pode usar prova do IP **EXCLUSIVAMENTE** se for: cautelar, não repetível ou antecipada

## Objeto da Prova
- Fatos relevantes pra causa
- Direito brasileiro: NÃO precisa provar (iura novit curia)
- Direito MUNICIPAL, ESTADUAL ou ESTRANGEIRO: deve provar

### Fatos que DISPENSAM prova
- **Evidentes** (axiomáticos): conclusão lógica óbvia
- **Notórios**: conhecimento comum
- **Presunções legais**: lei presume (ex.: inocência)
- **Inúteis**: não relevantes

## Ônus da Prova (Art 156 CPP)
> "A prova da alegação incumbirá a quem a fizer..."

- Acusação prova materialidade + autoria
- Defesa prova álibis ou excludentes
- Juiz pode determinar ex officio produção antecipada (Art 156, I) ou em curso de instrução (Art 156, II)

### Art 3º-A CPP (Pacote Anticrime — EFICÁCIA SUSPENSA pelo STF na ADI 6298)
> Processo penal estrutura ACUSATÓRIA, vedadas iniciativa do juiz na investigação e substituição da atuação probatória do MP

## Provas Ilegais (Gênero) — Art 5º, LVI CF + Art 157 CPP

### A) Provas Ilícitas (violação a norma de DIREITO MATERIAL)
- Constitucional ou legal
- Exemplos: interceptação sem ordem judicial, busca em casa sem autorização

### B) Provas Ilícitas por DERIVAÇÃO (Frutos da Árvore Envenenada)
- Lícitas em si, mas derivam de prova ilícita
- Art 157, §1º CPP

### EXCEÇÕES — Provas ilícitas por derivação podem ser usadas:
1. **Fonte Independente** (§2º): prova chegaria de outra forma, sem conexão com a ilícita
2. **Descoberta Inevitável**: prova seria descoberta inevitavelmente

### C) Provas Ilegítimas (violação a norma PROCESSUAL)
- Regime jurídico das NULIDADES
- Absoluta (não pode usar) × Relativa (pode se não arguida)

### Mnemônico
- **Ilícita** (08 letras) = direito **Material** (08 letras)
- **Ilegítima** (10 letras) = direito **Processual** (10 letras)

## Consequências da Ilicitude

### Provas ilícitas (Art 157, §3º)
- **Desentranhamento** do processo
- Após preclusão: **inutilização** judicial

### Art 157, §5º (Pacote Anticrime — EFICÁCIA SUSPENSA pelo STF na ADI 6298)
> "O juiz que conhecer do conteúdo da prova declarada inadmissível não poderá proferir a sentença ou acórdão"

### Prova ilícita PRO REO
- Doutrina e jurisprudência admitem
- Aplica princípio da proporcionalidade
- NÃO pode ser usada PRO SOCIETATE (contra ele)

## Provas em Espécie

### Exame de Corpo de Delito (Art 158)
- Indispensável nos crimes que deixam vestígios
- Súmula 361 STF: exame de corpo de delito direto

### Confissão (Art 197 a 200)
- Não tem mais valor absoluto (não é "rainha das provas")
- Pode ser retratada
- Vale em conjunto com outras provas

### Testemunha (Art 202)
- Toda pessoa pode ser testemunha
- Exceto: doentes mentais, < 14 anos (compromisso especial)
- Não compromissa: ascendente/descendente/cônjuge/companheiro/irmão/sogro

### Reconhecimento (Art 226)
- Procedimento específico (STJ HC 598.886/2020 — formalidades RIGOROSAS)
- Vítima descreve antes
- Pessoa entre outras semelhantes
- Auto detalhado

### Acareação (Art 229)
- Confronto entre depoimentos divergentes

### Interrogatório do Réu (Art 185-196)
- Direito ao silêncio
- Não é prova (é meio de defesa)
- Não tem mais ônus (não responde, não prejudica)

## Como cai na Cebraspe

**Item 1 (CERTO):** "O Código de Processo Penal adota, como regra geral, o sistema do livre convencimento motivado do juiz."

**Item 2 (ERRADO):** "A confissão é a rainha das provas, podendo, por si só, fundamentar sentença condenatória, independentemente de outras provas."
> Errado: superada — confissão precisa ser confrontada com outras provas.

**Item 3 (CERTO):** "A prova obtida em violação a normas de direito material é considerada prova ilícita, devendo ser desentranhada do processo."

**Item 4 (ERRADO):** "A prova ilícita por derivação não pode ser utilizada em nenhuma hipótese, ainda que se demonstre que poderia ser obtida por fonte independente."
> Errado: Art 157, §1º admite fonte independente e descoberta inevitável.

## Súmulas críticas
- **Súmula 14 STF Vinculante**: acesso da defesa ao IP
- **Súmula 522 STJ**: PRD em tráfico privilegiado
- **STF Tema 184**: investigação direta pelo MP é constitucional

## Estratégia
- Decore o Art 155 CPP literal (livre convencimento + exceções)
- Distinção ilícita (material) × ilegítima (processual)
- Memorize §§ do Art 157 (frutos da árvore envenenada, fonte indep, descoberta inevitável)
- Confissão NÃO é rainha (sistema atual)
- ADI 6298 suspendeu várias normas do Pacote Anticrime — atenção!
$md$,
  $resumo$
## Resumo — Teoria da Prova

### Sistemas (3)
- **Prova tarifada**: lei pesa (Brasil só em exceções)
- **Íntima convicção**: sem fundamentação (JÚRI)
- **Livre convencimento motivado** (Art 155): REGRA — fundamenta livre

### Art 155 CPP
- Decisão NÃO pode ser exclusivamente com prova do IP
- EXCEÇÃO: cautelar, não repetível, antecipada (essas podem fundamentar sozinhas)

### Ônus (Art 156)
- Quem alega prova
- Juiz pode determinar ex officio (mas Pacote Anticrime Art 3º-A vedou — eficácia SUSPENSA por ADI 6298)

### Fatos que dispensam prova
- Evidentes, notórios, presunções legais, inúteis

### Provas Ilegais — Gênero (Art 5º, LVI CF)
- **Ilícitas**: violação a direito MATERIAL (interceptação sem ordem)
- **Ilícitas por DERIVAÇÃO**: frutos da árvore envenenada (Art 157, §1º)
  - Exceções: **Fonte Independente** (§2º) + **Descoberta Inevitável**
- **Ilegítimas**: violação a norma PROCESSUAL (regime nulidades)

### Mnemônico
- **Ilícita** (08 letras) ↔ **Material** (08 letras)
- **Ilegítima** (10 letras) ↔ **Processual** (10 letras)

### Pacote Anticrime — Art 157, §5º (SUSPENSO ADI 6298)
Juiz que conhece prova ilícita NÃO pode sentenciar

### Prova ilícita PRO REO
- Admitida (proporcionalidade)
- NÃO admitida pro societate

### Provas em Espécie
- **Corpo de delito**: indispensável em crime com vestígio
- **Confissão**: NÃO é rainha; vale em conjunto
- **Testemunha**: regra, todos podem (exceções: doente mental, parentes não compromissados)
- **Reconhecimento** (Art 226): formalidades RIGOROSAS (HC 598.886 STJ)
- **Interrogatório**: meio de defesa; direito ao silêncio

### Pegadinhas Cebraspe
- Sistema é livre convencimento MOTIVADO, NÃO íntima convicção
- IP exclusivo só pra cautelar/antecipada/não-repetível
- Ilícita = MATERIAL; Ilegítima = PROCESSUAL
- Confissão NÃO é absoluta
- Art 3º-A e §5º Art 157 estão SUSPENSOS (ADI 6298)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PROC PENAL — Prisões e Liberdade Provisória
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-processual-penal',
  'Prisões e Liberdade Provisória (prisão em flagrante, preventiva, temporária)',
  'Prisões e Liberdade Provisória',
  $md$
# Prisões e Liberdade Provisória

Bloco vital pra Delegado, Agente, Escrivão. Cobra **espécies de prisão**, **requisitos**, **cautelares diversas**.

## Princípio Constitucional (Art 5º, LXI CF)
> "Ninguém será preso senão em flagrante delito ou por ordem escrita e fundamentada de autoridade judiciária competente, salvo nos casos de transgressão militar ou crime propriamente militar."

## Espécies de Prisão

### 1. Prisão em Flagrante (Art 301 a 310 CPP)

#### Hipóteses (Art 302)
1. **I — Próprio**: está cometendo OU acaba de cometer
2. **II — Impróprio (Perseguição)**: é perseguido logo após
3. **III — Presumido (Localização)**: encontrado logo depois com instrumentos do crime
4. **IV — Esperado**: combate de campana

#### Procedimento
- Qualquer do povo PODE prender em flagrante (Art 301)
- Autoridade DEVE prender (dever)
- Lavratura do APF (Auto de Prisão em Flagrante)
- Comunicação ao Juiz em **24 horas**
- Juiz analisa em **AUDIÊNCIA DE CUSTÓDIA** (até 24h após comunicação)

#### Decisões do Juiz na audiência de custódia (Art 310)
1. **Relaxar** a prisão ilegal
2. **Converter** em prisão preventiva (se preenchidos requisitos)
3. **Conceder liberdade provisória**, com ou sem fiança
4. Decidir sobre prisão domiciliar
5. Decidir sobre cautelares diversas (Art 319)

### 2. Prisão Preventiva (Art 311 a 316)

#### Cabimento (Art 313)
- Crime DOLOSO com pena MÁXIMA superior a 4 anos
- Réu **CONDENADO** por outro crime doloso (5 anos)
- Crime envolvendo violência doméstica/familiar (proteção da vítima)
- Dúvida sobre identidade do agente

#### Requisitos (Art 312) — **F-CONV-G-P**
- **F**umus comissi delicti: prova da existência do crime + indícios suficientes de autoria
- **CONV**eniência da instrução criminal
- **G**arantia da ordem pública/econômica
- **P**erigo gerado pelo estado de liberdade do imputado (Pacote Anticrime)
- **A**ssegurar aplicação da lei penal

#### Quem pode requerer
- MP, querelante, assistente da acusação, autoridade policial (representação)
- **Juiz NÃO pode decretar de ofício** (Pacote Anticrime — Art 311 antigo eliminou. Mas STF, na ADI 6298, suspendeu essa eficácia)

#### Revisão Periódica (Art 316, §único)
- A cada **90 dias** o órgão emissor deve revisar a necessidade
- Sob pena da prisão tornar-se ilegal

### 3. Prisão Temporária (Lei 7.960/89)

#### Hipóteses (Art 1º Lei 7.960)
Cabimento cumulativo OU isolado:
- **I — Imprescindível para investigações** do IP
- **II — Indiciado não tem residência fixa ou não fornece identidade**
- **III — Em crime de:**
  - Homicídio doloso
  - Sequestro/cárcere
  - Roubo
  - Extorsão
  - Extorsão mediante sequestro
  - Estupro
  - Atentado violento ao pudor
  - Epidemia com resultado morte
  - Tráfico ilícito de drogas
  - Outros crimes hediondos

#### Prazos
- **5 dias** prorrogáveis por igual período em CRIMES COMUNS
- **30 dias** prorrogáveis por igual período em CRIMES HEDIONDOS (Lei 8.072)

#### Quem pode requerer
- MP ou autoridade policial (representação)
- Juiz NÃO decreta de ofício

## Liberdade Provisória

### Sem fiança (Art 321 CPP)
- Juiz pode conceder ouvindo o MP
- Vincula a cumprimento de cautelares diversas (Art 319)

### Com fiança (Art 322 a 350)
- Inafiançáveis (Art 5º, XLII, XLIII, XLIV CF + Art 323 CPP):
  - **Racismo**
  - **Tortura, tráfico, hediondos**
  - **Ação de grupos armados contra ordem constitucional**

## Medidas Cautelares Diversas (Art 319 CPP)

### Catálogo
1. Comparecimento periódico em juízo
2. Proibição de acesso a determinados lugares
3. Proibição de contato com pessoa determinada
4. Proibição de ausentar-se da Comarca
5. Recolhimento domiciliar no período noturno e dias de folga
6. Suspensão do exercício de função pública/atividade econômica
7. Internação provisória do acusado nas hipóteses do Art 26 CP
8. **Monitoração eletrônica**
9. Fiança (Art 319, VIII)

## Como cai na Cebraspe

**Item 1 (CERTO):** "A prisão temporária somente cabe nas hipóteses taxativamente previstas na Lei 7.960/89, e seu prazo máximo é de 5 dias prorrogáveis por igual período em crimes comuns."

**Item 2 (ERRADO):** "A prisão preventiva pode ser decretada pelo juiz de ofício, em qualquer fase do processo, conforme entendimento atual do CPP."
> Errado: Pacote Anticrime eliminou. STF suspendeu eficácia da norma — mas a doutrina majoritária diz que NÃO pode mais.

**Item 3 (CERTO):** "A audiência de custódia deve ser realizada em até 24 horas a contar da comunicação da prisão em flagrante, sob pena de relaxamento."

**Item 4 (ERRADO):** "A prisão preventiva tem prazo máximo de 30 dias, podendo ser prorrogada uma única vez."
> Errado: NÃO tem prazo máximo (mas há revisão periódica obrigatória de 90 dias).

## Súmulas críticas
- **Súmula 9 STJ**: a exigência de prisão provisória pra apelar não ofende a presunção de inocência
- **STF, HC 84.078**: princípio da presunção de inocência → execução só após trânsito em julgado (depois revertido com Lei 13.964/19, mas STF ainda discute)

## Estratégia
- Decore os 4 tipos de flagrante (próprio, impróprio, presumido, esperado)
- Audiência de custódia: 24h
- Preventiva: requisitos F-CONV-G-P + Art 313 (pena > 4 anos)
- Temporária: 5+5 comum / 30+30 hediondo
- Cautelares diversas: Art 319 (9 medidas)
- Inafiançáveis: racismo, tortura, tráfico, hediondos, ação contra Estado
$md$,
  $resumo$
## Resumo — Prisões e Liberdade Provisória

### Princípio (Art 5º, LXI CF)
Só flagrante ou ordem judicial fundamentada

### Flagrante (Art 302) — 4 tipos
- **Próprio** (I): está cometendo / acaba de cometer
- **Impróprio** (II): perseguição logo após
- **Presumido** (III): encontrado com instrumentos logo depois
- **Esperado** (IV): campana

### Audiência de Custódia (24h)
Juiz decide (Art 310):
1. RELAXAR ilegal
2. CONVERTER em preventiva
3. CONCEDER liberdade provisória
4. Prisão domiciliar
5. Cautelares diversas

### Preventiva (Art 311-316)
**Cabimento (Art 313)**:
- Crime DOLOSO com pena máx > 4 anos
- Reincidente em crime doloso (5 anos)
- Violência doméstica
- Dúvida identidade

**Requisitos F-CONV-G-P (Art 312)**:
- Fumus comissi delicti
- CONVeniência da instrução
- Garantia ordem pública/econômica
- Perigo gerado pelo estado de liberdade

**Revisão**: cada 90 dias
**Juiz NÃO decreta de ofício** (Pac. Anticrime, eficácia ADI 6298)

### Temporária (Lei 7.960/89)
- 5+5 dias COMUNS
- **30+30 dias HEDIONDOS**
- Rol TAXATIVO (homicídio, roubo, extorsão, estupro, tráfico, hediondos)

### Inafiançáveis (Art 5º CF + 323 CPP)
- Racismo
- Tortura, Tráfico, Hediondos
- Ação grupos armados

### Cautelares Diversas (Art 319) — 9 medidas
Comparecimento, proib. lugares, proib. contato, proib. sair Comarca, recolhimento noturno, suspensão função, internação provisória, monitoração eletrônica, fiança

### Pegadinhas Cebraspe
- Audiência de custódia em **24h**
- Preventiva NÃO tem prazo máximo (revisão 90 dias)
- Temporária: 5+5 ou 30+30
- Juiz NÃO decreta cautelar de ofício
- Inafiançáveis: **RACISMO, TORTURA, TRÁFICO, HEDIONDOS, ação grupos armados**
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PROC PENAL — Recursos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-processual-penal',
  'Recursos no Processo Penal',
  'Recursos no Processo Penal',
  $md$
# Recursos no Processo Penal

Tema de média cobrança. Cobra **espécies**, **prazos** e **efeitos**.

## Princípios Recursais
- **Voluntariedade**: parte decide recorrer
- **Taxatividade**: só os previstos em lei
- **Unirrecorribilidade**: só um recurso por decisão (regra)
- **Fungibilidade** (Art 579): aceita recurso errado se não houve má-fé
- **Non reformatio in pejus**: apelo do réu não agrava sua situação

## Tabela de Recursos (memorize prazos!)

| Recurso | Prazo | Cabível contra |
|---|---|---|
| Apelação | 5 dias | Sentença, decisões definitivas |
| Recurso em Sentido Estrito (RESE) | 5 dias | Art 581 (rol taxativo) |
| Embargos de Declaração | 2 dias | Obscuridade, ambiguidade, omissão, contradição |
| Embargos Infringentes | 10 dias | Tribunal — divergência em acórdão NÃO unânime |
| Carta Testemunhável | 48h | Despacho que denega recurso |
| Agravo de Execução | 5 dias | Decisão do Juiz de Execução Penal |
| Recurso Especial (REsp) | 15 dias | Acórdão violar lei federal — STJ |
| Recurso Extraordinário (RE) | 15 dias | Acórdão violar CF — STF |

## 1. Apelação (Art 593)

### Cabimento
- Sentença CONDENATÓRIA ou ABSOLUTÓRIA
- Decisão que extingue punibilidade
- Decisões do Tribunal do Júri (com hipóteses específicas)

### Prazo: 5 dias (Art 593)
- Em apartado: razões + contrarrazões em 8 dias cada

### Pacote Anticrime — Soberania dos Veredictos
- Apelação do Júri: hipóteses RESTRITAS (Art 593, III)

### Apelação Pro Reo
- MP tem prazo de 5 dias
- Vedada reformatio in pejus

## 2. RESE — Recurso em Sentido Estrito (Art 581)

### Cabimento — ROL TAXATIVO Art 581
Principais hipóteses:
- I — não receber denúncia/queixa
- II — concluir pela incompetência
- III — julgar procedente exceção (litispendência, coisa julgada)
- IV — pronunciar/impronunciar
- V — conceder/negar HC
- IX — conceder/cassar fiança
- XII — extinguir punibilidade

### Prazo: 5 dias

## 3. Embargos de Declaração (Art 619-620)

### Cabimento
Acórdão com:
- **Ambiguidade**
- **Obscuridade**
- **Contradição**
- **Omissão**

### Prazo: 2 dias

### Efeito: interrompe prazo de outros recursos

## 4. Carta Testemunhável (Art 639-646)

### Cabimento
- Despacho que NEGAR recurso
- Despacho que, embora admitindo recurso, OBSTAR seu seguimento

### Prazo: 48 horas
- Recurso EXCEPCIONAL

## 5. Recurso Ordinário Constitucional — ROC (Art 102, II CF)

### Cabimento
- HC decididos em última instância pelos Tribunais Superiores

### Prazo: 5 dias (HC) / 15 dias (outros)

## 6. REsp e RE (CF 105, III e 102, III)

### Recurso Especial — REsp (STJ)
- Decisão CONTRA literal lei federal
- Divergência jurisprudencial

### Recurso Extraordinário — RE (STF)
- Decisão CONTRA dispositivo constitucional
- Lei federal declarada inconstitucional
- Repercussão geral
- Prazo: 15 dias

## Efeitos dos Recursos

### Devolutivo
- Devolve análise ao tribunal superior
- TODO recurso tem

### Suspensivo
- Suspende eficácia da decisão
- NÃO é a regra — depende da espécie
- Apelação de sentença condenatória NÃO tem suspensivo automático (Lei 11.719/08 alterou)
- HC em prol da liberdade: SUSPENSIVO automático

### Regressivo
- Permite ao juiz prolator reformar a decisão (raro no processo penal)

### Extensivo (Art 580)
- Decisão favorável a um RÉU se estende aos demais corréus em mesmas condições

## Reformatio in pejus
- Apelo EXCLUSIVO do réu: vedado agravar
- Apelo do MP: pode agravar

## Como cai na Cebraspe

**Item 1 (CERTO):** "O recurso em sentido estrito tem prazo de 5 dias e é cabível apenas nas hipóteses taxativamente previstas no art. 581 do CPP."

**Item 2 (ERRADO):** "Os embargos de declaração têm o prazo de 5 dias, sendo cabíveis contra qualquer decisão judicial."
> Errado: prazo **2 dias** e cabíveis contra acórdãos com vícios específicos.

**Item 3 (CERTO):** "É vedada a reformatio in pejus quando o recurso é manejado exclusivamente pela defesa."

**Item 4 (ERRADO):** "A apelação em processo penal tem prazo de 15 dias, contados da intimação da sentença."
> Errado: **5 dias** (Art 593 CPP).

## Súmulas
- **STJ Súmula 351**: prazo da apelação MP começa da intimação pessoal
- **STJ Súmula 96**: extorsão é crime formal (referência cruzada)

## Estratégia
- Prazo padrão CPP: 5 dias
- Embargos: 2 dias
- Carta Testemunhável: 48h
- REsp/RE: 15 dias (regime CPC)
- Reformatio in pejus: VEDADA se recurso só da defesa
- RESE: rol TAXATIVO (Art 581 — memorize as 5 mais importantes)
$md$,
  $resumo$
## Resumo — Recursos no Processo Penal

### Prazos (MEMORIZE)
| Recurso | Prazo |
|---|---|
| Apelação | **5 dias** |
| RESE | 5 dias |
| Embargos Declaração | **2 dias** |
| Embargos Infringentes | 10 dias |
| Carta Testemunhável | **48h** |
| Agravo de Execução | 5 dias |
| REsp / RE | **15 dias** |

### Princípios
- Voluntariedade, taxatividade, unirrecorribilidade
- **Fungibilidade** (Art 579): aceita erro sem má-fé
- **Non reformatio in pejus**: defesa não piora com seu próprio recurso

### Apelação (Art 593)
- Sentença condenatória/absolutória, decisão Júri (limitada — Soberania Veredictos)
- Razões/contrarrazões: 8 dias cada

### RESE (Art 581) — ROL TAXATIVO
Principais hipóteses:
- Não recebimento denúncia (I)
- Incompetência (II)
- Procedência exceção (III)
- Pronúncia/impronúncia (IV)
- HC concedido/negado (V)
- Extinção punibilidade (XII)

### Embargos Declaração (Art 619-620)
- Acórdão com: AMBIGUIDADE, OBSCURIDADE, CONTRADIÇÃO, OMISSÃO
- Interrompe prazo

### Carta Testemunhável (48h)
Contra despacho que NEGA ou OBSTA seguimento de recurso

### Efeitos
- **Devolutivo**: todo recurso
- **Suspensivo**: depende — apelação NÃO tem automático
- **Extensivo** (Art 580): decisão favorável estende a corréus em mesmas condições

### Pegadinhas Cebraspe
- Apelação: 5 dias (NÃO 15)
- Embargos: 2 dias (NÃO 5)
- RESE: rol TAXATIVO (Art 581)
- Reformatio in pejus VEDADA na defesa
- Carta Testemunhável: 48h
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação
-- ──────────────────────────────────────────────────────────────────────────
SELECT m.title, s.slug AS subject, t.name AS topic, m.status, (r.id IS NOT NULL) AS has_resumo
FROM "materials" m
JOIN "subjects" s ON s.id = m."subjectId"
JOIN "topics" t ON t.id = m."topicId"
LEFT JOIN "material_resumos" r ON r."materialId" = m.id
WHERE m.origin = 'ai'
ORDER BY s.slug, t."order";

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
