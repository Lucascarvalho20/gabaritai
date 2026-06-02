-- ════════════════════════════════════════════════════════════════════════════
-- SEED PMGO SOLDADO 2024 — Edital de Abertura nº 002/2022 (retificado 2024)
-- Banca: Instituto AOCP | Cargo: Soldado de 2ª Classe QPPM (Combatente)
-- Salário: R$ 6.353,13 | Prova: 50 questões + Redação
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'instituto-aocp', 'Instituto AOCP',
  'Banca paranaense, especializada em concursos públicos. Provas com 5 alternativas, sem anulação por erro.', 'ME_5', true, NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, 'pmgo-soldado', 'PMGO — Soldado QPPM (Combatente)',
  'Polícia Militar do Estado de Goiás — Curso de Formação de Soldados Combatentes. Banca Instituto AOCP. Prova: 50 questões + Redação + TAF + Médica + Psicológica + Sindicância. Salário R$ 6.353,13.',
  'MILITAR'::"ConcursoArea", 'GO', 'PMGO', 'Soldado QPPM Combatente', 'pmgo', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'pmgo-soldado');

UPDATE "courses" SET name = 'PMGO — Soldado QPPM (Combatente)', area = 'MILITAR', uf = 'GO', orgao = 'PMGO', cargo = 'Soldado QPPM Combatente', "parentSlug" = 'pmgo', active = true
WHERE slug = 'pmgo-soldado';

UPDATE "editais" SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmgo-soldado') AND ("numero" IS NULL OR "numero" <> '002/2022');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pmgo-soldado'),
  (SELECT id FROM "bancas" WHERE slug = 'instituto-aocp'),
  '002/2022', 2022,
  'Concurso PMGO — Soldado 2ª Classe QPPM Combatente — Edital nº 002/2022 (retificado 2024)',
  '["Soldado QPPM Combatente"]'::jsonb,
  1500, 6353.13, 'Ensino Superior Completo',
  '2024-03-01'::timestamp,
  50, 270, true, false, 'ME_5',
  'HOMOLOGADO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pmgo-soldado') AND e.numero = '002/2022'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'instituto-aocp'),
  "totalQuestoes" = 50, "duracaoMin" = 270, "hasRedacao" = true,
  "wrongAnnulsRight" = false, "examFormat" = 'ME_5', status = 'HOMOLOGADO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '002/2022' AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'pmgo-soldado');

DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pmgo-soldado' AND e.numero = '002/2022';

  -- CG: LP (10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '[CG] 1. Compreensão e interpretação de textos. 2. Tipologia/gêneros. 3. Ortografia. 4. Acentuação, crase. 5. Classes de palavras. 6. Sintaxe (concordância, regência, pontuação, colocação pronominal). 7. Semântica (sinônimos, antônimos). 8. Redação oficial.',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 1;

  -- CG: Realidade GO (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'realidade-goias';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CG - REALIDADE ÉTNICA, SOCIAL, HISTÓRICA, GEOGRÁFICA, CULTURAL, POLÍTICA E ECONÔMICA DO ESTADO DE GOIÁS] Aspectos do Estado de Goiás: formação histórica, geografia, cultura, política, economia, indicadores sociais e demográficos.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 2;

  -- CE: Direito Penal (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CE - NOÇÕES] 1. Princípios. 2. Lei penal (tempo, espaço). 3. Teoria do crime (tipicidade, ilicitude, culpabilidade). 4. Concurso de pessoas. 5. Crimes em espécie (pessoa, patrimônio, Adm Pública). 6. Extinção da punibilidade.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 3;

  -- CE: Direito Constitucional (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CE - NOÇÕES] 1. Princípios fundamentais. 2. Direitos e garantias fundamentais. 3. Organização do Estado (União/Estados/DF/Municípios). 4. Administração Pública (servidores e militares). 5. Defesa do Estado e segurança pública (art. 144 CF). 6. Constituição do Estado de Goiás.',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 4;

  -- CE: Direito Processual Penal (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CE - NOÇÕES] 1. Princípios. 2. Inquérito policial. 3. Ação penal. 4. Provas. 5. Prisões (flagrante, temporária, preventiva). 6. Lei 9.099/95 (JECrim).',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 5;

  -- CE: Direito Administrativo (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CE - NOÇÕES] 1. Princípios. 2. Organização administrativa. 3. Atos administrativos. 4. Poderes administrativos. 5. Agentes públicos (Lei 8.033/1975 — Estatuto PMGO, Lei 15.704/2006). 6. Responsabilidade civil do Estado. 7. Improbidade (Lei 8.429/92).',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 6;

  -- CE: Direito Penal Militar (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal-militar';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CE - NOÇÕES] 1. Aplicação da lei penal militar. 2. Crime (conceito, classificação). 3. Imputabilidade. 4. Concurso de agentes. 5. Penas (principais, acessórias). 6. Crimes militares em tempo de paz. 7. Crimes propriamente/impropriamente militares (DL 1.001/1969 — CPM).',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 7;

  -- CE: Direito Processual Penal Militar (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal-militar';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CE - NOÇÕES] 1. Lei de Processo Penal Militar. 2. Polícia judiciária militar. 3. IPM. 4. Ação penal militar. 5. Processo. 6. Provas. 7. Recursos. (DL 1.002/1969 — CPPM)',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 8;

  -- CE: Legislação Extravagante (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CE - LEGISLAÇÃO EXTRAVAGANTE APLICADA À PMGO] 1. Lei Estadual 8.033/1975 (Estatuto PMGO). 2. Lei Estadual 15.704/2006. 3. Lei Estadual 17.866/2012. 4. Lei Estadual 15.668/2006. 5. Lei Estadual 20.946/2020. 6. Lei Federal 12.705/2012. 7. Portaria 42/2008-PMGO. 8. Portaria 8684/2016-PMGO.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 9;

END $$;

INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '002/2022'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pmgo-soldado'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pmgo-soldado' AND e.numero = '002/2022';
