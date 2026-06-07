-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 10 — Previdenciário + Financeiro + Internacional + Anticrime
-- Data: 2026-06-07
--
-- 4 materiais densos (DRAFT — aguarda revisão admin):
--  - Direito Previdenciário: RGPS + EC 103/19 + Benefícios
--  - Direito Financeiro: Orçamento (PPA + LDO + LOA + LRF)
--  - Direito Internacional Público: Tratados + Migração + Cooperação
--  - Penal Especial: Anticrime + Drogas (11.343) + Lavagem (9.613) + Org Criminosa (12.850)
--
-- Cria 4 topics novos. IDEMPOTENTE. Preserva REVIEWED/PUBLISHED.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-previdenciario';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'RGPS, Benefícios e Reforma EC 103/19', 'prev-rgps-beneficios-ec103', 1.3, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'RGPS, Benefícios e Reforma EC 103/19');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-financeiro-e-tributario';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Orçamento Público — PPA, LDO, LOA e LRF', 'fin-orcamento-ppa-ldo-loa-lrf', 1.2, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Orçamento Público — PPA, LDO, LOA e LRF');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-internacional-publico-e-cooperacao-internacional';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Tratados, Migração e Cooperação Internacional', 'intl-tratados-migracao-cooperacao', 1.3, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Tratados, Migração e Cooperação Internacional');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Pacote Anticrime e Leis Penais Especiais', 'pen-anticrime-leis-especiais', 1.4, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Pacote Anticrime e Leis Penais Especiais');
  END IF;
END $topics$;

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

-- ┌─ 1. PREVIDENCIÁRIO — RGPS + Reforma ─────────────────────────────────────┐
SELECT upsert_material(
  'direito-previdenciario',
  'RGPS, Benefícios e Reforma EC 103/19',
  'Direito Previdenciário — RGPS, Benefícios e Reforma EC 103/19',
$content$
# Direito Previdenciário — RGPS, Benefícios e Reforma EC 103/19

Tema central em editais de PF Delegado, INSS Técnico, Receita Federal, BB e bancários. A Reforma de 2019 (EC 103) mudou o jogo — Cebraspe cobra DEMAIS os novos requisitos.

## 1. Seguridade Social — CF 194

Três pilares:
- **Saúde**: art. 196 — direito de todos, universal e gratuita (SUS).
- **Assistência Social**: art. 203 — independe de contribuição. LOAS (Lei 8.742/93).
- **Previdência Social**: art. 201 — caráter contributivo e compulsório.

### 1.1. Princípios (CF 194 §ú)

- Universalidade da cobertura e atendimento.
- Uniformidade e equivalência entre urbanos/rurais.
- Seletividade e distributividade.
- Irredutibilidade do valor dos benefícios.
- Equidade na forma de participação.
- Diversidade da base de financiamento.
- Caráter democrático e descentralizado da administração.

## 2. Regimes Previdenciários

### 2.1. Regime Geral (RGPS)

- Lei 8.213/91 (benefícios) + Lei 8.212/91 (custeio).
- Administrado pelo **INSS**.
- Obrigatório para trabalhadores da iniciativa privada + facultativos.

### 2.2. Regimes Próprios (RPPS)

- Servidores públicos efetivos (federais, estaduais, municipais).
- Lei 9.717/98 (normas gerais).
- Pós-EC 103/19: contribuição mínima 14% (servidor) + União paga conforme regulamento.

### 2.3. Regime Complementar

- Privado (PGBL, VGBL).
- Servidor federal: FUNPRESP (LC 152/15).

## 3. Segurados (RGPS)

### 3.1. Obrigatórios

- **Empregado**: CLT, contratado por PJ ou PF.
- **Empregado doméstico** (Lei 11.324/06).
- **Contribuinte individual**: autônomos, sócios de empresa, profissionais liberais.
- **Trabalhador avulso**: portuário, marítimo (com sindicato).
- **Segurado especial**: produtor rural, pescador artesanal, regime de economia familiar.

### 3.2. Facultativos

- Estudante maior de 16.
- Dona/dono de casa.
- Síndico.
- Brasileiro residente no exterior (se não estiver sob outro regime).

### 3.3. Dependentes (art. 16 Lei 8.213/91)

**Classe I** (presumida dependência econômica):
- Cônjuge, companheiro(a) (inclusive homoafetivo — STF), filhos menores de 21 ou inválidos ou com deficiência intelectual/mental grave.

**Classe II**: pais.

**Classe III**: irmão menor de 21 ou inválido.

> Classe I exclui as demais. Concorrem entre si.

## 4. Benefícios do RGPS

### 4.1. Aposentadorias (PÓS-REFORMA — EC 103/19)

#### Aposentadoria por idade + tempo de contribuição (regra geral)

- **Homem**: 65 anos de idade + 20 anos de contribuição.
- **Mulher**: 62 anos de idade + 15 anos de contribuição.
- Já filiados em 13/11/2019: regras de transição (pedágio, pontuação, idade progressiva).

#### Aposentadoria por idade (rural)

- Homem 60, Mulher 55 + 15 anos de atividade rural.

#### Aposentadoria por incapacidade permanente (antiga "invalidez")

- Após perícia. RMI: 60% + 2% por ano que exceder 20 (homem) ou 15 (mulher) de contribuição.
- 100% se decorrer de acidente do trabalho ou doença profissional.

#### Aposentadoria especial

- Atividade em condições insalubres/perigosas.
- Idade mínima + tempo de contribuição na atividade especial.

### 4.2. Outros benefícios

- **Auxílio por incapacidade temporária** (antigo "auxílio-doença"): 91% do salário de benefício.
- **Salário-maternidade**: 120 dias (CF 7º XVIII).
- **Salário-família**: cota por filho ≤ 14 anos.
- **Pensão por morte**: cota família 50% + 10% por dependente, máximo 100%. Cônjuge pode perder se < 4 contribuições antes do óbito.
- **Auxílio-reclusão**: dependentes de segurado de baixa renda preso em regime fechado.

### 4.3. RMI — Renda Mensal Inicial

Cálculo: **média de TODOS os salários de contribuição** desde julho/94 (não mais "80% maiores" da regra antiga).

## 5. Custeio (Lei 8.212/91)

### 5.1. Contribuintes

- **Trabalhadores**: alíquota progressiva 7,5% a 14% (CR 28/19).
- **Empresas**: 20% folha + RAT (1%, 2% ou 3%) + outras.
- **Microempreendedor Individual (MEI)**: 5% do SM.
- **Domésticos** (Simples Doméstico): 8% trabalhador + 8% empregador + 0,8% RAT.

### 5.2. Salário de contribuição

- Mínimo: SM (R$ 1.412 em 2025; revisado anualmente).
- Máximo (teto): atualizado anualmente (≈ R$ 7.786 em 2024).

## 6. Acidente do Trabalho

### 6.1. Cobertura

- Lei 8.213/91 + CF 7º XXVIII.
- Doenças profissionais e do trabalho equiparadas a acidente.

### 6.2. CAT (Comunicação de Acidente do Trabalho)

- Prazo: até 1º dia útil seguinte.
- Pode ser feita pelo empregado/sindicato se empregador omisso.

### 6.3. Estabilidade acidentária

- 12 meses após cessação do auxílio (CF 7º + Súmula 378 TST).

## 7. EC 103/19 — Reforma da Previdência

### 7.1. Mudanças centrais

- Idade mínima para todos (eliminou "regra dos 30/35 anos puros").
- Cálculo do salário benefício: **média de todos**.
- Pensão por morte: alíquotas e cota familiar.
- Servidor federal sob 14% obrigatório.
- Regras de transição para já filiados.

### 7.2. Regras de transição (já filiados em 13/11/2019)

1. **Pedágio 50%**: faltava menos de 2 anos → contribuir 50% adicional.
2. **Pedágio 100%**: faltava mais de 2 anos + idade mínima → contribuir 100% adicional.
3. **Pontuação**: idade + tempo de contribuição (96/86 — sobe 1 por ano).
4. **Idade progressiva**: idade aumenta gradualmente.

## 8. Como Cebraspe cobra

- **C/E aposentadoria**: "Mulher se aposenta com 60 anos e 15 de contribuição" → **ERRADO** (62 anos pós-Reforma).
- **C/E pensão**: "Pensão por morte é sempre 100% da aposentadoria" → **ERRADO** (50% + 10% por dependente, máx 100%).
- **C/E dependentes**: "Filhos maiores de 21 não inválidos são dependentes" → **ERRADO** (perdem a condição).
- **C/E EC 103**: "Servidor federal contribui com 11% pós-Reforma" → **ERRADO** (mínimo 14%).
- **C/E CAT**: "CAT deve ser feita em 30 dias" → **ERRADO** (1º dia útil seguinte).
$content$,
$resumo$
# Resumo Estratégico — Previdenciário (pós-EC 103/19)

## Seguridade

Saúde + Assistência (LOAS) + Previdência.

## Regimes

- RGPS (Lei 8.213/91): privado + facultativos → INSS.
- RPPS: servidores efetivos (mínimo 14% pós-Reforma).
- Complementar: FUNPRESP, PGBL, VGBL.

## Segurados obrigatórios

Empregado, doméstico, contribuinte individual, avulso, segurado especial.

## Dependentes (3 classes)

I: cônjuge/companheiro, filhos < 21 ou inválidos | II: pais | III: irmãos < 21/inválidos.
Classe I exclui demais.

## Aposentadorias pós-Reforma

| Tipo | Requisitos |
|---|---|
| Idade + Tempo | H 65a + 20c · M 62a + 15c |
| Rural | H 60a · M 55a + 15 ativ. rural |
| Incapacidade permanente | Perícia: RMI 60% + 2% por ano excedente; 100% se acidente |
| Especial | Condições insalubres + idade + tempo |

## Outros benefícios

- Aux. incapacidade temporária: 91% SB.
- Salário-maternidade: 120 dias.
- Pensão morte: 50% + 10% por dependente, máx 100%.
- Aux-reclusão: baixa renda, regime fechado.

## CAT

- 1º dia útil seguinte.
- Estabilidade 12 meses pós-cessação.

## Top pegadinhas Cebraspe

1. Mulher: 62 anos (não 60) + 15 contribuição.
2. Pensão NÃO é 100% — é 50% + 10% por dependente.
3. EC 103: servidor mínimo 14%.
4. CAT: 1º dia útil (não 30).
5. RMI: média de TODOS (não 80% maiores).
$resumo$
);

-- ┌─ 2. FINANCEIRO — Orçamento + LRF ────────────────────────────────────────┐
SELECT upsert_material(
  'direito-financeiro-e-tributario',
  'Orçamento Público — PPA, LDO, LOA e LRF',
  'Orçamento Público — PPA, LDO, LOA e Lei de Responsabilidade Fiscal',
$content$
# Orçamento Público — PPA, LDO, LOA e LRF

Constitucional + Lei 4.320/64 + LC 101/00 (LRF). Cebraspe cobra principalmente prazos, princípios e vedações.

## 1. Princípios Orçamentários

- **Unidade**: cada ente tem UM orçamento.
- **Universalidade**: todas receitas/despesas no orçamento.
- **Anualidade/Periodicidade**: orçamento para um exercício (= ano civil).
- **Exclusividade**: LOA só com matéria orçamentária.
- **Equilíbrio**: receitas = despesas.
- **Não afetação** (CF 167 IV): vedada vinculação da receita de impostos a órgão/fundo/despesa (exceções: saúde 15%, educação 18% União/25% E-M, FUNDEB, garantia operação de crédito).
- **Especialidade**: detalhamento da despesa.
- **Publicidade**.
- **Programação**.
- **Legalidade**.

## 2. Leis Orçamentárias (CF 165)

### 2.1. Plano Plurianual (PPA)

- Duração: **4 anos** (do 2º ano de governo ao 1º do próximo).
- Diretrizes, objetivos, metas regionalizadas.
- Envio: até 31/08 do 1º ano de mandato.
- Devolução: até 22/12.

### 2.2. Lei de Diretrizes Orçamentárias (LDO)

- Periodicidade: anual.
- Conteúdo: metas, prioridades, alterações tributárias, política de aplicação das agências.
- Anexo de Metas Fiscais (LRF art. 4º §1º).
- Anexo de Riscos Fiscais.
- Envio: até 15/04.
- Devolução: até 17/07 (antes do recesso).

### 2.3. Lei Orçamentária Anual (LOA)

- Período: anual (1º jan a 31 dez).
- Compreende:
  - Orçamento Fiscal.
  - Orçamento de Investimento das estatais.
  - Orçamento da Seguridade Social.
- Envio: até 31/08.
- Devolução: até 22/12.

### 2.4. Tabela de prazos

| Lei | Envio | Devolução |
|---|---|---|
| PPA | 31/08 (1º ano) | 22/12 (1º ano) |
| LDO | 15/04 | 17/07 |
| LOA | 31/08 | 22/12 |

## 3. Ciclo Orçamentário

1. **Elaboração**: Executivo.
2. **Apreciação/Discussão**: Legislativo.
3. **Execução**: Executivo (dotação → empenho → liquidação → pagamento).
4. **Controle**: Interno + Externo (TCU/TCE).

## 4. Receitas Públicas

### 4.1. Classificação

**Quanto à origem**:
- Originárias (do patrimônio do Estado).
- Derivadas (tributos, multas).

**Quanto à regularidade**:
- Ordinárias (recorrentes).
- Extraordinárias (eventuais).

### 4.2. Estágios

Previsão → Lançamento → Arrecadação → Recolhimento.

## 5. Despesas Públicas

### 5.1. Estágios

Fixação → Empenho → Liquidação → Pagamento.

- **Empenho** (Lei 4.320 art. 58): ato emanado de autoridade competente que cria obrigação de pagamento. Não pode ultrapassar o crédito orçamentário.
- **Liquidação** (art. 63): verificação do direito adquirido pelo credor.
- **Pagamento**: ordem bancária.

### 5.2. Classificação

**Quanto à natureza**:
- **Correntes** (custeio): pessoal, juros, transferências.
- **De Capital** (investimentos): obras, aquisição de bens, amortização da dívida.

**Quanto à essencialidade**:
- Ordinárias.
- Extraordinárias.

## 6. Créditos Adicionais

- **Suplementares**: reforço de dotação existente. Por lei. Pode autorizar até 25% via LOA.
- **Especiais**: criação de novas despesas. Por lei + decreto.
- **Extraordinários**: imprevisíveis e urgentes (calamidade, guerra). MP + abre crédito imediatamente.

## 7. LRF — LC 101/00

### 7.1. Objetivos

- Gestão fiscal responsável.
- Limites para endividamento.
- Equilíbrio entre receitas e despesas.

### 7.2. Limites de despesa de pessoal

- **União**: 50% da Receita Corrente Líquida (RCL).
- **Estados/DF**: 60% da RCL.
- **Municípios**: 60% da RCL.

Distribuição (Estados):
- Legislativo + TCE: 3%.
- Judiciário: 6%.
- Executivo: 49%.
- MP: 2%.

### 7.3. Limites de endividamento

- Estados: 200% da RCL (Res. Senado).
- Municípios: 120% da RCL.

### 7.4. Renúncia de receita (art. 14)

- Estimativa de impacto orçamentário em 3 exercícios.
- Demonstrar que renúncia foi considerada no LDO.
- Acompanhada de medidas de compensação.

### 7.5. Restos a Pagar

- Despesas empenhadas e não pagas até 31/12.
- Processados (já liquidados) e não processados.
- Vedação ao final de mandato (LRF art. 42): proibido contrair obrigação que não possa ser cumprida.

### 7.6. Transparência

- Relatório Resumido da Execução Orçamentária (RREO): bimensal.
- Relatório de Gestão Fiscal (RGF): quadrimestral (mun. < 50.000 pode anual).
- LDO publicada em audiência pública.

## 8. Como Cebraspe cobra

- **C/E PPA**: "O PPA tem vigência de 4 anos, do 1º ano de mandato ao 4º" → **ERRADO** (do 2º ao 1º do próximo).
- **C/E LDO**: "LDO é trienal" → **ERRADO** (anual).
- **C/E LRF pessoal**: "Limite de despesa de pessoal da União é 60%" → **ERRADO** (50%).
- **C/E créditos**: "Crédito extraordinário precisa de lei autorizativa prévia" → **ERRADO** (abre por MP imediatamente).
- **C/E não afetação**: "Pode-se vincular qualquer receita de imposto" → **ERRADO** (vedado, salvo exceções).
- **C/E LOA**: "LOA pode trazer dispositivos sobre matéria não-orçamentária" → **ERRADO** (princípio da exclusividade — CF 165 §8º).
$content$,
$resumo$
# Resumo Estratégico — Orçamento Público

## Princípios

Unidade, Universalidade, Anualidade, Exclusividade, Equilíbrio, **Não-afetação**, Especialidade, Publicidade, Programação, Legalidade.

## Leis (CF 165)

| Lei | Período | Envio | Devolução |
|---|---|---|---|
| **PPA** | 4 anos | 31/08 (1º ano) | 22/12 |
| **LDO** | Anual | 15/04 | 17/07 |
| **LOA** | Anual | 31/08 | 22/12 |

## LOA inclui

Fiscal + Investimento estatais + Seguridade Social.

## Despesa — estágios

Fixação → Empenho → Liquidação → Pagamento.

## Receita — estágios

Previsão → Lançamento → Arrecadação → Recolhimento.

## Créditos Adicionais

- Suplementares: reforço.
- Especiais: novas despesas (Lei).
- Extraordinários: imprevisíveis/urgentes (MP, imediato).

## LRF — Limites Pessoal (RCL)

| Ente | % RCL |
|---|---|
| União | 50% |
| Estados/DF | 60% |
| Municípios | 60% |

## LRF — Endividamento (Res. Senado)

- Estados: 200% RCL.
- Municípios: 120% RCL.

## Final de mandato (LRF 42)

Vedado contrair obrigação não cumprível.

## Top pegadinhas Cebraspe

1. PPA: 2º ano ao 1º do próximo.
2. LDO ANUAL (não trienal).
3. União pessoal: 50% (não 60%).
4. Crédito extraordinário por MP, sem lei prévia.
5. Não-afetação tem exceções (saúde, educação, FUNDEB).
$resumo$
);

-- ┌─ 3. INTERNACIONAL — Tratados + Migração ─────────────────────────────────┐
SELECT upsert_material(
  'direito-internacional-publico-e-cooperacao-internacional',
  'Tratados, Migração e Cooperação Internacional',
  'Direito Internacional Público — Tratados, Migração e Cooperação',
$content$
# Direito Internacional Público — Tratados, Migração e Cooperação

Matéria 10q no edital de PF Delegado. Foco em **tratados, migração (Lei 13.445/17), cooperação policial/jurídica**.

## 1. Direito Internacional Público — Bases

### 1.1. Fontes (CIJ Estatuto art. 38)

- Tratados internacionais.
- Costume internacional.
- Princípios gerais do direito.
- Doutrina e jurisprudência (subsidiários).

### 1.2. Sujeitos

- Estados (sujeitos primários).
- Organizações Internacionais (ONU, OEA, OTAN, OMC, OIT).
- Indivíduos (cada vez mais reconhecidos — DH).
- Coletividades não estatais.

## 2. Tratados Internacionais (Convenção de Viena de 1969)

### 2.1. Conceito

Acordo internacional concluído entre Estados em forma escrita e regido pelo direito internacional.

### 2.2. Fases (no Brasil)

1. **Negociação**: Executivo (Itamaraty).
2. **Assinatura**: pelo Presidente ou representante.
3. **Aprovação pelo Congresso Nacional** (CF 49 I): por decreto legislativo.
4. **Ratificação**: ato presidencial — comunica internacionalmente.
5. **Promulgação**: por decreto do Presidente.
6. **Publicação no DOU**: torna obrigatório internamente.

### 2.3. Tratados de DH

- CF 5º §3º: tratados de DH aprovados nas duas Casas em 2 turnos com 3/5 → equivalência a EC.
- Demais tratados de DH: status supralegal (acima de lei comum, abaixo da CF) — STF RE 466.343/SP.
- Outros tratados: status de lei ordinária.

### 2.4. Vigência

- Internacional: conforme tratado dispuser.
- Interno: após promulgação.

## 3. Personalidade Internacional do Estado

### 3.1. Elementos do Estado

- Território.
- População.
- Governo soberano.
- Capacidade de entrar em relações com outros Estados (Convenção Montevidéu 1933).

### 3.2. Reconhecimento

- Reconhecimento de Estado: declaratório.
- Reconhecimento de Governo: político.

### 3.3. Sucessão de Estados

- Por anexação, separação, fusão.
- Regras: Convenção Viena 1978 (não ratificada amplamente).

## 4. Asilo e Refúgio

### 4.1. Asilo

- **Diplomático**: concedido em embaixadas. Tradicional na América Latina.
- **Territorial**: concedido no território do Estado.
- Para perseguição POLÍTICA.
- Direito do Estado (não do indivíduo).

### 4.2. Refúgio (Lei 9.474/97)

- Convenção ONU 1951 + Protocolo 1967.
- Fundado temor de perseguição por motivos de raça, religião, nacionalidade, grupo social, opinião política.
- **CONARE**: Comitê Nacional para Refugiados.
- Direito subjetivo do indivíduo.
- Princípio do **non-refoulement** (não-devolução): proíbe devolução ao território onde sofra perseguição.

### 4.3. Diferenças

| | Asilo | Refúgio |
|---|---|---|
| Convenção | Latinoamericana | ONU 1951 |
| Tipo perseguição | Política | Raça, religião, nacionalidade, grupo, opinião |
| Concedido por | Ato político do Estado | Decisão CONARE |
| Natureza | Discricionária | Vinculada |

## 5. Migração — Lei 13.445/17

### 5.1. Princípios

- Universalidade, indivisibilidade, interdependência dos DH.
- Repúdio à discriminação.
- Não-criminalização da migração.
- Acolhida humanitária.
- Inclusão social, laboral e produtiva.
- Promoção de regularização documental.

### 5.2. Categorias de migrantes

- **Imigrante**: pessoa nacional de outro país que se estabelece transitória ou definitivamente.
- **Emigrante**: brasileiro que se estabelece transitória ou definitivamente no exterior.
- **Residente fronteiriço**: nacional de país limítrofe.
- **Visitante**: para estadias de curta duração.
- **Apátrida**: pessoa que nenhum Estado reconhece como nacional.

### 5.3. Vistos (art. 12)

- **Visita** (turismo, negócio, trânsito, atividade artística/desportiva).
- **Temporário** (trabalho, estudo, pesquisa, reunião familiar, acolhida humanitária, tratamento de saúde).
- **Diplomático**.
- **Oficial**.
- **Cortesia**.

### 5.4. Residência

- Direito à residência: brasileiros (nato/naturalizado) e imigrantes regularmente admitidos.
- Autorização de residência.

### 5.5. Medidas de retirada compulsória

- **Repatriação**: medida administrativa de devolução ao país de origem.
- **Deportação**: imigrante em situação irregular.
- **Expulsão**: ato discricionário do Executivo (crime grave + análise de vínculos).

### 5.6. Extradição (art. 81)

- Entrega de pessoa pra responder a crime em outro país.
- **Requisitos**:
  - Tratado ou promessa de reciprocidade.
  - Crime previsto em ambos países (dupla tipicidade).
  - Pena não inferior a 1 ano.
  - Não pode ser crime político.
  - Não cabível para brasileiro nato (CF 5º LI). Naturalizado pode ser extraditado por crime comum cometido ANTES da naturalização ou tráfico ilícito de drogas.

### 5.7. Naturalização

- Ordinária: 4 anos de residência + leitura/escrita do português + ausência de condenação penal.
- Extraordinária: 15 anos de residência ininterrupta + ausência de condenação penal.
- Especial: matrimônio com brasileiro/a, filhos brasileiros.
- Provisória: criança/adolescente.

## 6. Cooperação Internacional

### 6.1. Modalidades

- **Cooperação policial**: Interpol, intercâmbio de informações.
- **Cooperação jurídica**:
  - **Auxílio direto**: pedido entre autoridades centrais.
  - **Carta rogatória**: pedido de juiz a juiz estrangeiro.
  - **Extradição**: entrega de pessoa.
  - **Homologação de sentença estrangeira**.

### 6.2. Convenções importantes

- **Palermo** (Decreto 5.015/04): crime organizado transnacional.
- **Mérida** (Decreto 5.687/06): corrupção.
- **Tráfico de pessoas** (Decreto 5.017/04).
- **Sequestro internacional de crianças** (Haia 1980).

### 6.3. Autoridades Centrais

- **DRCI** (Departamento de Recuperação de Ativos e Cooperação Jurídica Internacional) — Min. Justiça.
- **PGR** (em algumas matérias).

### 6.4. Atribuição da PF (art. 144 CF + Lei)

- Polícia marítima, aeroportuária e de fronteiras.
- Cooperação com Interpol.
- Combate ao tráfico de drogas e pessoas.

## 7. Como Cebraspe cobra

- **C/E**: "Brasileiro nato pode ser extraditado em casos de tráfico" → **ERRADO** (CF 5º LI — nato nunca).
- **C/E tratados**: "Tratados de DH têm sempre status constitucional" → **ERRADO** (só se aprovados pelo rito do CF 5º §3º; demais = supralegal).
- **C/E asilo x refúgio**: "Refúgio é discricionário, asilo é vinculado" → **ERRADO** (oposto).
- **C/E migração**: "A criminalização de imigrantes é princípio da Lei 13.445" → **ERRADO** (princípio é NÃO-criminalização).
- **C/E non-refoulement**: "É permitido devolver refugiado a país onde sofra perseguição" → **ERRADO** (princípio absoluto).
- **C/E naturalização**: "Naturalização ordinária exige 15 anos de residência" → **ERRADO** (4 anos; 15 é extraordinária).
$content$,
$resumo$
# Resumo Estratégico — Internacional Público

## Tratados — Fases BR

Negociação (Executivo) → Assinatura → Aprovação Congresso (Dec. Leg.) → Ratificação Presidente → Promulgação (Decreto) → Publicação DOU.

## Hierarquia tratados

- DH com rito 5º §3º: EC.
- DH demais: SUPRALEGAL (STF RE 466.343).
- Outros: lei ordinária.

## Asilo x Refúgio

| | Asilo | Refúgio |
|---|---|---|
| Base | LatAm | ONU 1951 |
| Perseguição | Política | Raça, religião, nacionalidade, grupo, opinião |
| Natureza | DISCRICIONÁRIA | VINCULADA (CONARE) |

⚠️ **Non-refoulement**: nunca devolver a perseguição.

## Lei 13.445/17 — Migração

- Princípios: não-criminalização, acolhida humanitária.
- Vistos: visita, temporário, diplomático, oficial, cortesia.
- Retirada: repatriação, deportação, expulsão.

## Extradição

- Exige tratado ou reciprocidade + dupla tipicidade + pena ≥ 1 ano + crime não político.
- Brasileiro nato: NUNCA.
- Naturalizado: crime ANTES da naturalização OU tráfico de drogas.

## Naturalização

| Tipo | Anos |
|---|---|
| Ordinária | 4 anos |
| Extraordinária | 15 anos ininterruptos |
| Especial | Matrimônio, filhos BR |

## Cooperação jurídica

- Auxílio direto.
- Carta rogatória.
- Extradição.
- Homologação sentença estrangeira.

## Convenções relevantes

- Palermo (crime organizado transnacional).
- Mérida (corrupção).
- Tráfico de pessoas.
- Haia 1980 (sequestro internacional crianças).

## Top pegadinhas Cebraspe

1. Brasileiro NATO: NUNCA extraditado.
2. Tratado DH: precisa rito 5º §3º p/ ser EC.
3. Refúgio = VINCULADO; Asilo = DISCRICIONÁRIO.
4. Migração: NÃO-criminalização é princípio.
5. Non-refoulement é ABSOLUTO.
6. Naturalização ordinária = 4 anos.
$resumo$
);

-- ┌─ 4. PENAL ESPECIAL — Anticrime + Leis Especiais ─────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Pacote Anticrime e Leis Penais Especiais',
  'Pacote Anticrime e Leis Penais Especiais (Drogas, Lavagem, Organização Criminosa)',
$content$
# Pacote Anticrime e Leis Penais Especiais

PF Delegado e similares cobram MUITO Leis Especiais. Foco aqui: **Pacote Anticrime (Lei 13.964/19)**, Drogas (11.343/06), Lavagem (9.613/98), Organização Criminosa (12.850/13).

## 1. Pacote Anticrime — Lei 13.964/19

### 1.1. Contexto

Modificou CP, CPP, Lei de Execução Penal e várias leis especiais. Algumas inovações foram suspensas pelo STF (juiz de garantias).

### 1.2. Principais mudanças no CP

- **Art. 25 §ú** — Legítima defesa: agente de segurança pública em conflito armado ou risco iminente de violência → exclui ilicitude (acrescentado).
- **Art. 75** — Limite de tempo de cumprimento: **40 anos** (era 30).
- **Art. 83** — Livramento condicional: requisitos endurecidos.
- **Art. 91-A** — Confisco alargado: bens que sejam fruto/produto de crime + cuja existência seja incompatível com renda lícita.
- **Art. 121 §1º** — Homicídio cometido em concurso com 2+ pessoas: causa de aumento.

### 1.3. CPP

- **Juiz de garantias** (arts. 3º-A a 3º-F): juiz da investigação ≠ juiz da instrução. STF suspendeu em 2020 (ADI), retomada gradual em 2024.
- **Cadeia de custódia da prova** (158-A a 158-F).
- **Acordo de não persecução penal** (28-A): MP propõe alternativa ao processo. Requisitos: confissão circunstanciada, pena mínima < 4 anos, sem violência/grave ameaça, não reincidente, sem antecedentes.

### 1.4. Outras mudanças

- **Banco Nacional de Perfis Genéticos** (Lei 12.037/09 modificada): obrigatoriedade para certos crimes hediondos.
- **Execução de pena por crime hediondo**: progressão muda — exige 40% (réu primário), 50% (com violência ou grave ameaça em hediondo) etc.

## 2. Lei de Drogas — Lei 11.343/06

### 2.1. Princípios

- SISNAD (Sistema Nacional de Políticas Públicas sobre Drogas).
- Diferenciação entre usuário e traficante.

### 2.2. Usuário (art. 28)

- Conduta: porte para consumo pessoal.
- Penas: advertência, prestação de serviços à comunidade, medida educativa.
- **NÃO há prisão para usuário**.
- STF (RE 635.659): porte de maconha para uso pessoal NÃO é crime — apenas infração de menor potencial (decisão 2024, com tese: até 40g ou 6 plantas presumidamente uso pessoal).

### 2.3. Tráfico (art. 33)

- Pena: 5 a 15 anos + multa.
- **§4º**: tráfico privilegiado — primário, bons antecedentes, não dedicado a atividades criminosas, sem integrar org. criminosa → redução de 1/6 a 2/3.
- ⚠️ STJ: tráfico privilegiado NÃO é equiparado a hediondo (Súmula 631 STF cancelada).

### 2.4. Associação para o tráfico (art. 35)

- 2+ pessoas associadas para o tráfico.
- Pena: 3 a 10 anos.

### 2.5. Procedimento

- Investigação especial — infiltração de agentes (art. 53).
- Causas de aumento (art. 40): tráfico transnacional, em transporte público, com violência ou grave ameaça, envolvendo criança/adolescente, em locais de aglomeração.

## 3. Lavagem de Dinheiro — Lei 9.613/98

### 3.1. Conceito

Ocultação ou dissimulação da origem ilícita de bens, direitos ou valores provenientes de infração penal.

### 3.2. Tipos

- **Ocultação**: esconder origem.
- **Dissimulação**: disfarçar.
- **Integração**: reincorporar valores ao sistema.

### 3.3. Crimes antecedentes

Após Lei 12.683/12: **qualquer infração penal** pode ser antecedente (antes era só lista taxativa).

### 3.4. Pena

- Reclusão: 3 a 10 anos + multa.
- §4º: causas de aumento (reiteração, atividade habitual, organização criminosa).

### 3.5. COAF

- Conselho de Controle de Atividades Financeiras (hoje vinculado ao Bacen).
- Recebe comunicações de operações suspeitas.

### 3.6. Comunicação obrigatória (art. 11)

- Pessoas obrigadas (bancos, financeiras, cartórios, joalherias, advogados em algumas operações).
- Comunicação de operações em espécie acima de R$ 10.000.

### 3.7. Tese da "cegueira deliberada"

STF/STJ: agente que assume risco e finge não ver origem ilícita = responde.

## 4. Organização Criminosa — Lei 12.850/13

### 4.1. Conceito (art. 1º §1º)

Associação de **4 ou mais pessoas** estruturalmente ordenada, com divisão de tarefas, para obter vantagem por crimes com pena máxima ≥ 4 anos OU caráter transnacional.

### 4.2. Pena

- Reclusão: 3 a 8 anos + multa.
- Causas de aumento: emprego de arma, participação de criança, transnacionalidade, funcionário público.

### 4.3. Investigação

- **Colaboração premiada** (arts. 4º-7º): acordo entre delator e MP.
- Requisitos: voluntariedade, identificação de coautores, recuperação de bens, prevenção de novos crimes.
- Benefícios: redução até 2/3, substituição por restritivas, perdão judicial, não-oferecimento de denúncia.
- Homologação pelo juiz (não imposta pela parte).

### 4.4. Ação controlada (art. 8º)

Retardamento da intervenção policial para acompanhar a evolução criminosa.

### 4.5. Infiltração de agentes (arts. 10-14)

- Autorização judicial.
- Prazo: 6 meses, renovável.

### 4.6. Captação ambiental e interceptação telefônica

- Captação ambiental: agora em Lei 9.296/96 (modificada pelo Anticrime).
- Interceptação telefônica: Lei 9.296/96 — autorização judicial, 15 dias prorrogáveis.

## 5. Outras Leis Especiais Relevantes

- **Lei dos Crimes Hediondos** (8.072/90): rol taxativo (CF 5º XLIII).
- **Lei Maria da Penha** (11.340/06): violência doméstica e familiar contra a mulher.
- **Lei das Contravenções Penais** (Decreto-Lei 3.688/41).
- **Lei de Armas de Fogo** (10.826/03 — Estatuto).
- **Lei 8.069/90** (ECA — crimes específicos).

## 6. Como Cebraspe cobra

- **C/E Anticrime**: "O limite máximo de cumprimento de pena é de 30 anos" → **ERRADO** (40 anos pós-Anticrime).
- **C/E drogas**: "Porte para uso pessoal de maconha é crime" → **CUIDADO** (STF 2024: descriminalizou até 40g/6 plantas; ainda é infração de menor potencial).
- **C/E tráfico privilegiado**: "Tráfico privilegiado é equiparado a hediondo" → **ERRADO** (STF cancelou Súmula 631).
- **C/E lavagem**: "Crime antecedente da lavagem deve constar de lista taxativa" → **ERRADO** (qualquer infração penal — Lei 12.683/12).
- **C/E orgcrim**: "Organização criminosa é a associação de 3 ou mais pessoas" → **ERRADO** (4 ou mais — Lei 12.850).
- **C/E delação**: "A homologação da delação é obrigatória pelo juiz" → **ERRADO** (juiz pode rejeitar se ilegal).
$content$,
$resumo$
# Resumo Estratégico — Anticrime + Leis Especiais

## Pacote Anticrime (Lei 13.964/19)

- Limite cumprimento pena: **40 anos** (era 30).
- Juiz de garantias (suspenso, retomada gradual 2024).
- Cadeia de custódia: arts. 158-A a 158-F CPP.
- ANPP (28-A CPP): pena < 4 anos, sem violência, primário, confissão.
- Confisco alargado (CP 91-A): bens incompatíveis com renda lícita.

## Drogas (Lei 11.343/06)

- Usuário (28): SEM prisão — advertência, serviços, medida educativa.
- STF 2024: até 40g/6 plantas = uso pessoal (não crime).
- Tráfico (33): 5-15 anos.
- Tráfico privilegiado (§4º): primário, bons antecedentes → redução 1/6 a 2/3. **NÃO é hediondo**.
- Associação (35): 3-10 anos.

## Lavagem (Lei 9.613/98)

- Qualquer infração penal pode ser antecedente (Lei 12.683/12).
- Tipos: ocultação, dissimulação, integração.
- Pena: 3-10 anos + multa.
- Comunicação ao COAF: operações em espécie ≥ R$ 10.000.
- Cegueira deliberada: STF/STJ aceita.

## Org. Criminosa (Lei 12.850/13)

- **4 ou mais pessoas** + estruturalmente ordenada + pena máxima ≥ 4a OU transnacional.
- Pena: 3-8 anos.
- Colaboração premiada: redução, substituição, perdão judicial, não-denúncia.
- Ação controlada e infiltração: autorização judicial.

## Interceptação (Lei 9.296/96)

- Autorização judicial.
- 15 dias prorrogáveis.

## Top pegadinhas Cebraspe

1. Limite pena: 40 anos (pós-Anticrime).
2. Tráfico privilegiado NÃO é hediondo.
3. Lavagem: qualquer infração penal é antecedente.
4. Org. criminosa = 4+ pessoas (associação para tráfico = 2+).
5. Maconha < 40g = não é crime (STF 2024).
6. ANPP: pena mínima < 4 anos.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN (
      'direito-previdenciario', 'direito-financeiro-e-tributario',
      'direito-internacional-publico-e-cooperacao-internacional', 'direito-penal'
    )
  );
  RAISE NOTICE 'Onda 10 OK — total de materiais nesses subjects: %', v_count;
END $$;
