-- ════════════════════════════════════════════════════════════════════════════
-- POOL DE 20 QUESTÕES PMDF SOLDADO — estilo Instituto AOCP (ME_5)
-- Geradas via Claude Opus. Distribuição proporcional ao peso do edital 04/2023.
-- Data: 2026-06-02
--
-- Aluno recebe 20 questões sorteadas deste pool no diagnóstico inicial.
-- ════════════════════════════════════════════════════════════════════════════

-- Marca pool antigo (se houver) como inactive — preserva attempts históricos
UPDATE "questions" SET active = false
WHERE 'diagnostico-pool:pmdf-soldado' = ANY(tags);

-- Helper inline pra reusar
DO $$
DECLARE
  v_subj_id text;
BEGIN

-- ════════ LÍNGUA PORTUGUESA (3 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'EASY', 'AI_GENERATED',
  'Assinale a alternativa em que o emprego do sinal indicativo de crase está INCORRETO:',
  '[{"letra":"A","texto":"O policial militar dirigiu-se à viatura imediatamente."},{"letra":"B","texto":"A operação foi adiada de segunda-feira à sexta-feira."},{"letra":"C","texto":"O comandante referiu-se à Lei nº 12.086/2009."},{"letra":"D","texto":"Os candidatos foram à pé até o local da prova."},{"letra":"E","texto":"A guarnição compareceu à reunião do COE."}]'::jsonb,
  'D',
  'Não há crase antes de palavras masculinas: "a pé" (locução adverbial) NÃO recebe acento. Nas demais, ocorre fusão da preposição "a" + artigo "a" (à viatura, à Lei, à reunião) ou "à...à" entre dias da semana (correlação com "de...a").',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'No período "Espera-se que os novos soldados cumpram suas atribuições com dedicação", o termo destacado "Espera-se" classifica-se como:',
  '[{"letra":"A","texto":"verbo na voz passiva sintética com sujeito indeterminado."},{"letra":"B","texto":"verbo na voz passiva sintética com sujeito oracional."},{"letra":"C","texto":"verbo na voz ativa com partícula apassivadora."},{"letra":"D","texto":"verbo na voz reflexiva com sujeito implícito."},{"letra":"E","texto":"verbo intransitivo com índice de indeterminação."}]'::jsonb,
  'B',
  'O "se" é partícula apassivadora (passiva sintética). O sujeito é a oração subordinada substantiva subjetiva "que os novos soldados cumpram suas atribuições com dedicação" — equivale a "É esperado isto". Portanto, é voz passiva sintética com sujeito oracional.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Conforme o Manual de Redação da Presidência da República (3ª ed., 2018), assinale a alternativa CORRETA sobre o pronome de tratamento "Vossa Excelência":',
  '[{"letra":"A","texto":"É empregado apenas em comunicações com autoridades do Poder Executivo federal."},{"letra":"B","texto":"Deve ser usado para magistrados, oficiais generais, parlamentares e Ministros de Estado."},{"letra":"C","texto":"Substitui Vossa Magnificência em todas as situações."},{"letra":"D","texto":"Exige o uso de maiúsculas em todas as suas letras."},{"letra":"E","texto":"É vocativo equivalente a Excelentíssimo Senhor para Presidente do STF."}]'::jsonb,
  'B',
  'O Manual da Presidência (3ª ed.) estabelece que Vossa Excelência (V. Exa.) é usado para autoridades de alto nível: Chefes do Executivo, Ministros, Senadores, Deputados, magistrados e oficiais generais. Vossa Magnificência é reservada a Reitores. Vocativo do Presidente do STF é "Excelentíssimo Senhor Presidente".',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ LÍNGUA INGLESA (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-inglesa';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'EASY', 'AI_GENERATED',
  'Consider the sentence: "The officer SHOULD HAVE CALLED for backup before approaching the suspect." The modal expression in capital letters indicates:',
  '[{"letra":"A","texto":"a present obligation that must be fulfilled."},{"letra":"B","texto":"a past action that was advisable but was not done."},{"letra":"C","texto":"a future possibility that depends on weather conditions."},{"letra":"D","texto":"a habitual action in the past."},{"letra":"E","texto":"a polite request for permission."}]'::jsonb,
  'B',
  '"Should have + past participle" expresses regret or criticism about a past action that was advisable but did NOT happen. Aqui: o oficial deveria ter chamado reforço (mas não chamou).',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ MATEMÁTICA E RACIOCÍNIO LÓGICO (2 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'EASY', 'AI_GENERATED',
  'A negação lógica da proposição "Todo policial militar é disciplinado" é:',
  '[{"letra":"A","texto":"Nenhum policial militar é disciplinado."},{"letra":"B","texto":"Todo policial militar é indisciplinado."},{"letra":"C","texto":"Existe pelo menos um policial militar que não é disciplinado."},{"letra":"D","texto":"Algum policial militar é disciplinado."},{"letra":"E","texto":"Não há policial militar disciplinado."}]'::jsonb,
  'C',
  'A negação de "Todo A é B" (universal afirmativa) é "Existe pelo menos um A que não é B" (existencial negativa). Negar "todo" não é "nenhum" — basta UM contraexemplo pra refutar uma universal.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Em uma operação policial, 12 policiais militares conseguem montar um bloqueio em 4 horas. Mantendo o mesmo ritmo, quantos policiais são necessários para montar o mesmo bloqueio em 3 horas?',
  '[{"letra":"A","texto":"9 policiais."},{"letra":"B","texto":"10 policiais."},{"letra":"C","texto":"14 policiais."},{"letra":"D","texto":"16 policiais."},{"letra":"E","texto":"18 policiais."}]'::jsonb,
  'D',
  'Grandezas inversamente proporcionais: mais policiais, menos tempo. Regra de três inversa: 12 / x = 3 / 4 → x = (12 × 4) / 3 = 16 policiais.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ ATUALIDADES (DF/RIDE) (2 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'atualidades';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'A Região Integrada de Desenvolvimento do Distrito Federal e Entorno (RIDE-DF), instituída pela Lei Complementar nº 94/1998, NÃO inclui o seguinte município entre seus integrantes originais:',
  '[{"letra":"A","texto":"Águas Lindas de Goiás (GO)."},{"letra":"B","texto":"Cristalina (GO)."},{"letra":"C","texto":"Unaí (MG)."},{"letra":"D","texto":"Anápolis (GO)."},{"letra":"E","texto":"Formosa (GO)."}]'::jsonb,
  'D',
  'Anápolis NÃO faz parte da RIDE-DF, apesar de ser cidade importante de Goiás. A RIDE-DF abrange o DF + municípios do entorno em GO (Águas Lindas, Cristalina, Formosa, Luziânia, Padre Bernardo, etc.) e MG (Unaí, Buritis). Anápolis está fora dessa área de planejamento.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre a formação histórica e étnico-social do Distrito Federal, é CORRETO afirmar:',
  '[{"letra":"A","texto":"Brasília foi inaugurada em 21 de abril de 1960, durante o governo de Juscelino Kubitschek."},{"letra":"B","texto":"O projeto urbanístico foi de Oscar Niemeyer e o arquitetônico de Lúcio Costa."},{"letra":"C","texto":"O processo migratório foi composto exclusivamente por trabalhadores da região Sul do Brasil."},{"letra":"D","texto":"As Regiões Administrativas do DF são todas mais antigas que o Plano Piloto."},{"letra":"E","texto":"A capital foi transferida do Rio para Brasília pela Constituição de 1934."}]'::jsonb,
  'A',
  'Brasília foi inaugurada em 21/04/1960 sob JK. ERRADO: o projeto urbanístico foi de Lúcio Costa e o arquitetônico de Niemeyer (B); os candangos vieram majoritariamente do Nordeste (C); muitas RAs foram criadas após Brasília (D); a mudança da capital foi prevista na CF/1946, com efetivação em 1960 (E).',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ LEGISLAÇÃO APLICADA À PMDF (3 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-pmdf';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'EASY', 'AI_GENERATED',
  'De acordo com a Lei nº 7.289/1984 (Estatuto dos Policiais Militares da PMDF), os círculos hierárquicos das praças são:',
  '[{"letra":"A","texto":"Subtenentes/Sargentos, Cabos e Soldados."},{"letra":"B","texto":"Apenas Sargentos e Soldados."},{"letra":"C","texto":"Oficiais Subalternos, Sargentos e Praças Especiais."},{"letra":"D","texto":"Aspirantes, Sargentos e Soldados."},{"letra":"E","texto":"Oficiais Superiores e Subalternos."}]'::jsonb,
  'A',
  'Art. 13 da Lei 7.289/84: os círculos hierárquicos das PRAÇAS PMDF são: Subtenentes e Sargentos; Cabos e Soldados. As demais alternativas misturam com hierarquias de oficiais ou estão erradas.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre a perda do posto e da patente do oficial da PMDF, prevista na Lei nº 12.086/2009, é CORRETO afirmar que:',
  '[{"letra":"A","texto":"Pode ocorrer por decisão administrativa do Comandante-Geral, sem necessidade de processo judicial."},{"letra":"B","texto":"Ocorre por decisão do Tribunal de Justiça do DF e Territórios, em processo regular."},{"letra":"C","texto":"Decorre automaticamente da aposentadoria compulsória."},{"letra":"D","texto":"É consequência direta da exoneração a pedido."},{"letra":"E","texto":"Pode ser imposta pelo Governador do DF em ato discricionário."}]'::jsonb,
  'B',
  'Lei 12.086/2009 + CF/88 art. 142, §3º, VI e VII: a perda do posto e da patente do oficial militar exige decisão de Tribunal Militar (no caso do DF, o TJDFT exercendo essa função), em PROCESSO regular. Não é ato administrativo discricionário.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'HARD', 'AI_GENERATED',
  'O Decreto nº 88.777/1983 (R-200) estabelece como princípios das polícias militares, EXCETO:',
  '[{"letra":"A","texto":"Hierarquia e disciplina."},{"letra":"B","texto":"Subordinação ao Governador do Estado ou DF."},{"letra":"C","texto":"Vinculação operacional ao Exército Brasileiro pelo Comando de Operações Terrestres."},{"letra":"D","texto":"Autonomia administrativa total em relação à União."},{"letra":"E","texto":"Hierarquia equiparada ao Exército para fins disciplinares."}]'::jsonb,
  'D',
  'O R-200 estabelece que as PMs são FORÇAS AUXILIARES E RESERVA do Exército, com vinculação operacional via COTER. NÃO há autonomia total em relação à União — pelo contrário, há controle e supervisão federal sobre material bélico, doutrina e organização. Hierarquia/disciplina e subordinação ao Chefe do Executivo estadual/DF são princípios constitucionais.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO CONSTITUCIONAL + DIREITOS HUMANOS (2 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional-direitos-humanos';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Constituição Federal de 1988, art. 5º, XII, é INVIOLÁVEL o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas. Sobre a interceptação telefônica para investigação criminal, é CORRETO afirmar:',
  '[{"letra":"A","texto":"Pode ser determinada por delegado de polícia em caso de flagrante delito."},{"letra":"B","texto":"Exige ordem judicial nas hipóteses e na forma estabelecidas em lei."},{"letra":"C","texto":"É vedada de forma absoluta no ordenamento brasileiro."},{"letra":"D","texto":"Pode ser autorizada pelo Ministério Público em crimes hediondos."},{"letra":"E","texto":"Independe de autorização quando há fundada suspeita de organização criminosa."}]'::jsonb,
  'B',
  'CF art. 5º, XII: o sigilo é inviolável, SALVO no último caso (comunicações telefônicas), por ORDEM JUDICIAL, nas hipóteses e na forma da lei (Lei 9.296/96). Nem MP, nem delegado, nem o "fundada suspeita" autorizam — só decisão judicial fundamentada.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'A Lei nº 13.060/2014, que disciplina o uso dos instrumentos de menor potencial ofensivo (IMPO) pelos agentes de segurança pública, estabelece como princípios:',
  '[{"letra":"A","texto":"Sigilo absoluto sobre o uso da força."},{"letra":"B","texto":"Imunidade total do agente em caso de uso indevido."},{"letra":"C","texto":"Legalidade, necessidade, proporcionalidade, moderação e conveniência."},{"letra":"D","texto":"Discricionariedade absoluta do agente público."},{"letra":"E","texto":"Vedação total ao uso de armas letais em qualquer hipótese."}]'::jsonb,
  'C',
  'Lei 13.060/14 + Decreto 12.341/24: o uso de IMPO obedece aos princípios da LEGALIDADE, NECESSIDADE, PROPORCIONALIDADE, MODERAÇÃO e CONVENIÊNCIA. Não há sigilo absoluto, imunidade automática nem discricionariedade — o agente responde por excessos.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO ADMINISTRATIVO (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre os atos administrativos discricionários, é CORRETO afirmar:',
  '[{"letra":"A","texto":"Não estão sujeitos a controle jurisdicional em hipótese alguma."},{"letra":"B","texto":"O Judiciário pode revisar a conveniência e oportunidade do mérito administrativo."},{"letra":"C","texto":"Sujeitam-se ao controle de legalidade, podendo o Judiciário analisar requisitos vinculados (competência, forma, finalidade) e proporcionalidade/razoabilidade."},{"letra":"D","texto":"Equivalem a atos arbitrários, dispensando motivação."},{"letra":"E","texto":"Não podem ser revogados pela própria Administração."}]'::jsonb,
  'C',
  'Discricionariedade NÃO é arbitrariedade. Os atos discricionários têm requisitos VINCULADOS (competência, forma, finalidade) sempre controláveis pelo Judiciário. O mérito (conveniência/oportunidade) tradicionalmente não é revisto, MAS proporcionalidade e razoabilidade hoje são analisadas (Súmula 473 STF e jurisprudência consolidada).',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO PENAL (2 questões) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'João, durante operação policial, encontra-se sob iminente agressão de Pedro armado com faca. João saca sua arma e dispara um tiro, ferindo Pedro. Nessa situação, está caracterizada:',
  '[{"letra":"A","texto":"Estrito cumprimento do dever legal."},{"letra":"B","texto":"Estado de necessidade."},{"letra":"C","texto":"Exercício regular de direito."},{"letra":"D","texto":"Legítima defesa própria."},{"letra":"E","texto":"Inexigibilidade de conduta diversa."}]'::jsonb,
  'D',
  'Art. 25 do CP: legítima defesa é repelir injusta agressão, atual ou IMINENTE, a direito próprio ou de outrem, usando moderadamente meios necessários. Aqui João defende a si próprio de agressão iminente — legítima defesa própria. Estrito cumprimento do dever exige ato comandado por lei sem agressão atual.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'HARD', 'AI_GENERATED',
  'Conforme a Lei nº 11.343/2006 (Lei de Drogas), no crime do art. 28 (porte para consumo pessoal), a pena pode consistir, EXCETO:',
  '[{"letra":"A","texto":"Advertência sobre os efeitos das drogas."},{"letra":"B","texto":"Prestação de serviços à comunidade."},{"letra":"C","texto":"Medida educativa de comparecimento a programa ou curso educativo."},{"letra":"D","texto":"Multa pecuniária expressa em dias-multa."},{"letra":"E","texto":"Não é prevista pena privativa de liberdade para esse crime."}]'::jsonb,
  'D',
  'Art. 28 da Lei 11.343/06: as penas previstas são advertência, prestação de serviços à comunidade e medida educativa de comparecimento a programa/curso. NÃO há multa pecuniária expressa em dias-multa nem prisão. STF (RE 635.659) ainda discute descriminalização. Penas privativas de liberdade foram banidas pra usuário desde a lei de 2006.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO PROCESSUAL PENAL (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre o inquérito policial conduzido pela Polícia Civil, é INCORRETO afirmar que:',
  '[{"letra":"A","texto":"É procedimento administrativo, inquisitivo e em regra sigiloso."},{"letra":"B","texto":"Pode ser instaurado por requisição da autoridade judiciária ou do Ministério Público."},{"letra":"C","texto":"Tem por finalidade apurar autoria e materialidade do crime."},{"letra":"D","texto":"O indiciado tem direito à autodefesa e à defesa técnica, conforme garantias constitucionais."},{"letra":"E","texto":"Sua presidência cabe ao delegado de polícia, que decide pelo indiciamento por ato administrativo fundamentado."}]'::jsonb,
  'D',
  'O IP é INQUISITIVO — não há contraditório e ampla defesa em sua fase plena. O indiciado tem direitos como advogado e silêncio (CF art. 5º), mas a autodefesa/defesa técnica em sentido amplo é garantia da AÇÃO PENAL, não do inquérito. As demais alternativas são corretas (procedimento adm, instauração por requisição, finalidade investigativa, indiciamento fundamentado pela Lei 12.830/13).',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO PENAL MILITAR (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal-militar';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Conforme o Código Penal Militar (DL 1.001/1969), os crimes propriamente militares são aqueles que:',
  '[{"letra":"A","texto":"Podem ser cometidos por qualquer pessoa, militar ou civil."},{"letra":"B","texto":"Só podem ser praticados por militar, em razão de sua condição funcional (ex.: deserção, motim)."},{"letra":"C","texto":"São aqueles previstos exclusivamente no Código Penal comum."},{"letra":"D","texto":"Têm previsão na legislação trabalhista militar."},{"letra":"E","texto":"São crimes hediondos por equiparação legal."}]'::jsonb,
  'B',
  'Crimes PROPRIAMENTE militares são aqueles que SÓ podem ser praticados por militar, em razão de sua condição (ex.: deserção, motim, abandono de posto, dormir em serviço). Crimes IMPROPRIAMENTE militares têm correspondência no CP comum mas, em razão da circunstância, são reclassificados como militares.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ DIREITO PROCESSUAL PENAL MILITAR (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal-militar';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre o Inquérito Policial Militar (IPM), regulado pelo Código de Processo Penal Militar (DL 1.002/1969), é CORRETO afirmar:',
  '[{"letra":"A","texto":"É processo judicial conduzido por juiz militar."},{"letra":"B","texto":"É procedimento administrativo destinado a apurar crime militar, presidido por oficial das Forças Armadas ou militar estadual designado."},{"letra":"C","texto":"Pode ser instaurado apenas pelo Ministério Público Militar."},{"letra":"D","texto":"Substitui o processo penal militar, podendo gerar condenação direta."},{"letra":"E","texto":"Está extinto desde a CF/1988."}]'::jsonb,
  'B',
  'IPM é procedimento ADMINISTRATIVO/inquisitivo, conduzido por oficial encarregado (designado pelo Comandante), para apurar crime militar. Não é judicial nem substitui processo. Quem ajuíza ação penal militar é o MPM (na esfera militar federal) ou MP estadual (PM/CBM estaduais). É plenamente vigente.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

-- ════════ CRIMINOLOGIA (1 questão) ════════
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'criminologia';

INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMDF', 2023, 'MEDIUM', 'AI_GENERATED',
  'Sobre as ESCOLAS criminológicas, é CORRETO associar:',
  '[{"letra":"A","texto":"Escola Clássica → Lombroso, criminoso nato, antropologia criminal."},{"letra":"B","texto":"Escola Positiva → Cesare Beccaria, livre-arbítrio, proporcionalidade da pena."},{"letra":"C","texto":"Escola Clássica → Beccaria, livre-arbítrio, racionalidade do criminoso, pena com função utilitária."},{"letra":"D","texto":"Escola Positiva → defesa do contratualismo absoluto e abolição das prisões."},{"letra":"E","texto":"Terza Scuola → adesão integral ao determinismo biológico de Lombroso."}]'::jsonb,
  'C',
  'Escola CLÁSSICA: Cesare Beccaria ("Dos Delitos e das Penas", 1764), livre-arbítrio, criminoso como ser racional, pena proporcional e útil. Escola POSITIVA: Lombroso (criminoso nato/antropologia), Ferri (sociologia), Garofalo (psicologia) — determinismo biológico/social. Terza Scuola é eclética, intermediária.',
  ARRAY['diagnostico-pool:pmdf-soldado', 'diagnostico', 'banca:instituto-aocp']::text[],
  true, false, NOW(), NOW());

END $$;

-- VERIFICAÇÃO
SELECT
  (SELECT COUNT(*) FROM "questions" WHERE 'diagnostico-pool:pmdf-soldado' = ANY(tags) AND active = true) AS pool_ativo,
  (SELECT COUNT(*) FROM "questions" WHERE 'diagnostico-pool:pmdf-soldado' = ANY(tags) AND active = false) AS pool_arquivado;
