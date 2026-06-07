-- ════════════════════════════════════════════════════════════════════════════
-- ONDA 7 — Materiais especialidades (PF, PCDF)
-- Data: 2026-06-07
--
-- Cria TOPICS + MATERIAIS pras matérias específicas das especialidades:
--   - Criminalística (PF Perito, PCDF Perito)
--   - Estatística (PF Perito, PCDF Perito)
--   - Contabilidade Geral (PF Escrivão, PF Agente, PF Perito)
--   - Arquivologia (PF Escrivão)
--   - Papiloscopia (PF Papiloscopista)
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- TOPICS — Criminalística
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Conceitos Básicos e Princípio de Locard', 'crim-conceitos-locard', 1.5, 1),
  ('Locais de Crime: isolamento, preservação, processamento', 'crim-locais-crime', 1.5, 2),
  ('Balística Forense (arma, calibre, cartucho, resíduos)', 'crim-balistica', 1.3, 3),
  ('Tanatologia e Traumatologia Forense', 'crim-tanato-trauma', 1.2, 4),
  ('Laudo Pericial e Cadeia de Custódia', 'crim-laudo-cadeia', 1.0, 5)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'nocoes-criminalistica'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- TOPICS — Estatística
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Estatística Descritiva (medidas de tendência e dispersão)', 'est-descritiva', 1.5, 1),
  ('Probabilidade e Distribuições', 'est-probabilidade', 1.3, 2),
  ('Amostragem e Inferência', 'est-amostragem-inferencia', 1.2, 3),
  ('Regressão Linear e Correlação', 'est-regressao', 1.0, 4)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'estatistica'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- TOPICS — Contabilidade Geral
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Patrimônio: equação fundamental, conta, plano de contas', 'cont-patrimonio', 1.5, 1),
  ('Atos e Fatos Contábeis + Escrituração', 'cont-atos-fatos', 1.3, 2),
  ('Demonstrações Contábeis (BP, DRE, DFC, DMPL)', 'cont-demonstracoes', 1.5, 3),
  ('Lei 6.404/76 e CPCs principais', 'cont-lei-6404-cpcs', 1.2, 4)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'contabilidade-geral'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- TOPICS — Arquivologia
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios Arquivísticos (proveniência, ordem original)', 'arq-principios', 1.5, 1),
  ('Gestão de Documentos: classificação, avaliação, eliminação', 'arq-gestao-documentos', 1.5, 2),
  ('Ciclo Vital: corrente, intermediária, permanente', 'arq-ciclo-vital', 1.3, 3),
  ('Tabela de Temporalidade e Preservação', 'arq-temporalidade', 1.2, 4)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'arquivologia'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- TOPICS — Papiloscopia
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Ciência Papiloscópica: conceitos e fundamentos', 'pap-fundamentos', 1.5, 1),
  ('Datiloscopia: classificação Vucetich, sistemas', 'pap-datiloscopia', 1.8, 2),
  ('Quiroscopia, Podoscopia e Identificação Humana', 'pap-quiro-podo', 1.3, 3),
  ('AFIS e Tecnologia Aplicada', 'pap-afis', 1.0, 4)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'papiloscopia'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- FUNÇÃO HELPER
-- ──────────────────────────────────────────────────────────────────────────
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
-- CRIMINALÍSTICA — Conceitos Básicos e Princípio de Locard
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'nocoes-criminalistica',
  'Conceitos Básicos e Princípio de Locard',
  'Criminalística — Conceitos e Princípio de Locard',
  $md$
# Conceitos Básicos e Princípio de Locard

A Criminalística é a ciência aplicada ao estudo dos vestígios materiais do crime. Tema **clássico em concursos periciais**. Cobra distinções entre vestígio/evidência/indício + Princípio de Locard.

## Conceito de Criminalística

> **Criminalística** é a ciência que aplica métodos das ciências naturais e exatas à investigação criminal, com o objetivo de **reconstruir** o fato delituoso a partir dos vestígios materiais deixados.

### Diferenças (memorize!)

| Termo | Definição | Exemplo |
|---|---|---|
| **Vestígio** | Marca/sinal material deixado pelo crime ou agente | Pegada no local |
| **Evidência** | Vestígio com **relação direta** ao crime, comprovada por perícia | Pegada conferida = pertence ao suspeito X |
| **Indício** | Circunstância conhecida que leva à conclusão sobre fato desconhecido (Art 239 CPP) | Réu foi visto perto do local |

### Cuidado pra prova
- **Vestígio** = neutro (não comprovado ainda)
- **Evidência** = vestígio JÁ ANALISADO e relevante
- **Indício** = jurídico (Art 239 CPP)

## Princípio de Locard (★ central)

Formulado por **Edmond Locard** (criminalista francês, ~1910).

### Enunciado
> "Todo contato deixa um traço."
>
> Princípio do intercâmbio: quando dois objetos entram em contato, há TROCA de vestígios entre eles.

### Aplicação prática
- Agente → cena: deixa fios de cabelo, fibras, DNA, pegadas, digitais
- Cena → agente: leva pó, sangue, tinta, vidro
- A perícia parte desse princípio pra reconstruir o que ocorreu

### Exceções e limites
- Em ambientes hostis (fogo, chuva), vestígios podem ser destruídos
- Princípio é POSTULADO, não absoluto

## Classificação dos Vestígios

### Quanto à origem
- **Biológicos**: sangue, sêmen, saliva, cabelo, tecido orgânico
- **Físicos**: marcas de pneu, projéteis, instrumentos, pegadas
- **Químicos**: drogas, venenos, resíduos
- **Microvestígios**: fibras, pólen, micropartículas

### Quanto à visibilidade
- **Visíveis**: facilmente identificáveis sem técnicas especiais
- **Latentes**: invisíveis a olho nu (impressões digitais, fluidos secos)
- **Mascarados**: ocultos intencionalmente

## Áreas da Criminalística Moderna

1. **Local de crime** (perícia in loco)
2. **Balística forense**
3. **Tanatologia / Necropsia** (estuda a morte)
4. **Traumatologia forense**
5. **Toxicologia forense**
6. **Documentoscopia** (documentos falsos)
7. **Genética forense / DNA**
8. **Papiloscopia / Datiloscopia**
9. **Informática forense / Cibercrime**
10. **Antropologia forense**

## Identidade x Identificação

### Identidade
- Conjunto de características que individualizam alguém
- Permanente, única

### Identificação
- Ato de constatar a identidade
- Pode ser:
  - **Civil**: voluntária, fins administrativos
  - **Criminal**: imposta pela investigação, com ou sem consentimento (Lei 12.037/09)

## Lei 12.030/2009 — Perícias Oficiais

> "A perícia oficial de natureza criminal é exercida POR PERITO OFICIAL de natureza criminal."

- Perito oficial = servidor concursado
- **Autonomia técnica e científica**
- Vedação a interferência hierárquica no resultado pericial
- Perito **NÃO está vinculado** a opiniões da autoridade (juiz, delegado, MP)

## Fotografia Pericial

- Documenta o local e os vestígios
- Tipos:
  - **Panorâmica**: visão geral
  - **Aproximação**: vestígio em contexto
  - **Detalhe**: vestígio isolado com escala

## Como cai na Cebraspe/Banca

**Item 1 (CERTO):** "O Princípio do Intercâmbio, formulado por Locard, postula que toda interação entre dois objetos deixa traços recíprocos passíveis de análise pericial."

**Item 2 (ERRADO):** "Vestígio, evidência e indício são termos sinônimos no âmbito da Criminalística."
> Errado: cada um tem definição própria (ver tabela).

**Item 3 (CERTO):** "Conforme a Lei 12.030/2009, o perito oficial tem autonomia técnica, não estando subordinado a opiniões da autoridade requisitante quanto ao resultado pericial."

**Item 4 (ERRADO):** "Impressões digitais latentes são aquelas claramente visíveis a olho nu na superfície investigada."
> Errado: latentes são **invisíveis** sem técnicas (revelação por pó, vapor, química).

## Estratégia
- Decore Vestígio × Evidência × Indício
- Princípio de Locard = "TODO CONTATO DEIXA TRAÇO"
- Vestígios LATENTES = invisíveis
- Perito tem AUTONOMIA TÉCNICA (Lei 12.030/09)
- Fotografia pericial: panorâmica → aproximação → detalhe
$md$,
  $resumo$
## Resumo — Conceitos de Criminalística

### Distinções essenciais
| | Significado |
|---|---|
| **Vestígio** | Sinal material (neutro) |
| **Evidência** | Vestígio com relação ao crime (analisado) |
| **Indício** | Circunstância jurídica (Art 239 CPP) |

### Princípio de Locard (★)
**"Todo contato deixa um traço"** — TROCA recíproca de vestígios entre 2 objetos em contato.

### Classificação dos vestígios
- **Origem**: biológicos, físicos, químicos, microvestígios
- **Visibilidade**: visíveis, **LATENTES** (invisíveis), mascarados

### Áreas da Criminalística
Balística, tanatologia, traumatologia, toxicologia, documentoscopia, genética, papiloscopia, informática, antropologia

### Lei 12.030/2009
- Perícia oficial criminal = **perito oficial**
- **AUTONOMIA TÉCNICA E CIENTÍFICA** garantida
- Não vinculado a opiniões da autoridade

### Identidade vs Identificação
- Identidade = características individuais
- Identificação CIVIL (voluntária) × CRIMINAL (Lei 12.037/09)

### Pegadinhas
- Vestígio ≠ Evidência (evidência já foi analisada)
- LATENTE = invisível (NÃO claramente visível)
- Perito tem autonomia (NÃO subordinado)
- Locard = TROCA (NÃO unidirecional)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- CRIMINALÍSTICA — Locais de Crime + Balística
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'nocoes-criminalistica',
  'Locais de Crime: isolamento, preservação, processamento',
  'Locais de Crime e Cadeia de Custódia',
  $md$
# Locais de Crime: Isolamento, Preservação, Processamento

Conjunto de procedimentos críticos pra preservar a integridade da prova material. Cobra **fases do processamento** + **cadeia de custódia** (Lei 13.964/2019).

## Conceito de Local de Crime

> Espaço físico onde ocorreu o fato investigado ou onde estão os vestígios.

### Tipos
- **Locus delicti**: onde o crime foi praticado
- **Local relacionado**: outros lugares com vestígios (esconderijo, fuga)

## Classificação

### Quanto à preservação
- **Idôneo (preservado)**: condições intactas
- **Inidôneo (perturbado)**: alterações pós-fato (curiosos, animais, intempérie)

### Quanto à localização
- **Interno**: dentro de imóvel
- **Externo**: via pública, área aberta

### Quanto ao tipo
- **Perinecriscópico**: com cadáver
- **Sem cadáver**: arrombamento, furto, dano

## Fases do Processamento Pericial (memorize)

### 1. ISOLAMENTO
- Primeiro policial a chegar ao local **DELIMITA E PROTEGE**
- Cordão de isolamento (corda, fita)
- Restringe acesso a pessoas autorizadas
- Registra horário e quem entrou

### 2. PRESERVAÇÃO
- Manutenção das condições originais
- Não tocar nem alterar nada antes da perícia
- Se houver risco (incêndio), salvar vida primeiro mas REGISTRAR a alteração

### 3. OBSERVAÇÃO
- Análise visual geral antes de coletar
- Fotografia panorâmica
- Croqui do local (desenho com posições)

### 4. FIXAÇÃO
- **Fotografia** (panorâmica, aproximação, detalhe)
- **Croqui**
- **Filmagem**
- **Descrição textual** detalhada

### 5. COLETA
- Apreensão dos vestígios pertinentes
- **Embalagens** apropriadas:
  - Papel pra biológicos (deixa "respirar")
  - Plástico pra químicos
  - Recipientes herméticos pra voláteis
- Cada item embalado SEPARADAMENTE
- Etiquetado: data, hora, local, coletor

### 6. ACONDICIONAMENTO E TRANSPORTE
- Cadeia de frio se necessário (DNA, biológicos)
- Lacre numerado

### 7. ANÁLISE
- Laboratório
- Métodos científicos
- Laudo pericial

## CADEIA DE CUSTÓDIA (Lei 13.964/2019)

★ Tema PESADO no Pacote Anticrime.

### Conceito (Art 158-A CPP)
> "Conjunto de todos os procedimentos utilizados pra manter e documentar a história cronológica do vestígio coletado em locais ou em vítimas de crimes, pra rastrear sua posse e manuseio."

### Início (Art 158-B)
- Inicia-se na **PRESERVAÇÃO** do local
- Termina no descarte ou devolução

### Etapas (Art 158-B CPP)
1. **Reconhecimento**: ato de distinguir um elemento como de interesse
2. **Isolamento**: ato de evitar adulteração do local imediato
3. **Fixação**: descrição detalhada (fotografia, vídeo, croqui)
4. **Coleta**: ato de recolher o vestígio
5. **Acondicionamento**: ato de guardar de forma adequada
6. **Transporte**: ato de transferir vestígio
7. **Recebimento**: ato formal de recebimento no laboratório
8. **Processamento**: realização de exames
9. **Armazenamento**: conservação
10. **Descarte**: remoção final

### Quebra da cadeia
- Falha em qualquer etapa **pode tornar a prova ilícita**
- Súmula 591 STJ (não específica, mas STJ admite anulação)
- STJ AgRg no RHC 143.169: quebra da cadeia gera nulidade

## Local de Crime Perinecriscópico (com cadáver)

### Particularidades
- Investigação envolve médico legista
- Estudo da posição do corpo
- Sinais cadavéricos auxiliam estimativa do momento da morte

### Estudo da morte (tanatologia)
- **Algor mortis**: resfriamento do corpo
- **Livor mortis**: manchas hipostáticas (sangue desce por gravidade)
- **Rigor mortis**: rigidez muscular
- **Putrefação**: decomposição

## Balística Forense (visão geral)

### Subdivisões
- **Balística interna**: comportamento dentro da arma
- **Balística externa**: trajetória do projétil no ar
- **Balística terminal**: efeito do projétil no alvo

### Elementos
- **Arma de fogo**: classificação por alma (lisa/raiada), tamanho, calibre
- **Cartucho**: estojo + projétil + pólvora + espoleta
- **Projétil**: parte que sai
- **Calibre**: diâmetro interno do cano (medido em mm ou polegadas)
- **Resíduos de tiro**: chumbo, bário, antimônio (depositados em mãos do atirador)

### Exames balísticos
- **Microcomparador**: striations em projéteis disparados
- **Banco Nacional de Perfis Balísticos**

## Como cai na banca

**Item 1 (CERTO):** "Conforme o art. 158-B do CPP, a cadeia de custódia inicia-se com a preservação do local de crime e termina com o descarte do vestígio."

**Item 2 (ERRADO):** "O isolamento do local de crime é atribuição EXCLUSIVA do perito criminal designado."
> Errado: o PRIMEIRO POLICIAL no local é o responsável pelo isolamento inicial.

**Item 3 (CERTO):** "A quebra da cadeia de custódia pode acarretar a ilicitude da prova obtida, conforme entendimento do STJ."

**Item 4 (ERRADO):** "Embalagens plásticas são adequadas para todos os tipos de vestígios biológicos."
> Errado: biológicos pedem PAPEL (permite "respirar" e evita degradação).

## Estratégia
- Decore as 7 fases do processamento (Isolamento → Análise)
- Cadeia de custódia: 10 etapas (Art 158-B CPP — Pacote Anticrime)
- Embalagens: PAPEL pra biológicos / PLÁSTICO pra químicos
- Primeiro policial = isolamento inicial (NÃO perito)
- Algor/Livor/Rigor mortis (estudo da morte)
$md$,
  $resumo$
## Resumo — Locais de Crime + Cadeia de Custódia

### Fases do Processamento (7)
1. **Isolamento** — primeiro policial
2. **Preservação** — manutenção do estado
3. **Observação** — análise visual
4. **Fixação** — fotos, croqui, vídeo
5. **Coleta** — apreensão + embalagens
6. **Acondicionamento + Transporte**
7. **Análise** — laudo

### Embalagens
- **Papel**: biológicos (deixa respirar)
- **Plástico**: químicos
- **Hermético**: voláteis

### CADEIA DE CUSTÓDIA — Art 158-B CPP (10 etapas)
1. Reconhecimento
2. Isolamento
3. Fixação
4. Coleta
5. Acondicionamento
6. Transporte
7. Recebimento (laboratório)
8. Processamento (exames)
9. Armazenamento
10. Descarte

**Quebra → prova pode ser ILÍCITA**

### Tanatologia (estudo da morte)
- Algor mortis: resfriamento
- Livor mortis: hipostase
- Rigor mortis: rigidez
- Putrefação

### Balística (3 subdivisões)
- Interna (na arma), Externa (no ar), Terminal (no alvo)
- Cartucho = estojo + projétil + pólvora + espoleta
- Resíduos de tiro: Pb, Ba, Sb

### Pegadinhas
- Isolamento = PRIMEIRO POLICIAL (não perito)
- Biológicos → PAPEL (NÃO plástico)
- Cadeia de custódia: começa preservação, termina descarte
- Quebra = nulidade possível
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ESTATÍSTICA — Descritiva + Probabilidade
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'estatistica',
  'Estatística Descritiva (medidas de tendência e dispersão)',
  'Estatística Descritiva',
  $md$
# Estatística Descritiva

Tema CRÍTICO em concursos de Perito (PF, PCDF). Cobra **medidas de tendência central**, **dispersão** e **gráficos**.

## Conceitos Base

### População vs Amostra
- **População**: conjunto TOTAL dos elementos sob estudo
- **Amostra**: subconjunto representativo da população

### Variáveis
- **Qualitativas**:
  - Nominais (sexo, cor)
  - Ordinais (classe social: baixa/média/alta)
- **Quantitativas**:
  - Discretas (números inteiros: filhos)
  - Contínuas (peso, altura, tempo)

## Medidas de Tendência Central

### MÉDIA ARITMÉTICA
> Soma dos valores ÷ quantidade

$$\bar{x} = \frac{\sum x_i}{n}$$

- Sensível a OUTLIERS (valores extremos)
- Mais usada em distribuições normais

### MEDIANA
- Valor que divide a amostra em DUAS PARTES IGUAIS
- Robusta a outliers
- Posição (n+1)/2 quando n ímpar; média dos dois centrais quando n par

### MODA
- Valor MAIS FREQUENTE
- Pode haver mais de uma (bimodal, multimodal)
- Pode não haver moda (amodal)

### Pegadinha clássica
- "Quando há outliers extremos, a MÉDIA é a melhor medida" → ERRADO. Mediana é mais robusta.

## Quartis, Decis, Percentis

### Quartis (Q1, Q2, Q3)
- Q1: 25%
- Q2: 50% (=mediana)
- Q3: 75%

### Amplitude Interquartil (AIQ)
- AIQ = Q3 - Q1
- Medida de dispersão robusta

## Medidas de Dispersão

### AMPLITUDE TOTAL
- Maior - Menor

### VARIÂNCIA
> Média dos quadrados dos desvios em relação à média

$$\sigma^2 = \frac{\sum (x_i - \bar{x})^2}{n}$$

- Variância amostral usa (n-1) no denominador (s²)
- Unidade ao quadrado

### DESVIO PADRÃO (σ)
- RAIZ QUADRADA da variância
- Mesma unidade dos dados

### COEFICIENTE DE VARIAÇÃO (CV)
> CV = (σ / média) × 100%

- Comparar dispersão entre conjuntos com unidades/médias diferentes
- CV < 15% → baixa dispersão
- CV > 30% → alta dispersão

## Forma da Distribuição

### Assimetria
- **Simétrica**: média = mediana = moda
- **Assimétrica à direita** (positiva): cauda longa à direita, MD < MED < MED
- **Assimétrica à esquerda** (negativa): cauda longa à esquerda, MD > MED > MED

### Curtose
- **Mesocúrtica**: normal
- **Leptocúrtica**: pico alto, caudas leves
- **Platicúrtica**: pico baixo, caudas pesadas

## Distribuição Normal (Curva de Gauss)

### Características
- Simétrica em torno da média
- 100% da área sob a curva = 1
- Média = mediana = moda
- Inflexão em ±1σ

### Regra Empírica (3 Sigmas)
- **68%** dos dados em ±1σ
- **95%** em ±2σ
- **99,7%** em ±3σ

### Padronização (Z-score)
$$z = \frac{x - \mu}{\sigma}$$

- Permite comparar valores de distribuições diferentes
- Z=0 (mediana); Z=±1 (1σ da média)

## Probabilidade — Conceitos Iniciais

### Probabilidade clássica
$$P(A) = \frac{\text{casos favoráveis}}{\text{casos possíveis}}$$

### Eventos
- **Mutuamente exclusivos**: A e B não ocorrem juntos → P(A∪B) = P(A) + P(B)
- **Independentes**: ocorrência de A não afeta B → P(A∩B) = P(A) × P(B)

### Probabilidade Condicional
$$P(A|B) = \frac{P(A \cap B)}{P(B)}$$

### Teorema de Bayes
$$P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}$$

## Como cai na banca

**Item 1 (CERTO):** "A mediana é uma medida de tendência central robusta a outliers, sendo preferível à média em distribuições assimétricas."

**Item 2 (ERRADO):** "Em uma distribuição normal, aproximadamente 99% dos dados estão a ±2 desvios padrão da média."
> Errado: ±2σ = **95%**. 99,7% = ±3σ.

**Item 3 (CERTO):** "O coeficiente de variação é útil para comparar a dispersão de conjuntos de dados com unidades de medida ou médias diferentes."

**Item 4 (ERRADO):** "A variância e o desvio padrão são expressos na mesma unidade dos dados originais."
> Errado: variância tem unidade AO QUADRADO; desvio padrão tem mesma unidade.

## Estratégia
- Decore regra empírica: 68% / 95% / 99,7%
- Média sensível a outliers; mediana robusta
- CV pra comparar dispersões diferentes
- Z-score padroniza distribuições
- Variância: unidade²; desvio padrão: unidade igual
$md$,
  $resumo$
## Resumo — Estatística Descritiva

### Variáveis
- **Qualitativas**: nominais (sexo) ou ordinais (classe)
- **Quantitativas**: discretas (n. filhos) ou contínuas (peso)

### Medidas de Tendência Central
- **Média**: sensível a OUTLIERS
- **Mediana**: divide em 2 partes iguais (ROBUSTA)
- **Moda**: mais frequente

### Quartis
- Q1 = 25%, Q2 = 50% (mediana), Q3 = 75%
- AIQ = Q3 - Q1

### Medidas de Dispersão
- **Variância** (σ²): média dos desvios ao quadrado (**unidade²**)
- **Desvio padrão** (σ): √variância (mesma unidade)
- **CV** = (σ/média) × 100% → compara dispersões diferentes

### Regra Empírica (Normal)
- **±1σ**: 68%
- **±2σ**: 95%
- **±3σ**: 99,7%

### Assimetria
- Simétrica: média = mediana = moda
- Direita (positiva): cauda longa à direita
- Esquerda (negativa): cauda longa à esquerda

### Z-score (padronização)
- z = (x − μ) / σ

### Probabilidade
- **Mutuamente exclusivos**: P(A∪B) = P(A) + P(B)
- **Independentes**: P(A∩B) = P(A) × P(B)
- **Condicional**: P(A|B) = P(A∩B) / P(B)
- **Bayes**: P(A|B) = [P(B|A)·P(A)] / P(B)

### Pegadinhas
- Mediana > média em robustez a outliers
- ±2σ = 95% (não 99%)
- Variância em unidade²
- Eventos mutuamente exclusivos NÃO são independentes
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- CONTABILIDADE — Patrimônio + Equação Fundamental
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'contabilidade-geral',
  'Patrimônio: equação fundamental, conta, plano de contas',
  'Patrimônio e Equação Contábil',
  $md$
# Patrimônio: Equação Fundamental, Conta, Plano de Contas

Tema-base da Contabilidade. Cobra **classificação patrimonial** + **equação contábil**.

## Conceito de Patrimônio

> Conjunto de **bens, direitos e obrigações** de uma entidade.

### Classificação

| Tipo | O que é | Exemplos |
|---|---|---|
| **Bens** | Coisas úteis e ÚTEIS (materiais ou imateriais) | Caixa, estoque, máquinas, marcas |
| **Direitos** | Valores a receber | Clientes, duplicatas, aluguéis a receber |
| **Obrigações** | Valores a pagar | Fornecedores, empréstimos, salários |

### Bens
- **Tangíveis** (materiais): móveis, imóveis, veículos
- **Intangíveis** (imateriais): marcas, patentes, software
- **Móveis** (transportáveis): carros, máquinas
- **Imóveis** (fixos): terrenos, edifícios
- **De troca** (circulante): estoque pra venda
- **De renda**: imóvel alugado
- **De uso**: máquinas pra produção

## Equação Patrimonial (FUNDAMENTAL)

$$\boxed{\text{ATIVO} = \text{PASSIVO} + \text{PATRIMÔNIO LÍQUIDO}}$$

OU
$$\boxed{\text{ATIVO} - \text{PASSIVO} = \text{PATRIMÔNIO LÍQUIDO}}$$

### Componentes
- **Ativo**: BENS + DIREITOS (lado esquerdo do BP)
- **Passivo**: OBRIGAÇÕES com 3os (lado direito)
- **Patrimônio Líquido (PL)**: obrigações com SÓCIOS (capital + lucros + reservas)

### Situações Patrimoniais

| Situação | Equação | Significado |
|---|---|---|
| **Ativa/Positiva** | A > P → PL positivo | Empresa solvente |
| **Equilíbrio absoluto** | A = P → PL = 0 | Sem capital próprio |
| **Passiva/Negativa** | A < P → PL negativo | Passivo a descoberto |
| **Negativa absoluta** | A = 0, P > 0 | Falência total |

## Conta Contábil

### Conceito
- Registro individualizado de cada item patrimonial
- Tem natureza DEVEDORA ou CREDORA

### Razonetes (T)
- Lado esquerdo: DÉBITO
- Lado direito: CRÉDITO

### Mecanismo de débito e crédito

| Tipo | Aumenta com | Diminui com |
|---|---|---|
| **Ativo** | Débito | Crédito |
| **Passivo** | Crédito | Débito |
| **PL** | Crédito | Débito |
| **Despesa** | Débito | Crédito |
| **Receita** | Crédito | Débito |

### Pegadinha clássica
- Receita NÃO É ATIVO (é resultado, vai pro PL via lucro)
- Despesa NÃO É PASSIVO (é resultado, reduz PL via prejuízo)

## Plano de Contas

### Definição
- LISTA estruturada de todas as contas usadas pela empresa
- Organizada hierarquicamente

### Estrutura típica (5 grupos)
1. **ATIVO** (códigos iniciados em 1)
   - 1.1 Ativo Circulante
   - 1.2 Ativo Não-Circulante
2. **PASSIVO** (códigos em 2)
3. **PATRIMÔNIO LÍQUIDO** (códigos em 3 ou 2.3)
4. **RECEITAS** (códigos em 4)
5. **DESPESAS** (códigos em 5)

### Princípios pra estruturação
- **Uniformidade**: códigos coerentes
- **Adequação**: ao tipo de empresa
- **Flexibilidade**: permitir alterações

## Subdivisões do Ativo

### Ativo Circulante (curto prazo)
- Realização em até **12 meses** ou ciclo operacional (o que for maior)
- Caixa, bancos, clientes, estoques

### Ativo Não-Circulante
- **Realizável a Longo Prazo**: créditos > 12 meses
- **Investimentos**: participações em outras empresas
- **Imobilizado**: bens de uso (máquinas, veículos)
- **Intangível**: marcas, patentes, software

## Subdivisões do Passivo

### Passivo Circulante
- Obrigações até 12 meses
- Fornecedores, empréstimos CP, salários a pagar

### Passivo Não-Circulante
- Obrigações > 12 meses
- Financiamentos LP, debêntures

## Como cai na banca

**Item 1 (CERTO):** "Conforme a equação patrimonial fundamental, o Ativo é sempre igual à soma do Passivo com o Patrimônio Líquido."

**Item 2 (ERRADO):** "Marcas e patentes são classificadas como bens tangíveis no Ativo Imobilizado."
> Errado: são INTANGÍVEIS, classificadas no Ativo Intangível.

**Item 3 (CERTO):** "No mecanismo de débito e crédito, as contas de Passivo aumentam por crédito e diminuem por débito."

**Item 4 (ERRADO):** "Receita é uma conta classificada como Ativo no plano de contas."
> Errado: Receita é conta de RESULTADO, vai pro PL via apuração do exercício.

## Estratégia
- Decora: A = P + PL
- Bens tangíveis × intangíveis
- Ativo circulante: até 12 meses
- Débito aumenta Ativo e Despesa; Crédito aumenta Passivo, PL, Receita
- Receita e Despesa NÃO são patrimônio (vão pro resultado)
$md$,
  $resumo$
## Resumo — Patrimônio e Contas

### Patrimônio = Bens + Direitos − Obrigações
- **Bens**: tangíveis (móveis/imóveis) e intangíveis (marcas)
- **Direitos**: a receber
- **Obrigações**: a pagar

### Equação Fundamental
**A = P + PL**

| Situação | Equação |
|---|---|
| Positiva | A > P |
| Equilíbrio | A = P (PL=0) |
| Negativa | A < P (passivo a descoberto) |

### Mecanismo Débito/Crédito
| | Aumenta | Diminui |
|---|---|---|
| Ativo | Débito | Crédito |
| Passivo | Crédito | Débito |
| PL | Crédito | Débito |
| Despesa | Débito | Crédito |
| Receita | Crédito | Débito |

### Subdivisões
- **Ativo Circulante**: até 12 meses
- **Ativo Não-Circulante**: Realizável LP, Investimentos, Imobilizado, Intangível
- **Passivo Circulante**: até 12 meses
- **Passivo Não-Circulante**: > 12 meses

### Plano de Contas (5 grupos)
1. Ativo / 2. Passivo / 3. PL / 4. Receitas / 5. Despesas

### Pegadinhas
- Receita NÃO é Ativo (é resultado)
- Despesa NÃO é Passivo (é resultado)
- Marcas/patentes = INTANGÍVEL (não imobilizado)
- Passivo aumenta por CRÉDITO (não débito)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ARQUIVOLOGIA — Princípios + Gestão de Documentos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'arquivologia',
  'Princípios Arquivísticos (proveniência, ordem original)',
  'Arquivologia — Princípios e Gestão',
  $md$
# Arquivologia: Princípios e Gestão de Documentos

Tema essencial pra PF Escrivão. Cobra **princípios arquivísticos**, **ciclo de vida**, **avaliação** e **tabela de temporalidade**.

## Conceito de Documento de Arquivo

> Informação registrada em qualquer suporte, **PRODUZIDA OU RECEBIDA** por pessoa física ou jurídica, **em decorrência do exercício de suas atividades**.

### Característica essencial
- Documento de arquivo é **ORGÂNICO** (produzido no contexto de uma atividade)
- ≠ Documento de biblioteca (geral, sem vínculo com atividade)

## Princípios Arquivísticos

### 1. Princípio da PROVENIÊNCIA (★ central)
> Documentos de uma mesma fonte/origem **NÃO devem ser MISTURADOS** com documentos de outras fontes.

- Conhecido como **respect des fonds**
- Mantém a vinculação entre o documento e seu PRODUTOR
- "Cada arquivo deve preservar sua origem"

### 2. Princípio da ORDEM ORIGINAL
> A ordem em que os documentos foram produzidos/acumulados pelo produtor deve ser **MANTIDA**.

- Reflete a forma como o produtor organizava
- NÃO reorganizar por tema ou alfabeto ao receber arquivo histórico

### 3. Princípio da UNICIDADE
- Cada documento tem natureza ÚNICA no conjunto onde está
- Não confundir com unicidade física (pode haver várias cópias)

### 4. Princípio da ORGANICIDADE
- Documentos refletem as ATIVIDADES e FUNÇÕES da entidade produtora
- O arquivo "espelha" a organização

### 5. Princípio da CUMULATIVIDADE
- Arquivos formam-se por ACUMULAÇÃO progressiva
- Não é colecionado (≠ biblioteca)

### 6. Princípio da INDIVISIBILIDADE
- Fundos arquivísticos não devem ser desmembrados
- Manter unidade do arquivo

## CICLO DE VIDA DOS DOCUMENTOS (Teoria das 3 Idades)

### Arquivo CORRENTE (Primeira Idade)
- Documentos em USO FREQUENTE pela administração
- Em vigor administrativo
- Permanecem no setor que os produziu
- Consultados pela própria entidade
- Exemplo: contratos vigentes, processos em andamento

### Arquivo INTERMEDIÁRIO (Segunda Idade)
- Uso pouco frequente
- Aguardam destinação final (eliminação ou recolhimento)
- Geralmente em local separado (depósito)
- Custos de armazenagem mais baixos
- Não consultados diariamente

### Arquivo PERMANENTE (Terceira Idade)
- Valor HISTÓRICO, científico, cultural
- Conservação DEFINITIVA
- Aberto a pesquisa pública
- NÃO pode ser eliminado

### Valor dos Documentos
- **Valor primário**: razão de criação (administrativo, fiscal, legal)
- **Valor secundário**: pra outros usos depois (probatório, informativo, histórico)

## GESTÃO DE DOCUMENTOS

### Lei 8.159/1991 — Lei dos Arquivos
> "Considera-se gestão de documentos o conjunto de procedimentos e operações técnicas referentes à sua **PRODUÇÃO, TRAMITAÇÃO, USO, AVALIAÇÃO E ARQUIVAMENTO** em fase corrente e intermediária."

### Atividades da Gestão (3 fases)

#### 1. Produção
- Como os documentos são criados
- Padronização de formulários
- Modelos institucionais

#### 2. Utilização (uso e tramitação)
- Como circulam
- Sistema de protocolo
- Recuperação

#### 3. Destinação
- Avaliação → temporalidade → eliminação ou guarda permanente

## CLASSIFICAÇÃO

### Métodos
- **Funcional**: por função da entidade (mais comum)
- **Estrutural**: por estrutura administrativa
- **Por assunto**: temático

### Plano de Classificação
- Ferramenta hierárquica
- Organiza documentos segundo critério da entidade

## TABELA DE TEMPORALIDADE

> Instrumento que define os **prazos de guarda** e a **destinação final** (eliminação ou recolhimento) dos documentos.

### Componentes
- Identificação da série
- Prazos de guarda em CORRENTE
- Prazos em INTERMEDIÁRIO
- Destinação final
- Observações

### Quem aprova
- **CONARQ** (Conselho Nacional de Arquivos) padroniza
- Cada órgão tem sua tabela aprovada pela autoridade arquivística

## AVALIAÇÃO

### Conceito
- Análise dos documentos pra determinar prazos de guarda e destinação

### Comissões
- **CPAD** — Comissão Permanente de Avaliação de Documentos
- Composição multidisciplinar (arquivista, jurista, técnicos da área)

## PRESERVAÇÃO E CONSERVAÇÃO

### Conservação
- Ações pra retardar degradação (controle de umidade, temperatura)

### Restauração
- Recuperar documento já danificado

### Preservação
- Conceito MAIS AMPLO: conservação + restauração + práticas

### Ambiente ideal
- Temperatura: 18-22°C
- Umidade: 50-60%
- Sem luz solar direta

## Como cai na banca

**Item 1 (CERTO):** "Conforme o princípio da proveniência, os documentos de uma fonte arquivística não devem ser misturados com documentos de outras fontes."

**Item 2 (ERRADO):** "Documentos do arquivo permanente podem ser eliminados após avaliação técnica."
> Errado: arquivo permanente NÃO É ELIMINADO — guarda DEFINITIVA.

**Item 3 (CERTO):** "A Lei 8.159/1991 define gestão de documentos como o conjunto de procedimentos referentes à produção, tramitação, uso, avaliação e arquivamento nas fases corrente e intermediária."

**Item 4 (ERRADO):** "O arquivo intermediário recebe os documentos que perderam totalmente seu valor administrativo e devem ser eliminados imediatamente."
> Errado: arquivo intermediário guarda documentos com USO POUCO FREQUENTE mas que aguardam destinação final (que pode ser permanente).

## Estratégia
- Princípios: PROVENIÊNCIA + ORDEM ORIGINAL (mais cobrados)
- 3 Idades: corrente / intermediário / permanente
- Arquivo permanente = NÃO ELIMINA (valor histórico)
- Tabela de temporalidade = prazos + destinação
- Lei 8.159/91: corrente e intermediária têm GESTÃO
$md$,
  $resumo$
## Resumo — Arquivologia

### Princípios Arquivísticos
1. **Proveniência** (★) — não misturar fontes
2. **Ordem Original** — mantém ordem do produtor
3. **Unicidade** — natureza única no conjunto
4. **Organicidade** — reflete atividades
5. **Cumulatividade** — acumulação progressiva
6. **Indivisibilidade** — não desmembra fundos

### Teoria das 3 Idades
- **Corrente** (1ª): uso frequente, no setor produtor
- **Intermediário** (2ª): pouco uso, aguarda destinação
- **Permanente** (3ª): valor histórico, **GUARDA DEFINITIVA**

### Valores
- **Primário**: razão de criação (admin, fiscal, legal)
- **Secundário**: probatório, informativo, histórico

### Lei 8.159/1991
Gestão de documentos = produção + tramitação + uso + avaliação + arquivamento nas fases **CORRENTE E INTERMEDIÁRIA**

### Classificação
- **Funcional** (por função)
- Estrutural (por órgão)
- Por assunto

### Tabela de Temporalidade
- Prazos de guarda + destinação final
- CONARQ padroniza

### Avaliação
- CPAD — Comissão Permanente de Avaliação de Documentos

### Preservação
- Temp: 18-22°C
- Umidade: 50-60%
- Sem luz direta

### Pegadinhas
- Permanente NÃO ELIMINA (guarda definitiva)
- Proveniência ≠ Ordem Original (princípios distintos)
- Intermediário = uso pouco frequente (NÃO eliminação)
- Documento de ARQUIVO é ORGÂNICO (vinculado à atividade)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PAPILOSCOPIA — Datiloscopia
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'papiloscopia',
  'Datiloscopia: classificação Vucetich, sistemas',
  'Datiloscopia e Sistema Vucetich',
  $md$
# Datiloscopia: Classificação Vucetich e Sistemas

Tema CRÍTICO pra PF Papiloscopista. Cobra **fundamentos da datiloscopia**, **sistema Vucetich**, **classificação dactilar**.

## Conceito

> **Datiloscopia** é o estudo das impressões digitais (papilas dos DEDOS DAS MÃOS), usado pra IDENTIFICAÇÃO HUMANA.

### Etimologia
- *Daktylos* (dedo) + *skopein* (examinar)

## Fundamentos da Identificação Papilar

### 1. UNICIDADE
- Cada pessoa tem desenho papilar ÚNICO
- Mesmo gêmeos univitelinos têm padrões diferentes

### 2. PERENIDADE (ou IMUTABILIDADE)
- O desenho papilar FORMA-SE no FETO (6º mês de gestação)
- PERMANECE INALTERADO durante toda a vida
- Persiste mesmo após a morte (até putrefação avançada)

### 3. CLASSIFICABILIDADE
- Permite ORGANIZAR sistematicamente em arquivos
- Base pra busca eficiente

### Mnemônico (memorize!)
**UPC** = **U**nicidade + **P**erenidade + **C**lassificabilidade

## Sistema VUCETICH (★ central)

Criado por **Juan Vucetich** (1891, Argentina). Adotado no Brasil e na maior parte da América Latina.

### Os 4 Tipos Fundamentais

#### 1. ARCO (A)
- NÃO TEM DELTA
- Desenho em forma de arco (linhas paralelas que sobem e descem)
- Símbolo: **A** (para dedo polegar) ou **1** (demais dedos)

#### 2. PRESILHA INTERNA (I)
- TEM UM DELTA À DIREITA do observador
- Linhas formam laço pra esquerda
- Símbolo: **I** (polegar) ou **2** (demais)

#### 3. PRESILHA EXTERNA (E)
- TEM UM DELTA À ESQUERDA
- Linhas formam laço pra direita
- Símbolo: **E** (polegar) ou **3** (demais)

#### 4. VERTICILO (V)
- TEM DOIS DELTAS (um à esquerda, outro à direita)
- Linhas formam espiral ou círculos
- Símbolo: **V** (polegar) ou **4** (demais)

### Mnemônico
**AIEV** — **A**rco, presilha **I**nterna, presilha **E**xterna, **V**erticilo

### Delta
- Ponto onde 3 sistemas de linhas convergem
- Pode ser BRANCO (espaço) ou NEGRO (linhas)
- Define a categoria

## Sistema Decadactilar

### Conceito
- Análise simultânea dos **10 DEDOS** (5 mão direita + 5 mão esquerda)
- Cada dedo recebe um símbolo
- Fórmula de classificação:
  - Numerador: mão direita (polegar, indicador, médio, anelar, mínimo)
  - Denominador: mão esquerda (mesma ordem)

### Exemplo
- A 1 1 2 3 / V 4 2 1 3
- Indica: polegar direito = Arco, indicador direito = Arco etc.

## Pontos Característicos

### Minúcias
- Detalhes únicos no desenho papilar
- Tipos:
  - **Ponto**
  - **Ilha**
  - **Bifurcação**
  - **Convergência**
  - **Fim de linha**
  - **Linha curta**
  - **Encerramento**

### Critério de Identidade
- No Brasil, mínimo de **12 pontos característicos coincidentes** em geral aceitos pra identificação positiva
- AFIS pode trabalhar com menos quando complementado por outras evidências

## AFIS (Automated Fingerprint Identification System)

### Conceito
- Sistema automatizado de comparação digital
- Banco de dados de impressões
- Comparação rápida com milhões de registros

### Sistema no Brasil
- INI (Instituto Nacional de Identificação) e estaduais
- Pacote anticrime amplia uso

## Impressões Latentes

### Conceito
- Impressões INVISÍVEis a olho nu no local de crime
- Reveladas por:
  - **Pós** (preto, branco, magnético)
  - **Vapores** (iodo, cianoacrilato)
  - **Reagentes químicos** (ninidrina, nitrato de prata)
  - **Luz UV**

### Tipos
- **Latente**: invisível, revelada por técnica
- **Visível**: à olho nu (com sangue, tinta, graxa)
- **Plástica**: relevo em material maleável (massa, cera)

## Como cai na banca

**Item 1 (CERTO):** "O sistema de classificação datiloscópica de Vucetich é fundado em quatro tipos fundamentais: arco, presilha interna, presilha externa e verticilo."

**Item 2 (ERRADO):** "O desenho papilar forma-se durante a infância e altera-se com o passar dos anos."
> Errado: forma-se no **6º mês de gestação** e é PERENE (não se altera).

**Item 3 (CERTO):** "A presilha externa apresenta um único delta localizado à esquerda do observador."

**Item 4 (ERRADO):** "O verticilo apresenta um único delta, semelhante à presilha interna."
> Errado: verticilo tem **DOIS deltas** (um de cada lado).

## Estratégia
- Princípios da papiloscopia: **UPC** (Unicidade, Perenidade, Classificabilidade)
- Tipos Vucetich: **AIEV** (Arco, Presilha Interna, Externa, Verticilo)
- ARCO: sem delta
- PRESILHA INTERNA: 1 delta à DIREITA
- PRESILHA EXTERNA: 1 delta à ESQUERDA
- VERTICILO: 2 deltas
- Desenho forma-se no **6º MÊS** de gestação
- 12 pontos característicos = critério Brasil
$md$,
  $resumo$
## Resumo — Datiloscopia

### Fundamentos (UPC)
- **U**nicidade — único pra cada pessoa
- **P**erenidade — formado no **6º mês de gestação**, INALTERÁVEL
- **C**lassificabilidade — permite sistematização

### Sistema VUCETICH (AIEV)
| Tipo | Delta | Sinal |
|---|---|---|
| **A**rco | **0** deltas | Linhas paralelas |
| Presilha **I**nterna | 1 delta à **DIREITA** | Laço pra esquerda |
| Presilha **E**xterna | 1 delta à **ESQUERDA** | Laço pra direita |
| **V**erticilo | **2** deltas | Espiral |

### Sistema Decadactilar
- 10 dedos (5 direita + 5 esquerda)
- Fórmula: numerador = direita / denominador = esquerda

### Pontos Característicos (Minúcias)
- Ponto, ilha, bifurcação, convergência, fim de linha, linha curta, encerramento
- Critério Brasil: **12 pontos coincidentes** (regra geral)

### Impressões em Locais
- **Latente**: invisível (revelada por pós, vapor, reagente, UV)
- **Visível**: à olho nu (sangue, tinta, graxa)
- **Plástica**: relevo em material maleável

### AFIS
- Sistema automatizado de comparação digital
- Banco de dados nacionais (INI e estaduais)

### Pegadinhas
- Forma-se no 6º mês de GESTAÇÃO (NÃO infância)
- Verticilo: **2 deltas** (NÃO 1)
- Presilha INTERNA: delta à **DIREITA** do observador
- 4 tipos básicos = AIEV
- Arco NÃO TEM delta
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação
-- ──────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_materiais_ai FROM "materials" WHERE origin = 'ai';

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
