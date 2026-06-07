-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 12 — Toxicologia + Fé Pública/Hediondos + ProcPenal Júri/HC
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Medicina Legal: Toxicologia, Psicopatologia, Genética Forense
--  - Penal: Crimes contra Fé Pública + Hediondos (Lei 8.072/90)
--  - ProcPenal: Júri + HC + Investigação Cibernética
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'medicina-legal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Toxicologia, Psicopatologia e Genética Forense', 'med-toxico-psico-genetica', 1.3, 102, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Toxicologia, Psicopatologia e Genética Forense');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Crimes contra Fé Pública e Hediondos (Lei 8.072/90)', 'pen-fe-publica-hediondos', 1.3, 400, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Crimes contra Fé Pública e Hediondos (Lei 8.072/90)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Júri, Habeas Corpus e Investigação Cibernética', 'pp-juri-hc-invest-ciber', 1.3, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Júri, Habeas Corpus e Investigação Cibernética');
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

-- ┌─ 1. MEDICINA LEGAL — Toxicologia + Psicopatologia + Genética ────────────┐
SELECT upsert_material(
  'medicina-legal',
  'Toxicologia, Psicopatologia e Genética Forense',
  'Medicina Legal — Toxicologia, Psicopatologia e Genética Forense',
$content$
# Medicina Legal — Toxicologia, Psicopatologia e Genética Forense

Bloco que conclui a Medicina Legal pra Perito PF/PCDF. Cebraspe cobra muito tabela de drogas + classificação de transtornos + cadeia DNA.

## 1. Toxicologia Forense

### 1.1. Conceito

Estudo das **intoxicações** e seu diagnóstico médico-legal. Foca em **substâncias tóxicas** que causam dano, doença ou morte.

### 1.2. Classificação das intoxicações

- **Aguda**: dose única ou poucas → manifestação rápida.
- **Crônica**: doses repetidas → manifestação progressiva.
- **Subaguda**: intermediária.

Quanto à causa:
- **Acidental**.
- **Suicida**.
- **Homicida**.
- **Medicamentosa**.
- **Profissional/ocupacional**.

### 1.3. Drogas de abuso

#### A) Estimulantes do SNC
- **Cocaína**: vasoconstrição, taquicardia, midríase.
- **Crack**: derivado fumável da cocaína.
- **Anfetaminas/metanfetaminas**.
- **MDMA (Ecstasy)**.

#### B) Depressores do SNC
- **Álcool etílico**: principal droga social.
- **Opioides** (morfina, heroína, fentanil): miose puntiforme característica.
- **Benzodiazepínicos** (Diazepam, Clonazepam).
- **Barbitúricos**.

#### C) Perturbadores (alucinógenos)
- **LSD**.
- **Maconha (THC)**.
- **Cogumelos psilocibínicos**.
- **Datura (lança-perfume)**.

#### D) Inalantes
- Cola, solventes, "loló".

### 1.4. Álcool etílico (etanol)

Importante porque cai SEMPRE.
- **Etilometria**: limite de 0,3 mg/L exalar = crime CTB 306 (sem necessidade de alteração da capacidade).
- **Sangue**: ≥ 6 dg/L = embriaguez ao volante.
- Tolerância: variabilidade individual.

Fases da embriaguez:
1. **Excitação** (BAC 0,3-0,5 g/L).
2. **Confusão** (0,5-1,5 g/L).
3. **Sonolência** (1,5-3 g/L).
4. **Coma alcoólico** (>3 g/L).
5. **Morte** (>5 g/L geralmente).

### 1.5. Materiais para perícia toxicológica

- **Sangue**: melhor pra dose recente.
- **Urina**: histórico de uso (dias).
- **Cabelo/pelo**: histórico longo (meses).
- **Conteúdo gástrico**: ingestão recente.
- **Bile/vísceras**: post-mortem.

### 1.6. Intoxicações específicas

- **Monóxido de carbono (CO)**: livores rosados (carboxihemoglobina).
- **Cianeto**: cor cereja, odor de amêndoas amargas.
- **Chumbo (saturnismo)**: linha de Burton na gengiva.
- **Mercúrio**: tremor, alterações neurológicas.
- **Arsênico**: clássico veneno; queda de cabelo, dermatite.

## 2. Psicopatologia Forense

### 2.1. Imputabilidade penal (CP 26)

- **Imputável**: ao tempo do crime, capaz de entender o caráter ilícito + se determinar conforme.
- **Inimputável** (caput): por doença mental OU desenvolvimento mental incompleto/retardado — não tinha entendimento OU não podia se determinar.
  - **Medida de segurança** (não pena).
- **Semi-imputável** (parágrafo único): tinha capacidade parcial — pena reduzida 1/3 a 2/3 OU substituída por medida de segurança.

### 2.2. Embriaguez

- **Voluntária ou culposa**: NÃO exclui imputabilidade (actio libera in causa).
- **Patológica**: equipara-se a doença mental → INIMPUTABILIDADE.
- **Fortuita ou força maior + completa**: INIMPUTABILIDADE.
- **Preordenada** (CP 61 II l): agravante.

### 2.3. Transtornos mentais mais cobrados

- **Esquizofrenia**: delírios, alucinações, desorganização. CID-10 F20.
- **Transtorno bipolar**: alternância mania-depressão. F31.
- **Transtorno de personalidade antissocial**: psicopatia. F60.2.
- **Demências** (Alzheimer, vascular).
- **Transtornos por uso de substância**.

### 2.4. Exame de sanidade mental

- Realizado por perito ou junta.
- Determina:
  - Existência de doença mental.
  - Capacidade ao tempo do crime.
  - Periculosidade.

### 2.5. Medida de segurança (CP 96-99)

- **Internação** em hospital de custódia (psiquiátrico forense).
- **Tratamento ambulatorial**.
- Prazo mínimo: 1-3 anos. Sem máximo (mas STF/STJ: limite igual a pena máxima do crime praticado).
- Revisão pericial a cada 1 ano.

## 3. Genética Forense

### 3.1. DNA — Conceito

- **Ácido Desoxirribonucleico**: molécula que carrega informação genética.
- **Cromossomos**: 23 pares humanos (22 autossômicos + 1 sexual).
- **STR (Short Tandem Repeats)**: regiões hipervariáveis usadas em identificação.

### 3.2. Tipos de DNA usados na perícia

- **DNA nuclear**: único, individual.
- **DNA mitocondrial (mtDNA)**: herdado da MÃE — útil em amostras antigas/degradadas.
- **Cromossomo Y**: herdado do PAI — útil em casos com mistura de DNA masculino/feminino.

### 3.3. Banco de Perfis Genéticos (Lei 12.654/12)

- Coleta obrigatória em condenados por crime hediondo ou doloso com violência grave.
- Pacote Anticrime (13.964/19) ampliou hipóteses.
- Banco Nacional gerido pela PF.

### 3.4. Coleta de amostras

**Padrão-ouro**: swab bucal.

Em locais de crime:
- Sangue.
- Sêmen.
- Saliva.
- Pelos/cabelos com bulbo.
- Restos teciduais.

### 3.5. Cadeia de custódia (CPP 158-A após Anticrime)

10 fases:
1. Reconhecimento.
2. Isolamento.
3. Fixação.
4. Coleta.
5. Acondicionamento.
6. Transporte.
7. Recebimento.
8. Processamento.
9. Armazenamento.
10. Descarte.

### 3.6. Identificação por DNA

- **Probabilidade de paternidade**: testes ≥ 99,999%.
- **Identificação criminal**: comparação com perfil do suspeito.
- **Cadáveres**: comparação com familiares.

## 4. Como Cebraspe cobra

- **C/E**: "Embriaguez voluntária exclui imputabilidade" → **ERRADO** (não exclui — actio libera in causa).
- **C/E**: "Medida de segurança tem prazo máximo de 30 anos" → **CUIDADO** (STF/STJ: limite = pena máxima do crime; lei não diz prazo máximo).
- **C/E DNA mitocondrial**: "DNA mitocondrial é herdado do pai" → **ERRADO** (mãe).
- **C/E cocaína**: "Cocaína causa miose puntiforme" → **ERRADO** (causa MIDRÍASE; miose puntiforme = opioides).
- **C/E CO**: "Livores rosados são típicos de intoxicação por cianeto" → **ERRADO** (são CO; cianeto = vermelho cereja).
- **C/E swab**: "O padrão-ouro pra coleta de DNA em condenado é sangue" → **ERRADO** (swab bucal).
$content$,
$resumo$
# Resumo — Toxicologia + Psicopatologia + Genética

## Drogas (classificação)

| Tipo | Exemplos | Efeito |
|---|---|---|
| Estimulante | Cocaína, anfet, MDMA | Midríase, taquicardia |
| Depressor | Álcool, opioides, BZD | Sonolência |
| Perturbador | LSD, maconha, cogumelo | Alucinação |
| Inalante | Cola, "loló" | Variável |

⚠️ Opioides = MIOSE puntiforme; Cocaína = MIDRÍASE.

## Material perícia tox.

- Sangue: dose recente.
- Urina: dias.
- Cabelo: meses.
- Conteúdo gástrico: ingestão recente.

## Intoxicações típicas

- CO: livores ROSADOS (carboxihemo).
- Cianeto: vermelho CEREJA + amêndoas amargas.
- Chumbo: linha de Burton.

## Imputabilidade (CP 26)

- Imputável: entendimento + autodeterminação.
- Inimputável: doença mental → MEDIDA DE SEGURANÇA.
- Semi-imputável: redução 1/3 a 2/3 OU MS.
- Voluntária/culposa: NÃO exclui (actio libera in causa).
- Patológica/fortuita completa: EXCLUI.
- Preordenada: AGRAVANTE.

## Medida de Segurança

- Internação (hospital custódia) OU ambulatorial.
- Mínimo 1-3 anos.
- Sem máximo legal — STF/STJ: pena máxima do crime.
- Revisão pericial anual.

## Genética

- DNA nuclear: individual.
- mtDNA: MÃE — degradado/antigo.
- Cromossomo Y: PAI.
- Banco Nacional (Lei 12.654/12).
- Padrão-ouro coleta: SWAB BUCAL.

## Cadeia de custódia (CPP 158-A — 10 fases)

Reconhecimento → Isolamento → Fixação → Coleta → Acondicionamento → Transporte → Recebimento → Processamento → Armazenamento → Descarte.

## Top pegadinhas Cebraspe

1. Cocaína = midríase; opioide = miose.
2. mtDNA = MÃE.
3. Swab bucal = padrão-ouro.
4. CO = livores rosados; cianeto = cereja.
5. Embriaguez voluntária NÃO exclui imputabilidade.
6. MS sem prazo máximo legal (mas STF limita).
$resumo$
);

-- ┌─ 2. PENAL — Fé Pública + Hediondos ──────────────────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Crimes contra Fé Pública e Hediondos (Lei 8.072/90)',
  'Crimes contra a Fé Pública e Lei dos Crimes Hediondos (8.072/90)',
$content$
# Crimes contra a Fé Pública e Lei dos Crimes Hediondos

Dois blocos clássicos que faltavam fechar. Hediondos cobrem qualquer concurso policial; Fé Pública cobre PF/PCDF/MPU.

## 1. Crimes contra a Fé Pública (CP 289-311)

### 1.1. Conceito

**Fé pública** = confiança que a sociedade deposita em documentos, moedas, símbolos e objetos com força probatória.

### 1.2. Da moeda falsa

**Moeda falsa** (CP 289):
- Falsificar (fabricar) moeda metálica/papel-moeda.
- Pena: reclusão 3-12 anos + multa.
- §1º: importar/exportar/adquirir/vender/trocar.

**Falsificação grosseira**: STJ — estelionato (não moeda falsa).

### 1.3. Crimes assimilados ao de moeda falsa

- **Petrechos para falsificação** (291): pena 2-6 anos.
- **Emissão de título ao portador sem permissão legal** (292).

### 1.4. Da falsidade de títulos e papéis públicos

- **Falsificação de papéis públicos** (293): selo, papel selado, vale postal.
- **Petrechos para falsificação** (294).

### 1.5. Da falsidade documental

#### Falsificação de selo ou sinal público (296)

- Falsificar selo público destinado a autenticar atos oficiais.
- Pena: 2-6 anos.

#### Falsificação de documento público (297)

- Falsificar (todo ou parte) ou alterar documento público verdadeiro.
- Pena: reclusão 2-6 anos.
- §1º: aumento de 1/6 se servidor público comete prevalecendo-se do cargo.

#### Falsificação de documento particular (298)

- Falsificar/alterar documento particular verdadeiro.
- Pena: reclusão 1-5 anos.
- §ú: equipara-se cartão de crédito/débito.

#### Falsidade ideológica (299)

- **Omitir** declaração que devia constar OU **inserir** declaração falsa em documento.
- Pena: reclusão 1-5 anos (particular) / 1-5 anos + multa (público).
- ⚠️ Diferente da material (297/298): aqui o documento é MATERIALMENTE verdadeiro, mas o CONTEÚDO é falso.

#### Falso reconhecimento de firma (300)

#### Certidão ou atestado ideologicamente falso (301)

#### Falsidade material de atestado ou certidão (301 §1º)

#### Falsidade de atestado médico (302)

#### Reprodução ou adulteração de selo ou peça filatélica (303)

#### Uso de documento falso (304)

- Quem usa documento falso responde pela pena do que falsificou.

### 1.6. Outras falsidades

- **Falsa identidade** (307): atribuir-se ou atribuir a terceiro identidade falsa.
- **Fraude de lei sobre estrangeiros** (309).
- **Adulteração de sinal identificador de veículo** (311).

## 2. Lei dos Crimes Hediondos — Lei 8.072/90

### 2.1. Base constitucional

**CF 5º XLIII**: a lei considerará crimes inafiançáveis e insuscetíveis de graça e anistia a prática de tortura, tráfico ilícito de entorpecentes e crimes hediondos.

### 2.2. Crimes hediondos (rol TAXATIVO — art. 1º)

1. **Homicídio simples** quando praticado em atividade típica de grupo de extermínio + **homicídio qualificado**.
2. **Lesão corporal dolosa de natureza gravíssima ou seguida de morte** contra agente das instituições do art. 142 e 144 CF (militar/polícia) e seus familiares.
3. **Latrocínio**.
4. **Extorsão qualificada pela morte**.
5. **Extorsão mediante sequestro** e nas formas qualificadas.
6. **Estupro e estupro de vulnerável**.
7. **Epidemia com resultado morte**.
8. **Falsificação, corrupção, adulteração ou alteração de produto** destinado a fins terapêuticos ou medicinais.
9. **Favorecimento da prostituição** ou outra forma de exploração sexual de criança/adolescente/vulnerável.
10. **Genocídio**.
11. **Posse ou porte ilegal de arma de fogo de USO PROIBIDO** (Lei 10.826).
12. **Comércio ilegal de arma de fogo** (Lei 10.826).
13. **Tráfico internacional de arma de fogo** (Lei 10.826).
14. **Organização criminosa**, quando direcionada à prática hediondo.

### 2.3. Equiparados a hediondos

- **Tortura** (Lei 9.455/97).
- **Tráfico ilícito de drogas** (Lei 11.343 — exceto privilegiado).
- **Terrorismo** (Lei 13.260/16).

### 2.4. Consequências da hediondez

- **Inafiançável**.
- **Insuscetível de graça, anistia, indulto** (CF + Lei).
- **Cumprimento inicial em regime fechado** (STF: parcialmente inconstitucional — análise do caso).
- **Livramento condicional**: 2/3 da pena (3/5 antes da Lei 13.964/19; agora pelo Anticrime).
- **Progressão de regime** (art. 112 LEP pós-Anticrime):
  - Primário sem violência: 25%.
  - Primário com violência ou crime hediondo: 40%.
  - Reincidente sem violência: 30%.
  - Reincidente em hediondo sem morte: 50%.
  - Reincidente em hediondo com morte: 60%.
  - Hediondo + comando de organização: 70%.

### 2.5. Súmulas relevantes

- **Súmula Vinculante 26**: regime fechado obrigatório — STF declarou inconstitucional.
- **STF**: tráfico privilegiado NÃO é hediondo (cancelada Súmula 631 STJ).

## 3. Tortura — Lei 9.455/97

- Crime EQUIPARADO a hediondo.
- Tipos:
  - **Tortura-prova** (art. 1º I a): para obter confissão.
  - **Tortura-discriminação** (art. 1º I b).
  - **Tortura-castigo** (art. 1º II).
- Penas: 2-8 anos (regra); 8-16 anos qualificada.

## 4. Como Cebraspe cobra

- **C/E**: "Falsidade ideológica e material são sinônimas" → **ERRADO** (material = adulteração física; ideológica = conteúdo falso em documento materialmente íntegro).
- **C/E**: "Quem usa documento falso responde por estelionato" → **ERRADO** (CP 304 — responde pelo crime de falsificação).
- **C/E hediondos**: "O rol de hediondos é exemplificativo" → **ERRADO** (TAXATIVO).
- **C/E hediondos**: "Tráfico privilegiado é hediondo" → **ERRADO** (não é; STF cancelou).
- **C/E progressão**: "Progressão em hediondo é sempre 60%" → **ERRADO** (varia: 40, 50, 60, 70%).
- **C/E tortura**: "Tortura é hedionda" → **ERRADO** (é EQUIPARADA — distinção técnica).
$content$,
$resumo$
# Resumo — Fé Pública + Hediondos

## Crimes contra Fé Pública

| Crime | Art. | Característica |
|---|---|---|
| Moeda falsa | 289 | Fabricar/importar |
| Falsificação doc. público | 297 | Material — pena 2-6 anos |
| Falsificação doc. particular | 298 | Material — pena 1-5 anos |
| **Falsidade ideológica** | 299 | Conteúdo falso em doc. materialmente íntegro |
| Falsidade material atestado | 301-302 | Atestado médico/certidão |
| Uso doc. falso | 304 | Pena = do crime de falsificação |
| Falsa identidade | 307 | Identidade falsa pra si/terceiro |

## Hediondos (Lei 8.072/90)

### Rol TAXATIVO
- Homicídio qualificado + simples em grupo extermínio.
- Lesão gravíssima/morte contra agentes 142/144 + familiares.
- Latrocínio, Extorsão qual./mediante sequestro.
- Estupro + Estupro vulnerável.
- Epidemia c/ morte.
- Falsificação medicamentos.
- Exploração sexual criança/adolescente.
- Genocídio.
- Posse/Porte arma uso PROIBIDO.
- Comércio/Tráfico internacional arma.
- Org. criminosa direcionada a hediondo.

### Equiparados
Tortura (9.455), Tráfico de drogas (11.343), Terrorismo (13.260).

### Consequências
- Inafiançável.
- Sem graça/anistia/indulto.
- Livramento: 2/3.

### Progressão (LEP 112 pós-Anticrime)

| Hipótese | % |
|---|---|
| Primário s/ violência | 25% |
| Primário c/ violência ou hediondo | 40% |
| Reinc. s/ violência | 30% |
| Reinc. hediondo s/ morte | 50% |
| Reinc. hediondo c/ morte | 60% |
| Hediondo + comando org. | 70% |

## Top pegadinhas Cebraspe

1. Ideológica ≠ Material.
2. Tráfico privilegiado NÃO é hediondo.
3. Rol hediondos TAXATIVO.
4. Tortura/drogas/terrorismo: EQUIPARADOS (não hediondos puros).
5. Progressão varia 25-70%.
6. Quem usa doc. falso = pena do crime de falsificação.
$resumo$
);

-- ┌─ 3. PROC PENAL — Júri + HC + Investigação Cibernética ───────────────────┐
SELECT upsert_material(
  'direito-processual-penal',
  'Júri, Habeas Corpus e Investigação Cibernética',
  'Processual Penal — Júri, Habeas Corpus e Investigação Cibernética',
$content$
# Processual Penal — Júri, Habeas Corpus e Investigação Cibernética

Fecha os tópicos centrais do ProcPenal. Cebraspe cobra principalmente prazos do júri e flexibilidade do HC.

## 1. Tribunal do Júri (CF 5º XXXVIII + CPP 406-497)

### 1.1. Princípios constitucionais (CF 5º XXXVIII)

- **Plenitude de defesa**.
- **Sigilo das votações**.
- **Soberania dos veredictos**.
- **Competência para crimes dolosos contra a vida** (homicídio, infanticídio, induzimento ao suicídio, aborto).

### 1.2. Bipartição do procedimento (CPP 406-497)

#### Fase 1 — Sumário da Culpa (Judicium Accusationis)

- Recebimento da denúncia.
- Citação.
- Resposta escrita.
- Audiência de instrução.
- Alegações finais.
- **Decisões possíveis no fim da fase 1**:
  - **Pronúncia** (art. 413): há prova da materialidade + indícios suficientes de autoria → vai a júri.
  - **Impronúncia** (414): não há prova/indícios.
  - **Absolvição sumária** (415): excludente clara ou prova contundente.
  - **Desclassificação** (419): conduta NÃO é crime doloso contra vida.

#### Fase 2 — Judicium Causae (Plenário)

- Sorteio dos 25 jurados → 7 sorteados pra sessão.
- Composição: juiz togado + 7 jurados.
- Ordem: acusação, defesa, instrução, debates, votação.
- Quesitos (CPP 482-491):
  1. Materialidade.
  2. Autoria.
  3. Absolvição genérica (art. 483 III).
  4. Causa de diminuição/qualificadora.
- Votação SIGILOSA — 4+ votos prevalece.

### 1.3. Pronúncia

- Sentença em sentido amplo (interlocutória mista).
- Não pode antecipar mérito.
- Linguagem comedida (não impressionar jurados).
- Recurso: **RESE** (art. 581 IV).

### 1.4. Recursos do júri

- **Apelação** (art. 593 III): manifestamente contrária à prova, erro/injustiça na pena, nulidade após pronúncia.
- **Novo júri** se anulado.

## 2. Habeas Corpus (CF 5º LXVIII + CPP 647-667)

### 2.1. Conceito

Garantia constitucional contra **ilegalidade ou abuso de poder** que ameace a **liberdade de locomoção**.

### 2.2. Espécies

- **Preventivo** (salvo-conduto): ameaça de constrição.
- **Liberatório**: pessoa já presa.

### 2.3. Cabimento (CPP 648)

Quando alguém:
- Sofrer ou estar ameaçado de sofrer violência ou coação ilegal na liberdade de locomoção.

Hipóteses (rol exemplificativo):
- Sem justa causa.
- Excesso de prazo.
- Quem ordenar não tiver competência.
- Cessada a coação.
- Manifesta nulidade.
- Extinção da punibilidade.

### 2.4. Legitimidade

- **Impetrante**: qualquer pessoa (capaz ou incapaz) — não precisa de advogado.
- **Paciente**: quem sofre/ameaça.
- **Coator**: autoridade.

### 2.5. Competência

- **Juiz singular**: coator é delegado/policial.
- **Tribunal**: coator é juiz.
- **STJ**: coator é Tribunal estadual/regional.
- **STF**: coator é STJ, TRF de tribunal superior, autoridades CF 102.

### 2.6. Limitações (STF — Súmula 691)

- Não cabe HC contra decisão monocrática de relator em outro HC pendente — salvo flagrante ilegalidade.

### 2.7. HC ofício

- Juiz/Tribunal pode conceder de ofício se constatar ilegalidade (CPP 654 §2º).

### 2.8. Não cabe HC contra (jurisprudência):

- Punição disciplinar militar (CF 142 §2º).
- Suspensão dos direitos políticos.
- Pena pecuniária pura.
- Discussão sobre prova.

## 3. Investigação Cibernética

### 3.1. Base normativa

- CPP (geral).
- Marco Civil da Internet (12.965/14): guarda de logs.
- Pacote Anticrime (13.964/19): cadeia de custódia (158-A).
- Lei 9.296/96: interceptação telefônica e telemática.
- Lei 12.850/13: infiltração de agentes em organização criminosa.

### 3.2. Meios de obtenção de prova em cyber

#### A) Interceptação de fluxo de comunicações
- Autorização judicial.
- 15 dias prorrogáveis.
- Aplica-se a comunicações telemáticas.

#### B) Quebra de sigilo telemático
- Diferente de interceptação: pede DADOS já armazenados (não fluxo).
- Ex: registros de acesso, conteúdo de email já recebido.

#### C) Apreensão de dispositivos
- Cuidados: cadeia de custódia, espelhamento (clonagem) do dispositivo, hash.

#### D) Infiltração virtual (CPP 190-A após Lei 13.441/17)
- Em crimes contra dignidade sexual de crianças/adolescentes online.
- Autorização judicial específica.
- Prazo: até 90 dias prorrogáveis.

#### E) Captação ambiental (Lei 9.296/96 pós-Anticrime)
- Áudio/vídeo em ambiente.
- Autorização judicial.

### 3.3. Provas digitais — peculiaridades

- **Cadeia de custódia (CPP 158-A)** ESSENCIAL.
- **Hash** (MD5, SHA) pra garantir integridade.
- **Espelhamento** ao invés de exame do original.
- **Print de tela com geolocalização/data**.
- Conferência de log em provedor.

### 3.4. Cooperação internacional

- Convenção de Budapeste (Decreto 11.491/23).
- MLAT (Mutual Legal Assistance Treaty) com EUA.
- Solicitação direta a provedores estrangeiros (Google, Meta) via processo judicial.

### 3.5. Crimes cibernéticos típicos investigados

- Fraudes bancárias (estelionato eletrônico — CP 171 §2º-A).
- Invasão de dispositivo (154-A).
- Pornografia infantil (ECA 240-241-B).
- Crimes contra honra online.
- Stalking (CP 147-A).

### 3.6. Atribuição da PF

- Crime cometido contra bens, serviços ou interesses da União.
- Crime transnacional.
- Crime com repercussão interestadual.

## 4. Como Cebraspe cobra

- **C/E júri**: "Soberania dos veredictos significa que decisão do júri é absolutamente imune a recurso" → **ERRADO** (cabe apelação se manifestamente contrária à prova).
- **C/E pronúncia**: "Pronúncia exige prova de autoria além de qualquer dúvida" → **ERRADO** (indícios suficientes basta).
- **C/E HC**: "HC pode ser impetrado por advogado apenas" → **ERRADO** (qualquer pessoa, mesmo incapaz).
- **C/E HC**: "HC cabível contra punição disciplinar militar" → **ERRADO** (CF 142 §2º).
- **C/E interceptação**: "Interceptação telefônica pode durar 30 dias" → **ERRADO** (15 dias prorrogáveis).
- **C/E cibernético**: "A cadeia de custódia é facultativa em provas digitais" → **ERRADO** (CPP 158-A — obrigatória).
$content$,
$resumo$
# Resumo — Júri + HC + Investigação Cibernética

## Júri (CF 5º XXXVIII)

### Princípios
Plenitude defesa + Sigilo votações + Soberania dos veredictos + Competência crimes dolosos contra vida.

### Fase 1 — Sumário da culpa
Decisões: Pronúncia (vai júri) | Impronúncia | Absolvição sumária | Desclassificação.

### Fase 2 — Plenário
25 sorteados → 7 jurados. Quesitos: materialidade, autoria, absolvição genérica, qualificadora.
Votação SIGILOSA — 4 votos.

### Recursos
- Pronúncia: RESE.
- Sentença: Apelação (593 III).

## Habeas Corpus

### Espécies
Preventivo (salvo-conduto) | Liberatório.

### Cabimento
Coação ilegal à liberdade de locomoção: sem justa causa, excesso prazo, incompetência, nulidade manifesta, extinção punibilidade.

### Legitimidade
- Impetrante: qualquer pessoa (sem advogado).
- Paciente: quem sofre.
- Coator: autoridade.

### NÃO cabe
- Punição disciplinar militar (CF 142 §2º).
- Suspensão direitos políticos.
- Pena pecuniária.
- Discussão sobre prova.

## Investigação Cibernética

### Meios
- Interceptação (9.296): 15 dias prorrogáveis.
- Quebra sigilo telemático (dados armazenados).
- Apreensão dispositivos + cadeia custódia + hash.
- Infiltração virtual (CPP 190-A): 90 dias prorrogáveis.
- Captação ambiental (9.296 pós-Anticrime).

### Provas digitais
- Cadeia custódia OBRIGATÓRIA (CPP 158-A).
- Hash (MD5/SHA).
- Espelhamento (não original).

### Cooperação internacional
Budapeste (Dec 11.491/23), MLAT EUA.

### Atribuição PF
Bens/serviços União, transnacional, interestadual.

## Top pegadinhas Cebraspe

1. HC: qualquer pessoa pode impetrar (mesmo incapaz).
2. Soberania veredictos NÃO afasta apelação (593 III).
3. Pronúncia = indícios suficientes (não certeza).
4. Interceptação = 15 dias prorrogáveis.
5. Cadeia custódia em digital é OBRIGATÓRIA.
6. HC NÃO cabe contra punição disciplinar militar.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN (
      'medicina-legal', 'direito-penal', 'direito-processual-penal'
    )
  );
  RAISE NOTICE 'Onda 12 OK — total de materiais nesses subjects: %', v_count;
END $$;
