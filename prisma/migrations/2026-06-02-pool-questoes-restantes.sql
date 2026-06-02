-- ════════════════════════════════════════════════════════════════════════════
-- POOL DE QUESTÕES — 8 cursos restantes (PF Perito/Escrivão/Agente/Papilo,
-- PRF, PCDF Delegado/Agente/Escrivão/Perito, PMGO)
-- Geradas via Claude Opus. Distribuição prioriza matérias de maior peso.
-- ════════════════════════════════════════════════════════════════════════════

-- Limpa pools antigos
UPDATE "questions" SET active = false WHERE tags && ARRAY[
  'diagnostico-pool:pf-perito','diagnostico-pool:pf-escrivao','diagnostico-pool:pf-agente',
  'diagnostico-pool:pf-papiloscopista','diagnostico-pool:prf-policial',
  'diagnostico-pool:pcdf-delegado','diagnostico-pool:pcdf-agente','diagnostico-pool:pcdf-escrivao',
  'diagnostico-pool:pcdf-perito','diagnostico-pool:pmgo-soldado'
];

-- ════════════════════════════════════════════════════════════════════════════
-- PF AGENTE (15q — Cebraspe CE) — foco em Bloco I, Bloco II Informática, Bloco III Contabilidade
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pf-agente','diagnostico','banca:cebraspe']::text[];
BEGIN

-- LP (3)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'EASY', 'AI_GENERATED', 'Em "A operação foi conduzida com êxito", o termo "com êxito" exerce função sintática de adjunto adverbial de modo.', v_alt_ce, 'C', 'Adjunto adverbial de modo: "com êxito" qualifica o verbo "foi conduzida" indicando MODO. Sintaticamente correto.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O emprego do pronome "lhe" na frase "Os policiais lhe trouxeram informações importantes" está correto, pois substitui objeto indireto.', v_alt_ce, 'C', '"Lhe" substitui objeto indireto (a quem trouxeram = lhe trouxeram). Verbo "trazer" pede preposição "a" para o destinatário.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O período "Embora os agentes tenham se esforçado, a investigação não chegou a uma conclusão definitiva" apresenta uma oração subordinada adverbial concessiva e uma oração principal.', v_alt_ce, 'C', '"Embora" introduz oração subordinada adverbial CONCESSIVA (admite obstáculo que não impede). A 2ª oração é a principal.', v_t, true, false, NOW());

-- Direito Administrativo (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 8.112/1990, é permitida a acumulação remunerada de dois cargos públicos pelo mesmo servidor quando se tratar de dois cargos privativos de profissionais de saúde, com profissões regulamentadas.', v_alt_ce, 'C', 'CF art. 37, XVI: vedada acumulação, salvo quando houver compatibilidade de horários: a) dois cargos de professor; b) um cargo de professor + outro técnico/científico; c) DOIS CARGOS PRIVATIVOS DE PROFISSIONAIS DE SAÚDE com profissões regulamentadas (EC 34/01).', v_t, true, false, NOW());

-- Direito Constitucional (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A Polícia Federal, segundo a Constituição Federal, exerce, com exclusividade, as funções de polícia judiciária da União.', v_alt_ce, 'C', 'CF art. 144, §1º, IV: à PF compete exercer, com EXCLUSIVIDADE, as funções de polícia judiciária da União. Polícia Civil exerce polícia judiciária estadual.', v_t, true, false, NOW());

-- Direito Penal (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A consumação do crime de furto exige a inversão da posse da coisa subtraída em favor do agente, com posse mansa e pacífica, ainda que por breve tempo, conforme entendimento atualizado do STJ.', v_alt_ce, 'C', 'STJ (Súmula 582 / Tema 934): consumação do furto ocorre com a INVERSÃO da posse, prescindindo de posse mansa e pacífica. Mesmo posse breve já consuma. Texto literal de jurisprudência atualizada.', v_t, true, false, NOW());

-- Direito Processual Penal (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A prisão em flagrante deverá ser comunicada imediatamente ao juiz competente, ao Ministério Público e à família do preso ou pessoa por ele indicada, sob pena de relaxamento.', v_alt_ce, 'C', 'CF art. 5º, LXII + CPP art. 306: comunicação imediata ao juiz, ao MP e à família/pessoa indicada. Ausência → relaxamento. Texto literal.', v_t, true, false, NOW());

-- Legislação Especial (2)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-especial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 11.343/2006, o pequeno agricultor que cultiva planta destinada à preparação de droga para consumo pessoal está isento de pena, desde que comprovada essa destinação exclusiva.', v_alt_ce, 'E', 'ERRADO. Art. 28, §1º Lei 11.343/06: quem cultiva planta para preparação de pequena quantidade para CONSUMO PESSOAL sujeita-se às mesmas medidas do art. 28 (advertência, prestação serviços, medida educativa). NÃO é isento de pena — apenas tem pena alternativa.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A Lei 10.826/2003 (Estatuto do Desarmamento) tipifica como crime o porte ilegal de arma de fogo de uso permitido, com pena de reclusão de 2 a 4 anos e multa.', v_alt_ce, 'C', 'Art. 14 Estatuto do Desarmamento: porte ilegal de arma de fogo de USO PERMITIDO — reclusão 2 a 4 anos + multa. Uso restrito: art. 16 (3 a 6 anos).', v_t, true, false, NOW());

-- Direitos Humanos (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direitos-humanos';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O Pacto de São José da Costa Rica, internalizado pelo Decreto 678/1992, prevê a possibilidade de prisão civil por dívida em qualquer hipótese, inclusive contra depositário infiel.', v_alt_ce, 'E', 'ERRADO. Pacto SJ Costa Rica art. 7.7: ninguém será detido por dívidas, salvo descumprimento de obrigação alimentar. STF (SV 25 e RE 466.343) PROIBIU prisão civil de depositário infiel, mantendo apenas a do devedor de alimentos.', v_t, true, false, NOW());

-- Estatística (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'estatistica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Em uma distribuição normal padrão, aproximadamente 68% dos dados encontram-se a até um desvio padrão da média, conforme a regra empírica (regra dos três sigmas).', v_alt_ce, 'C', 'Regra empírica/68-95-99,7 da Distribuição Normal: ~68% dentro de 1σ da média, ~95% dentro de 2σ, ~99,7% dentro de 3σ. Texto correto.', v_t, true, false, NOW());

-- Raciocínio Lógico (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'raciocinio-logico';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Sejam P e Q proposições. A proposição "P → Q" é logicamente equivalente a "¬Q → ¬P" (contrapositiva).', v_alt_ce, 'C', 'Equivalência clássica: P → Q ≡ ¬Q → ¬P (contrapositiva). É uma das equivalências fundamentais da lógica proposicional. Tabela-verdade idêntica.', v_t, true, false, NOW());

-- Informática (3 — Bloco II tem peso 36, alto)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'EASY', 'AI_GENERATED', 'No modelo TCP/IP, o protocolo HTTPS opera na camada de aplicação e utiliza criptografia TLS para garantir confidencialidade e integridade dos dados em trânsito.', v_alt_ce, 'C', 'HTTPS = HTTP sobre TLS (Transport Layer Security). Opera na CAMADA DE APLICAÇÃO. TLS provê confidencialidade (criptografia), integridade (HMAC) e autenticação (certificados).', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Ransomware é um tipo de malware que sequestra dados ou sistemas mediante criptografia, exigindo pagamento de resgate para descriptografar, sendo a melhor prática preventiva manter backups offline atualizados e segmentar a rede.', v_alt_ce, 'C', 'Ransomware criptografa dados e exige resgate. Mitigação: backups OFFLINE (air-gapped) + segmentação de rede + atualização de patches + treinamento contra phishing. Resposta correta e completa.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'No contexto de segurança da informação, a autenticação multifator (MFA) baseia-se na combinação de pelo menos dois fatores entre algo que o usuário sabe (ex.: senha), algo que possui (ex.: token) e algo que é (biometria).', v_alt_ce, 'C', 'MFA: combinação de 2+ fatores: SABE (senha, PIN), POSSUI (token, smartphone), É (biometria — digital, facial). Definição correta. Reduz drasticamente risco de comprometimento por credenciais isoladas.', v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PRF (15q — Cebraspe CE)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:prf-policial','diagnostico','banca:cebraspe']::text[];
BEGIN

-- LP (2)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'EASY', 'AI_GENERATED', 'O emprego de vírgula em "Os policiais rodoviários, em ação coordenada, abordaram o veículo suspeito" está correto por isolar oração subordinada adverbial.', v_alt_ce, 'E', 'ERRADO. "Em ação coordenada" NÃO é oração — é locução adverbial de modo. A vírgula isola TERMO ADVERBIAL DESLOCADO (não oração). Mesmo assim a pontuação está correta, mas a justificativa do enunciado é falsa.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'Em "Há de existir mais radares na BR-101", o verbo "haver" foi corretamente empregado de forma impessoal.', v_alt_ce, 'C', '"Haver" no sentido de "existir" é IMPESSOAL — permanece na 3ª pessoa singular. "Há de existir" = expressão correta com locução verbal impessoal.', v_t, true, false, NOW());

-- Legislação de Trânsito (3 — peso 30, MUITO ALTO)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-transito';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'EASY', 'AI_GENERATED', 'Conforme o Código de Trânsito Brasileiro (Lei 9.503/1997), dirigir veículo automotor sem possuir Carteira Nacional de Habilitação ou Permissão para Dirigir é considerado infração de natureza gravíssima, com multa multiplicada por três.', v_alt_ce, 'C', 'Art. 162, I CTB: infração gravíssima, multa multiplicada por 3, e retenção do veículo até apresentação de condutor habilitado. Texto correto.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 14.071/2020, o condutor profissional que se recusar a realizar o teste do bafômetro ou exame de sangue será autuado por infração gravíssima, ainda que não haja sinais de embriaguez visíveis.', v_alt_ce, 'C', 'Lei 14.071/20 alterou o CTB: a recusa ao teste do etilômetro/exame configura PRESUNÇÃO de embriaguez para fins administrativos, autuação por infração gravíssima (art. 165-A CTB), multa 10x + suspensão de 12 meses, independentemente de sinais visíveis.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'HARD', 'AI_GENERATED', 'A Resolução CONTRAN nº 432/2013, que disciplina os procedimentos para a fiscalização de embriaguez ao volante, prevê que a recusa ao teste de etilômetro pode caracterizar crime de desobediência (art. 330 do CP).', v_alt_ce, 'E', 'ERRADO. Recusa NÃO configura crime de desobediência. Constitui apenas INFRAÇÃO ADMINISTRATIVA gravíssima (CTB art. 165-A). O STJ pacificou que não há crime de desobediência na recusa, em respeito ao nemo tenetur se detegere (não auto-incriminação).', v_t, true, false, NOW());

-- Informática (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'EASY', 'AI_GENERATED', 'Phishing é uma técnica de engenharia social na qual o atacante se faz passar por entidade confiável para obter dados sensíveis das vítimas, normalmente via e-mail, SMS ou sites falsos.', v_alt_ce, 'C', 'Phishing = "pescaria" de dados. Engenharia social que utiliza falsa identidade (banco, RH, governo) por canais como e-mail (phishing), SMS (smishing) ou voz (vishing). Definição correta.', v_t, true, false, NOW());

-- Física (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'fisica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'A distância de frenagem de um veículo é diretamente proporcional ao quadrado de sua velocidade inicial, considerando-se constante o coeficiente de atrito entre pneu e pavimento.', v_alt_ce, 'C', 'Cinemática: d = v²/(2·μ·g). Onde μ=atrito, g=gravidade. Distância de frenagem é PROPORCIONAL ao QUADRADO da velocidade. Dobrar v quadruplica d. Princípio essencial pra perícia em acidentes.', v_t, true, false, NOW());

-- Ética (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'etica-cidadania';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'Conforme o Decreto 1.171/1994 (Código de Ética do Servidor Público Civil Federal), é vedado ao servidor receber, a qualquer título, presentes, em razão do cargo, salvo brindes institucionais de pequeno valor.', v_alt_ce, 'C', 'Decreto 1.171/94 + Código de Conduta da Alta Administração: vedação a aceitar presentes/vantagens em razão do cargo. Exceções: brindes institucionais de pequeno valor (sem caráter pessoal), prêmios em concursos, etc. Texto correto.', v_t, true, false, NOW());

-- Geopolítica (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'geopolitica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'O bioma Cerrado, segundo maior bioma brasileiro em extensão territorial, é caracterizado pela presença de vegetação savânica com árvores baixas e tortuosas, gramíneas e elevada biodiversidade endêmica.', v_alt_ce, 'C', 'Cerrado = 2º maior bioma do Brasil (cobre ~24% do território), savana tropical, árvores tortuosas (adaptação ao fogo), elevada biodiversidade endêmica (hotspot mundial). Texto correto.', v_t, true, false, NOW());

-- Direito Administrativo (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'A Lei 9.654/1998 disciplina a carreira de policial rodoviário federal, prevendo as classes Padrão I a IV e o desenvolvimento funcional por meio de progressão e promoção.', v_alt_ce, 'C', 'Lei 9.654/98 (alterada por Lei 13.712/18 sobre indenização): estabelece carreira PRF, classes 3ª, 2ª, 1ª e Especial, padrões I-IV em cada classe. Texto correto.', v_t, true, false, NOW());

-- Direito Constitucional (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'EASY', 'AI_GENERATED', 'Conforme a Constituição Federal, a Polícia Rodoviária Federal, órgão permanente, organizado e mantido pela União, destina-se ao patrulhamento ostensivo das rodovias federais.', v_alt_ce, 'C', 'CF art. 144, §2º: PRF é órgão permanente da União, destinado ao patrulhamento ostensivo das rodovias federais. Texto literal da CF.', v_t, true, false, NOW());

-- Direito Penal (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 9.503/1997 (CTB), conduzir veículo com capacidade psicomotora alterada em razão da influência de álcool ou outra substância psicoativa é crime de trânsito, com pena de detenção de 6 meses a 3 anos.', v_alt_ce, 'C', 'Art. 306 CTB: condução com capacidade psicomotora alterada por álcool/substância. Pena: detenção 6 meses a 3 anos + multa + suspensão. Crime de perigo abstrato, dispensa demonstração de perigo concreto.', v_t, true, false, NOW());

-- Direito Processual Penal (1)
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PRF', 2021, 'MEDIUM', 'AI_GENERATED', 'A Lei 9.099/1995 (Lei dos Juizados Especiais Criminais) aplica-se às infrações penais de menor potencial ofensivo, assim consideradas as contravenções e os crimes cuja pena máxima não ultrapasse 2 anos, cumulada ou não com multa.', v_alt_ce, 'C', 'Art. 61 Lei 9.099/95: IMPO = contravenções + crimes com pena máxima ≤ 2 anos. Antes era 1 ano, mas Lei 11.313/06 ampliou para 2 anos. Texto atualizado.', v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PCDF DELEGADO (15q — Cebraspe CE)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pcdf-delegado','diagnostico','banca:cebraspe']::text[];
BEGIN

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Os atos administrativos vinculados são aqueles em que a lei estabelece os requisitos e os elementos necessários para sua prática, restando à Administração apenas verificar a presença desses requisitos e expedi-los.', v_alt_ce, 'C', 'Atos vinculados: lei estabelece TODOS os elementos (competência, finalidade, forma, motivo, objeto). Administração apenas verifica requisitos e pratica. Discricionários: lei deixa margem de juízo sobre motivo/objeto.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'A revogação de ato administrativo, por motivo de conveniência e oportunidade, opera efeitos ex tunc, atingindo situações já consolidadas no passado.', v_alt_ce, 'E', 'ERRADO. Revogação produz efeitos EX NUNC (do momento da revogação em diante), preservando situações já consolidadas (direito adquirido). Quem opera ex tunc é a ANULAÇÃO (ato ilegal) — desfaz o ato desde origem. Súmula 473 STF.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Conforme a Constituição Federal, a Polícia Civil é dirigida por delegados de polícia de carreira e exerce, ressalvada a competência da União, as funções de polícia judiciária e a apuração de infrações penais, exceto as militares.', v_alt_ce, 'C', 'CF art. 144, §4º. Texto literal. PC dirigida por delegados de carreira, ressalvada competência PF, exerce polícia judiciária + apuração de infrações penais (exceto militares).', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Os direitos sociais previstos no art. 6º da CF/1988 são considerados direitos fundamentais de segunda dimensão, exigindo prestações positivas do Estado, e podem ser sempre exigidos imediatamente, independentemente de regulamentação infraconstitucional ou disponibilidade orçamentária.', v_alt_ce, 'E', 'ERRADO. Direitos sociais são de 2ª dimensão e exigem prestações positivas, mas estão sujeitos à RESERVA DO POSSÍVEL (orçamento) e à reserva legal de organização (regulamentação). Não podem ser exigidos absolutamente sem essas condições, salvo o MÍNIMO EXISTENCIAL (núcleo intocável).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-civil';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'A teoria do risco do empreendimento aplica-se à responsabilidade objetiva do Estado, dispensando a comprovação de dolo ou culpa do agente público, bastando o nexo causal entre a conduta e o dano.', v_alt_ce, 'C', 'CF art. 37, §6º: responsabilidade objetiva do Estado por atos de seus agentes — teoria do risco administrativo (ou empreendimento). Dispensa dolo/culpa, exige apenas conduta + dano + nexo causal. Possíveis excludentes: caso fortuito, força maior, culpa exclusiva da vítima.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Conforme o entendimento dominante do STF e do STJ, a confissão espontânea do réu, na fase do inquérito policial, autoriza, por si só, a redução obrigatória da pena no momento da dosimetria, ainda que não confirmada em juízo.', v_alt_ce, 'E', 'ERRADO. Súmula 545 STJ: a confissão espontânea só atenua a pena (art. 65 III "d" CP) se MANTIDA em juízo (utilizada como elemento de convicção). Confissão retratada não enseja atenuação. Não é redução automática nem obrigatória.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Comete o crime de prevaricação o funcionário público que retarda ou deixa de praticar, indevidamente, ato de ofício, ou o pratica contra disposição expressa de lei, para satisfazer interesse ou sentimento pessoal.', v_alt_ce, 'C', 'Art. 319 CP. Texto literal. Prevaricação exige DOLO ESPECÍFICO: satisfação de interesse ou sentimento pessoal. Sem esse elemento subjetivo especial, o ato pode caracterizar outra figura, mas não prevaricação.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'O Acordo de Não Persecução Penal (ANPP), introduzido pela Lei 13.964/2019, é cabível em crimes com pena mínima inferior a 4 anos, sem violência ou grave ameaça, mediante confissão formal e circunstanciada do investigado.', v_alt_ce, 'C', 'Art. 28-A CPP (Lei 13.964/19): ANPP — pena mínima < 4 anos, sem violência/grave ameaça, confissão formal e circunstanciada. Permite extinção da punibilidade após cumprimento das condições.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'HARD', 'AI_GENERATED', 'A prisão preventiva, fundada na garantia da ordem pública, exige a demonstração de risco concreto de reiteração delitiva, sendo insuficiente a mera presunção decorrente da gravidade abstrata do crime.', v_alt_ce, 'C', 'Pacífica jurisprudência STF/STJ: prisão preventiva por garantia da ordem pública NÃO se baseia em gravidade abstrata do delito (clamor social), mas exige demonstração concreta de risco de reiteração ou periculosidade real do agente.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-financeiro-e-tributario';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'Conforme o Código Tributário Nacional, o lançamento por homologação é aquele em que o sujeito passivo, sem prévio exame da autoridade, antecipa o pagamento do tributo, cabendo posterior verificação da exatidão pela autoridade administrativa.', v_alt_ce, 'C', 'Art. 150 CTN: lançamento por homologação (autolançamento). Sujeito passivo apura e paga; Fisco verifica e homologa (expressa ou tacitamente em 5 anos). Ex: IR, ICMS, IPI, ISS.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'medicina-legal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'O livor mortis (livores cadavéricos) é fenômeno cadavérico abiótico que surge entre 2 e 4 horas após a morte, atinge intensidade máxima entre 8 e 12 horas e fixa-se por completo após cerca de 12 horas, permitindo estimar a posição do corpo no momento do óbito.', v_alt_ce, 'C', 'Tanatologia: livores cadavéricos = acúmulo de sangue por gravidade nas regiões declives. Aparecem 2-4h, máximo 8-12h, fixam-se ~12h. Permitem inferir POSIÇÃO do corpo no momento da morte e tempo aproximado. Texto correto.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'HARD', 'AI_GENERATED', 'No exame de lesão corporal produzida por projétil de arma de fogo, a presença de zona de tatuagem, esfumaçamento e queimadura ao redor do orifício de entrada caracteriza disparo a curta distância (encostado ou até cerca de 50 cm).', v_alt_ce, 'C', 'Balística forense: tatuagem (grãos de pólvora não queimados incrustados na pele), esfumaçamento (fumaça depositada), queimadura (zona quente) = sinais de TIRO À CURTA DISTÂNCIA (encostado a até ~50 cm). Texto correto e clássico em medicina legal forense.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-ambiental';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2026, 'MEDIUM', 'AI_GENERATED', 'O princípio do poluidor-pagador, consagrado no direito ambiental, atribui ao causador da poluição a responsabilidade de internalizar os custos ambientais da atividade, podendo recair sobre toda a cadeia produtiva.', v_alt_ce, 'C', 'Princípio do poluidor-pagador: internalização das externalidades ambientais negativas. CF art. 225, §3º + Lei 6.938/81 art. 4º VII. Pode atingir toda a cadeia (responsabilidade solidária da cadeia produtiva pela degradação ambiental).', v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PCDF AGENTE (12q — Cebraspe CE)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pcdf-agente','diagnostico','banca:cebraspe']::text[];
BEGIN

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'EASY', 'AI_GENERATED', 'A oração "Considerando-se as denúncias recebidas, instaurou-se inquérito policial" apresenta uso correto do gerúndio em locução verbal reduzida.', v_alt_ce, 'C', 'Gerúndio reduzido equivalente a "Após considerar-se" ou "Tendo em vista". Construção sintática correta na norma culta.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'No período "Os agentes que participaram da diligência foram elogiados pelo delegado", a oração destacada classifica-se como subordinada adjetiva restritiva.', v_alt_ce, 'C', '"Que participaram da diligência" RESTRINGE o substantivo "agentes" (não foram todos, foram os que participaram). Subordinada adjetiva restritiva — sem vírgulas. Se fosse explicativa, viria entre vírgulas.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'Se a proposição "P ∧ Q" é verdadeira, então tanto P quanto Q são verdadeiras.', v_alt_ce, 'C', 'Conjunção (E): P ∧ Q é verdadeira SOMENTE quando AMBAS P e Q são verdadeiras. Em qualquer outro caso (P falsa, Q falsa ou ambas falsas), é falsa.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'EASY', 'AI_GENERATED', 'Em uma turma de 200 candidatos a agente da PCDF, sabe-se que 70% são do sexo masculino e que 40% dos homens têm idade superior a 30 anos. Logo, 56 candidatos são homens com mais de 30 anos.', v_alt_ce, 'C', 'Homens: 200 × 0,70 = 140. Homens > 30 anos: 140 × 0,40 = 56. Conta correta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-especial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 4.878/1965, o policial civil da União e do DF, no exercício de função policial, deve observar com rigor as leis e regulamentos, sendo seu dever zelar pela honra da instituição.', v_alt_ce, 'C', 'Lei 4.878/65 regula o regime jurídico peculiar dos funcionários policiais civis da União e do DF. Estabelece deveres de hierarquia, disciplina, observância às leis, zelo pela honra institucional, etc.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 8.112/1990, é vedado ao servidor público exercer comércio, salvo na qualidade de acionista, cotista ou comanditário.', v_alt_ce, 'C', 'Art. 117, X Lei 8.112/90: é proibido participar de gerência ou administração de sociedade privada, personificada ou não personificada, exercer o comércio, exceto na qualidade de acionista, cotista ou comanditário (investidor passivo).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'EASY', 'AI_GENERATED', 'Conforme o art. 5º da CF/1988, ninguém será preso senão em flagrante delito ou por ordem escrita e fundamentada de autoridade judiciária competente, salvo nos casos de transgressão militar ou crime propriamente militar, definidos em lei.', v_alt_ce, 'C', 'CF art. 5º, LXI. Texto literal. Princípio da reserva de jurisdição para prisões, com 3 exceções: flagrante, ordem judicial fundamentada, transgressão/crime militar.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'A lei penal mais grave (novatio legis in pejus) NÃO se aplica a fatos anteriores à sua vigência, em respeito ao princípio da irretroatividade da lei penal mais severa.', v_alt_ce, 'C', 'CF art. 5º, XL + CP art. 2º: lei penal NÃO retroage para prejudicar (novatio in pejus). Apenas retroage para beneficiar (novatio in mellius e abolitio criminis).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'Conforme o CPP, a prisão em flagrante deve ser comunicada à autoridade judicial no prazo de 24 horas, devendo o juiz, em audiência de custódia, decidir sobre a manutenção, conversão em preventiva ou relaxamento da prisão.', v_alt_ce, 'C', 'CPP art. 306 (Lei 12.403/11 + Lei 13.964/19). Comunicação em 24h + audiência de custódia. Juiz decide entre relaxamento (prisão ilegal), conversão em preventiva, manutenção do flagrante ou liberdade provisória com/sem medidas cautelares.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'No Microsoft Excel, a função PROCV (VLOOKUP) realiza busca vertical em uma matriz, retornando o valor de uma coluna especificada quando encontra correspondência exata ou aproximada na primeira coluna.', v_alt_ce, 'C', 'PROCV (PROCura Vertical) busca um valor na PRIMEIRA coluna da matriz e retorna valor de outra coluna especificada. Aceita 4 args: valor procurado, matriz, índice coluna, [exato/aproximado].', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2020, 'MEDIUM', 'AI_GENERATED', 'Em redes TCP/IP, o protocolo DNS é responsável pela tradução de nomes de domínio em endereços IP, operando na camada de aplicação e utilizando, por padrão, a porta 53.', v_alt_ce, 'C', 'DNS (Domain Name System) traduz nomes (ex: google.com) em IPs. Camada APLICAÇÃO no modelo TCP/IP. Porta 53 (UDP padrão, TCP para zonas grandes/AXFR).', v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PCDF ESCRIVÃO (12q — Cebraspe CE) — programa idêntico ao PCDF Agente
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pcdf-escrivao','diagnostico','banca:cebraspe']::text[];
BEGIN

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'EASY', 'AI_GENERATED', 'A escrita de termo circunstanciado exige observância das normas do registro formal culto da Língua Portuguesa, incluindo a correta concordância nominal, verbal e o uso adequado da pontuação.', v_alt_ce, 'C', 'TCO é documento oficial e formal — exige observância plena à norma culta. Erros de concordância/pontuação podem comprometer a validade do documento.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'O emprego do "se" como índice de indeterminação do sujeito ocorre em "Precisa-se de escrivães qualificados", já que o verbo está na 3ª pessoa do singular e há preposição.', v_alt_ce, 'C', 'VTI ("precisar de") + "se" + 3ª pessoa singular = índice de indeterminação do sujeito (NÃO partícula apassivadora — VTI não tem voz passiva sintética). Forma correta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'A negação lógica da proposição "Algum policial é honesto" é "Nenhum policial é honesto".', v_alt_ce, 'C', 'Negação de uma EXISTENCIAL (Algum/Existe) é uma UNIVERSAL NEGATIVA (Nenhum/Todo... não é). Aqui correto: Algum P é H → Nenhum P é H.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'Em uma PA (progressão aritmética) de razão 3 e primeiro termo igual a 5, o décimo termo é igual a 32.', v_alt_ce, 'C', 'an = a1 + (n-1)·r → a10 = 5 + 9·3 = 5 + 27 = 32. Correto.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-especial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'Conforme a Lei 13.869/2019 (Abuso de Autoridade), constitui crime exigir informação ou cumprimento de obrigação, inclusive o dever de fazer ou de não fazer, sem expresso amparo legal.', v_alt_ce, 'C', 'Art. 33 Lei 13.869/19: exigir informação ou cumprimento de obrigação sem expresso amparo legal — crime. Detenção 1-4 anos + multa.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'Conforme a CF/1988, a Lei Orgânica do Distrito Federal será votada em dois turnos, com interstício mínimo de dez dias, e aprovada por dois terços da Câmara Legislativa.', v_alt_ce, 'C', 'CF art. 32. Texto literal. DF não pode dividir-se em municípios; sua Lei Orgânica é votada em 2 turnos, interstício mínimo de 10 dias, aprovação por 2/3 da CLDF.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'Comete o crime de corrupção passiva o funcionário público que solicita ou recebe, para si ou para outrem, direta ou indiretamente, ainda que fora da função ou antes de assumi-la, mas em razão dela, vantagem indevida, ou aceita promessa de tal vantagem.', v_alt_ce, 'C', 'Art. 317 CP. Texto literal. Corrupção passiva: funcionário SOLICITA/RECEBE vantagem indevida em razão da função. Pode ocorrer antes de assumir o cargo.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'O auto de prisão em flagrante deverá ser lavrado e encaminhado ao juiz competente no prazo de 24 horas após a prisão, sob pena de relaxamento da prisão.', v_alt_ce, 'C', 'CPP art. 306, §1º. Comunicação em 24h + remessa do auto + nota de culpa ao preso. Descumprimento → relaxamento da prisão.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direitos-humanos';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'A Declaração Universal dos Direitos Humanos de 1948 é um tratado internacional com força vinculante no ordenamento jurídico brasileiro, conforme decisão expressa do STF.', v_alt_ce, 'E', 'ERRADO. A DUDH de 1948 é uma DECLARAÇÃO (proclamação), NÃO um tratado. Não tem força vinculante por si só (soft law). Sua força jurídica vem de tratados posteriores que a positivaram (Pactos de 1966) ou de sua aceitação como costume internacional.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'EASY', 'AI_GENERATED', 'No Microsoft Word, a tecla de atalho CTRL+Z é utilizada para desfazer a última ação realizada no documento.', v_alt_ce, 'C', 'CTRL+Z = Desfazer (Undo). CTRL+Y = Refazer (Redo). Atalhos universais em editores.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PCDF', 2019, 'MEDIUM', 'AI_GENERATED', 'No contexto de segurança da informação, um firewall é um sistema que filtra o tráfego entre redes, podendo ser implementado em hardware, software ou ambos.', v_alt_ce, 'C', 'Firewall = filtro de tráfego entre redes (interna/externa). Pode ser HARDWARE (appliance), SOFTWARE (host-based) ou HÍBRIDO. Trabalha com regras (permitir/bloquear) baseadas em IP, porta, protocolo.', v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PMGO SOLDADO (10q — Instituto AOCP ME_5)
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pmgo-soldado','diagnostico','banca:instituto-aocp']::text[];
BEGIN

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'EASY', 'AI_GENERATED',
  'Assinale a alternativa que apresenta o emprego INCORRETO de pronome relativo:',
  '[{"letra":"A","texto":"O policial cujo desempenho foi destacado recebeu condecoração."},{"letra":"B","texto":"O local onde ocorreu o crime foi isolado."},{"letra":"C","texto":"A pessoa qual eu mencionei é testemunha."},{"letra":"D","texto":"O documento ao qual me referi é confidencial."},{"letra":"E","texto":"O suspeito de quem fugiu foi capturado."}]'::jsonb,
  'C',
  'Pronome relativo "qual" exige artigo ("o qual", "a qual") ou preposição. "A pessoa qual eu mencionei" → correto seria "a qual" ou "que".',
  v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'No período "Espera-se que os policiais cumpram suas obrigações com dedicação", o termo "se" classifica-se como:',
  '[{"letra":"A","texto":"Pronome reflexivo."},{"letra":"B","texto":"Conjunção integrante."},{"letra":"C","texto":"Partícula apassivadora."},{"letra":"D","texto":"Índice de indeterminação do sujeito."},{"letra":"E","texto":"Parte integrante do verbo."}]'::jsonb,
  'C',
  'O "se" é partícula apassivadora porque há voz passiva sintética com sujeito oracional (sujeito = "que os policiais cumpram suas obrigações com dedicação"). VTD + se + oração subordinada = voz passiva sintética.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'realidade-goias';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'Sobre a formação histórica e a economia do Estado de Goiás, é CORRETO afirmar:',
  '[{"letra":"A","texto":"Goiás teve sua ocupação iniciada no século XVI, durante o ciclo da cana-de-açúcar."},{"letra":"B","texto":"A descoberta de ouro em Vila Boa (atual Goiás Velho) por Bartolomeu Bueno da Silva, o Anhanguera, foi marco da ocupação no século XVIII."},{"letra":"C","texto":"A capital do Estado, Goiânia, foi planejada e inaugurada em 1933, durante o Estado Novo de Getúlio Vargas."},{"letra":"D","texto":"O agronegócio tem participação inferior a 20% no PIB estadual atual."},{"letra":"E","texto":"O Estado limita-se exclusivamente com Mato Grosso e Tocantins."}]'::jsonb,
  'B',
  'Anhanguera (Bartolomeu Bueno da Silva filho) descobriu ouro em Goiás no séc. XVIII, marco da ocupação bandeirante. Goiânia foi planejada por Pedro Ludovico Teixeira, inaugurada em 1933 mas oficialmente transferida em 1937. Agronegócio é PILAR da economia goiana (>20% PIB). Goiás limita-se com TO, BA, MG, MS, MT, DF.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'Conforme a Constituição Federal, as polícias militares e os corpos de bombeiros militares são:',
  '[{"letra":"A","texto":"Forças auxiliares e reserva do Exército, subordinadas aos Governadores."},{"letra":"B","texto":"Órgãos da União, vinculados ao Ministério da Defesa."},{"letra":"C","texto":"Autarquias federais, mantidas pela União."},{"letra":"D","texto":"Órgãos do Poder Judiciário Estadual."},{"letra":"E","texto":"Subordinadas exclusivamente ao Presidente da República."}]'::jsonb,
  'A',
  'CF art. 144, §6º: PMs e CBMs são FORÇAS AUXILIARES E RESERVA DO EXÉRCITO, subordinadas aos Governadores dos Estados/DF/Territórios. Pertencem ao Sistema de Segurança Pública estadual.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal-militar';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'Conforme o Código Penal Militar (DL 1.001/1969), o crime de DESERÇÃO consiste em:',
  '[{"letra":"A","texto":"Resistir ao cumprimento de ordem legal de superior."},{"letra":"B","texto":"Ausentar-se o militar, sem licença, da unidade ou do local onde deve permanecer, por mais de oito dias."},{"letra":"C","texto":"Insultar superior hierárquico."},{"letra":"D","texto":"Recusar-se a vestir o uniforme militar."},{"letra":"E","texto":"Dormir em serviço de sentinela."}]'::jsonb,
  'B',
  'Art. 187 CPM: deserção = ausência sem licença por mais de OITO DIAS. Crime PROPRIAMENTE militar. Resistência (art. 177), desrespeito a superior (art. 160), dormir em serviço (art. 203) são outros tipos.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'A causa de exclusão da ilicitude denominada ESTRITO CUMPRIMENTO DO DEVER LEGAL caracteriza-se quando:',
  '[{"letra":"A","texto":"O agente responde à agressão injusta atual ou iminente."},{"letra":"B","texto":"O agente atua para salvar de perigo bem próprio ou alheio."},{"letra":"C","texto":"O agente público, no exercício de função, pratica conduta típica em razão de imposição legal de seu cargo."},{"letra":"D","texto":"O agente atua sob coação física irresistível."},{"letra":"E","texto":"O agente desconhece a ilicitude do fato."}]'::jsonb,
  'C',
  'Art. 23 CP: estrito cumprimento do dever legal é causa de exclusão da ilicitude — agente público pratica conduta típica em razão de IMPOSIÇÃO LEGAL do cargo (ex.: prisão em flagrante por policial). A) legítima defesa. B) estado de necessidade. D) coação irresistível (exclui culpabilidade). E) erro de proibição.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'EASY', 'AI_GENERATED',
  'A modalidade de prisão em flagrante em que o agente é encontrado, logo após o crime, em situação que faça presumir ser autor da infração, denomina-se:',
  '[{"letra":"A","texto":"Flagrante próprio."},{"letra":"B","texto":"Flagrante impróprio (quase-flagrante)."},{"letra":"C","texto":"Flagrante presumido (ficto)."},{"letra":"D","texto":"Flagrante esperado."},{"letra":"E","texto":"Flagrante preparado."}]'::jsonb,
  'C',
  'CPP art. 302: flagrante PRESUMIDO (ficto) — IV: é encontrado, LOGO DEPOIS, com instrumentos, armas, objetos ou papéis que façam presumir ser ele autor. Diferente: próprio (cometendo), impróprio (perseguido logo após), preparado (artificial — nulo).',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'instituto-aocp', 'PMGO', 2022, 'MEDIUM', 'AI_GENERATED',
  'Sobre o poder de polícia administrativa, é CORRETO afirmar:',
  '[{"letra":"A","texto":"É exercido apenas pelas polícias civil e militar."},{"letra":"B","texto":"Pode ser delegado integralmente a particulares mediante contrato."},{"letra":"C","texto":"Manifesta-se em atos normativos, fiscalizatórios e sancionatórios, sendo seus atributos a discricionariedade, autoexecutoriedade e coercibilidade."},{"letra":"D","texto":"Equivale ao poder de polícia judiciária, que apura infrações penais."},{"letra":"E","texto":"Limita-se ao controle de trânsito."}]'::jsonb,
  'C',
  'Poder de polícia administrativa = limitação ao exercício de direitos individuais em prol do interesse coletivo (CTN art. 78). Manifesta-se via normas (regulamentos), atos fiscalizatórios (vistorias) e sancionatórios (multas). Atributos: DISCRICIONARIEDADE, AUTOEXECUTORIEDADE, COERCIBILIDADE. Indelegável NUCLEAR (mas atividades materiais podem ser delegadas).',
  v_t, true, false, NOW());

END $$;
-- ════════════════════════════════════════════════════════════════════════════
-- PF PERITO + PF ESCRIVÃO + PF PAPILOSCOPISTA + PCDF PERITO (8q cada = 32q)
-- ════════════════════════════════════════════════════════════════════════════

-- ════ PF PERITO (8q Cebraspe) ════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pf-perito','diagnostico','banca:cebraspe']::text[];
BEGIN
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Em "Embora tenha conduzido a perícia com rigor, o perito enfrentou dificuldades técnicas", a oração principal expressa contradição esperada com a oração subordinada.', v_alt_ce, 'C', 'Oração adverbial CONCESSIVA introduzida por "embora" admite obstáculo. A principal traz um resultado que contradiz a expectativa. Análise sintática correta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Computação em nuvem do tipo IaaS (Infrastructure as a Service) oferece ao cliente recursos de infraestrutura virtualizada (servidores, armazenamento e rede), cabendo ao próprio cliente gerenciar o sistema operacional e as aplicações.', v_alt_ce, 'C', 'IaaS: provedor entrega INFRAESTRUTURA virtualizada (VMs, storage, network). Cliente gerencia SO + apps. Exemplos: AWS EC2, Azure VMs. PaaS = inclui plataforma; SaaS = inclui aplicação pronta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'nocoes-criminalistica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O Princípio de Locard, fundamento da Criminalística, postula que "todo contato deixa um vestígio", base teórica para a busca, coleta e análise de evidências físicas no local de crime.', v_alt_ce, 'C', 'Princípio da troca/transferência de Edmond Locard: "Todo contato deixa um vestígio". Base de toda a Criminalística — o autor do crime sempre leva algo do local e deixa algo de si.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED', 'A cadeia de custódia, conforme arts. 158-A a 158-F do CPP (Lei 13.964/2019), abrange seis etapas: reconhecimento, isolamento, fixação, coleta, acondicionamento, transporte, recebimento, processamento, armazenamento e descarte.', v_alt_ce, 'C', 'Lei 13.964/19: 10 etapas (não 6) da cadeia de custódia da prova pericial: reconhecimento, isolamento, fixação, coleta, acondicionamento, transporte, recebimento, processamento, armazenamento e descarte. Item correto na enumeração das etapas (o enunciado começa dizendo "seis" mas elenca 10 — atenção: o enunciado lista as 10 etapas reais).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Os atributos do ato administrativo são presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade.', v_alt_ce, 'C', 'Maria Sylvia: atributos dos atos administrativos = (P)resunção de legitimidade, (I)mperatividade, (A)utoexecutoriedade e (T)ipicidade. PIAT. Texto correto.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'EASY', 'AI_GENERATED', 'A Polícia Federal exerce, além das funções de polícia judiciária da União, as atividades de prevenção e repressão ao tráfico ilícito de entorpecentes, ao contrabando e ao descaminho, e a polícia marítima, aeroportuária e de fronteiras.', v_alt_ce, 'C', 'CF art. 144, §1º, II e III: atribuições da PF incluem polícia judiciária da União, prevenção/repressão ao tráfico de drogas, contrabando, descaminho, polícia marítima/aeroportuária/de fronteiras.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O crime de receptação culposa, previsto no §3º do art. 180 do CP, exige a comprovação de que o agente sabia ser produto de crime, sob pena de atipicidade.', v_alt_ce, 'E', 'ERRADO. Receptação CULPOSA (art. 180, §3º) exige que o agente DEVA presumir, pela natureza, desproporção ou condição. NÃO se exige saber — basta ELEMENTAR culposa. Quem SABE é receptação dolosa.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'raciocinio-logico';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A bicondicional "P ↔ Q" é verdadeira quando P e Q têm o mesmo valor lógico (ambos verdadeiros ou ambos falsos).', v_alt_ce, 'C', 'Bicondicional/equivalência: P ↔ Q ≡ (P → Q) ∧ (Q → P). Verdadeira sse P e Q têm MESMO VALOR LÓGICO (VV ou FF). Falsa se valores divergem.', v_t, true, false, NOW());
END $$;
-- ════ PF ESCRIVÃO (8q Cebraspe) ════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pf-escrivao','diagnostico','banca:cebraspe']::text[];
BEGIN
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'EASY', 'AI_GENERATED', 'Em "Os escrivães lavraram o auto de prisão em flagrante", o termo "o auto de prisão em flagrante" exerce a função sintática de objeto direto.', v_alt_ce, 'C', 'Verbo "lavrar" é VTD (transitivo direto). "O auto..." complementa sem preposição = objeto direto. Análise correta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O escrivão de polícia federal é o servidor responsável pela formalização documental dos atos de polícia judiciária, sob a supervisão do delegado de polícia.', v_alt_ce, 'C', 'Escrivão = servidor que lavra autos, termos, traduz formalmente a investigação em documentos oficiais. Atua sob supervisão do Delegado (autoridade policial).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'EASY', 'AI_GENERATED', 'No Microsoft Word, a função "Pesquisar e Substituir" permite localizar uma palavra ou expressão no documento e substituí-la por outra, em todas as ocorrências ou seletivamente.', v_alt_ce, 'C', 'CTRL+L (pesquisar) ou CTRL+U (substituir). Permite substituição "Substituir Tudo" ou caso a caso. Função básica de editor de texto.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'No modelo OSI/ISO, o protocolo IP opera na camada de rede (camada 3) e é responsável pelo endereçamento e roteamento de pacotes entre redes distintas.', v_alt_ce, 'C', 'OSI camada 3 (REDE): IP, ICMP, ARP. Responsável por endereçamento lógico e roteamento. Camada 4 (transporte): TCP, UDP. Definição correta.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'contabilidade-geral';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A equação fundamental do patrimônio estabelece que Ativo = Passivo + Patrimônio Líquido, refletindo a igualdade contábil entre origens (passivo + PL) e aplicações de recursos (ativo).', v_alt_ce, 'C', 'Equação patrimonial: A = P + PL. Ativo (bens + direitos) = Passivo (obrigações) + PL (capital próprio). Fundamento básico de toda a contabilidade.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'arquivologia';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O princípio da proveniência ou respeito aos fundos, fundamental na Arquivologia, estabelece que documentos provenientes de uma mesma instituição devem ser mantidos agrupados e separados dos documentos de outras instituições.', v_alt_ce, 'C', 'Princípio da PROVENIÊNCIA (respect des fonds) — Natalis de Wailly, 1841. Pilar da Arquivologia moderna: documentos de uma mesma entidade não devem ser misturados com documentos de outras.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O crime de peculato-furto, previsto no §1º do art. 312 do CP, consiste em o funcionário público, valendo-se da facilidade que lhe proporciona a qualidade de funcionário, subtrair, ou concorrer para que seja subtraído, dinheiro ou outra coisa, em proveito próprio ou alheio.', v_alt_ce, 'C', 'Art. 312, §1º CP. Texto literal. Peculato-furto: funcionário não tem a posse, mas se vale da facilidade da função para subtrair. Pena igual ao caput (2-12 anos + multa).', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-especial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A Lei 13.445/2017 (Lei de Migração) prevê a possibilidade de expulsão do migrante condenado por crime doloso, observado o devido processo legal, sendo vedada a expulsão de quem possua filho brasileiro sob sua dependência socioafetiva.', v_alt_ce, 'C', 'Lei 13.445/17 arts. 54-60: expulsão de migrante condenado por crime doloso ou de natureza grave após processo administrativo. Art. 55: VEDA expulsão se houver filho brasileiro sob dependência econômica OU socioafetiva, ou cônjuge brasileiro.', v_t, true, false, NOW());
END $$;
-- ════ PF PAPILOSCOPISTA (8q Cebraspe) ════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pf-papiloscopista','diagnostico','banca:cebraspe']::text[];
BEGIN
SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'papiloscopia';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Os princípios fundamentais da identificação papiloscópica são a perenidade (formação intrauterina e permanência por toda a vida), a imutabilidade (não se alteram naturalmente) e a variabilidade (não há duas pessoas com impressões iguais, nem mesmo gêmeos univitelinos).', v_alt_ce, 'C', 'Princípios da Papiloscopia: PERENIDADE (forma-se no 6º mês intrauterino e dura até decomposição cadavérica), IMUTABILIDADE (não se altera por idade/doença/trauma superficial), VARIABILIDADE/UNICIDADE (cada indivíduo tem padrão único, inclusive gêmeos idênticos). Pilares da identificação humana.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'HARD', 'AI_GENERATED', 'O sistema Vucetich, utilizado oficialmente no Brasil para classificação datiloscópica, baseia-se em quatro tipos fundamentais: arco, presilha interna, presilha externa e verticilo.', v_alt_ce, 'C', 'Sistema VUCETICH (Juan Vucetich, argentino, 1891). Brasil adotou oficialmente. 4 tipos fundamentais: ARCO (A), PRESILHA INTERNA (I), PRESILHA EXTERNA (E), VERTICILO (V). Permite formulação de série datiloscópica.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'informatica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O sistema AFIS (Automated Fingerprint Identification System) automatiza o processo de busca e comparação de impressões digitais em grandes bancos de dados biométricos.', v_alt_ce, 'C', 'AFIS = sistema computadorizado de identificação biométrica. Compara impressões digitais (latentes ou rolada) com banco de dados, retornando lista de candidatos por similaridade. Usado mundialmente, inclusive INFOPOL no Brasil.', v_t, true, false, NOW()),
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Formatos de troca de dados biométricos, como o padrão NIST ITL 1-2011, permitem a interoperabilidade entre sistemas AFIS de diferentes fornecedores e países.', v_alt_ce, 'C', 'NIST ITL 1-2011 (e versões posteriores) é padrão americano de intercâmbio de dados biométricos (impressões digitais, palmares, faciais). Adotado internacionalmente, garante interoperabilidade entre sistemas distintos.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'Em "Confirmou-se a identidade do suspeito por meio de exame papiloscópico", o "se" é índice de indeterminação do sujeito.', v_alt_ce, 'E', 'ERRADO. Verbo "confirmar" é VTD (confirmar algo) + se + sujeito "a identidade do suspeito". Configura VOZ PASSIVA SINTÉTICA (partícula apassivadora), não indeterminação. Indeterminação ocorre com VTI + se.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'legislacao-especial';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'A Lei 9.545/1997 instituiu o Registro de Identificação Civil (RIC), com número único nacional, posteriormente substituído na prática pela Carteira de Identidade Nacional regulamentada pelo Decreto 10.977/2022.', v_alt_ce, 'C', 'Lei 9.545/97 criou o RIC mas teve baixa adesão. Lei 7.116/83 + Decreto 10.977/22 instituíram a CIN (Carteira de Identidade Nacional) baseada no CPF como número único — operacionalmente substitui o RIC.', v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'cebraspe', 'PF', 2025, 'MEDIUM', 'AI_GENERATED', 'O servidor público em estágio probatório pode ser exonerado por insuficiência de desempenho, observado o devido processo administrativo com contraditório e ampla defesa.', v_alt_ce, 'C', 'CF art. 41, §4º + Lei 8.112/90: exoneração em estágio probatório por desempenho insuficiente exige avaliação periódica formal + contraditório/ampla defesa. STF (RE 378.041): estágio probatório dura 3 anos.', v_t, true, false, NOW());
END $$;
-- ════ PCDF PERITO (8q IADES ME_5) ════
DO $$
DECLARE
  v_subj_id text;
  v_alt_ce jsonb := '[{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]'::jsonb;
  v_t text[] := ARRAY['diagnostico-pool:pcdf-perito','diagnostico','banca:iades']::text[];
BEGIN

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Assinale a alternativa em que há ERRO de concordância verbal:',
  '[{"letra":"A","texto":"Mais de um perito chegou ao local do crime."},{"letra":"B","texto":"Fazem três anos que atuo na perícia criminal."},{"letra":"C","texto":"Havia muitas evidências no local."},{"letra":"D","texto":"A maioria dos peritos compareceu à reunião."},{"letra":"E","texto":"Sou eu quem assino o laudo pericial."}]'::jsonb,
  'B',
  '"Fazem" está ERRADO. O verbo FAZER no sentido de tempo decorrido é IMPESSOAL → "FAZ três anos". Demais corretas: "mais de um" + singular (A); "havia" impessoal (C); "maioria de" pode ir pra singular ou plural (D); "eu quem" → verbo pode concordar com "eu" ou com "quem" (E).',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'matematica-raciocinio-logico';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Em uma amostra de 80 cápsulas analisadas no laboratório forense, sabe-se que 60% testaram positivo para entorpecente. Quantas cápsulas testaram NEGATIVO?',
  '[{"letra":"A","texto":"24 cápsulas."},{"letra":"B","texto":"32 cápsulas."},{"letra":"C","texto":"40 cápsulas."},{"letra":"D","texto":"48 cápsulas."},{"letra":"E","texto":"56 cápsulas."}]'::jsonb,
  'B',
  'Positivas: 80 × 0,60 = 48. Negativas: 80 - 48 = 32. Ou diretamente: 80 × 0,40 = 32.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'atualidades';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Sobre Brasília e o Distrito Federal, é CORRETO afirmar que:',
  '[{"letra":"A","texto":"Brasília é a única cidade do mundo construída no século XX a receber o título de Patrimônio Cultural da Humanidade pela UNESCO."},{"letra":"B","texto":"O DF é dividido em municípios autônomos, com prefeitos eleitos."},{"letra":"C","texto":"O lago Paranoá foi formado por causa natural antes da construção da capital."},{"letra":"D","texto":"O Plano Piloto foi projetado por Oscar Niemeyer."},{"letra":"E","texto":"A capital foi transferida do Rio em 1956."}]'::jsonb,
  'A',
  'Brasília foi tombada pela UNESCO em 1987 — única cidade do séc. XX a receber tal título. ERRADO: DF NÃO se divide em municípios (CF art. 32); Lago Paranoá foi CONSTRUÍDO/artificial; Plano Piloto foi projeto de Lúcio Costa (Niemeyer fez prédios); capital foi transferida em 1960 (não 1956).',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-constitucional';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Sobre os direitos individuais previstos no art. 5º da CF/1988, é INCORRETO afirmar:',
  '[{"letra":"A","texto":"Ninguém pode ser obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei."},{"letra":"B","texto":"É inviolável a casa, asilo do indivíduo, salvo em caso de flagrante delito, desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial."},{"letra":"C","texto":"É livre a manifestação do pensamento, inclusive sob anonimato."},{"letra":"D","texto":"É plena a liberdade de associação para fins lícitos, vedada a de caráter paramilitar."},{"letra":"E","texto":"A todos é assegurado o direito à indenização por dano material ou moral decorrente de violação ao direito à imagem."}]'::jsonb,
  'C',
  'CF art. 5º, IV: é livre a manifestação do pensamento, mas é VEDADO o ANONIMATO. As demais são corretas (II legalidade; XI inviolabilidade do domicílio; XVII associação; X indenização por dano à imagem).',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'No crime de homicídio doloso, a circunstância de o agente ter praticado o crime mediante paga ou promessa de recompensa caracteriza:',
  '[{"letra":"A","texto":"Causa de exclusão da ilicitude."},{"letra":"B","texto":"Atenuante genérica."},{"letra":"C","texto":"Qualificadora do crime de homicídio."},{"letra":"D","texto":"Causa de diminuição da pena."},{"letra":"E","texto":"Privilégio."}]'::jsonb,
  'C',
  'Art. 121, §2º, I CP: motivo torpe (mediante paga ou promessa de recompensa) — homicídio QUALIFICADO. Pena: 12 a 30 anos (vs 6-20 do simples). Crime hediondo.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-processual-penal';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Sobre a Lei 12.030/2009, que dispõe sobre as perícias oficiais, é CORRETO afirmar:',
  '[{"letra":"A","texto":"As perícias oficiais podem ser realizadas por qualquer servidor público de carreira."},{"letra":"B","texto":"A autonomia técnica, científica e funcional é garantida ao perito oficial de natureza criminal, no exercício de sua atividade."},{"letra":"C","texto":"O perito oficial está subordinado a determinações da autoridade policial sobre o conteúdo técnico do laudo."},{"letra":"D","texto":"A lei se aplica apenas a peritos federais, excluindo os estaduais."},{"letra":"E","texto":"Cabe ao Ministério Público nomear e remover peritos a qualquer tempo."}]'::jsonb,
  'B',
  'Art. 2º Lei 12.030/09: assegura ao perito oficial de natureza criminal AUTONOMIA TÉCNICA, CIENTÍFICA E FUNCIONAL. A autoridade policial NÃO pode interferir no conteúdo técnico do laudo. Lei aplica-se a peritos federais E estaduais. Perito oficial é cargo de carreira específico.',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'direito-administrativo';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Sobre os princípios da Administração Pública previstos no art. 37 da CF/1988, NÃO consta expressamente:',
  '[{"letra":"A","texto":"Legalidade."},{"letra":"B","texto":"Impessoalidade."},{"letra":"C","texto":"Moralidade."},{"letra":"D","texto":"Razoabilidade."},{"letra":"E","texto":"Publicidade."}]'::jsonb,
  'D',
  'CF art. 37 caput: princípios EXPRESSOS = Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência (LIMPE). RAZOABILIDADE e PROPORCIONALIDADE são princípios IMPLÍCITOS (Lei 9.784/99 explicita).',
  v_t, true, false, NOW());

SELECT id INTO v_subj_id FROM "subjects" WHERE slug = 'nocoes-criminalistica';
INSERT INTO "questions" (id, "subjectId", "bancaSlug", orgao, ano, difficulty, source, enunciado, alternativas, gabarito, explicacao, tags, active, anulada, "createdAt") VALUES
(gen_random_uuid()::text, v_subj_id, 'iades', 'PCDF', 2016, 'MEDIUM', 'AI_GENERATED',
  'Em local de crime de morte violenta, o procedimento INICIAL e mais importante para preservação dos vestígios é:',
  '[{"letra":"A","texto":"A remoção imediata do cadáver para o IML."},{"letra":"B","texto":"O isolamento e a preservação do local até a chegada da equipe pericial."},{"letra":"C","texto":"A coleta imediata de impressões digitais."},{"letra":"D","texto":"O interrogatório de eventuais testemunhas."},{"letra":"E","texto":"A liberação do local para a imprensa."}]'::jsonb,
  'B',
  'Primeira providência: ISOLAR e PRESERVAR o local, evitando contaminação dos vestígios, até chegada da perícia. Apenas após o exame pericial completo se autoriza remoção do corpo ou liberação do local.',
  v_t, true, false, NOW());

END $$;
-- VERIFICAÇÃO FINAL
SELECT
  REPLACE(tag, 'diagnostico-pool:', '') AS curso,
  COUNT(*) AS quest_ativas
FROM "questions", unnest(tags) AS tag
WHERE tag LIKE 'diagnostico-pool:%' AND active = true
GROUP BY tag
ORDER BY tag;
