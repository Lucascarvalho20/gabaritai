-- ════════════════════════════════════════════════════════════════════════════
-- TOPICS UNIVERSAIS — Cebraspe (e similares)
-- Data: 2026-06-06
--
-- Objetivo: Cadastrar tópicos canônicos pras matérias mais frequentes em todos
-- os cursos jurídicos Cebraspe (PF, PRF, PCDF). Os topics ficam atrelados ao
-- SUBJECT (não ao curso), então um único INSERT vale pra TODOS os cursos que
-- usam aquele subject (PF Delegado, PRF, PCDF Del/Ag/Esc, etc.).
--
-- IDEMPOTENTE: re-rodar não duplica (WHERE NOT EXISTS por subjectId+name).
--
-- Cobertura: Direito Constitucional, Direito Administrativo, Direito Penal,
-- Direito Processual Penal, Língua Portuguesa, Informática, Raciocínio Lógico,
-- Direitos Humanos, Direito Penal Militar (compartilhado PMDF/PMGO).
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1. DIREITO CONSTITUCIONAL (12 tópicos canônicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios Fundamentais (Art 1º a 4º)', 'const-principios-fundamentais', 1.2, 1),
  ('Direitos e Garantias Fundamentais (Art 5º)', 'const-direitos-fundamentais', 1.8, 2),
  ('Direitos Sociais (Art 6º a 11)', 'const-direitos-sociais', 1.0, 3),
  ('Nacionalidade (Art 12 e 13)', 'const-nacionalidade', 0.8, 4),
  ('Direitos Políticos e Partidos (Art 14 a 17)', 'const-direitos-politicos', 1.0, 5),
  ('Organização do Estado — União, Estados, DF, Municípios (Art 18 a 36)', 'const-organizacao-estado', 1.2, 6),
  ('Administração Pública (Art 37 a 41)', 'const-administracao-publica', 1.5, 7),
  ('Poder Legislativo (Art 44 a 75)', 'const-poder-legislativo', 1.2, 8),
  ('Poder Executivo (Art 76 a 91)', 'const-poder-executivo', 1.2, 9),
  ('Poder Judiciário (Art 92 a 126)', 'const-poder-judiciario', 1.2, 10),
  ('Funções Essenciais à Justiça (Art 127 a 135)', 'const-funcoes-essenciais', 0.8, 11),
  ('Defesa do Estado e Segurança Pública (Art 136 a 144)', 'const-defesa-seguranca', 1.5, 12)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-constitucional'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. DIREITO ADMINISTRATIVO (10 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios da Administração Pública (LIMPE e implícitos)', 'adm-principios', 1.5, 1),
  ('Organização Administrativa: Adm Direta e Indireta', 'adm-organizacao', 1.0, 2),
  ('Atos Administrativos: conceito, elementos, atributos, espécies', 'adm-atos', 1.5, 3),
  ('Poderes Administrativos (vinculado, discricionário, hierárquico, disciplinar, regulamentar, polícia)', 'adm-poderes', 1.2, 4),
  ('Licitações e Contratos (Lei 14.133/2021)', 'adm-licitacoes', 1.5, 5),
  ('Agentes Públicos e Lei 8.112/90', 'adm-agentes-publicos', 1.5, 6),
  ('Improbidade Administrativa (Lei 8.429/92)', 'adm-improbidade', 1.2, 7),
  ('Responsabilidade Civil do Estado', 'adm-responsabilidade-civil', 1.0, 8),
  ('Controle da Administração (TCU, judicial, administrativo)', 'adm-controle', 0.8, 9),
  ('Processo Administrativo (Lei 9.784/99) e Lei de Acesso à Informação (12.527/11)', 'adm-processo-acesso', 1.0, 10)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-administrativo'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. DIREITO PENAL (10 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios e Aplicação da Lei Penal', 'penal-principios', 1.2, 1),
  ('Teoria do Crime: fato típico, ilicitude e culpabilidade', 'penal-teoria-crime', 1.5, 2),
  ('Concurso de Pessoas', 'penal-concurso-pessoas', 1.0, 3),
  ('Penas: espécies, cominação, aplicação', 'penal-penas', 1.2, 4),
  ('Crimes contra a Pessoa (Homicídio, Lesão, Sequestro)', 'penal-crimes-pessoa', 1.5, 5),
  ('Crimes contra o Patrimônio (Furto, Roubo, Extorsão, Estelionato)', 'penal-crimes-patrimonio', 1.5, 6),
  ('Crimes contra a Administração Pública (Peculato, Concussão, Corrupção)', 'penal-crimes-administracao', 1.8, 7),
  ('Crimes contra a Fé Pública e Documentos', 'penal-crimes-fe-publica', 1.0, 8),
  ('Lei de Drogas (Lei 11.343/2006)', 'penal-lei-drogas', 1.2, 9),
  ('Lei dos Crimes Hediondos e Lei Antiterrorismo', 'penal-hediondos-terrorismo', 1.0, 10)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-penal'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. DIREITO PROCESSUAL PENAL (10 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Princípios do Processo Penal e Aplicação da Lei', 'ppp-principios', 1.2, 1),
  ('Inquérito Policial: natureza, características, atribuição', 'ppp-inquerito', 1.8, 2),
  ('Ação Penal: pública, privada, condicionada', 'ppp-acao-penal', 1.0, 3),
  ('Prova: meios, ônus, valoração, prova ilícita', 'ppp-prova', 1.5, 4),
  ('Prisões e Liberdade Provisória (prisão em flagrante, preventiva, temporária)', 'ppp-prisoes', 1.8, 5),
  ('Medidas Cautelares Diversas da Prisão', 'ppp-cautelares', 1.0, 6),
  ('Processo Comum e Sumário: rito, fases', 'ppp-processo-comum', 1.0, 7),
  ('Júri e Tribunal do Júri', 'ppp-juri', 0.8, 8),
  ('Recursos no Processo Penal', 'ppp-recursos', 1.0, 9),
  ('Lei 9.296/96 (Interceptação) e Lei 12.850/13 (Organização Criminosa)', 'ppp-interceptacao-orcrim', 1.2, 10)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'direito-processual-penal'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. LÍNGUA PORTUGUESA (15 tópicos) — universais Cebraspe
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Compreensão e intelecção de textos', 'lp-compreensao-textos', 1.5, 1),
  ('Tipologia textual e gêneros', 'lp-tipologia-textual', 1.0, 2),
  ('Ortografia oficial', 'lp-ortografia', 1.0, 3),
  ('Acentuação gráfica', 'lp-acentuacao', 1.0, 4),
  ('Emprego do sinal indicativo de crase', 'lp-crase', 1.0, 5),
  ('Formação, classe e emprego de palavras', 'lp-formacao-classes', 1.0, 6),
  ('Sintaxe da oração e do período', 'lp-sintaxe', 1.2, 7),
  ('Pontuação', 'lp-pontuacao', 1.0, 8),
  ('Concordância nominal e verbal', 'lp-concordancia', 1.2, 9),
  ('Colocação pronominal', 'lp-colocacao-pronominal', 0.8, 10),
  ('Regência nominal e verbal', 'lp-regencia', 1.0, 11),
  ('Equivalência e transformação de estruturas', 'lp-equivalencia', 0.8, 12),
  ('Paralelismo sintático e semântico', 'lp-paralelismo', 0.8, 13),
  ('Relações de sinonímia e antonímia, polissemia, ambiguidade', 'lp-semantica', 0.8, 14),
  ('Redação Oficial (Manual de Redação da Presidência)', 'lp-redacao-oficial', 1.0, 15)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'lingua-portuguesa'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. INFORMÁTICA (8 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Sistemas Operacionais (Windows 10/11 e Linux)', 'info-so', 1.2, 1),
  ('Edição de Textos, Planilhas e Apresentações (Microsoft Office e LibreOffice)', 'info-office', 1.5, 2),
  ('Conceitos de Internet, Intranet e Extranet', 'info-internet', 1.0, 3),
  ('Navegadores e Mecanismos de Busca', 'info-navegadores', 1.0, 4),
  ('Correio eletrônico (Outlook, Thunderbird, webmail)', 'info-email', 0.8, 5),
  ('Segurança da Informação: ataques, malware, criptografia, certificação digital', 'info-seguranca', 1.5, 6),
  ('Backup, computação em nuvem, redes', 'info-backup-nuvem-redes', 1.0, 7),
  ('Banco de dados (conceitos básicos) e Big Data', 'info-bd-bigdata', 0.7, 8)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'informatica'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. RACIOCÍNIO LÓGICO (8 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Lógica proposicional: conectivos, tabela-verdade, equivalências', 'rl-proposicional', 1.5, 1),
  ('Negação, condicional, contrapositiva e leis de De Morgan', 'rl-negacao-condicional', 1.2, 2),
  ('Argumentação: validade, premissas, conclusão', 'rl-argumentacao', 1.0, 3),
  ('Quantificadores (todo, algum, nenhum) e silogismos', 'rl-quantificadores', 1.0, 4),
  ('Análise combinatória e probabilidade básica', 'rl-combinatoria', 1.0, 5),
  ('Sequências numéricas, lógicas e padrões', 'rl-sequencias', 0.8, 6),
  ('Problemas de raciocínio (idades, distâncias, mistura)', 'rl-problemas', 0.8, 7),
  ('Conjuntos, diagramas e Venn', 'rl-conjuntos', 0.7, 8)
) AS t(name, slug, weight, "order")
WHERE s.slug = 'raciocinio-logico'
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 8. DIREITOS HUMANOS (8 tópicos)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Conceito, fundamentos e características dos Direitos Humanos', 'dh-conceito', 1.0, 1),
  ('Direitos Humanos na Constituição de 1988', 'dh-cf88', 1.5, 2),
  ('Declaração Universal dos Direitos Humanos (DUDH 1948)', 'dh-dudh', 1.0, 3),
  ('Sistema Interamericano (Pacto de San José da Costa Rica)', 'dh-pacto-san-jose', 1.0, 4),
  ('Convenção contra a Tortura e Lei 9.455/97', 'dh-tortura', 1.0, 5),
  ('Direitos das mulheres, crianças, idosos, PCD, LGBTQIA+', 'dh-grupos-vulneraveis', 1.2, 6),
  ('Direitos dos presos, Lei de Execução Penal e Regras de Mandela', 'dh-presos', 1.0, 7),
  ('Atuação policial e Direitos Humanos: uso da força, abordagem', 'dh-atuacao-policial', 1.2, 8)
) AS t(name, slug, weight, "order")
WHERE s.slug IN ('direitos-humanos', 'direito-constitucional-direitos-humanos')
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- 9. DIREITO PENAL MILITAR (6 tópicos) — PMDF, PMGO
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
SELECT gen_random_uuid()::text, s.id, t.name, t.slug, t.weight, t."order", NOW()
FROM "subjects" s
CROSS JOIN (VALUES
  ('Aplicação da Lei Penal Militar (Art 1º a 11)', 'penal-mil-aplicacao', 1.0, 1),
  ('Crime Militar: conceito, sujeitos, classificação (próprio/impróprio)', 'penal-mil-crime', 1.5, 2),
  ('Imputabilidade Penal Militar e Inimputabilidade', 'penal-mil-imputabilidade', 1.0, 3),
  ('Crimes Militares em Tempo de Paz: violência contra superior, deserção, desrespeito', 'penal-mil-tempo-paz', 1.5, 4),
  ('Crimes contra a Administração Militar', 'penal-mil-administracao', 1.2, 5),
  ('Penas Militares e Aplicação', 'penal-mil-penas', 1.0, 6)
) AS t(name, slug, weight, "order")
WHERE s.slug IN ('direito-penal-militar', 'nocoes-de-direito-penal-militar')
  AND NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = s.id AND name = t.name);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação: quantos tópicos por subject após o INSERT
-- ──────────────────────────────────────────────────────────────────────────
SELECT s.slug, s.name, COUNT(t.id) AS topicos
FROM "subjects" s LEFT JOIN "topics" t ON t."subjectId" = s.id AND t."archivedAt" IS NULL
WHERE s.slug IN (
  'direito-constitucional', 'direito-administrativo', 'direito-penal',
  'direito-processual-penal', 'lingua-portuguesa', 'informatica',
  'raciocinio-logico', 'direitos-humanos', 'direito-constitucional-direitos-humanos',
  'direito-penal-militar', 'nocoes-de-direito-penal-militar'
)
GROUP BY s.slug, s.name
ORDER BY s.name;
