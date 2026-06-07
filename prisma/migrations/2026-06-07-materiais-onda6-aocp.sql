-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 6 — AOCP (PMDF Soldado específicos)
-- Data: 2026-06-07
--
-- 6 materiais densos (DRAFT — aguarda revisão admin):
--  - Legislação PMDF: Lei Orgânica do DF, Lei 7.289/84 (Estatuto), Lei 12.086/09
--  - Penal Militar: Aplicação do CPM (Art 9 + L13.491/17), Crimes em Tempo de Paz
--  - Processual Penal Militar: IPM (Inquérito Policial Militar)
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED. Depende dos seeds PMDF.
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
-- LEGISLAÇÃO PMDF — Lei Orgânica do Distrito Federal
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'legislacao-pmdf',
  'Lei Orgânica do Distrito Federal (LODF)',
  'Lei Orgânica do Distrito Federal',
  $md$
# Lei Orgânica do Distrito Federal (LODF)

A LODF é a "Constituição" do DF — promulgada em **8/6/1993**. Cobra **literalidade** em itens C/E. Estatuto especial do DF (Art 32 CF/88).

## Natureza do DF (Art 32 CF + LODF)
- DF é unidade da federação **sui generis**
- **NÃO é Estado, NÃO é Município** — acumula competências legislativas de AMBOS
- É vedada a divisão do DF em municípios (Art 32 CF)

## Estrutura da LODF

### Título I — Fundamentos da Organização (Art 1º a 7º)
- **Capital da República**: o DF integra a União
- Organização político-administrativa: poder estadual + municipal
- **Símbolos**: bandeira, hino, brasão

### Capítulo dos Direitos Individuais e Coletivos (Art 2º LODF)
> "Os direitos e garantias expressos nesta Lei Orgânica não excluem outros decorrentes do regime e dos princípios por ela adotados, ou dos tratados internacionais firmados pela República Federativa do Brasil."

## Poder Legislativo do DF — Câmara Legislativa (CLDF)

- **24 deputados distritais** (mesma quantidade da Câmara Federal proporcional, aplicado ao DF)
- Mandato: **4 anos**
- Composição: representantes do povo do DF

### Atribuições
- Legislar sobre temas estaduais E municipais
- Fiscalização contábil, financeira e orçamentária (TCDF)
- Sustar atos do Executivo

### Imunidades
- Idênticas aos parlamentares federais (Art 53 CF)

## Poder Executivo

### Governador e Vice
- Eleitos em chapa única, mandato **4 anos**
- Sucessão: Vice-Governador → Presidente CLDF → Presidente TJDFT

### Atribuições do Governador
- Nomear Secretários
- Sancionar/vetar leis
- Expedir decretos
- Comandar o efetivo PMDF e CBMDF (segurança pública distrital)

### Restrição importante (Art 21 CF)
- A PMDF e o CBMDF são **organizados, mantidos pela UNIÃO** (Art 21, XIV CF)
- **MAS** seu uso operacional é do Governador do DF
- Daí a expressão "Forças Auxiliares e Reserva do Exército", embora paguem pela União

## Poder Judiciário do DF
- **TJDFT** — Tribunal de Justiça do DF e Territórios
- Organizado e mantido pela UNIÃO (Art 21, XIII CF)
- Compete: causas civis, criminais, infância, trabalho

## Funções Essenciais à Justiça
- **MPDFT** — Ministério Público do DF e Territórios (federal)
- **Defensoria Pública do DF** (distrital)
- **AGU** atua perante TJDFT (não há PGE/DF, há PGDF — Procuradoria-Geral do DF)

## Administração Pública do DF (Art 19 LODF)

### Princípios
- **LIMPE** + outros princípios constitucionais
- Concurso público obrigatório
- Estabilidade após **3 anos** (Art 41 CF)

### Categorias
- Servidores civis (Lei Complementar 840/2011 — Regime Jurídico Único do DF)
- **Militares**: PMDF + CBMDF (Lei 7.289/84)

## Segurança Pública no DF (Art 117 LODF)

> A segurança pública do DF é dever do GDF e responsabilidade de todos.

### Órgãos
- **PCDF** — Polícia Civil
- **PMDF** — Polícia Militar
- **CBMDF** — Corpo de Bombeiros Militar

**Atenção**: PCDF é polícia judiciária do DF e tem regime distinto da PMDF (estatutário federal específico).

## Tributos do DF

### Tributos estaduais: ICMS, IPVA, ITCMD
### Tributos municipais: IPTU, ITBI, ISS

O DF **cumula** as competências tributárias do Estado e do Município.

## Como cai na AOCP

**Item 1 (CERTO):** "A Câmara Legislativa do Distrito Federal é composta por 24 Deputados Distritais, com mandato de 4 anos."

**Item 2 (ERRADO):** "O Distrito Federal pode ser dividido em municípios mediante lei complementar federal."
> Errado: Art 32 CF VEDA divisão.

**Item 3 (CERTO):** "A Polícia Militar do Distrito Federal é organizada e mantida pela União, conforme o art. 21, XIV, da Constituição Federal."

**Item 4 (ERRADO):** "O Distrito Federal possui competência apenas para legislar sobre matérias estaduais, cabendo aos seus territórios os assuntos municipais."
> Errado: o DF NÃO tem territórios próprios; acumula competências estaduais E municipais.

## Estratégia
- LODF = "Constituição do DF" (1993)
- DF acumula competências de Estado + Município
- 24 Deputados Distritais, 4 anos
- PMDF/CBMDF: organização/manutenção UNIÃO; comando operacional DO GDF
- TJDFT e MPDFT: federais
- Sucessão Governador: VG → Presidente CLDF → Presidente TJDFT
$md$,
  $resumo$
## Resumo — Lei Orgânica do DF

### Natureza do DF
- "Constituição do DF" — promulgada em 1993
- Capital da República, integra a União
- Acumula competências de Estado E Município
- **NÃO** pode ser dividido em municípios

### Câmara Legislativa (CLDF)
- 24 Deputados Distritais
- Mandato 4 anos
- Legisla sobre matérias estaduais + municipais

### Poder Executivo
- Governador + Vice (chapa única, 4 anos)
- Sucessão: VG → Pres. CLDF → Pres. TJDFT

### PMDF / CBMDF (Art 21, XIV CF)
- **Organização/manutenção**: UNIÃO
- **Comando operacional**: Governador do DF
- Forças auxiliares e reserva do Exército

### TJDFT e MPDFT
- Organizados pela UNIÃO (Art 21, XIII CF)

### Tributos do DF
- Estaduais: ICMS, IPVA, ITCMD
- Municipais: IPTU, ITBI, ISS

### Pegadinhas AOCP
- DF é **sui generis** — NÃO é Estado nem Município
- PMDF é mantida pela UNIÃO (não pelo GDF)
- CLDF tem 24 deputados (NÃO confundir com Assembleias Legislativas)
- Sucessão Governador: VG → CLDF → TJDFT
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- LEGISLAÇÃO PMDF — Lei 7.289/84 (Estatuto dos Policiais Militares)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'legislacao-pmdf',
  'Lei nº 7.289/1984 (Estatuto dos Policiais Militares da PMDF)',
  'Estatuto dos Policiais Militares da PMDF (Lei 7.289/84)',
  $md$
# Estatuto dos Policiais Militares da PMDF (Lei 7.289/1984)

Lei FEDERAL que rege a carreira dos militares da PMDF. CRÍTICA pra prova. Cobra **postos/graduações**, **deveres/direitos**, **regime disciplinar** e **inatividade**.

## Estrutura Geral

A Lei 7.289/84 define:
- Hierarquia e disciplina
- Postos e graduações
- Direitos e deveres
- Estabilidade e inatividade
- Regime previdenciário

## Hierarquia e Disciplina (Art 6º a 9º)

### Conceitos Centrais
- **Hierarquia**: ordenação de autoridade em níveis (postos e graduações)
- **Disciplina**: rigorosa observância e acatamento das leis, regulamentos e ordens

> "A hierarquia e a disciplina são a base institucional da Polícia Militar."

## Postos e Graduações (Art 7º)

### Oficiais (de cima pra baixo)
**Oficiais Superiores**:
1. Coronel
2. Tenente-Coronel
3. Major

**Oficiais Intermediários**:
4. Capitão

**Oficiais Subalternos**:
5. 1º Tenente
6. 2º Tenente

### Praças (de cima pra baixo)
1. Aspirante a Oficial (Asp. Of.) — *transição entre oficial e praça*
2. Subtenente (Subten.)
3. 1º Sargento
4. 2º Sargento
5. 3º Sargento
6. Cabo
7. Soldado (de 1ª Classe e de 2ª Classe)

### Memorize a ESCALA HIERÁRQUICA completa (do mais alto ao mais baixo)
**CEL → TC → MAJ → CAP → 1T → 2T → ASP-OF → SUBTEN → 1S → 2S → 3S → CAB → SD**

## Subordinação e Antiguidade

### Antiguidade (Art 16)
- Maior posto/graduação = mais antigo
- Mesmo posto: maior tempo no posto = mais antigo
- Mesmo tempo no posto: precedência por tempo de serviço total

### Precedência hierárquica
- Determina o COMANDO em momento de necessidade
- Oficial mais antigo presente assume o comando

## Direitos do Policial Militar (Art 50+)

### Direitos pecuniários
- **Soldo** (vencimento)
- **Gratificações**: regime especial, tempo de serviço
- **Adicionais**: insalubridade, periculosidade (não compatíveis com soldo)

### Outros direitos
- **Pensão militar** para dependentes
- **Reforma** (aposentadoria militar)
- **Assistência médica** (CASSI/PMDF)
- **Promoção** por tempo, merecimento, escolha
- **Férias** anuais (30 dias)

## Deveres do Policial Militar (Art 35)

Memorize os essenciais:
- **PROBIDADE** funcional
- **LEALDADE** às instituições
- **HONRA PESSOAL** (conduta moral e profissional)
- **CULTO À VERDADE**
- **DISCIPLINA E HIERARQUIA**
- **ESPÍRITO DE CORPO**

### Manifestação política (vedações)
- PROIBIDO manifestar-se publicamente sobre questão política, salvo se candidato
- PROIBIDO frequentar associação proibida

## Estabilidade (Art 50)

- Praças de carreira: estabilidade após **10 anos** de efetivo serviço
- Oficiais: vitaliciedade (estabilidade integral)

## Situação dos Policiais Militares

### Atividade (Art 11)
- **Ativa**: em pleno exercício
- **Agregação**: afastado temporariamente (mantém vinculação)

### Inatividade (Art 13)
- **Reserva remunerada**: aposentadoria militar
- **Reforma**: situação definitiva (saúde, idade limite)

### Idades-limite (rotina)
- Soldado/Cabo: 50 anos
- Sargento: 52 anos
- Subten/Asp: 54 anos
- Capitão: 56 anos
- Major: 58 anos
- TC: 59 anos
- Coronel: 60 anos

## Promoção (Art 38)

### Critérios
1. **Antiguidade**: ordem cronológica
2. **Merecimento**: avaliação por desempenho
3. **Escolha**: competência discricionária do superior (postos altos)
4. **Bravura**: ato de coragem extraordinária
5. **Ressarcimento de preterição**: corrigir injustiça anterior
6. **Post-mortem**: morte em serviço

## Perda de Posto/Graduação (Art 117 CF + Estatuto)

- Sentença criminal **transitada em julgado** (pena privativa > 2 anos)
- Indignidade para o oficialato (declarada pelo tribunal militar)
- Conduta incompatível com a função

## Como cai na AOCP

**Item 1 (CERTO):** "Conforme a Lei nº 7.289/1984, a hierarquia e a disciplina são a base institucional da Polícia Militar do Distrito Federal."

**Item 2 (ERRADO):** "O Aspirante a Oficial é considerado oficial intermediário na hierarquia da PMDF."
> Errado: Aspirante a Oficial é GRADUAÇÃO de praça (transição), NÃO oficial intermediário.

**Item 3 (CERTO):** "A promoção por antiguidade leva em consideração a ordem cronológica de classificação dos militares no respectivo quadro."

**Item 4 (ERRADO):** "O policial militar adquire estabilidade após 5 anos de efetivo serviço."
> Errado: praças de carreira após **10 anos** (estatuto). Oficiais têm vitaliciedade.

## Estratégia
- Decore escala hierárquica COMPLETA (CEL → SD)
- Aspirante a Oficial é GRADUAÇÃO (não posto)
- Estabilidade da PRAÇA: 10 anos
- Lei 7.289/84 é FEDERAL (DF não pode alterar)
- Direitos: soldo, pensão militar, reforma, promoção, férias 30 dias
$md$,
  $resumo$
## Resumo — Lei 7.289/84 (Estatuto PMDF)

### Pilares Institucionais
- **Hierarquia** (postos/graduações)
- **Disciplina** (observância das normas)

### Hierarquia COMPLETA (decora!)
**Oficiais**:
- CEL → TC → MAJ → CAP → 1T → 2T

**Praças**:
- ASP-OF (transição) → SUBTEN → 1S → 2S → 3S → CAB → SD

### Antiguidade (Art 16)
1. Maior posto/graduação
2. Maior tempo no posto
3. Maior tempo de serviço total

### Direitos
- Soldo, gratificações, pensão militar, reforma, férias 30 dias
- Estabilidade praça: **10 anos**
- Oficiais: vitalícios

### Deveres (essenciais)
- Probidade, lealdade, honra pessoal
- Culto à verdade, disciplina, espírito de corpo
- Vedação manifestação política (salvo candidato)

### Promoção (6 critérios)
1. Antiguidade
2. Merecimento
3. Escolha
4. Bravura
5. Ressarcimento de preterição
6. Post-mortem

### Situação
- Ativa, agregação, reserva remunerada, reforma

### Pegadinhas AOCP
- Aspirante a Oficial = GRADUAÇÃO (praça), NÃO oficial intermediário
- Estabilidade praça = 10 anos (NÃO 3 nem 5)
- Lei 7.289/84 é FEDERAL (DF não altera)
- Promoção: 6 critérios (decora)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- LEGISLAÇÃO PMDF — Lei 12.086/2009
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'legislacao-pmdf',
  'Lei nº 12.086/2009 (Militares da PMDF e CBMDF)',
  'Lei 12.086/2009 — Militares da PMDF e CBMDF',
  $md$
# Lei 12.086/2009 — Militares da PMDF e CBMDF

Lei FEDERAL específica sobre direitos, deveres, promoções e estrutura dos militares da PMDF e CBMDF. Cobra **literalidade** em AOCP.

## Estrutura da Lei

A Lei 12.086/2009 trata especificamente da **estrutura, promoção e direitos** dos militares do DF. **Não revoga** a Lei 7.289/84 (Estatuto), mas a complementa.

## Quadros da PMDF (Art 2º)

### Oficiais
- **QOPM** — Quadro de Oficiais Policiais Militares (combatente)
- **QOECPM** — Quadro de Oficiais Especialistas (técnicos)
- **QOSPM** — Quadro de Oficiais de Saúde
- **QOCPM** — Quadro de Oficiais Capelães
- **QOMPM** — Quadro de Oficiais de Música

### Praças
- **QPPMC** — Quadro de Praças Policiais Militares Combatentes
- **QPPMM** — Quadro de Praças Policiais Militares Músicos
- **QPPMS** — Quadro de Praças Policiais Militares Especialistas

**Atenção**: o concurso Soldado PMDF é geralmente para o **QPPMC** (combatente). Cebraspe/AOCP cobra essa sigla com frequência.

## Promoção (Art 17 a 30)

### Critérios da Promoção
1. **Antiguidade**
2. **Merecimento**
3. **Escolha** (apenas postos de Cel)
4. **Bravura**
5. **Ressarcimento de preterição**
6. **Post-mortem**

### Tempo Mínimo no Posto
Para promoção ao posto seguinte (exemplos):
- 2º Ten → 1º Ten: **3 anos**
- 1º Ten → Cap: **4 anos**
- Cap → Maj: **4 anos**
- Maj → TC: **3 anos**
- TC → Cel: **2 anos**

### Promoção de Praças
- Cabo → 3º Sargento: por concurso interno
- 3º S → 2º S → 1º S: por antiguidade e merecimento
- Subten: critério especial (avaliação)

## Quadro de Acesso (Art 21)

- Quadro de Acesso por Antiguidade (QAA)
- Quadro de Acesso por Merecimento (QAM)
- Aprovação na avaliação de desempenho
- Curso obrigatório (CFO, CFS, etc.)

## Direitos Especiais

### Habite-se (Art 75)
- Direito do militar ao "habite-se" da residência funcional

### Saúde
- Assistência médico-hospitalar pra dependentes legalmente reconhecidos

### Pensão Militar (Art 50)
- Beneficiários: cônjuge, companheiro(a), filhos < 21 anos (ou inválidos), pais
- Pensão = 100% dos vencimentos

### Auxílio-Funeral (Art 81)
- Custeio das despesas funerárias do militar falecido

## Inatividade (Art 109+)

### Modalidades
- **Reserva Remunerada**: aposentadoria militar voluntária
  - Tempo de serviço: 30 anos
  - Idade-limite no posto
- **Reforma**: passagem definitiva à inatividade
  - Idade-limite
  - Incapacidade física
  - Sentença judicial

### Idades-Limite na Reserva (memorize)
- Coronel: 60 anos
- TC: 59 anos
- Major: 58 anos
- Capitão: 56 anos
- 1º Ten/2º Ten: 54 anos
- Asp Of: 54 anos
- Subten: 54 anos
- 1º S/2º S/3º S: 52 anos
- Cabo/Soldado: 50 anos

## Punições e Recursos (Art 113+)

### Punições
- Advertência
- Repreensão
- Detenção
- Prisão
- Licenciamento
- Exclusão a bem da disciplina (graves)

### Recursos
- Pedido de reconsideração
- Recurso ao superior hierárquico
- Habeas Corpus (em casos de privação de liberdade ilegal)

## CBMDF (Art 137+)

A Lei 12.086 também regula o Corpo de Bombeiros Militar do DF, com estrutura paralela à PMDF (postos, graduações, promoções, direitos).

## Como cai na AOCP

**Item 1 (CERTO):** "Conforme a Lei nº 12.086/2009, o Quadro de Praças Policiais Militares Combatentes (QPPMC) é o quadro destinado aos militares responsáveis pelo policiamento ostensivo."

**Item 2 (ERRADO):** "O tempo mínimo de permanência no posto de 2º Tenente para promoção a 1º Tenente é de 4 anos."
> Errado: **3 anos** para essa transição específica.

**Item 3 (CERTO):** "A pensão militar é devida aos dependentes do militar falecido, sendo equivalente a 100% dos vencimentos."

**Item 4 (ERRADO):** "A reserva remunerada do Coronel ocorre aos 65 anos de idade-limite."
> Errado: **60 anos** para Coronel.

## Estratégia
- Decore os Quadros (QOPM, QOECPM, QPPMC...)
- Concurso Soldado PMDF = QPPMC
- Pensão militar = 100% dos vencimentos
- Idades-limite: Cel 60, Sd 50 (mais baixas)
- Punições da lei: Adv → Rep → Det → Prisão → Licenc → Exclusão
$md$,
  $resumo$
## Resumo — Lei 12.086/2009

### Quadros da PMDF
**Oficiais**: QOPM (combatente), QOECPM (especialistas), QOSPM (saúde), QOCPM (capelães), QOMPM (música)

**Praças**: QPPMC (combatentes — concurso Soldado), QPPMM (músicos), QPPMS (especialistas)

### Promoção (6 critérios)
- Antiguidade, Merecimento, Escolha (Cel), Bravura, Ressarcimento, Post-mortem

### Tempo Mínimo no Posto
- 2T → 1T: 3 anos
- 1T → Cap: 4 anos
- Cap → Maj: 4 anos
- Maj → TC: 3 anos
- TC → Cel: 2 anos

### Direitos
- **Habite-se** (residência funcional)
- Assistência médica
- **Pensão militar = 100% vencimentos**
- Auxílio-funeral

### Reserva Remunerada / Reforma
- 30 anos de serviço OU idade-limite
- Cel: 60a / TC: 59a / Maj: 58a / Cap: 56a / 1-2T/Asp/Subten: 54a / Sgt: 52a / Cb/Sd: 50a

### Punições (Art 113+)
1. Advertência
2. Repreensão
3. Detenção
4. Prisão
5. Licenciamento
6. Exclusão a bem da disciplina

### Pegadinhas AOCP
- Concurso Soldado PMDF = QPPMC (NÃO QOPM)
- Tempo 2T→1T = 3 anos (NÃO 4)
- Pensão militar = **100%** (NÃO 70%)
- Idade Cel = 60 anos (NÃO 65)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL MILITAR — Aplicação do CPM (Art 9 + Lei 13.491/17)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal-militar',
  'Aplicação da Lei Penal Militar (Art 1º a 11)',
  'Aplicação do CPM e Lei 13.491/17',
  $md$
# Aplicação do CPM e a Lei 13.491/2017

A aplicação do Código Penal Militar (CPM) sofreu **alteração drástica** com a Lei 13.491/2017. Cebraspe/AOCP cobra muito a distinção entre **crime militar próprio × impróprio** e a **expansão de competência** da Justiça Militar.

## Estrutura do CPM (DL 1.001/69)

- Lei militar = **Código Penal Militar** (DL 1.001/1969)
- Regula crimes militares (em tempo de paz e guerra)
- Aplica-se aos militares das Forças Armadas E **militares estaduais** (PMs, CBMs)

## Art 9º — CRIME MILITAR EM TEMPO DE PAZ

> Consideram-se crimes militares, em tempo de paz, os crimes:

### I — Próprios (só militares cometem)
- Previstos no CPM **com igual definição na lei penal comum (NÃO existe)** — caso impossível
- Hipóteses: deserção, abandono de posto, motim, violência contra superior, etc.

### II — Impróprios (com igual definição na lei penal comum)
**Alteração CRÍTICA da Lei 13.491/2017** ampliou:
> "Os crimes previstos NESTE CÓDIGO E OS PREVISTOS NA LEGISLAÇÃO PENAL, quando praticados:"
> a) por militar em situação de atividade ou assemelhado, contra militar nas mesmas condições;
> b) por militar em situação de atividade, em lugar sujeito à administração militar;
> c) por militar em serviço ou atuando em razão da função;
> d) por militar durante o período de manobras ou exercício;
> e) por militar em situação de atividade ou assemelhado, contra patrimônio sob administração militar.

### Mudança Histórica
Antes da Lei 13.491/17:
- Só CPM definia crime militar
- Crime comum (CP) praticado por militar em serviço era de Justiça Comum

Após a Lei 13.491/17:
- **CPM + Legislação Penal Comum** podem definir crime militar
- Crime comum (homicídio, roubo, etc.) praticado por militar em serviço pode ser **competência da Justiça Militar**
- Aumentou MUITO o âmbito da Justiça Militar

### Exceção CRÍTICA — Crimes Dolosos contra a Vida
- **Crimes dolosos contra a vida**, praticados por militar das **Forças Armadas** contra civil, são da JUSTIÇA MILITAR (alteração Lei 13.491/17)
- Para militares **estaduais (PMs/PMDFs)**, o crime doloso contra a vida de CIVIL permanece da JUSTIÇA COMUM (Tribunal do Júri)

## Art 1º — Princípio da Legalidade Militar

> "Não há crime sem lei anterior que o defina."
> Idêntico ao Art 1º CP — segue o princípio da legalidade.

## Art 2º — Lei Penal Militar no Tempo

### Teoria adotada
- **TEORIA DA ATIVIDADE** (Art 5º CPM)
- Tempo do crime = momento da ação ou omissão (não do resultado)

### Irretroatividade
- Lei penal militar **não retroage**, salvo para beneficiar o réu

## Art 6º — Conceito de Militar

> "São militares da União: as Forças Armadas (Marinha, Exército, Aeronáutica)."
> "São militares dos Estados, DF e Territórios: as Polícias Militares e Corpos de Bombeiros Militares."

## Art 11 — Equiparação a Militar

Equiparam-se a militares para fins de aplicação do CPM:
- Os assemelhados
- Os reservistas em serviço
- Os mobilizados

## Princípios Gerais

### Pessoalidade da Pena
- Pena não passa da pessoa do condenado

### Individualização da Pena
- Pena aplicada conforme circunstâncias do crime e do agente

### Proporcionalidade
- Pena proporcional à gravidade do crime

### Humanidade
- Vedação de penas cruéis (CF Art 5º, XLVII)

## Como cai na Cebraspe/AOCP

**Item 1 (CERTO):** "Após a Lei 13.491/2017, os crimes previstos na legislação penal comum, quando praticados por militar em situação de atividade contra patrimônio sob administração militar, são considerados crimes militares."

**Item 2 (ERRADO):** "O crime doloso contra a vida de civil praticado por militar estadual em serviço é da competência da Justiça Militar."
> Errado: militar **estadual** → JUSTIÇA COMUM (Tribunal do Júri).
> Militar das **Forças Armadas** → Justiça Militar (alteração Lei 13.491/17).

**Item 3 (CERTO):** "O Código Penal Militar adota a teoria da atividade para definir o tempo do crime militar."

**Item 4 (ERRADO):** "A Lei 13.491/2017 reduziu o âmbito de aplicação do CPM, restringindo a competência da Justiça Militar."
> Errado: AMPLIOU o âmbito do CPM.

## Estratégia
- Decore o Art 9º CPM com a alteração da Lei 13.491/17
- Crime militar **próprio** (só CPM) × **impróprio** (CPM + comum)
- Doloso contra vida: civil × militar das FA = JM; militar estadual = JC
- Tempo do crime: TEORIA DA ATIVIDADE (igual CP)
- Militares estaduais = PM/CBM (não FA)
$md$,
  $resumo$
## Resumo — Aplicação do CPM

### CPM
- **DL 1.001/1969**
- Aplica-se a militares das FA + militares estaduais (PMs, CBMs)

### Art 9 CPM — Crime Militar em Tempo de Paz
- **Próprio**: só militar comete (CPM definição específica)
  - Ex: deserção, abandono de posto, motim
- **Impróprio**: CPM **ou legislação penal comum** + situação militar

### Lei 13.491/2017 — Alteração CRÍTICA
- AMPLIOU o âmbito do CPM
- Crime do CP comum + situação militar = pode ser crime militar
- Aumentou competência da Justiça Militar

### Crime Doloso contra a Vida
- Militar **Forças Armadas** vs civil = **JUSTIÇA MILITAR** (após L13.491/17)
- Militar **ESTADUAL** (PM/CBM) vs civil = **JUSTIÇA COMUM** (Júri)

### Tempo do Crime (Art 5 CPM)
- **TEORIA DA ATIVIDADE** (momento da ação/omissão)
- Igual ao Art 4º CP

### Conceito de Militar (Art 6)
- **União**: FA (Marinha, Exército, Aeronáutica)
- **Estados/DF**: PMs e CBMs

### Pegadinhas Cebraspe/AOCP
- Lei 13.491/17 **AMPLIOU** (NÃO reduziu) o CPM
- Doloso contra vida civil: FA = JM; PM = JC (Júri)
- Próprio só CPM; Impróprio = CPM ou comum
- Teoria da ATIVIDADE (NÃO resultado)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PENAL MILITAR — Crimes em Tempo de Paz (aprofundamento)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-penal-militar',
  'Crimes Militares em Tempo de Paz: violência contra superior, deserção, desrespeito',
  'Crimes Militares em Tempo de Paz',
  $md$
# Crimes Militares em Tempo de Paz

Bloco específico do CPM — diferenças importantes pro CP comum. Cebraspe/AOCP cobra **tipificações próprias**, **penas** e **distinções**.

## Estrutura do CPM (Parte Especial)

Os crimes militares em tempo de paz se dividem em **Livros**:
- Livro I — Crimes Militares em Tempo de Paz
- Livro II — Crimes Militares em Tempo de Guerra

### Capítulos do Livro I (crimes contra...)
1. Disciplina e Hierarquia
2. Pessoa
3. Patrimônio
4. Administração Militar
5. Honra
6. Saúde
7. Fé Pública

## Crimes contra a Hierarquia e Disciplina

### Motim (Art 149 CPM)
> "Reunirem-se militares ou assemelhados em número de 4 ou mais, com armas, agindo contra ordem recebida de superior, ou negando-se a cumpri-la."
> Pena: reclusão 4 a 8 anos.

### Revolta (Art 149 CPM)
> Quando a reunião militar for armada e dirigida contra autoridade superior.
> Pena: reclusão 8 a 20 anos.

### Conspiração (Art 152 CPM)
> Concertarem-se militares pra praticar crimes contra a disciplina.
> Pena: reclusão 3 a 5 anos.

### Aliciação para Motim ou Revolta (Art 154 CPM)
> Aliciar militares pra essas práticas.

### Incitamento (Art 155 CPM)
> Incitar militar à desobediência, indisciplina ou prática de crime militar.

## Violência Contra Superior (Art 157 CPM)

> "Praticar violência contra superior."
> Pena: detenção 3 meses a 2 anos.

### Forma Qualificada
- Lesão corporal grave: reclusão 3 a 15 anos
- Resultado morte: reclusão 12 a 30 anos

### Pegadinha Cebraspe
- Crime PRÓPRIO de militar
- Violência contra superior é considerada GRAVE pela quebra da hierarquia
- Distinção: ameaça (Art 158) tem pena MENOR

## Desrespeito a Superior (Art 160 CPM)
> Desrespeitar superior diante de outro militar.
> Pena: detenção 3 meses a 1 ano.

## Crimes contra o Dever Militar

### Deserção (Art 187 CPM)

> "Ausentar-se o militar, sem licença, da unidade em que serve, ou do lugar em que deve permanecer, por mais de **8 dias**."
> Pena: detenção 6 meses a 2 anos (oficial: 1-3 anos).

### Características CRÍTICAS
- **Prazo de tolerância**: 8 dias completos
- Antes dos 8 dias: **falta administrativa** (não crime)
- Após 8 dias: configurado o crime
- CRIME PRÓPRIO de militar

### Súmula 4 do STM
- Deserção é instantânea (consuma-se ao 9º dia)

### Modalidades
- **Simples**: caput
- **Privilegiada** (Art 191): em razão de razões particulares justificadas
- **Qualificada**: em manobras ou em fronteiras

### Abandono de Posto (Art 195 CPM)
> "Abandonar, sem ordem superior, o posto ou lugar de serviço."
> Pena: detenção 3 meses a 1 ano.

## Crimes contra o Patrimônio (com administração militar)

### Furto (Art 240 CPM)
> Mesmas hipóteses do CP, mas em lugar sujeito à administração militar.
> Pena: detenção 6 meses a 6 anos.

### Furto Privilegiado (§1º)
- Primário + pequeno valor

### Roubo (Art 242 CPM)
> Igual ao CP, com pena 4-15 anos (militar).

## Outras Distinções Importantes

### Insubordinação (Art 163 CPM)
> Recusa, omissão ou retardamento em cumprir ordem do superior.
> Pena: detenção 4 meses a 1 ano.

### Recusa de Obediência (Art 164 CPM)
- Recusa ostensiva diante da tropa
- Pena maior que insubordinação

### Embriaguez em Serviço (Art 202 CPM)
> Embriagar-se em serviço ou apresentar-se embriagado para a prestação dele.
> Pena: detenção 6 meses a 2 anos.

## Como cai na AOCP

**Item 1 (CERTO):** "Configura-se o crime de deserção quando o militar se ausentar, sem licença, por período superior a oito dias, contados de forma contínua."

**Item 2 (ERRADO):** "A violência praticada por militar contra superior, sem resultar em lesão grave, configura crime de insubordinação."
> Errado: configura **violência contra superior** (Art 157 CPM), tipo específico.

**Item 3 (CERTO):** "O crime de motim militar exige a reunião de pelo menos quatro militares armados, agindo contra ordem superior."

**Item 4 (ERRADO):** "O abandono de posto militar tem como elemento essencial a permanência ausente do local de serviço por prazo superior a oito dias."
> Errado: 8 dias é deserção. Abandono de posto NÃO exige esse prazo — é abandonar sem ordem.

## Estratégia
- Deserção: 8 dias + 1 (consuma 9º dia)
- Motim: 4+ militares armados contra ordem
- Crimes contra hierarquia: PRÓPRIOS de militar
- Violência contra superior = tipo específico (Art 157)
- Patrimônio militar: Art 240+ CPM
$md$,
  $resumo$
## Resumo — Crimes em Tempo de Paz (CPM)

### Crimes contra Hierarquia e Disciplina

#### Motim (Art 149)
- **4+ militares armados**
- Agindo contra ordem superior
- Reclusão 4-8 anos

#### Revolta (Art 149)
- Reunião armada DIRIGIDA contra autoridade
- Reclusão 8-20 anos

#### Violência contra Superior (Art 157)
- Detenção 3m-2a
- Qualificada: lesão grave 3-15a / morte 12-30a

#### Desrespeito a Superior (Art 160)
- Detenção 3m-1a

### Deserção (Art 187) ★ CRÍTICO
- Ausência **+8 dias** sem licença
- Consuma no 9º dia (Súmula 4 STM)
- Detenção 6m-2a (oficial: 1-3a)
- CRIME PRÓPRIO de militar

### Abandono de Posto (Art 195)
- Abandonar SEM ordem (sem prazo mínimo)
- Detenção 3m-1a

### Insubordinação (Art 163)
- Recusa/omissão de ordem
- Detenção 4m-1a

### Embriaguez em Serviço (Art 202)
- Detenção 6m-2a

### Crimes Patrimoniais (Art 240+)
- Furto, roubo etc. em lugar sob admin militar

### Pegadinhas AOCP
- Deserção: 8 dias COMPLETOS (consuma 9º)
- Abandono ≠ Deserção (sem prazo × com prazo)
- Motim: 4+ ARMADOS contra ordem
- Violência contra superior é tipo PRÓPRIO (Art 157)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- PROC PENAL MILITAR — IPM (Inquérito Policial Militar)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direito-processual-penal-militar',
  'Inquérito Policial Militar (IPM)',
  'Inquérito Policial Militar (IPM)',
  $md$
# Inquérito Policial Militar (IPM)

O IPM é o procedimento administrativo investigatório no âmbito da Justiça Militar. CRÍTICO pra PMDF (e demais PMs). Cobra **autoridade competente**, **prazos**, **encerramento**.

## Base Normativa
- **Código de Processo Penal Militar** (CPPM — DL 1.002/1969)
- Art 8º CPPM em diante

## Natureza Jurídica
- Procedimento ADMINISTRATIVO
- INQUISITIVO (sem contraditório obrigatório)
- INDISPONÍVEL (uma vez instaurado, não se arquiva sem autoridade competente)
- ESCRITO e SIGILOSO

### Comparação IPM × IP Comum
- IPM: regulado pelo CPPM (DL 1.002/69)
- IP comum: regulado pelo CPP (DL 3.689/41)
- Mesmas características gerais (inquisitivo, sigiloso, administrativo)
- Diferenças: autoridade, prazos, atribuição

## Autoridade Competente (Art 7º CPPM)

> A autoridade competente para presidir o IPM é OFICIAL designado pela autoridade militar superior.

### Encarregado do IPM
- OFICIAL designado especialmente
- Geralmente mais ANTIGO que o investigado (regra de hierarquia)
- Pode ser de outra OM (Organização Militar) se necessário

### Auxiliares
- Escrivão (militar designado)
- Outros militares auxiliares

## Início do IPM (Art 9º CPPM)

### Modalidades
1. **De ofício** pela autoridade militar
2. **Por ordem superior**
3. **Por requisição do MP Militar**
4. **A requerimento da vítima ou parte interessada**
5. **Por delação**

### Distinção pro IP comum
- Polícia comum pode iniciar IP por requisição do JUIZ
- IPM **NÃO** se inicia por requisição do juiz militar (só do MP)

## Prazo do IPM (Art 20 CPPM)

### Réu PRESO: 20 dias
- **Improrrogáveis** (regra)
- Em casos excepcionais, prorrogação por mais 20 dias
- Total: até 40 dias

### Réu SOLTO: 40 dias
- Prorrogáveis por igual período
- Total: até 80 dias

### Diferença com IP comum
| | IPM | IP Comum |
|---|---|---|
| Preso | 20+20 dias | 10 dias |
| Solto | 40+40 dias | 30 dias |

**Decoreba pra Cebraspe**: prazos do IPM são MAIS LONGOS que do IP comum.

## Diligências (Art 12 CPPM)

A autoridade encarregada pode:
- Realizar exames (corpo de delito, periciais)
- Ouvir testemunhas, vítima, indiciado
- Reconstituição do fato
- Acareação
- Reconhecimento
- Apreensão de objetos

## Indiciamento

- Ato formal pelo qual o encarregado considera alguém SUSPEITO suficiente
- Atribuição do ENCARREGADO do IPM
- Distinção: oficial encarregado decide; NÃO compete ao juiz nem MP

## Encerramento (Art 21 CPPM)

### Procedimento
1. Encarregado conclui o IPM
2. **Solução** (relatório com conclusões)
3. Envio à autoridade militar SUPERIOR
4. Esta decide:
   - **Acolher** e enviar à Justiça Militar
   - **Devolver** para diligências adicionais
   - **Arquivar** (em casos excepcionais)

### Atribuições do Conselho de Justiça
- Após recebimento, o Conselho de Justiça da JM analisa
- Pode determinar diligências complementares

## Justiça Militar — Estrutura

### Federal (Forças Armadas)
- **STM** — Superior Tribunal Militar
- **Auditorias Militares** (1ª instância)

### Estadual (PMs e CBMs)
- **Tribunal de Justiça Militar** (TJM) — onde exista (SP, RS, MG)
- Nos demais Estados/DF: TJ comum tem Auditoria/Vara Especializada
- **No DF**: **TJDFT** julga crimes militares dos PMs/CBMs do DF

## Sentença

### Conselho de Justiça
- Composto por 1 juiz togado + 4 oficiais (escabinato)
- Decisão por maioria

## Princípios Aplicáveis

- **Contraditório**: aplicado a partir do processo (não no IPM)
- **Ampla Defesa**: garantida no processo
- **Devido Processo Legal** (Art 5º LIV CF)
- **Presunção de Inocência** (Art 5º LVII CF)

## Como cai na Cebraspe/AOCP

**Item 1 (CERTO):** "O Inquérito Policial Militar é presidido por oficial designado pela autoridade militar competente, devendo ser mais antigo que o investigado."

**Item 2 (ERRADO):** "O prazo para conclusão do IPM com indiciado preso é de 10 dias, prorrogáveis por igual período."
> Errado: **20 dias**, eventualmente prorrogáveis (IPM tem prazos MAIORES).

**Item 3 (CERTO):** "No Distrito Federal, o julgamento dos crimes militares praticados por policiais militares compete ao Tribunal de Justiça do DF e Territórios."

**Item 4 (ERRADO):** "O Inquérito Policial Militar pode ser iniciado mediante requisição do juiz da Auditoria Militar."
> Errado: pode ser iniciado de ofício, por requisição do MPM, ou outras hipóteses, mas NÃO por requisição do juiz (diferente do IP comum).

## Estratégia
- Decore prazos IPM: preso 20 dias / solto 40 dias (MAIORES que IP comum)
- Encarregado: OFICIAL designado, mais antigo
- Não cabe contraditório no IPM (igual IP comum)
- Justiça Militar Estadual: TJM (SP/RS/MG) ou TJDFT (DF) ou TJ comum (demais)
- Conselho de Justiça: 1 togado + 4 oficiais (escabinato)
$md$,
  $resumo$
## Resumo — IPM (Inquérito Policial Militar)

### Base
- **CPPM** (DL 1.002/1969)
- Procedimento administrativo, inquisitivo, sigiloso, escrito

### Encarregado
- **OFICIAL** designado pela autoridade militar
- Mais ANTIGO que o investigado (regra)
- Auxiliares: escrivão, militares designados

### Início (Art 9 CPPM)
- De ofício, ordem superior, requisição MPM, requerimento vítima, delação
- **NÃO** por requisição do JUIZ (diferente IP comum)

### Prazos (Art 20)
| | IPM | IP Comum |
|---|---|---|
| Preso | **20 dias** (+20 exc.) | 10 dias |
| Solto | **40 dias** (+40) | 30 dias |

### Indiciamento
- Atribuição do ENCARREGADO do IPM

### Encerramento
1. Relatório (solução)
2. Envio à autoridade militar superior
3. Esta acolhe, devolve ou arquiva

### Justiça Militar
- Federal: STM + Auditorias
- Estadual: TJM (SP/RS/MG), TJDFT (DF), TJ comum (demais)
- **Conselho de Justiça**: 1 togado + 4 oficiais (escabinato)

### Pegadinhas Cebraspe/AOCP
- IPM preso: **20** dias (NÃO 10)
- IPM solto: **40** dias (NÃO 30)
- Encarregado = OFICIAL (NÃO civil)
- Juiz NÃO pode requisitar IPM
- DF: TJDFT julga crimes militares (NÃO TJM separado)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação
-- ──────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_materiais_ai FROM "materials" WHERE origin = 'ai';

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
