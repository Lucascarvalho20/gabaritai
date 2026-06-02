-- ════════════════════════════════════════════════════════════════════════════
-- SEED PF 2025 — EDITAL Nº 1 PF-POLICIAL, DE 20/05/2025
-- Cargos: Delegado, Perito Criminal Federal, Escrivão, Agente, Papiloscopista
-- Banca: Cebraspe | Examformat: CE | wrongAnnulsRight: true (errar anula acerto)
-- Data: 2026-06-01
--
-- Fonte: Ed_1_PF_25_Abertura.pdf (PDF oficial Cebraspe)
--
-- IDEMPOTENTE em todo lugar. Reusa subjects existentes (direito-administrativo,
-- direito-constitucional, etc.) — varia só o PROGRAMA por edital_subject pra
-- refletir profundidade diferente conforme cargo (Delegado profundo vs noções).
--
-- Aplicar em: Supabase Dashboard → SQL Editor → New Query → cola tudo → Run.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. BANCA CEBRASPE
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (
  gen_random_uuid()::text,
  'cebraspe',
  'Cebraspe',
  'Centro Brasileiro de Pesquisa em Avaliação e Seleção (ex-Cespe/UnB). Banca dominante em concursos policiais federais (PF, PRF, PCDF) e do DF. Provas no formato CERTO/ERRADO com penalização por erro.',
  'CE',
  true,
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, style = EXCLUDED.style, active = true;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. SUBJECTS NOVOS (6) — só os que ainda não existem
--    Direito Administrativo/Constitucional/Civil/etc. JÁ existem, reusar.
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "subjects" (id, slug, name, description, area, active, "createdAt")
SELECT gen_random_uuid()::text, t.slug, t.name, t.description, t.area, true, NOW()
FROM (VALUES
  ('direito-ambiental', 'Direito Ambiental', 'Princípios, Constituição e meio ambiente, licenciamento, responsabilidade ambiental, crimes ambientais.', 'Conhecimentos Específicos'),
  ('nocoes-criminalistica', 'Noções de Criminalística', 'Conceitos básicos em Criminalística, vestígios, locais de crime, balística forense, Lei 12.030/2009.', 'Conhecimentos Específicos'),
  ('estatistica', 'Estatística', 'Estatística descritiva, probabilidade, inferência estatística, regressão linear, amostragem.', 'Conhecimentos Gerais'),
  ('contabilidade-geral', 'Contabilidade Geral', 'Patrimônio, atos e fatos, plano de contas, escrituração, demonstrações contábeis, Lei 6.404/76, CPC.', 'Conhecimentos Específicos'),
  ('arquivologia', 'Arquivologia', 'Princípios arquivísticos, gestão de documentos, classificação, avaliação, preservação, normas nacionais e internacionais.', 'Conhecimentos Específicos'),
  ('papiloscopia', 'Papiloscopia', 'Ciência papiloscópica, datiloscopia, quiroscopia, podoscopia, identificação humana, AFIS.', 'Conhecimentos Específicos')
) AS t(slug, name, description, area)
WHERE NOT EXISTS (
  SELECT 1 FROM "subjects" s WHERE s.slug = t.slug OR s.name = t.name
);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. COURSES (5) — pf-delegado, pf-perito, pf-escrivao, pf-agente, pf-papiloscopista
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT gen_random_uuid()::text, t.slug, t.name, t.description, 'POLICIAL'::"ConcursoArea", NULL, 'PF', t.cargo, 'pf', true, NOW()
FROM (VALUES
  ('pf-delegado', 'PF — Delegado de Polícia Federal', 'Polícia Federal — Delegado. Cargo de nível superior em Direito. Banca Cebraspe. Prova objetiva 120 questões + Discursiva (3 dissertações + 1 peça profissional) + Prova Oral + TAF + Avaliação Médica/Psicológica + Sindicância. Salário R$ 26.800.', 'Delegado de Polícia Federal'),
  ('pf-perito', 'PF — Perito Criminal Federal', 'Polícia Federal — Perito Criminal. 13 áreas técnicas (Contábil, Eng Elétrica, Informática Forense, Geologia, Eng Civil, Eng Cartográfica, Medicina Legal, Física Forense, Eng Minas, Genética Forense, Eng Ambiental, Antropologia, Meio Ambiente). Prova: 50 CB + 70 CE. Salário R$ 26.800.', 'Perito Criminal Federal'),
  ('pf-escrivao', 'PF — Escrivão de Polícia Federal', 'Polícia Federal — Escrivão. Nível superior. Banca Cebraspe. Prova: 60 Bloco I + 36 Bloco II + 24 Bloco III = 120 questões. Salário R$ 14.164,81. 360 vagas.', 'Escrivão de Polícia Federal'),
  ('pf-agente', 'PF — Agente de Polícia Federal', 'Polícia Federal — Agente. Nível superior. Banca Cebraspe. Prova: 60 Bloco I + 36 Bloco II + 24 Bloco III = 120 questões. Salário R$ 14.164,81. 1.416 vagas (maior número!).', 'Agente de Polícia Federal'),
  ('pf-papiloscopista', 'PF — Papiloscopista Policial Federal', 'Polícia Federal — Papiloscopista. Nível superior. Banca Cebraspe. Prova: 60 Bloco I + 36 Bloco II + 24 Bloco III = 120 questões. Salário R$ 14.164,81. 63 vagas.', 'Papiloscopista Policial Federal')
) AS t(slug, name, description, cargo)
WHERE NOT EXISTS (SELECT 1 FROM "courses" c WHERE c.slug = t.slug);

-- Reset isPrimary entre cursos do mesmo parentSlug se necessário (mantém cada slug separadamente)
UPDATE "courses" SET
  name = CASE slug
    WHEN 'pf-delegado' THEN 'PF — Delegado de Polícia Federal'
    WHEN 'pf-perito' THEN 'PF — Perito Criminal Federal'
    WHEN 'pf-escrivao' THEN 'PF — Escrivão de Polícia Federal'
    WHEN 'pf-agente' THEN 'PF — Agente de Polícia Federal'
    WHEN 'pf-papiloscopista' THEN 'PF — Papiloscopista Policial Federal'
  END,
  area = 'POLICIAL',
  orgao = 'PF',
  "parentSlug" = 'pf',
  active = true
WHERE slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista');

-- ──────────────────────────────────────────────────────────────────────────
-- 4. EDITAIS (5) — um por cargo, todos do mesmo "Edital nº 1 - PF 2025"
-- ──────────────────────────────────────────────────────────────────────────
-- Desativa editais antigos pra esses cursos
UPDATE "editais"
SET "isActive" = false
WHERE "courseId" IN (SELECT id FROM "courses" WHERE slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista'))
  AND ("numero" IS NULL OR "numero" <> '01/2025');

-- Cria editais novos
INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c.id,
  (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  '01/2025',
  2025,
  'Concurso PF 2025 — ' || c.cargo || ' — Edital nº 1 PF-POLICIAL/2025',
  ('["' || c.cargo || '"]')::jsonb,
  CASE c.slug
    WHEN 'pf-delegado' THEN 271
    WHEN 'pf-perito' THEN 162
    WHEN 'pf-escrivao' THEN 360
    WHEN 'pf-agente' THEN 1416
    WHEN 'pf-papiloscopista' THEN 63
  END,
  CASE c.slug
    WHEN 'pf-delegado' THEN 26800.00
    WHEN 'pf-perito' THEN 26800.00
    ELSE 14164.81
  END,
  'Ensino Superior Completo',
  '2025-05-20'::timestamp,
  120,
  CASE c.slug WHEN 'pf-delegado' THEN 210 ELSE 270 END, -- Delegado 3h30 obj; outros 4h30
  true,
  true,
  'CE',
  'ABERTO',
  true,
  NOW(),
  NOW()
FROM "courses" c
WHERE c.slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista')
  AND NOT EXISTS (
    SELECT 1 FROM "editais" e WHERE e."courseId" = c.id AND e.numero = '01/2025'
  );

-- Garante config correta mesmo se editais já existiam
UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  "totalQuestoes" = 120,
  "hasRedacao" = true,
  "wrongAnnulsRight" = true,
  "examFormat" = 'CE',
  status = 'ABERTO',
  "isActive" = true,
  "updatedAt" = NOW()
WHERE numero = '01/2025'
  AND "courseId" IN (SELECT id FROM "courses" WHERE slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista'));

-- ──────────────────────────────────────────────────────────────────────────
-- 5. EDITAL_SUBJECTS por cargo (programa varia conforme profundidade)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
  v_course_id text;
BEGIN
  -- ═══════ CARGO 1: DELEGADO (120 questões CE) ═══════
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pf-delegado' AND e.numero = '01/2025';

  -- Direito Administrativo (14q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 14.0, 14,
    '1. Introdução ao direito administrativo. 2. Administração pública (órgãos, servidores, competência). 3. Atos administrativos. 4. Poderes da Administração. 5. Serviços públicos (concessão, permissão, autorização). 6. Intervenção no domínio econômico. 7. Licitações (Lei 14.133/2021). 8. Contratos administrativos. 9. Controle da administração (TCU, Lei 8.429/92). 10. Agentes e servidores públicos (Lei 8.112/90, Lei 4.878/65, Lei 15.047/2024). 11. Bens públicos. 12. Responsabilidade civil do Estado. 13. Direito administrativo disciplinar. 14. Controle e Fiscalização de Segurança Privada (Lei 14.967/2024).',
    1)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 14.0, "expectedQuestions" = 14, programa = EXCLUDED.programa, "order" = 1;

  -- Direito Constitucional (12q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '1. Direito constitucional: natureza, conceito, fontes. 2. Constituição: sentidos, classificações, normas. 3. Poder constituinte. 4. Controle de constitucionalidade. 5. Direitos e garantias fundamentais (individuais, sociais, políticos, remédios). 6. Poder Legislativo. 7. Processo legislativo. 8. Poder Executivo. 9. Poder Judiciário (STF, STJ, TRFs). 10. Defesa do Estado e Segurança Pública. 11. Atribuições constitucionais da Polícia Federal. 12. Ordem social (seguridade, educação, meio ambiente, família, indígenas).',
    2)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 2;

  -- Direitos Humanos (6q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. Teoria geral dos DH (conceito, terminologia, estrutura, fundamentação). 2. Afirmação histórica e globalização. 3. Proteção internacional. 4. DH, direito humanitário e dos refugiados. 5. DH na CF/88. 6. Sistema internacional. 7. Convenções: Genocídio, Refugiados, Discriminação Racial, contra Mulher, contra Tortura, Desaparecimento Forçado. 8. Regras ONU para pessoas presas. 9. Princípios sobre Uso da Força (Havana 1990). 10. Lei 13.060/2014. 11. Decreto 12.341/2024 (instrumentos menor potencial ofensivo). 12. Programas nacionais (Decreto 7.037/2009).',
    3)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 3;

  -- Direito Civil (6q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-civil';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. LINDB, pessoa natural e jurídica, personalidade, domicílio, bens, fatos jurídicos, prescrição/decadência, negócios jurídicos. 2. Posse e propriedade (aquisição/perda, direito real, responsabilidade civil, teorias). 3. Comerciante/empresário (atividade comercial, sociedades, dissolução). 4. Títulos de crédito (Genebra, NP, duplicata, cheque).',
    4)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 4;

  -- Direito Processual Civil (4q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-civil';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. Jurisdição (natureza, conceito, princípios, equivalentes — autotutela, autocomposição, mediação, arbitragem). 2. Jurisdição constitucional das liberdades (HC, MS individual/coletivo, HD, ação popular, ação civil pública). 3. Competência (conceito, critérios, foro, modificações, justiça federal). 4. Tutela (jurídica/jurisdicional, urgência/evidência, antecipação, cautelar, poder geral de cautela). 5. Formação, suspensão e extinção do processo.',
    5)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 5;

  -- Direito Empresarial (4q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-empresarial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. Direito comercial (origem, fontes, empresário). 2. Títulos de créditos (LC, cheque, NP, duplicata, endosso, protesto, prescrição). 3. Espécies de empresa (responsabilidade, distribuição lucros). 4. Direito societário (sociedades personificadas/não, limitada, S/A, recuperação, falência). 5. Sistema Financeiro Nacional.',
    6)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 6;

  -- Direito Internacional Público e Cooperação Internacional (10q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-internacional-publico-e-cooperacao-internacional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '1. Direito internacional público (conceito, fontes, princípios). 2. Tratados (validade, ratificação, vigência, incorporação). 3. Convenção de Palermo (Decreto 5.015/2004), Decreto 5.017/2004 (tráfico de pessoas). 4. Atribuições da PF em tratados internacionais. 5. Personalidade internacional (Estado, organizações, nacionalidade, estrangeiros, asilo). 6. Proteção internacional dos DH. 7. Conflitos internacionais. 8. Domínio público internacional (mar, espaço aéreo). 9. Cooperação policial e jurídica internacional. 10. Lei 13.445/2017 (Migração). 11. Decretos 154/1991, 3.468/2000, 5.015/2004, 5.016/2004, 5.017/2004, 5.687/2006, 5.941/2006, 6.340/2008, 8.833/2016, 12.337/2024. 12. Arts. 26-41 do CPC.',
    7)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 7;

  -- Direito Penal (18q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 18.0, 18,
    '1. Introdução ao direito penal. 2. Lei penal (características, fontes, tempo e espaço, imunidades, concurso aparente de normas). 3. Teoria geral do crime (conduta, tipicidade, culpabilidade, concurso de crimes, crime continuado). 4. Teoria do tipo (doloso, culposo, preterdoloso, erro, classificação, iter criminis, tentativa, arrependimento, crime impossível). 5. Ilicitude (legítima defesa, estado necessidade, estrito cumprimento, exercício regular). 6. Culpabilidade (imputabilidade, erro de proibição). 7. Concurso de agentes. 8. Penas (cominação, privativa, restritiva, multa, regimes, livramento condicional). 9. Extinção da punibilidade (prescrição). 10. Crimes em espécie (pessoa, patrimônio, dignidade sexual, paz pública, fé pública, administração pública, finanças). 11. Leis especiais: 11.343/06 (Drogas), 12.850/13 (Crime Organizado), 7.492/86 (SFN), 8.137/90 (ordem econômica), 9.613/98 (Lavagem), 8.072/90 (Hediondos), 7.716/89 (preconceito), 9.455/97 (Tortura), 9.605/98 (Ambientais), DL 201/67, 11.101/05 (falimentares), 14.133/21 (licitações). 12. Lei 13.869/19 (Abuso de Autoridade). 13. Lei 10.826/03 (Desarmamento). 14. Convenção de Budapeste (Decreto 11.491/23 — Crime Cibernético). 15. ECA, Lei do Idoso, Estatuto da PCD.',
    8)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 18.0, "expectedQuestions" = 18, programa = EXCLUDED.programa, "order" = 8;

  -- Direito Processual Penal (18q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 18.0, 18,
    '1. Direito processual penal (princípios, conceito, sistemas). 2. Inquérito policial (histórico, características, notitia criminis, indiciamento, prazos). 3. Atribuições da PF na persecução criminal (Lei 10.446/2002). 4. Competência (justiça federal, TRF, STJ, STF, conflitos). 5. Processo criminal (sistemas, ação penal, sujeitos). 6. Juizados especiais criminais na justiça federal. 7. Provas (princípios, ônus, ilícitas, perícias, busca/apreensão). 8. Prisão (espécies, flagrante, temporária, preventiva, fiança, liberdade provisória). 9. Sentença criminal. 10. Crimes especiais (Drogas, Crime Organizado, SFN, ordem econômica, Lavagem, Hediondos, preconceito, Tortura, Ambientais, falimentares, licitações). 11. Lei 9.296/96 (Interceptação Telefônica). 12. Lei 13.869/19 (Abuso). 13. Lei 10.826/03. 14. Lei 12.830/2013. 15. Lei 12.737/12 (Crimes Cibernéticos). 16. ECA, Estatuto Idoso, Lei 13.060/2014. 17. Súmulas dos Tribunais Superiores.',
    9)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 18.0, "expectedQuestions" = 18, programa = EXCLUDED.programa, "order" = 9;

  -- Criminologia (4q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'criminologia';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. Criminologia (conceito, métodos: empirismo, interdisciplinaridade). 2. Objetos (delito, delinquente, vítima, controle social). 3. Funções (política criminal, direito penal). 4. Modelos teóricos: teorias sociológicas, prevenção primária/secundária/terciária, modelos de reação ao crime.',
    10)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 10;

  -- Direito Previdenciário (6q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-previdenciario';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. Seguridade social (conceito, CF, princípios). 2. Financiamento (contribuições sociais, salário de contribuição, arrecadação). 3. RGPS (segurados obrigatórios/facultativos, dependentes, benefícios, carência, cálculo, RMI). 4. Decadência e prescrição. 5. Crimes contra previdência (apropriação, sonegação, estelionato contra INSS, fé pública). 6. Lei 8.212/91, 8.213/91 e Decreto 3.048/99 (aspectos criminais).',
    11)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 11;

  -- Direito Financeiro e Tributário (8q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-financeiro-e-tributario';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '1. Finanças públicas na CF/88 (orçamento, espécies, princípios). 2. Despesa e receita pública. 3. Dívida ativa, crédito público. 4. Sistema Tributário Nacional (limitações, competências). 5. Fontes do direito tributário. 6. Obrigação tributária (fato gerador, sujeitos, responsabilidade). 7. Crédito tributário (constituição, lançamento, suspensão, extinção). 8. Competência tributária. 9. Impostos federais (II, IPI, IOF, IR PF/PJ). 10. Taxas, contribuições, empréstimo compulsório. 11. Administração tributária.',
    12)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 12;

  -- Direito Ambiental (10q)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-ambiental';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '1. Princípios do Direito Ambiental. 2. CF/88 e meio ambiente. 3. Repartição de competências, normas de cooperação. 4. Poder de polícia, licenciamento, compensação, biossegurança, infrações. 5. Responsabilidade ambiental (conceito, reparação, extração mineral irregular). 6. SISNAMA, Política Nacional, Política Energética, Saneamento. 7. EIA (conceito, competências, requisitos). 8. Biodiversidade (proteção, conhecimento tradicional). 9. Proteção às florestas. 10. APP e Unidades de Conservação. 11. Crimes ambientais.',
    13)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 13;

  -- ═══════ CARGO 2: PERITO CRIMINAL (50 CB + 70 CE = 120q) ═══════
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pf-perito' AND e.numero = '01/2025';

  -- LP (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '1. Compreensão e interpretação de textos. 2. Tipologia/gêneros textuais. 3. Ortografia oficial. 4. Mecanismos de coesão (referenciação, conectores, sequenciação, tempos/modos verbais). 5. Estrutura morfossintática (classes, coordenação, subordinação, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita (significação, substituição, reorganização). 7. Correspondência oficial (Manual da Presidência).',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;

  -- Informática (8)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '1. Componentes (hardware/software). 2. SOs (Windows, Android, iOS). 3. Navegadores, webmail, Office 365. 4. Segurança (malware, phishing, MFA, certificação digital). 5. Cloud computing. 6. Banco de dados (relacional, chaves). 7. Redes (LAN/MAN/WAN, TCP/IP, NAT, VPN, RDP). 8. Programação (Python, Low/No-Code). 9. Metadados, ML, mineração, big data, IA Generativa.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 2;

  -- Noções de Direito Administrativo (5) — reusa direito-administrativo com programa enxuto
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[NOÇÕES] 1. Organização administrativa (centralização, descentralização, direta/indireta, autarquias, fundações). 2. Ato administrativo (conceito, requisitos, atributos, classificação). 3. Agentes públicos (Lei 8.112/90, espécies, cargo/emprego/função). 4. Poderes administrativos (hierárquico, disciplinar, regulamentar, polícia). 5. Licitação (princípios, dispensa, inexigibilidade, modalidades). 6. Controle da Adm Pública. 7. Responsabilidade civil do Estado. 8. Regime jurídico-administrativo.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 3;

  -- Noções de Direito Constitucional (4) — reusa direito-constitucional
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '[NOÇÕES] 1. Direitos e garantias fundamentais (individuais, sociais, políticos, partidos, garantias). 2. Poder Executivo (forma/sistema de governo, chefia). 3. Defesa do Estado e segurança pública. 4. Ordem social (base, seguridade, meio ambiente, família, indígenas).',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 4;

  -- Noções de Direito Penal e Processual Penal (6) — reusa direito-penal (peso conjunto)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 3.0, 3,
    '[NOÇÕES] 1. Princípios básicos. 2. Aplicação da lei penal (tempo, espaço, lugar do crime, territorialidade). 3. Fato típico (consumado, tentado, ilicitude, excesso). 4. Crimes contra a pessoa, patrimônio, fé pública, Administração Pública.',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 3.0, "expectedQuestions" = 3, programa = EXCLUDED.programa, "order" = 5;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 3.0, 3,
    '[NOÇÕES] 1. Inquérito policial (histórico, características, indiciamento, garantias). 2. Provas (corpo de delito, perícias no CPP, cadeia de custódia, requisitos, nulidade, busca/apreensão). 3. Restrição de liberdade (prisão em flagrante). 4. Função pericial do Estado (Perícia Criminal Federal, Polícias Científicas, Lei 12.030/2009).',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 3.0, "expectedQuestions" = 3, programa = EXCLUDED.programa, "order" = 6;

  -- Noções de Criminalística (5)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'nocoes-criminalistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '1. Conceitos básicos (Ciências Forenses, Perícia criminal/civil, vestígio/evidência/indício, Princípio de Locard, classificação dos vestígios, fotografia pericial). 2. Áreas da Criminalística Moderna. 3. Locais de crime (isolamento, preservação, processamento pericial, busca/coleta/acondicionamento de vestígios). 4. Locais de crime contra a vida (perinecriscópico, tanatologia, traumatologia). 5. Balística forense (arma de fogo, calibre, cartucho, resíduos do tiro). 6. Laudo pericial. 7. Avanços (bancos de perfis genéticos/balísticos, isótopos).',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 7;

  -- Direitos Humanos (4)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4,
    '1. DH na CF/88. 2. Sistema internacional. 3. Convenções: Genocídio, Refugiados, Discriminação Racial, contra Mulher, contra Tortura, Desaparecimento Forçado. 4. Regras ONU presos. 5. Princípios sobre Uso da Força (Havana 1990). 6. Lei 13.060/2014. 7. Decreto 12.341/2024.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 8;

  -- Raciocínio Lógico (6)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '1. Estruturas lógicas. 2. Lógica de argumentação (analogias, inferências, deduções). 3. Lógica sentencial (proposições, tabelas verdade, equivalências, De Morgan, diagramas). 4. Lógica de 1ª ordem. 5. Princípios de contagem e probabilidade. 6. Operações com conjuntos. 7. Problemas aritméticos, geométricos, matriciais.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 9;

  -- CE da área forense (70q — placeholder genérico)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'nocoes-criminalistica';
  -- Já adicionado acima como CB; pra CE, criamos uma matéria adicional via legislacao-especial como wrapper
  -- Mas pra evitar duplicar subject, vamos usar área forense via subject específico.
  -- Alternativa: pular CE específico no curso genérico (alunos veem aviso) E somar 70q ao Criminalística como "geral"
  -- Decisão: aumentar Criminalística pra 5+70 = NÃO. Manter Criminalística em 5 e adicionar nota.
  -- Pra fechar 120q, distribuir 70 CE em area Criminalística aumentando peso a 75:
  UPDATE "edital_subjects"
  SET weight = 75.0, "expectedQuestions" = 75,
      programa = programa || E'\n\n[CONHECIMENTOS ESPECÍFICOS POR ÁREA — 70 questões adicionais] Conteúdo varia por área de inscrição: ÁREA 1 Contábil-Financeira; ÁREA 2 Eng Elétrica/Eletrônica; ÁREA 3 Informática Forense; ÁREA 5 Geologia Forense; ÁREA 7 Eng Civil; ÁREA 11 Eng Cartográfica; ÁREA 12 Medicina Legal; ÁREA 16 Física Forense; ÁREA 17 Eng Minas; ÁREA 19 Genética Forense; ÁREA 20 Eng Ambiental; ÁREA 21 Antropologia Forense; ÁREA 22 Meio Ambiente. Veja Anexo VII do edital.'
  WHERE "editalId" = v_edital_id AND "subjectId" = v_subject_id;

  -- ═══════ CARGOS 15, 16, 17: ESCRIVÃO, AGENTE, PAPILOSCOPISTA ═══════
  -- Estrutura idêntica de Bloco I (60q) — vou usar loop manual

  -- Função auxiliar: insere bloco comum
  -- Como não temos function, repete-se inline pra cada cargo.

  -- ─── ESCRIVÃO (cargo 15) ───
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pf-escrivao' AND e.numero = '01/2025';

  -- BLOCO I (60 questões) — comum a Escrivão/Agente/Papilo
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] 1. Compreensão e interpretação de textos. 2. Tipologia/gêneros. 3. Ortografia. 4. Coesão. 5. Estrutura morfossintática (classes, sintaxe, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita. 7. Correspondência oficial (Manual Presidência).', 1)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7, '[BLOCO I - NOÇÕES] 1. Organização administrativa. 2. Ato administrativo (conceito, requisitos, atributos, classificação). 3. Agentes públicos (Lei 8.112/90, cargo/emprego/função). 4. Poderes administrativos. 5. Licitação. 6. Controle da Adm Pública. 7. Responsabilidade civil do Estado. 8. Regime jurídico-administrativo.', 2)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 2;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] 1. Direitos e garantias fundamentais. 2. Poder Executivo. 3. Defesa do Estado e segurança pública. 4. Ordem social.', 3)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 3;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] 1. Princípios. 2. Aplicação da lei penal (tempo, espaço). 3. Fato típico (consumado/tentado, ilicitude). 4. Crimes contra pessoa, patrimônio, fé pública, Adm Pública.', 4)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 4;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] 1. Inquérito policial. 2. Provas (preservação do local, ônus, nulidade, reconhecimento, acareação, busca/apreensão). 3. Prisão em flagrante.', 5)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 5;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] 1. DH na CF/88. 2. Sistema internacional. 3. Convenções (Genocídio, Refugiados, Discriminação Racial, Mulher, Tortura, Desaparecimento). 4. Regras ONU. 5. Uso da Força (Havana). 6. Lei 13.060/2014. 7. Decreto 12.341/2024.', 6)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 6;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] 1. Lei 14.967/2024 (Segurança Privada). 2. Lei 10.357/2001 (produtos químicos). 3. Lei 13.445/2017 (Migração). 4. Lei 11.343/2006 (Drogas). 5. Lei 9.455/1997 (Tortura). 6. Lei 8.069/1990 (ECA). 7. Lei 10.826/2003 (Desarmamento). 8. Lei 9.605/1998 (Ambientais). 9. Lei 10.446/2002. 10. Leis 13.444/2017, 14.534/2023, 7.116/1983. 11. Decretos 10.977/2022, 11.797/2023. 12. Lei 9.545/1997 (RIC). 13. Decreto 11.491/2023 (Convenção Crime Cibernético).', 7)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 7;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'estatistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4, '[BLOCO I] 1. Estatística descritiva (gráficos, medidas). 2. Probabilidade (condicional, independência, distribuições, Bayes). 3. Variáveis aleatórias e funções. 4. Distribuições (uniforme, Bernoulli, binomial, normal). 5. Medidas de tendência central e dispersão. 6. Correlação de Pearson. 7. Teorema Central do Limite, Regra dos Três Sigma. 8. Técnicas de amostragem. 9. Inferência (estimação, intervalos, testes t e qui-quadrado). 10. Regressão linear.', 8)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 8;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] 1. Estruturas lógicas. 2. Lógica de argumentação. 3. Lógica sentencial (proposições, tabelas verdade, equivalências, De Morgan, diagramas). 4. Lógica 1ª ordem. 5. Contagem e probabilidade. 6. Conjuntos. 7. Problemas aritméticos, geométricos, matriciais.', 9)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 9;

  -- BLOCO II (36) - Escrivão
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 36.0, 36, '[BLOCO II] 1. Internet, intranet, navegadores. 2. SO Linux e Windows. 3. Office/LibreOffice. 4. Redes (IPv4/IPv6, OSI, TCP/IP, protocolos). 5. Segurança (vírus, worms, antivírus, firewall, MFA). 6. Cloud computing. 7. Teoria Geral de Sistemas. 8. Sistemas de informação. 9. Banco de dados (modelagem, SQL, relacional, big data). 10. Mineração, ML, IA. 11. Programação Python e R. 12. Metadados. 13. Formatos NIST, XML, JSON. 14. Criptografia (hash, assinaturas).', 10)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 36.0, "expectedQuestions" = 36, programa = EXCLUDED.programa, "order" = 10;

  -- BLOCO III (24) - Escrivão: Contabilidade Geral (12) + Arquivologia (12)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'contabilidade-geral';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO III] 1. Conceitos, objetivos e finalidades. 2. Patrimônio (componentes, equação fundamental). 3. Atos e fatos administrativos (permutativos, modificativos, mistos). 4. Contas (débitos, créditos, saldos). 5. Plano de contas. 6. Escrituração (lançamentos, livros, regime competência/caixa). 7. Operações contábeis (juros, descontos, tributos, folha, depreciação). 8. Balancete. 9. Balanço patrimonial. 10. DRE. 11. Lei 6.404/1976 e CPC. 12. NBC TSP Estrutura Conceitual.', 11)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 11;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'arquivologia';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO III] 1. Arquivística (princípios, conceitos). 2. Políticas públicas e legislação. 3. Normas nacionais/internacionais. 4. Sistemas e redes de arquivo. 5. Gestão de documentos. 6. Diagnóstico arquivístico. 7. Protocolo (recebimento, registro, distribuição, tramitação, expedição). 8. Funções arquivísticas (criação, aquisição, classificação, avaliação, difusão, descrição, preservação). 9. Análise tipológica. 10. Acesso aos documentos. 11. Sistemas informatizados (documentos digitais, metadados). 12. Microfilmagem.', 12)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 12;

  -- ─── AGENTE (cargo 16) — Bloco I idêntico Escrivão + Informática 36 + Contabilidade Geral 24 ───
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pf-agente' AND e.numero = '01/2025';

  -- BLOCO I (60) — mesmas matérias do Escrivão
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] LP padrão Cebraspe — ver mesmo programa de Escrivão/Papiloscopista.', 1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 2;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 3;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 4;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 5;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] Mesmo programa de Escrivão.', 6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 6;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] Mesmo programa de Escrivão.', 7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 7;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'estatistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4, '[BLOCO I] Mesmo programa de Escrivão.', 8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 8;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] Mesmo programa de Escrivão.', 9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 9;

  -- BLOCO II (36) - Agente: Informática
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 36.0, 36, '[BLOCO II] Mesmo programa de Informática Escrivão.', 10) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 36.0, "expectedQuestions" = 36, programa = EXCLUDED.programa, "order" = 10;

  -- BLOCO III (24) - Agente: SÓ Contabilidade Geral 24q (sem Arquivologia)
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'contabilidade-geral';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 24.0, 24, '[BLOCO III] Mesmo programa de Contabilidade Geral do Escrivão (24 questões pro Agente — não tem Arquivologia).', 11) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 24.0, "expectedQuestions" = 24, programa = EXCLUDED.programa, "order" = 11;

  -- ─── PAPILOSCOPISTA (cargo 17) — Bloco I igual + Informática 36 + Papiloscopia 24 ───
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'pf-papiloscopista' AND e.numero = '01/2025';

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] LP padrão Cebraspe — ver programa de Escrivão.', 1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 2;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 3;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 4;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I - NOÇÕES] Mesmo programa de Escrivão.', 5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 5;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] Mesmo programa de Escrivão.', 6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 6;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12, '[BLOCO I] Mesmo programa de Escrivão.', 7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 7;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'estatistica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 4.0, 4, '[BLOCO I] Mesmo programa de Escrivão.', 8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 4.0, "expectedQuestions" = 4, programa = EXCLUDED.programa, "order" = 8;
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5, '[BLOCO I] Mesmo programa de Escrivão.', 9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 9;

  -- BLOCO II (36) - Papilo: Informática
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 36.0, 36, '[BLOCO II] Mesmo programa Informática Escrivão + ênfase em biometria/NIST.', 10) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 36.0, "expectedQuestions" = 36, programa = EXCLUDED.programa, "order" = 10;

  -- BLOCO III (24) - Papiloscopista: Papiloscopia
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'papiloscopia';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order") VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 24.0, 24, '[BLOCO III] 1. Ciência papiloscópica (histórico, princípios — perenidade, imutabilidade, variabilidade). 2. Datiloscopia (sistema Vucetich). 3. Quiroscopia, podoscopia. 4. Classificação e identificação humana. 5. Coleta e revelação de impressões latentes. 6. AFIS (Automated Fingerprint Identification System). 7. Métodos físicos e químicos de revelação. 8. Lei 12.030/2009. 9. Lei 7.116/1983 e Decreto 10.977/2022 (CIN). 10. Lei 9.545/1997 (RIC). 11. Conteúdo específico publicado em Anexo VII do edital.', 11)
  ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 24.0, "expectedQuestions" = 24, programa = EXCLUDED.programa, "order" = 11;

END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. COURSE_SUBJECTS — espelha edital_subjects pra o curso
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT
  gen_random_uuid()::text,
  c.id,
  es."subjectId",
  es.weight,
  es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2025'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista')
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET
  weight = EXCLUDED.weight,
  "order" = EXCLUDED."order";

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — resultado esperado: 5 rows, todas com 120 questões
-- ════════════════════════════════════════════════════════════════════════════
SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao", e."wrongAnnulsRight",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug IN ('pf-delegado','pf-perito','pf-escrivao','pf-agente','pf-papiloscopista')
  AND e.numero = '01/2025'
ORDER BY c.slug;
