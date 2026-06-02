-- ════════════════════════════════════════════════════════════════════════════
-- SEED PRF 2021 — Edital nº 1 PRF, de 18/01/2021
-- Cargo único: Policial Rodoviário Federal | Banca: Cebraspe
-- Data: 2026-06-01
--
-- Fonte: ED_1_PRF_2021_ABERTURA.PDF.pdf (Cebraspe)
-- Subsídio: R$ 9.899,88 | Prova: 120 questões CE binárias + Discursiva 30 linhas
--
-- IDEMPOTENTE em todo lugar.
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. BANCA Cebraspe — já criada pelo PF, só garante
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "bancas" (id, slug, name, description, style, active, "createdAt")
VALUES (gen_random_uuid()::text, 'cebraspe', 'Cebraspe', 'Centro Brasileiro de Pesquisa em Avaliação e Seleção. Formato CERTO/ERRADO com penalização.', 'CE', true, NOW())
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. SUBJECTS NOVOS (3) — Física, Ética e Cidadania, Geopolítica
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "subjects" (id, slug, name, description, area, active, "createdAt")
SELECT gen_random_uuid()::text, t.slug, t.name, t.description, t.area, true, NOW()
FROM (VALUES
  ('fisica', 'Física', 'Cinemática, dinâmica (Leis de Newton), trabalho, energia, quantidade de movimento, colisões.', 'Conhecimentos Gerais'),
  ('etica-cidadania', 'Ética e Cidadania', 'Ética e moral, princípios e valores, ética na função pública (CF, Lei 8.112/90, decretos), Lei de Acesso à Informação, conflitos de interesses.', 'Conhecimentos Gerais'),
  ('geopolitica', 'Geopolítica do Brasil', 'Brasil político, organização do Estado, divisão regional, estrutura urbana, população, migrações, transporte, biomas e gestão ambiental.', 'Conhecimentos Gerais')
) AS t(slug, name, description, area)
WHERE NOT EXISTS (
  SELECT 1 FROM "subjects" s WHERE s.slug = t.slug OR s.name = t.name
);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. COURSE prf-policial
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "courses" (id, slug, name, description, area, uf, orgao, cargo, "parentSlug", active, "createdAt")
SELECT
  gen_random_uuid()::text, 'prf-policial', 'PRF — Policial Rodoviário Federal',
  'Polícia Rodoviária Federal — cargo único: Policial Rodoviário Federal, Padrão I da 3ª Classe. Banca Cebraspe. Prova objetiva 120 questões (Bloco I 55 + II 30 + III 35) + Discursiva 30 linhas + TAF + Avaliação Psicológica + Avaliação Médica + Investigação Social. Subsídio R$ 9.899,88.',
  'POLICIAL'::"ConcursoArea", NULL, 'PRF', 'Policial Rodoviário Federal', 'prf', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "courses" WHERE slug = 'prf-policial');

UPDATE "courses" SET
  name = 'PRF — Policial Rodoviário Federal',
  area = 'POLICIAL', orgao = 'PRF', cargo = 'Policial Rodoviário Federal', "parentSlug" = 'prf', active = true
WHERE slug = 'prf-policial';

-- ──────────────────────────────────────────────────────────────────────────
-- 4. EDITAL 01/2021 (ativo)
-- ──────────────────────────────────────────────────────────────────────────
UPDATE "editais"
SET "isActive" = false
WHERE "courseId" = (SELECT id FROM "courses" WHERE slug = 'prf-policial')
  AND ("numero" IS NULL OR "numero" <> '01/2021');

INSERT INTO "editais" (
  id, "courseId", "bancaId", numero, ano, titulo, cargos, vagas, salario, escolaridade,
  "dataAbertura", "totalQuestoes", "duracaoMin", "hasRedacao", "wrongAnnulsRight", "examFormat",
  status, "isActive", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  (SELECT id FROM "courses" WHERE slug = 'prf-policial'),
  (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  '01/2021', 2021,
  'Concurso PRF 2021 — Policial Rodoviário Federal — Edital nº 1, de 18/01/2021',
  '["Policial Rodoviário Federal"]'::jsonb,
  1500,
  9899.88,
  'Ensino Superior Completo',
  '2021-01-18'::timestamp,
  120, 270, true, true, 'CE',
  'HOMOLOGADO', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "editais" e
  WHERE e."courseId" = (SELECT id FROM "courses" WHERE slug = 'prf-policial') AND e.numero = '01/2021'
);

UPDATE "editais" SET
  "bancaId" = (SELECT id FROM "bancas" WHERE slug = 'cebraspe'),
  "totalQuestoes" = 120, "duracaoMin" = 270, "hasRedacao" = true,
  "wrongAnnulsRight" = true, "examFormat" = 'CE', status = 'HOMOLOGADO',
  "isActive" = true, "updatedAt" = NOW()
WHERE numero = '01/2021'
  AND "courseId" = (SELECT id FROM "courses" WHERE slug = 'prf-policial');

-- ──────────────────────────────────────────────────────────────────────────
-- 5. EDITAL_SUBJECTS (14 matérias = 55 + 30 + 35 = 120 questões)
-- ──────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_edital_id text;
  v_subject_id text;
BEGIN
  SELECT e.id INTO v_edital_id FROM "editais" e JOIN "courses" c ON c.id = e."courseId" WHERE c.slug = 'prf-policial' AND e.numero = '01/2021';

  -- ═══ BLOCO I (55 questões) ═══
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 12.0, 12,
    '[BLOCO I] 1. Compreensão/interpretação de textos. 2. Tipologia/gêneros. 3. Ortografia. 4. Coesão (referenciação, conectores, tempos verbais). 5. Estrutura morfossintática (classes, coordenação/subordinação, pontuação, concordância, regência, crase, colocação pronominal). 6. Reescrita (significação, substituição, reorganização). 7. Correspondência oficial (Manual da Presidência).',
    1) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 12.0, "expectedQuestions" = 12, programa = EXCLUDED.programa, "order" = 1;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'raciocinio-logico';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 10.0, 10,
    '[BLOCO I - RACIOCÍNIO LÓGICO-MATEMÁTICO] 1. Modelagem por equações 1º/2º graus e sistemas lineares. 2. Funções (afim, quadrática, exponencial, logarítmica, análise gráfica). 3. Razão/proporção, regra de três simples/composta. 4. Porcentagem. 5. Sequências (PA, PG). 6. Contagem, probabilidade, estatística. 7. Tabelas e gráficos (médias, desvios). 8. Conjuntos. 9. Figuras planas (escalas, projeções, planificações). 10. Áreas e volumes.',
    2) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 10.0, "expectedQuestions" = 10, programa = EXCLUDED.programa, "order" = 2;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'informatica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 8.0, 8,
    '[BLOCO I] 1. Internet/intranet. 2. Navegadores, correio, redes sociais, busca, ferramentas colaborativas. 3. Sistema operacional Windows. 4. Acesso remoto, transferência de arquivos, multimídia. 5. Transformação digital (IoT, Big Data, IA). 6. Proteção e segurança (vírus, worms, phishing, antivírus, firewall, VPN). 7. Cloud computing.',
    3) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 8.0, "expectedQuestions" = 8, programa = EXCLUDED.programa, "order" = 3;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'fisica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO I] 1. Cinemática escalar e vetorial. 2. Movimento circular. 3. Leis de Newton e aplicações. 4. Trabalho. 5. Potência. 6. Energia cinética, potencial, atrito. 7. Conservação de energia e transformações. 8. Quantidade de movimento e conservação, impulso. 9. Colisões.',
    4) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 4;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'etica-cidadania';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO I] 1. Ética e moral. 2. Ética, princípios e valores. 3. Ética e função pública: integridade. 4. Ética no setor público (princípios CF art. 37, deveres do servidor Lei 8.112/90 art. 116, IX). 5. Política de governança (Decreto 9.203/2017). 6. Código de Ética do Servidor Federal (Decreto 1.171/1994). 7. Sistema de Gestão da Ética (Decreto 6.029/2007). 8. Código de Conduta da Alta Administração. 9. Cidadania, transparência ativa, Lei de Acesso à Informação (Lei 12.527/2011, Decreto 7.724/2012). 10. Conflitos de interesses e nepotismo (Lei 12.813/2013, Decreto 7.203/2010).',
    5) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 5;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'geopolitica';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 7.0, 7,
    '[BLOCO I - GEOPOLÍTICA DO BRASIL] 1. Brasil político: nação e território. 2. Organização do Estado Brasileiro. 3. Divisão inter-regional do trabalho e produção. 4. Estrutura urbana e grandes metrópoles. 5. Distribuição espacial da população e movimentos migratórios internos. 6. Integração indústria/estrutura urbana/agrícola. 7. Rede de transporte (modais e infraestruturas). 8. Integração ao processo de internacionalização da economia. 9. Geografia e gestão ambiental. 10. Macrodivisão natural: biomas, domínios, ecossistemas.',
    6) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 7.0, "expectedQuestions" = 7, programa = EXCLUDED.programa, "order" = 6;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-inglesa';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO I - LÍNGUA ESTRANGEIRA (Inglês OU Espanhol — opção no ato da inscrição)] I. LÍNGUA INGLESA: 1. Compreensão de texto escrito em inglês. 2. Itens gramaticais relevantes para compreensão semântica. II. LÍNGUA ESPANHOLA: 1. Compreensão de texto escrito em espanhol. 2. Itens gramaticais relevantes para compreensão semântica.',
    7) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 7;

  -- ═══ BLOCO II (30 questões) ═══
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-transito';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 30.0, 30,
    '[BLOCO II — MATÉRIA DE MAIOR PESO!] 1. Lei 9.503/1997 — Código de Trânsito Brasileiro (CTB) e alterações, inclusive Lei 14.071/2020. 2. Lei 5.970/1973. 3. Resoluções do CONTRAN (extensas, listadas no edital): 04/98, 14/98, 24/98, 36/98, 92/98 (exceto anexos), 110/00, 160/04, 210/11, 211/06, 216/06, 227/07 (exceto anexos), 253/07, 254/07, 268/08, 290/08, 292/08, 349/10, 360/10, 432/13, 441/13, 453/13, 471/13, 508/14, 520/15, 525/15, 552/15 (exceto anexos), 561/15 (exceto fichas), 619/16, 667/17 (exceto anexos), 723/18, 735/18 (exceto anexos), 740/18, 780/19, 789/20 Anexo I, 798/20, 803/20, 806/20, 809/20, 810/20.',
    8) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 30.0, "expectedQuestions" = 30, programa = EXCLUDED.programa, "order" = 8;

  -- ═══ BLOCO III (35 questões) ═══
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO III] 1. Organização administrativa (centralização, descentralização, Adm direta/indireta, autarquias, fundações). 2. Ato administrativo. 3. Agentes públicos (Lei 8.112/90, Lei 9.654/98 [carreira PRF], Lei 12.855/2013 [indenização fronteiras], Lei 13.712/2018 [indenização PRF], Decreto 8.282/2014 [carreira PRF]). 4. Poderes administrativos. 5. Licitação. 6. Controle da Administração. 7. Responsabilidade civil do Estado. 8. Regime jurídico-administrativo.',
    9) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 9;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO III] 1. Poder constituinte (originário, derivado, reforma, emendas, limitações). 2. Direitos e deveres fundamentais (vida, liberdade, igualdade, segurança, propriedade, sociais, nacionalidade, políticos, garantias, remédios). 3. Poder Executivo. 4. União: bens e competências (arts. 20-24 CF). 5. Defesa do Estado, Forças Armadas (art. 142 CF), Segurança Pública (art. 144), atribuições constitucionais da PRF. 6. Ordem social (seguridade, meio ambiente, família, indígenas).',
    10) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 10;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO III] 1. Princípios. 2. Aplicação da lei penal (tempo, espaço, lugar do crime, territorialidade, extraterritorialidade, conflito). 3. Tipicidade (doloso, culposo, erro, consumado/tentado, impossível, punibilidade). 4. Ilicitude. 5. Culpabilidade (imputabilidade, erro de proibição). 6. Crimes: contra a pessoa, patrimônio, dignidade sexual, incolumidade pública, fé pública, Administração Pública.',
    11) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 11;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-processual-penal';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO III] 1. Ação penal (conceito, características, espécies, condições). 2. Termo Circunstanciado de Ocorrência (Lei 9.099/95). 3. Provas (conceito, classificação, preservação local crime, ônus, ilícitas, meios — pericial, interrogatório, testemunhas, reconhecimento, acareação, documentos, indícios, busca/apreensão). 4. Prisão (formalidades, espécies, em flagrante). 5. Identificação criminal (CF art. 5º LVIII, Lei 12.037/2009). 6. Diligências investigatórias (arts. 6º e 13 do CPP).',
    12) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 12;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'legislacao-especial';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 6.0, 6,
    '[BLOCO III] 1. Lei 5.553/1968 e Lei 12.037/2009 (identificação criminal). 2. Lei 8.069/1990 (ECA). 3. Lei 8.072/1990 (Hediondos). 4. Decreto 1.655/1995 e art. 47 do Decreto 9.662/2019. 5. Lei 9.099/1995 (Juizados Especiais). 6. Lei 9.455/1997 (Tortura). 7. Lei 9.605/1998, Capítulos III e V (Crimes Ambientais). 8. Lei 10.826/2003, Capítulo IV (Estatuto do Desarmamento). 9. Lei 11.343/2006 (Drogas). 10. Lei 12.850/2013 (Organizações Criminosas). 11. Lei 13.675/2018 (SUSP). 12. Lei 13.869/2019 (Abuso de Autoridade).',
    13) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 6.0, "expectedQuestions" = 6, programa = EXCLUDED.programa, "order" = 13;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  INSERT INTO "edital_subjects" (id, "editalId", "subjectId", weight, "expectedQuestions", programa, "order")
  VALUES (gen_random_uuid()::text, v_edital_id, v_subject_id, 5.0, 5,
    '[BLOCO III] 1. Direitos humanos na Constituição Federal. 2. Tratados internacionais de DH na CF. 3. Declaração Universal dos Direitos Humanos (1948). 4. Convenção Americana sobre Direitos Humanos / Pacto de São José da Costa Rica (Decreto 678/1992).',
    14) ON CONFLICT ("editalId", "subjectId") DO UPDATE SET weight = 5.0, "expectedQuestions" = 5, programa = EXCLUDED.programa, "order" = 14;

END $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. COURSE_SUBJECTS
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "course_subjects" (id, "courseId", "subjectId", weight, "order")
SELECT gen_random_uuid()::text, c.id, es."subjectId", es.weight, es."order"
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id AND e.numero = '01/2021'
JOIN "edital_subjects" es ON es."editalId" = e.id
WHERE c.slug = 'prf-policial'
ON CONFLICT ("courseId", "subjectId") DO UPDATE SET weight = EXCLUDED.weight, "order" = EXCLUDED."order";

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO — esperado: 1 row, 14 matérias, 120 questões
-- ════════════════════════════════════════════════════════════════════════════
SELECT c.slug, e.numero, e."isActive", e."totalQuestoes", e."hasRedacao", e."wrongAnnulsRight",
       (SELECT COUNT(*) FROM "edital_subjects" WHERE "editalId" = e.id) AS num_subjects,
       (SELECT SUM("expectedQuestions") FROM "edital_subjects" WHERE "editalId" = e.id) AS soma_questoes
FROM "courses" c
JOIN "editais" e ON e."courseId" = c.id
WHERE c.slug = 'prf-policial' AND e.numero = '01/2021';
