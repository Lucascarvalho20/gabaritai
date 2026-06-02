-- ════════════════════════════════════════════════════════════════════════════
-- SEED PCDF DELEGADO 2026 — Edital nº 1 PCDF-DELEGADO, de 03/02/2026
-- Banca: Cebraspe | Cargo: Delegado de Polícia (PCDF)
-- Data: 2026-06-01
-- Subsídio: R$ 26.690,15 | Vagas: 216 AC | Prova obj 120q + Discursiva 6h (3 + peça)
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'cebraspe', 'Cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção.', 'CE', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- COURSE
INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, 'pcdf-delegado', 'PCDF — Delegado de Polícia',
  'Polícia Civil do Distrito Federal — Delegado. Banca Cebraspe. Prova objetiva 120 questões + Discursiva 6h (3 questões + 1 peça) + Prova Oral + TAF + Avaliação Médica/Psicológica + Sindicância. Subsídio R$ 26.690,15. 216 vagas AC.',
  'POLICIAL'::"ConcursoArea", 'DF', 'PCDF', 'Delegado de Polícia', 'pcdf', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'pcdf-delegado');

UPDATE "courses" SET name = 'PCDF — Delegado de Polícia', area = 'POLICIAL', uf = 'DF', orgao = 'PCDF', cargo = 'Delegado de Polícia', "parentSlug" = 'pcdf', active = true
WHERE slug = 'pcdf-delegado';

-- EDITAL
UPDATE "editais" SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-delegado') AND ("numero" IS NULL OR "numero" <> '01/2026');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'pcdf-delegado'),
  (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  '01/2026', 2026,
  'Concurso PCDF 2026 — Delegado de Polícia — Edital nº 1 PCDF-DELEGADO/2026',
  '["Delegado de Polícia"]'::jsonb,
  216,
  26690.15,
  'Ensino Superior em Direito',
  '2026-02-03'::timestamp,
  120, 210, true, true, 'CE',
  'ABERTO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-delegado') AND e.numero = '01/2026'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  "totalQuestoes" = 120, "duracaoMin" = 210, "hasRedacao" = true,
  "wrongAnnulsRight" = true, "examFormat" = 'CE', status = 'ABERTO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '01/2026' AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'pcdf-delegado');

-- EDITAL_SUBJECTS (9 matérias, 120 questões)
DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pcdf-delegado' AND e.numero = '01/2026';

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 15.0, 15,
    'I DIREITO ADMINISTRATIVO: 1. Conceito e fontes. 2. Regime jurídico-administrativo e princípios. 3. Organização administrativa. 4. Atos administrativos (conceito, requisitos, atributos, classificação, espécies, extinção). 5. Poderes administrativos (regulamentar, hierárquico, disciplinar, polícia). 6. Agentes públicos (Lei 8.112/90, Lei distrital 4.949/2012, Lei 14.735/2023, classe, estágio probatório). 7. Servidores PCDF (Lei 9.264/96). 8. Licitações e contratos (Lei 14.133/2021). 9. Serviços públicos. 10. Bens públicos. 11. Responsabilidade civil do Estado. 12. Controle da Administração (Lei 8.429/92 — Improbidade, TCU). 13. Lei 9.784/99 (processo administrativo). 14. LAI (Lei 12.527/2011). II LEGISLAÇÃO COMPLEMENTAR: leis distritais pertinentes à PCDF e organização do DF.',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 15.0, "expectedQuestions" = 15, programa = EXCLUDED.programa, "order" = 1;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 15.0, 15,
    'I DIREITO CONSTITUCIONAL: 1. Direito constitucional (conceito, fontes). 2. Constituição (classificações). 3. Poder constituinte. 4. Controle de constitucionalidade. 5. Direitos e garantias fundamentais (individuais, sociais, políticos, remédios). 6. Organização do Estado, União/DF, repartição de competências. 7. Administração Pública e servidores. 8. Organização dos Poderes. 9. Defesa do Estado, Segurança Pública (art. 144 CF), atribuições da PCDF. 10. Lei Orgânica do DF (LODF). 11. Ordem social. II LEGISLAÇÃO COMPLEMENTAR: leis sobre organização e manutenção da PCDF, geopolítica e estrutura administrativa do DF.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 15.0, "expectedQuestions" = 15, programa = EXCLUDED.programa, "order" = 2;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-civil';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    'I DIREITO CIVIL: 1. LINDB (Lei de Introdução às Normas do Direito Brasileiro). 2. Pessoa natural e jurídica, personalidade, domicílio. 3. Bens. 4. Fatos jurídicos, prescrição/decadência, negócios jurídicos. 5. Direito das obrigações (modalidades, inadimplemento, perdas e danos). 6. Direitos reais (posse, propriedade, aquisição/perda). 7. Responsabilidade civil. 8. Direito de família e sucessões. II LEGISLAÇÃO COMPLEMENTAR: leis civis aplicáveis.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 3;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-empresarial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7,
    '[Agrupado com Civil] I DIREITO EMPRESARIAL: 1. Empresário (caracterização, inscrição). 2. Títulos de crédito (LC, cheque, NP, duplicata). 3. Sociedades (limitada, S/A, dissolução). 4. Estabelecimento empresarial. 5. Recuperação judicial/extrajudicial e falência (Lei 11.101/2005). 6. Propriedade industrial. 7. Sistema Financeiro Nacional.',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 4;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 18.0, 18,
    'I DIREITO PENAL: 1. Princípios e garantias penais. 2. Lei penal (tempo, espaço, interpretação). 3. Teoria do crime (tipicidade, ilicitude, culpabilidade). 4. Concurso de agentes. 5. Penas e medidas de segurança. 6. Extinção da punibilidade (prescrição). 7. Crimes em espécie (pessoa, patrimônio, dignidade sexual, paz pública, fé pública, Adm Pública). II LEGISLAÇÃO COMPLEMENTAR: 1. Lei 11.343/2006 (Drogas). 2. Lei 12.850/2013 (Crime Organizado). 3. Lei 9.613/1998 (Lavagem). 4. Lei 8.072/1990 (Hediondos). 5. Lei 9.455/1997 (Tortura). 6. Lei 7.716/1989 (preconceito). 7. Lei 9.605/1998 (Ambientais). 8. Lei 10.826/2003 (Desarmamento). 9. Lei 13.869/2019 (Abuso). 10. Lei 8.137/1990 (ordem econômica). 11. ECA, Lei do Idoso, Estatuto da PCD. 12. Convenção de Budapeste (Decreto 11.491/23).',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 18.0, "expectedQuestions" = 18, programa = EXCLUDED.programa, "order" = 5;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-financeiro-e-tributario';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    'I DIREITO TRIBUTÁRIO: 1. Estado e poder de tributar. 2. Direito tributário (conceito, princípios). 3. Tributos (conceito, espécies). 4. Código Tributário Nacional. 5. Normas gerais. 6. Obrigação tributária (fato gerador, sujeitos, responsabilidade). 7. Crédito tributário (constituição, suspensão, extinção). 8. Competência tributária. 9. Impostos federais, estaduais, municipais. 10. Limitações constitucionais ao poder de tributar. 11. Administração tributária (sigilo, dívida ativa, certidões). 12. Processo tributário. II LEGISLAÇÃO COMPLEMENTAR.',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 6;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'medicina-legal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    'MEDICINA LEGAL: 1. Perícia médico-legal (importância da prova pericial, corpo de delito). 2. Documentos médico-legais (laudo, parecer, atestado, relatório). 3. Antropologia forense (identificação, identidade). 4. Traumatologia forense (lesões corporais, agentes mecânicos/físicos/químicos/biológicos). 5. Tanatologia forense (morte, fenômenos cadavéricos, causa jurídica da morte). 6. Sexologia forense (crimes contra dignidade sexual, gravidez/aborto). 7. Toxicologia forense (intoxicações, drogas de abuso). 8. Psicopatologia forense (imputabilidade, transtornos mentais). 9. Genética forense (DNA). 10. Asfixiologia forense.',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 7;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 18.0, 18,
    'I DIREITO PROCESSUAL PENAL: 1. Direito processual penal (princípios, sistemas, fontes). 2. Inquérito policial (atribuições da polícia judiciária, notitia criminis, indiciamento, ANPP). 3. Ação penal. 4. Jurisdição e competência. 5. Provas (teoria geral, cadeia de custódia, meios de prova, ilícitas, perícias, busca/apreensão). 6. Prisões (flagrante, temporária, preventiva, cautelares diversas). 7. Liberdade provisória, fiança. 8. Procedimentos (ordinário, sumário, sumaríssimo). 9. Nulidades. 10. Recursos. II LEGISLAÇÃO COMPLEMENTAR: 1. Lei 9.296/96 (Interceptação). 2. Lei 9.099/95 (JECrim). 3. Lei 11.340/06 (Maria da Penha). 4. Lei 12.850/13 (OrCrim). 5. Lei 12.037/09 (Identificação). 6. Lei 12.830/13 (Investigação policial e Delegado). 7. Súmulas dos Tribunais Superiores.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 18.0, "expectedQuestions" = 18, programa = EXCLUDED.programa, "order" = 8;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-ambiental';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 15.0, 15,
    'I DIREITO AMBIENTAL: 1. Princípios. 2. CF/88 e meio ambiente. 3. Repartição de competências. 4. Normas de cooperação. 5. Poder de polícia ambiental. 6. Licenciamento ambiental. 7. Compensação ambiental. 8. Biossegurança. 9. Infrações administrativas ambientais. 10. Responsabilidade ambiental (civil, penal, administrativa). 11. EIA/RIMA. 12. SISNAMA. 13. Política Nacional do Meio Ambiente. 14. APP e Unidades de Conservação. 15. Crimes ambientais (Lei 9.605/98). 16. Proteção da fauna e flora. II LEGISLAÇÃO COMPLEMENTAR: leis distritais ambientais.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 15.0, "expectedQuestions" = 15, programa = EXCLUDED.programa, "order" = 9;

END $$;

-- COURSE_SUBJECTS
INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2026'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'pcdf-delegado'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

-- VERIFICAÇÃO
SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'pcdf-delegado' AND e.numero = '01/2026';
