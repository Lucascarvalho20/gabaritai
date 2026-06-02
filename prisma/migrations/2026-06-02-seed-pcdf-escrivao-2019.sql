-- ════════════════════════════════════════════════════════════════════════════
-- SEED PCDF ESCRIVÃO 2019 — Edital nº 1 PCDF-Escrivão, de 03/12/2019
-- Banca: Cebraspe | Cargo: Escrivão de Polícia (PCDF)
-- Subsídio: R$ 8.698,78 | Prova: 50 CB + 70 CE = 120q + Discursiva + Digitação
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'cebraspe', 'Cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção.', 'CE', true, NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, 'pcdf-escrivao', 'PCDF — Escrivão de Polícia',
  'Polícia Civil do Distrito Federal — Escrivão de Polícia. Banca Cebraspe. Prova: 50 CB + 70 CE = 120q + Discursiva + Prova prática de digitação. Subsídio R$ 8.698,78.',
  'POLICIAL'::"ConcursoArea", 'DF', 'PCDF', 'Escrivão de Polícia', 'pcdf', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'pcdf-escrivao');

UPDATE "courses" SET name = 'PCDF — Escrivão de Polícia', area = 'POLICIAL', uf = 'DF', orgao = 'PCDF', cargo = 'Escrivão de Polícia', "parentSlug" = 'pcdf', active = true
WHERE slug = 'pcdf-escrivao';

UPDATE "editais" SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-escrivao') AND ("numero" IS NULL OR "numero" <> '01/2019');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pcdf-escrivao'),
  (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  '01/2019', 2019,
  'Concurso PCDF — Escrivão de Polícia — Edital nº 1 PCDF/2019',
  '["Escrivão de Polícia"]'::jsonb,
  300, 8698.78, 'Ensino Superior Completo',
  '2019-12-03'::timestamp,
  120, 270, true, true, 'CE',
  'HOMOLOGADO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-escrivao') AND e.numero = '01/2019'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  "totalQuestoes" = 120, "duracaoMin" = 270, "hasRedacao" = true,
  "wrongAnnulsRight" = true, "examFormat" = 'CE', status = 'HOMOLOGADO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '01/2019' AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-escrivao');

DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pcdf-escrivao' AND e.numero = '01/2019';

  -- CB: LP (14)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 14.0, 14,
    '[CB] 1. Compreensão/interpretação de textos. 2. Tipologia/gêneros. 3. Ortografia. 4. Coesão (referenciação, conectores, sequenciação, tempos/modos verbais). 5. Estrutura morfossintática (classes, coordenação, subordinação, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita.',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 14.0, "expectedQuestions" = 14, programa = EXCLUDED.programa, "order" = 1;

  -- CB: Inglês (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-inglesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CB] 1. Compreensão de textos escritos em inglês. 2. Itens gramaticais relevantes para entendimento semântico.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 2;

  -- CB: Conhecimentos sobre DF (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'atualidades';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[CB - CONHECIMENTOS SOBRE O DISTRITO FEDERAL] 1. Realidade étnica, social, histórica, geográfica, cultural, política e econômica do DF. 2. RIDE — Lei Complementar 94/1998.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 3;

  -- CB: Legislação (22)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 22.0, 22,
    '[CB - LEGISLAÇÃO APLICADA À PCDF] 1. Lei 8.112/1990 (Regime Jurídico dos Servidores Federais). 2. Lei 4.878/1965 (Funcionários Policiais Civis da União e DF). 3. Decreto-Lei 2.266/1985 (carreira PCDF). 4. Lei 9.264/1996 (reorganização PCDF). 5. Decreto 30.490/2009 (Regimento Interno). 6. LODF — Cap V, Seção I (Da Polícia Civil). 7. Lei 13.869/2019 (Abuso de Autoridade). 8. Lei 8.429/1992 (Improbidade).',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 22.0, "expectedQuestions" = 22, programa = EXCLUDED.programa, "order" = 4;

  -- CE: Direito Constitucional (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[CE - NOÇÕES] 1. CF/1988. 1.1. Direitos e Garantias Fundamentais. 1.2. Título V, Cap III — Da Segurança Pública.',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 5;

  -- CE: Direito Penal (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[CE - NOÇÕES] 1. Aplicação da lei penal (princípios, tempo, espaço, lugar do crime, lei excepcional, irretroatividade). 2. Crimes contra a pessoa. 3. Crimes contra o patrimônio. 4. Crimes contra a Administração Pública. 5. Disposições constitucionais aplicáveis.',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 6;

  -- CE: Direito Processual Penal (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[CE - NOÇÕES] 1. Disposições preliminares do CPP. 2. Inquérito policial (notitia criminis, indiciamento, garantias do investigado). 3. Prisão e liberdade provisória. 4. Disposições constitucionais. 5. Lei 9.099/1995.',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 7;

  -- CE: Direitos Humanos (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CE - NOÇÕES] 1. Teoria geral dos DH. 2. Afirmação histórica. 3. DH e responsabilidade do Estado. 4. DH na CF/88. 5. Política Nacional de DH. 6. CF e tratados internacionais.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 8;

  -- CE: Informática (20)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 20.0, 20,
    '[CE - PESO ALTO! Escrivão lida com sistemas constantemente] 1. Internet, intranet, navegadores, correio, redes sociais. 2. Windows (sistema operacional). 3. Office (Word, Excel, PowerPoint). 4. Redes de computadores. 5. Segurança (vírus, worms, antivírus, firewall, anti-spyware). 6. Redes de comunicação (transmissão de dados, enlace, códigos). 7. Metadados de arquivos.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 20.0, "expectedQuestions" = 20, programa = EXCLUDED.programa, "order" = 9;

  -- CE: Matemática e RL (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[CE] 1. Princípios de contagem. 2. Razões e proporções. 3. Regras de três simples. 4. Porcentagens. 5. Equações 1º/2º graus. 6. Sequências numéricas, PA, PG. 7. Funções e gráficos. 8. Estruturas lógicas. 9. Lógica de argumentação (analogias, inferências). 10. Lógica sentencial (proposições, tabelas-verdade, equivalências, De Morgan, diagramas). 11. Lógica 1ª ordem. 12. Contagem e probabilidade. 13. Conjuntos. 14. Problemas aritméticos, geométricos, matriciais.',
    10) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 10;

END $$;

INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2019'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pcdf-escrivao'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pcdf-escrivao' AND e.numero = '01/2019';
