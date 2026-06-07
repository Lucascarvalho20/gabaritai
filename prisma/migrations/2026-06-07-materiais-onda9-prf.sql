-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 9 — PRF (Cebraspe específicos)
-- Data: 2026-06-07
--
-- 5 materiais densos (DRAFT — aguarda revisão admin):
--  - Leg. Trânsito: CTB I (SNT + Regras), CTB II (CNH + Infrações), CTB III (Crimes)
--  - Ética e Cidadania
--  - Geopolítica (Atualidades Brasil/Mundo)
--
-- Cria 5 topics novos. IDEMPOTENTE. Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-transito';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, weight, "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'CTB I — SNT, Regras de Circulação e Sinalização', 1.5, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'CTB I — SNT, Regras de Circulação e Sinalização');

    INSERT INTO "topics" (id, "subjectId", name, weight, "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'CTB II — CNH, Infrações e Penalidades', 1.5, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'CTB II — CNH, Infrações e Penalidades');

    INSERT INTO "topics" (id, "subjectId", name, weight, "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'CTB III — Crimes de Trânsito', 1.4, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'CTB III — Crimes de Trânsito');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'etica-cidadania';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, weight, "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Ética no Serviço Público e Cidadania', 1.2, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Ética no Serviço Público e Cidadania');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'geopolitica';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, weight, "createdAt", "updatedAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Geopolítica — Brasil e Conjuntura Internacional', 1.2, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Geopolítica — Brasil e Conjuntura Internacional');
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

-- ┌─ 1. CTB I — SNT + Regras + Sinalização ──────────────────────────────────┐
SELECT upsert_material(
  'legislacao-transito',
  'CTB I — SNT, Regras de Circulação e Sinalização',
  'CTB Parte I — SNT, Regras de Circulação e Sinalização',
$content$
# CTB Parte I — SNT, Regras de Circulação e Sinalização

O Código de Trânsito Brasileiro (Lei 9.503/97) é **a matéria mais cobrada na PRF**. Cebraspe ama detalhes: prazos, competências, exceções.

## 1. Sistema Nacional de Trânsito (SNT)

### 1.1. Definição e Princípios (CTB arts. 1º-4º)

Trânsito é o uso das vias por pessoas, veículos e animais. Trânsito **em condições seguras é direito de todos e dever dos órgãos do SNT** (art. 1º §2º).

Princípios:
- Defesa da vida (inclusive preservação da saúde e do meio ambiente).
- Compromisso com educação para o trânsito.
- Engenharia de tráfego.

### 1.2. Órgãos do SNT (art. 7º)

- **CONTRAN** — Conselho Nacional de Trânsito (órgão máximo normativo/consultivo).
- **CETRAN/CONTRANDIFE** — Estaduais e do DF.
- **DENATRAN** — atualmente **SENATRAN** (executivo federal — vinculado ao Ministério dos Transportes).
- **DETRAN** — executivos estaduais.
- **PRF** — executiva federal de polícia rodoviária.
- **Polícia Militar dos Estados/DF** — competência de Trânsito (delegada por convênio).
- **JARI** — Juntas Administrativas de Recursos de Infrações.

### 1.3. Competências essenciais

- **PRF** (CTB 20): rodovias **FEDERAIS** — patrulhamento, fiscalização, autuação.
- **DNIT**: engenharia de rodovias federais.
- **Polícia Rodoviária Estadual**: rodovias estaduais.
- **PM** (CTB 23 III): polícia ostensiva em vias urbanas/rurais municipais e estaduais não rodoviárias.

> ⚠️ Pegadinha clássica: "PRF pode autuar em via municipal" → **ERRADO**. Só em rodovias FEDERAIS.

## 2. Veículos (CTB 96-139)

### 2.1. Classificação

- **Quanto à tração**: automotor, elétrico, propulsão humana, tracionado por animal, reboque/semirreboque.
- **Quanto à espécie**: passageiros, carga, misto, competição, tração, especial, coleção.
- **Quanto à categoria** (art. 135):
  - Oficial (governo).
  - De representação diplomática.
  - Particular.
  - De aluguel.
  - De aprendizagem (auto-escolas).

### 2.2. Equipamentos obrigatórios

Cinto de segurança, encosto, espelhos retrovisores, faróis, lanternas, freios, pneus em bom estado, triângulo, extintor (atualmente FACULTATIVO em veículos de passeio — Resolução CONTRAN 556/15).

### 2.3. Registro e Licenciamento

- Registro: vinculado ao Município/UF.
- Licenciamento: anual; obrigatório para circular.
- Transferência: 30 dias após mudança de proprietário (art. 123).

## 3. Habilitação (CTB 140-160)

Categorias:
- **A**: motocicletas.
- **B**: automóveis até 3.500kg e 8+1 lugares.
- **C**: veículos de carga acima de 3.500kg.
- **D**: ônibus/transporte coletivo acima de 8 lugares.
- **E**: combinação acima de 6.000kg.

Requisitos básicos (art. 140):
- Penalmente imputável.
- Saber ler e escrever.
- CPF.
- Exame de aptidão física e mental.
- Curso teórico e prático + exames.

## 4. Regras de Circulação (CTB 26-67)

### 4.1. Regra de ouro

- Conduzir com **atenção e cuidados indispensáveis à segurança** (art. 28).
- Manter veículo em condições de circular.
- Possuir documentação.

### 4.2. Velocidade (CTB 61)

Onde não houver sinalização:
- Vias urbanas: trânsito rápido 80 km/h, arteriais 60, coletoras 40, locais 30.
- Vias rurais: rodovias 110/90 (carros), 90 (demais), 80 (carga).
- Estradas: 60.

Tolerância de até 7% acima do limite — princípio do livre fluxo (mas isso vem de circular interna; PRF usa o medidor já com a tolerância aplicada).

### 4.3. Faixas e ultrapassagem

- Veículos mais lentos pela direita; mais rápidos pela esquerda.
- Ultrapassagem pela esquerda. Exceção: veículo girando à esquerda → ultrapassar pela direita.
- Proibida: faixa contínua amarela, no acostamento, em curvas/aclives/declives sem visibilidade, sobre faixa de pedestres, em ponte/viaduto.

### 4.4. Preferência

- Veículos sobre trilhos.
- Quem vem pela direita (regra geral).
- Em rotatória: regra **mudou** — quem está na rotatória tem preferência (Lei 13.281/16).
- Pedestres em faixa.

## 5. Sinalização (CTB 80-90)

### 5.1. Tipos

- **Vertical**: placas.
- **Horizontal**: pintura no pavimento.
- **Semafórica**: luminosa.
- **Sinais de apito**: agentes.
- **Dispositivos auxiliares**: cones, tachões.

### 5.2. Hierarquia (art. 89)

Em caso de conflito: **agente > sinalização vertical > sinalização horizontal**.

### 5.3. Placas

- **Regulamentação** (R-XX, vermelhas/octógonos): "PARE", limite velocidade, "Sentido proibido".
- **Advertência** (A-XX, amarelas, losangos): curva, cruzamento.
- **Indicação** (I-XX, verdes/marrons/azuis): nomes de cidades, atrações, hospital.

## 6. Veículos prioritários (CTB 29 VII)

- Bombeiros, polícia, ambulâncias, SAMU, defesa civil.
- Identificação: luz vermelha intermitente + sirene.
- Devem reduzir e parar APENAS quando realmente em serviço urgente.
- Demais condutores devem facilitar passagem.

## 7. Como Cebraspe cobra

- **C/E**: "Compete à PRF fiscalizar trânsito em rodovias estaduais" → **ERRADO** (só federais).
- **C/E**: "O CONTRAN é órgão executor" → **ERRADO** (normativo e consultivo; executor é SENATRAN/DETRAN/PRF).
- **C/E ultrapassagem**: "É permitida ultrapassagem em ponte se a visibilidade for boa" → **ERRADO** (sempre vedada).
- **C/E rotatória**: "Quem entra na rotatória tem preferência" → **ERRADO** (após Lei 13.281/16, quem ESTÁ tem preferência).
- **C/E hierarquia**: "Em conflito, vale a placa sobre o agente" → **ERRADO** (agente > vertical > horizontal).
- **C/E extintor**: "Extintor é obrigatório em veículos de passeio" → **ERRADO** (facultativo desde 2015).
$content$,
$resumo$
# Resumo Estratégico — CTB Parte I

## SNT — Órgãos

| Órgão | Função |
|---|---|
| CONTRAN | Normativo (máximo) |
| CETRAN/CONTRANDIFE | Estadual/DF normativo |
| SENATRAN (ex-DENATRAN) | Executivo federal |
| DETRAN | Executivo estadual |
| PRF | Polícia rodoviária federal — RODOVIAS FEDERAIS |
| PM | Vias urbanas/rurais (não-rodoviárias) |
| JARI | Recursos de infrações |

⚠️ PRF SÓ FEDERAIS.

## Veículos

- Categorias: oficial, diplomático, particular, aluguel, aprendizagem.
- Equipamentos obrigatórios: cinto, retrovisores, faróis, freios, pneus, triângulo (NÃO extintor para passeio).

## CNH

- A (moto), B (auto até 3500kg), C (carga >3500kg), D (ônibus >8 lugares), E (combinação >6000kg).
- Requisitos: penal imputável, alfabetizado, CPF, aptidão, curso+exames.

## Velocidades urbanas (sem placa)

| Via | Velocidade |
|---|---|
| Trânsito rápido | 80 km/h |
| Arterial | 60 |
| Coletora | 40 |
| Local | 30 |

## Sinalização — Hierarquia

**Agente > Vertical > Horizontal**

## Preferências

- Quem vem da direita (regra geral).
- **Rotatória**: quem ESTÁ tem preferência (Lei 13.281/16).
- Pedestre na faixa, veículos sobre trilhos, prioritários em serviço.

## Top pegadinhas Cebraspe

1. PRF NÃO atua em rodovia estadual.
2. CONTRAN é normativo, não executor.
3. Rotatória: PREFERÊNCIA DE QUEM ESTÁ NELA.
4. Hierarquia: AGENTE manda.
5. Extintor: facultativo (passeio).
6. Ultrapassagem em ponte/viaduto: SEMPRE vedada.
$resumo$
);

-- ┌─ 2. CTB II — CNH + Infrações + Penalidades ──────────────────────────────┐
SELECT upsert_material(
  'legislacao-transito',
  'CTB II — CNH, Infrações e Penalidades',
  'CTB Parte II — CNH, Infrações e Penalidades',
$content$
# CTB Parte II — CNH, Infrações e Penalidades

Parte mais "decoreba" — Cebraspe cobra **tabela de infrações + pontos + valores**. Domínio aqui é diferencial.

## 1. CNH — Procedimentos (CTB 141-160)

### 1.1. Permissão para Dirigir

- Após aprovação no exame, candidato recebe **Permissão para Dirigir** com validade de 1 ano.
- Durante este período:
  - **Não pode cometer NENHUMA infração grave/gravíssima**.
  - Não pode ser reincidente em média.
- Se cumprido o período sem infração: **CNH definitiva**.

### 1.2. Renovação

- Periodicidade (Lei 14.071/20 — vigor 12/04/2021):
  - **10 anos**: condutores até 50 anos.
  - **5 anos**: 50 a 70 anos.
  - **3 anos**: acima de 70 anos.

### 1.3. Suspensão e cassação

- **Suspensão do direito de dirigir**:
  - Por **atingir 20+ pontos** (varia conforme tipo de infração — Lei 14.071/20).
  - Por reincidência específica.
  - Por sentença judicial em crime de trânsito.
- **Cassação**:
  - Dirigir suspenso.
  - Reincidência em conduta que enseja suspensão em 12 meses.
  - Condenação por crime de trânsito específico.

### 1.4. Pontos (após Lei 14.071/20)

| Sem infração gravíssima | 40 pontos |
| 1 gravíssima | 30 pontos |
| 2+ gravíssimas | 20 pontos |

Conta: 12 meses anteriores.

## 2. Infrações de Trânsito (CTB 161-255)

### 2.1. Natureza

- **Leve**: 3 pontos.
- **Média**: 4 pontos.
- **Grave**: 5 pontos.
- **Gravíssima**: 7 pontos (algumas com multiplicador 3x, 5x, 10x).

### 2.2. Valores (atualizados):
- Leve: R$ 88,38.
- Média: R$ 130,16.
- Grave: R$ 195,23.
- Gravíssima: R$ 293,47 (× multiplicador quando aplicável).

### 2.3. Multiplicadores na gravíssima

- **3x** (R$ 880,41): excesso de velocidade > 50% acima do limite (zera CNH se for vez na permissão).
- **5x** (R$ 1.467,35): dirigir embriagado (sem teste, mas com sinais), recusa ao etilômetro/exame.
- **10x** (R$ 2.934,70): trafegar embriagado **comprovado** (etilômetro ≥ 0,33 mg/L OU exame de sangue ≥ 6 dg/L).

### 2.4. Embriaguez (art. 165)

- Conduzir sob efeito de álcool/substância → gravíssima + multiplicador 10x (com prova).
- Recusa ao teste do etilômetro = mesma penalidade (art. 165-A).
- Penalidades cumulativas: multa + suspensão de 12 meses do direito.

### 2.5. Excesso de velocidade (art. 218)

| Faixa acima do limite | Penalidade |
|---|---|
| Até 20% | Multa MÉDIA + 4 pontos |
| 20% a 50% | Multa GRAVE + 5 pontos |
| Acima de 50% | Multa GRAVÍSSIMA (3x) + 7 pontos + suspensão imediata |

### 2.6. Infrações gravíssimas mais cobradas

- Embriaguez (art. 165).
- Excesso 50%+ (art. 218 III).
- Racha (art. 173).
- Atropelar pedestre em faixa (art. 215).
- Avançar sinal vermelho (art. 208).
- Dirigir com CNH suspensa/cassada (art. 162 II).
- Pilotar veículo sem CNH ou Permissão (art. 162 I).

## 3. Penalidades (CTB 256-268)

### 3.1. Lista

- Advertência por escrito.
- Multa.
- Suspensão do direito de dirigir.
- Apreensão do veículo (em desuso — substituída por remoção).
- Cassação da CNH.
- Cassação da Permissão para Dirigir.
- Frequência obrigatória em curso de reciclagem.

### 3.2. Medidas administrativas

- Retenção do veículo.
- Remoção do veículo.
- Recolhimento da CNH.
- Recolhimento do CRLV.
- Transbordo do excesso de carga.
- Realização de teste de dosagem alcoólica.

## 4. Processo Administrativo (CTB 280-291)

### 4.1. Lavratura do auto

Auto de Infração de Trânsito (AIT) com:
- Tipificação.
- Local, data, hora.
- Caracterização do infrator.
- Identificação do agente.

### 4.2. Notificação

- Notificação da autuação: **até 30 dias** após constatação. ⚠️ Cuidado: notificação da autuação ≠ notificação da penalidade.
- Notificação da penalidade: após apresentação de defesa ou esgotado prazo.

### 4.3. Defesa e Recursos

- **Defesa prévia** (art. 281): à autoridade que lavrou o AIT.
- **Recurso à JARI** (1ª instância): contra penalidade imposta.
- **Recurso ao CETRAN/CONTRAN** (2ª instância): em caso de manutenção.

### 4.4. Identificação do condutor

Se a infração é por condutor (não pelo veículo), a empresa/proprietário deve indicar o condutor responsável em **15 dias** (art. 257 §7º). Não indicar = principal responsável arca.

## 5. Suspensão e Cassação — Detalhe (Lei 14.071/20)

### 5.1. Suspensão (art. 261)

Aplica-se a:
- Acúmulo de 20/30/40 pontos.
- Cometimento de infração com penalidade autônoma de suspensão (embriaguez, racha, excesso > 50%).
- Reincidência em 12 meses em conduta específica.

Prazos: de 6 meses a 1 ano (regra); até 2 anos em reincidência.

### 5.2. Cassação (art. 263)

- Reincidência em conduta sancionada com suspensão dentro de 12 meses.
- Dirigir com CNH suspensa.
- Condenação por crime de trânsito.

Após cassação: novo processo de habilitação (após 2 anos).

## 6. Como Cebraspe cobra

- **C/E pontos**: "Atinge-se a suspensão somente com 30 pontos" → **ERRADO** (depende do número de gravíssimas — pode ser 20).
- **C/E embriaguez**: "A recusa ao etilômetro afasta a multa por embriaguez" → **ERRADO** (mesma penalidade — multiplicador 5x).
- **C/E velocidade**: "Excesso de 30% acima do limite é gravíssima" → **ERRADO** (grave).
- **C/E renovação**: "CNH é renovada a cada 5 anos para qualquer idade" → **ERRADO** (10/5/3 conforme idade).
- **C/E notificação**: "O prazo para notificar a autuação é de 60 dias" → **ERRADO** (30 dias).
- **C/E suspenso dirigindo**: "Dirigir com CNH suspensa é multa grave" → **ERRADO** (gravíssima + cassação).
$content$,
$resumo$
# Resumo Estratégico — CTB II

## CNH

- **Permissão**: 1 ano — não pode infração grave/gravíssima.
- **Renovação** (Lei 14.071/20): 10 anos (até 50), 5 anos (50-70), 3 anos (acima 70).

## Pontuação

| Sem gravíssima | 40 |
| 1 gravíssima | 30 |
| 2+ gravíssimas | 20 |

## Naturezas e valores

| Natureza | Pontos | Valor |
|---|---|---|
| Leve | 3 | R$ 88 |
| Média | 4 | R$ 130 |
| Grave | 5 | R$ 195 |
| Gravíssima | 7 | R$ 293 (× multiplicador) |

## Multiplicadores

- **3x**: excesso > 50%.
- **5x**: sinais de embriaguez + recusa.
- **10x**: embriaguez comprovada (etilômetro ≥ 0,33).

## Excesso velocidade

| Faixa | Natureza |
|---|---|
| Até 20% | MÉDIA |
| 20-50% | GRAVE |
| > 50% | GRAVÍSSIMA + 3x + suspensão |

## Notificações

- Autuação: 30 dias (caduca se exceder).
- Identificar condutor: 15 dias.

## Top pegadinhas Cebraspe

1. Suspensão: 20-30-40 conforme gravíssimas.
2. Recusa ao etilômetro = multiplicador 5x.
3. Renovação variável por idade.
4. Excesso 30% = GRAVE (não gravíssima).
5. Dirigir suspenso = GRAVÍSSIMA + cassação.
6. PRF lavra AIT em rodovia federal.
$resumo$
);

-- ┌─ 3. CTB III — Crimes de Trânsito ────────────────────────────────────────┐
SELECT upsert_material(
  'legislacao-transito',
  'CTB III — Crimes de Trânsito',
  'CTB Parte III — Crimes de Trânsito',
$content$
# CTB Parte III — Crimes de Trânsito

CRIMES de trânsito (CTB 291-312-B) — diferente das INFRAÇÕES administrativas. Penal puro. Cebraspe gosta de testar diferença entre os dois.

## 1. Disposições Gerais (CTB 291-296)

### 1.1. Aplicação subsidiária do CP

CTB tem normas próprias; subsidiariamente aplica-se o CP e a Lei 9.099/95 (JECrim).

### 1.2. Crimes culposos e dolosos

Em regra, crimes de trânsito são **culposos** (CTB 302, 303). Há exceções dolosas — racha (308), embriaguez (306), por exemplo.

### 1.3. Causa de aumento (art. 298)

- Sob influência de álcool.
- Sem CNH/Permissão.
- Em faixa de pedestres ou na calçada.
- Deixar de prestar socorro à vítima.
- No exercício de profissão que envolva transporte.

## 2. Crimes em Espécie

### 2.1. Homicídio culposo (art. 302)

- Pena: detenção 2 a 4 anos + suspensão/proibição CNH.
- **Causa de aumento de 1/3 a 1/2** se:
  - Sem CNH.
  - Em faixa de pedestres / calçada.
  - Não prestar socorro.
  - Profissional de transporte.
- §3º (qualificadora): se causado por **embriaguez** → 5 a 8 anos + suspensão CNH. Crime **doloso** (recente STJ).

### 2.2. Lesão corporal culposa (art. 303)

- Pena: detenção 6 meses a 2 anos + suspensão.
- Mesmas causas de aumento do 302.
- §1º: embriaguez aumenta de 1/3 a 1/2.

### 2.3. Omissão de socorro (art. 304)

- Deixar o condutor envolvido em acidente de prestar socorro.
- Pena: detenção 6 meses a 1 ano OU multa.

### 2.4. Fuga de local (art. 305)

- Afastar-se sem prestar identificação.
- Pena: detenção 6 meses a 1 ano OU multa.
- **STF (RE 971.959)**: declarou constitucional — afastando alegação de violação à não-autoincriminação.

### 2.5. Embriaguez ao volante (art. 306)

- Conduzir veículo sob influência de álcool/substância **com concentração igual ou superior** a 0,3 mg/L ou 6 dg/L de sangue.
- Pena: detenção 6 meses a 3 anos + multa + suspensão CNH.
- **Crime de perigo abstrato**: dispensa demonstração de risco concreto.
- §3º: prova por testemunha, vídeo, exame clínico — não exclusivamente etilômetro/sangue.

### 2.6. Violar suspensão (art. 307)

- Dirigir veículo com CNH suspensa ou proibida.
- Pena: detenção 6 meses a 1 ano + multa.

### 2.7. Racha (art. 308) — Lei 12.971/14

- Promover ou participar de competição automobilística em via.
- Pena: detenção 6 meses a 3 anos + multa + suspensão.
- §1º: se resulta lesão grave: reclusão 3 a 6 anos + multa.
- §2º: se resulta morte: reclusão 5 a 10 anos + multa.

### 2.8. Direção perigosa em alta velocidade (art. 309)

- Dirigir sem habilitação gerando perigo de dano.
- Pena: detenção 6 meses a 1 ano + multa.

### 2.9. Confiar veículo a pessoa não habilitada (art. 310)

- Pena: detenção 6 meses a 1 ano + multa.

### 2.10. Transitar em velocidade incompatível em escolas, hospitais (art. 311)

- Pena: detenção 6 meses a 1 ano + multa.

### 2.11. Crime de comércio irregular de placa (art. 312-A)

## 3. Particularidades importantes

### 3.1. Embriaguez x Homicídio Culposo qualificado

Após a Lei 13.546/17:
- Homicídio culposo cometido por condutor embriagado: §3º do 302 → 5 a 8 anos.
- STJ (HC 644.519/RS — 2022): se houver dolo eventual = homicídio doloso (art. 121 CP). Análise do caso concreto.

### 3.2. Suspensão judicial vs administrativa

- Administrativa: pela autoridade de trânsito.
- Judicial: como pena (CTB 292-294) + pelo juízo criminal.

### 3.3. Investigação

PRF lavra Auto de Prisão em Flagrante por embriaguez no momento da abordagem. PF/PCDF/PM podem também.

## 4. Como Cebraspe cobra

- **C/E homicídio**: "Homicídio em trânsito é sempre doloso" → **ERRADO** (regra: culposo).
- **C/E embriaguez**: "Embriaguez ao volante exige prova de risco concreto" → **ERRADO** (perigo abstrato).
- **C/E recusa**: "Recusa ao etilômetro impede caracterizar o crime de embriaguez" → **ERRADO** (prova por outros meios — §3º art. 306).
- **C/E fuga**: "Fugir do local do acidente viola o direito à não-autoincriminação" → **ERRADO** (STF decidiu constitucional).
- **C/E racha**: "Racha é crime de perigo concreto" → **ERRADO** (abstrato).
- **C/E omissão**: "Omitir socorro é crime culposo independente" → **CUIDADO** (é causa de aumento ou crime autônomo se condutor envolvido).
$content$,
$resumo$
# Resumo Estratégico — CTB III (Crimes)

## Regra geral

Crimes do CTB = **CULPOSOS** salvo embriaguez (306), racha (308), homicídio §3º (com embriaguez).

## Crimes principais

| Art. | Crime | Pena |
|---|---|---|
| 302 | Homicídio culposo | 2-4 anos detenção |
| 302 §3 | Homicídio + embriaguez | 5-8 anos |
| 303 | Lesão culposa | 6m-2a det |
| 304 | Omissão de socorro | 6m-1a OU multa |
| 305 | Fuga do local | 6m-1a (STF: constitucional) |
| 306 | Embriaguez ≥ 0,3 mg/L | 6m-3a |
| 307 | Violar suspensão | 6m-1a |
| 308 | Racha | 6m-3a (+ 3-6a se lesão, 5-10a se morte) |
| 309 | Dirigir sem hab. + perigo | 6m-1a |
| 310 | Confiar a não habilitado | 6m-1a |

## Causas de aumento (art. 298)

Sem CNH, em faixa/calçada, álcool, não prestar socorro, profissional de transporte.

## Crime de perigo

- **Embriaguez (306)**: ABSTRATO.
- **Racha (308)**: ABSTRATO.

## Prova de embriaguez (§3º 306)

NÃO exige etilômetro — testemunhas, vídeo, exame clínico bastam.

## Top pegadinhas Cebraspe

1. Crimes trânsito são CULPOSOS (regra).
2. Embriaguez = perigo abstrato.
3. Fuga do local é constitucional (STF).
4. Homicídio + embriaguez = 5-8 anos.
5. Recusa não impede caracterizar embriaguez.
$resumo$
);

-- ┌─ 4. ÉTICA NO SERVIÇO PÚBLICO ────────────────────────────────────────────┐
SELECT upsert_material(
  'etica-cidadania',
  'Ética no Serviço Público e Cidadania',
  'Ética no Serviço Público e Cidadania',
$content$
# Ética no Serviço Público e Cidadania

Conteúdo presente em todo edital Cebraspe. Foco: **Decreto 1.171/94 (Código de Ética do Servidor Civil)** + **Lei 8.112/90** + princípios constitucionais.

## 1. Princípios da Administração Pública (CF 37)

**LIMPE**:
- **L**egalidade.
- **I**mpessoalidade.
- **M**oralidade.
- **P**ublicidade.
- **E**ficiência (EC 19/98).

Implícitos: razoabilidade, proporcionalidade, motivação, segurança jurídica, supremacia do interesse público, indisponibilidade do interesse público.

## 2. Ética x Moral x Direito

- **Ética**: estudo filosófico dos valores morais.
- **Moral**: regras de comportamento em sociedade.
- **Direito**: regras jurídicas estatais.

A ética no serviço público é o **conjunto de valores que regem a conduta do servidor**, fundamentado em princípios constitucionais.

## 3. Decreto 1.171/94 — Código de Ética dos Servidores do Executivo Federal

### 3.1. Princípios fundamentais (Capítulo I)

- **A dignidade, decoro, zelo, eficácia e consciência dos princípios morais** são primados maiores que devem nortear o servidor.
- A função pública deve ser tida como **exercício profissional**.
- O servidor não pode omitir-se da verdade.
- A moralidade administrativa é elemento da legalidade pública.
- O equilíbrio entre legalidade e finalidade na conduta do servidor é o que se chama de **moralidade pública**.

### 3.2. Deveres fundamentais (Seção II)

- Desempenhar com zelo e probidade.
- Ser probo, reto, leal, justo.
- Jamais retardar prestação de contas.
- Tratar cuidadosamente os usuários.
- Resistir a pressões superiores hierárquicos que visem cometer ilegalidade.
- Comunicar imediatamente a seus superiores ato/fato contrário ao interesse público.

### 3.3. Vedações (Seção III)

- Usar cargo para satisfazer interesse pessoal.
- Pleitear vantagem usando influência do cargo.
- Deixar de atender ao público com presteza.
- Permitir formação de longas filas ou aguardar trâmites excessivos.
- Desviar servidor para atender particulares.
- Apresentar-se embriagado.
- Dar opinião sobre processo pendente sem necessidade.

### 3.4. Comissões de Ética

- Toda instituição pública federal deve ter Comissão de Ética.
- Atribuições: orientar, deliberar, aplicar penalidade de **censura ética**.
- Sanção da Comissão: **censura ética** (autônoma — independente das demais).

## 4. Estatuto do Servidor (Lei 8.112/90 — disciplina)

### 4.1. Regime jurídico

Aplica-se a servidores **estatutários** civis da União, autarquias e fundações públicas federais.

### 4.2. Deveres (art. 116)

- Exercer com zelo e dedicação as atribuições.
- Ser leal às instituições.
- Observar normas legais e regulamentares.
- Cumprir ordens superiores **salvo manifestamente ilegais**.
- Atender com presteza ao público.
- Levar ao conhecimento da autoridade superior irregularidades de que tenha ciência.
- Zelar pela economia do material e conservação do patrimônio público.
- Guardar sigilo sobre assuntos da repartição.
- Manter conduta compatível.
- Ser assíduo e pontual.
- Tratar com urbanidade.
- Representar contra ilegalidade, omissão ou abuso de poder.

### 4.3. Proibições (art. 117)

- Ausentar-se sem prévia autorização.
- Retirar documento sem permissão.
- Recusar fé a documentos públicos.
- Opor resistência ao andamento.
- Promover manifestação de apreço/desapreço.
- Cometer a outro servidor atribuições suas.
- Coagir/aliciar subordinados a partido político.
- Manter conduta incompatível com moralidade.
- Receber propinas, comissões, presentes.
- Aceitar comissão estrangeira sem autorização.
- Praticar usura.
- Exercer comércio (salvo como acionista, cotista).
- Atuar como procurador junto à administração.

### 4.4. Responsabilidades (art. 121-126)

Servidor responde:
- **Civilmente**: indenização (regresso após pagamento pelo Estado).
- **Penalmente**: crime/contravenção.
- **Administrativamente**: descumprimento de deveres funcionais.

As 3 instâncias são INDEPENDENTES (art. 125), salvo:
- Absolvição criminal por inexistência do fato ou negativa de autoria → AFASTA admin/civil.

### 4.5. Penalidades disciplinares (art. 127)

1. Advertência.
2. Suspensão (até 90 dias).
3. Demissão.
4. Cassação de aposentadoria.
5. Destituição de cargo em comissão.
6. Destituição de função comissionada.

### 4.6. Demissão (art. 132)

- Crime contra Administração Pública.
- Abandono de cargo (30+ dias contínuos).
- Inassiduidade habitual (60 dias intercalados em 12 meses).
- Improbidade.
- Insubordinação grave.
- Ofensa física.
- Aplicação irregular de dinheiros públicos.
- Revelação de segredo.
- Lesão aos cofres públicos.
- Corrupção.
- Acumulação ilegal de cargos.
- Transgressão dos incisos IX a XVI do art. 117.

## 5. Cidadania

### 5.1. Conceito

Conjunto de direitos e deveres do indivíduo perante a sociedade e o Estado.

### 5.2. Dimensões (T.H. Marshall)

- **Civis**: liberdade, igualdade, propriedade.
- **Políticos**: votar, ser votado.
- **Sociais**: educação, saúde, trabalho.

### 5.3. Direitos do cidadão x deveres

Direitos não vêm desacompanhados de deveres: pagar impostos, votar (obrigatório 18-70), respeitar leis, defender pátria, preservar meio ambiente.

### 5.4. Participação democrática

Plebiscito, referendo, iniciativa popular (CF 14).

## 6. Como Cebraspe cobra

- **C/E**: "A Comissão de Ética pode aplicar suspensão até 90 dias" → **ERRADO** (apenas censura ética; suspensão é admin pela Lei 8.112).
- **C/E**: "As instâncias civil, penal e administrativa são interdependentes" → **ERRADO** (são INDEPENDENTES, salvo absolvição por inexistência do fato ou negativa de autoria).
- **C/E**: "O servidor deve cumprir TODA ordem do superior" → **ERRADO** (salvo manifestamente ilegais).
- **C/E**: "Ética e moral são sinônimos" → **ERRADO** (ética estuda; moral é o comportamento prático).
- **C/E demissão**: "Acumulação ilegal de cargos enseja apenas suspensão" → **ERRADO** (demissão — art. 132).
$content$,
$resumo$
# Resumo Estratégico — Ética e Cidadania

## CF 37 — LIMPE

**L**egalidade, **I**mpessoalidade, **M**oralidade, **P**ublicidade, **E**ficiência.

## Decreto 1.171/94

- Aplica-se a servidores Executivo federal.
- Comissão de Ética: aplica **CENSURA ÉTICA** (autônoma).
- Vedações: usar cargo p/ interesse pessoal, atender com má vontade, embriaguez.

## Lei 8.112/90

### Deveres (116)
Zelo, lealdade, presteza, conduta compatível, sigilo, urbanidade, representação contra ilegalidade.

### Proibições (117)
Recusar fé a documento, propinas, usura, comércio (salvo acionista), procurador junto à Adm.

### Responsabilidades (121-125)
Civil + Penal + Administrativa — **INDEPENDENTES** salvo absolvição criminal por inexistência ou negativa autoria.

### Penalidades (127)
1. Advertência | 2. Suspensão (até 90d) | 3. Demissão | 4. Cassação aposentadoria | 5/6. Destituição.

### Demissão (132)
- Crime contra Adm.
- Abandono cargo (30+ dias).
- Inassiduidade (60d em 12m).
- Improbidade.
- Corrupção, acumulação ilegal.

## Cidadania (Marshall)

- Civis: liberdade, igualdade.
- Políticos: votar, ser votado.
- Sociais: educação, saúde.

## Top pegadinhas Cebraspe

1. Comissão Ética aplica **CENSURA ÉTICA** (não suspensão).
2. Instâncias INDEPENDENTES (regra).
3. Ordem manifestamente ilegal NÃO deve ser cumprida.
4. Acumulação ilegal = DEMISSÃO.
5. Inassiduidade = 60 dias INTERCALADOS em 12 meses.
6. Abandono = 30 dias CONTÍNUOS.
$resumo$
);

-- ┌─ 5. GEOPOLÍTICA — Brasil e Conjuntura Internacional ─────────────────────┐
SELECT upsert_material(
  'geopolitica',
  'Geopolítica — Brasil e Conjuntura Internacional',
  'Geopolítica — Brasil e Conjuntura Internacional',
$content$
# Geopolítica — Brasil e Conjuntura Internacional

Cebraspe trata Geopolítica em formato de "atualidades estruturadas": **temas duradouros** + **fatos recentes**. Foco aqui: conceitos que vão cair, atualizados até 2026.

## 1. Geopolítica — Conceitos

- **Geopolítica**: análise das relações entre **espaço geográfico** e **poder político**.
- **Geoeconomia**: ênfase em recursos, mercados, fluxos comerciais.
- **Soft power x Hard power** (Joseph Nye):
  - **Hard**: militar, econômico (coação).
  - **Soft**: cultural, ideológico (atração).
  - **Smart power**: combinação.

## 2. Ordem Mundial Contemporânea

### 2.1. Multipolaridade

Após o fim da Guerra Fria (1991), passou-se de bipolaridade (EUA-URSS) para:
- **Unipolaridade** (1991-2008): hegemonia EUA.
- **Multipolaridade gradual**: ascensão China, Rússia agressiva, Índia emergente, BRICS, UE consolidada.

### 2.2. Atores e blocos relevantes

- **G7**: EUA, Japão, Alemanha, Reino Unido, França, Itália, Canadá.
- **G20**: maiores economias mundiais.
- **BRICS+** (ampliado 2024-25 com Egito, Etiópia, Irã, UAE, Arábia Saudita potencialmente, Indonésia).
- **OCDE**: economias avançadas (Brasil em processo de adesão).
- **UE**: 27 membros (pós-Brexit).
- **OTAN**: ampliada pós-2022 — Finlândia, Suécia (2024).
- **ONU**: 193 membros; CSNU permanente: EUA, China, Rússia, Reino Unido, França.

### 2.3. Conflitos contemporâneos

- **Rússia × Ucrânia** (2022-): redesenho energético europeu; sanções; OTAN ampliada.
- **Israel × Hamas/Hezbollah** (2023-): impactos no Oriente Médio.
- **Tensões Mar do Sul da China**: China x Filipinas, Vietnã.
- **Eleições EUA**: governos Trump (2024-) impactam OTAN, OMC, China.

## 3. Brasil — Política Externa

### 3.1. Princípios constitucionais (CF 4º)

- Independência nacional.
- Prevalência dos direitos humanos.
- Autodeterminação dos povos.
- Não-intervenção.
- Igualdade entre os Estados.
- Defesa da paz.
- Solução pacífica de conflitos.
- Repúdio ao terrorismo e ao racismo.
- Cooperação entre os povos para o progresso da humanidade.
- Concessão de asilo político.
- Buscar integração econômica, política, social e cultural dos povos da América Latina.

### 3.2. Eixos da PEB

- **Sul-Sul**: integração com países em desenvolvimento.
- **Multilateralismo**: privilegia ONU, OMC, CSNU.
- **América Latina**: Mercosul + integração regional.
- **BRICS**: presença em foro alternativo.
- **G20**: Brasil presidiu em 2024 — agenda taxação super-ricos, fome.

### 3.3. Brasil no Mercosul

- Tratado de Assunção (1991): Brasil, Argentina, Uruguai, Paraguai.
- Venezuela suspensa desde 2017.
- Bolívia em processo de adesão.
- Acordo Mercosul-UE: assinado em dezembro 2024.

## 4. Brasil — Geografia Política Interna

### 4.1. Regionalização IBGE

- Norte, Nordeste, Centro-Oeste, Sudeste, Sul.
- 26 Estados + DF.
- População ~213 milhões (Censo 2022).

### 4.2. Regiões geoeconômicas

- Amazônia.
- Nordeste.
- Centro-Sul (concentração econômica).

### 4.3. Recursos estratégicos

- **Pré-sal**: petróleo de águas profundas — autossuficiência.
- **Hidrelétricas**: matriz limpa (Itaipu, Belo Monte).
- **Agronegócio**: maior exportador de soja, carne bovina, café.
- **Mineração**: nióbio, ferro (Vale, CSN), urânio.

## 5. Sistema Globalizado e Atuais Desafios

### 5.1. Globalização

- Fluxos de bens, capitais, tecnologia, pessoas, dados.
- Desigualdade Norte-Sul.
- Atual: pós-globalização → reshoring, neoindustrialização, sanções.

### 5.2. Desafios

- **Mudança climática**: COP, Acordo de Paris (2015), Brasil sede COP30 em Belém (novembro 2025).
- **Migrações**: refugiados, deslocados climáticos.
- **Pandemia COVID-19**: cooperação global ainda em discussão (Tratado de Pandemias OMS).
- **Inteligência Artificial**: regulação europeia (AI Act), brasileira (PL 2.338/23).
- **Cripto e descentralização monetária**.

### 5.3. Brasil na pauta global

- Sede COP30 Belém: agenda Amazônia, desmatamento zero.
- BRICS expandido + propostas de moeda alternativa ao dólar.
- Reforma do Conselho de Segurança da ONU (Brasil pleiteia vaga permanente).

## 6. Como Cebraspe cobra

- **C/E**: "Brasil é membro permanente do CSNU" → **ERRADO** (pleiteia; permanentes: EUA, China, Rússia, UK, FR).
- **C/E**: "OTAN tem 30 membros" → **ERRADO** (32 desde Suécia em 2024).
- **C/E BRICS**: "BRICS é exclusivamente Brasil, Rússia, Índia, China, África do Sul" → **ERRADO** (ampliado em 2024).
- **C/E COP30**: "COP30 será sediada em Manaus em 2025" → **ERRADO** (Belém, novembro 2025).
- **C/E Mercosul-UE**: "Acordo Mercosul-UE foi rejeitado" → **ERRADO** (assinado dez/2024).
- **C/E PEB**: "Concessão de asilo político não é princípio constitucional" → **ERRADO** (CF 4º X).
$content$,
$resumo$
# Resumo Estratégico — Geopolítica

## Conceitos

- Soft power (cultural) vs Hard power (militar/econômico) — Joseph Nye.
- Multipolaridade gradual pós-Guerra Fria.

## Blocos

| Bloco | Composição |
|---|---|
| G7 | EUA, Japão, Alemanha, UK, França, Itália, Canadá |
| BRICS+ | Brasil, Rússia, Índia, China, África do Sul + (Egito, Etiópia, Irã, UAE…) |
| CSNU permanente | EUA, China, Rússia, UK, França |
| OTAN | 32 membros (Suécia/Finlândia recentes) |
| UE | 27 (pós-Brexit) |

## PEB (CF 4º)

Independência, DH, autodeterminação, não-intervenção, igualdade, paz, solução pacífica, repúdio terrorismo/racismo, cooperação, asilo, integração latino-americana.

## Brasil contemporâneo

- COP30 em Belém, nov 2025.
- G20 presidência 2024 — agenda taxação ricos, fome.
- Mercosul-UE assinado dez/2024.
- BRICS expandido.
- Pleiteia vaga CSNU permanente.

## Conflitos atuais

- Rússia-Ucrânia (2022-).
- Israel-Hamas/Hezbollah (2023-).
- Trump 2024- impactos OTAN/OMC.

## Top pegadinhas Cebraspe

1. Brasil PLEITEIA — não é membro permanente CSNU.
2. OTAN tem 32 membros.
3. BRICS foi expandido (não é só 5).
4. COP30 = Belém 2025.
5. Asilo político é princípio constitucional (CF 4º X).
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('legislacao-transito', 'etica-cidadania', 'geopolitica')
  );
  RAISE NOTICE 'Onda 9 OK — total de materiais nesses subjects: %', v_count;
END $$;
