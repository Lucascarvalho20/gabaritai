-- ════════════════════════════════════════════════════════════════════════════
-- SEED PCDF AGENTE 2020 — Edital nº 1 PCDF-AGENTE, de 30/06/2020
-- Banca: Cebraspe | Cargo: Agente de Polícia (PCDF)
-- Subsídio: R$ 8.698,78 | Prova: 50 CB + 70 CE = 120 questões + Discursiva
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'cebraspe', 'Cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção.', 'CE', true, NOW())
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, 'pcdf-agente', 'PCDF — Agente de Polícia',
  'Polícia Civil do Distrito Federal — Agente de Polícia. Banca Cebraspe. Prova: 50 CB + 70 CE = 120 questões + Discursiva. Subsídio R$ 8.698,78.',
  'POLICIAL'::"ConcursoArea", 'DF', 'PCDF', 'Agente de Polícia', 'pcdf', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'pcdf-agente');

UPDATE "courses" SET name = 'PCDF — Agente de Polícia', area = 'POLICIAL', uf = 'DF', orgao = 'PCDF', cargo = 'Agente de Polícia', "parentSlug" = 'pcdf', active = true
WHERE slug = 'pcdf-agente';

UPDATE "editais" SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-agente') AND ("numero" IS NULL OR "numero" <> '01/2020');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pcdf-agente'),
  (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  '01/2020', 2020,
  'Concurso PCDF 2020 — Agente de Polícia — Edital nº 1 PCDF-AGENTE/2020',
  '["Agente de Polícia"]'::jsonb,
  300, 8698.78, 'Ensino Superior Completo',
  '2020-06-30'::timestamp,
  120, 270, true, true, 'CE',
  'HOMOLOGADO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-agente') AND e.numero = '01/2020'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  "totalQuestoes" = 120, "duracaoMin" = 270, "hasRedacao" = true,
  "wrongAnnulsRight" = true, "examFormat" = 'CE', status = 'HOMOLOGADO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '01/2020' AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-agente');

DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pcdf-agente' AND e.numero = '01/2020';

  -- CB: LP (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[CB] 1. Compreensão/interpretação de textos. 2. Tipologia/gêneros. 3. Ortografia. 4. Coesão (referenciação, conectores, sequenciação). 5. Estrutura morfossintática (classes, coordenação, subordinação, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita.',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;

  -- CB: Inglês (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-inglesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CB] 1. Compreensão de textos escritos em inglês. 2. Itens gramaticais relevantes para entendimento semântico.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 2;

  -- CB: Conhecimentos sobre DF (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'atualidades';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[CB - CONHECIMENTOS SOBRE O DISTRITO FEDERAL] 1. Realidade étnica, social, histórica, geográfica, cultural, política e econômica do DF. 2. Região Integrada de Desenvolvimento do DF e Entorno (RIDE) — Lei Complementar 94/1998 e alterações.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 3;

  -- CB: Legislação (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[CB - LEGISLAÇÃO APLICADA À PCDF] 1. Lei 8.112/1990 (Regime Jurídico dos Servidores Federais). 2. Lei 4.878/1965 (Regime Jurídico dos Funcionários Policiais Civis da União e DF). 3. Decreto-Lei 2.266/1985 (criação da carreira PCDF). 4. Lei 9.264/1996 (desmembramento PCDF, remuneração). 5. Decreto 30.490/2009 (Regimento Interno da PCDF). 6. Lei Orgânica do DF — Capítulo V, Seção I (Da Polícia Civil). 7. Lei 13.869/2019 (Abuso de Autoridade). 8. Lei 8.429/1992 (Improbidade Administrativa).',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 4;

  -- CB: Matemática e Raciocínio Lógico (13)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 13.0, 13,
    '[CB] 1. Princípios de contagem. 2. Razões e proporções. 3. Regras de três simples. 4. Porcentagens. 5. Equações 1º e 2º graus. 6. Sequências numéricas. 7. PA e PG. 8. Funções e gráficos. 9. Estruturas lógicas. 10. Lógica de argumentação (analogias, inferências, deduções). 11. Lógica sentencial (proposições, tabelas-verdade, equivalências, De Morgan, diagramas). 12. Lógica 1ª ordem. 13. Princípios de contagem e probabilidade. 14. Operações com conjuntos. 15. Problemas aritméticos, geométricos, matriciais.',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 13.0, "expectedQuestions" = 13, programa = EXCLUDED.programa, "order" = 5;

  -- CE: Direito Administrativo (10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '[CE - NOÇÕES] 1. Organização administrativa (centralização, descentralização, direta/indireta, autarquias). 2. Ato administrativo. 3. Agentes públicos (Lei 8.112/90). 4. Poderes administrativos (hierárquico, disciplinar, regulamentar, polícia). 5. Licitações. 6. Controle da Adm (judicial, legislativo). 7. Responsabilidade civil do Estado.',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 6;

  -- CE: Direito Constitucional (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[CE - NOÇÕES] 1. CF/1988. 1.1. Direitos e Garantias Fundamentais. 1.2. Título V, Capítulo III — Da Segurança Pública.',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 7;

  -- CE: Direito Penal (10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '[CE - NOÇÕES] 1. Aplicação da lei penal (princípios, tempo, espaço, lugar do crime, lei excepcional, irretroatividade). 2. Crimes contra a pessoa. 3. Crimes contra o patrimônio. 4. Crimes contra a Administração Pública. 5. Disposições constitucionais aplicáveis ao direito penal.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 8;

  -- CE: Direito Processual Penal (10)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '[CE - NOÇÕES] 1. Disposições preliminares do CPP. 2. Inquérito policial (histórico, natureza, notitia/delatio criminis, indiciamento, garantias do investigado, conclusão). 3. Prisão e liberdade provisória. 4. Disposições constitucionais aplicáveis. 5. Lei 9.099/1995.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 9;

  -- CE: Direitos Humanos (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[CE - NOÇÕES] 1. Teoria geral dos DH. 2. Afirmação histórica. 3. DH e responsabilidade do Estado. 4. DH na CF/88. 5. Política Nacional de DH. 6. CF e tratados internacionais.',
    10) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 10;

  -- CE: Informática (15)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 15.0, 15,
    '[CE] 1. Fundamentos (arquitetura, hardware/software, SOs, virtualização). 2. Redes (LAN/MAN/WAN, OSI, TCP/IP, VPN, cloud, segurança). 3. Internet (navegadores, e-mail, redes sociais, acesso remoto). 4. SOs (Windows 10, Linux, Android, iOS). 5. Office/LibreOffice. 6. Mineração de dados, ML, Big Data. 7. Python e R. 8. API. 9. Metadados. 10. Teoria da informação. 11. Banco de dados (relacional, modelagem, chaves).',
    11) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 15.0, "expectedQuestions" = 15, programa = EXCLUDED.programa, "order" = 11;

  -- CE: Estatística (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'estatistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CE] 1. Descritiva (gráficos, medidas). 2. Probabilidade (axiomas, condicional, variáveis aleatórias, distribuições). 3. Inferência (estimação, intervalos, testes t e qui-quadrado). 4. Regressão linear. 5. Amostragem.',
    12) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 12;

  -- CE: Contabilidade Geral (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'contabilidade-geral';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[CE] 1. Conceitos, objetivos, finalidades. 2. Patrimônio (equação fundamental). 3. Atos e fatos administrativos. 4. Contas, plano de contas, escrituração. 5. Operações contábeis. 6. Balancete, BP, DRE. 7. Lei 6.404/1976 e CPC. 8. NBC TSP Estrutura Conceitual.',
    13) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 13;

END $$;

INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2020'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pcdf-agente'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pcdf-agente' AND e.numero = '01/2020';
