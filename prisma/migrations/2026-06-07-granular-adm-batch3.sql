-- ════════════════════════════════════════════════════════════════════════════
-- GRANULAR ADM — Batch 3 (7 materiais focados)
-- Data: 2026-06-07
--
-- Topics: Atos Adm (elementos + classificação), Poder de Polícia, Controle,
-- Licitação (obrig/dispensa/inexigib), Processo Disciplinar.
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

-- ┌─ 1. Conceitos, requisitos, elementos, pressupostos e classificação ──────┐
SELECT upsert_material(
  'direito-administrativo',
  'Conceitos, requisitos, elementos, pressupostos e classificação',
  'Atos Administrativos — Conceito, Requisitos e Elementos',
$content$
# Atos Administrativos — Conceito, Requisitos e Elementos

## 1. Conceito

**Ato Administrativo** é a manifestação **unilateral** de vontade da Administração Pública que, no exercício de função administrativa, produz **efeitos jurídicos imediatos** sob o regime de direito público.

Diferencia-se:
- Do **contrato**: bilateral.
- Do **regulamento**: produz efeitos gerais e mediatos.
- Do **fato administrativo**: independe de vontade.

## 2. Elementos / Requisitos (Lei 4.717/65)

São 5 elementos essenciais para a **validade**:

### 2.1. Competência
- Aptidão para praticar o ato, conferida por lei.
- Características: improrrogável, irrenunciável, de exercício obrigatório.
- Pode ser delegada/avocada (Lei 9.784 arts. 12 e 15).
- Vícios na competência podem ser **CONVALIDADOS** (salvo competência exclusiva).

### 2.2. Finalidade
- Interesse público GERAL (sempre) + finalidade ESPECÍFICA (do ato).
- Vício: **desvio de finalidade** ou **desvio de poder**.
- NÃO admite convalidação.

### 2.3. Forma
- Exteriorização do ato.
- Regra: escrita. Exceções: oral, gestos, sinais.
- Lei 9.784 art. 22: atos administrativos não dependem de forma determinada salvo quando a lei exigir.
- Vícios podem ser **CONVALIDADOS** se a forma não for essencial.

### 2.4. Motivo
- Situação de FATO ou de DIREITO que autoriza ou determina o ato.
- Distinto de MOTIVAÇÃO (expressão escrita do motivo).
- **Teoria dos Motivos Determinantes**: o motivo declarado vincula a Adm — se for falso, o ato é nulo.
- NÃO admite convalidação.

### 2.5. Objeto (Conteúdo)
- O que o ato dispõe.
- Deve ser: lícito, possível, determinado/determinável, moral.
- NÃO admite convalidação (em regra).

## 3. Resumo: Convalidação por Elemento

| Elemento | Convalidável? |
|---|---|
| Competência | SIM (salvo exclusiva) |
| Finalidade | NÃO |
| Forma | SIM (não essencial) |
| Motivo | NÃO |
| Objeto | NÃO |

## 4. Pressupostos

Distintos dos elementos. São condições para o ato existir/produzir efeitos:

### 4.1. Pressupostos de Existência
- Manifestação de vontade.
- Caráter administrativo.

### 4.2. Pressupostos de Validade
- Sujeito competente.
- Motivo legítimo.
- Objeto lícito.

### 4.3. Pressupostos de Eficácia
- Publicação.
- Homologação (se exigida).

## 5. Classificação Genérica

### 5.1. Quanto aos destinatários
- **Gerais**: indeterminados (decreto regulamentar).
- **Individuais**: determinados (nomeação).

### 5.2. Quanto ao alcance
- **Internos**: dentro da Adm.
- **Externos**: produzem efeitos para fora.

### 5.3. Quanto à formação
- **Simples**: 1 órgão decide.
- **Compostos**: 1 decide principal + 1 ratifica.
- **Complexos**: 2+ órgãos com vontade conjunta.

### 5.4. Quanto à liberdade
- **Vinculados**: lei define tudo.
- **Discricionários**: lei dá margem (mérito).

### 5.5. Quanto ao conteúdo
- **Constitutivos**: criam, modificam, extinguem direitos.
- **Declaratórios**: reconhecem situação preexistente.
- **Enunciativos**: certificam fatos.

### 5.6. Quanto à validade
- **Válidos**: respeitam a lei.
- **Nulos**: vícios insanáveis.
- **Anuláveis**: vícios sanáveis (competência, forma).
- **Inexistentes**: faltam pressupostos de existência.

## 6. Atos Administrativos x Atos da Administração

- **Atos administrativos**: praticados sob regime de direito público.
- **Atos da Administração**: gênero amplo — inclui atos privados praticados pela Adm (ex: locação de imóvel).

## 7. Como Cebraspe cobra

- **C/E**: "Competência é vício insanável" → **ERRADO** (é convalidável, salvo exclusiva).
- **C/E**: "Forma é sempre escrita" → **ERRADO** (regra; aceita oral, gesto).
- **C/E**: "Motivo é a expressão escrita das razões" → **ERRADO** (motivo = causa; motivação = expressão).
- **C/E**: "Teoria dos motivos determinantes vincula a Adm ao motivo declarado" → **CORRETO**.
- **C/E**: "Atos administrativos podem ser bilaterais" → **ERRADO** (unilaterais).
- **C/E**: "Finalidade pode ser convalidada" → **ERRADO**.
$content$,
$resumo$
# Resumo — Atos Administrativos: Conceito e Elementos

## Conceito
Manifestação UNILATERAL de vontade da Adm, em função administrativa, com efeitos jurídicos IMEDIATOS sob direito público.

## 5 Elementos (Lei 4.717/65)

| Elemento | Convalida? |
|---|---|
| **Competência** | SIM (salvo exclusiva) |
| **Finalidade** | NÃO |
| **Forma** | SIM (não essencial) |
| **Motivo** | NÃO |
| **Objeto** | NÃO |

## Motivo x Motivação
- Motivo = CAUSA (fato/direito que autoriza).
- Motivação = EXPRESSÃO ESCRITA.
- Teoria dos Motivos Determinantes: motivo declarado vincula.

## Pressupostos
- Existência: vontade + caráter adm.
- Validade: sujeito competente + motivo legítimo + objeto lícito.
- Eficácia: publicação + homologação.

## Classificação
- Destinatários: gerais x individuais.
- Alcance: internos x externos.
- Formação: simples x compostos x complexos.
- Liberdade: vinculados x discricionários.

## Top pegadinhas
1. Atos administrativos = UNILATERAIS.
2. Competência convalidável (salvo exclusiva).
3. Finalidade, motivo, objeto = NÃO convalidam.
4. Motivo ≠ Motivação.
5. Forma: regra escrita; aceita oral/gestos.
$resumo$
);

-- ┌─ 2. Classificação e caracteres jurídicos ────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Classificação e caracteres jurídicos',
  'Atos Administrativos — Classificação e Caracteres Jurídicos',
$content$
# Atos Administrativos — Classificação e Caracteres Jurídicos

## 1. Visão Geral

Os atos administrativos podem ser classificados sob diversos critérios. Cebraspe ama as tabelas.

## 2. Quanto à Liberdade (do agente)

### 2.1. Vinculados
- Lei define COMPLETAMENTE os elementos.
- Adm não tem escolha.
- Ex: aposentadoria voluntária por tempo de contribuição.

### 2.2. Discricionários
- Lei deixa margem para a Adm escolher entre alternativas.
- **Mérito administrativo** = conveniência + oportunidade.
- Limites: razoabilidade, proporcionalidade, finalidade.
- Ex: nomeação para cargo em comissão.

⚠️ Mesmo atos discricionários têm elementos vinculados (competência, finalidade, forma).

## 3. Quanto à Formação

### 3.1. Simples
- Uma só manifestação de vontade.
- Pode ser de órgão singular (1 agente) ou colegiado (assembleia).

### 3.2. Compostos
- Duas manifestações: principal + acessória (ratificação).
- Mesmo órgão.
- Ex: ato do Ministro homologado pelo Presidente.

### 3.3. Complexos
- Duas manifestações de órgãos DIFERENTES, com a mesma intensidade.
- Vontade conjunta.
- Ex: nomeação de Ministro do STF (escolha do Presidente + aprovação do Senado).

## 4. Quanto ao Alcance

### 4.1. Internos
- Produzem efeitos dentro da Adm.
- Ex: portaria de transferência.

### 4.2. Externos
- Produzem efeitos fora da Adm.
- Ex: edital de licitação, multa.

## 5. Quanto aos Destinatários

### 5.1. Gerais
- Destinatários indeterminados.
- Ex: regulamento.

### 5.2. Individuais
- Destinatários determinados.
- Ex: nomeação.

### 5.3. Coletivos
- Pluralidade determinada.
- Ex: edital convocatório de aprovados em concurso.

## 6. Quanto ao Conteúdo

### 6.1. Constitutivos
- Criam, modificam ou extinguem direitos.
- Ex: licença, autorização.

### 6.2. Declaratórios
- Reconhecem situação preexistente.
- Ex: declaração de aposentadoria por invalidez.

### 6.3. Enunciativos
- Certificam fatos.
- Ex: certidão, atestado.

### 6.4. Modificativos
- Alteram situação existente sem extingui-la.

## 7. Quanto à Validade

### 7.1. Válidos
- Respeitam a lei.

### 7.2. Anuláveis
- Vícios sanáveis (competência, forma).
- Convaliáveis.

### 7.3. Nulos
- Vícios insanáveis (finalidade, motivo, objeto).

### 7.4. Inexistentes
- Faltam pressupostos básicos.

## 8. Quanto à Forma

### 8.1. Escritos
- Regra geral.

### 8.2. Orais
- Ordens verbais, semáforos.

### 8.3. Gestuais
- Sinal do guarda de trânsito.

### 8.4. Sinais (acústicos, luminosos)
- Sinalização viária.

## 9. Atos em Espécie (Hely Lopes Meirelles)

### 9.1. Normativos
- Editam normas gerais.
- **Decretos, regulamentos, instruções normativas, resoluções**.

### 9.2. Ordinatórios
- Disciplinam o funcionamento interno.
- **Portarias, ordens, circulares, instruções, avisos, ofícios**.

### 9.3. Negociais
- Adm consente com pretensão do particular.
- **Licença** (vinculado, definitivo): direito subjetivo do interessado se preencher requisitos.
- **Autorização** (discricionário, precário): conveniência da Adm.
- **Permissão** (discricionário, precário): uso de bem ou serviço.

### 9.4. Enunciativos
- Certificam ou declaram.
- **Certidão, atestado, parecer, apostila**.

### 9.5. Punitivos
- Aplicam sanções.
- **Multa, advertência, interdição de estabelecimento, demolição**.

## 10. Caracteres Jurídicos (Atributos)

### 10.1. Presunção de Legitimidade e Veracidade
- Iuris tantum (relativa).
- Inverte o ônus da prova.
- Decorre da imputabilidade volitiva.

### 10.2. Imperatividade
- Impõe-se a terceiros.
- Decorre do poder extroverso.
- Ausente em atos enunciativos.

### 10.3. Autoexecutoriedade
- Adm executa sem prévia autorização judicial.
- Decompõe-se em:
  - **Exigibilidade**: imposição indireta (multa).
  - **Executoriedade**: imposição direta (uso da força).
- Não está presente em TODOS os atos (depende de lei ou emergência).

### 10.4. Tipicidade
- Cada ato corresponde a um tipo legal.

## 11. Como Cebraspe cobra

- **C/E**: "Ato complexo é o que se forma com duas manifestações de mesmo órgão" → **ERRADO** (composto; complexo são órgãos diferentes).
- **C/E**: "Licença é ato discricionário" → **ERRADO** (vinculado).
- **C/E autorização**: "Autorização é definitiva e vinculada" → **ERRADO** (precária e discricionária).
- **C/E**: "Atos enunciativos têm imperatividade" → **ERRADO** (ausente — apenas declaram).
- **C/E**: "Autoexecutoriedade está em todo ato administrativo" → **ERRADO** (depende de lei ou emergência).
- **C/E**: "Decreto regulamentar é ato ordinatório" → **ERRADO** (normativo).
$content$,
$resumo$
# Resumo — Classificação e Caracteres dos Atos

## Liberdade
- Vinculado x Discricionário (mérito = conveniência + oportunidade).

## Formação
- Simples (1 vontade).
- Composto (1 órgão: principal + ratificador).
- Complexo (2+ órgãos: vontade conjunta).

## Alcance/Destinatários
- Internos x Externos.
- Gerais x Individuais x Coletivos.

## Conteúdo
- Constitutivos | Declaratórios | Enunciativos | Modificativos.

## Espécies (Hely)
- **Normativos**: decretos, regulamentos.
- **Ordinatórios**: portarias, instruções, ofícios.
- **Negociais**: licença (vinc/def) | autorização (disc/prec) | permissão.
- **Enunciativos**: certidão, atestado, parecer.
- **Punitivos**: multa, demolição.

## Atributos (Caracteres)
- **Presunção** de legitimidade (relativa).
- **Imperatividade** (ausente em enunciativos).
- **Autoexecutoriedade** (exigibilidade + executoriedade — não em todos).
- **Tipicidade**.

## Top pegadinhas
1. Composto = 1 órgão (principal + ratificador); Complexo = 2+ órgãos.
2. Licença = VINCULADO; Autorização = DISCRICIONÁRIO/PRECÁRIO.
3. Atos enunciativos NÃO têm imperatividade.
4. Autoexecutoriedade NÃO está em todos.
$resumo$
);

-- ┌─ 3. Conceito, finalidades, princípios e objeto (Poder de Polícia) ───────┐
SELECT upsert_material(
  'direito-administrativo',
  'Conceito, finalidades, princípios e objeto',
  'Poder de Polícia — Conceito, Finalidades, Princípios e Objeto',
$content$
# Poder de Polícia — Conceito, Finalidades, Princípios e Objeto

## 1. Conceito (CTN art. 78)

> "Considera-se poder de polícia a atividade da administração pública que, **limitando ou disciplinando direito, interesse ou liberdade**, regula a prática de ato ou abstenção de fato, em razão de interesse público concernente à segurança, à higiene, à ordem, aos costumes, à disciplina da produção e do mercado, ao exercício de atividades econômicas dependentes de concessão ou autorização do Poder Público, à tranquilidade pública ou ao respeito à propriedade e aos direitos individuais ou coletivos."

⚠️ Cebraspe cobra MUITO a definição literal do CTN.

## 2. Finalidades

### 2.1. Limitar direitos e liberdades individuais
- Em prol do interesse coletivo.
- Atinge particulares (vínculo GERAL — diferente do disciplinar).

### 2.2. Disciplinar atividades
- Garantir convivência social harmoniosa.
- Conciliar interesses privados com o público.

### 2.3. Resguardar o interesse público
- Segurança, saúde, moral, ordem, tranquilidade.

## 3. Princípios

### 3.1. Princípio da Legalidade
- Só lei pode limitar direitos.
- Adm executa mas não cria limites novos.

### 3.2. Princípio da Proporcionalidade
- Meio adequado à finalidade.
- Necessidade.
- Proporcionalidade em sentido estrito.

### 3.3. Princípio da Razoabilidade
- Atuação razoável.

### 3.4. Princípio da Eficácia
- Resultados práticos.

### 3.5. Princípio da Reserva da Lei
- Núcleo essencial dos direitos é reservado à lei.

### 3.6. Princípio do Devido Processo Legal
- Aplicação de sanções com contraditório e ampla defesa.

### 3.7. Princípio da Motivação
- Decisões fundamentadas.

## 4. Atributos

### 4.1. Discricionariedade
- Em regra, a Adm escolhe o meio.
- Limites: razoabilidade, proporcionalidade.

### 4.2. Autoexecutoriedade
- Adm executa SEM prévia autorização judicial.
- Decompõe-se em:
  - **Exigibilidade**: imposição indireta (multa).
  - **Executoriedade**: imposição direta (uso da força).
- Ausente em alguns casos (ex: cobrança de multa exige execução fiscal).

### 4.3. Coercibilidade
- Imposição obrigatória ao particular.
- Uso da força (proporcional) é permitido.

## 5. Ciclo de Polícia (Lúcia Valle Figueiredo)

4 fases:

### 5.1. Ordem de Polícia (Norma)
- Estabelecimento de limites em abstrato.
- Por LEI (ou ato normativo derivado).

### 5.2. Consentimento de Polícia
- Anuência da Adm para o particular exercer atividade.
- **Licença** (vinculada) ou **Autorização** (discricionária).

### 5.3. Fiscalização de Polícia
- Verificação do cumprimento.
- Vistorias, inspeções.

### 5.4. Sanção de Polícia
- Aplicação de penalidade pelo descumprimento.
- Multa, apreensão, interdição.

⚠️ STF (RE 633.782): apenas **pessoas de direito público** + estatais prestadoras de **serviço público exclusivo** podem exercer poder de polícia.

## 6. Polícia Administrativa x Polícia Judiciária

| | Polícia Administrativa | Polícia Judiciária |
|---|---|---|
| Foco | Prevenção | Repressão de crimes |
| Atinge | Direitos e liberdades | Pessoas após delito |
| Órgãos | Toda Adm | Polícias Civis e PF |
| Regime | Direito Administrativo | Direito Processual Penal |

⚠️ Polícia administrativa NÃO é a Polícia Militar/Civil. É um PODER administrativo.

## 7. Setores de Atuação

- Segurança Pública.
- Higiene Pública (Vigilância Sanitária).
- Saúde Pública.
- Moralidade Pública (moral coletiva).
- Tranquilidade Pública.
- Ordem Econômica (combate ao truste, defesa do consumidor).
- Defesa do Meio Ambiente.
- Trânsito (CTB).

## 8. Limites do Poder de Polícia

- Direitos fundamentais (CF 5º).
- Devido processo legal.
- Proporcionalidade e razoabilidade.
- Necessidade.
- Reserva de jurisdição (atos que exigem decisão judicial — ex: invasão de domicílio sem flagrante).

## 9. Como Cebraspe cobra

- **C/E**: "Poder de polícia atinge somente quem tem vínculo com a Adm" → **ERRADO** (atinge particulares em geral).
- **C/E**: "A discricionariedade do poder de polícia é absoluta" → **ERRADO** (limitada por razoabilidade).
- **C/E ciclo**: "O ciclo de polícia tem 5 fases" → **ERRADO** (4: ordem, consentimento, fiscalização, sanção).
- **C/E**: "Poder de polícia pode ser exercido por particular" → **ERRADO** (STF: só PJ direito público + estatais em serviço exclusivo).
- **C/E**: "Polícia administrativa é a polícia militar" → **ERRADO** (são coisas distintas).
- **C/E autoexecutoriedade**: "É absoluta no poder de polícia" → **ERRADO** (multa, p.ex., precisa de execução fiscal).
$content$,
$resumo$
# Resumo — Poder de Polícia

## Conceito (CTN 78)
Atividade da Adm que limita ou disciplina direitos em razão do interesse público.

## Atributos
- **Discricionariedade** (regra, com limites).
- **Autoexecutoriedade** (exigibilidade + executoriedade).
- **Coercibilidade**.

## Ciclo de Polícia (4 fases)
1. **Ordem** (norma).
2. **Consentimento** (licença/autorização).
3. **Fiscalização**.
4. **Sanção**.

## Polícia Adm x Judiciária

| | Administrativa | Judiciária |
|---|---|---|
| Foco | Prevenção | Repressão de crimes |
| Atinge | Liberdades em geral | Pessoas após delito |
| Órgãos | Toda Adm | PC e PF |

## Setores
Segurança, vigilância sanitária, saúde, ambiente, trânsito, ordem econômica.

## Limites
Direitos fundamentais, devido processo, proporcionalidade.

## STF RE 633.782
Só PJ DIREITO PÚBLICO + estatais em serviço exclusivo podem exercer.

## Top pegadinhas
1. Ciclo de polícia = 4 fases (não 5).
2. Particular NÃO exerce poder de polícia.
3. Autoexecutoriedade NÃO é absoluta (multa exige execução fiscal).
4. Polícia adm ≠ Polícia militar/civil.
5. Atinge particulares em GERAL (vínculo geral).
$resumo$
);

-- ┌─ 4. Conceito, peculiaridades e interpretação (Poder de Polícia atributos) ┐
SELECT upsert_material(
  'direito-administrativo',
  'Conceito, peculiaridades e interpretação',
  'Poder de Polícia — Peculiaridades e Interpretação',
$content$
# Poder de Polícia — Peculiaridades e Interpretação

## 1. Características Específicas

### 1.1. Decorre da Lei
Só pode ser exercido com base em LEI prévia. Não pode a Adm inventar limitações.

### 1.2. Atinge particulares EM GERAL
Diferente do poder disciplinar (vínculo especial), o poder de polícia atinge **qualquer pessoa** que esteja sob a soberania do Estado.

### 1.3. Visa o BEM COLETIVO
Não atende interesse particular da Adm.

### 1.4. Limita SEMPRE o direito de OUTREM
Não cria obrigações para a própria Adm.

### 1.5. Predominantemente NEGATIVO
- Em regra, IMPÕE ABSTENÇÕES (não fazer X).
- Excepcionalmente positivos (obrigação de manter rota fiscal).

## 2. Interpretação

### 2.1. Princípio da Restrição
- As limitações impostas pelo poder de polícia devem ser INTERPRETADAS RESTRITIVAMENTE.
- Em caso de dúvida, prevalece a liberdade do particular.

### 2.2. Princípio do Devido Processo Legal
- Sanções não podem ser aplicadas sem prévio procedimento.
- Garantias: ampla defesa, contraditório, motivação.

### 2.3. Princípio da Proporcionalidade
- A intervenção deve ser PROPORCIONAL ao risco/dano.
- Não pode exceder o necessário.

## 3. Delegação do Poder de Polícia

### 3.1. STF — RE 633.782 (2020)
Definiu o que pode ou não ser delegado:

#### A) NÃO podem exercer poder de polícia
- Pessoas jurídicas de DIREITO PRIVADO (regra).
- Mesmo as concessionárias e permissionárias.

#### B) PODEM exercer poder de polícia
- Pessoas jurídicas de DIREITO PÚBLICO (autarquias, fundações).
- Pessoas jurídicas de DIREITO PRIVADO integrantes da Administração Pública INDIRETA (EP/SEM) prestadoras de SERVIÇO PÚBLICO de regime NÃO concorrencial.

#### C) Tese específica
4 fases podem ser delegadas?
- **Ordem** (norma): NÃO — só lei.
- **Consentimento**: SIM (não exige uso da força).
- **Fiscalização**: SIM (não exige uso da força).
- **Sanção**: SIM, com ressalvas (até multa; uso da força em geral só órgãos públicos).

## 4. Limites Constitucionais

### 4.1. Direitos Fundamentais (CF 5º)
- Devido processo legal.
- Direito ao contraditório e ampla defesa.
- Inviolabilidade do domicílio (salvo flagrante, ordem judicial, desastre, consentimento).
- Direito de ir e vir.

### 4.2. Reserva da Lei
- Limitações a direitos fundamentais só por lei FORMAL.

### 4.3. Função Social
- Polícia atua para que direitos cumpram função social.

## 5. Polícia Administrativa vs Polícia Judiciária

| | Polícia Adm | Polícia Judiciária |
|---|---|---|
| Atua | ANTES do crime | DEPOIS do crime |
| Foco | Prevenção/limitação | Investigação/apuração |
| Regime | Direito Administrativo | Direito Processual Penal |
| Órgãos | Vigilância sanitária, ANVISA, IBAMA, MA | Polícia Federal, Polícia Civil |
| Sanção | Multa, interdição | Indiciamento, prisão |

⚠️ **PEGADINHA**: a "Polícia Militar" exerce em parte funções de polícia ADMINISTRATIVA (policiamento ostensivo), em parte funções da polícia JUDICIÁRIA (em crimes militares).

## 6. Modalidades de Atuação

### 6.1. Preventiva (regra)
- Evita o dano.
- Ex: vistoria sanitária, exame de aptidão.

### 6.2. Repressiva
- Reage ao dano cometido.
- Ex: aplicação de multa, interdição.

### 6.3. Fiscalizadora
- Acompanha continuamente.

## 7. Prescrição da Pretensão Punitiva (Lei 9.873/99)

- **5 anos** para apurar e aplicar sanções em geral.
- A partir da prática do ato OU do conhecimento (em caso de infração permanente).

## 8. Casos Polêmicos

### 8.1. Multa de trânsito
- Exercida pela Adm (DETRAN, PRF, agentes municipais).
- Não exige procedimento formal prévio em flagrante.
- Mas defesa garantida pos-aplicação.

### 8.2. Anvisa, IBAMA, ANS
- São AUTARQUIAS — exercem poder de polícia normalmente.

### 8.3. Concessionária de pedágio
- NÃO exerce poder de polícia (entendimento dominante).

## 9. Como Cebraspe cobra

- **C/E**: "O poder de polícia é predominantemente positivo" → **ERRADO** (negativo — impõe abstenções).
- **C/E**: "Em caso de dúvida na aplicação do poder de polícia, prevalece o interesse da Adm" → **ERRADO** (interpretação restritiva).
- **C/E delegação**: "Adm pode delegar poder de polícia a empresas privadas" → **ERRADO** (STF: só PJ direito público + estatais em regime não concorrencial).
- **C/E**: "A fase de ordem do ciclo pode ser delegada" → **ERRADO** (só lei).
- **C/E**: "Polícia administrativa atua APÓS o crime" → **ERRADO** (atua ANTES — prevenção).
- **C/E**: "Prescrição da pretensão punitiva é de 3 anos" → **ERRADO** (5 anos — Lei 9.873).
$content$,
$resumo$
# Resumo — Poder de Polícia (peculiaridades)

## Características
- Decorre da LEI.
- Atinge particulares EM GERAL.
- Visa BEM COLETIVO.
- Limita DIREITO DE OUTREM.
- Predominantemente NEGATIVO (abstenções).

## Interpretação
- RESTRITIVA (em dúvida, prevalece a liberdade).
- Com devido processo legal.
- Proporcional.

## Delegação (STF RE 633.782)
- PJ direito privado em geral: NÃO.
- PJ direito público (autarquias): SIM.
- Estatais em serviço público não concorrencial: SIM (com ressalvas na sanção).

## Polícia Adm vs Judiciária
- Adm: ANTES do crime.
- Judiciária: DEPOIS do crime.

## Modalidades
Preventiva (regra) | Repressiva | Fiscalizadora.

## Prescrição
**5 anos** (Lei 9.873/99).

## Casos
- Multa trânsito: ok (defesa pos).
- ANVISA/IBAMA: autarquias, exercem.
- Concessionária pedágio: NÃO exerce.

## Top pegadinhas
1. Predominantemente NEGATIVO.
2. Interpretação RESTRITIVA.
3. Particulares NÃO podem (STF).
4. Polícia Adm = PREVENÇÃO.
5. Prescrição = 5 anos.
6. Ordem (norma) NÃO se delega.
$resumo$
);

-- ┌─ 5. Conceito, tipos e formas de controle ────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Conceito, tipos e formas de controle',
  'Controle da Administração Pública — Conceito, Tipos e Formas',
$content$
# Controle da Administração Pública — Conceito, Tipos e Formas

## 1. Conceito

**Controle da Administração** é o conjunto de instrumentos jurídicos e procedimentos pelos quais se verifica a conformidade da atuação administrativa com os parâmetros constitucionais e legais.

⚠️ Visa garantir: legalidade + eficiência + moralidade + economicidade.

## 2. Fundamentos

- CF 70-75 (Sistema de Controle).
- CF 31, 70, 71, 74 e 75.
- Leis específicas (8.443/92 — LOTCU, LC 101/00 — LRF).

## 3. Classificação dos Controles

### 3.1. Quanto ao ÓRGÃO que controla

#### A) Controle Interno
- Realizado dentro do próprio Poder.
- Cada Poder mantém Sistema de Controle Interno (CF 74).
- No Executivo: CGU (Controladoria-Geral da União) + SCI dos Ministérios.

#### B) Controle Externo
- Por órgão de outro Poder ou independente.
- Principal: TCU (auxiliar do Legislativo).
- TCE para Estados, TCM para Municípios capazes.

#### C) Controle Popular/Social
- Pelos cidadãos.
- Ação Popular (Lei 4.717/65), denúncia ao TCU/MP, audiências públicas, controle social.

### 3.2. Quanto ao MOMENTO

#### A) Controle Prévio (a priori)
- Antes da execução.
- Ex: aprovação de licitação pelo TCU.

#### B) Controle Concomitante
- Durante a execução.
- Acompanha em tempo real.

#### C) Controle Posterior (a posteriori)
- Após a execução.
- Ex: prestação de contas.

### 3.3. Quanto à AMPLITUDE

#### A) Controle de LEGALIDADE
- Verifica conformidade com a lei.
- Pode anular o ato.
- Cabível para qualquer órgão (Adm, Judiciário, TCU).

#### B) Controle de MÉRITO
- Verifica conveniência e oportunidade.
- Cabível apenas pelo próprio Poder que praticou o ato (autotutela).
- NÃO cabe ao Judiciário em regra (salvo desvios de discricionariedade).

#### C) Controle de ECONOMICIDADE
- Verifica eficiência da gestão financeira.
- Próprio do TCU.

### 3.4. Quanto à NATUREZA

#### A) Controle Administrativo
- Pela própria Adm (autotutela).

#### B) Controle Legislativo
- Pelo Poder Legislativo + TCU.

#### C) Controle Judicial
- Pelo Poder Judiciário (mediante provocação).

## 4. Controle Administrativo (Autotutela)

### 4.1. Súmulas STF 346 e 473
- Adm pode **ANULAR** seus atos ilegais (Súmula 346).
- Adm pode anular (ilegalidade) e **REVOGAR** (inconveniência) — Súmula 473.

### 4.2. Recursos administrativos
- Lei 9.784/99.
- Recurso à autoridade superior (10 dias).

### 4.3. Prazos
- Decadência para anular ato beneficiando administrado: **5 anos** (Lei 9.784 art. 54).

## 5. Controle Legislativo

### 5.1. Político
- Sustação de atos do Executivo (CF 49 V).
- CPI (CF 58 §3º).
- Impeachment.
- Aprovação de nomes (Senado — CF 52 III).

### 5.2. Financeiro (com auxílio do TCU)
- Apreciação de contas do Presidente.
- Fiscalização contábil, financeira, orçamentária.

## 6. TCU — Tribunal de Contas da União

### 6.1. Natureza
**Órgão de natureza ADMINISTRATIVA**, mas com autonomia constitucional. Auxiliar do Legislativo.

### 6.2. Composição (CF 73)
- 9 ministros.
- Indicados: 1/3 pelo Presidente (2 entre auditores e MP, 1 livre) + 2/3 pelo Congresso.

### 6.3. Atribuições (CF 71)
- Apreciar contas do Presidente (PARECER PRÉVIO).
- Julgar contas dos administradores e demais responsáveis.
- Apreciar legalidade de atos de aposentadoria, reforma, pensão.
- Realizar inspeções e auditorias.
- Aplicar sanções.

### 6.4. Súmula Vinculante 3 do STF
Decisões do TCU contra interessados devem assegurar contraditório e ampla defesa.
**EXCEÇÃO**: apreciação da legalidade da concessão INICIAL de aposentadoria, reforma e pensão (dispensa contraditório).

### 6.5. Súmula Vinculante 21 do STF
Inconstitucional exigir depósito ou arrolamento prévio em recurso administrativo.

## 7. Controle Judicial

### 7.1. Princípio da Inafastabilidade
- CF 5º XXXV: a lei não excluirá da apreciação do Judiciário lesão ou ameaça a direito.

### 7.2. Limite
- Pode controlar LEGALIDADE.
- NÃO pode controlar MÉRITO administrativo (salvo desvio de finalidade ou desproporcionalidade extrema).

### 7.3. Instrumentos
- **Mandado de Segurança** (Lei 12.016/09): direito líquido e certo.
- **Mandado de Injunção**.
- **Habeas Data**.
- **Ação Popular** (Lei 4.717/65).
- **Ação Civil Pública** (Lei 7.347/85).
- **Habeas Corpus**.
- **Ações ordinárias**.

## 8. Controle Social

### 8.1. Instrumentos
- Audiências públicas.
- Conselhos populares.
- Ouvidorias.
- LAI (Lei 12.527/11).
- Denúncia ao TCU, MP, CGU.

### 8.2. Lei 13.460/17 — Código de Defesa do Usuário
- Direitos do usuário de serviços públicos.
- Manifestações: reclamação, denúncia, sugestão, elogio, solicitação.

## 9. Como Cebraspe cobra

- **C/E**: "TCU é órgão do Poder Judiciário" → **ERRADO** (auxilia o Legislativo, mas tem natureza administrativa).
- **C/E**: "Judiciário pode controlar mérito administrativo" → **ERRADO** (regra: só legalidade).
- **C/E**: "Súmula Vinculante 21 permite depósito prévio em recurso" → **ERRADO** (inconstitucional).
- **C/E TCU contas**: "TCU JULGA as contas do Presidente" → **ERRADO** (emite PARECER PRÉVIO; Congresso é que julga).
- **C/E SV 3**: "TCU sempre dá contraditório" → **ERRADO** (exceção: legalidade de concessão inicial de aposentadoria).
- **C/E**: "Decadência para anular ato beneficiando administrado é 10 anos" → **ERRADO** (5 anos — Lei 9.784).
$content$,
$resumo$
# Resumo — Controle da Administração

## Classificação

### Por órgão
- INTERNO (mesmo Poder).
- EXTERNO (outro Poder + TCU).
- POPULAR/SOCIAL.

### Por momento
- PRÉVIO | CONCOMITANTE | POSTERIOR.

### Por amplitude
- LEGALIDADE (qualquer órgão).
- MÉRITO (só próprio Poder).
- ECONOMICIDADE (TCU).

### Por natureza
- Administrativo | Legislativo | Judicial.

## TCU (CF 71-75)
- Auxilia o Legislativo.
- 9 ministros: 1/3 Presidente + 2/3 Congresso.
- Atribuições: apreciar contas Presidente (parecer prévio), julgar contas administradores, legalidade aposentadorias, auditorias, sanções.

## Súmulas Vinculantes
- **SV 3**: TCU dá contraditório (salvo concessão inicial aposentadoria).
- **SV 21**: vedado depósito prévio em recurso administrativo.
- **Súmulas 346/473 STF**: autotutela (anular ilegais + revogar inconvenientes).

## Limites do Judicial
- Controla LEGALIDADE.
- NÃO controla MÉRITO (salvo desvio).
- CF 5º XXXV (inafastabilidade).

## Prazos
- Decadência anular ato beneficiando administrado: 5 anos (Lei 9.784 art. 54).
- Recurso administrativo: 10 dias.

## Top pegadinhas
1. TCU emite PARECER PRÉVIO sobre contas do Presidente (não julga).
2. Judiciário NÃO controla MÉRITO.
3. SV 21: depósito prévio é INCONSTITUCIONAL.
4. SV 3: exceção = concessão inicial aposentadoria.
5. Decadência 5 anos (Lei 9.784).
$resumo$
);

-- ┌─ 6. Obrigatoriedade, dispensa, inexigibilidade e vedação ────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Obrigatoriedade, dispensa, inexigibilidade e vedação',
  'Licitação — Obrigatoriedade, Dispensa, Inexigibilidade e Vedação',
$content$
# Licitação — Obrigatoriedade, Dispensa, Inexigibilidade e Vedação

## 1. Fundamento Constitucional

**CF 37 XXI**: ressalvados os casos especificados em lei, as obras, serviços, compras e alienações da Administração serão contratados mediante **PROCESSO DE LICITAÇÃO PÚBLICA**.

⚠️ Licitação é **REGRA** — contratação direta é **EXCEÇÃO**.

## 2. Obrigatoriedade da Licitação

### 2.1. Quem deve licitar
- União, Estados, DF, Municípios.
- Autarquias, fundações públicas.
- EP, SEM (regra geral — Lei 13.303/16 estatuto próprio).
- Concessionárias (Lei 8.987/95) — quando contratam.

### 2.2. O que sujeita à licitação
- Obras.
- Serviços (inclusive de engenharia).
- Compras.
- Alienações.
- Locações.
- Concessões.
- Permissões.

## 3. Modalidades (Lei 14.133/21)

### 3.1. Pregão (regra para bens e serviços comuns)

### 3.2. Concorrência (obras, serviços e compras qualquer valor)

### 3.3. Concurso (trabalho técnico, científico, artístico)

### 3.4. Leilão (venda de bens)

### 3.5. Diálogo Competitivo (NOVA — inovação, complexidade)

⚠️ **EXTINTAS** pela Lei 14.133: Tomada de Preços + Convite.

## 4. Contratação Direta — Visão Geral

A contratação direta (sem licitação) ocorre em dois casos principais:
- **DISPENSA** (art. 75): a lei dispensa.
- **INEXIGIBILIDADE** (art. 74): a competição é inviável.

Em ambos, há **PROCESSO ADMINISTRATIVO PRÉVIO** com motivação, comprovação dos requisitos e publicidade.

## 5. Dispensa de Licitação (Lei 14.133 art. 75)

⚠️ **Rol TAXATIVO** — apenas as hipóteses previstas em lei.

### 5.1. Por VALOR
- **Obras e engenharia**: até **R$ 100.000** (R$ 119.812,02 em 2024, com correção monetária).
- **Outros serviços e compras**: até **R$ 50.000** (R$ 59.906,02 em 2024).

⚠️ Valores são atualizados anualmente.

### 5.2. Por SITUAÇÕES ESPECIAIS

#### A) Emergência ou calamidade
- Risco iminente.
- Procedimento limitado a 1 ano.

#### B) Resultado de licitação anterior
- Quando deserta ou fracassada (sem ônus para a Adm).

#### C) Aquisição de bens produzidos por instituições nacionais
- ICTs, fundações de apoio.

#### D) Compras de hortifrutigranjeiros
- Diretamente do produtor.

#### E) Aquisição de bens/serviços com órgãos públicos
- Adm Direta + Indireta + paraestatais.

#### F) Material/equipamento militar
- Da indústria nacional.

#### G) Contratação de profissional artístico
- De notório saber.

#### H) Obras/serviços de pequena monta com associações de PCD.

#### I) Mais de 30 hipóteses no art. 75.

### 5.3. Características da Dispensa
- A licitação é POSSÍVEL, mas a lei DISPENSA por opção legislativa.
- Adm pode ainda assim licitar se quiser.

## 6. Inexigibilidade de Licitação (Lei 14.133 art. 74)

⚠️ A competição é **INVIÁVEL**, geralmente porque há fornecedor único ou objeto singular.

### 6.1. Rol EXEMPLIFICATIVO
Diferente da dispensa. Sempre que houver inviabilidade de competição.

### 6.2. Hipóteses do art. 74

#### A) Aquisição de materiais, equipamentos ou gêneros de fornecedor EXCLUSIVO
- Comprovação por carta de exclusividade emitida pelo órgão de proteção da concorrência ou de classe (CADE, SBT/CADE, sindicato).

#### B) Contratação de profissional do setor artístico
- Diretamente ou por empresário exclusivo.
- Consagrado pela crítica especializada ou opinião pública.

#### C) Contratação de serviços técnicos especializados de natureza PREDOMINANTEMENTE intelectual
- Com profissional ou empresa de NOTÓRIA ESPECIALIZAÇÃO.
- Lista do art. 74 §3º: estudos, pesquisas, pareceres, auditorias, fiscalização, treinamento, restauração, consultoria, assessoria.

#### D) Aquisição/locação de IMÓVEL
- Cujas características atendam o interesse (localização, estrutura).

#### E) Credenciamento
- Aberto a todos que preencham requisitos.
- Ex: credenciamento de médicos pelo SUS.

### 6.3. Notória Especialização (art. 74 §3º)
> "Profissional ou empresa cujo conceito no campo de sua especialidade, decorrente de desempenho anterior, estudos, experiências, publicações, organização, aparelhamento, equipe técnica ou outros requisitos relacionados com suas atividades, permita inferir que o seu trabalho é essencial e indiscutivelmente o mais adequado à plena satisfação do objeto do contrato."

## 7. Diferenças DISPENSA x INEXIGIBILIDADE

| | Dispensa | Inexigibilidade |
|---|---|---|
| Possibilidade de competição | SIM (possível) | NÃO (inviável) |
| Rol | TAXATIVO | EXEMPLIFICATIVO |
| Hipóteses | Lista do art. 75 | Inviabilidade da competição |
| Exemplos | Valor pequeno, emergência | Fornecedor único, profissional consagrado |

## 8. Vedações

### 8.1. Vedação à Adesão a Ata SRP de outro órgão
- Lei 14.133 restringiu adesões a atas de registro de preços.

### 8.2. Vedação ao Fracionamento
- Não se pode fracionar contratação para fugir da modalidade adequada.

### 8.3. Vedação à Participação
Veda a participação de:
- Servidor envolvido.
- Empresa que tenha gestor ou controlador parente do servidor (até 3º grau).
- Empresa cujo controlador foi sancionada com inidoneidade.

### 8.4. Inidoneidade
Empresas declaradas inidôneas (art. 156): proibidas de contratar por até **6 anos**.

## 9. Processo Administrativo Prévio (art. 72)

Mesmo em contratação direta:
- Documento de formalização da demanda.
- Estudo Técnico Preliminar (ETP).
- Pesquisa de preços.
- Termo de Referência.
- Razões da escolha.
- Justificativa do preço.
- Justificativa da contratação direta.
- Parecer jurídico.
- Aprovação da autoridade.

## 10. Como Cebraspe cobra

- **C/E**: "Dispensa de licitação é caso de inviabilidade de competição" → **ERRADO** (é INEXIGIBILIDADE; dispensa é por opção legislativa).
- **C/E**: "O rol de dispensa é exemplificativo" → **ERRADO** (TAXATIVO).
- **C/E**: "Notória especialização exige consagração internacional" → **ERRADO** (basta no campo de atuação).
- **C/E**: "Para emergência, basta a alegação do agente" → **ERRADO** (exige comprovação do risco iminente).
- **C/E**: "Em contratação direta NÃO há processo administrativo" → **ERRADO** (art. 72 exige).
- **C/E**: "Inidoneidade pode durar até 2 anos" → **ERRADO** (até 6 anos pós Lei 14.133).
$content$,
$resumo$
# Resumo — Obrigatoriedade, Dispensa, Inexigibilidade e Vedação

## Regra
CF 37 XXI: licitação obrigatória. Contratação direta é EXCEÇÃO.

## Dispensa (art. 75)
- Rol TAXATIVO.
- Por VALOR: obras até R$ 100k / outros até R$ 50k (atualizados).
- Por SITUAÇÃO: emergência, deserta, hortifrutigranjeiros, militar, artista pequeno, com órgão público.

## Inexigibilidade (art. 74)
- Rol EXEMPLIFICATIVO — sempre que competição for INVIÁVEL.
- Fornecedor EXCLUSIVO + carta de exclusividade.
- Profissional artístico consagrado.
- Serviço técnico especializado intelectual + NOTÓRIA ESPECIALIZAÇÃO.
- Aquisição/locação de imóvel.
- Credenciamento.

## Diferença

| | Dispensa | Inexigibilidade |
|---|---|---|
| Competição | Possível | Inviável |
| Rol | TAXATIVO | EXEMPLIFICATIVO |

## Vedações
- Adesão a ata SRP de outro órgão.
- Fracionamento.
- Participação de servidor envolvido ou parente.
- Inidoneidade até **6 anos**.

## Processo Administrativo Prévio (art. 72)
Demanda + ETP + pesquisa preços + TR + justificativa + parecer jurídico + autorização.

## Top pegadinhas
1. Dispensa ≠ Inexigibilidade.
2. Rol dispensa TAXATIVO; inexigibilidade EXEMPLIFICATIVO.
3. Emergência exige COMPROVAÇÃO.
4. Inidoneidade 6 anos pós Lei 14.133.
5. Contratação direta tem processo administrativo.
$resumo$
);

-- ┌─ 7. Fontes; princípios; ilícito disciplinar; procedimentos ──────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Fontes; princípios; ilícito de direito administrativo disciplinar; procedimentos disciplinares da administração pública.',
  'Direito Administrativo Disciplinar — Fontes, Princípios, Ilícito e Procedimentos',
$content$
# Direito Administrativo Disciplinar — Fontes, Princípios, Ilícito e Procedimentos

## 1. Conceito

**Direito Administrativo Disciplinar** é o ramo do Direito Administrativo que regula a **apuração de infrações** funcionais e a **aplicação de sanções** a servidores públicos e particulares com vínculo especial com a Administração.

## 2. Fontes

### 2.1. Constituição Federal
- CF 5º XXXIX (legalidade penal/disciplinar) — exige tipificação.
- CF 5º LIV (devido processo legal).
- CF 5º LV (contraditório e ampla defesa).
- CF 37 (princípios da Administração).
- CF 41 (perda do cargo).

### 2.2. Leis
- **Lei 8.112/90**: Estatuto dos Servidores Federais — define infrações e sanções.
- **Lei 9.784/99**: Processo Administrativo Federal — aplica-se subsidiariamente.
- Estatutos estaduais e municipais.
- Estatutos específicos (militares, magistratura, MP).

### 2.3. Atos Infralegais
- Decretos, instruções, portarias.

## 3. Princípios do Direito Disciplinar

### 3.1. Legalidade
- Só lei pode tipificar infração e sanção.
- CF 5º XXXIX adaptado: "no direito disciplinar, certo grau de tipificação é exigido".

### 3.2. Devido Processo Legal
- CF 5º LIV.
- Procedimento previsto em lei.

### 3.3. Contraditório e Ampla Defesa
- CF 5º LV.
- Direito de se manifestar, produzir provas, ser ouvido.

### 3.4. Motivação
- Lei 9.784 art. 50.
- Toda decisão fundamentada.

### 3.5. Verdade Material
- Busca da verdade dos fatos (não meramente formal).

### 3.6. Oficialidade
- Comissão e autoridades podem agir de ofício.

### 3.7. Proporcionalidade
- Sanção proporcional à gravidade.

### 3.8. Pluralidade de Instâncias
- Possibilidade de recurso (Lei 9.784).

### 3.9. Informalismo Moderado
- Procedimento simples, sem rigorismos.

### 3.10. Presunção de Inocência
- CF 5º LVII.

## 4. Ilícito Administrativo Disciplinar

### 4.1. Conceito
**Ilícito Disciplinar** é o descumprimento de DEVER FUNCIONAL ou prática de conduta PROIBIDA por servidor público (ou particular com vínculo especial).

### 4.2. Tipicidade
- Não tão rigorosa quanto na esfera penal.
- Admite-se tipo aberto ("conduta incompatível").

### 4.3. Independência das Esferas
- Disciplinar é **AUTÔNOMA** em relação à penal e civil (Lei 8.112 art. 125).
- **EXCEÇÃO**: absolvição penal por **inexistência do fato** ou **negativa de autoria** AFASTA disciplinar e civil.

### 4.4. Deveres (Lei 8.112 art. 116)
- Exercer com zelo e dedicação.
- Ser leal às instituições.
- Cumprir ordens superiores **salvo manifestamente ilegais**.
- Atender com presteza.
- Levar irregularidades ao superior.
- Zelar pela economia.
- Guardar sigilo.
- Manter conduta compatível.
- Ser assíduo e pontual.
- Tratar com urbanidade.
- Representar contra ilegalidade.

### 4.5. Proibições (Lei 8.112 art. 117)
- Ausentar-se sem autorização.
- Retirar documento sem permissão.
- Recusar fé a documentos públicos.
- Promover manifestação de apreço/desapreço.
- Cometer a outro servidor suas atribuições.
- Coagir/aliciar subordinados a partido político.
- Manter conduta incompatível com moralidade.
- Receber propinas.
- Praticar usura.
- Exercer comércio (salvo como acionista).
- Atuar como procurador junto à Administração.

### 4.6. Penalidades (Lei 8.112 art. 127)
1. Advertência.
2. Suspensão (até 90 dias).
3. Demissão.
4. Cassação de aposentadoria.
5. Destituição de cargo em comissão.
6. Destituição de função comissionada.

### 4.7. Demissão (Lei 8.112 art. 132)
- Crime contra Administração.
- Abandono de cargo (30+ dias contínuos).
- Inassiduidade habitual (60 dias intercalados em 12 meses).
- Improbidade.
- Insubordinação grave.
- Ofensa física.
- Aplicação irregular de dinheiros públicos.
- Revelação de segredo.
- Lesão aos cofres públicos.
- Corrupção.
- Acumulação ilegal.
- Transgressão das proibições mais graves do art. 117.

## 5. Procedimentos Disciplinares

### 5.1. Sindicância (Lei 8.112 arts. 143-145)
- Procedimento preliminar.
- Pode ser:
  - **Inquisitorial/Preparatória**: sem contraditório; busca elementos.
  - **Contraditória**: com defesa; pode aplicar advertência ou suspensão até 30 dias.
- Resultado: arquivamento, instauração de PAD, ou sanção leve.
- Prazo: 30 dias prorrogáveis.

### 5.2. Processo Administrativo Disciplinar (PAD) (Lei 8.112 arts. 148-182)

#### A) Cabimento
- Sanções graves: suspensão > 30 dias, demissão, cassação, destituição.

#### B) Comissão
- 3 servidores ESTÁVEIS.
- Designados pela autoridade competente.

#### C) Fases (art. 151)
1. **Instauração** (portaria).
2. **Instrução** (provas, oitivas).
3. **Defesa** escrita.
4. **Relatório** da comissão.
5. **Julgamento** pela autoridade.

#### D) Prazo
- 60 dias + 60 dias prorrogáveis (art. 152).

#### E) Direitos do Indiciado
- Ampla defesa, contraditório, advogado, acesso aos autos, produção de provas.

### 5.3. Rito Sumário
Aplicável em casos específicos:
- Acumulação ilegal de cargos.
- Abandono de cargo.
- Inassiduidade habitual.
- Prazo: 30 dias + 15 prorrogáveis.

### 5.4. Recursos
- Pedido de reconsideração (10 dias para a mesma autoridade).
- Recurso à autoridade superior (10 dias).
- Revisão (a qualquer tempo se houver fato novo).

## 6. Prescrição Disciplinar (Lei 8.112 art. 142)

- **5 anos**: infrações puníveis com demissão, cassação, destituição.
- **2 anos**: infrações puníveis com suspensão.
- **180 dias**: infrações puníveis com advertência.

Início: data em que o fato se tornou conhecido.
Interrupção: pela instauração de sindicância ou PAD.

⚠️ Pegadinha: se o ilícito também é crime, aplica-se o prazo prescricional da lei penal (Lei 8.112 art. 142 §2º).

## 7. Direitos do Acusado

- Ser citado pessoalmente.
- Acompanhar o processo (inclusive por advogado).
- Produzir provas.
- Arrolar testemunhas.
- Apresentar defesa escrita.
- Recorrer.

## 8. Como Cebraspe cobra

- **C/E**: "O direito disciplinar exige tipicidade rigorosa como no direito penal" → **ERRADO** (tipicidade relativa; admite tipo aberto).
- **C/E**: "Sindicância pode aplicar pena de demissão" → **ERRADO** (só PAD).
- **C/E PAD**: "Comissão do PAD é composta por 5 servidores" → **ERRADO** (3 estáveis).
- **C/E**: "Absolvição penal sempre afasta a sanção administrativa" → **ERRADO** (só inexistência do fato ou negativa de autoria).
- **C/E**: "Pode-se aplicar pena disciplinar sem contraditório" → **ERRADO** (CF 5º LV).
- **C/E**: "Prescrição da pretensão demissória é de 2 anos" → **ERRADO** (5 anos — art. 142 I).
$content$,
$resumo$
# Resumo — Direito Administrativo Disciplinar

## Fontes
CF (5º XXXIX, LIV, LV; 37; 41) + Lei 8.112 + Lei 9.784 + estatutos.

## Princípios
Legalidade, devido processo, contraditório e ampla defesa, motivação, verdade material, oficialidade, proporcionalidade, presunção de inocência.

## Ilícito Disciplinar
- Tipicidade RELATIVA (aceita tipo aberto).
- Independência (Lei 8.112 art. 125), salvo absolvição penal por inexistência do fato ou negativa de autoria.

## Deveres (art. 116)
Zelo, lealdade, presteza, sigilo, urbanidade, representação contra ilegalidades.

## Proibições (art. 117)
Recusar fé, propinas, usura, comércio, procurador junto à Adm.

## Penalidades (art. 127)
1. Advertência | 2. Suspensão (90d) | 3. Demissão | 4. Cassação aposentadoria | 5/6. Destituição.

## Demissão (art. 132)
Crime adm, abandono 30d contínuos, inassiduidade 60d em 12m, improbidade, corrupção, acumulação ilegal.

## Sindicância x PAD

| | Sindicância | PAD |
|---|---|---|
| Quando | Preliminar | Sanção grave |
| Comissão | — | 3 estáveis |
| Sanção máxima | Adv ou 30d susp | Qualquer |
| Prazo | 30d | 60+60d |

## Rito Sumário
Para: acumulação ilegal, abandono, inassiduidade.

## Prescrição (art. 142)
- Demissão/cassação: 5 anos.
- Suspensão: 2 anos.
- Advertência: 180 dias.

## Top pegadinhas
1. Tipicidade RELATIVA.
2. Sindicância NÃO demite.
3. PAD = 3 estáveis.
4. Absolvição afasta SE inexistência fato OU negativa autoria.
5. Prescrição demissão = 5 anos.
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
