-- ════════════════════════════════════════════════════════════════════════════
-- GRANULAR ADM — Batch 2 (7 materiais focados)
-- Data: 2026-06-07
--
-- Continua cobertura de Direito Administrativo — topics específicos visíveis
-- no painel do PF Delegado. Cada material focado (~1500-2000 palavras).
--
-- IDEMPOTENTE.
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
  ON CONFLICT ("materialId") DO UPDATE SET resumo = p_resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ┌─ 1. Regime jurídico-administrativo e princípios ─────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Regime jurídico-administrativo e princípios',
  'Regime Jurídico-Administrativo',
$content$
# Regime Jurídico-Administrativo

## 1. Conceito

**Regime Jurídico-Administrativo** é o conjunto de regras e princípios próprios do Direito Administrativo, que confere ao Estado um conjunto de **prerrogativas** (poderes excepcionais) e **sujeições** (limitações) diferenciadas do regime jurídico do particular.

## 2. Pilares (Binômio fundamental — Celso Antônio Bandeira de Mello)

### 2.1. Supremacia do Interesse Público sobre o Privado
- O interesse coletivo prevalece sobre o individual.
- Justifica as **prerrogativas** (poder expropriatório, poder de polícia, autotutela, autoexecutoriedade).
- **Não é absoluta**: limites constitucionais (direitos fundamentais) e ponderação.

### 2.2. Indisponibilidade do Interesse Público
- O administrador NÃO pode dispor do interesse público.
- Justifica as **sujeições** (licitação, concurso público, motivação, controle).
- O agente é mero gestor do interesse coletivo.

## 3. Prerrogativas (Poderes excepcionais)

- **Autotutela**: anular/revogar próprios atos (Súmulas 346 e 473 STF).
- **Autoexecutoriedade**: executar decisão sem prévia autorização judicial.
- **Poder Expropriatório**: desapropriação por interesse público.
- **Poder de Polícia**: limitar liberdades individuais em prol do coletivo.
- **Cláusulas Exorbitantes**: modificação unilateral, rescisão unilateral.
- **Presunção de Legitimidade** dos atos administrativos.

## 4. Sujeições (Limitações)

- **Princípio da Legalidade** (CF 37): só age conforme a lei.
- **Concurso Público** (CF 37 II): provimento de cargos efetivos.
- **Licitação** (CF 37 XXI): contratações.
- **Motivação**: justificar decisões.
- **Controle**: interno (Adm) + externo (TCU/TCE/Congresso) + judicial.
- **Publicidade**: transparência como regra.
- **Prestação de Contas**: a quem administra recursos públicos.

## 5. Princípios Constitucionais Expressos (CF 37 caput) — LIMPE

- **L**egalidade
- **I**mpessoalidade
- **M**oralidade
- **P**ublicidade
- **E**ficiência (EC 19/98)

## 6. Princípios Implícitos

### 6.1. Razoabilidade e Proporcionalidade
- Limita o exercício do poder.
- Proporcionalidade: adequação + necessidade + proporcionalidade em sentido estrito.

### 6.2. Motivação
- Toda decisão deve ser fundamentada (Lei 9.784 art. 50).

### 6.3. Segurança Jurídica
- Proteção da confiança legítima.
- Decadência (5 anos — art. 54 Lei 9.784) para atos beneficiando administrado.

### 6.4. Continuidade
- Serviços públicos não podem ser interrompidos arbitrariamente.

### 6.5. Autotutela
- Adm anula seus atos ilegais e revoga os inconvenientes.

### 6.6. Especialidade
- Entidades da Indireta limitadas à finalidade da lei que as criou.

### 6.7. Presunção de Legitimidade
- Atos administrativos presumem-se legítimos (relativa).

## 7. Conflitos entre Princípios

Quando há conflito (ex: publicidade x privacidade), aplica-se **ponderação** com base na razoabilidade e proporcionalidade.

## 8. Aplicação Prática

O regime jurídico-administrativo se aplica:
- À Administração DIRETA (sempre).
- À Indireta de DIREITO PÚBLICO (autarquias, fundações públicas) — sempre.
- Às EP e SEM em SERVIÇO PÚBLICO — em regra, com alguns ajustes.
- Às EP e SEM em ATIVIDADE ECONÔMICA (concorrência) — só onde a lei expressamente impõe (CF 173 §1º).

## 9. Como Cebraspe cobra

- **C/E**: "Supremacia do interesse público é princípio absoluto" → **ERRADO** (tem limites constitucionais).
- **C/E**: "Adm dispõe do interesse público quando há autorização administrativa" → **ERRADO** (indisponibilidade — só lei autoriza).
- **C/E**: "Cláusulas exorbitantes são limitações da Adm" → **ERRADO** (prerrogativas).
- **C/E**: "O princípio da motivação é facultativo" → **ERRADO** (obrigatório — Lei 9.784).
- **C/E**: "Atos administrativos têm presunção absoluta de legitimidade" → **ERRADO** (relativa).
$content$,
$resumo$
# Resumo — Regime Jurídico-Administrativo

## Binômio fundamental
- **Supremacia do interesse público** → prerrogativas.
- **Indisponibilidade do interesse público** → sujeições.

## Prerrogativas (Estado)
Autotutela, autoexecutoriedade, poder expropriatório, polícia, cláusulas exorbitantes, presunção de legitimidade.

## Sujeições (Estado)
Legalidade, concurso, licitação, motivação, controle, publicidade, prestação de contas.

## Princípios CF 37 — LIMPE
Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência.

## Implícitos
Razoabilidade, proporcionalidade, motivação, segurança jurídica, continuidade, autotutela (Súmulas 346 e 473), especialidade.

## Top pegadinhas
1. Supremacia NÃO é absoluta.
2. Cláusulas exorbitantes = PRERROGATIVAS (não limites).
3. Motivação é OBRIGATÓRIA.
4. Presunção legitimidade é RELATIVA.
$resumo$
);

-- ┌─ 2. Órgão público: conceito e classificação ─────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Órgão público: conceito e classificação',
  'Órgão Público — Conceito e Classificação',
$content$
# Órgão Público — Conceito e Classificação

## 1. Conceito

**Órgão público** é o **centro de competências** dentro de uma pessoa jurídica de direito público, **destituído de personalidade jurídica própria**, integrado por agentes que exercem atribuições determinadas.

⚠️ **Pegadinha clássica**: órgão NÃO tem personalidade jurídica própria. Quem tem é a PJ a que ele pertence.

## 2. Teorias sobre a relação Estado-Agente

### 2.1. Teoria do Mandato (superada)
- Agente seria mandatário do Estado.
- Falha: Estado não tem capacidade jurídica para outorgar mandato.

### 2.2. Teoria da Representação (superada)
- Agente seria representante legal do Estado (como um tutor).
- Falha: Estado seria incapaz, o que é inadequado.

### 2.3. Teoria do Órgão / Imputação Volitiva (ADOTADA — Otto Gierke)
- Os atos do agente são **diretamente imputados** à PJ.
- Não há "vínculo entre dois sujeitos" — o agente é parte integrante do órgão, e o órgão da PJ.

## 3. Características dos Órgãos

- **Sem personalidade jurídica**.
- Integram uma PJ (que tem personalidade).
- **Patrimônio** pertence à PJ, não ao órgão.
- Podem ter **capacidade processual** (em alguns casos) — para defender suas atribuições.

## 4. Classificação dos Órgãos

### 4.1. Quanto à posição estatal
- **Independentes**: previstos na CF, sem subordinação hierárquica. Ex: Presidência, Congresso, STF, Tribunais.
- **Autônomos**: alta hierarquia, com autonomia administrativa e financeira. Ex: Ministérios, Secretarias.
- **Superiores**: direção e comando, sem autonomia plena. Ex: Departamentos, Coordenações.
- **Subalternos**: execução. Ex: setor administrativo, divisão de protocolo.

### 4.2. Quanto à estrutura
- **Simples (unitários)**: só uma esfera de competência. Ex: Presidência da República.
- **Compostos**: agregam várias unidades menores. Ex: Ministério da Justiça (com Secretarias, Departamentos).

### 4.3. Quanto à atuação funcional
- **Singulares (unipessoais)**: decisão por uma só pessoa. Ex: Presidência, Diretoria.
- **Colegiados**: decisão por colegiado. Ex: Tribunais, Conselhos.

### 4.4. Quanto à esfera de competência
- **Centrais**: jurisdição em todo o território. Ex: Ministério da Saúde.
- **Regionais**: jurisdição em parte do território. Ex: Superintendência da PF em SP.

## 5. Distinção: Órgão x Entidade

| | Órgão | Entidade |
|---|---|---|
| Personalidade jurídica | NÃO | SIM |
| Hierarquia | Subordinação | Vinculação |
| Exemplo | Ministério, Secretaria | Autarquia, EP, SEM |

## 6. Capacidade Processual do Órgão

**Regra**: órgão não tem capacidade processual (pertence à PJ).

**Exceção**: quando há **interesse público específico** e a defesa de prerrogativa do órgão (ex: Câmara Municipal pode ajuizar MS para defender prerrogativa). Reconhecida pelo STF e doutrina.

## 7. Criação e Extinção de Órgãos

- **Criação**: somente por **LEI** (CF 48 XI).
- **Extinção**: também por lei.
- **Organização interna**: pode ser por decreto (CF 84 VI — decreto autônomo após EC 32/01), desde que não aumente despesa.

## 8. Como Cebraspe cobra

- **C/E**: "Órgão público tem personalidade jurídica própria" → **ERRADO** (não tem; PJ é que tem).
- **C/E**: "Teoria do Mandato é a adotada no Brasil" → **ERRADO** (Teoria do Órgão / Imputação).
- **C/E**: "Ministério é órgão da Adm Indireta" → **ERRADO** (Direta).
- **C/E**: "Órgão sempre pode ajuizar ação em nome próprio" → **ERRADO** (regra: não; exceção: prerrogativa).
- **C/E**: "A criação de órgão pode ser por decreto" → **ERRADO** (lei; reorganização sem aumento de despesa pode).
- **C/E**: "Um Ministério é órgão simples" → **ERRADO** (composto — tem várias unidades).
$content$,
$resumo$
# Resumo — Órgão Público

## Conceito
Centro de competências SEM personalidade jurídica própria. Integra uma PJ.

## Teoria adotada
**Imputação volitiva (Otto Gierke)**: atos do agente imputados diretamente à PJ.

## Classificação

### Posição estatal
- Independentes (CF — STF, Presidência, Congresso).
- Autônomos (Ministérios).
- Superiores (Departamentos).
- Subalternos (execução).

### Estrutura
- Simples (uma esfera).
- Compostos (vários sub-órgãos).

### Atuação
- Singulares (unipessoais).
- Colegiados.

### Esfera
- Centrais (todo território).
- Regionais.

## Órgão x Entidade

| | Órgão | Entidade |
|---|---|---|
| Personalidade | NÃO | SIM |
| Vínculo | Hierarquia | Vinculação (tutela) |

## Capacidade processual
- Regra: não tem.
- Exceção: prerrogativa institucional.

## Criação/Extinção
- Por LEI (CF 48 XI).
- Organização interna pode ser por decreto autônomo (EC 32/01).

## Top pegadinhas
1. Órgão SEM personalidade jurídica.
2. Teoria adotada = IMPUTAÇÃO VOLITIVA.
3. Ministério = Adm DIRETA (não indireta).
4. Criação por LEI.
5. STF, Presidência = INDEPENDENTES.
$resumo$
);

-- ┌─ 3. Fato e ato administrativo ───────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Fato e ato administrativo',
  'Fato e Ato Administrativo',
$content$
# Fato e Ato Administrativo

## 1. Distinção Fundamental

### 1.1. Fato Administrativo
- Acontecimento da vida que produz efeitos jurídicos no âmbito do Direito Administrativo.
- **Independe de manifestação de vontade**.
- Exemplo: morte de servidor, decurso do prazo, deslizamento que destrói obra pública.

### 1.2. Ato Administrativo
- Manifestação **UNILATERAL** da Administração que produz efeitos jurídicos imediatos.
- **Depende de manifestação de vontade**.
- Exemplo: nomeação, demissão, concessão de licença, multa.

## 2. Características do Ato Administrativo

- **Manifestação unilateral**: difere do contrato (bilateral).
- **Sob regime de direito público**: prerrogativas + sujeições.
- **Produz efeitos imediatos**: ao contrário de regulamentos.
- **Provém da Administração**: ou de quem detém função pública.

## 3. Elementos/Requisitos (Lei 4.717/65)

5 elementos essenciais para a validade do ato administrativo:

### 3.1. Competência
- Atribuição legal de exercer a função.
- Improrrogável (não se altera pela vontade).
- Irrenunciável.
- Pode ser DELEGADA ou AVOCADA (Lei 9.784 art. 12 e 15).
- VEDADA delegação: edição de atos normativos, decisão de recursos administrativos, matérias de competência exclusiva (art. 13).

### 3.2. Finalidade
- Interesse público + finalidade específica prevista em lei.
- Vício na finalidade = **desvio de poder** ou **desvio de finalidade**.

### 3.3. Forma
- Modo de exteriorização do ato.
- Regra: ESCRITA.
- Exceções: orais (semáforo, gestos), por sinais (apito de policial).

### 3.4. Motivo
- Situação de fato ou de direito que **autoriza ou determina** a prática do ato.
- Distinto de **motivação** (que é a EXPRESSÃO escrita do motivo).
- **Teoria dos Motivos Determinantes**: o motivo declarado vincula a Administração. Se for falso, o ato é nulo.

### 3.5. Objeto
- Conteúdo do ato — o que o ato dispõe.
- Deve ser: lícito, possível, determinado, moral.

## 4. Atributos do Ato Administrativo

### 4.1. Presunção de Legitimidade e Veracidade
- **Presunção iuris tantum** (relativa — admite prova em contrário).
- Presume-se VERDADEIRO (legitimidade) e EM CONFORMIDADE COM A LEI (legitimidade).

### 4.2. Imperatividade
- Impõe-se a terceiros independentemente de sua concordância.
- Não está presente em atos que apenas declaram (certidão).

### 4.3. Autoexecutoriedade
- Adm executa o ato sem necessidade de autorização judicial.
- Decompõe-se em:
  - **Exigibilidade**: imposição indireta (multa).
  - **Executoriedade**: imposição direta (uso da força).
- Não está presente em todos os atos (regra: deve haver previsão legal OU situação de emergência).

### 4.4. Tipicidade
- Atos administrativos correspondem a tipos previstos em lei.
- Não há atipicidade no direito público.

## 5. Classificação dos Atos Administrativos

### 5.1. Quanto à liberdade do agente
- **Vinculados**: lei define tudo (Adm não escolhe).
- **Discricionários**: lei dá margem (mérito = conveniência + oportunidade).

### 5.2. Quanto à formação
- **Simples**: 1 órgão decide.
- **Compostos**: 1 órgão principal + 1 ratificador.
- **Complexos**: 2+ órgãos decidem (vontade ÚNICA conjunta).

### 5.3. Quanto aos destinatários
- **Gerais**: destinatários indeterminados.
- **Individuais**: destinatários específicos.

### 5.4. Quanto ao alcance
- **Internos**: dentro da Adm.
- **Externos**: produzem efeitos fora.

### 5.5. Quanto à eficácia/validade
- **Perfeito**: completou ciclo de formação.
- **Eficaz**: produz efeitos.
- **Válido**: respeita a lei.

### 5.6. Espécies (Hely)
- **Normativos** (decretos, regulamentos).
- **Ordinatórios** (ofícios, instruções).
- **Negociais** (licença, autorização, permissão).
- **Enunciativos** (certidão, atestado, parecer).
- **Punitivos** (multa, advertência).

## 6. Extinção dos Atos

### 6.1. Anulação
- Por **ILEGALIDADE**.
- Efeitos **EX TUNC** (retroage).
- Pode pela Adm (autotutela) ou pelo Judiciário.

### 6.2. Revogação
- Por **INCONVENIÊNCIA/INOPORTUNIDADE**.
- Efeitos **EX NUNC** (não retroage).
- Só pela Adm.
- Limites: atos vinculados, exauridos, declaratórios.

### 6.3. Cassação
- Descumprimento de condição pelo beneficiário.

### 6.4. Caducidade
- Lei superveniente retira fundamento do ato.

### 6.5. Convalidação (art. 55 Lei 9.784)
- Sana vícios de **COMPETÊNCIA** (não exclusiva) ou **FORMA** (não essencial).
- Não convalida finalidade, motivo e objeto.

## 7. Súmulas STF Relevantes

- **Súmula 346**: a Adm pode anular seus próprios atos (e o Judiciário, controlar).
- **Súmula 473**: idem + pode revogar atos por motivo de oportunidade/conveniência (não atinge direitos adquiridos).
- **Súmula 633 STF**: depósito prévio para mandado de segurança em recurso administrativo = INCONSTITUCIONAL.

## 8. Como Cebraspe cobra

- **C/E**: "Fato administrativo depende de manifestação de vontade" → **ERRADO** (independe).
- **C/E**: "Motivo e motivação são sinônimos" → **ERRADO** (motivo = causa; motivação = expressão escrita).
- **C/E**: "A revogação tem efeitos ex tunc" → **ERRADO** (ex nunc).
- **C/E**: "Autoexecutoriedade está presente em todo ato administrativo" → **ERRADO** (depende de lei ou emergência).
- **C/E**: "Convalidação sana vício de finalidade" → **ERRADO** (só competência e forma).
- **C/E**: "A Adm pode revogar ato vinculado por inconveniência" → **ERRADO** (atos vinculados não se revogam).
$content$,
$resumo$
# Resumo — Fato e Ato Administrativo

## Distinção

| | Fato | Ato |
|---|---|---|
| Vontade | NÃO | SIM |
| Exemplo | Morte de servidor | Nomeação |

## Elementos do Ato (5 requisitos)

1. **Competência** (improrrogável, irrenunciável; delegação vedada: normativos, recurso, exclusivas)
2. **Finalidade** (público + específica; vício = desvio de poder)
3. **Forma** (regra: escrita)
4. **Motivo** (causa) ≠ Motivação (expressão escrita)
5. **Objeto** (conteúdo: lícito, possível, determinado, moral)

## Atributos
- Presunção de legitimidade (RELATIVA).
- Imperatividade.
- Autoexecutoriedade (exigibilidade + executoriedade).
- Tipicidade.

## Classificação principal

- **Vinculados** x **Discricionários** (mérito = conveniência + oportunidade)
- **Simples** | **Compostos** (ratificador) | **Complexos** (vontade conjunta)
- **Gerais** x **Individuais**
- **Internos** x **Externos**

## Espécies (Hely)
Normativos, ordinatórios, negociais, enunciativos, punitivos.

## Extinção

| Modo | Por | Efeitos |
|---|---|---|
| Anulação | Ilegalidade | EX TUNC |
| Revogação | Inconveniência | EX NUNC |
| Cassação | Desc. de condição | — |
| Caducidade | Lei superveniente | — |
| Convalidação | Vício de competência/forma | — |

## Súmulas
- 346 STF: Adm anula atos ilegais.
- 473 STF: Adm anula (ilegal) e revoga (inconveniente).

## Top pegadinhas
1. Fato = INDEPENDE de vontade.
2. Motivo (causa) ≠ Motivação (escrita).
3. Revogação = EX NUNC (não retroage).
4. Atos vinculados NÃO se revogam.
5. Convalidação só competência e forma.
$resumo$
);

-- ┌─ 4. Poder disciplinar ───────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Poder disciplinar',
  'Poder Disciplinar',
$content$
# Poder Disciplinar

## 1. Conceito

**Poder Disciplinar** é a prerrogativa da Administração de **apurar infrações** e **aplicar sanções** aos seus agentes (servidores) e aos particulares que mantêm vínculo jurídico especial com ela (concessionários, permissionários, alunos de escolas públicas, presos).

⚠️ Diferente do **Poder de Polícia**, que atinge TODOS os particulares (vínculo geral).

## 2. Natureza Jurídica

### 2.1. Quanto à apuração
**VINCULADO**. Constatada infração, a Adm DEVE apurá-la. Não pode deixar de fazê-lo.

### 2.2. Quanto à escolha da sanção
**DISCRICIONÁRIO** (até certo ponto). A lei prevê uma série de sanções, e a Adm aplica a mais adequada considerando:
- Gravidade da infração.
- Antecedentes do agente.
- Danos causados.
- Circunstâncias agravantes/atenuantes.

⚠️ **NÃO é totalmente discricionário**: alguns casos têm sanção VINCULADA (ex: abandono de cargo → demissão).

## 3. Distinção Disciplinar x Polícia

| | Disciplinar | Polícia |
|---|---|---|
| Atinge | Quem tem vínculo especial | TODOS os particulares |
| Vínculo | Específico (servidor, aluno, preso) | Geral |
| Sanção | Adm interna | Multa, apreensão, interdição |

## 4. Distinção Disciplinar x Hierárquico

- O Poder Hierárquico **CONTÉM** o Disciplinar (que é parte das prerrogativas hierárquicas).
- Mas o Disciplinar tem AUTONOMIA: pode haver disciplinar SEM hierarquia (ex: aluno de escola pública).

## 5. Sanções (Lei 8.112/90 art. 127)

Para servidores federais:
1. **Advertência**
2. **Suspensão** (até 90 dias)
3. **Demissão**
4. **Cassação de aposentadoria/disponibilidade**
5. **Destituição de cargo em comissão**
6. **Destituição de função comissionada**

## 6. Demissão (Lei 8.112 art. 132)

Aplicada em casos graves:
- Crime contra a Administração Pública.
- **Abandono de cargo** (30+ dias contínuos).
- **Inassiduidade habitual** (60 dias intercalados em 12 meses).
- Improbidade administrativa.
- Insubordinação grave.
- Ofensa física.
- Aplicação irregular de dinheiros públicos.
- Revelação de segredo do qual se apropriou em razão do cargo.
- Lesão aos cofres públicos.
- Corrupção.
- Acumulação ilegal de cargos.
- Transgressão dos incisos IX a XVI do art. 117.

## 7. Garantias do Servidor

A apuração disciplinar SUBMETE-SE ao devido processo legal:
- **Ampla defesa** (CF 5º LV).
- **Contraditório** (CF 5º LV).
- **Motivação** da decisão (Lei 9.784 art. 50).
- **Publicidade** (regra) ou sigilo (se necessário).
- **Direito de recorrer** (Lei 9.784 art. 56).

## 8. Procedimentos Disciplinares

### 8.1. Sindicância
- Pode ser:
  - **Inquisitorial**: preparatória, sem contraditório, busca elementos para verificar materialidade/autoria.
  - **Contraditória**: tem fase de defesa, pode aplicar advertência ou suspensão até 30 dias.
- Resultado: arquivamento, instauração de PAD, ou aplicação de sanção leve.

### 8.2. Processo Administrativo Disciplinar (PAD)
- Para sanções mais graves (suspensão > 30 dias, demissão, cassação).
- **Comissão** de 3 servidores estáveis.
- Fases (Lei 8.112 arts. 148-182):
  1. **Instauração** (portaria).
  2. **Instrução** (provas, oitivas, defesa do indiciado).
  3. **Defesa escrita**.
  4. **Relatório** da comissão.
  5. **Julgamento** pela autoridade competente.

### 8.3. Prazos
- PAD: 60 dias + 60 dias prorrogáveis (Lei 8.112 art. 152).
- Sindicância: 30 dias prorrogável por igual período.

## 9. Prescrição (Lei 8.112 art. 142)

A pretensão punitiva prescreve em:
- **5 anos**: infrações puníveis com demissão, cassação ou destituição.
- **2 anos**: infrações puníveis com suspensão.
- **180 dias**: infrações puníveis com advertência.

Interrupção: instauração de sindicância ou PAD.

## 10. Independência das Instâncias

Civil + Penal + Administrativa são INDEPENDENTES (Lei 8.112 art. 125).

EXCEÇÃO: absolvição penal por **inexistência do fato** ou **negativa de autoria** AFASTA admin e civil.

## 11. Como Cebraspe cobra

- **C/E**: "Poder disciplinar atinge particular sem vínculo" → **ERRADO** (atinge quem tem vínculo especial).
- **C/E apuração**: "A apuração é discricionária" → **ERRADO** (VINCULADA — Adm deve apurar).
- **C/E demissão**: "Demissão exige PAD" → **CORRETO** (sanção grave).
- **C/E**: "Sindicância pode resultar em demissão" → **ERRADO** (só PAD; sindicância no máximo aplica advertência ou suspensão até 30 dias).
- **C/E independência**: "Absolvição penal sempre afasta sanção administrativa" → **ERRADO** (só por inexistência do fato OU negativa de autoria).
- **C/E**: "Acumulação ilegal enseja suspensão" → **ERRADO** (demissão — art. 132).
$content$,
$resumo$
# Resumo — Poder Disciplinar

## Conceito
Apurar infrações + aplicar sanções a quem tem **vínculo especial**.

## Natureza
- Apuração: **VINCULADA** (Adm deve apurar).
- Escolha sanção: **DISCRICIONÁRIA** (com limites).

## Disciplinar x Polícia
- Disciplinar: vínculo especial (servidor, aluno, preso).
- Polícia: vínculo geral (todos os particulares).

## Sanções (Lei 8.112 art. 127)
1. Advertência | 2. Suspensão (≤ 90 dias) | 3. Demissão | 4. Cassação | 5/6. Destituição.

## Demissão (art. 132)
Crime adm, abandono 30d contínuos, inassiduidade 60d em 12m, improbidade, corrupção, acumulação ilegal.

## Procedimentos
- **Sindicância**: inquisitorial ou contraditória; máx advertência ou suspensão 30d.
- **PAD**: comissão 3 estáveis; 60+60 dias; instauração → instrução → defesa → relatório → julgamento.

## Prescrição (art. 142)
- Demissão: 5 anos.
- Suspensão: 2 anos.
- Advertência: 180 dias.

## Independência (art. 125)
Civil + Penal + Adm INDEPENDENTES, salvo absolvição penal por inexistência ou negativa autoria.

## Top pegadinhas
1. Apuração é VINCULADA (não discricionária).
2. Disciplinar = vínculo ESPECIAL.
3. Demissão = sempre PAD.
4. Sindicância NÃO demite.
5. Acumulação ilegal = DEMISSÃO.
$resumo$
);

-- ┌─ 5. Responsabilidade patrimonial do Estado por atos da adm pública ──────┐
SELECT upsert_material(
  'direito-administrativo',
  'Responsabilidade patrimonial do Estado por atos da administração pública: evolução histórica e fundamentos da responsabilidade do Estado; responsabilidade civil e criminal do servidor.',
  'Responsabilidade Patrimonial do Estado — Evolução e Fundamentos',
$content$
# Responsabilidade Patrimonial do Estado — Evolução e Fundamentos

## 1. Conceito

**Responsabilidade Patrimonial do Estado** é a obrigação que o Estado tem de **reparar danos** causados a terceiros, seja por **ação** ou **omissão** de seus agentes, dentro de uma teoria jurídica específica.

## 2. Evolução Histórica das Teorias

### 2.1. Teoria da Irresponsabilidade do Estado (Estado Absolutista)
- "The king can do no wrong".
- Soberano NÃO responde por danos causados.
- Vigorou na Idade Média e início da Idade Moderna.
- **Superada**: incompatível com Estado Democrático.

### 2.2. Teorias Civilistas
- Aplicação do direito civil.
- Distinguia:
  - **Atos de gestão** (gerência do patrimônio): Estado responde como particular.
  - **Atos de império** (soberania): Estado não responde.
- **Falhas**: artificiosa, deixa muitas situações sem reparação.

### 2.3. Teoria da Culpa Administrativa (Faute du Service)
- Surge com a Revolução Industrial.
- Responsabilidade do Estado se houver **culpa do serviço** (não do agente individualmente).
- Estado responde quando o serviço NÃO funcionou, FUNCIONOU MAL ou FUNCIONOU TARDIAMENTE.
- Ainda exige prova de **culpa anônima**.

### 2.4. Teoria do Risco Administrativo (atualmente ADOTADA no Brasil)
- Responsabilidade **OBJETIVA** do Estado.
- Independe de prova de culpa.
- Basta provar:
  - Conduta do agente.
  - Dano.
  - Nexo causal.
- **ADMITE EXCLUDENTES**: caso fortuito, força maior, culpa exclusiva da vítima, fato de terceiro.

### 2.5. Teoria do Risco Integral
- Responsabilidade objetiva SEM excludentes.
- Estado responde em qualquer hipótese.
- Aplicada em situações ESPECÍFICAS:
  - **Danos nucleares** (CF 21 XXIII d).
  - **Danos ambientais** (jurisprudência consolidada).
  - **Atos terroristas em aeronaves** (Lei 10.744/03).
  - **Acidente do trabalho** (regime de seguro — DPVAT).

## 3. Fundamento Constitucional — CF 37 §6º

> "As pessoas jurídicas de direito público e as de direito privado prestadoras de serviços públicos responderão pelos danos que seus agentes, NESSA QUALIDADE, causarem a terceiros, assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa."

### 3.1. Análise do dispositivo
- "Pessoas jurídicas de direito público": Adm Direta + autarquias + fundações de direito público.
- "Pessoas jurídicas de direito privado prestadoras de serviços públicos": EP, SEM (em serviço público), concessionárias, permissionárias.
- "Nessa qualidade": agindo no exercício de função pública.
- "Direito de regresso": Estado pode cobrar do agente (com dolo ou culpa).

⚠️ **Não inclui**: EP e SEM em ATIVIDADE ECONÔMICA (concorrência). Estas respondem pelo direito civil.

## 4. Pressupostos da Responsabilidade Objetiva

### 4.1. Conduta do agente
- Ação ou omissão.
- "Nessa qualidade" — vínculo com a função pública.

### 4.2. Dano
- Material ou moral.
- Deve ser certo, atual e específico.

### 4.3. Nexo causal
- Relação direta entre conduta e dano.

⚠️ **NÃO É exigida culpa** (objetiva é "independente de culpa").

## 5. Excludentes (Risco Administrativo)

- **Caso fortuito** (imprevisível).
- **Força maior** (previsível mas inevitável).
- **Culpa exclusiva da vítima**.
- **Fato exclusivo de terceiro**.
- **Culpa concorrente da vítima**: reduz indenização.

## 6. Responsabilidade por Omissão

### 6.1. Posição clássica (subjetiva)
- Omissão pura: responsabilidade SUBJETIVA — exige culpa do serviço.

### 6.2. Posição moderna (STF)
- **Omissão genérica**: subjetiva.
- **Omissão específica**: OBJETIVA. Quando o Estado tinha dever ESPECÍFICO de agir (ex: preso em custódia agredido, paciente em hospital público).

## 7. Responsabilidade Civil do Servidor (Regresso)

### 7.1. Pressupostos
- Indenização efetivamente paga pelo Estado.
- **Culpa OU DOLO** do agente.

### 7.2. Prazo
- Imprescritível em casos de improbidade dolosa por dano ao erário (CF 37 §5º + Tema 897 STF).

### 7.3. Como ocorre
- Ação de regresso pelo Estado contra o agente.
- Pode haver descontos em folha (Lei 8.112).

## 8. Responsabilidade Criminal do Servidor

- **Penal** — apurada na esfera criminal.
- Pode envolver crimes próprios (peculato, concussão, corrupção, prevaricação).
- Independência das instâncias (regra).

## 9. Súmulas STF/STJ

- **Súmula 510 STJ**: PJ privada prestadora de serviço público responde objetivamente, inclusive perante NÃO-USUÁRIOS.
- **Tema 366 STF**: responsabilidade do Estado por morte de detento é OBJETIVA (omissão específica).
- **Súmula 145 STJ**: indenização por dano em colisão depende de prova da culpa.

## 10. Prazo Prescricional

- Particular contra a Fazenda Pública: **5 anos** (Dec. 20.910/32).
- Regresso Estado contra agente: imprescritível (em improbidade dolosa com dano ao erário).

## 11. Como Cebraspe cobra

- **C/E**: "A teoria do risco integral é a regra no Brasil" → **ERRADO** (risco administrativo é regra; integral é exceção).
- **C/E**: "Caso fortuito exclui responsabilidade no risco integral" → **ERRADO** (integral não admite excludentes).
- **C/E**: "Omissão genérica gera responsabilidade objetiva" → **ERRADO** (subjetiva).
- **C/E regresso**: "Estado pode regredir contra servidor mesmo sem culpa" → **ERRADO** (exige dolo OU culpa).
- **C/E**: "EP em atividade econômica responde objetivamente pelo CF 37 §6º" → **ERRADO** (responde pelo direito civil).
- **C/E**: "Prazo da Fazenda contra particular é de 3 anos" → **ERRADO** (5 anos — Dec. 20.910).
$content$,
$resumo$
# Resumo — Responsabilidade Patrimonial do Estado

## Evolução
Irresponsabilidade → Civilistas (gestão x império) → Culpa Administrativa → **Risco Administrativo** (atual) → Risco Integral (exceção).

## Fundamento
CF 37 §6º: PJ de direito público + privado prestadora de serviço público respondem por danos de agentes "nessa qualidade".

## Teoria adotada: **RISCO ADMINISTRATIVO**
- Objetiva (sem culpa).
- Pressupostos: conduta + dano + nexo.
- **Admite excludentes**: fortuito, força maior, culpa exclusiva vítima, fato de terceiro.

## Risco Integral (exceção)
- Danos nucleares (CF 21 XXIII d).
- Danos ambientais.
- Atos terroristas em aeronaves (10.744/03).

## Omissão
- Genérica: SUBJETIVA.
- Específica: OBJETIVA (preso, paciente hospital).

## Regresso
- Exige DOLO OU CULPA.
- Imprescritível em improbidade dolosa com dano (CF 37 §5).

## Prazo
- Particular vs Fazenda: 5 anos (Dec. 20.910/32).

## Súmulas
- 510 STJ: PJ priv. serviço público objetiva (inclusive não-usuários).
- Tema 366 STF: morte de detento = objetiva.

## Top pegadinhas
1. Risco INTEGRAL = exceção (não regra).
2. Excludentes valem no risco ADMINISTRATIVO (não integral).
3. Omissão GENÉRICA = subjetiva.
4. Regresso exige DOLO OU CULPA.
5. EP em atividade econômica NÃO entra no §6º.
$resumo$
);

-- ┌─ 6. Lei 14.967/2024 (Estatuto da Segurança Privada) ─────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Lei nº 14.967/2024 (Estatuto da Segurança Privada e da Segurança das Instituições Financeiras)',
  'Lei 14.967/2024 — Estatuto da Segurança Privada',
$content$
# Lei 14.967/2024 — Estatuto da Segurança Privada e da Segurança das Instituições Financeiras

Lei recente (2024) que **REVOGOU** a Lei 7.102/83. Tema cobrado pela primeira vez no edital PF 2025. Cebraspe vai pedir DIRETAMENTE a letra da lei.

## 1. Visão Geral

### 1.1. Objeto (art. 1º)
Disciplina a:
- **Segurança Privada** (vigilância de pessoas, bens, valores).
- **Segurança das Instituições Financeiras** (bancos, financeiras, etc.).
- **Transporte de Valores**.
- **Curso de Formação** dos vigilantes.
- **Fiscalização** pela PF.

### 1.2. Vigência
- Publicada em 2024.
- Substitui a Lei 7.102/83.

## 2. Competência Fiscalizatória

### 2.1. Polícia Federal
**Atribuição principal**: fiscalizar empresas e cursos.

- Autoriza funcionamento.
- Concede alvará anual.
- Aplica sanções.
- Fiscaliza transporte de valores.

### 2.2. Outras autoridades
- Secretarias estaduais (em parceria).
- BACEN (para instituições financeiras).

## 3. Atividades de Segurança Privada (art. 4º)

### 3.1. Vigilância Patrimonial
- Proteção de patrimônio (privado, condomínios, lojas).
- Realizada por **vigilante armado ou desarmado**.

### 3.2. Transporte de Valores
- Veículos blindados, escolta armada.
- Regulamentação específica de equipamentos.

### 3.3. Escolta Armada
- Acompanhamento de pessoas ou bens.

### 3.4. Segurança Pessoal Privada
- Proteção de pessoa física.

### 3.5. Cursos de Formação
- Formação inicial.
- Cursos de extensão e reciclagem.

## 4. Vigilante — Requisitos (art. 14)

- Brasileiro nato ou naturalizado.
- Maioridade (18 anos).
- Saúde física e mental.
- Aptidão psicológica.
- Concluído curso de formação.
- Idoneidade (sem antecedentes criminais condenatórios).
- Carteira Nacional do Vigilante (CNV).

## 5. Empresa de Segurança Privada

### 5.1. Requisitos para constituição
- Registro na Junta Comercial.
- Autorização da PF.
- Diretor com formação específica.
- Capital social mínimo.
- Plano de segurança e contingência.

### 5.2. Obrigações
- Manter cadastro atualizado de vigilantes.
- Comunicar à PF demissões e admissões.
- Realizar curso de reciclagem dos vigilantes.

## 6. Instituições Financeiras

### 6.1. Plano de Segurança
Bancos devem ter plano contendo:
- Sistema de vigilância (humano ou eletrônico).
- Equipamentos de segurança (alarmes, câmeras).
- Quantidade mínima de vigilantes (varia por agência).

### 6.2. Sanções
- Multa.
- Interdição.
- Cancelamento de autorização.

## 7. Sanções (art. 28+)

Aplicáveis a empresas, instituições financeiras e vigilantes:
- **Advertência**.
- **Multa** (escala progressiva).
- **Suspensão** do alvará/autorização.
- **Cassação** definitiva.

## 8. Crimes (art. 33+)

Tipos penais previstos:
- Exercício ilegal de atividade de segurança privada.
- Falsificação de documento de vigilante.
- Constituição de empresa de fachada.

Penas: detenção 6 meses a 4 anos + multa (varia).

## 9. Curso de Formação

### 9.1. Conteúdo programático
- Legislação aplicada.
- Direitos humanos.
- Uso de instrumentos menos letais.
- Defesa pessoal.
- Tiro defensivo.
- Primeiros socorros.

### 9.2. Carga horária
Mínima estabelecida em regulamento (geralmente 200h).

### 9.3. Periodicidade
Curso de reciclagem a cada **2 anos**.

## 10. Distinção: Segurança Pública x Privada

| | Segurança Pública | Segurança Privada |
|---|---|---|
| Quem exerce | Estado (CF 144) | Empresas privadas |
| Atribuição | Ordem pública geral | Patrimônio específico |
| Vigilante x policial | Civil armado/desarmado | Servidor público |
| Atuação | Repressão e prevenção criminal | Vigilância patrimonial |

⚠️ Vigilante NÃO é policial. Não tem prerrogativas policiais. Não pode prender (só flagrante delito, igual qualquer cidadão).

## 11. Como Cebraspe cobra

- **C/E**: "A Lei 14.967/24 substitui a Lei 7.102/83" → **CORRETO**.
- **C/E**: "Polícia Estadual fiscaliza empresas de segurança privada" → **ERRADO** (PF).
- **C/E**: "Vigilante tem mesmas prerrogativas que policial militar" → **ERRADO**.
- **C/E**: "Vigilante pode prender em flagrante" → **CORRETO** (como qualquer cidadão).
- **C/E**: "Curso de reciclagem é a cada 5 anos" → **ERRADO** (regulamento prevê periodicidade — geralmente 2 anos).
- **C/E**: "Estrangeiro pode exercer função de vigilante" → **ERRADO** (brasileiro nato ou naturalizado).
$content$,
$resumo$
# Resumo — Lei 14.967/24 (Segurança Privada)

## Visão
- Substitui Lei 7.102/83 (revogada).
- Regula segurança privada + instituições financeiras.

## Fiscalização
**Polícia Federal** (principal).

## Atividades
- Vigilância patrimonial.
- Transporte de valores.
- Escolta armada.
- Segurança pessoal.
- Cursos.

## Vigilante (art. 14)
Brasileiro nato/naturalizado, 18+, saúde, aptidão, curso, idoneidade, CNV.

## Empresa
Registro Junta Comercial + autorização PF + diretor + plano segurança.

## Instituições Financeiras
Plano com vigilância + equipamentos + quantidade mínima de vigilantes.

## Sanções
Advertência | Multa | Suspensão | Cassação.

## Crimes
Exercício ilegal, falsificação, empresa de fachada.

## Reciclagem
A cada 2 anos.

## Vigilante x Policial
Vigilante NÃO é policial. Não tem prerrogativas. Pode prender em flagrante como qualquer cidadão.

## Top pegadinhas
1. PF fiscaliza (não estadual).
2. Vigilante = brasileiro.
3. Reciclagem 2 anos.
4. Vigilante NÃO é policial.
5. Lei 14.967/24 revogou 7.102/83.
$resumo$
);

-- ┌─ 7. Serviços delegados ──────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Serviços delegados',
  'Serviços Públicos Delegados',
$content$
# Serviços Públicos Delegados

## 1. Conceito

**Serviços Delegados** (ou descentralizados por colaboração) são serviços públicos cuja **execução** é transferida pela Administração a um particular, mediante CONTRATO ou ATO ADMINISTRATIVO.

⚠️ A **titularidade** permanece com o Estado. O particular só EXECUTA.

## 2. Fundamento Constitucional

**CF 175**: "Incumbe ao Poder Público, na forma da lei, diretamente ou sob regime de **concessão ou permissão**, sempre através de **licitação**, a prestação de serviços públicos."

## 3. Formas de Delegação

### 3.1. Concessão (Lei 8.987/95)
- Contrato administrativo.
- Por **CONCORRÊNCIA** (regra) ou pregão eletrônico (serviços comuns).
- Prazo determinado.
- Remuneração: tarifa cobrada do usuário (+ receitas alternativas).
- Risco do concessionário (regra).

### 3.2. Permissão (Lei 8.987/95)
- Contrato de adesão.
- **Precário**.
- Licitação obrigatória.
- Geralmente para serviços de menor complexidade.

### 3.3. Autorização
- Ato unilateral, discricionário, precário.
- Geralmente para serviços não-exclusivos do Estado (transporte por aplicativo).
- **NÃO exige licitação**.

### 3.4. Parceria Público-Privada (PPP — Lei 11.079/04)
- Modalidade especial de concessão.
- **Concessão Patrocinada**: tarifa do usuário + contraprestação pública.
- **Concessão Administrativa**: usuária é a Adm (não tem cobrança de tarifa do usuário final).
- Investimento mínimo: R$ 10 milhões (até 2017 era R$ 20mi).
- Prazo: 5 a 35 anos.

## 4. Princípios dos Serviços Delegados (Lei 8.987/95)

- **Continuidade**: serviços não podem ser interrompidos arbitrariamente.
- **Generalidade**: prestados a todos.
- **Eficiência**.
- **Cortesia**: tratamento adequado ao usuário.
- **Atualidade**: tecnologia atualizada.
- **Segurança**.
- **Modicidade Tarifária**: tarifa razoável.
- **Regularidade**: prestação regular.

## 5. Direitos e Obrigações do Concessionário

### 5.1. Direitos
- Receber tarifa.
- Equilíbrio econômico-financeiro do contrato.
- Receber receitas alternativas (publicidade, etc.).
- Indenização em caso de encampação.

### 5.2. Obrigações
- Prestar serviço adequado.
- Cumprir o contrato.
- Submeter-se à fiscalização do poder concedente.
- Reposição da tarifa em caso de revisão.

## 6. Tarifa

### 6.1. Conceito
Valor pago pelo usuário ao concessionário em razão da utilização do serviço.

### 6.2. Distinção tarifa x taxa

| | Tarifa | Taxa |
|---|---|---|
| Natureza | Preço público | Tributo |
| Quem cobra | Concessionário | Estado |
| Regime | Direito privado | Direito tributário |
| Uso obrigatório | NÃO | SIM (em alguns casos) |
| Exemplo | Água, energia | Coleta de lixo |

### 6.3. Princípio da Modicidade
Tarifa deve ser razoável, respeitando equilíbrio econômico-financeiro do contrato.

## 7. Equilíbrio Econômico-Financeiro

### 7.1. Cláusula intocável
Garantia ao concessionário.

### 7.2. Causas de revisão
- Modificação unilateral pelo poder concedente.
- Álea econômica extraordinária (fato imprevisível).
- Fato do príncipe (medida geral do poder público).
- Caso fortuito ou força maior.

### 7.3. Reajuste, Repactuação, Revisão
- **Reajuste**: índice predeterminado, periodicidade anual.
- **Repactuação**: serviços contínuos com mão de obra.
- **Revisão**: por desequilíbrio extraordinário.

## 8. Extinção da Concessão

### 8.1. Causas (Lei 8.987/95)
- **Termo final do contrato**.
- **Encampação**: retomada pelo poder concedente por interesse público (com indenização).
- **Caducidade**: por inexecução do concessionário.
- **Rescisão**: por inadimplemento do poder concedente.
- **Anulação**: por ilegalidade.
- **Falência ou extinção** do concessionário.

### 8.2. Reversão
Ao final, bens vinculados ao serviço retornam ao poder concedente, com indenização de parcelas não amortizadas.

## 9. Fiscalização

### 9.1. Pelo poder concedente
Direito-dever da Adm fiscalizar continuamente.

### 9.2. Pelo usuário
Lei 13.460/17 (Código de Defesa do Usuário) — direito a serviço adequado, transparência, ouvidoria.

## 10. Como Cebraspe cobra

- **C/E**: "A titularidade do serviço público delegado é transferida ao particular" → **ERRADO** (só a execução).
- **C/E**: "Concessão não exige licitação" → **ERRADO** (concorrência obrigatória).
- **C/E**: "Tarifa é tributo" → **ERRADO** (é preço público).
- **C/E**: "PPP é gênero de licitação, não de concessão" → **ERRADO** (modalidade especial de concessão).
- **C/E**: "Encampação ocorre por inexecução do concessionário" → **ERRADO** (caducidade).
- **C/E**: "Permissão é ato administrativo unilateral" → **CUIDADO** (Lei 8.987 transformou em contrato precário).
$content$,
$resumo$
# Resumo — Serviços Delegados

## Fundamento
CF 175: concessão ou permissão sempre por licitação.

## Formas
- **Concessão** (Lei 8.987): contrato, concorrência, prazo determinado.
- **Permissão**: contrato precário, licitação.
- **Autorização**: ato unilateral, precário, SEM licitação.
- **PPP** (Lei 11.079): patrocinada (+ contraprestação) ou administrativa.

## Princípios (Lei 8.987)
Continuidade, generalidade, eficiência, cortesia, atualidade, segurança, modicidade, regularidade.

## Tarifa x Taxa
- **Tarifa**: preço público (concessionário).
- **Taxa**: tributo (Estado).

## Extinção
- Termo final.
- Encampação (interesse público + indenização).
- Caducidade (inexecução).
- Rescisão (inadimplemento Adm).
- Anulação.
- Falência.

## Equilíbrio Econômico-Financeiro
Reajuste (anual) | Repactuação (mão de obra) | Revisão (extraordinário).

## Top pegadinhas
1. Titularidade FICA com Estado (só execução delegada).
2. Tarifa = preço público (não tributo).
3. Encampação = interesse público; Caducidade = inexecução.
4. PPP = modalidade especial de concessão.
5. Permissão (8.987) = contrato precário.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" = (SELECT id FROM "subjects" WHERE slug = 'direito-administrativo');
  RAISE NOTICE 'Total materiais Direito Adm: %', v_count;
END $$;
