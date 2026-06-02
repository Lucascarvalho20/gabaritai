-- ════════════════════════════════════════════════════════════════════════════
-- SEED PCDF PERITO CRIMINAL 2016 — Edital nº 1 PCDF-Perito Criminal, 08/03/2016
-- Banca: IADES (ME_5) | Cargo: Perito Criminal (multi-área: 10 áreas técnicas)
-- Subsídio: R$ 16.830,85 | 80q = 40 CG + 40 CE + Discursiva 4 questões
-- ════════════════════════════════════════════════════════════════════════════

-- BANCA IADES (nova)
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'iades', 'IADES',
  'Instituto Americano de Desenvolvimento. Banca que executou o PCDF Perito 2016. Provas de múltipla escolha com 5 alternativas, sem penalização por erro.',
  'ME_5', true, NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, style = EXCLUDED.style, active = true;

-- COURSE
INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, 'pcdf-perito', 'PCDF — Perito Criminal',
  'Polícia Civil do Distrito Federal — Perito Criminal. 10 áreas técnicas (Ciências Biológicas, Contábeis, Ciência da Computação, Engenharias, Geologia, Química, Física, Medicina, Odontologia, etc). Banca IADES. Prova: 40 CG + 40 CE + Discursiva 4 questões. Subsídio R$ 16.830,85.',
  'POLICIAL'::"ConcursoArea", 'DF', 'PCDF', 'Perito Criminal', 'pcdf', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'pcdf-perito');

UPDATE "courses" SET name = 'PCDF — Perito Criminal', area = 'POLICIAL', uf = 'DF', orgao = 'PCDF', cargo = 'Perito Criminal', "parentSlug" = 'pcdf', active = true
WHERE slug = 'pcdf-perito';

UPDATE "editais" SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-perito') AND ("numero" IS NULL OR "numero" <> '01/2016');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pcdf-perito'),
  (SELECT id FROM "bancas" WHERE slug = 'iades'),
  '01/2016', 2016,
  'Concurso PCDF 2015 — Perito Criminal — Edital nº 1 PCDF-Perito Criminal/2016',
  '["Perito Criminal"]'::jsonb,
  20, 16830.85, 'Ensino Superior (área específica de formação)',
  '2016-03-08'::timestamp,
  80, 300, true, false, 'ME_5',
  'HOMOLOGADO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-perito') AND e.numero = '01/2016'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'iades'),
  "totalQuestoes" = 80, "duracaoMin" = 300, "hasRedacao" = true,
  "wrongAnnulsRight" = false, "examFormat" = 'ME_5', status = 'HOMOLOGADO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '01/2016' AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-perito');

DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pcdf-perito' AND e.numero = '01/2016';

  -- CG: LP (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[CG] 1. Compreensão e interpretação de textos. 2. Tipologia. 3. Ortografia. 4. Coesão. 5. Estrutura morfossintática (classes, sintaxe, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita.',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 1;

  -- CG: Mat + Estat + RL (6) — usa subject existente "matematica-raciocinio-logico"
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CG - MATEMÁTICA, ESTATÍSTICA E RACIOCÍNIO LÓGICO] 1. Mat: equações, sistemas, razão/proporção, regra de três, porcentagem, sequências, PA/PG. 2. Estat: descritiva, gráficos, probabilidade. 3. RL: estruturas lógicas, lógica argumentação, proposições, tabelas-verdade, equivalências, diagramas, conjuntos.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 2;

  -- CG: Aspectos Geopolíticos DF (4) — reusa atualidades
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'atualidades';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CG - ASPECTOS GEOPOLÍTICOS DO DF] Realidade étnica, social, histórica, geográfica, cultural, política e econômica do Distrito Federal.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 3;

  -- CG: Lei Orgânica DF (3) + Noções Direito Constitucional (4) = 7 total, agrupados em direito-constitucional
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7,
    '[CG - LODF (3q) + NOÇÕES DIREITO CONSTITUCIONAL (4q)] Lei Orgânica do DF: princípios, organização do DF, Poderes, Adm Pública, segurança pública, atribuições da PCDF. Noções Const: direitos e garantias fundamentais, organização do Estado, segurança pública (art. 144 CF).',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 4;

  -- CG: Noções Direito Adm (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CG - NOÇÕES] 1. Princípios. 2. Organização administrativa. 3. Atos administrativos. 4. Poderes. 5. Agentes públicos (Lei 8.112). 6. Responsabilidade civil do Estado.',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 5;

  -- CG: Noções Direito Penal (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CG - NOÇÕES] 1. Princípios. 2. Aplicação da lei penal. 3. Teoria do crime. 4. Crimes contra a pessoa, patrimônio, Adm Pública.',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 6;

  -- CG: Noções Direito Proc Penal (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[CG - NOÇÕES] 1. Inquérito policial. 2. Provas (corpo de delito, perícias, cadeia de custódia). 3. Ação penal. 4. Prisões.',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 7;

  -- CG: Legislação Especial (3)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 3.0, 3,
    '[CG] Lei 12.030/2009 (autonomia técnica/científica de Perito Criminal), Lei 9.264/1996, Decreto 30.490/2009, Decreto Distrital 35.957/2014, Portarias PCDF 1.031/2006 e 6/2016.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 3.0, "expectedQuestions" = 3, programa = EXCLUDED.programa, "order" = 8;

  -- CE: Conhecimentos Específicos por Área (40) — usando nocoes-criminalistica como wrapper
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'nocoes-criminalistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 40.0, 40,
    '[CE - CONHECIMENTOS ESPECÍFICOS POR ÁREA DE FORMAÇÃO] Conteúdo varia conforme área de inscrição:
    101 — Ciências Biológicas | 102 — Ciências Contábeis | 103 — Ciência da Computação/Informática | 104 — Engenharia Civil | 105 — Engenharia Elétrica/Eletrônica | 106 — Engenharia Mecânica | 107 — Farmácia/Bioquímica | 108 — Física | 109 — Geologia | 110 — Medicina | 111 — Medicina Veterinária | 112 — Odontologia | 113 — Química.
    Bases comuns: Criminalística (Locard, vestígios, locais de crime, balística, laudo pericial, cadeia de custódia, Lei 12.030/2009). Detalhes técnicos por área constam no Anexo I do edital.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 40.0, "expectedQuestions" = 40, programa = EXCLUDED.programa, "order" = 9;

END $$;

INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2016'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pcdf-perito'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pcdf-perito' AND e.numero = '01/2016';
