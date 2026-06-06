-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 2 — Cebraspe (continuação)
-- Data: 2026-06-06
--
-- Adiciona 6 materiais densos publicados:
--  - Constitucional: Defesa do Estado/Seg Pública (Art 136-144), Poderes (consolidado)
--  - Administrativo: Agentes Públicos (Lei 8.112), Improbidade (Lei 8.429)
--  - Penal: Princípios e Aplicação da Lei Penal
--  - Processual Penal: Inquérito Policial
--
-- IDEMPOTENTE (UPSERT por cacheKey). DEPENDE da onda 1 (topics-universais).
-- Status: DRAFT (aguarda revisão do admin). Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

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
  INSERT INTO "materials" (id, "subjectId", "topicId", "cacheKey", title, type, content, active, status, origin, "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, v_subject_id, v_topic_id, v_cache_key, p_title, 'TEXTO', p_content, true, 'DRAFT', 'ai', NOW(), NOW())
  ON CONFLICT ("cacheKey") DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    status = CASE
      WHEN "materials".status IN ('REVIEWED', 'PUBLISHED') THEN "materials".status
      ELSE 'DRAFT'::"MaterialStatus"
    END,
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
-- CONSTITUCIONAL — Defesa do Estado e Segurança Pública (Art 136-144)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Defesa do Estado e Segurança Pública (Art 136 a 144)',
  'Defesa do Estado e Segurança Pública',
  $md$
# Defesa do Estado e Segurança Pública (Art 136 a 144)

**Conteúdo essencial pras carreiras policiais.** Cobra Estado de Defesa, Estado de Sítio, Forças Armadas e o **Art 144** — base constitucional das polícias.

## Estado de Defesa (Art 136)

> O Presidente da República pode, **ouvidos o Conselho da República e o Conselho de Defesa Nacional**, decretar Estado de Defesa para preservar ou prontamente restabelecer a ordem pública ou a paz social, ameaçadas por instabilidade institucional grave e iminente ou atingidas por calamidades de grandes proporções na natureza.

**Características:**
- Decretado pelo **Presidente** (não precisa autorização prévia do Congresso, mas comunica em 24h pra aprovação)
- Duração: **até 30 dias**, prorrogável **uma vez** por igual período
- Restrições admitidas: reunião, sigilo de correspondência, sigilo de comunicações telegráficas/telefônicas, ocupação de bens públicos
- **Não pode**: suspender direitos políticos, manter incomunicabilidade do preso por mais de 10 dias, prisão por crime contra o Estado sem ordem judicial

## Estado de Sítio (Art 137)

Mais grave que Estado de Defesa. Hipóteses:

- I — **comoção grave de repercussão nacional** ou fatos que comprovem ineficácia de medida de Estado de Defesa
- II — declaração de **guerra** ou resposta a agressão armada estrangeira

**Procedimento:**
- Presidente solicita **autorização do Congresso**
- Maioria absoluta nas duas casas
- Duração: até 30 dias (prorrogável), salvo guerra (durar enquanto perdurar)

## Forças Armadas (Art 142)

> As Forças Armadas, constituídas pela Marinha, pelo Exército e pela Aeronáutica, são instituições nacionais permanentes e regulares, organizadas com base na **hierarquia e disciplina**, sob a autoridade suprema do Presidente da República, e destinam-se à **defesa da Pátria**, à **garantia dos poderes constitucionais** e, por iniciativa de qualquer destes, da **lei e da ordem**.

**Atenção:**
- "GLO" (Garantia da Lei e da Ordem) é hipótese de uso das FA em situações internas excepcionais.
- O militar das FA tem **regime jurídico próprio** (Art 142, §3º).

## Art 144 — SEGURANÇA PÚBLICA (★★★ crítico)

### Caput
> A segurança pública, **dever do Estado, direito e responsabilidade de todos**, é exercida para a preservação da ordem pública e da incolumidade das pessoas e do patrimônio, através dos seguintes **órgãos**:

### Órgãos (rol TAXATIVO conforme STF)
- I — **Polícia Federal** (PF)
- II — **Polícia Rodoviária Federal** (PRF)
- III — **Polícia Ferroviária Federal** (PFF)
- IV — **Polícias Civis** (estaduais)
- V — **Polícias Militares e Corpos de Bombeiros Militares**
- VI — **Polícias Penais federal, estaduais e distrital** (EC 104/2019)

**Pegadinha clássica:** Guarda Municipal **NÃO está no Art 144** como órgão de segurança pública (embora possa cooperar, conforme Art 144, §8º — atuação na proteção dos bens, serviços e instalações). Câmera municipal **NÃO faz papel de polícia**. ADPF 995 e Tema 656 (STF) flexibilizaram: Guarda Municipal pode atuar em segurança pública, mas sua existência **não amplia o rol** do caput.

### §1º — Polícia Federal (PF)
Instituída por lei como **órgão permanente, organizado e mantido pela União, estruturado em carreira**, destina-se a:
- I — **apurar infrações penais contra a ordem política e social** ou em detrimento de bens, serviços e interesses da União, suas entidades autárquicas e empresas públicas, assim como **outras infrações cuja prática tenha repercussão interestadual ou internacional e exija repressão uniforme**;
- II — prevenir e reprimir o **tráfico ilícito de entorpecentes** e drogas afins, o **contrabando e o descaminho**;
- III — exercer as funções de **polícia marítima, aeroportuária e de fronteiras**;
- IV — exercer, com exclusividade, as funções de **polícia judiciária da União**.

### §2º — Polícia Rodoviária Federal (PRF)
Destina-se ao **patrulhamento ostensivo das rodovias federais**.

### §3º — Polícia Ferroviária Federal (PFF)
Patrulhamento ostensivo das ferrovias federais.

### §4º — Polícias Civis (estaduais)
Dirigidas por **Delegados de Polícia de carreira**, incumbem, ressalvada a competência da União, as funções de **polícia judiciária** e a apuração de infrações penais, **exceto as militares**.

### §5º — Polícias Militares e Corpos de Bombeiros Militares
- PM: **polícia ostensiva** e preservação da ordem pública
- CBM: defesa civil
- Forças auxiliares e reserva do Exército
- Subordinam-se aos Governadores dos Estados/DF/Territórios

### §6º — As polícias militares e corpos de bombeiros militares são forças auxiliares e reserva do **Exército**, e ambas subordinam-se aos Governadores.

### §7º — A lei disciplinará a organização e o funcionamento dos órgãos responsáveis pela segurança pública.

### §8º — Os Municípios poderão constituir **Guardas Municipais** destinadas à proteção de seus bens, serviços e instalações, conforme dispuser a lei.

### §9º — Remuneração por subsídio (Art 39, §4º).

### §10 — Polícia Penal (EC 104/2019)
- Federal: vinculada ao órgão administrador do sistema penal federal
- Estaduais/distrital: vinculadas ao órgão administrador do sistema penal estadual/distrital

## Como cai na Cebraspe

**Item 1 (CERTO):** "A Polícia Federal exerce, com exclusividade, as funções de polícia judiciária da União."

**Item 2 (ERRADO):** "A Guarda Municipal está expressamente incluída no rol do Art 144 da CF como órgão de segurança pública."
> Errado: NÃO está no caput. O §8º apenas faculta sua criação para proteção de bens municipais.

**Item 3 (CERTO):** "As Polícias Militares são forças auxiliares e reserva do Exército, subordinando-se aos Governadores dos Estados e do Distrito Federal."

**Item 4 (ERRADO):** "Compete às Polícias Civis a apuração de infrações penais, inclusive as militares, ressalvada a competência da União."
> Errado: **exceto as militares** (estas são apuradas pela Polícia Militar/Justiça Militar).

**Item 5 (CERTO):** "A Polícia Penal, prevista no Art 144, X, foi incluída pela Emenda Constitucional 104/2019."

## Súmulas e Jurisprudência
- **STF Tema 656 / ADPF 995**: Guarda Municipal pode realizar abordagens, autuações de trânsito e atuar em segurança pública dentro de seu município.
- **STJ Súmula 444**: É vedada a utilização de inquéritos policiais e ações penais em curso para agravar pena-base.

## Estratégia
- Decore os 6 órgãos do Art 144 (PF, PRF, PFF, PC, PM/CBM, Polícia Penal)
- Guarda Municipal **NÃO** está no rol
- PF é **exclusiva** em polícia judiciária da União
- Polícias Civis: chefiadas por **Delegados de carreira**; exceto militares
- PM: ostensiva e preservação da ordem; subordinada a Governadores
$md$,
  $resumo$
## Resumo — Defesa do Estado e Segurança Pública (Art 136-144)

### Estado de Defesa (Art 136)
- Presidente decreta após ouvir Conselho da República + Conselho de Defesa Nacional
- 30 dias prorrogáveis 1× por igual período
- Comunica Congresso em 24h pra aprovação
- Cabe em instabilidade institucional grave ou calamidade

### Estado de Sítio (Art 137)
- Presidente **solicita autorização** do Congresso (maioria absoluta)
- Hipóteses: comoção nacional grave OU guerra/agressão armada estrangeira

### Forças Armadas (Art 142)
- Marinha, Exército, Aeronáutica
- Hierarquia e disciplina; Presidente é autoridade suprema
- Defesa da Pátria, garantia dos poderes constitucionais, lei e ordem (GLO)

### ART 144 — SEGURANÇA PÚBLICA (★ MEMORIZE)
6 órgãos (rol taxativo):
1. **PF** — polícia judiciária da União (exclusiva), tráfico de drogas, contrabando/descaminho, marítima/aero/fronteiras
2. **PRF** — patrulhamento ostensivo de rodovias federais
3. **PFF** — patrulhamento ostensivo de ferrovias federais
4. **Polícias Civis** — chefiadas por Delegado de carreira; apuração penal **exceto militar**
5. **PM e CBM** — ostensiva e ordem; auxiliares do Exército; subordinadas a Governadores
6. **Polícia Penal** — federal, estaduais e distrital (EC 104/2019)

### Guarda Municipal (§8º)
- **NÃO está no rol** do caput
- Proteção de bens, serviços e instalações municipais
- STF (Tema 656/ADPF 995): pode atuar em segurança pública dentro do município

### Pegadinhas Cebraspe
- Guarda Municipal NÃO é órgão do Art 144 (mas pode cooperar)
- PF é **exclusiva** em polícia judiciária da União
- Polícia Civil NÃO apura crime militar
- PM é **auxiliar do Exército**, não da Marinha/Aeronáutica
- Polícia Penal foi incluída pela **EC 104/2019**
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- CONSTITUCIONAL — Poder Legislativo (Art 44 a 75)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-constitucional',
  'Poder Legislativo (Art 44 a 75)',
  'Poder Legislativo na CF/88',
  $md$
# Poder Legislativo (Art 44 a 75)

Bicameral em nível federal. Trata da estrutura do Congresso, processo legislativo, e fiscalização. Cobra **literalidade** + **quóruns**.

## Composição (Art 44 a 47)
- **Congresso Nacional** = Câmara dos Deputados + Senado Federal
- **Câmara**: 513 deputados, sistema **proporcional**, mandato **4 anos**, mínimo 8 / máximo 70 por Estado
- **Senado**: 81 senadores (3 por Estado/DF, total 27 unidades × 3), sistema **majoritário**, mandato **8 anos**, renovação 1/3 e 2/3 alternadamente a cada 4 anos
- Cada senador tem **2 suplentes**

## Imunidades parlamentares (Art 53)

### Imunidade material (inviolabilidade)
- Senadores/Deputados **invioláveis, civil e penalmente, por quaisquer de suas opiniões, palavras e votos**.

### Imunidade formal (relativa)
- Após a diplomação, só podem ser presos em **flagrante de crime inafiançável** (autos remetidos em 24h à Casa)
- A Casa pode, **por maioria absoluta**, sustar processos criminais por crimes ocorridos **após a diplomação** (Art 53, §3º — alterado pela EC 35/2001)
- Foro privilegiado: STF (crimes comuns); só durante o mandato

## Processo Legislativo (Art 59 a 69)
Espécies:
- I — Emendas à Constituição
- II — Leis complementares
- III — Leis ordinárias
- IV — Leis delegadas
- V — Medidas provisórias
- VI — Decretos legislativos
- VII — Resoluções

### EC (Art 60)
- Iniciativa: Presidente, 1/3 da Câmara/Senado, mais da metade das Assembleias Legislativas
- Quórum: **3/5 dos votos**, em **dois turnos**, em cada Casa
- Promulga: Mesas da Câmara e do Senado
- **Não pode**: matérias de cláusula pétrea (Art 60, §4º — forma federativa, voto direto/secreto/universal/periódico, separação Poderes, direitos e garantias individuais)

### Lei Complementar (Art 69)
- Quórum: **maioria absoluta**
- Hipóteses **expressas** na CF

### Lei Ordinária
- Quórum: **maioria simples**
- Regra geral

### Medida Provisória (Art 62)
- Presidente edita em casos de **relevância e urgência**
- Vigência: 60 dias (prorrogável 1 vez)
- **Não pode** disciplinar: nacionalidade, cidadania, direitos políticos, partidos, direito eleitoral, direito penal, processual penal e civil, organização do Judiciário e MP, planos plurianuais, diretrizes orçamentárias, etc.
- Após 45 dias sobresta as demais deliberações

### Veto Presidencial
- Total ou parcial
- Razões: inconstitucionalidade OU contrariedade ao interesse público
- Congresso pode **derrubar** por **maioria absoluta**, em sessão conjunta

## Fiscalização (Art 70-75)
- Tribunal de Contas da União (TCU): controle externo, auxilia o Congresso
- Composição: 9 ministros (6 escolhidos pelo CN, 3 pelo Presidente)
- Atribuições: julgar contas dos administradores; aplicar sanções; sustar contratos irregulares.

## Como cai na Cebraspe

**Item 1 (CERTO):** "As emendas à Constituição são aprovadas por 3/5 dos votos, em dois turnos, em cada Casa do Congresso Nacional."

**Item 2 (ERRADO):** "A medida provisória pode disciplinar matéria de direito penal e processual penal em situações de relevância e urgência."
> Errado: Art 62, §1º, I — **vedação expressa**.

**Item 3 (CERTO):** "O Senado Federal é composto por representantes dos Estados e do DF, eleitos pelo sistema majoritário, com mandato de 8 anos."

**Item 4 (ERRADO):** "O veto presidencial pode ser derrubado pelo Congresso Nacional, em sessão conjunta, pelo voto de 2/3 dos parlamentares."
> Errado: **maioria absoluta**, não 2/3.

## Estratégia
- Decore quóruns: EC (3/5, 2 turnos), LC (absoluta), LO (simples)
- MP **NÃO** pode disciplinar penal/processual penal/eleitoral/cidadania/etc.
- Imunidade material = inviolabilidade absoluta nas opiniões/palavras/votos
- Cláusulas pétreas: FOR-VO-SEP-DI (Federativa, Voto, Separação, Direitos individuais)
$md$,
  $resumo$
## Resumo — Poder Legislativo

### Composição
- **Câmara**: 513 dep., proporcional, mandato 4 anos
- **Senado**: 81 sen. (3 por ente), majoritário, mandato 8 anos, 2 suplentes

### Imunidades (Art 53)
- **Material**: invioláveis por opiniões, palavras e votos
- **Formal**: só prisão por flagrante de crime inafiançável; Casa pode sustar processos por crimes após diplomação (maioria absoluta)
- **Foro**: STF (crimes comuns), só durante mandato

### Processo Legislativo (quóruns)
- **EC**: 3/5, 2 turnos, em cada Casa
- **LC**: maioria absoluta
- **LO**: maioria simples
- **Veto derrubado**: maioria absoluta, sessão conjunta

### Cláusulas pétreas (Art 60, §4º — memorize FOR-VO-SEP-DI)
1. **For**ma federativa
2. **Vo**to direto, secreto, universal e periódico
3. **Sep**aração dos Poderes
4. **Di**reitos e garantias individuais

### MP (Art 62) — NÃO pode (memorize):
- Direito penal, processual penal, civil
- Nacionalidade, cidadania, direitos políticos, partidos, eleitoral
- Organização do Judiciário e MP
- Plano plurianual, diretrizes orçamentárias

### Pegadinhas Cebraspe
- MP **NÃO** pode tratar de direito penal
- Veto: derruba por **maioria absoluta**, não 2/3
- Senador tem 2 suplentes
- Câmara: mínimo 8, máximo 70 deputados por Estado
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVO — Agentes Públicos e Lei 8.112/90
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Agentes Públicos e Lei 8.112/90',
  'Agentes Públicos — Regime Jurídico (Lei 8.112/90)',
  $md$
# Agentes Públicos e Lei 8.112/90

A Lei 8.112/90 é o **Regime Jurídico Único dos Servidores Civis da União, autarquias e fundações públicas federais**. Cobra **literalidade** de prazos, regimes disciplinares e benefícios.

## Classificação dos Agentes Públicos

### Agentes políticos
- Chefes de Executivo, Ministros, Magistrados, MP, Diplomatas.
- Vínculo de função política, não trabalhista.

### Servidores estatutários
- Lei 8.112/90 (Federal). Cargo público + regime jurídico unilateral.

### Empregados públicos
- CLT. Empresas Públicas e Sociedades de Economia Mista.

### Servidores temporários (Art 37, IX)
- Contrato por tempo determinado para necessidade excepcional.

### Particulares em colaboração
- Mesários, jurados, voluntários.

## Provimento e Investidura (Art 5º a 21)

### Requisitos para investidura (Art 5º)
- Nacionalidade brasileira
- Gozo de direitos políticos
- Quitação militar e eleitoral
- Nível de escolaridade
- Idade mínima de 18 anos
- Aptidão física e mental

### Formas de provimento (Art 8º)
1. Nomeação (origem em concurso)
2. Promoção
3. Readaptação
4. Reversão
5. Aproveitamento
6. Reintegração
7. Recondução

### Posse (Art 13)
- **30 dias** da publicação do ato de nomeação
- Compromisso

### Exercício (Art 15)
- **15 dias** da posse
- Início do estágio probatório (24 meses pela 8.112, mas a **CF dispõe 3 anos** — entendimento majoritário aplica 36 meses)

### Estabilidade
- 3 anos de efetivo exercício (Art 41 CF, alterado pela EC 19/98)

## Direitos e Vantagens

### Remuneração (Art 41-48)
- Vencimento básico + vantagens pecuniárias permanentes
- **Subsídio**: parcela única, sem acréscimos (aplicável a carreiras jurídicas, policiais, diplomatas, magistrados, MP)

### Adicionais e gratificações
- Insalubridade, periculosidade, atividade penosa
- Serviço extraordinário (até 50% por hora)
- Adicional noturno (entre 22h e 5h, 25%)
- Gratificação natalina (13º), férias

### Férias (Art 77)
- **30 dias** consecutivos por ano, podendo ser parceladas em até 3 etapas a partir do interesse do serviço
- Adicional de 1/3 sobre a remuneração

### Licenças (Art 81 a 96)
- Por motivo de doença em pessoa da família
- Por motivo de afastamento do cônjuge
- Para o serviço militar
- Para atividade política
- Para capacitação (3 meses a cada 5 anos efetivamente trabalhados)
- Para tratar de interesses particulares (até 3 anos, descontínuos)
- Para desempenho de mandato classista

## Regime Disciplinar (Art 116 a 142)

### Deveres do servidor (Art 116)
- Exercer com zelo, cumprir ordens (salvo manifestamente ilegais), atender prazos, manter discrição, ser leal, urbano etc.

### Proibições (Art 117)
- Ausentar-se durante expediente, retirar documentos, recusar fé a documentos públicos, valer-se do cargo para lograr proveito pessoal, atuar como procurador, etc.

### Penalidades (Art 127)
1. Advertência
2. Suspensão (até 90 dias)
3. **Demissão** (faltas graves)
4. Cassação de aposentadoria/disponibilidade
5. Destituição de cargo em comissão
6. Destituição de função comissionada

### Hipóteses de demissão (Art 132)
- Crime contra a administração pública
- Abandono de cargo (30 dias consecutivos)
- Inassiduidade habitual (60 dias intercalados em 12 meses)
- Improbidade administrativa
- Aplicação irregular de dinheiros públicos
- Lesão aos cofres públicos
- **Acumulação ilegal de cargos**, etc.

### PAD — Processo Administrativo Disciplinar (Art 143 a 182)
- Comissão de 3 servidores estáveis
- Fases: instauração, inquérito, julgamento
- Prazo: 60 dias (prorrogável)
- Ampla defesa e contraditório obrigatórios (SV 5 STF: nulidade se citação inadequada)

### Prescrição (Art 142)
- **5 anos** — penas de demissão/cassação/destituição
- **2 anos** — suspensão
- **180 dias** — advertência

## Como cai na Cebraspe

**Item 1 (CERTO):** "Conforme a Lei 8.112/90, o prazo para o servidor empossado entrar em exercício é de 15 dias, contados da data da posse."

**Item 2 (ERRADO):** "O servidor nomeado em virtude de concurso público adquire estabilidade após 2 anos de efetivo exercício."
> Errado: **3 anos** (Art 41 CF).

**Item 3 (CERTO):** "A demissão é a penalidade aplicada ao servidor que abandona o cargo por mais de 30 dias consecutivos."

**Item 4 (ERRADO):** "A prescrição da pretensão punitiva do Estado, no caso de demissão, é de 3 anos."
> Errado: **5 anos** (Art 142, I).

## Súmulas
- **SV 5**: a falta de defesa técnica por advogado no PAD não ofende a Constituição.
- **Súmula 650 STF**: cônjuge supérstite tem legitimidade para reclamar pensão por morte.

## Estratégia
- Decore prazos: posse 30 dias, exercício 15 dias, estabilidade 3 anos
- Penalidades: 6 (memorize as 4 expulsivas)
- PAD: comissão de 3 estáveis, 60 dias
- Prescrição: 5 / 2 / 180 dias
- Abandono: 30 dias; inassiduidade: 60 em 12 meses
$md$,
  $resumo$
## Resumo — Lei 8.112/90 e Agentes Públicos

### Classificação
- **Políticos** (Min, Mag), **estatutários** (8.112), **CLT** (EP/SEM), **temporários** (Art 37, IX), **particulares em colaboração**

### Prazos críticos
- **Posse**: 30 dias da publicação do ato de nomeação
- **Exercício**: 15 dias da posse
- **Estabilidade**: 3 anos (Art 41 CF)
- **Férias**: 30 dias/ano + 1/3 constitucional
- **Licença capacitação**: 3 meses a cada 5 anos

### Penalidades (Art 127) — 6 espécies
1. Advertência
2. Suspensão (até 90 dias)
3. **Demissão**
4. Cassação aposentadoria/disponibilidade
5. Destituição cargo em comissão
6. Destituição função comissionada

### Demissão (Art 132) — hipóteses
- Crime contra administração, **abandono de cargo (30 dias consecutivos)**, **inassiduidade (60 dias intercalados em 12 meses)**, improbidade, acumulação ilegal, lesão a cofres

### PAD (Art 143+)
- Comissão de 3 servidores estáveis
- 60 dias (prorrogável)
- Ampla defesa e contraditório obrigatórios
- SV 5: defesa técnica por advogado não é obrigatória

### Prescrição (Art 142)
- **5 anos** — demissão/cassação/destituição
- **2 anos** — suspensão
- **180 dias** — advertência

### Pegadinhas Cebraspe
- Estabilidade é **3 anos**, não 2
- Abandono = 30 dias **consecutivos**
- Inassiduidade = 60 dias **intercalados** em 12 meses
- Prescrição demissão = 5 anos
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- ADMINISTRATIVO — Improbidade Administrativa (Lei 8.429/92)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-administrativo',
  'Improbidade Administrativa (Lei 8.429/92)',
  'Improbidade Administrativa — Lei 8.429/92',
  $md$
# Improbidade Administrativa (Lei 8.429/92)

A Lei 8.429/92 foi **profundamente alterada pela Lei 14.230/2021**. Cebraspe está cobrando muito a nova redação. Atenção redobrada.

## Sujeitos

### Sujeito ativo
- Agente público (Art 2º)
- Particular que induza, concorra ou se beneficie (Art 3º)

### Sujeito passivo
- Administração direta, indireta, ou entidade que receba recursos públicos
- Atenção: a redação anterior incluía entidades privadas com recurso público — a Lei 14.230 restringiu

## Atos de Improbidade (3 categorias)

### 1. Atos que importam enriquecimento ilícito (Art 9º)
- Receber qualquer vantagem econômica em razão do cargo
- **Necessariamente DOLO** (não cabe culpa)

### 2. Atos que causam prejuízo ao erário (Art 10)
- Ação ou omissão dolosa que cause perda patrimonial
- **APÓS a Lei 14.230/2021: APENAS DOLOSA** (eliminou modalidade culposa, exceção apenas para enriquecimento ilícito)

### 3. Atos que atentam contra os princípios (Art 11)
- Ação ou omissão dolosa que viole princípios da administração
- **Necessariamente DOLO**
- A Lei 14.230 tornou **TAXATIVO** o rol (antes era exemplificativo)

**Lei 14.230 trouxe o DOLO ESPECÍFICO**: necessidade de comprovação de **vontade livre e consciente** de violar o ordenamento + finalidade ilícita.

## Sanções (Art 12)

| Categoria | Multa | Suspensão direitos políticos | Vedação contratar com Poder Público | Perda da função | Ressarcimento integral do dano |
|---|---|---|---|---|---|
| Art 9 (enriqueic. ilícito) | até 12× | 8 a 14 anos | 14 anos | Sim | Sim, integral |
| Art 10 (prejuízo erário) | até 24% do dano | 8 a 14 anos | 12 anos | Sim | Sim, integral |
| Art 11 (princípios) | até 24× a remun. mensal | NÃO mais aplicável (Lei 14.230) | 4 anos | Sim | NÃO (não é necessariamente exigível) |

**ATENÇÃO Lei 14.230:**
- Para Art 11: **não há mais suspensão de direitos políticos**
- Não há mais perda do cargo automática como sanção mínima — depende de proporcionalidade
- Pode haver **acordo de não-persecução cível** (ANPC) entre MP e investigado

## Prescrição (Lei 14.230)
- Geral: **8 anos** contados do fato (regra nova!)
- **Interrupção**: notificação, citação, sentença condenatória
- Para o ressarcimento ao erário, ato doloso de improbidade: **imprescritível** (STF, RE 852.475 — Tese 897 — mas STF revisou e parte da doutrina já entende prescritível com a nova lei)

## Procedimento
- Sindicância → Investigação prévia → Ação civil pública (proposta pelo MP)
- MP **tem legitimidade exclusiva** desde a Lei 14.230 (revogou competência do ente lesado)
- ADI 7042/7043: STF derrubou esse monopólio do MP; entes públicos voltaram a ter legitimidade.

## Como cai na Cebraspe

**Item 1 (CERTO):** "Após a Lei 14.230/2021, o ato de improbidade administrativa que atente contra os princípios da administração pública depende de dolo, não admitindo modalidade culposa."

**Item 2 (ERRADO):** "A multa civil pelo ato de improbidade que cause prejuízo ao erário pode ser de até 12 vezes o valor do dano."
> Errado: multa do Art 10 é de **até 24%** do valor do dano (NÃO 12 vezes). 12 vezes é parâmetro do Art 9.

**Item 3 (CERTO):** "Conforme entendimento do STF, o ressarcimento ao erário decorrente de ato doloso de improbidade administrativa é imprescritível." (Tese 897, RE 852.475 — antes da Lei 14.230)

**Item 4 (ERRADO):** "A Lei 8.429/92, em sua redação atual, prevê a perda do cargo como sanção automática em qualquer ato de improbidade comprovado."
> Errado: depende de proporcionalidade e do tipo de ato.

## Súmulas e jurisprudência
- **STF Tese 897/RE 852.475**: ressarcimento ao erário por ato doloso de improbidade é **imprescritível**.
- **STF ADIs 7042 e 7043**: declararam inconstitucional a exclusividade do MP na propositura da ação.

## Estratégia
- Decore as 3 categorias (Art 9/10/11)
- Memorize: TODAS exigem DOLO após Lei 14.230 (com a única exceção do Art 9 que já era dolo)
- Sanções variam muito por categoria — memorize a tabela
- Art 11 perdeu suspensão de direitos políticos
- Ressarcimento ao erário por dolo é imprescritível
$md$,
  $resumo$
## Resumo — Lei 8.429/92 (com alterações da Lei 14.230/2021)

### 3 categorias
- **Art 9**: enriquecimento ilícito — DOLO
- **Art 10**: prejuízo ao erário — DOLO (após Lei 14.230, NÃO mais culpa)
- **Art 11**: atos contra princípios — DOLO; rol agora TAXATIVO

### Dolo específico (Lei 14.230)
- Vontade livre e consciente + finalidade ilícita
- Mero erro/culpa NÃO configura

### Sanções (Art 12)
- **Art 9**: multa até 12× a vantagem, suspensão direitos políticos 8-14a, vedação 14 anos
- **Art 10**: multa até 24% do dano, suspensão 8-14a, vedação 12 anos
- **Art 11**: multa até 24× remuneração, vedação 4 anos, **SEM suspensão de direitos políticos** (Lei 14.230)
- Ressarcimento integral do dano (Art 9 e 10)
- Perda da função pública (avaliar proporcionalidade)

### Prescrição
- **8 anos** do fato (Lei 14.230)
- **Ressarcimento por dolo**: imprescritível (STF Tese 897)

### Procedimento
- ANPC (acordo de não-persecução cível)
- MP propõe ação civil pública
- STF (ADIs 7042/7043) restabeleceu legitimidade dos entes públicos

### Pegadinhas Cebraspe
- Art 11 não tem mais suspensão de direitos políticos
- Modalidade culposa **eliminada** para Art 10
- Multa do Art 10 é % do dano, não múltiplo da vantagem
- Particular pode ser sujeito ativo se concorrer ou se beneficiar
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL — Princípios e Aplicação da Lei Penal
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal',
  'Princípios e Aplicação da Lei Penal',
  'Princípios e Aplicação da Lei Penal',
  $md$
# Princípios e Aplicação da Lei Penal

A Parte Geral do Código Penal (Decreto-Lei 2.848/40) começa estabelecendo **princípios** e **regras de aplicação** que governam todo o sistema. Cebraspe cobra muito **literalidade** + jurisprudência STF.

## Princípios Fundamentais

### Princípio da Legalidade (Art 5º, XXXIX CF e Art 1º CP)
> Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal.

**Desdobramentos:**
- **Lex praevia**: lei anterior ao fato
- **Lex scripta**: lei escrita (proibido costume incriminador)
- **Lex stricta**: vedada analogia incriminadora (analogia in malam partem)
- **Lex certa**: tipo penal deve ser claro (princípio da taxatividade)

### Princípio da Anterioridade
- Crime e pena devem estar previstos em lei anterior ao fato
- Decorre do princípio da legalidade

### Princípio da Irretroatividade
- A lei penal **não retroage**, salvo para beneficiar o réu (Art 5º, XL CF)
- **Abolitio criminis**: lei nova descriminaliza → extingue pena
- **Novatio legis in mellius**: lei nova mais benéfica → aplica retroativamente
- **Novatio legis in pejus**: lei nova mais gravosa → NÃO retroage

### Princípio da Individualização da Pena (Art 5º, XLVI CF)
- Pena individualizada conforme circunstâncias do crime e do autor

### Princípio da Pessoalidade (Art 5º, XLV CF)
- Pena não passa da pessoa do condenado
- Obrigação de reparar o dano e perdimento de bens podem alcançar sucessores **até o limite da herança**

### Princípio da Humanidade
- Vedação de penas: morte (salvo guerra), perpétuas, trabalhos forçados, banimento, cruéis (Art 5º, XLVII CF)
- Pena máxima privativa de liberdade no Brasil: 40 anos (Pacote Anticrime — Lei 13.964/19)

### Princípio da Insignificância (Bagatela)
- Não se aplica ao crime militar, racismo, tráfico de drogas (STF: minimoe relevância)
- 4 vetores: mínima ofensividade, periculosidade reduzida, baixíssimo grau de reprovabilidade, inexpressividade da lesão (HC 84.412/STF)

### Princípio da Adequação Social
- Conduta socialmente aceita não configura crime mesmo se típica formalmente

### Princípio da Intervenção Mínima e Fragmentariedade
- Direito Penal é última ratio
- Só protege bens jurídicos mais importantes

## Aplicação da Lei Penal no Tempo (Art 4º)

> Considera-se praticado o crime **no momento da ação ou omissão**, ainda que outro seja o momento do resultado.

**Teoria adotada: TEORIA DA ATIVIDADE**

**Exemplo:** A atira em B em janeiro/2023. B morre em março/2024. Tempo do crime: **janeiro/2023**.

## Aplicação da Lei Penal no Espaço (Art 5º a 8º)

### Princípio da Territorialidade (Art 5º)
- Aplica-se a lei brasileira ao crime cometido no território nacional
- Território nacional: espaço terrestre, aéreo, marítimo até 12 milhas
- Equiparam-se a território nacional: embarcações e aeronaves brasileiras de natureza pública ou a serviço do governo brasileiro

### Extraterritorialidade (Art 7º)
- **Incondicionada** (Art 7º, I): contra vida/liberdade do Presidente; contra patrimônio público; contra a administração pública; genocídio brasileiro
- **Condicionada** (Art 7º, II): que por tratado o Brasil se obrigou; praticados por brasileiro; em aeronaves/embarcações brasileiras privadas em território estrangeiro quando lá não julgados

### Pena cumprida no estrangeiro (Art 8º)
- Atenua a pena imposta no Brasil pela mesma infração (subtração da pena já cumprida)

## Lei Penal no Tempo (Art 2º e 3º)

### Art 2º — Abolitio criminis
> Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, **cessando em virtude dela a execução e os efeitos penais da sentença condenatória**.

### Art 2º, parágrafo único — Novatio legis in mellius
> A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.

### Art 3º — Leis temporárias e excepcionais
> A lei excepcional ou temporária, embora decorrido o período de sua duração ou cessadas as circunstâncias que a determinaram, **aplica-se ao fato praticado durante sua vigência**.

## Como cai na Cebraspe

**Item 1 (CERTO):** "O princípio da legalidade penal exige lei anterior, escrita, estrita e certa, vedando a analogia incriminadora."

**Item 2 (ERRADO):** "O Código Penal Brasileiro adota a teoria do resultado para definir o tempo do crime."
> Errado: adota a **teoria da atividade** (Art 4º).

**Item 3 (CERTO):** "A lei penal não retroage, salvo para beneficiar o réu, conforme o art. 5º, XL, da Constituição Federal."

**Item 4 (ERRADO):** "O princípio da insignificância pode ser aplicado a todos os crimes, inclusive ao tráfico de drogas e crimes contra a administração pública."
> Errado: STF restringe — não se aplica a tráfico, crime militar, racismo etc.

## Súmulas
- **Súmula 711 STF**: lei penal mais grave aplica-se ao crime continuado/permanente quando a sua vigência for **anterior à cessação da continuidade**.
- **STF HC 84.412**: vetores da insignificância (MARI — Mínima ofensividade, Ausência de periculosidade, Reduzido grau de reprovabilidade, Inexpressividade da lesão).

## Estratégia
- Teoria do tempo do crime: **ATIVIDADE** (Art 4º)
- Lex praevia/scripta/stricta/certa → desdobramentos da legalidade
- Memorize hipóteses do Art 7º (extraterritorialidade)
- Pena máxima no Brasil: 40 anos (Lei 13.964/19)
$md$,
  $resumo$
## Resumo — Princípios e Aplicação da Lei Penal

### Princípios essenciais
- **Legalidade** (Art 5º, XXXIX CF): lex praevia, scripta, stricta, certa
- **Anterioridade**: lei anterior ao fato
- **Irretroatividade**: salvo para beneficiar o réu
- **Individualização**, **Pessoalidade** (Art 5º, XLV), **Humanidade** (sem pena perpétua, cruel, banimento)
- **Insignificância (HC 84.412)** — vetores MARI: Mínima ofensividade, Ausência de periculosidade, Reduzido grau de reprovabilidade, Inexpressividade da lesão

### Tempo do crime (Art 4º)
- **Teoria da ATIVIDADE**: momento da ação/omissão

### Lei penal no tempo
- **Abolitio criminis** (Art 2º): cessa execução e efeitos da sentença
- **Novatio legis in mellius**: retroage até depois do trânsito em julgado
- **Novatio legis in pejus**: NÃO retroage
- **Lei temporária/excepcional** (Art 3º): aplica-se mesmo após vigência

### Lei penal no espaço (Art 5º-7º)
- **Territorialidade** (Art 5º): lei brasileira no território
- **Extraterritorialidade incondicionada** (Art 7º, I): vida Presidente, patrimônio público, admin pública, genocídio
- **Extraterritorialidade condicionada** (Art 7º, II): tratados, brasileiros no exterior, aeronaves/embarcações privadas
- **Pena no estrangeiro** (Art 8º): atenua a pena no Brasil

### Pena máxima
- 40 anos (Lei 13.964/19 — Pacote Anticrime; antes era 30)

### Pegadinhas Cebraspe
- Tempo do crime = **atividade**, não resultado
- Insignificância **NÃO** se aplica a tráfico, militar, racismo
- Lei mais grave NÃO retroage; lei mais benéfica SIM
- Vedado costume incriminador (lex scripta)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PROCESSUAL PENAL — Inquérito Policial
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-processual-penal',
  'Inquérito Policial: natureza, características, atribuição',
  'Inquérito Policial',
  $md$
# Inquérito Policial

**O Inquérito Policial (IP) é o procedimento administrativo-investigatório, conduzido pela autoridade policial, destinado à apuração da autoria e materialidade de infrações penais.** Tema **central** pra Delegado, Agente, Escrivão, Papiloscopista.

## Natureza jurídica
- **Administrativo** (não jurisdicional)
- **Investigativo** (não processual)
- **Inquisitivo** (não contraditório obrigatório — STJ excepciona pelos direitos do investigado)
- **Discricionário** quanto às diligências (a autoridade escolhe quais investigar)
- **Indisponível** (uma vez instaurado, não pode ser arquivado de ofício pela polícia — só MP/Juiz)

## Características (memorize: AI-DESCO-IN-OFI-SI-SUB)
- **A**dministrativo
- **I**nquisitivo (sem contraditório)
- **D**iscricionário
- **E**scrito
- **S**igiloso (Art 20 CPP)
- **C**áracter informativo
- **O**ficial
- **In**disponível
- **OFI**cioso (instaurado de ofício pela autoridade ou por requisição/representação)
- **SI**stemático
- **SUB**sidiário à ação penal

## Atribuição (Art 4º CPP)
- **Polícia Judiciária** (Polícia Civil pros crimes comuns estaduais; PF pros crimes federais)
- Concorrente com outras autoridades administrativas (CPI, MP, etc.)

## Sigilo (Art 20 CPP) — Súmula Vinculante 14

> A autoridade assegurará no inquérito o **sigilo necessário** à elucidação do fato ou exigido pelo interesse da sociedade.

**SV 14**: "É direito do defensor, no interesse do representado, ter acesso amplo aos elementos de prova **que, já documentados em procedimento investigatório** realizado por órgão com competência de polícia judiciária, digam respeito ao exercício do direito de defesa."

**Atenção**: o defensor tem direito ao que **já está documentado**. Diligências em curso podem permanecer em sigilo.

## Início do IP (Art 5º CPP)

### Modalidades
1. **De ofício** (autoridade policial)
2. **Por requisição** do Juiz ou MP
3. **A requerimento** do ofendido ou de quem tiver qualidade pra representar
4. **Por delação anônima**: a autoridade verifica a procedência antes de instaurar (STF: pode embasar diligências mas não inquérito formal direto)

### Crimes de ação penal pública incondicionada
- Instauração de ofício ou por requisição

### Crimes de ação penal pública condicionada
- Depende de **representação** do ofendido ou requisição do **Ministro da Justiça**

### Crimes de ação penal privada
- Depende de **requerimento** do ofendido

## Prazos (Art 10 CPP)

### Réu preso
- **10 dias** (prorrogáveis em circunstâncias excepcionais)
- Em **caso de prisão temporária** (Lei 7.960/89): 5 dias + 5 prorrogáveis (crimes comuns) ou 30 + 30 (crimes hediondos)

### Réu solto
- **30 dias** (prorrogáveis a juízo do Juiz)

### Crimes federais (Lei 5.010/66)
- **15 dias** (preso) prorrogáveis por mais 15

## Diligências (Art 6º e 7º CPP)
- Comparecer ao local do crime
- Apreender objetos
- Colher provas
- Ouvir o ofendido, indiciado, testemunhas
- **Reconhecimento** (Art 226 CPP)
- **Acareação**
- **Reconstituição do crime** (Art 7º)
- Determinar exames

## Indiciamento
- Ato formal pelo qual o Delegado, com base em indícios suficientes, atribui a alguém a autoria de uma infração
- **Atribuição privativa do Delegado** (Lei 12.830/13, Art 2º, §6º)
- Não pode ser determinado por MP ou Juiz

## Encerramento do IP (Art 10, §1º)
- Relatório do Delegado encaminhado ao Juiz
- Juiz remete ao MP
- MP: oferece denúncia, requer arquivamento, requer diligências (Art 16), requer declinação

## Arquivamento (Art 28 CPP, alterado pelo Pacote Anticrime)

> Ordenado o arquivamento do inquérito policial ou de quaisquer elementos informativos da mesma natureza, o órgão do Ministério Público comunicará à **vítima**, ao investigado e à autoridade policial e encaminhará os autos para a instância de revisão ministerial para fins de homologação, na forma da lei.

**Mudança radical**: arquivamento agora é **homologado pela instância revisora do MP** (procurador-chefe), não mais pelo Juiz. **MAS o STF, em ADI 6298, suspendeu liminarmente** esse novo modelo — atualmente segue o antigo (controle judicial), mas há vagueza. Vale acompanhar.

## Como cai na Cebraspe

**Item 1 (CERTO):** "O inquérito policial é procedimento administrativo, inquisitivo e dispensável para a propositura da ação penal."

**Item 2 (ERRADO):** "O Delegado de Polícia, ao concluir a investigação, pode arquivar o inquérito quando concluir pela inexistência de elementos de autoria e materialidade."
> Errado: o arquivamento NÃO compete ao Delegado, mas ao MP (controle do Judiciário ou da instância revisora).

**Item 3 (CERTO):** "Conforme a Súmula Vinculante 14 do STF, o defensor tem direito de acessar amplamente os elementos já documentados no procedimento investigatório."

**Item 4 (ERRADO):** "O prazo para conclusão do inquérito policial, no caso de réu preso, é de 30 dias, prorrogáveis a juízo da autoridade."
> Errado: réu preso = **10 dias** (Art 10 CPP).

**Item 5 (CERTO):** "O indiciamento é ato privativo do Delegado de Polícia, conforme a Lei 12.830/2013."

## Súmulas
- **SV 14**: acesso da defesa ao IP
- **Súmula 522 STJ**: a conduta de atentar contra a vida de policial não atrai a competência da Justiça Federal
- **STF**: investigação criminal direta pelo MP é constitucional (Tema 184)

## Estratégia
- Decore prazos: 10 dias (preso), 30 dias (solto)
- Indiciamento é **PRIVATIVO do Delegado**
- Arquivamento: NOVO modelo (Pacote Anticrime) suspenso por ADI 6298, mas tema em construção
- IP é dispensável (MP pode denunciar com base em outros elementos)
- Características (AI-DESCO-IN-OFI-SI-SUB) na ponta da língua
$md$,
  $resumo$
## Resumo — Inquérito Policial

### Natureza
- Procedimento administrativo, investigativo, inquisitivo, discricionário, sigiloso, indisponível, escrito, oficioso

### Atribuição
- Polícia Judiciária (PC = crimes estaduais; PF = federais)
- Concorrente com CPI, MP, outras autoridades

### Início (Art 5º CPP)
- De ofício, por requisição (Juiz/MP), a requerimento do ofendido, ou após verificação de delação anônima
- Ação pública condicionada: representação ou requisição do Ministro da Justiça
- Ação privada: requerimento do ofendido

### Prazos (Art 10 CPP)
- **Preso**: 10 dias (federal: 15+15)
- **Solto**: 30 dias prorrogáveis
- **Prisão temporária**: 5+5 (comum) ou 30+30 (hediondo)

### Sigilo (Art 20 + SV 14)
- Sigilo p/ elucidação
- Defesa tem acesso ao que já está documentado

### Indiciamento (Lei 12.830/13, Art 2º, §6º)
- **PRIVATIVO do Delegado** — MP e Juiz NÃO podem determinar

### Encerramento e arquivamento (Art 28)
- Relatório do Delegado → Juiz → MP
- MP: oferece denúncia, requer arquivamento, requer diligências
- Arquivamento (novo modelo): homologação pela instância revisora do MP
- **ADI 6298**: STF suspendeu liminarmente — vale o modelo antigo (controle judicial)

### Diligências do Delegado (Art 6º/7º)
- Local do crime, apreensão, oitiva, reconhecimento, acareação, reconstituição

### Pegadinhas Cebraspe
- Preso = 10 dias, NÃO 30
- Indiciamento NÃO pode ser determinado por MP/Juiz
- IP é DISPENSÁVEL para a ação penal
- Delegado **não arquiva** inquérito — é atribuição do MP
- Investigação direta pelo MP é constitucional (STF)
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
WHERE m.origin = 'ai' AND m.status = 'PUBLISHED'
ORDER BY s.slug, t."order";

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
