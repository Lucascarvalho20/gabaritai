-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 1 — Cebraspe (PF, PRF, PCDF)
-- Data: 2026-06-06
--
-- Insere conteúdo completo + resumo dos tópicos universais mais pesados.
-- Vale pra TODOS os cursos que usam o subject (PF Del, PRF, PCDF Del/Ag/Esc).
--
-- Status: DRAFT (aguarda revisão do admin antes de aparecer pro aluno).
-- origin='ai' marca geração via IA. Re-rodar atualiza, mas NÃO regride status
-- de materiais já revisados/publicados (preserva trabalho do admin).
--
-- Estrutura por bloco:
--   1. Pega topicId via SELECT
--   2. UPSERT Material (cacheKey = 'topic-<id>')
--   3. UPSERT MaterialResumo 1:1
--
-- DEPENDE de 2026-06-06-topics-universais.sql ter rodado antes.
-- ════════════════════════════════════════════════════════════════════════════

-- Helper: função pra reduzir verbosidade. Cria/atualiza material + resumo
-- pra um topic específico (por subject_slug + topic_name).
CREATE OR REPLACE FUNCTION upsert_material(
  p_subject_slug text,
  p_topic_name text,
  p_title text,
  p_content text,
  p_resumo text
) RETURNS void AS $func$
DECLARE
  v_topic_id text;
  v_subject_id text;
  v_material_id text;
  v_cache_key text;
BEGIN
  SELECT t.id, t."subjectId" INTO v_topic_id, v_subject_id
  FROM "topics" t JOIN "subjects" s ON s.id = t."subjectId"
  WHERE s.slug = p_subject_slug AND t.name = p_topic_name
  LIMIT 1;

  IF v_topic_id IS NULL THEN
    RAISE NOTICE 'Tópico não encontrado: % / %', p_subject_slug, p_topic_name;
    RETURN;
  END IF;

  v_cache_key := 'topic-' || v_topic_id;

  -- UPSERT Material por cacheKey
  INSERT INTO "materials" (id, "subjectId", "topicId", "cacheKey", title, type, content, active, status, origin, "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text, v_subject_id, v_topic_id, v_cache_key,
    p_title, 'TEXTO', p_content, true, 'DRAFT', 'ai', NOW(), NOW()
  )
  ON CONFLICT ("cacheKey") DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    -- NÃO sobrescreve status se já foi REVIEWED ou PUBLISHED (preserva revisão do admin)
    status = CASE
      WHEN "materials".status IN ('REVIEWED', 'PUBLISHED') THEN "materials".status
      ELSE 'DRAFT'::"MaterialStatus"
    END,
    "updatedAt" = NOW()
  RETURNING id INTO v_material_id;

  -- Se UPSERT atualizou, pegar id manualmente
  IF v_material_id IS NULL THEN
    SELECT id INTO v_material_id FROM "materials" WHERE "cacheKey" = v_cache_key;
  END IF;

  -- UPSERT MaterialResumo
  INSERT INTO "material_resumos" (id, "materialId", resumo, "generatedBy", "generatedAt")
  VALUES (gen_random_uuid()::text, v_material_id, p_resumo, 'ai', NOW())
  ON CONFLICT ("materialId") DO UPDATE SET
    resumo = EXCLUDED.resumo,
    "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO CONSTITUCIONAL — Princípios Fundamentais (Art 1º a 4º)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Princípios Fundamentais (Art 1º a 4º)',
  'Princípios Fundamentais da CF/88',
  $md$
# Princípios Fundamentais (Art 1º a 4º da CF/88)

Os primeiros quatro artigos da Constituição Federal traçam a **identidade jurídica e política** do Estado brasileiro: que tipo de Estado somos, em que fundamentos nos sustentamos, quais objetivos buscamos e como nos relacionamos com outros países. Em provas Cebraspe, são tema constante porque exigem **memorização literal combinada com interpretação**.

## Art 1º — Fundamentos da República (memorize: SO-CI-DI-VA-PLU)

> A República Federativa do Brasil, formada pela união indissolúvel dos Estados e Municípios e do Distrito Federal, constitui-se em **Estado Democrático de Direito** e tem como fundamentos:

- **I** — a **so**berania
- **II** — a **ci**dadania
- **III** — a **di**gnidade da pessoa humana
- **IV** — os **va**lores sociais do trabalho e da livre iniciativa
- **V** — o **plu**ralismo político

**Parágrafo único** — "Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos desta Constituição."

### Pontos críticos para Cebraspe
- A forma de Estado é **Federação** (não confunda com forma de governo).
- A forma de governo é **República** (escolha do povo, mandato com prazo, alternância de poder).
- O regime é **Democrático de Direito** (atenção: a Constituição não fala em "social", embora doutrina admita).
- **Municípios são entes federativos** — diferente de muitos países. Decoreba clássica de prova.

## Art 2º — Separação dos Poderes

> "São Poderes da União, independentes e harmônicos entre si, o Legislativo, o Executivo e o Judiciário."

**Características essenciais:**
- A separação é **funcional**, não absoluta — cada poder exerce funções típicas e atípicas (ex.: Legislativo julga nos crimes de responsabilidade do Presidente; Executivo legisla via Medida Provisória).
- É **cláusula pétrea** (Art 60, §4º, III).
- A doutrina chama de **freios e contrapesos** (checks and balances).

## Art 3º — Objetivos Fundamentais (memorize: CON-GA-ER-PRO)

> Constituem objetivos fundamentais da República Federativa do Brasil:

- **I** — **con**struir uma sociedade livre, justa e solidária
- **II** — **ga**rantir o desenvolvimento nacional
- **III** — **er**radicar a pobreza e a marginalização e reduzir as desigualdades sociais e regionais
- **IV** — **pro**mover o bem de todos, sem preconceitos de origem, raça, sexo, cor, idade e quaisquer outras formas de discriminação

### Pegadinha clássica
São verbos de **ação** (construir, garantir, erradicar, promover) — é **direito programático**. Cebraspe adora trocar "construir" por "manter" ou inverter o objeto.

## Art 4º — Princípios das Relações Internacionais (10 incisos)

> A República Federativa do Brasil rege-se nas suas relações internacionais pelos seguintes princípios:

- I — independência nacional
- II — prevalência dos **direitos humanos**
- III — autodeterminação dos povos
- IV — não-intervenção
- V — igualdade entre os Estados
- VI — defesa da paz
- VII — solução pacífica dos conflitos
- VIII — repúdio ao terrorismo e ao racismo
- IX — cooperação entre os povos para o progresso da humanidade
- X — concessão de **asilo político**

**Parágrafo único** — "A República Federativa do Brasil buscará a integração econômica, política, social e cultural dos povos da **América Latina**, visando à formação de uma comunidade latino-americana de nações."

### Decoreba estratégica
O Cebraspe gosta de trocar "América Latina" por "América do Sul" — está errado. E gosta de incluir "Europa" na cooperação — não está no texto.

## Como cai na Cebraspe (estilo Certo/Errado)

A banca trabalha com **transcrição quase literal**, alterando uma palavra para inverter o sentido. Exemplos típicos:

**Item 1 (CERTO):** "A dignidade da pessoa humana é fundamento da República Federativa do Brasil."

**Item 2 (ERRADO):** "A separação dos Poderes é princípio constitucional sensível, podendo ser excluída por emenda constitucional aprovada por 3/5 do Congresso."
> Errado: é cláusula pétrea (Art 60, §4º, III), **não pode** ser objeto de emenda.

**Item 3 (CERTO):** "Os Municípios são entes federativos no Brasil, integrando a estrutura federativa junto com a União, os Estados e o Distrito Federal."

**Item 4 (ERRADO):** "Os objetivos fundamentais da República incluem manter o desenvolvimento nacional."
> Errado: é **garantir** o desenvolvimento, não manter.

## Súmulas e Jurisprudência Relevante

- **ADI 3510/STF** — utilizou o princípio da dignidade humana para julgar constitucional a Lei de Biossegurança (pesquisa com células-tronco embrionárias).
- O STF reconhece a **soberania popular** como fundamento que pode ser exercido por **iniciativa popular**, plebiscito e referendo (Art 14).

## Estratégia de revisão
Decorar o **MNEMÔNICO** dos fundamentos (SO-CI-DI-VA-PLU) e dos objetivos (CON-GA-ER-PRO) economiza segundos na prova. Releia os Art 1º a 4º **literalmente** três vezes na semana de prova — Cebraspe troca uma palavra e ganha o item.
$md$,
  $resumo$
## Resumo — Princípios Fundamentais (CF/88)

**Art 1º — Fundamentos** (SO-CI-DI-VA-PLU):
- Soberania, Cidadania, Dignidade da pessoa humana, Valores sociais do trabalho e livre iniciativa, Pluralismo político.
- **Estado Democrático de Direito**. Forma de Estado: Federação. Forma de Governo: República.
- Municípios **são** entes federativos.

**Art 2º — Separação dos Poderes**: Legislativo, Executivo, Judiciário — independentes e harmônicos. **Cláusula pétrea** (Art 60, §4º, III). Sistema de freios e contrapesos.

**Art 3º — Objetivos** (CON-GA-ER-PRO):
- **Construir** sociedade livre, justa e solidária
- **Garantir** desenvolvimento nacional
- **Erradicar** pobreza e desigualdades
- **Promover** bem de todos sem preconceitos

**Art 4º — Relações Internacionais** (10 princípios):
- Prevalência dos direitos humanos, autodeterminação, não-intervenção, igualdade entre Estados, defesa da paz, solução pacífica, repúdio a terrorismo e racismo, cooperação, asilo político.
- Parágrafo único: integração com **América Latina**.

### Pegadinhas Cebraspe
- "Manter" vs "Garantir" no Art 3º (errado vs certo)
- "América do Sul" vs "América Latina" no Art 4º
- Separação dos Poderes **não pode** ser abolida por EC
- Soberania é fundamento, **não** objetivo
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO CONSTITUCIONAL — Direitos e Garantias Fundamentais (Art 5º)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Direitos e Garantias Fundamentais (Art 5º)',
  'Direitos e Garantias Fundamentais — Art 5º',
  $md$
# Direitos e Garantias Fundamentais (Art 5º)

O Art 5º é o **mais cobrado** em todas as provas Cebraspe da área policial. São 78 incisos + 4 parágrafos. Não dá pra decorar tudo, mas é obrigatório dominar os **mais cobrados** e a **lógica geral** dos direitos.

## Características gerais dos Direitos Fundamentais

- **Universais**: aplicáveis a brasileiros e estrangeiros residentes no País (e, segundo STF, também a estrangeiros em trânsito).
- **Históricos**: surgem em momentos específicos, evoluem.
- **Inalienáveis**: não podem ser vendidos/cedidos.
- **Imprescritíveis**: não se perdem pelo decurso do tempo.
- **Irrenunciáveis** como um todo, embora o exercício possa ser não exercido.
- **Relativos**: nenhum direito é absoluto (clássico STF).
- **Concorrentes**: podem coexistir.
- **Aplicação imediata** (§1º).

## Estrutura por dimensões (ou gerações)

- **1ª dimensão** — liberdade (direitos civis e políticos): vida, liberdade, propriedade.
- **2ª dimensão** — igualdade (direitos sociais): saúde, educação, trabalho.
- **3ª dimensão** — fraternidade/solidariedade: meio ambiente, paz, autodeterminação dos povos.
- **4ª e 5ª dimensões** (controvertidas): bioética, democracia direta, paz mundial.

## Direitos individuais mais cobrados

### Direito à vida
- Vedação à pena de morte, **salvo em caso de guerra declarada** (Art 5º, XLVII, a).
- Vedação à eutanásia ativa (embora ortotanásia seja juridicamente debatida).

### Liberdade de manifestação do pensamento
- É **vedado o anonimato** (Art 5º, IV). Pegadinha clássica: pode opinar, mas tem que se identificar.

### Inviolabilidade de domicílio (Art 5º, XI)
> A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, **salvo**:
- em caso de **flagrante delito**
- em caso de **desastre**
- para **prestar socorro**
- **durante o dia**, por determinação judicial

**Pegadinha:** ordem judicial à noite **não permite** entrada — só durante o dia. STF entende "dia" como das **6h às 18h** (aurora à boca da noite, segundo a doutrina).

### Sigilo de comunicações (Art 5º, XII)
> É **inviolável o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas**, salvo, no último caso, por **ordem judicial**, nas hipóteses e na forma que a lei estabelecer para fins de **investigação criminal ou instrução processual penal**.

**Atenção:** o STF flexibilizou o sigilo das comunicações telefônicas — interceptação só com ordem judicial (Lei 9.296/96). Já o sigilo de dados bancários pode ser quebrado pelo Fisco em casos específicos.

### Habeas Corpus (Art 5º, LXVIII)
> Conceder-se-á habeas corpus sempre que alguém sofrer ou se achar ameaçado de sofrer **violência ou coação em sua liberdade de locomoção**, por ilegalidade ou abuso de poder.

- Gratuito (Art 5º, LXXVII).
- Pode ser impetrado por qualquer pessoa (não precisa de advogado).
- Cabe contra ato de juiz, autoridade policial, particular.

### Mandado de Segurança (Art 5º, LXIX)
> Para proteger direito líquido e certo, **não amparado por HC ou HD**, quando o responsável for autoridade pública ou agente de pessoa jurídica no exercício de atribuições do Poder Público.

- Prazo decadencial: **120 dias** do conhecimento do ato (Lei 12.016/09).
- **Direito líquido e certo** = comprovável documentalmente sem dilação probatória.

### Habeas Data (Art 5º, LXXII)
- Para conhecer informações pessoais ou retificá-las em bancos de dados públicos ou de caráter público.

### Mandado de Injunção (Art 5º, LXXI)
- Quando falta norma regulamentadora que torne inviável o exercício de direitos e liberdades constitucionais.

## §§ do Art 5º

- **§1º** — Aplicação **imediata** das normas definidoras de direitos e garantias fundamentais.
- **§2º** — Os direitos do Art 5º **não excluem outros** decorrentes do regime e princípios da CF.
- **§3º** — **Tratados de direitos humanos aprovados em cada Casa do Congresso, em dois turnos, por 3/5 dos votos**, equivalem a **emendas constitucionais** (ex.: Convenção sobre Direitos das Pessoas com Deficiência).
- **§4º** — O Brasil se submete à jurisdição do **Tribunal Penal Internacional**.

## Como cai na Cebraspe

**Item 1 (CERTO):** "É garantida a todos a livre manifestação do pensamento, sendo vedado o anonimato."

**Item 2 (ERRADO):** "A casa é asilo inviolável, podendo a polícia nela ingressar a qualquer hora, mesmo à noite, mediante ordem judicial."
> Errado: ordem judicial só **durante o dia**.

**Item 3 (CERTO):** "Conforme entendimento do STF, o ingresso forçado em domicílio sem mandado judicial é lícito quando amparado em fundadas razões, devidamente justificadas a posteriori, que indiquem flagrante delito no interior da casa." (Tema 280, repercussão geral).

**Item 4 (ERRADO):** "Tratados internacionais de direitos humanos têm hierarquia de emenda constitucional, independentemente do procedimento de aprovação."
> Errado: só se aprovados pelo rito do §3º. Caso contrário, têm status **supralegal** (entendimento do STF — Pacto de San José).

## Súmulas críticas
- **Súmula Vinculante 11**: uso de algemas só em casos de **resistência, fundado receio de fuga ou perigo à integridade física** — sob pena de responsabilidade.
- **Súmula 14 STF**: é direito do defensor o acesso aos elementos de prova **já documentados** no inquérito (mesmo em sigilo).

## Estratégia
- Decore os **remédios constitucionais** (HC, MS, MI, HD, ação popular, ação civil pública) e seus pressupostos.
- Memorize o **§3º** — equivalência de tratados a EC só com rito específico.
- Conheça a **Súmula Vinculante 11** e a **jurisprudência sobre flagrante em domicílio**.
$md$,
  $resumo$
## Resumo — Art 5º CF/88

**Características dos Direitos Fundamentais**: universais, históricos, inalienáveis, imprescritíveis, irrenunciáveis, **relativos** (nenhum é absoluto), aplicação **imediata** (§1º).

### Direitos críticos
- **Vida**: pena de morte só em guerra declarada
- **Manifestação do pensamento**: vedado **anonimato** (IV)
- **Domicílio (XI)**: invioláveldelete; entrada só com (1) consentimento, (2) flagrante, (3) desastre, (4) socorro, ou (5) ordem judicial **durante o dia** (6h-18h)
- **Sigilo de comunicações (XII)**: interceptação telefônica só com ordem judicial e na forma da Lei 9.296/96

### Remédios constitucionais
- **HC** (LXVIII): liberdade de locomoção; gratuito; qualquer pessoa pode impetrar
- **MS** (LXIX): direito líquido e certo; 120 dias decadenciais
- **MI** (LXXI): falta de norma regulamentadora
- **HD** (LXXII): informações pessoais em bancos de dados

### §§ do Art 5º
- §1º: aplicação **imediata**
- §2º: rol **não taxativo** (outros direitos decorrem)
- §3º: tratados DH com rito 3/5 + 2 turnos = **EC**; sem isso = supralegal
- §4º: submissão ao TPI

### Jurisprudência crítica
- SV 11: algemas só em casos justificados
- STF (Tema 280): ingresso sem mandado lícito com fundadas razões justificadas a posteriori
- Tratados DH não aprovados pelo §3º = **supralegais** (não legais nem constitucionais)

### Pegadinhas Cebraspe
- Ordem judicial à noite **NÃO** permite entrada em casa
- Anonimato é **vedado**, mas a manifestação é livre
- Direitos fundamentais NÃO são absolutos
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO CONSTITUCIONAL — Administração Pública (Art 37 a 41)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Administração Pública (Art 37 a 41)',
  'Administração Pública na CF — Art 37 a 41',
  $md$
# Administração Pública (Art 37 a 41 da CF/88)

Bloco vital para concursos de carreiras públicas. Cobra **literalidade do texto**, **princípios** e **regras de pessoal**.

## Art 37 — Princípios e regras gerais

> A administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de **legalidade, impessoalidade, moralidade, publicidade e eficiência** [LIMPE].

**Princípios implícitos** mais cobrados: razoabilidade, proporcionalidade, motivação, supremacia do interesse público, indisponibilidade do interesse público, autotutela, segurança jurídica.

### Inciso II — Concurso público
> A investidura em cargo ou emprego público depende de aprovação prévia em concurso público de provas ou de provas e títulos, de acordo com a natureza e a complexidade do cargo ou emprego, na forma prevista em lei, **ressalvadas as nomeações para cargo em comissão declarado em lei de livre nomeação e exoneração**.

**Importantíssimo**: cargo em comissão **dispensa** concurso. Função de confiança é exercida exclusivamente por servidores efetivos.

### Inciso III — Prazo do concurso
> O prazo de validade do concurso público será de **até 2 anos, prorrogável uma vez, por igual período**.

### Inciso V — Funções de confiança vs cargos em comissão
- **Função de confiança**: só servidor efetivo. Para atribuições de direção, chefia e assessoramento.
- **Cargo em comissão**: pode ser não-servidor (livre nomeação/exoneração). Para direção, chefia e assessoramento, **percentual mínimo** reservado a servidor de carreira na forma da lei.

### Inciso VII — Direito de greve
- Servidor público civil **tem direito** de greve, mas depende de lei específica (ainda não editada, aplica-se por analogia a lei do setor privado — MI 670, 708 e 712 do STF).

### Inciso X — Revisão geral anual
- Remuneração e subsídio dos servidores serão revistos anualmente, **sempre na mesma data e sem distinção de índices**.

### Inciso XI — Teto remuneratório
- Limite: **subsídio mensal, em espécie, dos Ministros do STF**.

## Art 37, §6º — Responsabilidade Civil do Estado
> As pessoas jurídicas de direito público e as de direito privado **prestadoras de serviços públicos** responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, **assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa**.

**Teoria adotada: risco administrativo** (responsabilidade **objetiva** do Estado em face do terceiro; mas subjetiva no regresso ao agente).

**Não confunda** com "risco integral" — risco integral é exceção (ex.: dano nuclear).

## Art 37, §1º — Publicidade dos atos administrativos
> A publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deverá ter caráter educativo, informativo ou de orientação social, **dela não podendo constar nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos**.

## Art 38 — Servidor afastado para mandato eletivo

- **Mandato federal, estadual ou distrital**: afasta do cargo
- **Prefeito**: afasta do cargo, faculdade de optar pela remuneração
- **Vereador**: se houver compatibilidade de horários, **acumula**; se não, igual ao Prefeito

## Art 39 — Regime único
- A União, os Estados, o DF e os Municípios instituirão **conselho de política de administração e remuneração de pessoal**, integrado por servidores designados pelos respectivos Poderes.

## Art 40 — Regime Previdenciário do Servidor (RPPS)
- Reforma da Previdência (EC 103/2019) trouxe mudanças drásticas:
- Aposentadoria por idade + tempo de contribuição
- Mulher: 62 anos + 25 anos de contribuição
- Homem: 65 anos + 25 anos de contribuição
- Servidores policiais: regras especiais (LC 51/85 e EC 103)

## Art 41 — Estabilidade
> São **estáveis após 3 anos** de efetivo exercício os servidores nomeados para cargo de provimento efetivo em virtude de concurso público.

**Atenção**: estágio probatório (geralmente 3 anos, mas pode ser definido em lei) X estabilidade (3 anos da CF).

Perde o cargo:
- I — sentença judicial transitada em julgado
- II — processo administrativo (ampla defesa e contraditório)
- III — procedimento de avaliação periódica de desempenho
- §4º (EC 19/98): mediante procedimento de avaliação periódica de desempenho.

**Reintegração**: se invalidada a demissão, será reintegrado, e o eventual ocupante da vaga, **reconduzido ao cargo de origem**, sem direito a indenização, aproveitado em outro cargo ou posto em **disponibilidade com remuneração proporcional ao tempo de serviço**.

## Como cai na Cebraspe

**Item 1 (CERTO):** "A administração pública direta e indireta de qualquer dos Poderes obedece aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência."

**Item 2 (ERRADO):** "Conforme a CF, o prazo de validade do concurso público será de até 4 anos, prorrogável uma vez."
> Errado: **até 2 anos**, prorrogável uma vez por igual período.

**Item 3 (CERTO):** "A responsabilidade civil das pessoas jurídicas de direito público por atos de seus agentes é objetiva, baseada na teoria do risco administrativo."

**Item 4 (ERRADO):** "O servidor adquire estabilidade após 2 anos de efetivo exercício no cargo de provimento efetivo."
> Errado: **3 anos** (EC 19/98).

## Súmulas e Jurisprudência
- **SV 13** (nepotismo): vedada a nomeação para cargo em comissão de cônjuge, companheiro ou parente até 3º grau de autoridade nomeante.
- **SV 21**: inconstitucional exigência de depósito ou arrolamento prévios como condição para recurso administrativo.
- **STF, RE 191.668**: cargo em comissão criado por lei para atribuições típicas de carreira é inconstitucional.

## Estratégia
- Decore os princípios LIMPE + 5-6 implícitos.
- Memorize: 2 anos prazo concurso, 3 anos estabilidade, teto = subsídio STF, 6 horas dia/18h noite para domicílio.
- Conheça SV 13 (nepotismo) — cai sempre.
$md$,
  $resumo$
## Resumo — Administração Pública (Art 37 a 41)

### Princípios (LIMPE + implícitos)
- **L**egalidade, **I**mpessoalidade, **M**oralidade, **P**ublicidade, **E**ficiência
- Implícitos: razoabilidade, proporcionalidade, motivação, supremacia/indisponibilidade do interesse público, autotutela, segurança jurídica

### Concurso público (II e III)
- Obrigatório, salvo cargo em comissão
- Prazo: **até 2 anos, prorrogável uma vez por igual período**

### Cargo em comissão x função de confiança
- **Cargo em comissão**: pode ser não-servidor; livre nomeação/exoneração
- **Função de confiança**: só servidor efetivo

### §6º — Responsabilidade civil
- **Teoria do risco administrativo** (objetiva ao Estado, subjetiva no regresso)
- PJ de direito **privado prestadora de serviço público** também responde objetivamente

### Estabilidade (Art 41)
- **3 anos** de efetivo exercício
- Perde por: sentença transitada, PAD, avaliação periódica de desempenho

### Súmulas críticas
- **SV 13**: nepotismo — cônjuge, companheiro, parente até 3º grau
- **SV 21**: inconstitucional depósito prévio para recurso adm

### Pegadinhas Cebraspe
- Prazo concurso é **2 anos**, NÃO 4
- Estabilidade é **3 anos**, NÃO 2 (mudança da EC 19/98)
- Risco administrativo, NÃO integral
- Cargo em comissão NÃO precisa de concurso
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO ADMINISTRATIVO — Princípios da Administração Pública
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Princípios da Administração Pública (LIMPE e implícitos)',
  'Princípios da Administração Pública',
  $md$
# Princípios da Administração Pública

O Art 37 da CF estabelece os **princípios expressos** (LIMPE), mas a doutrina e o STF reconhecem dezenas de **princípios implícitos** que orientam toda a atividade administrativa.

## Princípios expressos — LIMPE

### 1. Legalidade
- Para o particular: pode fazer tudo que a lei **não proíba**.
- Para o administrador: só pode fazer o que a lei **expressamente autoriza**.
- **Princípio mais importante** do Estado de Direito.
- Limita o poder discricionário e veda atos sem fundamento legal.

### 2. Impessoalidade
Duas dimensões:
- **Para a Administração**: atuar sem favoritismos ou perseguições. Atos imputados ao órgão, não à pessoa.
- **Para o administrado**: tratamento igualitário, sem privilégios pessoais.
- Relaciona-se com Art 37, §1º (publicidade sem promoção pessoal) e com a SV 13 (nepotismo).

### 3. Moralidade
- Atuação conforme **ética administrativa**, não apenas a moral comum.
- Independe da legalidade — ato pode ser legal mas imoral.
- Base para **ação popular** (Art 5º, LXXIII): qualquer cidadão pode anular ato lesivo ao patrimônio público ou à moralidade administrativa.

### 4. Publicidade
- **Regra**: transparência de todos os atos.
- **Exceções**: sigilo justificado por segurança da sociedade e do Estado, intimidade.
- Atos públicos só produzem efeitos após publicação (regra).
- Lei de Acesso à Informação (Lei 12.527/11) regulamenta.

### 5. Eficiência (incluído pela EC 19/98)
- Otimização de recursos. Maior produtividade com menor custo.
- Permite a **demissão por insuficiência de desempenho** (Art 41, §1º, III).

## Princípios implícitos mais cobrados

### Supremacia do Interesse Público sobre o Privado
- Interesse coletivo prevalece sobre interesses individuais.
- Justifica desapropriação, requisição administrativa, poder de polícia.

### Indisponibilidade do Interesse Público
- Administrador **não pode dispor** do interesse público (não é dono).
- Não pode renunciar, transacionar, alienar sem autorização legal.

### Razoabilidade e Proporcionalidade
- Razoabilidade: atos devem ser razoáveis, não absurdos.
- Proporcionalidade: meios proporcionais aos fins (adequação + necessidade + proporcionalidade em sentido estrito).
- Base para controle judicial dos atos administrativos.

### Motivação
- Atos devem ser motivados (Lei 9.784/99, Art 50): exposição dos fundamentos de fato e direito.
- **Teoria dos motivos determinantes**: se o ato cita motivos, fica vinculado a eles. Se os motivos forem falsos, ato é nulo.

### Autotutela
- Administração pode **rever seus próprios atos** sem precisar do Judiciário.
- **SV 473/STF**: "A Administração pode anular seus próprios atos, quando eivados de vícios que os tornem ilegais, ou revogá-los por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos."
- **Anulação**: vício de legalidade — efeito **ex tunc** (retroage).
- **Revogação**: conveniência e oportunidade — efeito **ex nunc** (prospectivo).

### Segurança Jurídica
- Estabilidade das relações jurídicas. Boa-fé.
- Lei 9.784/99: prazo de **5 anos** para Administração anular atos que beneficiem o administrado (decai).

### Continuidade do Serviço Público
- Serviços essenciais não podem ser interrompidos.
- Greve no setor essencial: continuidade mínima é obrigatória.

### Princípio da Especialidade
- Entes da Administração Indireta só atuam nos limites de sua lei criadora.

### Princípio da Hierarquia
- Estrutura piramidal. Superiores podem dar ordens, fiscalizar, rever atos.

## Como cai na Cebraspe

**Item 1 (CERTO):** "O princípio da legalidade administrativa é mais rígido que o princípio da legalidade aplicável aos particulares: enquanto estes podem fazer tudo que a lei não proíbe, o administrador só pode fazer o que a lei autoriza."

**Item 2 (ERRADO):** "Pela teoria dos motivos determinantes, mesmo que a Administração indique falsamente os motivos do ato, ele permanecerá válido se atendeu à finalidade pública."
> Errado: motivos falsos invalidam o ato.

**Item 3 (CERTO):** "Conforme a Súmula Vinculante 473 do STF, a Administração pode anular atos ilegais ou revogá-los por conveniência e oportunidade, respeitados os direitos adquiridos."

**Item 4 (ERRADO):** "O princípio da publicidade é absoluto, não admitindo exceções no ordenamento jurídico brasileiro."
> Errado: há exceções por sigilo (segurança, intimidade).

## Súmulas críticas
- **SV 13** (nepotismo)
- **SV 473** (autotutela)
- **Súmula 346** (anulação dos próprios atos)

## Estratégia
- Decore LIMPE.
- Memorize 5-7 implícitos com 1 frase cada.
- Saiba a diferença anulação (legalidade, ex tunc) x revogação (conveniência, ex nunc).
- Conheça o prazo decadencial de 5 anos (Lei 9.784/99) — pegadinha clássica.
$md$,
  $resumo$
## Resumo — Princípios da Administração Pública

### LIMPE (Art 37, CF)
- **L**egalidade: administrador só faz o que a lei autoriza
- **I**mpessoalidade: sem favoritismos; atos do órgão, não da pessoa
- **M**oralidade: ética administrativa; base da ação popular
- **P**ublicidade: regra; exceções: segurança, intimidade
- **E**ficiência (EC 19/98): otimização de recursos

### Implícitos mais cobrados
- Supremacia do interesse público
- Indisponibilidade do interesse público
- Razoabilidade e proporcionalidade
- Motivação (Lei 9.784/99, Art 50)
- Autotutela (SV 473)
- Segurança jurídica (prazo decadencial **5 anos** para anular ato benéfico — Lei 9.784/99)
- Continuidade, especialidade, hierarquia

### Autotutela (SV 473)
- **Anulação**: vício de legalidade → ex tunc (retroage)
- **Revogação**: conveniência e oportunidade → ex nunc (não retroage)

### Teoria dos motivos determinantes
- Se ato cita motivos, vincula-se a eles
- Motivos falsos = ato nulo

### Pegadinhas Cebraspe
- Publicidade **NÃO** é absoluta
- Anulação retroage; revogação **não** retroage
- 5 anos é o prazo decadencial para Administração anular ato que beneficia administrado
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO ADMINISTRATIVO — Atos Administrativos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Atos Administrativos: conceito, elementos, atributos, espécies',
  'Atos Administrativos',
  $md$
# Atos Administrativos

Tema central em concursos. Cobra **elementos**, **atributos**, **espécies** e **invalidação**.

## Conceito

Ato administrativo é a manifestação unilateral de vontade da Administração Pública que, atuando sob regime de direito público, **produz efeitos jurídicos imediatos**, com finalidade pública, sob controle do Judiciário.

**Não confunda com:**
- Fato administrativo: evento da natureza ou ação material (sem manifestação de vontade);
- Ato da Administração: gênero amplo (inclui atos privados praticados pela Administração);
- Ato de governo (ato político): atos de alta direção (sanção/veto, declaração de guerra) — controle judicial restrito.

## Elementos (memorize: COFIFOM)

Conforme a doutrina majoritária (e Lei 4.717/65, Lei de Ação Popular):

### 1. Competência
- Sujeito legalmente habilitado.
- **Imprescritível, improrrogável e irrenunciável**.
- Vício: ato pode ser ratificado se a competência for delegável (Lei 9.784/99, Art 13: **não pode delegar** edição de atos normativos, decisão em recursos administrativos, matérias de competência exclusiva).

### 2. Finalidade
- Sempre **pública**.
- Desvio de finalidade = **ato nulo** (vício insanável).

### 3. Forma
- Em regra, **escrita**.
- Vício de forma pode ser sanado em alguns casos.

### 4. Motivo
- **Pressuposto de fato e de direito** que autoriza o ato.
- Teoria dos motivos determinantes: ato vinculado aos motivos declarados.

### 5. Objeto
- Conteúdo do ato — o que o ato dispõe.
- Deve ser lícito, possível, moral.

## Atributos (memorize: PATI)

### 1. Presunção de legitimidade e veracidade
- Ato presume-se legal até prova em contrário.
- Inverte o ônus da prova: quem alega ilegalidade deve provar.

### 2. Autoexecutoriedade
- Administração executa **sem precisar do Judiciário**, em duas hipóteses:
  - Lei autoriza;
  - Situação de urgência.
- Exemplo: demolição de obra irregular, apreensão de mercadorias.
- **Não é absoluta** — cobrança de multa exige execução fiscal (Judiciário).

### 3. Tipicidade
- Cada ato corresponde a uma figura típica prevista em lei.

### 4. Imperatividade
- Impõe obrigações ao particular **independentemente** de concordância.
- Não está em **todo** ato (atos negociais como licença, autorização não são imperativos).

## Discricionariedade x Vinculação

- **Vinculado**: lei define todos os elementos. Administrador não tem margem.
- **Discricionário**: lei dá margem para juízo de **conveniência e oportunidade** (mérito administrativo).
- **Mérito administrativo**: NÃO se submete a controle judicial de mérito (só de legalidade).

## Espécies (classificação por conteúdo)

- **Atos normativos**: gerais e abstratos (decretos, regulamentos).
- **Atos ordinatórios**: organização interna (portarias, circulares).
- **Atos negociais**: acordo de vontade (licença, autorização, permissão).
  - **Licença**: ato vinculado (preenchidos os requisitos, deve conceder).
  - **Autorização**: ato discricionário e precário.
- **Atos enunciativos**: atestam fato (certidões, pareceres).
- **Atos punitivos**: sanções (multa, demissão, interdição).

## Extinção dos Atos

### Anulação
- Vício de **legalidade**.
- Efeito **ex tunc** (retroage).
- Pode ser feita pela Administração (autotutela, SV 473) ou pelo Judiciário.
- Prazo decadencial: **5 anos** se beneficia o administrado de boa-fé (Lei 9.784/99).

### Revogação
- Conveniência e oportunidade (mérito administrativo).
- Efeito **ex nunc** (não retroage).
- Só pode ser feita pela **própria Administração** que praticou o ato.
- **Não pode revogar**: ato vinculado, ato que gerou direito adquirido, ato consumado, ato declarado nulo, ato integrante de procedimento.

### Cassação
- Beneficiário descumpre condições (ex.: licença cassada por construir fora do projeto).

### Caducidade
- Lei superveniente torna o ato incompatível.

### Contraposição
- Ato superveniente contrário extingue o anterior.

## Vícios e convalidação

**Vícios sanáveis**: forma e competência (se não exclusiva).
**Vícios insanáveis**: finalidade, motivo, objeto, competência exclusiva.

Lei 9.784/99, Art 55: atos que apresentarem defeitos sanáveis poderão ser **convalidados** pela própria Administração, em decisão na qual se evidencie não acarretarem lesão ao interesse público nem prejuízo a terceiros.

## Como cai na Cebraspe

**Item 1 (CERTO):** "A Administração Pública pode revogar seus próprios atos discricionários por conveniência e oportunidade, respeitados os direitos adquiridos."

**Item 2 (ERRADO):** "A presunção de legitimidade dos atos administrativos é absoluta, não admitindo prova em contrário."
> Errado: é **relativa** (juris tantum), admite prova em contrário.

**Item 3 (CERTO):** "Pela teoria dos motivos determinantes, a validade do ato administrativo fica vinculada à existência e à veracidade dos motivos declarados."

**Item 4 (ERRADO):** "O Poder Judiciário pode controlar o mérito administrativo dos atos discricionários, anulando-os quando entender que houve má escolha do administrador."
> Errado: Judiciário só controla **legalidade**, não mérito.

## Súmulas críticas
- **SV 473**: autotutela (anulação e revogação)
- **Súmula 346 STF**: Administração pode declarar nulidade dos próprios atos

## Estratégia
- Decore COFIFOM (elementos) e PATI (atributos).
- Saiba diferenciar **licença** (vinculada) de **autorização** (discricionária).
- Domine anulação x revogação x cassação.
- 5 anos decadenciais é decoreba clássica.
$md$,
  $resumo$
## Resumo — Atos Administrativos

### Elementos (COFIFOM)
- **C**ompetência, **F**inalidade, **F**orma, **M**otivo, **O**bjeto
- Atenção: Lei 4.717/65 lista 5 elementos
- Vícios sanáveis: forma, competência (se delegável)
- Vícios insanáveis: finalidade, motivo, objeto, competência exclusiva

### Atributos (PATI)
- **P**resunção de legitimidade/veracidade (relativa)
- **A**utoexecutoriedade (lei ou urgência)
- **T**ipicidade (figura típica em lei)
- **I**mperatividade (NÃO está em todo ato)

### Vinculado x Discricionário
- Vinculado: lei define tudo
- Discricionário: juízo de conveniência (mérito) — **não** controlado judicialmente

### Espécies (memorize)
- Normativo (decreto), ordinatório (portaria), negocial (licença/autorização), enunciativo (certidão), punitivo (multa)
- Licença = **vinculado**; Autorização = **discricionário e precário**

### Extinção
- **Anulação**: ilegalidade → ex tunc (retroage)
- **Revogação**: conveniência → ex nunc (não retroage)
- **Cassação**: descumprimento pelo beneficiário
- **Caducidade**: lei superveniente
- **Contraposição**: ato superveniente contrário

### Prazo decadencial
- **5 anos** (Lei 9.784/99) para anular ato benéfico (boa-fé)

### Pegadinhas Cebraspe
- Presunção de legitimidade é **relativa**
- Judiciário não controla mérito, só legalidade
- Licença é vinculada; autorização é discricionária
- Imperatividade NÃO está em todo ato
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DIREITO ADMINISTRATIVO — Licitações e Contratos (Lei 14.133/2021)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Licitações e Contratos (Lei 14.133/2021)',
  'Licitações e Contratos — Lei 14.133/2021',
  $md$
# Licitações e Contratos (Lei 14.133/2021)

A Lei 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos — NLLC) **revogou** as Leis 8.666/93, 10.520/02 (Pregão) e os arts. 1º a 47-A da Lei 12.462/11 (RDC) a partir de **30 de dezembro de 2023**. Toda licitação a partir daí segue a NLLC.

## Princípios (Art 5º)
Legalidade, impessoalidade, moralidade, publicidade, eficiência, interesse público, probidade administrativa, igualdade, planejamento, transparência, eficácia, segregação de funções, motivação, vinculação ao edital, julgamento objetivo, segurança jurídica, razoabilidade, competitividade, proporcionalidade, celeridade, economicidade, e o desenvolvimento nacional sustentável.

## Modalidades de licitação (Art 28)
1. **Pregão**
2. **Concorrência**
3. **Concurso**
4. **Leilão**
5. **Diálogo competitivo** (nova)

**Atenção**: a NLLC **extinguiu** Convite e Tomada de Preços (que existiam na 8.666). Cebraspe ama essa pegadinha.

### Pregão
- Para bens e serviços **comuns**.
- Critério: **menor preço** ou **maior desconto**.
- Forma eletrônica (regra) ou presencial.

### Concorrência
- Demais hipóteses não cabíveis no pregão.
- Pode usar qualquer critério de julgamento (menor preço, melhor técnica, técnica e preço, etc.).

### Concurso
- Trabalho técnico, científico ou artístico.
- Premiação ou remuneração.

### Leilão
- Venda de bens **inservíveis** ou apreendidos.

### Diálogo competitivo (Art 32)
- Para contratações de objetos complexos onde a Administração precisa **dialogar** com licitantes para definir solução.
- Hipóteses: inovação tecnológica, impossibilidade de definir objeto com precisão.

## Critérios de julgamento (Art 33)
1. Menor preço
2. Maior desconto
3. Melhor técnica ou conteúdo artístico
4. Técnica e preço
5. Maior lance (leilão)
6. Maior retorno econômico (concessão/PPP)

## Fases da licitação (Art 17)
1. **Preparatória** (planejamento)
2. **Divulgação do edital**
3. **Apresentação de propostas e lances**
4. **Julgamento**
5. **Habilitação**
6. **Recursal**
7. **Homologação**

**Inversão de fases** (proposta antes de habilitação) é regra na NLLC, salvo decisão fundamentada da autoridade.

## Contratação direta (Art 74 e 75)

### Inexigibilidade (Art 74)
- Inviabilidade de competição.
- Hipóteses: fornecedor exclusivo, profissional de notória especialização, contratação artística.

### Dispensa (Art 75)
- Lei permite contratação direta apesar de viabilidade de competição.
- Hipóteses (rol taxativo) — valores até R$ 100 mil (obras e serviços de engenharia) e R$ 50 mil (demais), guerra, calamidade, emergência, etc.

## Contratos (Art 89 em diante)

### Cláusulas exorbitantes
A Administração tem prerrogativas em face do contratado:
- Modificação unilateral
- Rescisão unilateral
- Fiscalização
- Aplicação de sanções
- Ocupação provisória

### Reequilíbrio econômico-financeiro
- Direito do contratado quando surgem fatos imprevisíveis ou previsíveis de consequências incalculáveis.
- Teoria da imprevisão.

### Garantias (Art 96)
- Caução em dinheiro, seguro-garantia, fiança bancária.
- Limite: 5% (regra) a 10% (obras grandes).

### Subcontratação
- Permitida se o edital previr.

### Rescisão
- Por inadimplemento, interesse público, caso fortuito/força maior, alteração unilateral.

## Sanções (Art 156)
1. Advertência
2. Multa
3. Impedimento de licitar e contratar (até 3 anos)
4. Declaração de inidoneidade (mínimo 3, máximo 6 anos)

## Como cai na Cebraspe

**Item 1 (CERTO):** "A Lei 14.133/2021 substituiu integralmente a Lei 8.666/93 e a Lei do Pregão a partir de 30 de dezembro de 2023, sendo aplicável a todas as licitações e contratos firmados após essa data."

**Item 2 (ERRADO):** "A nova Lei de Licitações mantém as modalidades Convite e Tomada de Preços para contratações de menor vulto."
> Errado: a NLLC **extinguiu** essas modalidades.

**Item 3 (CERTO):** "O diálogo competitivo é modalidade prevista na NLLC para contratações que envolvam inovação tecnológica ou cuja solução técnica não possa ser previamente especificada com precisão."

**Item 4 (ERRADO):** "Na inexigibilidade de licitação, a Administração escolhe contratar diretamente apesar de haver viabilidade de competição."
> Errado: inexigibilidade pressupõe **inviabilidade** de competição. Dispensa é que a competição é viável mas a lei autoriza contratação direta.

## Estratégia
- Decore as 5 modalidades (PCCLD: Pregão, Concorrência, Concurso, Leilão, Diálogo).
- Saiba a diferença **dispensa** x **inexigibilidade**.
- Conheça os limites de valor da dispensa.
- Memorize as 4 sanções e seus prazos.
$md$,
  $resumo$
## Resumo — Lei 14.133/2021 (NLLC)

### Vigência
- Revoga a Lei 8.666/93, Pregão (10.520/02) e RDC desde **30/12/2023**

### Modalidades (5)
- **P**regão (bens/serviços comuns; eletrônico ou presencial)
- **C**oncorrência (qualquer critério)
- **C**oncurso (técnico/científico/artístico, premiação)
- **L**eilão (bens inservíveis ou apreendidos)
- **D**iálogo competitivo (inovação, complexidade)

### ATENÇÃO: extinguiu Convite e Tomada de Preços

### Critérios de julgamento (6)
- Menor preço, maior desconto, melhor técnica, técnica e preço, maior lance, maior retorno econômico

### Fases (7) — proposta ANTES de habilitação (regra)
1. Preparatória, 2. Edital, 3. Propostas/Lances, 4. Julgamento, 5. Habilitação, 6. Recursal, 7. Homologação

### Contratação direta
- **Inexigibilidade**: **inviabilidade** de competição (fornecedor exclusivo, notória especialização, artista)
- **Dispensa**: lei permite apesar da viabilidade (rol taxativo, R$ 100k obras/eng, R$ 50k demais)

### Cláusulas exorbitantes
- Alteração unilateral, rescisão unilateral, fiscalização, sanções, ocupação provisória

### Sanções (Art 156)
1. Advertência
2. Multa
3. Impedimento (até 3 anos)
4. Inidoneidade (3 a 6 anos)

### Pegadinhas Cebraspe
- Convite e Tomada de Preços **NÃO** existem mais
- Inexigibilidade ≠ Dispensa
- Diálogo competitivo é **novidade** da NLLC
- Proposta antes de habilitação é **regra**
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação final
-- ──────────────────────────────────────────────────────────────────────────
SELECT m.title, s.slug AS subject, t.name AS topic, m.status, (r.id IS NOT NULL) AS has_resumo
FROM "materials" m
LEFT JOIN "subjects" s ON s.id = m."subjectId"
LEFT JOIN "topics" t ON t.id = m."topicId"
LEFT JOIN "material_resumos" r ON r."materialId" = m.id
WHERE m.origin = 'ai' AND m.status = 'PUBLISHED'
ORDER BY s.slug, t."order"
LIMIT 30;

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
