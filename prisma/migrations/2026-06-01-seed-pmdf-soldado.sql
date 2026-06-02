-- ════════════════════════════════════════════════════════════════════════════
-- SEED PMDF SOLDADO — Edital nº 04/2023 DGP/PMDF
-- Data: 2026-06-01
-- Fonte: PDF do DODF (Edição Extra Nº 10-A, 24/01/2023) — Anexo I completo
--
-- IDEMPOTENTE: pode rodar quantas vezes quiser sem duplicar nada.
-- Usa ON CONFLICT em todos os UPSERTs e WHERE NOT EXISTS em topics.
--
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → cola tudo → Run.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. BANCA: Instituto AOCP
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (
  gen_random_uuid()::text,
  'instituto-aocp',
  'Instituto AOCP',
  'Banca examinadora paranaense, especializada em concursos públicos. Provas com 5 alternativas, sem anulação por erro.',
  'ME_5',
  true,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  style = EXCLUDED.style,
  active = true;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. COURSE: PMDF Soldado
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "courses" (
  id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt"
)
VALUES (
  gen_random_uuid()::text,
  'pmdf-soldado',
  'PMDF — Soldado QPPMC',
  'Polícia Militar do Distrito Federal — Curso de Formação de Praças (Soldado Combatente). Banca: Instituto AOCP.',
  'MILITAR',
  'DF',
  'PMDF',
  'Soldado QPPMC',
  'pmdf',
  true,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  area = EXCLUDED.area,
  uf = EXCLUDED.uf,
  orgao = EXCLUDED.orgao,
  cargo = EXCLUDED.cargo,
  "parentSlug" = EXCLUDED."parentSlug",
  active = true;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. EDITAL: nº 04/2023 (ativo)
-- ──────────────────────────────────────────────────────────────────────────
-- Primeiro desativa qualquer edital antigo do curso pmdf-soldado
UPDATE "editais"
SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
  AND ("numero" IS NULL OR "numero" <> '04/2023');

-- Insere o edital 04/2023 como ativo (idempotente via WHERE NOT EXISTS)
INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "dataInscricaoIni", "dataInscricaoFim", "dataProva",
  "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado'),
  (SELECT id FROM "bancas" WHERE slug = 'instituto-aocp'),
  '04/2023',
  2023,
  'Concurso PMDF — Soldado QPPMC — Edital nº 04/2023 DGP/PMDF',
  '["Soldado QPPMC"]'::jsonb,
  2100,
  6362.32,
  'Ensino Médio Completo',
  '2023-01-24'::timestamp,
  '2023-03-07'::timestamp,
  '2023-04-10'::timestamp,
  '2023-05-21'::timestamp,
  80,
  300,
  true,
  false,
  'ME_5',
  'HOMOLOGADO',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais"
  WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
    AND numero = '04/2023'
);

-- Garante isActive=true mesmo se edital já existia
UPDATE "editais"
SET "isActive" = true,
    "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'instituto-aocp'),
    "totalQuestoes" = 80,
    "duracaoMin" = 300,
    "hasRedacao" = true,
    "examFormat" = 'ME_5',
    status = 'HOMOLOGADO',
    "updatedAt" = NOW()
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
  AND numero = '04/2023';

-- ──────────────────────────────────────────────────────────────────────────
-- 4. SUBJECTS (12 matérias globais)
--    IMPORTANTE: schema tem BOTH slug @unique AND name @unique.
--    Usa WHERE NOT EXISTS pra checar AMBOS antes de inserir — não falha se
--    o subject já existir por nome diferente do slug (ex: seed antigo).
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "subjects" (id, slug, name, description, area, active, "createdAt")
SELECT gen_random_uuid()::text, t.slug, t.name, t.description, t.area, true, NOW()
FROM (VALUES
  ('lingua-portuguesa', 'Língua Portuguesa', 'Compreensão de textos, gramática, ortografia, sintaxe, redação oficial.', 'Conhecimentos Gerais'),
  ('lingua-inglesa', 'Língua Inglesa', 'Compreensão de textos, gramática inglesa, tempos verbais, vocabulário.', 'Conhecimentos Gerais'),
  ('matematica-raciocinio-logico', 'Matemática e Raciocínio Lógico', 'Lógica, proposições, combinatória, probabilidade, razão e proporção, sistemas de medidas.', 'Conhecimentos Gerais'),
  ('atualidades', 'Atualidades', 'Realidade do Distrito Federal e RIDE, conexão com Brasil.', 'Conhecimentos Gerais'),
  ('legislacao-pmdf', 'Legislação Aplicada à PMDF', 'Lei Orgânica do DF, Lei 6.450/77, Estatuto dos Policiais Militares, Lei 12.086/2009, regulamentos.', 'Conhecimentos Específicos'),
  ('direito-constitucional-direitos-humanos', 'Direito Constitucional e Direitos Humanos', 'Constituição, direitos fundamentais, organização do Estado, tratados internacionais de DH.', 'Conhecimentos Específicos'),
  ('direito-administrativo', 'Direito Administrativo', 'Princípios, poderes, atos administrativos, licitações (Lei 14.133/2021), agentes públicos.', 'Conhecimentos Específicos'),
  ('direito-penal', 'Direito Penal', 'Princípios, teoria do crime, penas, crimes em espécie, leis especiais (Hediondos, Tortura, Drogas, Estatuto do Desarmamento).', 'Conhecimentos Específicos'),
  ('direito-processual-penal', 'Direito Processual Penal', 'Inquérito, ação penal, provas, prisões, procedimentos, Lei Maria da Penha, Juizados Especiais Criminais.', 'Conhecimentos Específicos'),
  ('direito-penal-militar', 'Direito Penal Militar', 'CPM, crimes militares em tempo de paz, penas militares, imputabilidade.', 'Conhecimentos Específicos'),
  ('direito-processual-penal-militar', 'Direito Processual Penal Militar', 'CPPM, polícia judiciária militar, IPM, processo militar, recursos.', 'Conhecimentos Específicos'),
  ('criminologia', 'Criminologia', 'Escolas criminológicas, vitimologia, prevenção criminal, sociologia criminal.', 'Conhecimentos Específicos')
) AS t(slug, name, description, area)
WHERE NOT EXISTS (
  SELECT 1 FROM "subjects" s WHERE s.slug = t.slug OR s.name = t.name
);

-- Garante que o slug está correto mesmo se subject já existia com nome igual mas slug diferente
-- (sincroniza para slug canônico, sem alterar o nome que já está em uso)
UPDATE "subjects" SET slug = 'lingua-portuguesa' WHERE name = 'Língua Portuguesa' AND slug <> 'lingua-portuguesa';
UPDATE "subjects" SET slug = 'lingua-inglesa' WHERE name = 'Língua Inglesa' AND slug <> 'lingua-inglesa';
UPDATE "subjects" SET slug = 'matematica-raciocinio-logico' WHERE name = 'Matemática e Raciocínio Lógico' AND slug <> 'matematica-raciocinio-logico';
UPDATE "subjects" SET slug = 'atualidades' WHERE name = 'Atualidades' AND slug <> 'atualidades';
UPDATE "subjects" SET slug = 'legislacao-pmdf' WHERE name = 'Legislação Aplicada à PMDF' AND slug <> 'legislacao-pmdf';
UPDATE "subjects" SET slug = 'direito-constitucional-direitos-humanos' WHERE name = 'Direito Constitucional e Direitos Humanos' AND slug <> 'direito-constitucional-direitos-humanos';
UPDATE "subjects" SET slug = 'direito-administrativo' WHERE name = 'Direito Administrativo' AND slug <> 'direito-administrativo';
UPDATE "subjects" SET slug = 'direito-penal' WHERE name = 'Direito Penal' AND slug <> 'direito-penal';
UPDATE "subjects" SET slug = 'direito-processual-penal' WHERE name = 'Direito Processual Penal' AND slug <> 'direito-processual-penal';
UPDATE "subjects" SET slug = 'direito-penal-militar' WHERE name = 'Direito Penal Militar' AND slug <> 'direito-penal-militar';
UPDATE "subjects" SET slug = 'direito-processual-penal-militar' WHERE name = 'Direito Processual Penal Militar' AND slug <> 'direito-processual-penal-militar';
UPDATE "subjects" SET slug = 'criminologia' WHERE name = 'Criminologia' AND slug <> 'criminologia';

-- ──────────────────────────────────────────────────────────────────────────
-- 5. EDITAL_SUBJECTS — matérias do edital com peso + expectedQuestions + programa
-- ──────────────────────────────────────────────────────────────────────────
-- Helper: variável temporária com o ID do edital
DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT id INTO v_edital_id
  FROM "editais"
  WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
    AND numero = '04/2023';

  -- LÍNGUA PORTUGUESA (10 questões, peso 10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '1. Compreensão e intelecção de textos. 2. Tipologia textual. 3. Ortografia. 4. Acentuação gráfica. 5. Emprego do sinal indicativo de crase. 6. Formação, classe e emprego de palavras. 7. Sintaxe da oração e do período. 8. Pontuação. 9. Concordância nominal e verbal. 10. Colocação pronominal. 11. Regência nominal e verbal. 12. Equivalência e transformação de estruturas. 13. Paralelismo sintático. 14. Relações de sinonímia e antonímia. 15. Correspondência oficial (Manual da Presidência da República).',
    1)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 1;

  -- LÍNGUA INGLESA (4 questões, peso 4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-inglesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. Compreensão de textos escritos em língua inglesa. 2. Itens gramaticais relevantes para compreensão dos conteúdos semânticos. 3. Pronomes (pessoais, oblíquos, demonstrativos, possessivos, reflexivos). 4. Artigos. 5. Substantivos. 6. Adjetivos. 7. Advérbios. 8. Verbos. 9. Tempos e aspectos verbais (Present/Past/Future Simple, Continuous, Perfect, Perfect Continuous). 10. Verbos modais (can, could, should, may, might, must, have to, would, need, had better). 11. Preposições. 12. Prefixos e sufixos. 13. Voz passiva. 14. Orações subordinadas e conjunções. 15. Relative clauses. 16. Discurso direto e indireto. 17. Conditionals (zero, first, second, third, mixed). 18. Phrasal verbs. 19. Verb patterns (verb + ing or infinitive). 20. Question tags.',
    2)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 2;

  -- MATEMÁTICA E RACIOCÍNIO LÓGICO (9 questões, peso 9)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 9.0, 9,
    '1. Estruturas lógicas: proposições simples e compostas, conectivos, equivalências e implicações lógicas, estrutura lógica de relações arbitrárias. 2. Lógica de argumentação: analogias, inferências, deduções, conclusões. 3. Diagramas lógicos. 4. Problemas de contagem: princípio fundamental, permutação simples, permutação com repetição, arranjo simples, combinação simples. 5. Probabilidades: ocorrência de evento, problemas envolvendo probabilidades. 6. Razão e Proporção e Regra de Três: grandezas diretamente e inversamente proporcionais, regra de três simples e composta, porcentagem, resolução de problemas. 7. Sistemas de Medidas: comprimento, área/superfície, volume/capacidade. 8. Áreas. 9. Volumes.',
    3)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 9.0, "expectedQuestions" = 9, programa = EXCLUDED.programa, "order" = 3;

  -- ATUALIDADES (7 questões, peso 7)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'atualidades';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7,
    '1. Realidade étnica, social, histórica, geográfica, cultural, política e econômica do Distrito Federal e da Região Integrada de Desenvolvimento do Distrito Federal (RIDE). 2. Sua conexão com o Brasil.',
    4)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 4;

  -- LEGISLAÇÃO APLICADA À PMDF (10 questões, peso 10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-pmdf';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '1. Lei Orgânica do Distrito Federal. 2. Lei nº 6.450/1977 (Organização Básica da PMDF). 3. Lei nº 7.289/1984 (Estatuto dos Policiais Militares da PMDF). 4. Lei nº 12.086/2009 (Militares da PMDF e CBMDF). 5. Decreto nº 88.777/1983 (R-200 — Regulamento das Polícias Militares e Corpos de Bombeiros). 6. Decreto nº 10.443/2020 (Organização Básica da PMDF). 7. Decreto nº 41.167/2020 (regulamenta art. 48, II, da Lei 6.450/77).',
    5)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 5;

  -- DIREITO CONSTITUCIONAL E DIREITOS HUMANOS (8 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional-direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '1. Constituição: conceito, estrutura, elementos, classificação. 2. Poder Constituinte. 3. Princípios fundamentais da República. 4. Direitos e garantias fundamentais (individuais e coletivos, sociais, nacionalidade, políticos, remédios constitucionais: HC, MS, MI, HD, ação popular). 5. Organização do Estado (político-administrativa, União/Estados/DF/Municípios, repartição de competências, intervenção, administração pública, servidores e militares). 6. Organização dos Poderes (Legislativo, Executivo, Judiciário, funções essenciais à Justiça). 7. Defesa do Estado e das instituições democráticas. 8. Teoria geral dos Direitos Humanos. 9. Evolução histórica e gerações de DH. 10. Tratados Internacionais de Proteção aos DH. 11. Incorporação de normas internacionais ao direito interno. 12. Declaração Universal dos DH (1948). 13. Convenção contra a Tortura (1984). 14. Convenção Americana sobre DH (Pacto de São José da Costa Rica — Decreto 678/1992). 15. Bloco de constitucionalidade e controle de convencionalidade. 16. Conselho Nacional dos Direitos Humanos — CNDH (Lei 12.986/2014). 17. Lei nº 13.060/2014. 18. Código de Conduta para Funcionários Responsáveis pela Aplicação da Lei (Resolução ONU 34/169 de 1979). 19. Sistema Interamericano de Direitos Humanos.',
    6)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 6;

  -- DIREITO ADMINISTRATIVO (5 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '1. Regime jurídico-administrativo e princípios. 2. Poderes e deveres da Administração (regulamentar, hierárquico, disciplinar, polícia; uso e abuso de poder; discricionariedade e vinculação). 3. Organização administrativa (centralização, descentralização, concentração, desconcentração, Administração direta e indireta). 4. Atos administrativos (conceito, requisitos, atributos, classificação, espécies, extinção, convalidação). 5. Responsabilidade civil do Estado. 6. Improbidade administrativa (Lei 8.429/1992). 7. Processo administrativo (Lei 9.784/1999). 8. Licitações e contratos administrativos (Lei 14.133/2021). 9. Serviços públicos (princípios, classificação, formas, concessão, permissão, autorização, PPP). 10. Agentes públicos (espécies, classificação, disposições constitucionais, cargo/emprego/função, concurso público, remuneração, greve, acumulação). 11. Controle da Administração Pública. 12. Bens Públicos. 13. Lei de Acesso à Informação (Lei 12.527/2011).',
    7)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 7;

  -- DIREITO PENAL (8 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '1. Princípios aplicáveis ao Direito Penal. 2. Lei penal: classificação, características, interpretação, analogia, vigência e aplicação; lei penal em branco; lei penal no tempo e no espaço; conflito aparente de leis; tempo e lugar do crime; territorialidade e extraterritorialidade; lei penal excepcional e temporária. 3. Teoria geral do crime: conceito, objeto e sujeitos; classificação; fato típico (conduta, resultado, causalidade, tipicidade); teoria do tipo; crime doloso, culposo e preterdoloso; erro de tipo, erro de proibição, descriminantes putativas; iter criminis; consumação e tentativa; desistência voluntária, arrependimento eficaz, arrependimento posterior, crime impossível; ilicitude; exclusão da ilicitude; excesso; culpabilidade; imputabilidade; concurso de pessoas; crime e contravenção. 4. Das penas (privativa de liberdade, restritivas de direitos, multa, aplicação, limite, concurso de crimes, suspensão condicional, livramento condicional, efeitos da condenação, reabilitação e medidas de segurança). 5. Extinção da punibilidade. 6. Crimes em espécie (contra a pessoa, patrimônio, dignidade sexual, incolumidade pública, paz pública, fé pública, administração pública, Estado Democrático). 7. Lei 13.869/2019 (Abuso de Autoridade). 8. Lei 7.716/1989 (Crimes de Preconceito). 9. Lei 8.069/1990 (ECA — ato infracional, infiltração de agentes, crimes em espécie). 10. Lei 8.072/1990 (Crimes Hediondos). 11. Lei 9.503/1997 (Crimes de Trânsito). 12. Lei 9.455/1997 (Tortura). 13. Lei 9.605/1998 (Crimes Ambientais). 14. Lei 10.826/2003 (Estatuto do Desarmamento). 15. Lei 11.343/2006 (Lei de Drogas).',
    8)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 8;

  -- DIREITO PROCESSUAL PENAL (6 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. Noções introdutórias: princípios, sistemas processuais, lei processual penal no tempo/espaço/pessoas, fontes, interpretação. 2. Investigação preliminar: inquérito policial, TCO, demais investigações, ANPP, controle externo da atividade policial. 3. Ação penal e ação civil ex delicto. 4. Jurisdição e competência criminal. 5. Provas (teoria geral, meios de prova e meios de obtenção). 6. Medidas cautelares pessoais (prisões e cautelares diversas da prisão). 7. Liberdade provisória. 8. Medidas cautelares reais (assecuratórias). 9. Procedimento comum (ordinário, sumário, sumaríssimo). 10. Nulidades. 11. Lei 7.960/1989 (Prisão Temporária). 12. Lei 9.099/1995 (Juizados Especiais Criminais). 13. Lei 9.296/1996 (Interceptação Telefônica). 14. Lei 11.340/2006 (Maria da Penha). 15. Lei 12.850/2013 (Organizações Criminosas). 16. Lei 12.037/2009 (Identificação Criminal).',
    9)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 9;

  -- DIREITO PENAL MILITAR (6 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal-militar';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. Aplicação da lei penal militar. 2. Crime. 3. Imputabilidade penal. 4. Concurso de agentes. 5. Penas principais. 6. Aplicação da pena. 7. Suspensão condicional da pena. 8. Livramento condicional. 9. Penas acessórias. 10. Efeitos da condenação. 11. Medidas de segurança. 12. Ação penal. 13. Extinção da punibilidade. 14. Crimes militares em tempo de paz. 15. Crimes propriamente militares. 16. Crimes impropriamente militares. (Base: DL 1.001/1969 — Código Penal Militar)',
    10)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 10;

  -- DIREITO PROCESSUAL PENAL MILITAR (4 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal-militar';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. Lei de Processo Penal Militar e sua aplicação. 2. Polícia judiciária militar. 3. Inquérito policial militar (IPM). 4. Ação penal militar e seu exercício. 5. Processo. 6. Denúncia. 7. Jurisdição e competência. 8. Questões prejudiciais e incidentes. 9. Medidas preventivas e assecuratórias. 10. Atos probatórios. 11. Processo ordinário. 12. Processos especiais. 13. Nulidades e recursos. (Base: DL 1.002/1969 — Código de Processo Penal Militar)',
    11)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 11;

  -- CRIMINOLOGIA (3 questões dos 40 específicos)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'criminologia';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 3.0, 3,
    '1. Criminologia: conceito, características, objeto, método e finalidade, funções, classificação. 2. História da criminologia: Escola Clássica, Escola Positiva, Escola de Política Criminal, Terza Scuola. 3. Estatística criminal, cifra negra, cifra dourada, prognóstico criminal. 4. Sociologia criminal. 5. Vitimologia. 6. Prevenção criminal. 7. Fatores sociais de criminalidade. 8. Instâncias de controle. 9. Crimes do colarinho branco.',
    12)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 3.0, "expectedQuestions" = 3, programa = EXCLUDED.programa, "order" = 12;

END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. COURSE_SUBJECTS — espelha edital_subjects pra o curso (pra cronograma usar)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT
  gen_random_uuid()::text,
  c.id,
  es."subjectId",
  es.weight,
  es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '04/2023'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pmdf-soldado'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET
  weight = EXCLUDED.weight,
  "order" = EXCLUDED."order";

-- ──────────────────────────────────────────────────────────────────────────
-- 7. TOPICS — assuntos específicos de cada matéria (Anexo I do edital)
--    Idempotente via WHERE NOT EXISTS (subjectId + name)
-- ──────────────────────────────────────────────────────────────────────────

-- LÍNGUA PORTUGUESA (15 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Compreensão e intelecção de textos', 'lp-compreensao-textos', 1.5, 1),
  ('Tipologia textual', 'lp-tipologia-textual', 1.0, 2),
  ('Ortografia', 'lp-ortografia', 1.0, 3),
  ('Acentuação gráfica', 'lp-acentuacao', 1.0, 4),
  ('Emprego do sinal indicativo de crase', 'lp-crase', 1.0, 5),
  ('Formação, classe e emprego de palavras', 'lp-formacao-classes', 1.0, 6),
  ('Sintaxe da oração e do período', 'lp-sintaxe', 1.2, 7),
  ('Pontuação', 'lp-pontuacao', 1.0, 8),
  ('Concordância nominal e verbal', 'lp-concordancia', 1.2, 9),
  ('Colocação pronominal', 'lp-colocacao-pronominal', 0.8, 10),
  ('Regência nominal e verbal', 'lp-regencia', 1.0, 11),
  ('Equivalência e transformação de estruturas', 'lp-equivalencia', 0.8, 12),
  ('Paralelismo sintático', 'lp-paralelismo', 0.8, 13),
  ('Relações de sinonímia e antonímia', 'lp-sinonimia-antonimia', 0.8, 14),
  ('Correspondência oficial (Manual da Presidência)', 'lp-redacao-oficial', 1.0, 15)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'lingua-portuguesa'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- LÍNGUA INGLESA (10 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Compreensão de textos escritos em inglês', 'en-reading', 2.0, 1),
  ('Pronomes (pessoais, oblíquos, demonstrativos, possessivos, reflexivos)', 'en-pronouns', 1.0, 2),
  ('Substantivos, adjetivos e advérbios', 'en-nouns-adj-adv', 1.0, 3),
  ('Tempos verbais (Present/Past/Future Simple, Continuous, Perfect)', 'en-tenses', 1.5, 4),
  ('Verbos modais', 'en-modal-verbs', 1.0, 5),
  ('Voz passiva', 'en-passive-voice', 0.8, 6),
  ('Orações subordinadas e relative clauses', 'en-subordinate-relative', 0.8, 7),
  ('Discurso direto e indireto', 'en-direct-indirect-speech', 0.8, 8),
  ('Conditionals (zero, first, second, third, mixed)', 'en-conditionals', 1.0, 9),
  ('Phrasal verbs, verb patterns e question tags', 'en-phrasal-patterns-tags', 0.8, 10)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'lingua-inglesa'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- MATEMÁTICA E RACIOCÍNIO LÓGICO (9 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Estruturas lógicas (proposições, conectivos, equivalências, implicações)', 'mrl-estruturas-logicas', 1.5, 1),
  ('Lógica de argumentação (analogias, inferências, deduções)', 'mrl-argumentacao', 1.2, 2),
  ('Diagramas lógicos', 'mrl-diagramas', 1.0, 3),
  ('Problemas de contagem (princípio fundamental, permutação, arranjo, combinação)', 'mrl-contagem', 1.2, 4),
  ('Probabilidades', 'mrl-probabilidades', 1.0, 5),
  ('Razão, proporção e regra de três (simples e composta)', 'mrl-razao-proporcao', 1.2, 6),
  ('Porcentagem e resolução de problemas', 'mrl-porcentagem', 1.2, 7),
  ('Sistemas de medidas (comprimento, área, volume, capacidade)', 'mrl-medidas', 0.8, 8),
  ('Áreas e volumes', 'mrl-areas-volumes', 0.8, 9)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'matematica-raciocinio-logico'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ATUALIDADES (5 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Realidade étnica, social e histórica do DF', 'at-etnica-social-historica-df', 1.0, 1),
  ('Geografia e cultura do DF', 'at-geografia-cultura-df', 1.0, 2),
  ('Política e economia do DF', 'at-politica-economia-df', 1.0, 3),
  ('Região Integrada de Desenvolvimento do DF (RIDE)', 'at-ride', 1.5, 4),
  ('Conexão do DF com o Brasil', 'at-df-brasil', 1.0, 5)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'atualidades'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- LEGISLAÇÃO APLICADA À PMDF (7 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Lei Orgânica do Distrito Federal (LODF)', 'leg-pmdf-lodf', 1.2, 1),
  ('Lei nº 6.450/1977 — Organização Básica da PMDF', 'leg-pmdf-lei-6450', 1.5, 2),
  ('Lei nº 7.289/1984 — Estatuto dos Policiais Militares', 'leg-pmdf-estatuto-7289', 1.8, 3),
  ('Lei nº 12.086/2009 — Militares da PMDF e CBMDF', 'leg-pmdf-lei-12086', 1.5, 4),
  ('Decreto nº 88.777/1983 — R-200 (Regulamento das PMs e CBMs)', 'leg-pmdf-r200', 1.2, 5),
  ('Decreto nº 10.443/2020 — Organização Básica PMDF', 'leg-pmdf-decreto-10443', 1.0, 6),
  ('Decreto nº 41.167/2020', 'leg-pmdf-decreto-41167', 0.8, 7)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'legislacao-pmdf'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO CONSTITUCIONAL E DIREITOS HUMANOS (19 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Constituição: conceito, estrutura, elementos e classificação', 'dc-constituicao-conceito', 1.0, 1),
  ('Poder Constituinte', 'dc-poder-constituinte', 0.8, 2),
  ('Princípios fundamentais da República', 'dc-principios-fundamentais', 1.0, 3),
  ('Direitos e garantias fundamentais (individuais e coletivos)', 'dc-direitos-individuais', 1.8, 4),
  ('Direitos sociais', 'dc-direitos-sociais', 1.0, 5),
  ('Nacionalidade', 'dc-nacionalidade', 0.6, 6),
  ('Direitos políticos e partidos políticos', 'dc-direitos-politicos', 0.8, 7),
  ('Ações e remédios constitucionais (HC, MS, MI, HD, ação popular)', 'dc-remedios-constitucionais', 1.2, 8),
  ('Organização do Estado (União, Estados, DF, Municípios)', 'dc-organizacao-estado', 1.2, 9),
  ('Administração Pública: disposições gerais; servidores e militares', 'dc-administracao-publica', 1.5, 10),
  ('Organização dos Poderes (Legislativo, Executivo, Judiciário)', 'dc-organizacao-poderes', 1.0, 11),
  ('Defesa do Estado e das instituições democráticas', 'dc-defesa-estado', 1.0, 12),
  ('Teoria geral dos Direitos Humanos', 'dh-teoria-geral', 1.0, 13),
  ('Evolução histórica e gerações de DH', 'dh-evolucao-geracoes', 0.8, 14),
  ('Tratados Internacionais de DH e incorporação ao direito interno', 'dh-tratados-internacionais', 1.2, 15),
  ('Declaração Universal dos DH (1948)', 'dh-dudh-1948', 1.0, 16),
  ('Pacto de São José da Costa Rica (Decreto 678/1992)', 'dh-pacto-sao-jose', 1.0, 17),
  ('Lei nº 13.060/2014 e Resolução ONU 34/169 (Código de Conduta)', 'dh-lei-13060-codigo-conduta', 1.0, 18),
  ('Sistema Interamericano de Direitos Humanos', 'dh-sistema-interamericano', 0.8, 19)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-constitucional-direitos-humanos'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO ADMINISTRATIVO (13 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Regime jurídico-administrativo e princípios', 'da-regime-principios', 1.2, 1),
  ('Poderes e deveres da Administração (regulamentar, hierárquico, disciplinar, polícia)', 'da-poderes-deveres', 1.5, 2),
  ('Organização administrativa (centralização, descentralização)', 'da-organizacao', 1.0, 3),
  ('Atos administrativos (conceito, requisitos, atributos, espécies)', 'da-atos-administrativos', 1.5, 4),
  ('Responsabilidade civil do Estado', 'da-responsabilidade-civil', 1.0, 5),
  ('Improbidade administrativa (Lei 8.429/1992)', 'da-improbidade-8429', 1.2, 6),
  ('Processo administrativo (Lei 9.784/1999)', 'da-processo-9784', 1.0, 7),
  ('Licitações e contratos (Lei 14.133/2021)', 'da-licitacoes-14133', 1.2, 8),
  ('Serviços públicos (concessão, permissão, PPP)', 'da-servicos-publicos', 0.8, 9),
  ('Agentes públicos (cargo, emprego, função, concurso)', 'da-agentes-publicos', 1.0, 10),
  ('Controle da Administração Pública', 'da-controle', 0.8, 11),
  ('Bens Públicos', 'da-bens-publicos', 0.8, 12),
  ('Lei de Acesso à Informação (Lei 12.527/2011)', 'da-lai-12527', 0.8, 13)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-administrativo'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO PENAL (15 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios do Direito Penal', 'dp-principios', 1.0, 1),
  ('Aplicação da lei penal (tempo, espaço, conflito aparente)', 'dp-aplicacao-lei', 1.0, 2),
  ('Teoria geral do crime (fato típico, ilicitude, culpabilidade)', 'dp-teoria-crime', 2.0, 3),
  ('Iter criminis, consumação, tentativa e desistência voluntária', 'dp-iter-criminis', 1.0, 4),
  ('Concurso de pessoas', 'dp-concurso-pessoas', 0.8, 5),
  ('Das penas (privativa, restritiva, multa, aplicação, concurso)', 'dp-penas', 1.5, 6),
  ('Extinção da punibilidade', 'dp-extincao-punibilidade', 1.0, 7),
  ('Crimes contra a pessoa, patrimônio, dignidade sexual', 'dp-crimes-pessoa-patrimonio', 1.8, 8),
  ('Crimes contra a Administração Pública', 'dp-crimes-adm-publica', 1.5, 9),
  ('Lei 13.869/2019 (Abuso de Autoridade)', 'dp-lei-13869-abuso', 1.2, 10),
  ('Lei 8.069/1990 (ECA — atos infracionais)', 'dp-eca-8069', 1.0, 11),
  ('Lei 8.072/1990 (Crimes Hediondos)', 'dp-lei-8072-hediondos', 1.0, 12),
  ('Lei 9.455/1997 (Tortura) e Lei 9.605/1998 (Crimes Ambientais)', 'dp-tortura-ambientais', 1.0, 13),
  ('Lei 10.826/2003 (Estatuto do Desarmamento)', 'dp-lei-10826-desarmamento', 1.2, 14),
  ('Lei 11.343/2006 (Lei de Drogas)', 'dp-lei-11343-drogas', 1.2, 15)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-penal'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO PROCESSUAL PENAL (16 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios e sistemas processuais', 'dpp-principios', 1.0, 1),
  ('Inquérito policial', 'dpp-inquerito-policial', 1.5, 2),
  ('Termo Circunstanciado de Ocorrência (TCO)', 'dpp-tco', 1.0, 3),
  ('Acordo de Não Persecução Penal (ANPP)', 'dpp-anpp', 1.0, 4),
  ('Ação penal e ação civil ex delicto', 'dpp-acao-penal', 1.0, 5),
  ('Jurisdição e competência criminal', 'dpp-jurisdicao-competencia', 1.0, 6),
  ('Provas (teoria geral e meios de obtenção)', 'dpp-provas', 1.2, 7),
  ('Prisões e medidas cautelares pessoais', 'dpp-prisoes-cautelares', 1.5, 8),
  ('Liberdade provisória', 'dpp-liberdade-provisoria', 1.0, 9),
  ('Procedimento comum (ordinário, sumário, sumaríssimo)', 'dpp-procedimento-comum', 1.0, 10),
  ('Nulidades', 'dpp-nulidades', 0.8, 11),
  ('Lei 7.960/1989 (Prisão Temporária)', 'dpp-lei-7960-temporaria', 1.0, 12),
  ('Lei 9.099/1995 (Juizados Especiais Criminais)', 'dpp-lei-9099-jecrim', 1.2, 13),
  ('Lei 9.296/1996 (Interceptação Telefônica)', 'dpp-lei-9296-interceptacao', 1.0, 14),
  ('Lei 11.340/2006 (Maria da Penha)', 'dpp-lei-11340-mariadapenha', 1.5, 15),
  ('Lei 12.850/2013 (Organizações Criminosas) e Lei 12.037/2009', 'dpp-orcrim-identif', 1.0, 16)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-processual-penal'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO PENAL MILITAR (16 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Aplicação da lei penal militar', 'dpm-aplicacao-lei', 1.0, 1),
  ('Crime militar (conceito e classificação)', 'dpm-crime-conceito', 1.5, 2),
  ('Imputabilidade penal militar', 'dpm-imputabilidade', 1.0, 3),
  ('Concurso de agentes', 'dpm-concurso-agentes', 0.8, 4),
  ('Penas principais', 'dpm-penas-principais', 1.0, 5),
  ('Aplicação da pena', 'dpm-aplicacao-pena', 1.0, 6),
  ('Suspensão condicional da pena', 'dpm-suspensao-condicional', 0.8, 7),
  ('Livramento condicional', 'dpm-livramento-condicional', 0.8, 8),
  ('Penas acessórias', 'dpm-penas-acessorias', 0.8, 9),
  ('Efeitos da condenação', 'dpm-efeitos-condenacao', 0.8, 10),
  ('Medidas de segurança', 'dpm-medidas-seguranca', 0.8, 11),
  ('Ação penal militar', 'dpm-acao-penal', 0.8, 12),
  ('Extinção da punibilidade militar', 'dpm-extincao-punibilidade', 1.0, 13),
  ('Crimes militares em tempo de paz', 'dpm-crimes-tempo-paz', 1.5, 14),
  ('Crimes propriamente militares', 'dpm-crimes-propriamente', 1.2, 15),
  ('Crimes impropriamente militares', 'dpm-crimes-impropriamente', 1.2, 16)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-penal-militar'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- DIREITO PROCESSUAL PENAL MILITAR (13 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Lei de Processo Penal Militar e sua aplicação', 'dppm-lei-aplicacao', 1.0, 1),
  ('Polícia judiciária militar', 'dppm-policia-judiciaria', 1.5, 2),
  ('Inquérito Policial Militar (IPM)', 'dppm-ipm', 2.0, 3),
  ('Ação penal militar e seu exercício', 'dppm-acao-penal', 1.0, 4),
  ('Processo (instauração e desenvolvimento)', 'dppm-processo', 1.0, 5),
  ('Denúncia', 'dppm-denuncia', 0.8, 6),
  ('Jurisdição e competência militar', 'dppm-jurisdicao-competencia', 1.0, 7),
  ('Questões prejudiciais e incidentes', 'dppm-prejudiciais-incidentes', 0.8, 8),
  ('Medidas preventivas e assecuratórias', 'dppm-medidas-preventivas', 1.0, 9),
  ('Atos probatórios', 'dppm-atos-probatorios', 1.0, 10),
  ('Processo ordinário militar', 'dppm-processo-ordinario', 1.0, 11),
  ('Processos especiais militares', 'dppm-processos-especiais', 0.8, 12),
  ('Nulidades e recursos', 'dppm-nulidades-recursos', 0.8, 13)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-processual-penal-militar'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- CRIMINOLOGIA (9 tópicos)
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Criminologia: conceito, características, objeto, método e finalidade', 'cr-conceito', 1.2, 1),
  ('Escolas criminológicas (Clássica, Positiva, Política Criminal, Terza Scuola)', 'cr-escolas', 1.5, 2),
  ('Estatística criminal, cifra negra, cifra dourada', 'cr-cifras', 1.0, 3),
  ('Prognóstico criminal', 'cr-prognostico', 0.8, 4),
  ('Sociologia criminal', 'cr-sociologia-criminal', 1.0, 5),
  ('Vitimologia', 'cr-vitimologia', 1.2, 6),
  ('Prevenção criminal', 'cr-prevencao', 1.2, 7),
  ('Fatores sociais de criminalidade e instâncias de controle', 'cr-fatores-controle', 1.0, 8),
  ('Crimes do colarinho branco', 'cr-colarinho-branco', 0.8, 9)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'criminologia'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO (opcional — pode rodar separado pra conferir)
-- ════════════════════════════════════════════════════════════════════════════
-- SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
--        (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
--        (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
-- FROM "courses" c
-- JOIN "editais" e ON e."courseId" = c.id
-- WHERE c.slug = 'pmdf-soldado';
--
-- SELECT s.name AS materia, es."expectedQuestions", es.weight, es."order",
--        (SELECT COUNT(*) FROM "topics" t WHERE t."subjectId" = s.id) AS num_topics
-- FROM "edital_subjects" es
-- JOIN "subjects" s ON s.id = es."subjectId"
-- JOIN "editais" e ON e.id = es."editalId"
-- WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pmdf-soldado')
--   AND e.numero = '04/2023'
-- ORDER BY es."order";
