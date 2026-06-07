-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 8 — Cebraspe complementar (PF Delegado)
-- Data: 2026-06-07
--
-- 8 materiais densos (DRAFT — aguarda revisão admin):
--  - Direito Civil: LINDB+Pessoas, Negócios Jurídicos+Prescrição, Obrigações+Contratos, Responsabilidade Civil
--  - Direito Tributário: SFN+Obrigação Tributária, Crédito Tributário+Lançamento
--  - Direito Ambiental: Princípios+PNMA+Crimes Ambientais
--  - Direito Empresarial: Empresário+Sociedades+Títulos
--
-- Cria 8 topics novos (idempotente WHERE NOT EXISTS).
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED. Depende do seed PF e PCDF Delegado.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. CRIAÇÃO DE TOPICS (idempotente) ────────────────────────────────────

DO $topics$
DECLARE v_subject_id text;
BEGIN
  -- DIREITO CIVIL
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-civil';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'LINDB e Pessoas Naturais e Jurídicas', 'civ-lindb-pessoas', 1.2, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'LINDB e Pessoas Naturais e Jurídicas');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Negócios Jurídicos, Prescrição e Decadência', 'civ-negocios-prescricao', 1.3, 101, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Negócios Jurídicos, Prescrição e Decadência');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Obrigações e Contratos', 'civ-obrig-contratos', 1.2, 102, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Obrigações e Contratos');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Responsabilidade Civil', 'civ-resp-civil', 1.3, 103, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Responsabilidade Civil');
  END IF;

  -- DIREITO FINANCEIRO E TRIBUTÁRIO
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-financeiro-e-tributario';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Sistema Tributário Nacional e Obrigação Tributária', 'trib-stn-obrigacao', 1.3, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Sistema Tributário Nacional e Obrigação Tributária');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Crédito Tributário e Lançamento', 'trib-credito-lancamento', 1.3, 101, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Crédito Tributário e Lançamento');
  END IF;

  -- DIREITO AMBIENTAL
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-ambiental';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Princípios, PNMA e Crimes Ambientais (Lei 9.605/98)', 'amb-pnma-crimes', 1.2, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Princípios, PNMA e Crimes Ambientais (Lei 9.605/98)');
  END IF;

  -- DIREITO EMPRESARIAL
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-empresarial';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Empresário, Sociedades e Títulos de Crédito', 'emp-empresario-sociedades-titulos', 1.2, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Empresário, Sociedades e Títulos de Crédito');
  END IF;
END $topics$;

-- ─── 2. FUNÇÃO UPSERT ──────────────────────────────────────────────────────

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

-- ─── 3. MATERIAIS ──────────────────────────────────────────────────────────

-- ┌─ 1. DIREITO CIVIL — LINDB e Pessoas ─────────────────────────────────────┐
SELECT upsert_material(
  'direito-civil',
  'LINDB e Pessoas Naturais e Jurídicas',
  'LINDB, Pessoas Naturais e Pessoas Jurídicas',
$content$
# LINDB, Pessoas Naturais e Pessoas Jurídicas

A **LINDB (Lei de Introdução às Normas do Direito Brasileiro — Decreto-Lei 4.657/42)** é uma metalei: ela não regula relações entre pessoas, e sim como o sistema jurídico brasileiro funciona. Cebraspe ama esse assunto porque o examinando despreparado confunde LINDB com Código Civil e erra.

## 1. LINDB — Vigência, Eficácia e Aplicação

### 1.1. Vigência da lei (arts. 1º a 2º)

- **Vacatio legis padrão**: 45 dias após publicação oficial, salvo disposição em contrário. Nos Estados estrangeiros, 3 meses.
- **Princípio da continuidade**: lei vigente até modificação ou revogação por outra lei. Lei NÃO se revoga pelo desuso.
- **Revogação**:
  - **Expressa**: a nova lei diz literalmente "revoga-se a Lei X".
  - **Tácita**: incompatibilidade com a anterior OU regulação inteira da matéria.
- **Repristinação**: lei revogadora é revogada → lei anterior NÃO volta a vigorar automaticamente. Só com disposição expressa.

### 1.2. Obrigatoriedade (art. 3º)

> "Ninguém se escusa de cumprir a lei, alegando que não a conhece."

Presunção **absoluta** (não admite prova em contrário) de conhecimento da lei após vigência.

### 1.3. Integração — preenchimento de lacunas (art. 4º)

Quando a lei é omissa, o juiz decide na seguinte ORDEM:
1. **Analogia**
2. **Costumes**
3. **Princípios gerais de direito**

> ⚠️ Cebraspe troca a ordem. Memorize: A-C-P.

### 1.4. Aplicação da lei (art. 5º)

> "Na aplicação da lei, o juiz atenderá aos fins sociais a que ela se dirige e às exigências do bem comum."

### 1.5. Direito intertemporal (art. 6º)

A lei nova respeita:
- **Ato jurídico perfeito**
- **Direito adquirido**
- **Coisa julgada**

### 1.6. Aplicação no espaço (arts. 7º-19)

- Estatuto pessoal: lei do **domicílio** rege começo/fim da personalidade, nome, capacidade e direitos de família.
- Bens: lei do **lugar onde se situam** (lex rei sitae).
- Obrigações: lei do **país em que se constituírem**.
- Sucessão: lei do **domicílio do falecido**, salvo se mais favorável ao herdeiro brasileiro for a lei brasileira (CF art. 5º, XXXI).

### 1.7. Decisões na esfera pública (arts. 20-30 — incluídos pela Lei 13.655/18)

Inovação importante para Cebraspe:
- **Art. 20**: decisões administrativas, controladoras e judiciais nas esferas pública não podem se basear em valores jurídicos abstratos sem considerar consequências práticas.
- **Art. 21**: invalidação de ato deve indicar consequências e regularização.
- **Art. 22**: na interpretação de normas sobre gestão pública, considerar obstáculos reais.
- **Art. 28**: agente público só responde pessoalmente por dolo ou erro grosseiro.

## 2. Pessoas Naturais

### 2.1. Personalidade

- **Início**: do **nascimento com vida** (art. 2º CC) — basta uma respiração.
- **Nascituro**: tem direitos resguardados desde a concepção (teoria condicionalista — majoritária).
- **Capacidade de direito**: TODOS têm. Não pode ser negada.
- **Capacidade de fato**: depende da idade e do discernimento.

### 2.2. Incapazes

**Absolutamente incapazes** (art. 3º — após Estatuto da Pessoa com Deficiência 13.146/15):
- **APENAS os menores de 16 anos.**

**Relativamente incapazes** (art. 4º):
- Maiores de 16 e menores de 18.
- Ébrios habituais e viciados em tóxicos.
- Os que, por causa transitória ou permanente, não puderem exprimir sua vontade.
- Os pródigos.

> ⚠️ Antes do EPD, os "deficientes mentais" eram absolutamente incapazes. **Cebraspe ama essa pegadinha pós-2015.** PCD não é mais incapaz por padrão — só com avaliação biopsicossocial.

### 2.3. Emancipação (art. 5º)

Antecipação da capacidade plena. Tipos:
- **Voluntária**: pais, por escritura pública, para maior de 16.
- **Judicial**: tutor, mediante sentença, ouvido o tutelado.
- **Legal**: casamento, emprego público efetivo, colação de grau em ensino superior, estabelecimento civil/comercial ou economia própria com 16 anos.

### 2.4. Fim da personalidade

- **Morte real** (art. 6º): cerebral, comprovada por médico.
- **Morte presumida**:
  - **Com ausência declarada** (art. 6º): após sucessão definitiva (10 anos da abertura da provisória).
  - **Sem ausência** (art. 7º): se desaparecimento muito provável (catástrofe, guerra) OU 2 anos após o término de guerra.
- **Comoriência** (art. 8º): mortes simultâneas, sem prova de ordem cronológica → presume-se ocorridas ao mesmo tempo.

### 2.5. Direitos da personalidade (arts. 11-21)

- Características: **intransmissíveis, irrenunciáveis, indisponíveis, vitalícios, absolutos**.
- Disposição do próprio corpo (art. 13): vedada se contrariar bons costumes ou diminuir permanentemente a integridade.
- Imagem (art. 20): tutelada — uso sem autorização gera dano moral mesmo sem prova de prejuízo (Súmula 403 STJ).

## 3. Pessoas Jurídicas

### 3.1. Classificação

**De direito público:**
- Externo: Estados estrangeiros, ONU, organismos internacionais.
- Interno: União, Estados, DF, Municípios, autarquias, fundações públicas.

**De direito privado:**
- Associações (sem fins econômicos).
- Sociedades (com fim econômico — empresariais ou simples).
- Fundações (acervo + finalidade).
- Organizações religiosas.
- Partidos políticos.
- EIRELI (revogada pela Lei 14.195/21 — virou sociedade limitada unipessoal).

### 3.2. Início da personalidade

- PJ de direito privado: **registro do ato constitutivo** no órgão competente (Junta Comercial para sociedades empresariais, Cartório de RCPJ para sociedades simples e associações).
- PJ de direito público: lei.

### 3.3. Desconsideração da personalidade jurídica (art. 50)

Quando há **abuso da personalidade** caracterizado por:
- Desvio de finalidade.
- Confusão patrimonial.

A Lei 13.874/19 (Liberdade Econômica) acrescentou critérios objetivos:
- Confusão patrimonial: cumprimento repetitivo de obrigações por outra PJ; transferências sem contraprestação efetiva.
- Desvio de finalidade: ato com propósito de lesar credores/cometer ilícitos.

**Sócios atingidos**: apenas os que foram diretamente beneficiados ou que praticaram o ato — não todos automaticamente.

### 3.4. Fim da pessoa jurídica

- Dissolução convencional.
- Dissolução judicial.
- Dissolução administrativa (ex: cassação).
- Liquidação: realização do ativo, pagamento do passivo.

## 4. Domicílio (arts. 70-78)

- **Natural**: o lugar onde a pessoa estabelece residência com ânimo definitivo.
- **Plurality**: pode haver mais de um (art. 71).
- **Necessário** (art. 76):
  - Incapaz: o dos pais/responsáveis.
  - Servidor público: onde exerce permanentemente.
  - Militar: onde servir, ou para a Marinha/Aeronáutica, na sede do comando.
  - Marítimo: onde o navio estiver matriculado.
  - Preso: o lugar em que cumprir a sentença.

## 5. Como Cebraspe cobra

- **C/E sobre vacatio legis**: "A lei começa a vigorar no Brasil 45 dias após publicação no DOU" → **CORRETO** (salvo disposição em contrário).
- **C/E pessoas com deficiência**: "São absolutamente incapazes os deficientes mentais que não tiverem discernimento" → **ERRADO** (após 2015, só menores de 16).
- **C/E nascituro**: "O nascituro tem personalidade jurídica plena desde a concepção" → **ERRADO** (personalidade só com nascimento; nascituro tem expectativa).
- **C/E LINDB no espaço**: "A sucessão por morte do estrangeiro residente no Brasil sempre será regida pela lei do domicílio" → **ERRADO** (se a lei brasileira for mais favorável ao herdeiro brasileiro, ela prevalece — CF 5º, XXXI).
$content$,
$resumo$
# Resumo Estratégico — LINDB e Pessoas

## LINDB

| Tema | Regra-chave |
|---|---|
| Vacatio legis | 45 dias (BR) / 3 meses (exterior) salvo disposição contrária |
| Conhecimento da lei | Presunção ABSOLUTA |
| Integração de lacunas | Analogia → Costumes → Princípios |
| Repristinação | NÃO automática — só com lei expressa |
| Direito intertemporal | Respeitar ato jurídico perfeito, direito adquirido, coisa julgada |
| Sucessão de estrangeiro | Lei do domicílio salvo se BR mais favorável ao herdeiro |
| Decisões públicas | Considerar consequências práticas (arts. 20-30) |
| Agente público | Responde por dolo ou erro grosseiro (art. 28) |

## Pessoas Naturais

- **Personalidade**: começa com nascimento com vida. Nascituro = expectativa.
- **Absolutamente incapazes**: SÓ menores de 16 (pós-EPD 2015).
- **Relativamente incapazes**: 16-18, ébrios habituais, viciados, sem discernimento transitório/permanente, pródigos.
- **Emancipação**: voluntária (pais), judicial (tutor), legal (casamento, emprego efetivo, colação superior, estabelecimento próprio com 16+).
- **Morte presumida**: sem ausência se desaparecimento provável OU 2 anos pós-guerra.
- **Comoriência**: presunção de simultaneidade.
- **Direitos da personalidade**: intransmissíveis, irrenunciáveis, indisponíveis, vitalícios, absolutos.

## Pessoas Jurídicas

- **Início (privadas)**: registro do ato constitutivo.
- **Desconsideração (art. 50)**: abuso → desvio de finalidade ou confusão patrimonial. Atinge SÓ sócios beneficiados/responsáveis (Lei 13.874/19).
- **EIRELI**: extinta — virou LTDA unipessoal.

## Domicílio

- Onde reside com ânimo definitivo.
- Pode ter mais de um.
- Necessário: incapaz (responsável), servidor (lotação), militar (servir), marítimo (matrícula), preso (cumprimento).

## Top pegadinhas Cebraspe

1. PCD NÃO é mais absolutamente incapaz (pós-Lei 13.146/15).
2. Nascituro tem PROTEÇÃO, não personalidade plena.
3. Repristinação só com lei expressa.
4. Sucessão de estrangeiro pode aplicar lei BR se for melhor pro herdeiro BR.
5. Desconsideração só atinge sócios envolvidos no abuso.
$resumo$
);

-- ┌─ 2. DIREITO CIVIL — Negócios Jurídicos + Prescrição ─────────────────────┐
SELECT upsert_material(
  'direito-civil',
  'Negócios Jurídicos, Prescrição e Decadência',
  'Negócios Jurídicos, Prescrição e Decadência',
$content$
# Negócios Jurídicos, Prescrição e Decadência

Os defeitos do negócio jurídico e a diferença entre prescrição e decadência aparecem em **TODA prova de Cebraspe**. São os assuntos onde mais alunos perdem ponto por confusão conceitual.

## 1. Fato Jurídico

Gênero amplo: qualquer evento que produz efeitos jurídicos.
- **Fato jurídico stricto sensu**: natural (morte, raio).
- **Ato jurídico**: ação humana.
  - **Lícito**: ato jurídico em sentido estrito (testamento, casamento) e **negócio jurídico** (com declaração de vontade dirigida a fim).
  - **Ilícito**: gera responsabilidade.

## 2. Negócio Jurídico

### 2.1. Planos de existência, validade e eficácia (Escala Ponteana)

**EXISTÊNCIA** (pressupostos):
- Agente
- Vontade
- Objeto
- Forma

**VALIDADE** (art. 104):
- Agente CAPAZ
- Objeto LÍCITO, POSSÍVEL, DETERMINADO ou DETERMINÁVEL
- Forma PRESCRITA ou NÃO DEFESA em lei

**EFICÁCIA** (produção de efeitos):
- Termo, condição, encargo.

> ⚠️ Cebraspe troca: "Para a validade do negócio jurídico, exige-se forma livre." → ERRADO. Forma prescrita OU não defesa.

### 2.2. Elementos acidentais

- **Condição** (art. 121): evento futuro e **incerto**.
  - Suspensiva: efeitos suspensos até evento.
  - Resolutiva: efeitos cessam com evento.
  - Lícita ou ilícita; pure-potestativa = nula.
- **Termo** (art. 131): evento futuro e **certo**. Suspende exercício, não direito.
- **Encargo/Modo** (art. 136): obrigação acessória nas liberalidades. NÃO suspende aquisição (salvo cláusula expressa).

## 3. Defeitos do Negócio Jurídico

### 3.1. Anuláveis (arts. 138-165)

**Erro** (art. 138):
- Substancial e escusável.
- Recai sobre natureza, pessoa, objeto principal ou qualidade essencial.
- Anulabilidade.

**Dolo** (art. 145):
- Artifício de uma parte para induzir outra a erro.
- Dolo principal = anula; dolo acidental = só perdas e danos.

**Coação** (art. 151):
- Vis compulsiva — temor de mal injusto, atual, sério.
- Anula o negócio. Temor reverencial NÃO é coação.

**Estado de perigo** (art. 156):
- Necessidade de salvar a si/família + outra parte ciente + obrigação excessivamente onerosa.

**Lesão** (art. 157):
- Premente necessidade + inexperiência + desproporção manifesta entre prestações.
- Diferente do estado de perigo: não exige ciência da outra parte; basta a desproporção.

**Fraude contra credores** (art. 158):
- Devedor insolvente aliena/onera bens.
- Eventus damni (dano ao credor) + consilium fraudis (ciência do adquirente, presumida se gratuita).
- Ação pauliana → anula o ato.

### 3.2. Nulos (art. 166)

- Agente absolutamente incapaz.
- Objeto ilícito, impossível ou indeterminável.
- Motivo determinante comum ilícito.
- Não revestir forma prescrita.
- Preterida solenidade essencial.
- Lei declarar nulo.
- **Simulação** (art. 167) — antes era anulável; hoje é NULA.

### 3.3. Tabela de comparação

| Característica | Nulo | Anulável |
|---|---|---|
| Vícios | Substanciais (matéria pública) | Vícios de consentimento (interesse privado) |
| Quem alega | Qualquer interessado, MP, juiz de ofício | Só o prejudicado |
| Prazo | Imprescritível (controversa) | Decadencial (4 anos regra geral) |
| Saneamento | Não admite | Admite confirmação |
| Efeitos | Ex tunc (retroativo) | Ex tunc após sentença |

## 4. Prescrição e Decadência

### 4.1. Diferença fundamental

| Critério | Prescrição | Decadência |
|---|---|---|
| Objeto | **Pretensão** (direito subjetivo violado) | **Direito potestativo** |
| Início | Violação do direito | Nascimento do direito |
| Interrupção/Suspensão | SIM (arts. 197-204) | NÃO (regra), salvo legal |
| Renúncia | Só após consumada | Não admite (decadência legal) |
| Reconhecimento pelo juiz | DEVE de ofício (após Lei 11.280/06) | DEVE de ofício (se legal) |
| Convencional? | Não — só legal | Sim, pode ser legal ou convencional |

### 4.2. Prazo geral

- **Prescrição geral**: **10 anos** (art. 205). Quando a lei não fixar prazo menor.
- **Decadência**: varia. Sem prazo legal = não decai.

### 4.3. Prescrições especiais mais cobradas (art. 206)

- **1 ano**: hospedagem, segurados contra seguradoras (algumas), tabeliães.
- **2 anos**: alimentos.
- **3 anos**: aluguéis; ressarcimento enriquecimento sem causa; **reparação civil**; cobrança de dívidas líquidas em instrumento particular; haveres de profissionais liberais.
- **4 anos**: tutela.
- **5 anos**: dívidas líquidas em instrumento público/particular; profissionais liberais; vencedor cobrar do vencido honorários e custas.

> ⚠️ **Reparação civil = 3 anos** — Cebraspe TENTA confundir com 5.
> ⚠️ Ação contra Fazenda Pública (Dec. 20.910/32): **5 anos** — não os 3 do CC.

### 4.4. Causas que impedem ou suspendem (arts. 197-201)

- Entre cônjuges na constância do casamento.
- Entre ascendentes e descendentes durante poder familiar.
- Entre tutelados/curatelados e seus tutores/curadores.
- Contra absolutamente incapazes (menores de 16).
- Contra ausentes do país a serviço público.
- Contra militares em tempo de guerra.

### 4.5. Causas de interrupção (art. 202)

A interrupção **só pode ocorrer UMA vez** (art. 202, caput):
- Despacho do juiz que ordenar citação.
- Protesto cambial.
- Apresentação do título de crédito em juízo de inventário/concurso.
- Qualquer ato judicial inequívoco que constitua o devedor em mora.
- Qualquer ato inequívoco do devedor reconhecendo a dívida.

Reiniciada a contagem, corre o prazo INTEGRAL.

## 5. Como Cebraspe cobra

- **C/E erro x dolo**: "No erro, há artifício de uma das partes para induzir a outra" → **ERRADO** (isso é dolo; erro é falsa percepção espontânea).
- **C/E simulação**: "A simulação torna o negócio jurídico anulável" → **ERRADO** (é NULO desde 2002).
- **C/E reparação civil**: "A pretensão de reparação civil prescreve em 5 anos" → **ERRADO** (3 anos).
- **C/E decadência**: "Os prazos decadenciais podem ser interrompidos ou suspensos" → **ERRADO** (regra: não admitem, salvo lei especial).
- **C/E ofício do juiz**: "O juiz só pode reconhecer prescrição se houver provocação" → **ERRADO** (após 2006, DEVE de ofício).
$content$,
$resumo$
# Resumo Estratégico — Negócios Jurídicos, Prescrição e Decadência

## Negócio jurídico — Escala Ponteana

**Existência** (agente, vontade, objeto, forma) → **Validade** (agente capaz, objeto lícito/possível/determinável, forma prescrita ou não defesa) → **Eficácia** (termo, condição, encargo).

## Defeitos — anulam o NJ (prazo 4 anos)

| Defeito | Característica |
|---|---|
| Erro | Falsa percepção espontânea (essencial + escusável) |
| Dolo | Artifício de uma das partes |
| Coação | Mal injusto, atual, sério (vis compulsiva) |
| Estado de perigo | Salvar a si/família + outra parte ciente |
| Lesão | Necessidade + inexperiência + desproporção |
| Fraude contra credores | Insolvência + dano + consilium fraudis |

## Nulos x Anuláveis

**NULO** (art. 166): incapaz absoluto, objeto ilícito/impossível/indeterminável, motivo comum ilícito, forma não respeitada, lei declara, **SIMULAÇÃO**.
**ANULÁVEL**: vícios de consentimento + relativamente incapaz.

## Prescrição x Decadência

| | Prescrição | Decadência |
|---|---|---|
| Objeto | Pretensão | Direito potestativo |
| Início | Violação | Nascimento do direito |
| Suspensão/Interrupção | SIM | NÃO (regra) |
| Convencional | NÃO | SIM |
| Juiz de ofício | SIM (todas) | SIM (legais) |

## Prazos prescricionais essenciais

- **Geral**: 10 anos
- **Reparação civil**: **3 anos** ⚠️
- **Aluguéis, enriquecimento sem causa**: 3 anos
- **Alimentos**: 2 anos
- **Dívidas em título público/particular**: 5 anos
- **Contra Fazenda Pública**: 5 anos (Dec. 20.910/32)

## Interrupção (UMA vez)

Citação, protesto cambial, ato judicial inequívoco, reconhecimento do devedor.

## Top pegadinhas Cebraspe

1. Simulação = **NULA** (não anulável).
2. Reparação civil = **3 anos**.
3. Decadência LEGAL = juiz reconhece de ofício; CONVENCIONAL = só a parte.
4. Erro é espontâneo, dolo é induzido.
5. Estado de perigo exige ciência da outra parte; lesão NÃO.
$resumo$
);

-- ┌─ 3. DIREITO CIVIL — Obrigações + Contratos ──────────────────────────────┐
SELECT upsert_material(
  'direito-civil',
  'Obrigações e Contratos',
  'Obrigações e Contratos — Teoria Geral',
$content$
# Obrigações e Contratos — Teoria Geral

Direito das Obrigações é o "esqueleto" do direito patrimonial. Sem esse domínio, contratos, responsabilidade civil e direito empresarial ficam confusos. Cebraspe cobra teoria pura e exemplos clássicos.

## 1. Obrigação — Conceito e Estrutura

**Obrigação**: relação jurídica entre **credor** e **devedor** com objeto = **prestação** (dar, fazer ou não fazer).

Elementos:
- **Sujeitos**: credor (sujeito ativo) e devedor (sujeito passivo).
- **Objeto**: prestação positiva ou negativa.
- **Vínculo jurídico**: a *responsabilidade* (lex commissoria) + *debitum* (a dívida).

## 2. Classificação das Obrigações

### 2.1. Quanto ao objeto

**De dar**:
- Coisa certa: individualizada (art. 233).
- Coisa incerta: gênero + quantidade; escolha cabe ao devedor salvo disposição em contrário (art. 244).

**De fazer**:
- Fungível (qualquer um pode executar).
- Infungível (só o devedor — ex: pintar quadro autoral).
- Em caso de inadimplemento da infungível: perdas e danos.

**De não fazer**: abstenção. Inadimplemento = praticar o ato.

### 2.2. Quanto aos sujeitos

- **Solidária** (art. 264): cada credor pode exigir tudo OU cada devedor responde por tudo.
  - **NÃO se presume**: decorre de lei ou contrato (art. 265).
- **Divisível/Indivisível** (arts. 257-263): conforme a natureza da prestação.

### 2.3. Quanto ao modo

- **Pura e simples**.
- **Condicionais, a termo, modais**.

### 2.4. Especiais

- **Alternativa** (arts. 252-256): prestações em alternatividade; cumprimento de uma libera.
- **Facultativa**: uma prestação devida, outra como faculdade de substituição.

## 3. Adimplemento

### 3.1. Pagamento direto

**Quem paga** (arts. 304-305): devedor, terceiro interessado, terceiro não interessado (com sub-rogação se em nome próprio).

**Quem recebe** (arts. 308-312): credor ou seu representante. Pagamento a terceiro NÃO desobriga, salvo:
- Confirmação ratificada.
- Reverteu em proveito do credor.
- Credor putativo (boa-fé do devedor).

**Lugar do pagamento** (art. 327): regra do **domicílio do DEVEDOR** (dívida quesível). Diferente se a dívida for portável (em domicílio do credor) — depende de natureza/contrato.

**Tempo** (art. 331): se não há prazo, exigível desde logo.

### 3.2. Pagamentos especiais

- **Consignação em pagamento** (arts. 334-345): devedor deposita judicialmente em caso de:
  - Recusa do credor.
  - Credor desconhecido.
  - Dúvida sobre quem é o credor.
- **Sub-rogação** (arts. 346-351): terceiro paga e assume posição do credor.
- **Imputação do pagamento** (arts. 352-355): existindo várias dívidas, qual quitar.
- **Dação em pagamento** (arts. 356-359): credor aceita coisa diversa.
- **Novação** (arts. 360-367): substituição de obrigação antiga por nova — extingue a anterior.
- **Compensação** (arts. 368-380): dívidas recíprocas se extinguem até onde se compensarem.
- **Confusão** (arts. 381-384): credor e devedor na mesma pessoa.
- **Remissão** (arts. 385-388): perdão da dívida.

## 4. Inadimplemento

### 4.1. Tipos

- **Mora**: cumprimento imperfeito (atraso, lugar errado, modo).
  - **Mora ex re**: dívida com termo certo (Dies interpellat pro homine — o dia interpela pelo homem).
  - **Mora ex persona**: dívida sem termo certo → exige interpelação.
- **Inadimplemento absoluto**: prestação não mais possível ou perdeu utilidade.

### 4.2. Efeitos

- Perdas e danos (arts. 402-405): danos emergentes + lucros cessantes + juros legais (1% ao mês conforme arts. 406, 591).
- Cláusula penal (arts. 408-416): pré-fixação de perdas e danos.
  - Compensatória: substitui obrigação principal.
  - Moratória: cumula com obrigação.

## 5. Contratos — Teoria Geral

### 5.1. Princípios

- **Autonomia da vontade**: liberdade de contratar.
- **Função social do contrato** (art. 421): "A liberdade contratual será exercida nos limites da função social do contrato."
- **Boa-fé objetiva** (art. 422): conduta de probidade durante negociação, execução e pós-contrato.
- **Probidade e cooperação**: deveres anexos da boa-fé.
- **Pacta sunt servanda**: contrato faz lei entre partes.
- **Rebus sic stantibus**: revisão por onerosidade excessiva superveniente.

### 5.2. Classificação

- Unilateral x bilateral (sinalagmático).
- Oneroso x gratuito.
- Comutativo x aleatório.
- Consensual x real (depende de tradição).
- Solene x não solene.
- Típico x atípico.
- Paritário x adesão.

### 5.3. Formação

- **Negociação preliminar**: tratativas — não vincula, mas boa-fé impõe deveres.
- **Proposta** (arts. 427-435): vinculante para o proponente.
- **Aceitação** (arts. 431-435): consente integralmente. Resposta com modificações = nova proposta.
- **Lugar do contrato** (art. 435): onde foi proposto.

### 5.4. Vícios redibitórios e evicção

- **Vício redibitório** (arts. 441-446): defeito oculto da coisa adquirida. Ações: redibitória (rescinde) ou estimatória/quanti minoris (abate preço).
  - Prazos: 30 dias (móvel) ou 1 ano (imóvel) — art. 445.
- **Evicção** (arts. 447-457): perda total/parcial da coisa adquirida por decisão judicial. Garantia legal.

### 5.5. Exceção de contrato não cumprido (art. 476)

Em contrato bilateral, ninguém pode exigir cumprimento se não cumpriu sua parte.

### 5.6. Resolução, resilição e rescisão

- **Resolução**: por inadimplemento (art. 475).
- **Resilição**: por vontade (bilateral = distrato; unilateral = denúncia, quando permitida).
- **Rescisão**: por vício no consentimento.

## 6. Como Cebraspe cobra

- **C/E solidariedade**: "A solidariedade é presumida no Código Civil" → **ERRADO** (art. 265 — não se presume).
- **C/E mora**: "Em obrigação com termo certo, a mora depende de interpellação" → **ERRADO** (é ex re).
- **C/E boa-fé**: "A boa-fé objetiva exige apenas conduta honesta na execução do contrato" → **ERRADO** (vale na negociação, execução E pós-contrato).
- **C/E contrato bilateral**: "Cabe exceção de contrato não cumprido em todo contrato" → **ERRADO** (só bilateral).
- **C/E sub-rogação**: "O terceiro que paga em nome próprio sempre se sub-roga" → **ERRADO** (se for interessado, sub-roga; se não, depende).
$content$,
$resumo$
# Resumo Estratégico — Obrigações e Contratos

## Obrigação

- Estrutura: credor + devedor + prestação + vínculo.
- Tipos: dar (certa/incerta), fazer (fungível/infungível), não fazer.
- **Solidariedade NÃO se presume** — só lei ou contrato.

## Adimplemento

- Lugar: **domicílio do devedor** (regra — quesível).
- Modos especiais: consignação, sub-rogação, imputação, dação, novação, compensação, confusão, remissão.

## Mora

- **Ex re**: termo certo → dia interpela.
- **Ex persona**: sem termo → exige interpelação.
- Inadimplemento absoluto = prestação impossível ou inútil.

## Princípios contratuais

| Princípio | Conteúdo |
|---|---|
| Autonomia | Liberdade de contratar |
| Função social | Limite da liberdade |
| Boa-fé objetiva | Honestidade NEGOCIAÇÃO + EXECUÇÃO + PÓS |
| Pacta sunt servanda | Contrato é lei |
| Rebus sic stantibus | Revisão por onerosidade superveniente |

## Vícios

- **Redibitório**: defeito oculto. Prazo: 30 dias (móvel) / 1 ano (imóvel).
- **Evicção**: perda da coisa por decisão judicial.

## Resolução vs Resilição vs Rescisão

- **Resolução**: inadimplemento.
- **Resilição**: vontade (distrato/denúncia).
- **Rescisão**: vício.

## Top pegadinhas Cebraspe

1. Solidariedade NÃO se presume.
2. Boa-fé vale ANTES, DURANTE e DEPOIS do contrato.
3. Mora ex re = termo certo.
4. Exceção de contrato não cumprido SÓ em bilateral.
5. Lugar do pagamento (regra) = domicílio do DEVEDOR (quesível).
$resumo$
);

-- ┌─ 4. DIREITO CIVIL — Responsabilidade Civil ──────────────────────────────┐
SELECT upsert_material(
  'direito-civil',
  'Responsabilidade Civil',
  'Responsabilidade Civil',
$content$
# Responsabilidade Civil

Assunto onde Cebraspe explora tanto teoria como Súmulas do STJ/STF. Domínio aqui = ponto de delegado garantido.

## 1. Conceito

Obrigação de **reparar dano** causado a outrem por ato ilícito (subjetiva) ou pelo risco da atividade (objetiva).

## 2. Pressupostos

**Responsabilidade subjetiva (regra — art. 186)**:
1. **Conduta** (ação ou omissão).
2. **Culpa lato sensu** (dolo ou culpa stricto sensu = negligência, imprudência, imperícia).
3. **Dano** (material, moral, estético, à imagem, ricochete).
4. **Nexo de causalidade** entre conduta e dano.

**Responsabilidade objetiva (art. 927, parágrafo único)**: dispensa CULPA.
1. Conduta.
2. Dano.
3. Nexo causal.
4. Atividade de risco OU previsão legal.

## 3. Subjetiva x Objetiva

| Característica | Subjetiva | Objetiva |
|---|---|---|
| Culpa | Exige | Dispensa |
| Fundamento | Art. 186 | Art. 927, § único; CDC 12, 14; CF 37 §6º |
| Exemplos | Médico (regra), motorista | Estado, transportador, fornecedor, atividade de risco |

## 4. Responsabilidade do Estado (CF art. 37, §6º)

- **Objetiva pura** para atos comissivos de agentes públicos.
- **Subjetiva** para omissões (predominante — STF tende a objetiva em casos de omissão específica).
- Direito de regresso CONTRA o agente: depende de **culpa OU dolo**.
- Atinge também as PJ privadas prestadoras de serviço público (Súmula 510 STJ — independente de o usuário ou não).

## 5. Excludentes

### 5.1. De NEXO

- **Caso fortuito** (evento imprevisível e inevitável).
- **Força maior** (evento previsível mas inevitável).
- **Culpa exclusiva da vítima**.
- **Fato exclusivo de terceiro**.

> Fortuito INTERNO (relacionado à atividade) NÃO exclui — Súmula 479 STJ (banco).
> Fortuito EXTERNO exclui.

### 5.2. De ILICITUDE

- Legítima defesa (art. 188 I).
- Estado de necessidade (art. 188 II).
- Exercício regular de direito (art. 188 I).
- Estrito cumprimento do dever legal.

> ⚠️ Mesmo em estado de necessidade, há dever de INDENIZAR (art. 929-930) com ação regressiva contra o causador.

## 6. Dano

### 6.1. Espécies

- **Material**:
  - **Dano emergente** (perda efetiva).
  - **Lucros cessantes** (o que razoavelmente deixou de ganhar).
- **Moral**: dor, abalo, sofrimento, ofensa a direitos da personalidade. Súmula 37 STJ: cumulável com material.
- **Estético**: lesão à integridade corporal/aparência. Súmula 387 STJ: cumulável com moral.
- **Por ricochete (reflexo)**: terceiro ligado à vítima.
- **In re ipsa**: dispensa prova (ex: protesto indevido, negativação indevida).

### 6.2. Quantificação

- Análise do caso concreto.
- Critérios: extensão, gravidade, condições econômicas das partes, caráter pedagógico.

## 7. Responsabilidade Civil em Hipóteses Especiais

### 7.1. Por ato de outrem (art. 932)

- Pais por filhos menores sob autoridade.
- Tutores e curadores pelos pupilos.
- Empregadores por empregados em serviço.
- Donos de hotéis, hospedarias, casas de educação.
- Quem participar dos produtos do crime gratuitamente (art. 932 V).

Responsabilidade **objetiva** (art. 933) — mesmo sem culpa do responsável.

### 7.2. Pelo fato da coisa

- **Animais** (art. 936): dono ou detentor.
- **Edifícios** (art. 937): ruína.
- **Coisas caídas** (art. 938).

### 7.3. Atividade de risco (art. 927 § único)

Empresa de transporte de combustível, energia nuclear, etc. **Objetiva**.

### 7.4. Defeito do produto/serviço (CDC arts. 12, 14)

Fabricante, produtor, construtor, importador, fornecedor. **Objetiva** (salvo profissional liberal — art. 14 §4º — subjetiva).

### 7.5. Erro médico

- Regra: **subjetiva**, fundada em culpa.
- Obrigação de MEIO (não de resultado), salvo cirurgia plástica estética = obrigação de RESULTADO (responsabilidade objetiva).

## 8. Súmulas STJ essenciais

- **Súmula 37**: cumulação dano material + moral.
- **Súmula 130**: estabelecimento responde por dano em veículo no estacionamento.
- **Súmula 132**: ausência de transferência não exime ex-proprietário de responder solidariamente por dano.
- **Súmula 145**: transporte de favor → indenização só por culpa grave ou dolo.
- **Súmula 221**: solidariedade entre autor da ofensa e proprietário do meio.
- **Súmula 281**: dever de indenizar por erro médico em SUS.
- **Súmula 370**: caracteriza dano moral apresentação antecipada de cheque pré-datado.
- **Súmula 385**: inscrição preexistente afasta dano moral por nova inscrição indevida.
- **Súmula 387**: dano estético cumulativo com moral.
- **Súmula 388**: protesto indevido = dano moral in re ipsa.
- **Súmula 479**: fortuito interno = banco responde.

## 9. Prazo

- **Reparação civil = 3 anos** (art. 206 §3º V).
- Contra o Estado: 5 anos (Dec. 20.910/32).

## 10. Como Cebraspe cobra

- **C/E pressupostos**: "A responsabilidade objetiva dispensa todos os pressupostos do art. 186" → **ERRADO** (dispensa só CULPA; conduta, dano e nexo permanecem).
- **C/E Estado**: "O Estado responde objetivamente por toda omissão" → **ERRADO** (STF: regra é subjetiva; objetiva em omissão específica).
- **C/E erro médico**: "Médico responde objetivamente em qualquer hipótese" → **ERRADO** (subjetiva — salvo cirurgia estética).
- **C/E in re ipsa**: "Dano moral exige sempre prova do sofrimento" → **ERRADO** (alguns presumidos — negativação, protesto indevido).
- **C/E fortuito**: "Banco se exime de responder por roubo dentro da agência" → **ERRADO** (Súmula 479 — fortuito interno).
$content$,
$resumo$
# Resumo Estratégico — Responsabilidade Civil

## Pressupostos

**Subjetiva (regra)**: conduta + culpa + dano + nexo.
**Objetiva**: conduta + dano + nexo + risco/lei.

## Fundamentos

- Subjetiva: art. 186 CC.
- Objetiva: art. 927 §ú; CDC; CF 37§6º.

## Estado (CF 37 §6º)

- Objetiva (atos comissivos).
- Subjetiva regra (omissão); objetiva (omissão específica STF).
- Regresso = exige dolo ou culpa.
- Súmula 510 STJ: PJ privada prestadora de serviço público também.

## Excludentes de nexo

- Caso fortuito EXTERNO ✅
- Caso fortuito INTERNO ❌ (Súmula 479)
- Força maior, culpa exclusiva da vítima, fato exclusivo de terceiro.

## Excludentes de ilicitude

Legítima defesa, estado de necessidade, exercício regular, dever legal.
⚠️ Estado de necessidade indeniza com regresso (arts. 929-930).

## Dano

- Emergente (perda) + lucros cessantes (Sumula 37: cumulável).
- Estético (Súmula 387: cumulável com moral).
- In re ipsa: negativação, protesto indevido, demora indevida.

## Hipóteses especiais

- Pais, tutores, empregadores (art. 932) → objetiva (art. 933).
- Animais, edifícios, coisas caídas → fato da coisa.
- Atividade de risco → objetiva.
- CDC: objetiva (salvo profissional liberal subjetiva).
- Erro médico: subjetiva; estética = obrigação de resultado.

## Prazo

- Reparação civil = **3 anos**.
- Contra Fazenda = 5 anos.

## Top pegadinhas Cebraspe

1. Responsabilidade objetiva dispensa SÓ culpa — outros pressupostos ficam.
2. Omissão estatal é SUBJETIVA (regra).
3. Médico = subjetiva; cirurgia plástica estética = objetiva.
4. Fortuito interno do banco = banco responde (Súmula 479).
5. Reparação civil = 3 ANOS (não 5).
$resumo$
);

-- ┌─ 5. DIREITO TRIBUTÁRIO — SFN + Obrigação Tributária ─────────────────────┐
SELECT upsert_material(
  'direito-financeiro-e-tributario',
  'Sistema Tributário Nacional e Obrigação Tributária',
  'Sistema Tributário Nacional e Obrigação Tributária',
$content$
# Sistema Tributário Nacional e Obrigação Tributária

O ouro do Direito Tributário pra concurso: **CF + CTN + Súmulas STF/STJ**. Cebraspe cobra basicamente o que está no texto da Constituição e no Código Tributário.

## 1. Conceito de Tributo (CTN art. 3º)

> "Tributo é toda **prestação pecuniária compulsória**, em moeda ou cujo valor nela se possa exprimir, que **não constitua sanção de ato ilícito**, **instituída em lei** e **cobrada mediante atividade administrativa plenamente vinculada**."

Cinco elementos essenciais:
1. **Prestação pecuniária**: $ — não in natura.
2. **Compulsória**: independe da vontade.
3. **Não sanção**: multa NÃO é tributo. Mas a Súmula 70 STF: pode haver multa tributária (a sanção é tributária mas não é "o tributo").
4. **Instituída em lei**: princípio da legalidade.
5. **Cobrança vinculada**: o fisco não tem discricionariedade.

## 2. Espécies Tributárias (Teoria Pentapartida — STF)

| Espécie | Fundamento | Característica |
|---|---|---|
| **Imposto** | CF 145, I + CTN 16 | Fato gerador é situação INDEPENDENTE de atividade estatal |
| **Taxa** | CF 145, II + CTN 77 | Serviço público específico/divisível OU poder de polícia |
| **Contribuição de melhoria** | CF 145, III + CTN 81 | Obra pública valorizou imóvel particular |
| **Empréstimo compulsório** | CF 148 | Calamidade, guerra, investimento urgente — RESTITUÍVEL |
| **Contribuições especiais** | CF 149 | Sociais, intervenção econômica, profissionais |

> ⚠️ Pegadinha clássica: "São três as espécies tributárias" → **ERRADO** (STF: cinco).

## 3. Competência Tributária

**Características** (CTN art. 7º):
- Indelegável (salvo capacidade tributária ativa = arrecadar e fiscalizar).
- Irrenunciável.
- Imprescritível (não usar não faz perder).
- Inalterável (só EC pode mudar).
- Facultativa (ente pode não exercer — salvo IPI/ICMS pelos motivos de guerra fiscal).

### 3.1. União (CF 153)

II, IE, IR, IPI, IOF, ITR, IGF.
Mais: contribuições sociais (149), empréstimos compulsórios (148), impostos residuais (154 I) e extraordinários de guerra (154 II).

### 3.2. Estados/DF (CF 155)

ITCMD (transmissão causa mortis e doação), ICMS, IPVA.

### 3.3. Municípios/DF (CF 156)

IPTU, ITBI (transmissão inter vivos onerosa), ISS.

## 4. Limitações Constitucionais ao Poder de Tributar

### 4.1. Princípios

- **Legalidade** (CF 150 I): tributo só por lei.
  - Exceções (alíquota pode mudar por decreto): II, IE, IPI, IOF, CIDE-combustível (alíquota reestabelecida), ICMS-combustível.
- **Isonomia** (CF 150 II).
- **Irretroatividade** (CF 150 III a): lei não atinge fato anterior.
- **Anterioridade anual** (CF 150 III b): só no exercício seguinte.
- **Anterioridade nonagesimal** (CF 150 III c — "noventena"): 90 dias após publicação.
  - **Exceções à ANUAL**: II, IE, IPI, IOF, IEG (guerra), empréstimo compulsório (calamidade/guerra), CIDE/ICMS combustíveis (restabelecimento).
  - **Exceções à NONAGESIMAL**: II, IE, IR, IOF, IEG, empréstimo (calamidade/guerra), IPVA/IPTU (apenas BASE DE CÁLCULO).
  - ⚠️ Tabela é o conteúdo mais cobrado. Decore essa.

### 4.2. Imunidades (CF 150 VI)

- **Recíproca** (alínea a): vedado União, Estados, Municípios cobrarem impostos uns dos outros. Atinge autarquias e fundações (com condições).
- **Templos** (b): qualquer culto.
- **Partidos, sindicatos, educacionais sem fins lucrativos, assistenciais** (c): com requisitos do art. 14 CTN.
- **Livros, jornais, periódicos e papel** (d): IMUNIDADE OBJETIVA — não importa quem.
- **Música nacional** (e): EC 75/13.

> ⚠️ Imunidade ≠ Isenção:
> - Imunidade: limite CONSTITUCIONAL.
> - Isenção: limite LEGAL (dispensa de pagar tributo devido).

## 5. Obrigação Tributária

### 5.1. Definição e elementos

Obrigação tributária surge com a **ocorrência do fato gerador** (CTN art. 114).

Elementos:
- **Sujeito ativo**: ente competente para exigir.
- **Sujeito passivo**: contribuinte (relação direta com FG) ou responsável (vinculado por lei).
- **Objeto**: prestação (pagar tributo ou penalidade — principal; cumprir obrigação acessória — fazer/não fazer).
- **Causa**: fato gerador + lei.

### 5.2. Obrigação principal x acessória (CTN 113)

- **Principal**: pagar tributo ou penalidade.
- **Acessória**: prestações positivas/negativas previstas em interesse do fisco (declarações, escrituração, manter livros).
- ⚠️ Diferente do Civil: **a acessória NÃO segue a principal**. Pode haver acessória sem principal (ex: entidade imune que precisa declarar).

### 5.3. Fato gerador

- **Da principal** (CTN 114): situação definida em lei como necessária e suficiente.
- **Da acessória** (CTN 115): qualquer situação que dê origem a obrigação acessória.
- **Pecunia non olet** (CTN 118): a definição legal do FG é interpretada com abstração de circunstâncias relacionadas à validade/efeitos do ato. Renda de atividade ilícita = tributável.

### 5.4. Sujeito passivo

- **Contribuinte** (CTN 121 I): relação pessoal e direta com FG.
- **Responsável** (CTN 121 II): obrigação decorre de lei.

### 5.5. Responsabilidade tributária (CTN 128-138)

- **Solidária** (124): há interesse comum no FG ou designação por lei.
- **Subsidiária**: responsabilidade do terceiro só quando o contribuinte não puder pagar.
- **Por sucessão** (130-133): adquirente de imóvel responde por tributos (salvo prova quitação no título); adquirente de empresa responde subsidiariamente OU integralmente conforme caso.
- **De terceiros** (134): pais, tutores, etc., respondem subsidiariamente.
- **Por infrações** (136-137): regra OBJETIVA; admite responsabilidade pessoal do agente em casos qualificados.
- **Denúncia espontânea** (138): exclui a responsabilidade pela infração, desde que **antes de qualquer procedimento fiscal**. NÃO se aplica para obrigação acessória (Súmula 360 STJ).

### 5.6. Capacidade tributária passiva

Independe (CTN 126):
- Da capacidade civil.
- De achar-se a pessoa sujeita a medidas que importem privação de direitos.
- De estar regularmente constituída (PJ).

## 6. Como Cebraspe cobra

- **C/E sobre tributo**: "Multa por infração ambiental é espécie de tributo" → **ERRADO** (tributo não constitui sanção).
- **C/E espécies**: "São três espécies tributárias previstas na CF" → **ERRADO** (STF: cinco).
- **C/E anterioridade**: "II, IE e IOF estão sujeitos à anterioridade nonagesimal" → **ERRADO** (são exceções).
- **C/E imunidade x isenção**: "A isenção é prevista na Constituição" → **ERRADO** (imunidade que é; isenção é por lei).
- **C/E pecunia non olet**: "Renda de jogo do bicho não pode ser tributada" → **ERRADO** (não importa origem ilícita).
- **C/E denúncia espontânea**: "Vale para descumprimento de obrigação acessória" → **ERRADO** (Súmula 360 STJ).
$content$,
$resumo$
# Resumo Estratégico — STN e Obrigação Tributária

## Tributo (CTN 3º)

Prestação pecuniária compulsória, em moeda, NÃO sanção, lei, cobrança vinculada.

## Cinco espécies (STF)

Imposto, Taxa, Contribuição de Melhoria, Empréstimo Compulsório, Contribuições Especiais.

## Competência

- Indelegável (capacidade ativa pode), irrenunciável, imprescritível, inalterável.
- **União**: II, IE, IR, IPI, IOF, ITR, IGF + contribuições + residuais + extraordinários.
- **Estados**: ITCMD, ICMS, IPVA.
- **Municípios**: IPTU, ITBI, ISS.

## Princípios e exceções

| Princípio | Exceções |
|---|---|
| Legalidade | II, IE, IPI, IOF, CIDE/ICMS combustíveis (alíquotas) |
| Anterioridade anual | II, IE, IPI, IOF, IEG, empréstimo (cal/guerra), CIDE/ICMS comb |
| Nonagesimal | II, IE, IR, IOF, IEG, empréstimo (cal/guerra), IPVA/IPTU (BC) |

## Imunidades (CF 150 VI)

a) Recíproca | b) Templos | c) Partidos/sindicatos/educacionais/assistenciais s/ fim lucr | d) Livros/jornais/periódicos/papel | e) Música nacional

⚠️ Imunidade = CF; Isenção = lei.

## Obrigação Tributária

- Surge com FATO GERADOR.
- Principal: pagar tributo/penalidade.
- Acessória: prestação positiva/negativa em prol do fisco — INDEPENDENTE da principal.
- Pecunia non olet: ilícito também é tributado.

## Responsabilidade

- Solidária: interesse comum (124).
- Sucessão: imóvel (130), empresa (133).
- De terceiros (134): subsidiária.
- Denúncia espontânea (138): antes de procedimento fiscal — NÃO p/ acessória (Súmula 360 STJ).

## Top pegadinhas Cebraspe

1. Multa NÃO é tributo.
2. STF: CINCO espécies (não três).
3. Anterioridade nonagesimal: IR é EXCEÇÃO (só anual).
4. Pecunia non olet vale.
5. Capacidade passiva independe de capacidade civil.
6. Denúncia espontânea NÃO vale para acessórias.
$resumo$
);

-- ┌─ 6. DIREITO TRIBUTÁRIO — Crédito Tributário + Lançamento ────────────────┐
SELECT upsert_material(
  'direito-financeiro-e-tributario',
  'Crédito Tributário e Lançamento',
  'Crédito Tributário, Lançamento, Suspensão, Extinção e Exclusão',
$content$
# Crédito Tributário, Lançamento, Suspensão, Extinção e Exclusão

A parte "operacional" do Tributário. Cebraspe cobra muito tabela de causas. Memorize as listas — não há atalho.

## 1. Crédito Tributário — Conceito

Crédito = direito do fisco já constituído pelo lançamento.

**Linha do tempo**:
1. **Hipótese de incidência** (lei).
2. **Fato gerador** (concretização) → nasce a OBRIGAÇÃO TRIBUTÁRIA.
3. **Lançamento** → constitui o CRÉDITO TRIBUTÁRIO.
4. **Cobrança** (pagamento ou execução fiscal).

## 2. Lançamento (CTN 142-150)

> "Compete privativamente à autoridade administrativa constituir o crédito tributário pelo lançamento."

Atividade **vinculada e obrigatória** (não discricionária).

### 2.1. Tipos

- **De ofício/direto** (CTN 149): autoridade calcula sem participação do sujeito passivo. Ex: IPTU, IPVA.
- **Por declaração/misto** (CTN 147): sujeito passivo declara, autoridade calcula. Ex: ITBI, ITCMD em alguns estados.
- **Por homologação/autolançamento** (CTN 150): sujeito passivo apura E paga; autoridade homologa (expressa ou tácita). Ex: ICMS, IPI, IR, ISS, contribuições previdenciárias.

### 2.2. Lançamento por homologação

- Homologação **EXPRESSA**: autoridade verifica e ratifica.
- Homologação **TÁCITA**: 5 anos da ocorrência do FG sem manifestação.
- Súmula 555 STJ: ausência de declaração não permite homologação → lançamento por ofício, prazo decadencial pelo art. 173 I.

### 2.3. Revisão de ofício (CTN 149)

Hipóteses: declaração falsa/omissão, comprovação de fraude, vícios no lançamento anterior.

## 3. Suspensão da Exigibilidade (CTN 151)

**Decora pelo macete: "MOR-DE-R-LIM-PAR"** (MOR-DE-R + LIM-PAR):

| Causa | Detalhe |
|---|---|
| **MO**ratória | Adiamento legal do pagamento |
| **DE**pósito do montante integral | Súmula Vinculante 28: bloqueia execução |
| **R**eclamações e recursos no processo administrativo fiscal | Em tramitação |
| **LIM**inar em mandado de segurança | Ou tutela em outras ações |
| **PAR**celamento | Lei 10.522/02 e outras |

Efeitos:
- NÃO dispensa cumprimento de obrigações acessórias.
- Permite obtenção de certidão **POSITIVA com efeito de NEGATIVA** (CTN 206).
- Suspende prescrição.

## 4. Extinção do Crédito (CTN 156)

São **11 causas** (decore a lista — Cebraspe ama):
1. Pagamento.
2. Compensação (com créditos do fisco — lei autoriza).
3. Transação (acordo).
4. Remissão (perdão do tributo — só por lei).
5. Prescrição (5 anos para fisco cobrar).
6. Decadência (5 anos para constituir o crédito).
7. Conversão do depósito em renda.
8. Pagamento antecipado + homologação.
9. Consignação em pagamento (procedente).
10. Decisão administrativa definitiva.
11. Decisão judicial transitada em julgado.
+ **Dação em pagamento de imóvel** (LC 104/01 — CTN 156 XI).

## 5. Decadência x Prescrição

| | Decadência | Prescrição |
|---|---|---|
| Objeto | Direito de CONSTITUIR | Direito de COBRAR (executar) |
| Prazo | 5 anos (CTN 173) | 5 anos (CTN 174) |
| Início | Conforme tipo de lançamento | Da constituição definitiva do crédito |
| Suspensão | NÃO (regra) | SIM (depósito, parcelamento, etc) |
| Interrupção | NÃO | SIM (CTN 174 §ú) |

### 5.1. Início da decadência

- **Lançamento por ofício/declaração**: 1º dia do exercício seguinte ao em que poderia ter sido feito o lançamento (CTN 173 I).
- **Lançamento por homologação COM pagamento**: data do fato gerador (CTN 150 §4º) → "regra do 5+5" NÃO existe mais (STJ: ou 173 I ou 150 §4º).
- **Lançamento por homologação SEM pagamento ou com fraude**: art. 173 I (1º dia do exercício seguinte).
- **Anulação do lançamento por vício formal**: data da decisão definitiva que anular.

### 5.2. Prescrição (CTN 174)

- 5 anos da constituição definitiva.
- **Interrupção**: despacho do juiz que ordenar citação, protesto judicial, ato judicial constitutivo em mora, ato extrajudicial de reconhecimento.
- **Suspensão**: pelos casos do CTN 151.

## 6. Exclusão do Crédito (CTN 175)

Apenas DUAS causas:
1. **Isenção** (dispensa de tributo).
2. **Anistia** (dispensa de multa).

> ⚠️ Excluem só o crédito; obrigações acessórias permanecem (CTN 175 §ú).

### 6.1. Isenção

- Dispensa LEGAL do tributo devido (a obrigação nasce, mas o crédito é dispensado).
- Lei específica (CF 150 §6º).
- Não se confunde com imunidade (limitação constitucional).
- Pode ser onerosa (com contrapartida) → não revogável até prazo.

### 6.2. Anistia

- Dispensa LEGAL de PENALIDADES (multas).
- Só anterior à lei.
- Não atinge dolo, fraude, simulação, conluio (CTN 180).

## 7. Garantias e Privilégios do Crédito (CTN 183-193)

- Crédito tributário tem PREFERÊNCIA sobre os demais (salvo trabalhista e acidente do trabalho).
- Em falência: ordem específica (Lei 11.101/05 + CTN).
- Súmula 392 STJ: redirecionamento da execução só com dolo, fraude ou simulação do sócio.
- Súmula 393 STJ: redirecionamento contra sócio-gerente só se houver comprovação de dissolução irregular.

## 8. Administração Tributária (CTN 194-200)

- Fiscalização: poderes amplos. Sigilo bancário pode ser quebrado por autoridade administrativa (LC 105/01 + Tema 225 STF — desde que com finalidade arrecadatória legítima).
- Dívida Ativa: crédito não pago após vencimento + inscrição.
- Certidões: CND, CPEN (positiva com efeito de negativa).

## 9. Como Cebraspe cobra

- **C/E lançamento**: "O lançamento é atividade discricionária do fisco" → **ERRADO** (vinculada e obrigatória — CTN 142).
- **C/E homologação**: "A homologação tácita ocorre em 10 anos" → **ERRADO** (5 anos do FG).
- **C/E exclusão**: "São causas de exclusão: isenção, anistia e remissão" → **ERRADO** (remissão é EXTINÇÃO).
- **C/E SV 28**: "Pode-se condicionar admissibilidade de ação ao depósito prévio" → **ERRADO** (Súmula Vinculante 28).
- **C/E redirecionamento**: "Basta inadimplemento para redirecionar execução contra sócio" → **ERRADO** (Súmula 430 STJ).
$content$,
$resumo$
# Resumo Estratégico — Crédito Tributário

## Linha do tempo

Hipótese de incidência → Fato gerador → Obrigação tributária → **Lançamento** → Crédito tributário → Cobrança.

## Lançamento

- Vinculado e obrigatório.
- **De ofício**: IPTU, IPVA.
- **Por declaração**: ITBI.
- **Por homologação**: ICMS, IPI, IR, ISS, contribuições.

## Suspensão (CTN 151) — MOR-DE-R-LIM-PAR

MORatória, DEpósito integral, Reclamações/recursos, LIMinar, PARcelamento.

## Extinção (CTN 156)

11 causas + dação de imóvel: pagamento, compensação, transação, remissão, prescrição, decadência, conversão depósito, pagamento+homologação, consignação procedente, decisão adm/judicial, dação imóvel.

## Decadência (5 anos)

- Início (ofício/declaração): 1º dia do exercício seguinte.
- Início (homologação COM pagamento): data do FG.
- Sem pagamento ou fraude: 173 I (1º dia exercício seguinte).
- NÃO admite suspensão/interrupção.

## Prescrição (5 anos)

- Da constituição definitiva.
- Interrupção: citação, protesto judicial, ato judicial constitutivo, ato extrajudicial.
- Suspensão: CTN 151.

## Exclusão (CTN 175)

SÓ duas: **Isenção** (tributo) e **Anistia** (multa).
Obrigações acessórias permanecem.

## Privilégios

- Crédito tributário preferencial, salvo trabalhista/acidente do trabalho.
- Súmula 392/393/430 STJ: redirecionamento exige dolo, fraude, simulação ou dissolução irregular.

## Top pegadinhas Cebraspe

1. Lançamento é VINCULADO (não discricionário).
2. Remissão = EXTINÇÃO (não exclusão).
3. Decadência homologação: SE houve pagamento, conta do FG; se não, 173 I.
4. SV 28: vedado condicionar ação ao depósito.
5. Inadimplemento simples NÃO redireciona (Súmula 430 STJ).
$resumo$
);

-- ┌─ 7. DIREITO AMBIENTAL — Princípios + PNMA + Crimes ──────────────────────┐
SELECT upsert_material(
  'direito-ambiental',
  'Princípios, PNMA e Crimes Ambientais (Lei 9.605/98)',
  'Direito Ambiental — Princípios, PNMA e Crimes Ambientais',
$content$
# Direito Ambiental — Princípios, PNMA e Crimes Ambientais

Tema novo no edital de PF Delegado. Cebraspe cobra **bastante texto seco da Lei 6.938/81 (PNMA) e da Lei 9.605/98 (Crimes Ambientais)**, com pegadinhas na responsabilidade objetiva.

## 1. Constituição e Meio Ambiente

**Art. 225 CF**: "Todos têm direito ao meio ambiente ecologicamente equilibrado, bem de uso comum do povo e essencial à sadia qualidade de vida..."

Responsabilidades constitucionais:
- Poder Público + coletividade têm dever de defender e preservar.
- Restauração de processos ecológicos essenciais.
- Espaços territoriais protegidos.
- Estudo prévio de impacto ambiental para obras potencialmente causadoras de significativa degradação.
- Tríplice responsabilização (§3º): **administrativa, civil e penal** — independentes entre si.

## 2. Princípios

### 2.1. Princípio do desenvolvimento sustentável

Desenvolvimento que atende necessidades presentes sem comprometer das futuras gerações (Comissão Brundtland).

### 2.2. Princípio do poluidor-pagador

Quem polui paga pelos custos da prevenção e reparação.
NÃO é "direito a poluir mediante pagamento" — é internalização das externalidades.

### 2.3. Princípio do usuário-pagador

Quem usa recursos ambientais paga.

### 2.4. Princípio da precaução

Em caso de **incerteza científica** sobre dano potencial, adotam-se medidas preventivas.

### 2.5. Princípio da prevenção

Quando o dano é **conhecido**, age-se para evitá-lo.

> ⚠️ **Precaução x Prevenção**: precaução = incerteza; prevenção = certeza.

### 2.6. Princípio da informação e participação

Acesso à informação ambiental e participação em decisões.

### 2.7. Princípio da responsabilidade objetiva

CF 225 §3º + Lei 6.938/81 art. 14 §1º: responde **independente de culpa**.

### 2.8. Princípio da reparação integral

In dubio pro natura. Repara TODO o dano, inclusive moral coletivo.

### 2.9. Princípio da função socioambiental da propriedade

Propriedade tem que cumprir função ambiental (CF 186 II).

### 2.10. Princípio do limite (ou controle)

Estado fixa padrões mínimos de proteção.

## 3. Política Nacional do Meio Ambiente (Lei 6.938/81)

### 3.1. Objetivos (art. 4º)

- Compatibilizar desenvolvimento + qualidade ambiental.
- Definir áreas prioritárias de ação.
- Estabelecer padrões de qualidade ambiental.
- Desenvolver pesquisa e tecnologia.
- Difundir tecnologias de manejo.
- Preservar e restaurar recursos.
- Impor ao poluidor obrigação de recuperar.

### 3.2. SISNAMA (art. 6º)

Sistema Nacional do Meio Ambiente — estrutura federativa:
- **Conselho de Governo** (órgão superior).
- **CONAMA** (órgão consultivo e deliberativo — emite resoluções).
- **MMA** (órgão central — coordena).
- **IBAMA** (órgão executor federal).
- **Órgãos seccionais** (estaduais).
- **Órgãos locais** (municipais).

### 3.3. Instrumentos (art. 9º)

Padrões de qualidade, zoneamento ambiental, avaliação de impactos, licenciamento, incentivos, criação de UCs, sistema de informação, cadastro técnico, penalidades disciplinares, **EIA/RIMA** (para atividades de significativo impacto), relatório de qualidade ambiental, garantia de acesso à informação.

### 3.4. Licenciamento ambiental (art. 10)

Três fases:
- **Licença Prévia (LP)**: aprova localização e concepção, atesta viabilidade.
- **Licença de Instalação (LI)**: autoriza início da obra/instalação.
- **Licença de Operação (LO)**: autoriza operar.

Competência: regra do impacto. LC 140/11 distribuiu competências:
- **Federal (IBAMA)**: localizadas em mais de um estado, em terras indígenas/quilombolas federais, em mar territorial/zona econômica/plataforma continental, em UC federal.
- **Estadual**: maioria dos casos.
- **Municipal**: impacto local, conforme tipo definido pelo Conselho Estadual.

### 3.5. Responsabilidade civil (art. 14 §1º)

**OBJETIVA** — sem necessidade de culpa.

Súmula 623 STJ: ação civil por dano ambiental é IMPRESCRITÍVEL.

## 4. Crimes Ambientais (Lei 9.605/98)

### 4.1. Disposições gerais

- **Aplicação subsidiária do CP** (art. 79).
- **Concurso de pessoas**: quem concorre responde (art. 2º).
- **Pessoa jurídica** pode ser responsabilizada penalmente (art. 3º) — APENAS em crimes ambientais.

### 4.2. Responsabilidade Penal da PJ

- Penas (art. 21): MULTA, restritivas de direito (suspensão de atividades, interdição de estabelecimento, proibição de contratar com Poder Público) e prestação de serviços à comunidade.
- Não cabe pena de prisão (PJ não vai presa, óbvio).
- Desconsideração da pessoa jurídica para sócios (art. 4º): quando obstáculo ao ressarcimento.
- STF: pode haver responsabilidade da PJ **independentemente** da responsabilidade de pessoa física (HC 80.812 — não exige "dupla imputação").

### 4.3. Crimes em espécie

- **Contra a fauna** (29-37): matar/perseguir/caçar; pescar irregularmente; provocar perecimento de espécimes.
- **Contra a flora** (38-53): destruir floresta de preservação permanente, soltar balão, fogo em mata, comercializar madeira sem autorização.
- **Poluição** (54-61): causar poluição que cause dano à saúde humana ou mortandade de animais.
- **Contra ordenamento urbano e patrimônio cultural** (62-65): destruir/inutilizar bem protegido, pichar.
- **Contra administração ambiental** (66-69): falsificar laudo, omitir informação ao SISNAMA.

### 4.4. Penas e medidas

- Penas: multa, restritivas de direitos, prestação de serviços, perda/restrição.
- Substituição: penas privativas até 4 anos podem ser substituídas.
- Transação penal (Lei 9.099/95) cabível em infrações de menor potencial (até 2 anos).
- **Suspensão condicional do processo** (art. 28 da Lei 9.605): após cumprimento + reparação do dano + comprovação de recuperação ambiental.

### 4.5. Infrações administrativas (Decreto 6.514/08)

Independem do crime. Mesma conduta pode gerar:
- Crime + multa administrativa + indenização civil.
- Súmula 623 STJ: imprescritibilidade da reparação civil.

## 5. Como Cebraspe cobra

- **C/E precaução x prevenção**: "O princípio da precaução exige certeza científica do dano" → **ERRADO** (precaução = incerteza; prevenção = certeza).
- **C/E responsabilidade**: "Em direito ambiental, a responsabilidade civil exige dolo ou culpa" → **ERRADO** (objetiva).
- **C/E PJ**: "PJ não pode ser responsabilizada penalmente" → **ERRADO** (em crime ambiental, sim).
- **C/E prescrição**: "Ação de reparação ambiental prescreve em 5 anos" → **ERRADO** (Súmula 623 STJ — imprescritível).
- **C/E EIA/RIMA**: "Toda obra exige EIA/RIMA" → **ERRADO** (só atividades de significativo impacto).
- **C/E dupla imputação**: "A condenação da PJ exige a condenação da pessoa física" → **ERRADO** (STF afastou).
$content$,
$resumo$
# Resumo Estratégico — Direito Ambiental

## CF 225

Direito ao meio ambiente ecologicamente equilibrado.
Tríplice responsabilização (§3º): **administrativa + civil + penal** — independentes.

## Princípios essenciais

| Princípio | Conteúdo |
|---|---|
| Desenvolvimento sustentável | Atender presente sem comprometer futuro |
| Poluidor-pagador | Internalização das externalidades |
| **Precaução** | INCERTEZA científica → age preventivamente |
| **Prevenção** | Dano CONHECIDO → age para evitar |
| Responsabilidade objetiva | Dispensa culpa (CF + Lei 6.938) |
| Reparação integral | Imprescritível (Súmula 623 STJ) |

## PNMA (Lei 6.938/81)

- **SISNAMA**: Conselho Governo → CONAMA → MMA → IBAMA → Estaduais → Municipais.
- **CONAMA**: consultivo e deliberativo (emite resoluções).
- **Licenciamento (3 fases)**: LP → LI → LO.
- **Responsabilidade civil**: OBJETIVA + imprescritível (Súmula 623).

## Lei 9.605/98

- Aplicação subsidiária do CP.
- **PJ responsabilizada penalmente** (multa, restritivas, serviços comunidade).
- STF: não exige dupla imputação (PJ pode responder sem PF).
- Desconsideração de PJ se obstáculo ao ressarcimento.

## Crimes em espécie

- Fauna (29-37), Flora (38-53), Poluição (54-61), Ord. urbano (62-65), Adm. ambiental (66-69).

## Top pegadinhas Cebraspe

1. Precaução = incerteza; Prevenção = certeza.
2. Responsabilidade civil ambiental = OBJETIVA + IMPRESCRITÍVEL.
3. PJ RESPONDE penalmente em ambiental.
4. CONAMA emite resoluções (não decretos).
5. Tríplice responsabilização é INDEPENDENTE.
$resumo$
);

-- ┌─ 8. DIREITO EMPRESARIAL — Empresário + Sociedades + Títulos ─────────────┐
SELECT upsert_material(
  'direito-empresarial',
  'Empresário, Sociedades e Títulos de Crédito',
  'Direito Empresarial — Empresário, Sociedades e Títulos de Crédito',
$content$
# Direito Empresarial — Empresário, Sociedades e Títulos de Crédito

Visão geral do Direito Empresarial pra concurso de Delegado: foco em **definição de empresário, tipos de sociedade e títulos de crédito** clássicos.

## 1. Direito Empresarial — Visão Geral

A unificação parcial do direito privado pelo CC/2002 (Livro II) trouxe a teoria da empresa. Direito Empresarial **deixou de ser do "comerciante"** e passou a regular o **empresário**.

## 2. Empresário (CC 966)

> "Considera-se empresário quem exerce **profissionalmente atividade econômica organizada** para a produção ou a circulação de bens ou de serviços."

### 2.1. Elementos

- **Profissionalidade**: habitualidade + fim de lucro.
- **Atividade econômica**: produção ou circulação.
- **Organizada**: combinação dos quatro fatores: capital, trabalho, tecnologia/insumos, gestão.

### 2.2. NÃO são empresários (parágrafo único)

- **Profissionais liberais** (médicos, advogados, contadores, arquitetos).
- **Atividades intelectuais** de natureza científica, literária ou artística.
- **EXCETO** se a atividade constituir elemento de empresa (ex: clínica grande com várias especialidades, escritório com estrutura empresarial).

### 2.3. Capacidade

- Capacidade civil plena.
- Não estar impedido por lei (servidor público, magistrado em alguns casos, falido não reabilitado).

### 2.4. Registro (CC 967, 968)

- Registro na **Junta Comercial** ANTES de iniciar atividade.
- Não registrar = empresário irregular (não tem benefícios da personalidade).

### 2.5. Empresário Individual de Responsabilidade Limitada (EIRELI)

Foi **REVOGADA** pela Lei 14.195/21. Patrimônio se separa por meio de **Sociedade Limitada Unipessoal (SLU)**.

## 3. Sociedade Empresária

### 3.1. Conceito

Pessoa jurídica formada por sócios que conjugam esforços e bens para atividade empresarial.

### 3.2. Personalidade jurídica

- Adquirida com o registro na Junta Comercial.
- Patrimônio separado dos sócios (autonomia patrimonial).
- Exceção: desconsideração da personalidade (CC 50; CDC 28; Lei 12.846 — Anticorrupção).

### 3.3. Espécies (CC 982)

| Tipo | Responsabilidade dos sócios | Capital | Características |
|---|---|---|---|
| **Sociedade em Nome Coletivo** (CC 1.039) | ILIMITADA e solidária | Subscrito | Só pessoas físicas |
| **Comandita Simples** (CC 1.045) | Comanditados: ilimitada; Comanditários: limitada | Subscrito | Híbrida |
| **Sociedade Limitada** (CC 1.052) | LIMITADA ao valor das quotas | Quotas | Tipo mais comum no Brasil |
| **Sociedade Anônima (S/A)** (Lei 6.404/76) | Limitada ao preço de emissão das ações | Ações | Capital aberto ou fechado |
| **Comandita por Ações** (CC 1.090) | Diretores: ilimitada; demais: limitada | Ações | Rara |

### 3.4. Sociedade Limitada (LTDA)

- **Mais comum no Brasil** (95%+).
- Sócio responde até o valor de suas quotas (CC 1.052).
- TODOS solidariamente respondem pela integralização do capital (até o capital total).
- Pode ser composta por uma só pessoa (Sociedade Limitada Unipessoal — SLU).
- Administração: sócios designados em contrato ou ato separado.

### 3.5. Sociedade Anônima

- Regulada pela Lei 6.404/76.
- Capital dividido em **ações**.
- Tipos: **capital aberto** (CVM, bolsa) ou **capital fechado**.
- Responsabilidade do acionista: preço de emissão das ações subscritas.
- Órgãos: AGE/AGO (assembleia geral), Conselho de Administração (obrigatório nas abertas), Diretoria, Conselho Fiscal.

### 3.6. Sociedade simples (CC 997-1.038)

Não empresária — atividade intelectual/profissional (advogados, médicos em sociedade).

### 3.7. Sociedades em comum e em conta de participação

- **Em comum** (CC 986): sem personalidade — todos respondem ilimitadamente.
- **Em conta de participação** (CC 991): só sócio ostensivo aparece; o oculto fica fora.

## 4. Falência e Recuperação (Lei 11.101/05)

### 4.1. Quem pode

Aplicável a empresário e sociedade empresária. NÃO se aplica a:
- Empresas públicas e sociedades de economia mista.
- Cooperativas.
- Bancos e instituições financeiras (regime próprio).
- Operadoras de planos de saúde, seguradoras.

### 4.2. Recuperação Judicial

- Devedor em crise apresenta plano para superar dificuldades.
- Aprovado por credores em AGC (assembleia geral de credores).
- Stay period: 180 dias (prorrogáveis) de suspensão das ações.

### 4.3. Recuperação Extrajudicial

- Acordo direto com credores (sem todos), homologado pelo juiz.

### 4.4. Falência

- Decretada por insolvência (impontualidade, execução frustrada, atos de falência).
- Decreta o juízo universal: todas as ações vão pra Vara da Falência.
- Massa falida = patrimônio do devedor + recuperações.

### 4.5. Ordem de preferência dos créditos (Lei 11.101/05 art. 83)

1. Créditos trabalhistas (até 150 SM por trabalhador).
2. Créditos com garantia real.
3. Créditos tributários (exceto multas).
4. Créditos com privilégio especial.
5. Créditos com privilégio geral.
6. Créditos quirografários.
7. Multas (inclusive tributárias).
8. Créditos subordinados.

## 5. Títulos de Crédito

### 5.1. Conceito (CC 887)

> "Título de crédito é o documento necessário ao exercício do direito literal e autônomo nele contido."

### 5.2. Princípios (Vivante)

- **Cartularidade**: o direito está no papel.
- **Literalidade**: vale o que está escrito.
- **Autonomia**: cada obrigação cambial é independente.

### 5.3. Espécies clássicas

| Título | Função | Lei |
|---|---|---|
| **Letra de Câmbio** | Ordem de pagamento (3 figuras) | LUG (Decreto 57.663/66) |
| **Nota Promissória** | Promessa de pagamento (2 figuras) | LUG |
| **Cheque** | Ordem de pagamento à vista contra banco | Lei 7.357/85 |
| **Duplicata** | Saque com base em fatura comercial/prestação serviço | Lei 5.474/68 + Lei 13.775/18 (duplicata escritural) |

### 5.4. Cheque

- Espécies: à vista (regra). NÃO existe cheque "pré-datado" oficial — é prática (Súmula 370 STJ: apresentação antes do prazo = dano moral).
- Sustação: motivos genuínos (extravio, roubo) → não rescinde obrigação.
- Cheque sem fundo: ato de improbidade econômica + crime de estelionato (CP 171 §2º VI).

### 5.5. Duplicata

- ÚNICO título causal (nasce de compra e venda mercantil ou prestação de serviços).
- Sacador = vendedor; sacado = comprador.
- Duplicata escritural (Lei 13.775/18): pode existir só em sistema eletrônico autorizado.

### 5.6. Endosso e aval

- **Endosso**: transferência do título a outrem (cessão imprópria; o endossante é coobrigado).
- **Aval**: garantia em favor do devedor — equipara responsabilidade.
- ⚠️ Endosso ≠ Cessão Civil: na cambial, há autonomia (defesas pessoais NÃO se transmitem).

## 6. Como Cebraspe cobra

- **C/E empresário**: "Médico que exerce profissão liberal é empresário" → **ERRADO** (salvo se for elemento de empresa).
- **C/E EIRELI**: "A EIRELI subsiste com responsabilidade limitada do titular" → **ERRADO** (extinta — virou SLU).
- **C/E LTDA**: "Sócio responde apenas pelo valor de suas quotas" → **CUIDADO** (limitação vale a SUA parte, mas solidariamente pela INTEGRALIZAÇÃO do capital).
- **C/E falência**: "Cooperativas estão sujeitas à Lei 11.101/05" → **ERRADO** (excluídas).
- **C/E títulos**: "A duplicata é título abstrato" → **ERRADO** (é o ÚNICO causal).
$content$,
$resumo$
# Resumo Estratégico — Empresarial

## Empresário (CC 966)

Atividade econômica + organizada + profissional + para produção/circulação.

- Não-empresários: profissionais liberais, atividades intelectuais (salvo elemento de empresa).
- **EIRELI revogada** (2021) → virou Sociedade Limitada Unipessoal.

## Sociedade

- Personalidade: registro na Junta Comercial.
- **Desconsideração** (CC 50): abuso → desvio de finalidade ou confusão patrimonial.

## Tipos

| Tipo | Responsabilidade |
|---|---|
| Nome Coletivo | Ilimitada solidária |
| Limitada (LTDA) | Limitada (mas solidária na integralização do capital total) |
| S/A | Preço de emissão das ações |
| Comandita simples | Híbrida |
| Em conta de participação | Só ostensivo aparece |
| Em comum | Sem PJ — todos respondem |

## Falência (Lei 11.101/05)

- NÃO aplica: empresas públicas, S.E.M., cooperativas, bancos, seguradoras, planos de saúde.
- Recuperação judicial: stay 180 dias.
- Ordem créditos: Trabalhista (150 SM) → real → tributário → privilégio esp. → privilégio geral → quirografário → multas → subordinados.

## Títulos de Crédito

Princípios: cartularidade, literalidade, autonomia.

| Título | Tipo |
|---|---|
| Letra de Câmbio | Ordem (3 figuras) |
| Nota Promissória | Promessa (2 figuras) |
| Cheque | Ordem à vista vs banco |
| **Duplicata** | ÚNICO CAUSAL |

## Top pegadinhas Cebraspe

1. EIRELI EXTINTA — virou SLU.
2. Profissional liberal NÃO é empresário (salvo elemento de empresa).
3. Sócio LTDA: solidário na INTEGRALIZAÇÃO do capital.
4. Cooperativas NÃO falem (Lei 11.101).
5. Duplicata é causal (nasce de compra/venda ou serviço).
$resumo$
);

-- ─── 4. CLEANUP ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

-- ─── 5. RESUMO ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN (
      'direito-civil', 'direito-financeiro-e-tributario', 'direito-ambiental', 'direito-empresarial'
    )
  );
  RAISE NOTICE 'Onda 8 OK — total de materiais nesses subjects: %', v_count;
END $$;
