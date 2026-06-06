-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 3 — Cebraspe (continuação)
-- Data: 2026-06-06
--
-- 6 materiais densos (DRAFT — aguarda revisão admin):
--  - Const: Direitos Políticos (Art 14-17), Poder Executivo (Art 76-91),
--    Poder Judiciário (Art 92-126)
--  - Adm: Organização (Direta/Indireta), Poderes Administrativos,
--    Responsabilidade Civil do Estado
--
-- IDEMPOTENTE (UPSERT por cacheKey). Preserva REVIEWED/PUBLISHED.
-- DEPENDE da onda 1 (topics-universais).
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_material(
  p_subject_slug text, p_topic_name text, p_title text, p_content text, p_resumo text
) RETURNS void AS $func$
DECLARE
  v_topic_id text; v_subject_id text; v_material_id text; v_cache_key text;
BEGIN
  SELECT t.id, t."subjectId" INTO v_topic_id, v_subject_id
  FROM "topics" t JOIN "subjects" s ON s.id = t."subjectId"
  WHERE s.slug = p_subject_slug AND t.name = p_topic_name LIMIT 1;
  IF v_topic_id IS NULL THEN
    RAISE NOTICE 'Tópico não encontrado: % / %', p_subject_slug, p_topic_name;
    RETURN;
  END IF;
  v_cache_key := 'topic-' || v_topic_id;
  INSERT INTO "materials" (id, "subjectId", "topicId", "cacheKey", title, type, content, active, status, origin, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_subject_id, v_topic_id, v_cache_key, p_title, 'TEXTO', p_content, true, 'DRAFT', 'ai', NOW(), NOW())
  ON CONFLICT ("cacheKey") DO UPDATE SET
    title = EXCLUDED.title, content = EXCLUDED.content,
    status = CASE WHEN "materials".status IN ('REVIEWED', 'PUBLISHED') THEN "materials".status ELSE 'DRAFT'::"MaterialStatus" END,
    "updatedAt" = NOW()
  RETURNING id INTO v_material_id;
  IF v_material_id IS NULL THEN
    SELECT id INTO v_material_id FROM "materials" WHERE "cacheKey" = v_cache_key;
  END IF;
  INSERT INTO "material_resumos" (id, "materialId", resumo, "generatedBy", "generatedAt")
  VALUES (gen_random_uuid()::text, v_material_id, p_resumo, 'ai', NOW())
  ON CONFLICT ("materialId") DO UPDATE SET resumo = EXCLUDED.resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- CONSTITUCIONAL — Direitos Políticos e Partidos (Art 14 a 17)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Direitos Políticos e Partidos (Art 14 a 17)',
  'Direitos Políticos e Partidos',
  $md$
# Direitos Políticos e Partidos (Art 14 a 17)

Tema chave em Cebraspe: cobra **literalidade** + **idade mínima** + **inelegibilidades** + **perda/suspensão** de direitos políticos.

## Art 14 — Soberania popular

> A soberania popular será exercida pelo **sufrágio universal e pelo voto direto e secreto, com valor igual para todos**, e, nos termos da lei, mediante:
> I — **plebiscito**;
> II — **referendo**;
> III — **iniciativa popular**.

### Diferenças (decoreba clássica)
- **Plebiscito**: ANTES do ato — povo decide se autoriza algo (ex.: criação de novo Estado)
- **Referendo**: DEPOIS do ato legislativo — povo confirma ou rejeita
- **Iniciativa popular**: cidadãos propõem projeto de lei (1% do eleitorado nacional, distribuído em pelo menos 5 Estados, com não menos de 0,3% dos eleitores de cada um)

### Voto (§1º)
- **Obrigatório**: maiores de 18 e menores de 70 anos
- **Facultativo**:
  - Analfabetos
  - Maiores de 70 anos
  - Entre 16 e 18 anos

## Capacidade eleitoral

### Capacidade eleitoral ATIVA (votar)
- 16 anos (facultativo) → 18 (obrigatório) → 70 (volta a ser facultativo)

### Capacidade eleitoral PASSIVA (ser votado) — idades mínimas
> Art 14, §3º — São condições de elegibilidade:
> - VI — a idade mínima de:
>   - **35 anos** para Presidente, Vice-Presidente e Senador
>   - **30 anos** para Governador e Vice-Governador
>   - **21 anos** para Deputado Federal, Estadual ou Distrital, Prefeito, Vice-Prefeito e Juiz de Paz
>   - **18 anos** para Vereador

### Outras condições de elegibilidade
- Nacionalidade brasileira (presidente: brasileiro nato — Art 12, §3º, I)
- Pleno exercício dos direitos políticos
- Alistamento eleitoral
- Domicílio eleitoral na circunscrição
- Filiação partidária

## Inelegibilidades (Art 14, §§4-7)

### Absolutas
- Inalistáveis (estrangeiros, conscritos durante o serviço militar)
- Analfabetos

### Relativas
- **Reeleição**: Presidente, Governadores, Prefeitos podem ser reeleitos **uma única vez** para o período subsequente
- **Cônjuge e parentes** (até 2º grau ou afins) de Presidente/Governador/Prefeito **NÃO** podem se eleger no território de jurisdição do titular, salvo se já titular de mandato eletivo e candidato à reeleição (§7º)
- **Militar alistável**:
  - Menos de 10 anos de serviço: deve afastar-se da atividade
  - Mais de 10 anos: será agregado pela autoridade superior; se eleito, passa para a inatividade
- **Para concorrer a outros cargos**: Presidente/Governador/Prefeito devem renunciar **6 meses antes** do pleito (desincompatibilização)

### Lei Complementar 64/90 (Lei das Inelegibilidades)
Casos comuns:
- Condenados por improbidade administrativa em decisão colegiada
- Demitidos do serviço público
- Condenados por crime contra a economia popular, ordem tributária, etc.
- **Ficha Limpa** (LC 135/2010): inelegibilidade de 8 anos por condenação colegiada

## Perda e Suspensão (Art 15)

> É vedada a cassação de direitos políticos, cuja **perda ou suspensão** só se dará nos casos de:
> I — cancelamento da naturalização por sentença transitada em julgado
> II — incapacidade civil absoluta
> III — condenação criminal transitada em julgado, **enquanto durarem seus efeitos**
> IV — recusa de cumprir obrigação a todos imposta ou prestação alternativa (Art 5º, VIII)
> V — improbidade administrativa (nos termos do Art 37, §4º)

**Memorize**: NÃO existe "cassação" — só perda ou suspensão.

## Partidos Políticos (Art 17)

> É livre a criação, fusão, incorporação e extinção de partidos políticos, **resguardados a soberania nacional**, o regime democrático, o pluripartidarismo, os direitos fundamentais da pessoa humana e observados os seguintes preceitos:

- Caráter nacional
- Proibição de recebimento de recursos financeiros estrangeiros ou de subordinação a eles
- Prestação de contas à Justiça Eleitoral
- Funcionamento parlamentar conforme a lei

### Cláusula de barreira (EC 97/2017)
- Para ter acesso ao fundo partidário e tempo de rádio/TV, o partido precisa obter mínimo de votos em eleições gerais
- Avaliação progressiva (2018, 2022, 2026, 2030)

## Como cai na Cebraspe

**Item 1 (CERTO):** "O voto é obrigatório para os maiores de 18 e menores de 70 anos e facultativo para os maiores de 70 anos, os analfabetos e os maiores de 16 e menores de 18 anos."

**Item 2 (ERRADO):** "A idade mínima para se candidatar a Senador é de 30 anos."
> Errado: **35 anos**.

**Item 3 (CERTO):** "A perda ou suspensão de direitos políticos só se dará nas hipóteses constitucionalmente previstas, sendo vedada a cassação."

**Item 4 (ERRADO):** "Para concorrer a outros cargos, o Presidente da República deve renunciar a seu mandato pelo menos 4 meses antes do pleito eleitoral."
> Errado: **6 meses** (desincompatibilização — Art 14, §6º).

**Item 5 (CERTO):** "Os militares com mais de dez anos de serviço, ao se candidatarem, serão agregados pela autoridade superior e, se eleitos, passarão automaticamente para a inatividade."

## Súmulas e Jurisprudência
- **STF, ADI 4543**: voto impresso é inconstitucional
- **STF, ADC 29/30**: Lei da Ficha Limpa é constitucional

## Estratégia
- Decore idades: **35** (Pres/Vice/Sen), **30** (Gov/Vice-Gov), **21** (Dep/Pref/Vice-Pref/Juiz de Paz), **18** (Vereador)
- Decoreba MARI das inelegibilidades não tem — mas saiba "absolutas" (analfabeto, inalistável) x "relativas" (parentesco, militar, etc.)
- Direitos políticos: PERDA ou SUSPENSÃO (nunca cassação)
- Desincompatibilização: **6 meses** antes do pleito
$md$,
  $resumo$
## Resumo — Direitos Políticos e Partidos

### Voto
- **Obrigatório**: 18-70 anos
- **Facultativo**: 16-18, analfabetos, +70

### Idades mínimas (capacidade passiva)
- **35**: Presidente, Vice, Senador
- **30**: Governador, Vice-Gov
- **21**: Deputado, Prefeito, Vice-Pref, Juiz de Paz
- **18**: Vereador

### Soberania popular (Art 14)
- Plebiscito (antes do ato)
- Referendo (depois do ato)
- Iniciativa popular (1% eleitorado nacional + 5 Estados + 0,3% cada)

### Inelegibilidades
- **Absolutas**: inalistáveis, analfabetos
- **Relativas**:
  - Reeleição = 1×
  - Cônjuge/parente 2º grau do titular NÃO pode se eleger no território
  - Militar < 10 anos: afasta-se; > 10 anos: agregado, se eleito vai à inatividade
  - **Desincompatibilização: 6 meses** antes do pleito

### Perda/Suspensão (Art 15) — NÃO há cassação
1. Cancelamento da naturalização (sentença transitada)
2. Incapacidade civil absoluta
3. Condenação criminal transitada (enquanto durar)
4. Recusa de obrigação a todos imposta
5. Improbidade

### Pegadinhas Cebraspe
- Idade Senador = **35**, NÃO 30
- Desincompatibilização = **6 meses**, NÃO 4
- Cassação NÃO existe; só perda/suspensão
- Plebiscito (antes) ≠ Referendo (depois)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- CONSTITUCIONAL — Poder Executivo (Art 76 a 91)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Poder Executivo (Art 76 a 91)',
  'Poder Executivo na CF/88',
  $md$
# Poder Executivo (Art 76 a 91)

Trata da estrutura, mandato, sucessão, atribuições e responsabilidade do Presidente da República. Cebraspe cobra **literalidade** + **distinção entre crime comum e de responsabilidade**.

## Composição (Art 76)

> O Poder Executivo é exercido pelo **Presidente da República**, auxiliado pelos **Ministros de Estado**.

**Sistema brasileiro**: presidencialismo (chefe de Estado E chefe de Governo na mesma pessoa).

## Eleição (Art 77)
- Eleição simultânea com a Vice-Presidência
- 1º domingo de outubro (1º turno) e último domingo de outubro (2º turno, se necessário)
- Maioria absoluta dos votos válidos (não computados brancos e nulos)
- 2º turno se nenhum candidato obtiver maioria absoluta
- **Mandato: 4 anos**
- **Posse: 1º de janeiro** do ano subsequente

## Vacância

### Sucessão (Art 80)
Em caso de impedimento ou vacância:
1. Vice-Presidente
2. Presidente da Câmara
3. Presidente do Senado
4. Presidente do STF

### Eleição em caso de vacância (Art 81)
- **Antes dos 2 primeiros anos** do mandato: nova eleição **direta** em 90 dias
- **Últimos 2 anos**: eleição **indireta** pelo Congresso Nacional em 30 dias
- Em qualquer caso, eleitos completam o mandato dos antecessores (mandato-tampão)

## Atribuições do Presidente (Art 84)

**Privativas** (não delegáveis em sua maioria) — destacam-se:
- I — nomear e exonerar Ministros
- II — exercer direção superior da administração federal
- IV — sancionar, promulgar e fazer publicar leis; expedir decretos e regulamentos
- V — vetar projetos de lei (total ou parcialmente)
- VI — dispor sobre organização e funcionamento da administração federal (algumas matérias)
- IX — declarar guerra (autorização do CN), celebrar paz
- X — manter relações com Estados estrangeiros
- XII — conceder indulto e comutar penas
- XIII — exercer comando supremo das Forças Armadas
- XVIII — decretar Estado de Defesa
- XIX — decretar Estado de Sítio (autorização do CN)
- XX — decretar intervenção federal
- XXIV — prestar contas anualmente ao CN

### Atribuições delegáveis
> Parágrafo único: O Presidente da República poderá delegar as atribuições mencionadas nos incisos **VI, XII e XXV (primeira parte)** aos Ministros de Estado, ao Procurador-Geral da República ou ao Advogado-Geral da União.

## Ministros de Estado (Art 87)
- Auxiliam o Presidente
- Brasileiros maiores de 21 anos no exercício de direitos políticos
- Exonerados ad nutum (livre exoneração)

### Atribuições
- Exercer orientação, coordenação e supervisão dos órgãos
- Expedir instruções para execução das leis
- Apresentar ao Presidente relatório anual
- Praticar atos pertinentes às atribuições

## Responsabilidade do Presidente

### Crime COMUM (Art 86)
- Acusação pela Câmara (2/3)
- Julgamento pelo **STF**
- Suspensão das funções por 180 dias (se aceita a denúncia)

### Crime de RESPONSABILIDADE (Lei 1.079/50)
- Acusação pela Câmara (2/3)
- Julgamento pelo **Senado Federal** (presidido pelo Presidente do STF)
- Hipóteses (Art 85): atentar contra:
  - Existência da União
  - Livre exercício do Poder Legislativo/Judiciário/MP
  - Exercício dos direitos políticos, individuais e sociais
  - Segurança interna do país
  - Probidade na administração
  - Lei orçamentária
  - Cumprimento das leis e decisões judiciais
- **Pena máxima**: perda do cargo + inabilitação para função pública **por 8 anos**

### Imunidade (Art 86, §4º)
> O Presidente da República, na vigência de seu mandato, **não pode ser responsabilizado por atos estranhos ao exercício de suas funções**.

**Imunidade temporária** — apenas por atos sem relação com o cargo, durante o mandato. Após sair do cargo, pode ser responsabilizado normalmente.

## Conselho da República (Art 89) e Conselho de Defesa Nacional (Art 91)

### Conselho da República
Órgão superior de consulta. Composição:
- Vice-Presidente
- Presidentes da Câmara e Senado
- Líderes da maioria e minoria nas duas Casas
- Ministro da Justiça
- 6 cidadãos brasileiros natos (mandato de 3 anos)

### Conselho de Defesa Nacional
Órgão de consulta em assuntos de soberania e defesa do Estado Democrático.

## Como cai na Cebraspe

**Item 1 (CERTO):** "O Presidente da República é julgado pelo Supremo Tribunal Federal nos crimes comuns e pelo Senado Federal nos crimes de responsabilidade."

**Item 2 (ERRADO):** "Ocorrendo a vacância do cargo de Presidente da República nos últimos dois anos do mandato, a eleição será direta, em até 90 dias após a abertura da última vaga."
> Errado: **eleição indireta pelo Congresso em 30 dias**.

**Item 3 (CERTO):** "O Presidente da República pode delegar a competência de conceder indulto e comutar penas aos Ministros de Estado, ao Procurador-Geral da República ou ao Advogado-Geral da União."

**Item 4 (ERRADO):** "Na vigência do mandato, o Presidente pode ser responsabilizado por qualquer ato, inclusive os estranhos ao exercício de suas funções."
> Errado: imunidade temporária (Art 86, §4º) — só por atos no exercício do cargo.

## Súmulas e jurisprudência
- **STF**: a imunidade do Art 86, §4º não impede investigação, apenas julgamento.

## Estratégia
- Decore os 4 da linha sucessória: VP → Câmara → Senado → STF
- 90 dias direta (até 2 anos) / 30 dias indireta (últimos 2 anos)
- Crime comum: julga **STF**; crime de responsabilidade: julga **Senado**
- Inabilitação por crime de responsabilidade: **8 anos**
- Atribuições delegáveis: VI, XII e XXV (primeira parte) — indulto, regulamentos, prover cargos
$md$,
  $resumo$
## Resumo — Poder Executivo

### Composição
- Presidente + Ministros (sistema presidencialista)
- Mandato: 4 anos; posse 1º jan

### Sucessão (Art 80)
1. Vice
2. Presidente da Câmara
3. Presidente do Senado
4. Presidente do STF

### Vacância (Art 81)
- Até 2 primeiros anos: eleição **direta** em **90 dias**
- Últimos 2 anos: eleição **indireta** (Congresso) em **30 dias**
- Eleitos cumprem mandato-tampão

### Atribuições (Art 84)
- Privativas em geral
- **Delegáveis**: VI (organização da admin), XII (indulto/comutar), XXV (1ª parte — prover cargos)
- Delegáveis a: Ministros, PGR, AGU

### Responsabilidade
- **Crime comum**: Câmara acusa (2/3) → julga **STF**
- **Crime de responsabilidade**: Câmara acusa (2/3) → julga **Senado** (presidido por Presidente do STF)
- Pena máxima crime responsabilidade: perda do cargo + **inabilitação 8 anos**
- Imunidade temporária (Art 86, §4º): só atos no exercício do cargo

### Pegadinhas Cebraspe
- Sucessão: **VP → Câmara → Senado → STF**
- 90 dias = direta; 30 dias = indireta
- Crime comum = STF; responsabilidade = Senado
- Inabilitação = **8 anos**
- Imunidade temporária NÃO impede investigação, só julgamento
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- CONSTITUCIONAL — Poder Judiciário (Art 92 a 126)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Poder Judiciário (Art 92 a 126)',
  'Poder Judiciário na CF/88',
  $md$
# Poder Judiciário (Art 92 a 126)

Tema longo na CF. Cebraspe cobra **órgãos**, **garantias** e **STF/STJ** (competências).

## Órgãos (Art 92)
- I — **STF** — Supremo Tribunal Federal
- I-A — **CNJ** — Conselho Nacional de Justiça
- II — **STJ** — Superior Tribunal de Justiça
- III — **TRFs e Juízes Federais**
- III-A — **TRT e Juízes do Trabalho** (Tribunais e Juízes do Trabalho)
- IV — **TRE e Juízes Eleitorais** (Tribunais e Juízes Eleitorais)
- V — **STM e Tribunais Militares** (Justiça Militar)
- VI — **TJs e Juízes dos Estados/DF** (Tribunais e Juízes Estaduais)
- **TST**: incluído como órgão de cúpula da Justiça do Trabalho

## Garantias da Magistratura (Art 95)
- **Vitaliciedade**: após 2 anos de exercício, juiz só perde cargo por sentença judicial transitada em julgado
- **Inamovibilidade**: salvo motivo de interesse público (decisão por voto da maioria absoluta do tribunal/CNJ)
- **Irredutibilidade de subsídio**: salvo as exceções constitucionais (tributos, teto, contribuição previdenciária)

### Vedações (Art 95, parágrafo único)
- Exercer outro cargo/função (salvo magistério)
- Receber custas ou participação em processo
- Dedicar-se à atividade político-partidária
- Receber auxílios/contribuições de pessoas físicas/jurídicas
- Exercer advocacia no juízo/tribunal de onde se afastou (quarentena de 3 anos)

## STF — Supremo Tribunal Federal (Art 101)

### Composição
- **11 ministros**, escolhidos entre brasileiros natos com mais de 35 anos e menos de 75 anos, de notável saber jurídico e reputação ilibada
- Nomeados pelo **Presidente** após aprovação do **Senado** (maioria absoluta)

### Competências (Art 102)
> Originárias (entre as principais):
- **ADI** (Ação Direta de Inconstitucionalidade)
- **ADC** (Ação Declaratória de Constitucionalidade)
- **ADPF** (Arguição de Descumprimento de Preceito Fundamental)
- Mandado de Segurança contra atos do Presidente, Mesas das Casas, TCU, PGR e do próprio STF
- Habeas Corpus quando paciente for autoridade com prerrogativa de foro no STF
- Crimes comuns: Presidente, Vice-Presidente, congressistas, ministros do STF, PGR
- Conflitos entre União e Estados, ou entre Estados

> Recursais:
- **Recurso ordinário** em HC e MS decididos em última instância pelos tribunais superiores
- **Recurso extraordinário** (RE): controle de constitucionalidade pela via difusa
  - Repercussão geral (filtro)
  - Súmula vinculante

### Súmula Vinculante (Art 103-A)
- Aprovada por **2/3 dos membros** (8 de 11)
- Sobre matéria constitucional, em decisões reiteradas
- Vincula órgãos do Judiciário e Administração

## STJ — Superior Tribunal de Justiça (Art 104)

### Composição
- **33 ministros**, brasileiros com mais de 35 e menos de 75 anos
- 1/3 entre juízes dos TRFs, 1/3 entre desembargadores dos TJs, 1/3 entre advogados e membros do MP (alternadamente)
- Aprovados pelo Senado

### Competências (Art 105)
- Crimes comuns dos Governadores, desembargadores dos TJs, membros dos TRFs/TREs/TCEs
- HC contra ato de Ministro de Estado ou comandantes das Forças Armadas
- Conflitos de competência entre Tribunais
- Mandado de Segurança contra Ministros
- **Recurso especial** (REsp): violação de lei federal, divergência jurisprudencial

## Justiça Federal (Art 109)
Competente para:
- Causas em que a União, autarquias federais ou empresas públicas federais sejam interessadas
- Causas entre Estado estrangeiro/organismo internacional e Município ou pessoa
- Habeas data e mandado de injunção contra ato de autoridade federal
- Crimes praticados a bordo de navios ou aeronaves
- Crimes contra organização do trabalho
- Crimes contra o sistema financeiro
- Tráfico internacional de drogas
- Genocídio (em conjunto com Júri popular para os casos previstos)

## Conselho Nacional de Justiça — CNJ (Art 103-B)
- Órgão **administrativo** (NÃO julga processos)
- Controla a atuação administrativa e financeira do Poder Judiciário
- Cumprimento dos deveres funcionais dos juízes
- Composição: **15 membros**, mandato 2 anos (admitida 1 recondução)
- Presidido pelo Presidente do STF

## Como cai na Cebraspe

**Item 1 (CERTO):** "Os juízes adquirem vitaliciedade após dois anos de exercício, somente podendo perder o cargo, a partir de então, por sentença judicial transitada em julgado."

**Item 2 (ERRADO):** "O Supremo Tribunal Federal é composto por 33 ministros, escolhidos entre brasileiros natos."
> Errado: STF tem **11 ministros**. STJ tem 33.

**Item 3 (CERTO):** "A súmula vinculante exige aprovação de 2/3 dos membros do STF para sua edição, revisão ou cancelamento."

**Item 4 (ERRADO):** "O Conselho Nacional de Justiça exerce função jurisdicional, julgando recursos contra decisões dos tribunais."
> Errado: CNJ é órgão **administrativo**, não exerce função jurisdicional.

**Item 5 (CERTO):** "Compete à Justiça Federal o julgamento dos crimes praticados a bordo de navios e aeronaves, ressalvada a competência da Justiça Militar."

## Súmulas
- **SV 5**: defesa técnica em PAD
- **SV 13**: nepotismo
- **SV 24**: tipificação tributária
- **STF, RE 593068**: contribuição previdenciária sobre adicionais

## Estratégia
- Composição STF (11) vs STJ (33)
- CNJ é **administrativo** (15 membros, 2 anos)
- Vitaliciedade: 2 anos
- Súmula Vinculante: 2/3 = 8 votos
- Quarentena dos juízes: 3 anos pra advogar onde se afastou
$md$,
  $resumo$
## Resumo — Poder Judiciário

### Órgãos (Art 92)
- **STF**, **CNJ**, **STJ**, TRFs/Juízes Federais, TRT/Trabalho, TRE/Eleitorais, STM/Militar, TJs/Estaduais, TST

### Garantias (Art 95)
- **Vitaliciedade**: após **2 anos** de exercício (perde só por sentença transitada)
- **Inamovibilidade**: salvo motivo de interesse público (maioria absoluta)
- **Irredutibilidade de subsídio**

### Vedações
- Outro cargo (salvo magistério), advocacia (quarentena 3 anos), atividade político-partidária, receber custas

### STF (Art 101-103)
- **11 ministros**, 35-75 anos, brasileiros **natos**
- Aprovados pelo Senado (maioria absoluta)
- Compete: ADI, ADC, ADPF, RE com repercussão geral, súmula vinculante
- **SV**: aprovação por **2/3** (8 votos)

### STJ (Art 104-105)
- **33 ministros**, 35-75 anos
- 1/3 TRF, 1/3 TJ, 1/3 advogados/MP
- Compete: REsp (lei federal), conflitos de competência

### CNJ (Art 103-B)
- Órgão **administrativo** (NÃO julga processos)
- **15 membros**, mandato 2 anos (1 recondução)
- Presidido pelo Presidente do STF

### Pegadinhas Cebraspe
- STF: 11; STJ: 33 (NÃO confundir!)
- Vitaliciedade = **2 anos** (NÃO 3)
- CNJ é administrativo, NÃO jurisdicional
- SV exige **2/3** = 8 ministros (NÃO maioria simples)
- Quarentena pra advogar: **3 anos**
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVO — Organização Administrativa (Direta e Indireta)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Organização Administrativa: Adm Direta e Indireta',
  'Organização Administrativa: Direta e Indireta',
  $md$
# Organização Administrativa: Adm Direta e Indireta

Tema base. Cebraspe cobra **diferenças entre as entidades**, **regime jurídico**, **criação** e **autonomia**.

## Administração Direta
- União, Estados, DF, Municípios e seus órgãos despersonalizados (Ministérios, Secretarias)
- **Personalidade jurídica de direito público**
- Atuação direta, sem entidade intermediária

## Administração Indireta (Decreto-Lei 200/67)
Entidades dotadas de personalidade jurídica própria, criadas pelo Estado para exercer atividades administrativas descentralizadas. Quatro tipos:

### 1. Autarquias
- **Pessoa jurídica de direito PÚBLICO**
- Criada por **LEI ESPECÍFICA** (Art 37, XIX CF)
- Regime jurídico de direito público
- Servidores estatutários (Lei 8.112)
- Imunidade tributária recíproca (Art 150, VI, a CF)
- Bens públicos (impenhoráveis)
- Exemplos: INSS, IBAMA, Banco Central, USP, INCRA, ANTT

### Autarquias especiais (agências reguladoras)
- ANEEL, ANATEL, ANS, ANVISA, ANP, ANTT, ANTAQ, ANAC, ANCINE
- Mandato fixo dos dirigentes (proteção da independência)
- Quarentena para ex-dirigentes (4 meses → 6 meses pela Lei 13.848/19)

### 2. Fundações Públicas
**Importante divergência**:
- **Fundação Pública de Direito Público**: equipara-se a autarquia (criada por lei) — ex.: FUNAI, IBGE
- **Fundação Pública de Direito Privado**: criada por autorização legal + registro civil — regime híbrido

### 3. Empresas Públicas (EP)
- **Pessoa jurídica de direito PRIVADO**
- Capital **100% público** (uma pessoa ou várias entidades públicas)
- **Autorizada por lei** (não criada por lei)
- Qualquer forma societária admitida
- Atividade econômica ou serviço público
- Empregados celetistas (CLT) — mas com concurso (Art 37, II CF)
- Exemplos: Caixa Econômica Federal, ECT, BNDES, EMBRAPA, INFRAERO

### 4. Sociedades de Economia Mista (SEM)
- **Pessoa jurídica de direito PRIVADO**
- Capital **misto** (público majoritário votante + privado)
- Forma de **Sociedade Anônima** (S.A.) obrigatoriamente
- **Autorizada por lei**
- Atividade econômica
- Empregados celetistas
- Exemplos: Petrobras, Banco do Brasil, Eletrobras, Itaipu Binacional

## Comparação: EP × SEM

| Critério | Empresa Pública (EP) | Sociedade de Economia Mista (SEM) |
|---|---|---|
| **Capital** | 100% público | Misto (público majoritário + privado) |
| **Forma jurídica** | Qualquer forma societária | Sociedade Anônima obrigatória |
| **Foro** (causas comuns) | Justiça Federal (se federal) | Justiça Estadual |
| **Exemplo** | Caixa, ECT | Banco do Brasil, Petrobras |

## Regime Jurídico Híbrido das Estatais

EP e SEM têm regime jurídico **híbrido**:
- Direito privado em sua atividade-fim
- Direito público em normas de licitação (Lei 13.303/16 — Lei das Estatais), concurso, controle externo (TCU)

### Lei das Estatais (13.303/16)
- Disciplina criação, governança, regime contratual
- Procedimento licitatório próprio (não Lei 14.133)
- Conselhos de Administração e Fiscal obrigatórios
- Comitê estatutário de auditoria
- Limites pra remuneração de dirigentes

## Como cai na Cebraspe

**Item 1 (CERTO):** "As autarquias possuem personalidade jurídica de direito público, são criadas por lei específica e estão sujeitas ao regime jurídico de direito público."

**Item 2 (ERRADO):** "As sociedades de economia mista são pessoas jurídicas de direito público, criadas por lei específica."
> Errado: SEM é **pessoa jurídica de direito privado**, **autorizada** por lei (não criada).

**Item 3 (CERTO):** "A sociedade de economia mista assume obrigatoriamente a forma de sociedade anônima, enquanto a empresa pública pode adotar qualquer forma societária."

**Item 4 (ERRADO):** "As empresas públicas e sociedades de economia mista que explorem atividade econômica estão sujeitas ao regime jurídico-administrativo de direito público em todos os seus atos."
> Errado: regime **híbrido** — direito privado prevalente na atividade-fim.

**Item 5 (CERTO):** "As agências reguladoras são autarquias sob regime especial, caracterizadas pelo mandato fixo dos dirigentes e independência decisória."

## Súmulas e Jurisprudência
- **STF, RE 599628**: EP que executa serviço público em regime de monopólio é imune a impostos
- **STF, RE 220906**: ECT goza de imunidade tributária recíproca (jurisprudência consolidada)

## Estratégia
- Autarquia/Fundação Pub Direito Público: **CRIADAS** por lei (direito público)
- EP/SEM: **AUTORIZADAS** por lei (direito privado)
- SEM = **S.A. obrigatória** + capital misto
- EP = qualquer forma + 100% público
- Lei das Estatais (13.303/16) — licitação específica, NÃO 14.133
$md$,
  $resumo$
## Resumo — Organização Administrativa

### Administração Direta
- União, Estados, DF, Municípios + órgãos despersonalizados (Ministérios)
- Direito público

### Administração Indireta (4 tipos)

#### 1. Autarquias
- Direito **PÚBLICO**
- **CRIADA por lei específica**
- Regime estatutário, bens públicos, imunidade tributária
- Ex: INSS, IBAMA, BACEN, USP

#### 2. Fundações Públicas
- Direito Público (equipara autarquia): FUNAI, IBGE
- Direito Privado (regime híbrido)

#### 3. Empresas Públicas (EP)
- Direito **PRIVADO**
- **AUTORIZADA por lei**
- Capital **100% público**
- Qualquer forma societária
- Ex: Caixa, ECT, BNDES

#### 4. Sociedades de Economia Mista (SEM)
- Direito **PRIVADO**
- **AUTORIZADA por lei**
- Capital **misto** (público majoritário + privado)
- Forma de **S.A. obrigatória**
- Ex: Petrobras, BB

### EP × SEM (memorize)
- EP: 100% pub / qualquer forma
- SEM: misto / S.A. obrigatória

### Agências Reguladoras
- Autarquias **sob regime especial**
- Mandato fixo, quarentena 6 meses
- Ex: ANEEL, ANATEL, ANS, ANVISA

### Lei das Estatais (13.303/16)
- EP e SEM têm licitação **própria** (NÃO 14.133)
- Conselhos, governança, comitê de auditoria

### Pegadinhas Cebraspe
- Autarquia = CRIADA por lei (direito público)
- EP/SEM = AUTORIZADAS por lei (direito privado)
- SEM = S.A. obrigatória
- EP/SEM em atividade-fim = direito privado
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVO — Poderes Administrativos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Poderes Administrativos (vinculado, discricionário, hierárquico, disciplinar, regulamentar, polícia)',
  'Poderes Administrativos',
  $md$
# Poderes Administrativos

Conjunto de **prerrogativas** conferidas à Administração para o cumprimento de suas atribuições. Cebraspe cobra **distinções** e **exemplos práticos**.

## 1. Poder Vinculado
- Quando a lei estabelece **todos** os elementos do ato
- Administrador **NÃO tem margem** de juízo
- Único caminho legal
- Exemplo: aposentadoria compulsória aos 75 anos; concessão de licença para condução de veículo

## 2. Poder Discricionário
- A lei concede **margem de juízo** ao administrador
- Juízo de **conveniência e oportunidade** (mérito administrativo)
- Liberdade dentro da legalidade
- Exemplo: autorização para uso de bem público; remoção de servidor por interesse público
- **Limites**: razoabilidade, proporcionalidade, princípios constitucionais
- **Controle judicial**: legalidade SIM, mérito NÃO (controvertido — STF/STJ controlam discricionariedade que viola princípios)

### Atos vinculados x discricionários
Pegadinha clássica: NEM TODO ato é só vinculado OU só discricionário. Alguns têm elementos vinculados (competência, finalidade, forma) e discricionários (motivo, objeto).

## 3. Poder Hierárquico
- **Estrutura interna** da Administração
- Permite:
  - Dar ordens (subordinados)
  - Fiscalizar
  - Rever atos
  - Delegar e avocar competências
  - Resolver conflitos de competência
- **Distingue-se de**:
  - Vinculação (poder de polícia → externo)
  - Tutela administrativa (controle finalístico de entidades da indireta)
- Não há hierarquia entre Administração e Poder Judiciário/MP

### Delegação e Avocação (Lei 9.784/99)
- **Delegação**: competência transferida temporariamente (parcial)
- **Avocação**: superior chama pra si competência do subordinado (em circunstâncias excepcionais)
- **NÃO podem ser delegadas**: edição de atos normativos, decisão em recurso administrativo, matérias de competência exclusiva

## 4. Poder Disciplinar
- Apurar infrações funcionais e aplicar sanções a:
  - Servidores
  - Particulares com vínculo especial (contratados, alunos de escolas públicas, etc.)
- **Discricionariedade**: na escolha da sanção (dentro dos limites legais)
- **Vinculado**: na obrigação de apurar (princípio da indisponibilidade)
- Instrumento: PAD (Lei 8.112/90, Art 143+)
- Garantias: ampla defesa, contraditório, motivação

### Diferenças
- Poder Disciplinar **≠** Poder Punitivo do Estado (este é exclusivo do Judiciário, no âmbito penal)

## 5. Poder Regulamentar
- Editar atos gerais para **fiel execução das leis**
- Titularidade: **Chefes do Executivo** (Art 84, IV CF)

### Decreto regulamentar (executivo)
- Disciplina a lei sem inovar
- NÃO pode contrariar a lei

### Decreto autônomo (Art 84, VI CF — pós EC 32/2001)
- Permite ao Presidente dispor sobre:
  - Organização e funcionamento da admin federal (sem aumentar despesa nem criar cargos)
  - Extinção de funções/cargos vagos
- Pouquíssimas hipóteses — REGRA: decreto é só regulamentar

### Regulamentos
- Executivos (subordinados à lei)
- **Independentes/autônomos** (excepcionais — Art 84, VI)

## 6. Poder de Polícia
> Atividade da Administração que, limitando ou disciplinando direito, interesse ou liberdade, **regula a prática de ato ou abstenção de fato**, em razão de **interesse público** concernente à segurança, à higiene, à ordem, aos costumes, à disciplina da produção e do mercado, ao exercício de atividades econômicas dependentes de concessão ou autorização, à tranquilidade pública ou ao respeito à propriedade e aos direitos individuais ou coletivos (CTN Art 78).

### Atributos (memorize: DAC)
- **Discricionariedade** (em regra)
- **Autoexecutoriedade** (em situações específicas — urgência, autorização legal)
- **Coercibilidade** (impositivo)

### Ciclos do Poder de Polícia
1. **Ordem de polícia** (normativa — leis, regulamentos)
2. **Consentimento** (licença, autorização)
3. **Fiscalização** (preventiva ou repressiva)
4. **Sanção** (multas, apreensão)

### Modalidades
- **Polícia administrativa** (Adm Pública — fiscalização)
- **Polícia judiciária** (PF, PC — investigação criminal)

Distinção crítica:
- Adm: incide sobre **bens, direitos e atividades** → preventiva ou repressiva
- Judiciária: incide sobre **pessoas** → repressiva, voltada à investigação criminal

### Delegação
- STF (RE 633.782 — Tema 532): apenas **consentimento, fiscalização e sanção** podem ser delegados a entes privados ou pessoas jurídicas de direito privado da administração indireta. **Ordem de polícia** (legislativa) NÃO pode ser delegada.

### Multas de trânsito
- **STF, Tema 532 (RE 633.782)**: aplicação de multas de trânsito por agentes não-policiais é constitucional
- DETRAN, EPTC, BHTrans aplicam multas legalmente

### Prescrição (Lei 9.873/99)
- 5 anos para sanção de polícia administrativa federal

## Como cai na Cebraspe

**Item 1 (CERTO):** "O poder de polícia administrativa é, em regra, discricionário, autoexecutório e coercitivo."

**Item 2 (ERRADO):** "Pelo poder regulamentar, o Chefe do Executivo pode editar decretos com força de lei, criando, modificando ou extinguindo direitos."
> Errado: decreto regulamentar **não pode** contrariar nem inovar a lei. Decreto autônomo é exceção restrita.

**Item 3 (CERTO):** "A polícia administrativa incide sobre bens, direitos e atividades, enquanto a polícia judiciária incide sobre pessoas, com vistas à apuração de infrações penais."

**Item 4 (ERRADO):** "O poder hierárquico permite à autoridade superior, em todos os casos, delegar suas competências ao subordinado, independentemente de previsão legal."
> Errado: Lei 9.784/99 veda delegação de atos normativos, decisão em recursos e competências exclusivas.

## Súmulas e jurisprudência
- **STF, RE 633.782 (Tema 532)**: delegação parcial do poder de polícia
- **STJ, AgRg no REsp 1.305.503**: prazo prescricional do poder de polícia é 5 anos (Lei 9.873/99)

## Estratégia
- Memorize os 6 poderes
- DAC para poder de polícia (Discricionário, Autoexecutório, Coercitivo)
- Distinção polícia administrativa (bens/atividades) x judiciária (pessoas)
- Decreto autônomo: Art 84, VI — restrito
- Lei 9.784/99: delegação ≠ exclusiva
$md$,
  $resumo$
## Resumo — Poderes Administrativos

### 1. Vinculado
- Lei define tudo — sem margem
- Ex: aposentadoria compulsória aos 75

### 2. Discricionário
- Margem de **conveniência e oportunidade** (mérito)
- Controle: legalidade sim, mérito NÃO
- Ex: autorização de uso de bem público

### 3. Hierárquico
- Permite: ordens, fiscalização, revisão, delegação, avocação
- Vedado delegar (Lei 9.784/99): atos normativos, recursos, competências exclusivas
- NÃO existe hierarquia entre Adm e Judiciário/MP

### 4. Disciplinar
- Apura infrações funcionais (servidor + particular com vínculo especial)
- Discricionário na sanção, vinculado na apuração
- Instrumento: PAD

### 5. Regulamentar
- **Chefes do Executivo** (Art 84, IV)
- Decreto regulamentar: subordinado à lei
- **Decreto autônomo** (Art 84, VI — restrito): organização da admin, extinção cargo vago

### 6. Polícia
- **DAC**: Discricionário, Autoexecutório, Coercitivo
- **Polícia Adm**: bens/atividades — preventiva
- **Polícia Judiciária**: pessoas — repressiva, criminal
- Ciclos: ordem → consentimento → fiscalização → sanção
- **STF Tema 532**: consentimento + fiscalização + sanção podem ser delegados; ordem NÃO

### Pegadinhas Cebraspe
- Decreto regulamentar NÃO pode inovar
- Polícia Adm = bens/atividades; Judiciária = pessoas
- Hierarquia só dentro da Administração
- Delegação tem limites (Lei 9.784/99)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVO — Responsabilidade Civil do Estado
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Responsabilidade Civil do Estado',
  'Responsabilidade Civil do Estado',
  $md$
# Responsabilidade Civil do Estado

Tema crítico. Cebraspe cobra **teorias adotadas**, **responsabilidade objetiva**, **regresso** e **omissão**.

## Evolução das Teorias

### 1. Irresponsabilidade ("the king can do no wrong")
- Estado não responde por seus atos
- Superada pelos Estados modernos

### 2. Responsabilidade Subjetiva (responsabilidade civilista clássica)
- Exige comprovação de culpa do agente
- Aplicada no Brasil antes da CF/88

### 3. Responsabilidade Objetiva
- **Independe de culpa** — basta:
  - Ato
  - Dano
  - Nexo causal
- Adotada no Brasil **desde a CF/46**, hoje no **Art 37, §6º CF**

## Art 37, §6º — Responsabilidade Objetiva

> As pessoas jurídicas de direito público e as de direito privado **prestadoras de serviços públicos** responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, **assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa**.

### Aplicação
- **Direta** ao terceiro: objetiva (Teoria do Risco Administrativo)
- **Regresso** ao agente: subjetiva (depende de dolo/culpa)

### Pessoas jurídicas que respondem objetivamente
- Direito público (União, Estados, DF, Municípios, autarquias, fundações públicas)
- Direito privado **prestadoras de serviços públicos** (concessionárias, permissionárias, EP, SEM prestadoras de serviço público)

### NÃO se aplica responsabilidade objetiva
- EP/SEM que exploram atividade econômica (Petrobras, BB) — responsabilidade subjetiva (regida pelo Código Civil)

## Teorias do Risco

### 1. Risco Administrativo (regra)
- **Adotada pelo Brasil** (Art 37, §6º)
- Estado responde, mas admite **excludentes**:
  - Culpa exclusiva da vítima
  - Caso fortuito
  - Força maior
  - Fato exclusivo de terceiro
- Reduz se houver culpa concorrente

### 2. Risco Integral (exceção)
- Estado responde **sem excludentes**
- Aplica-se a:
  - **Dano nuclear** (CF Art 21, XXIII, d e Lei 6.453/77)
  - **Dano ambiental** (Lei 6.938/81)
  - **Atos terroristas em aeronaves**, ato bélico (Lei 10.744/03)

## Responsabilidade por OMISSÃO

### Teoria Clássica (subjetiva)
- Tradicionalmente: omissão exige **culpa do serviço** (faute du service)
- Comprovar: o serviço falhou ou não funcionou como deveria

### Tendência atual (STF)
- **STF, RE 841.526**: omissão **específica** (dever individualizado) gera responsabilidade objetiva (ex.: morte de preso em delegacia)
- Omissão **genérica** (dever amplo da Administração): subjetiva
- Conhecida como "**responsabilidade dual**"

### Exemplos
- Preso morto em delegacia → objetiva (omissão específica — Estado tem dever de guarda)
- Inundação por chuva forte → subjetiva (omissão genérica — falha no serviço público)

## Dano Indenizável

Tipos de dano:
- **Material**: emergente (gastos efetivos) + lucros cessantes
- **Moral**: dor, sofrimento, abalo psicológico
- **Estético**: alteração morfológica
- **Existencial** (jurisprudência recente): perda de chance, alteração no projeto de vida

### Pressupostos
- Ato (comissivo) ou omissão (específica)
- Dano efetivo, certo, atual
- Nexo causal entre ato/omissão e dano

## Direito de Regresso

> Art 37, §6º (parte final): "...assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa."

- Estado paga ao terceiro **objetivamente**
- Estado cobra do agente **subjetivamente** (dolo ou culpa)
- Ação regressiva é **imprescritível** quando a conduta do agente foi dolosa em ato de improbidade (STF Tese 897, RE 852.475)

### Denunciação à lide
- STJ admite mas não é obrigatória
- Doutrina majoritária: vítima processa só o ente público

## Prazo Prescricional

- **5 anos** (Decreto 20.910/32) — prescrição contra a Fazenda Pública (Tese 553 STJ — confirmação)
- Ressarcimento ao erário por improbidade dolosa: **imprescritível** (STF Tese 897 — antes da Lei 14.230)

## Como cai na Cebraspe

**Item 1 (CERTO):** "A responsabilidade civil do Estado, no direito brasileiro, é objetiva, baseada na teoria do risco administrativo, que admite excludentes de responsabilidade."

**Item 2 (ERRADO):** "A teoria do risco integral é regra geral no Direito Administrativo brasileiro, sendo aplicada em todos os casos de dano causado por agentes públicos."
> Errado: regra é **risco administrativo**; integral é exceção (nuclear, ambiental, terror em aeronaves).

**Item 3 (CERTO):** "Conforme entendimento do STF, a responsabilidade por omissão específica do Estado é objetiva, enquanto a omissão genérica enseja responsabilidade subjetiva."

**Item 4 (ERRADO):** "O direito de regresso do Estado contra o agente causador do dano independe da comprovação de dolo ou culpa, sendo sempre objetivo."
> Errado: regresso é **subjetivo** — exige dolo ou culpa do agente.

**Item 5 (CERTO):** "As empresas públicas que explorem atividade econômica respondem civilmente conforme as regras de direito privado, não se aplicando o art. 37, §6º, da CF."

## Súmulas e Jurisprudência
- **STF, Tese 365 (RE 870.947)**: Aplicação do Art 1º-F da Lei 9.494/97 — juros e correção em condenações da Fazenda
- **STF, RE 841.526**: omissão específica = responsabilidade objetiva
- **STF, RE 580.252**: dano moral coletivo
- **STJ, Tese 553**: prazo prescricional de 5 anos contra Fazenda

## Estratégia
- Brasil adotou risco **administrativo** (com excludentes)
- Risco integral = exceções (NUC-AMB-TERROR)
- Omissão: específica = objetiva; genérica = subjetiva
- Regresso = subjetivo (dolo/culpa)
- EP/SEM atividade econômica = subjetiva (Código Civil)
- Prescrição: 5 anos (Decreto 20.910/32)
$md$,
  $resumo$
## Resumo — Responsabilidade Civil do Estado

### Art 37, §6º CF — Responsabilidade Objetiva
- PJ direito público + PJ privado **prestadora de serviço público**
- Risco Administrativo (admite excludentes)
- Direito de regresso ao agente: **subjetivo** (dolo/culpa)

### Teoria do Risco
- **Administrativo** (regra): admite excludentes (culpa vítima, fortuito, força maior, fato 3º)
- **Integral** (exceção): sem excludentes
  - Dano nuclear
  - Dano ambiental
  - Atos terroristas em aeronaves
  - Atos bélicos

### Por OMISSÃO (STF RE 841.526)
- **Específica** (dever individualizado): **objetiva** — ex: preso morto
- **Genérica** (dever amplo): **subjetiva** — ex: inundação

### Excludentes do risco administrativo
- Culpa exclusiva da vítima
- Caso fortuito / força maior
- Fato exclusivo de terceiro
- Culpa concorrente: reduz, não exclui

### Regresso
- Vítima → Estado: objetivo
- Estado → Agente: **subjetivo** (dolo/culpa)
- Improbidade dolosa: **imprescritível** (STF Tese 897)

### Prazo prescricional
- **5 anos** contra Fazenda (Decreto 20.910/32)
- Reparação por improbidade dolosa: imprescritível

### EP/SEM
- **Prestadora de serviço público**: objetiva (Art 37, §6º)
- **Atividade econômica** (Petrobras, BB): subjetiva (CC)

### Pegadinhas Cebraspe
- Brasil = risco ADMINISTRATIVO (não integral)
- Regresso é **subjetivo**
- Omissão específica ≠ genérica
- 5 anos é o prazo padrão
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação
-- ──────────────────────────────────────────────────────────────────────────
SELECT m.title, s.slug AS subject, t.name AS topic, m.status, (r.id IS NOT NULL) AS has_resumo
FROM "materials" m
JOIN "subjects" s ON s.id = m."subjectId"
JOIN "topics" t ON t.id = m."topicId"
LEFT JOIN "material_resumos" r ON r."materialId" = m.id
WHERE m.origin = 'ai'
ORDER BY s.slug, t."order";

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
