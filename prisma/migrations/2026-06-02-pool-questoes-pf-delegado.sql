-- POOL 20 QUESTÕES PF DELEGADO — Cebraspe (CE binário, wrongAnnulsRight=true)
-- Edital 01/2025

UPDATE "questions" SET active = false WHERE 'diagnostico-pool:pf-delegado' = ANY(tags);

DO $$
DECLARE v_subj_id text;
DECLARE v_alt jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
DECLARE v_tags text[] := ARRAY['diagnostico-pool:pf-delegado', 'diagnostico', 'banca:cebraspe']::text[];
BEGIN

-- DIREITO ADMINISTRATIVO (3)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei nº 14.133/2021 (Nova Lei de Licitações), a contratação direta por dispensa de licitação em razão do valor, para obras e serviços de engenharia, é cabível quando o valor não ultrapassar R$ 100.000,00, vedada a divisão fracionada da despesa para se enquadrar no limite legal.',
  v_alt, 'C',
  'Art. 75, I, Lei 14.133/21: dispensa por valor pra obras/serv eng até R$ 100.000 (valor atualizado por decreto). Art. 75, §3º: vedação ao fracionamento. Item correto.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'Conforme jurisprudência consolidada do STJ, o ato administrativo discricionário não pode ser objeto de controle judicial sob o aspecto da razoabilidade e proporcionalidade, sob pena de violação ao princípio da separação dos poderes.',
  v_alt, 'E',
  'ERRADO. STF/STJ consolidaram que o controle judicial PODE alcançar razoabilidade e proporcionalidade do ato discricionário — não invade mérito quando o ato é desproporcional/irrazoável. Apenas o juízo de pura conveniência/oportunidade fica imune.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei nº 8.429/1992 (com redação dada pela Lei 14.230/2021), o ato de improbidade administrativa que causa dano ao erário exige, para sua caracterização, a comprovação de DOLO ESPECÍFICO do agente público, sendo insuficiente a culpa grave.',
  v_alt, 'C',
  'A Lei 14.230/21 reformou a LIA: passou a exigir DOLO ESPECÍFICO (vontade livre e consciente de praticar o ato + finalidade de obter resultado ilícito) em todas as modalidades, inclusive dano ao erário. Culpa (mesmo grave) NÃO mais caracteriza improbidade.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO CONSTITUCIONAL (3)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Constituição Federal, a Polícia Federal, instituída por lei como órgão permanente da União, organizada e mantida pela União, destina-se a apurar infrações penais contra a ordem política e social, bem como contra bens, serviços e interesses da União, suas autarquias e empresas públicas.',
  v_alt, 'C',
  'CF art. 144, §1º: a PF é órgão PERMANENTE, organizado e mantido pela União, estruturado em carreira, destinado a apurar infrações penais (i) contra a ordem política e social ou (ii) em detrimento de bens, serviços e interesses da União, autarquias e empresas públicas federais.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'O mandado de injunção é cabível sempre que a falta de norma regulamentadora torne inviável o exercício dos direitos e liberdades constitucionais, bem como das prerrogativas inerentes à nacionalidade, à soberania e à cidadania.',
  v_alt, 'C',
  'CF art. 5º, LXXI. Texto literal da Constituição. Cabimento exato do mandado de injunção. A Lei 13.300/16 regulamenta o procedimento.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'Segundo entendimento do Supremo Tribunal Federal, é possível a aplicação do regime jurídico do servidor público (Lei 8.112/1990) aos delegados da Polícia Federal de forma subsidiária à Lei 4.878/1965, prevalecendo a norma especial nas hipóteses de conflito.',
  v_alt, 'C',
  'Princípio da especialidade. A Lei 4.878/65 é o regime jurídico especial dos policiais civis da União (Polícia Federal). A Lei 8.112/90 aplica-se subsidiariamente. Em caso de conflito, prevalece a norma especial.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO PENAL (3)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'No crime de lavagem de dinheiro (Lei nº 9.613/1998), considera-se infração penal antecedente apenas os crimes hediondos, o tráfico de entorpecentes e o terrorismo, conforme rol taxativo previsto em lei.',
  v_alt, 'E',
  'ERRADO. Desde a Lei 12.683/2012 (terceira geração da Lei de Lavagem), o rol foi REVOGADO. Hoje QUALQUER infração penal pode ser antecedente da lavagem de dinheiro (modelo aberto). Lavagem agora é multiamparada por qualquer infração.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei 12.850/2013, configura-se organização criminosa a associação de 4 (quatro) ou mais pessoas estruturalmente ordenada e caracterizada pela divisão de tarefas, ainda que informalmente, com objetivo de obter, direta ou indiretamente, vantagem de qualquer natureza, mediante a prática de infrações penais cujas penas máximas sejam superiores a 4 (quatro) anos, ou que sejam de caráter transnacional.',
  v_alt, 'C',
  'Art. 1º, §1º, Lei 12.850/13. Texto literal. Elementos cumulativos: 4+ pessoas, estruturação ordenada, divisão de tarefas (formal ou informal), finalidade de vantagem, infrações com pena máxima > 4 anos OU transnacionais.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'Conforme a Lei 13.869/2019 (Lei de Abuso de Autoridade), o agente público que decreta condução coercitiva de testemunha ou investigado, manifestamente descabida ou sem prévia intimação de comparecimento ao juízo, comete crime de abuso de autoridade, punível com detenção de 1 a 4 anos e multa.',
  v_alt, 'C',
  'Art. 10 da Lei 13.869/19: tipifica como abuso de autoridade decretar condução coercitiva sem prévia intimação ou de forma manifestamente descabida. Pena: detenção de 1-4 anos e multa.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO PROCESSUAL PENAL (3)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei nº 12.830/2013, o indiciamento, privativo do delegado de polícia, dar-se-á por ato fundamentado, mediante análise técnico-jurídica do fato, que deverá indicar a autoria, materialidade e suas circunstâncias.',
  v_alt, 'C',
  'Art. 2º, §6º, Lei 12.830/13. Texto literal. O indiciamento é ato administrativo PRIVATIVO do Delegado, exigindo fundamentação técnico-jurídica e indicação de autoria, materialidade e circunstâncias.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme entendimento do STF (Pacote Anticrime), o juiz das garantias atua exclusivamente na fase pré-processual (investigação) e fica impedido de funcionar no processo após o oferecimento da denúncia, sob pena de violação à imparcialidade objetiva.',
  v_alt, 'C',
  'Lei 13.964/19 (Pacote Anticrime) + ADIs 6.298 a 6.300 STF (2023): confirmada a constitucionalidade do juiz das garantias. Atua na fase de investigação e fica IMPEDIDO de atuar no processo após denúncia. Garantia de imparcialidade objetiva.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'No caso de violação à cadeia de custódia da prova pericial, a Lei 13.964/2019 estabelece a nulidade absoluta e automática da prova produzida, sendo desnecessária a demonstração de efetivo prejuízo.',
  v_alt, 'E',
  'ERRADO. Lei 13.964/19 (Anticrime) introduziu o regramento da cadeia de custódia (arts. 158-A a 158-F CPP), MAS a nulidade NÃO é automática. STJ exige demonstração de PREJUÍZO efetivo à defesa (princípio pas de nullité sans grief) — quebra da cadeia deve resultar em comprometimento real da idoneidade da prova.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO INTERNACIONAL PÚBLICO E COOPERAÇÃO INTERNACIONAL (2)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-internacional-publico-e-cooperacao-internacional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei 13.445/2017 (Lei de Migração), a extradição passiva pode ser concedida quando o pedido for fundado em tratado ou houver promessa de reciprocidade, sendo vedada a extradição de brasileiro nato em qualquer hipótese.',
  v_alt, 'C',
  'CF art. 5º, LI: nenhum brasileiro NATO será extraditado. Brasileiro naturalizado pode ser extraditado por crime comum cometido antes da naturalização ou por tráfico ilícito. Lei 13.445/17 disciplina o procedimento da extradição passiva, exigindo tratado ou reciprocidade.',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'A Convenção de Palermo (Decreto nº 5.015/2004) contra o crime organizado transnacional admite a cooperação policial direta entre autoridades dos Estados-Partes, inclusive sem intermediação das autoridades centrais, desde que respeitadas as legislações internas.',
  v_alt, 'C',
  'Convenção de Palermo prevê expressamente formas de cooperação direta entre autoridades de polícia (arts. 18-19), inclusive sem necessária via diplomática, respeitadas as legislações internas. No Brasil, a PF é autoridade central designada para cooperação internacional em matéria penal.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO AMBIENTAL (2)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-ambiental';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Lei nº 9.605/1998 (Lei de Crimes Ambientais), as pessoas jurídicas podem ser responsabilizadas administrativa, civil e penalmente pelos atos lesivos ao meio ambiente, sem prejuízo da responsabilidade individual de seus dirigentes ou administradores.',
  v_alt, 'C',
  'Art. 3º Lei 9.605/98. CF art. 225, §3º também prevê responsabilização da PJ. Tríplice responsabilização: administrativa, civil e penal, simultaneamente à responsabilidade individual (autoria mediata ou coautoria das pessoas físicas).',
  v_tags, true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'O licenciamento ambiental de empreendimento com significativo impacto ambiental, conforme entendimento do STF, exige obrigatoriamente a realização de Estudo Prévio de Impacto Ambiental (EIA) e respectivo Relatório de Impacto ao Meio Ambiente (RIMA), sendo o instrumento de planejamento que NÃO pode ser substituído por outras formas de avaliação.',
  v_alt, 'C',
  'CF art. 225, §1º, IV: exigência de EIA/RIMA para empreendimentos potencialmente causadores de SIGNIFICATIVO impacto ambiental, com publicidade. STF confirmou exigência constitucional (ADI 4.029). Resolução CONAMA 01/86 e 237/97 detalham o procedimento.',
  v_tags, true, false, NOW(), NOW());

-- DIREITOS HUMANOS (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direitos-humanos';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme o entendimento do STF (RE 466.343 e súmula vinculante 25), os tratados internacionais de direitos humanos aprovados pelo Congresso por quórum qualificado de emenda constitucional possuem hierarquia de norma constitucional, enquanto aqueles aprovados por quórum ordinário têm caráter supralegal.',
  v_alt, 'C',
  'CF art. 5º §3º (EC 45/04) + STF (RE 466.343/SP): tratados internacionais de DH aprovados por procedimento das emendas (3/5, 2 turnos, 2 casas) têm STATUS CONSTITUCIONAL. Os demais (aprovação ordinária) têm caráter SUPRALEGAL — abaixo da CF, acima das leis ordinárias.',
  v_tags, true, false, NOW(), NOW());

-- DIREITO CIVIL (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-civil';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme o Código Civil de 2002, a responsabilidade civil por dano moral exige a comprovação da culpa do agente, sendo inadmissível a responsabilidade objetiva fora das hipóteses expressas em lei.',
  v_alt, 'E',
  'ERRADO. CC art. 927, parágrafo único: haverá obrigação de reparar o dano, INDEPENDENTEMENTE de culpa, quando a atividade normalmente desenvolvida pelo autor implicar, por sua natureza, risco para os direitos de outrem (teoria do risco). Vasta jurisprudência aplica responsabilidade objetiva por risco mesmo fora de hipóteses específicas em lei.',
  v_tags, true, false, NOW(), NOW());

-- CRIMINOLOGIA (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'criminologia';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Na criminologia moderna, a prevenção criminal pode ser classificada em três níveis: primária (atua sobre causas socioeconômicas e culturais antes do crime), secundária (foca em grupos de risco e situações concretas) e terciária (recai sobre o autor do delito, visando evitar reincidência).',
  v_alt, 'C',
  'Classificação clássica e amplamente aceita na criminologia. Prevenção PRIMÁRIA: atua sobre causas (educação, saúde, emprego). SECUNDÁRIA: atua sobre grupos e situações de risco (policiamento, vigilância). TERCIÁRIA: atua sobre autor do delito (ressocialização, programas penitenciários).',
  v_tags, true, false, NOW(), NOW());

-- DIREITO EMPRESARIAL (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-empresarial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED',
  'Conforme a Lei 11.101/2005 (Lei de Falências e Recuperação Judicial), a recuperação extrajudicial é um plano negociado diretamente pelo devedor com seus credores, podendo abranger apenas determinadas classes de credores, e exige homologação judicial para produzir efeitos.',
  v_alt, 'C',
  'Arts. 161 a 167 da Lei 11.101/05: recuperação extrajudicial é negociação direta entre devedor e credores, pode abranger classes específicas (selecionadas), exige homologação judicial para vincular credores que não aderiram (cram down homologatório).',
  v_tags, true, false, NOW(), NOW());

-- DIREITO PROCESSUAL CIVIL (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-civil';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED',
  'Conforme o CPC/2015, a tutela de urgência será concedida quando houver elementos que evidenciem a probabilidade do direito (fumus boni iuris) e o perigo de dano ou risco ao resultado útil do processo (periculum in mora), podendo ser de natureza antecipada ou cautelar.',
  v_alt, 'C',
  'Art. 300 CPC/15. Requisitos cumulativos: probabilidade do direito + perigo de dano OU risco ao resultado útil. Natureza pode ser ANTECIPADA (satisfaz desde logo o pleito) ou CAUTELAR (assegura o resultado prático posterior).',
  v_tags, true, false, NOW(), NOW());

END $$;

SELECT
  (SELECT COUNT(*) FROM "questions" WHERE 'diagnostico-pool:pf-delegado' = ANY(tags) AND active = true) AS pool_ativo;
