-- ════════════════════════════════════════════════════════════════════════════
-- GRANULAR ADM — Batch 5 (8 materiais focados)
-- Data: 2026-06-07
--
-- Topics: Autarquias, Fundações, EP/SEM (Lei 13.303/16), Consórcios,
-- Convênios, OS, OSCIP, Sistema S.
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

-- ┌─ 1. Autarquias ──────────────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Autarquias',
  'Autarquias — Regime Jurídico e Características',
$content$
# Autarquias — Regime Jurídico e Características

## 1. Conceito

**Autarquia** é PJ de **direito público** criada por **LEI ESPECÍFICA** (CF 37 XIX), com **patrimônio próprio** e **autonomia administrativa**, para executar atividades **típicas de Estado**.

⚠️ Cebraspe cobra "lei específica" (não "lei autorizativa") — pegadinha clássica.

## 2. Características Essenciais

### 2.1. Criação
- **LEI ESPECÍFICA** (CF 37 XIX).
- Cada autarquia exige sua própria lei.
- A extinção também por LEI.

### 2.2. Personalidade Jurídica
- **DIREITO PÚBLICO**.

### 2.3. Capacidade
- Autonomia administrativa, financeira e técnica.
- NÃO tem soberania (não é Estado).

### 2.4. Atividades
- Típicas de Estado: poder de polícia, regulamentação, prestação de serviço público específico.

### 2.5. Patrimônio
- Próprio.
- **IMPENHORÁVEL**.
- Bens públicos (uso especial).

### 2.6. Servidores
- **Estatutários** (Lei 8.112 ou estatuto próprio).

### 2.7. Regime Tributário
- **IMUNIDADE TRIBUTÁRIA RECÍPROCA** (CF 150 VI a §2º — autarquia e fundação pública gozam dela).

### 2.8. Pagamento
- Regime de **PRECATÓRIO** (CF 100).

### 2.9. Foro
- Justiça FEDERAL (autarquias federais).

### 2.10. Prazos
- Em DOBRO (CPC 183).

## 3. Espécies de Autarquias

### 3.1. Comuns
- Prestam serviços tradicionais.
- Ex: INSS, IBAMA, INMETRO.

### 3.2. Especiais
- Regime diferenciado em razão da especialização.
- **AGÊNCIAS REGULADORAS**: maior autonomia (mandato fixo dos dirigentes, independência decisória).
- Ex: ANATEL, ANEEL, ANS, ANVISA, ANP, ANAC, ANTT, ANTAQ.

### 3.3. Profissionais (conselhos de fiscalização)
- OAB (peculiar — STF: serviço público autônomo, mas não autarquia).
- CRM, CRO, CREA, CRC.
- Caráter sui generis.

### 3.4. Culturais
- USP, UFRJ.
- Universidades públicas com regime de autarquias.

### 3.5. Associativas
- Consórcios públicos (Lei 11.107/05) — quando se constituem como autarquias interfederativas.

## 4. Agências Reguladoras

### 4.1. Características Especiais
- Mandato FIXO dos dirigentes (sem livre exoneração).
- Aprovação pelo Senado dos dirigentes.
- Independência decisória.
- Quarentena pós-mandato.

### 4.2. Funções
- Normatização (poder regulamentar).
- Fiscalização do setor.
- Solução de conflitos.

### 4.3. Limites
- Não podem invadir competência do Legislativo (legalidade).
- Não podem inovar a ordem jurídica em desconformidade com a lei.

### 4.4. Exemplo de Lei
- ANATEL: Lei 9.472/97.
- ANS: Lei 9.961/00.
- ANVISA: Lei 9.782/99.

## 5. Controle das Autarquias

### 5.1. Controle Finalístico (tutela)
- Pela Adm Direta (Ministério vinculante).
- LIMITADO à finalidade legal.
- NÃO há HIERARQUIA.

### 5.2. Outros controles
- TCU/TCE.
- Judiciário.
- Popular (LAI, denúncias).

## 6. Vinculação x Subordinação

⚠️ Autarquia é VINCULADA a um Ministério, NÃO SUBORDINADA.

| | Vinculação | Subordinação |
|---|---|---|
| Tipo | Finalística | Hierárquica |
| Ordens | NÃO | SIM |
| Controle | Limitado à lei | Total |

## 7. Bens das Autarquias

### 7.1. Regime jurídico
- BENS PÚBLICOS (uso especial).
- Impenhoráveis, imprescritíveis, inalienáveis (regra).

### 7.2. Pagamento
- Precatório (CF 100).
- Exceções: alimentos, pequeno valor (RPV).

## 8. Responsabilidade Civil das Autarquias

### 8.1. CF 37 §6º
- Responsabilidade **OBJETIVA** por atos comissivos.
- Subjetiva por omissão (regra; objetiva em omissão específica).

### 8.2. Direito de Regresso
- Contra o agente, exige dolo ou culpa.

## 9. Servidor de Autarquia

### 9.1. Regime
- Estatutário (Lei 8.112 ou estatuto próprio).

### 9.2. Concurso
- Provimento por concurso público (CF 37 II).

### 9.3. Estabilidade
- 3 anos efetivos + avaliação especial de desempenho.

## 10. Casos Especiais

### 10.1. Conselhos de Fiscalização Profissional (OAB, CRM)
- STF: NÃO são autarquias (RE 595.332).
- OAB é PJ sui generis.
- Demais conselhos têm natureza autárquica especial.

### 10.2. Banco Central
- Autarquia federal especial.
- Lei Complementar 179/21 deu autonomia ao BACEN (mandato dos dirigentes não coincidente com mandato presidencial).

## 11. Como Cebraspe cobra

- **C/E**: "Autarquia é criada por lei autorizativa" → **ERRADO** (lei específica).
- **C/E**: "Autarquia é PJ de direito privado" → **ERRADO** (direito público).
- **C/E**: "Bens de autarquia são penhoráveis" → **ERRADO** (impenhoráveis).
- **C/E**: "Há hierarquia entre Ministério e autarquia" → **ERRADO** (vinculação).
- **C/E**: "Dirigente de agência reguladora pode ser livremente exonerado" → **ERRADO** (mandato fixo).
- **C/E**: "OAB é autarquia comum" → **ERRADO** (sui generis — STF).
$content$,
$resumo$
# Resumo — Autarquias

## Conceito
PJ de DIREITO PÚBLICO, criada por LEI ESPECÍFICA (CF 37 XIX), para atividades típicas de Estado.

## Características
- Direito público.
- Lei específica.
- Bens impenhoráveis.
- Imunidade tributária recíproca (CF 150 VI a §2º).
- Servidores ESTATUTÁRIOS.
- Precatório (CF 100).
- Prazos em DOBRO (CPC 183).
- Foro federal (autarquias federais).

## Espécies
- **Comuns**: INSS, IBAMA, INMETRO.
- **Especiais**: AGÊNCIAS REGULADORAS (ANATEL, ANEEL, ANS).
- **Profissionais**: CRM, CRO, CREA, CRC. OAB SUI GENERIS.
- **Culturais**: USP, UFRJ.
- **Associativas**: consórcios públicos.

## Agências Reguladoras
- Mandato FIXO dos dirigentes.
- Aprovação Senado.
- Independência decisória.

## Controle
- Finalístico (tutela) pela Adm Direta — NÃO hierárquico.
- TCU, Judiciário, popular.

## Bens
- Públicos (uso especial).
- Impenhoráveis, imprescritíveis.

## Casos especiais
- OAB: NÃO é autarquia (RE 595.332).
- BACEN: autonomia LC 179/21.

## Top pegadinhas
1. LEI ESPECÍFICA (não autorizativa).
2. Direito PÚBLICO.
3. Bens IMPENHORÁVEIS.
4. VINCULAÇÃO (não hierarquia).
5. Agências: mandato FIXO.
6. OAB sui generis.
$resumo$
);

-- ┌─ 2. Fundações Públicas ──────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Fundações Públicas',
  'Fundações Públicas — Públicas x Privadas',
$content$
# Fundações Públicas — Públicas x Privadas

## 1. Conceito

**Fundação Pública** é PJ instituída pelo Poder Público para o desenvolvimento de **atividades de interesse social**, dotada de patrimônio próprio destinado a essa finalidade.

⚠️ Polêmica: pode ser de direito PÚBLICO ou PRIVADO.

## 2. Tipos (CF 37 XIX)

### 2.1. Fundação Pública de DIREITO PÚBLICO
- Criada por **LEI específica**.
- Regime semelhante à AUTARQUIA.
- "Autarquias fundacionais".

### 2.2. Fundação Pública de DIREITO PRIVADO
- Lei AUTORIZA a criação (registro civil).
- Regime predominantemente civil (com mitigações).

## 3. Fundação de Direito Público

### 3.1. Características
- Criação: LEI específica (igual autarquia).
- Direito público.
- Servidores ESTATUTÁRIOS.
- Bens públicos (impenhoráveis).
- Imunidade tributária recíproca (CF 150 VI a §2º).
- Precatório.
- Prazos em dobro.
- Foro federal (se federal).

### 3.2. Exemplos
- IBGE (na prática, é considerada autarquia ou fundação pública conforme a abordagem).
- FUNAI.
- FIOCRUZ (Fundação Oswaldo Cruz).
- FUNAR (Fundação Nacional de Artes).
- FUNDACENTRO.

## 4. Fundação de Direito Privado

### 4.1. Características
- Lei AUTORIZA + registro civil.
- Direito privado.
- Bens podem ser penhoráveis (regra; mas em algumas atividades públicas continuam impenhoráveis).
- Servidores: CLT ou estatuto próprio (controversa).
- SEM imunidade tributária recíproca (regra).
- SEM precatório (regra).

### 4.2. Atividades
- Educação, cultura, pesquisa, saúde, assistência.

### 4.3. Exemplos
- Algumas fundações educacionais e culturais.

## 5. Conflito Doutrinário

Há divergência sobre a possibilidade de fundação pública de direito privado:
- **Doutrina majoritária** (Maria Sylvia Zanella Di Pietro): admite (CF 37 XIX permite).
- **Doutrina minoritária** (Celso Antônio Bandeira de Mello): toda fundação pública seria de direito público (autarquia fundacional).

⚠️ **Para Cebraspe**: aplicar a CF (admite ambas).

## 6. Diferenças entre Fundação Pública e Privada

| | Pública (direito público) | Privada (direito privado) |
|---|---|---|
| Criação | Lei ESPECÍFICA | Lei AUTORIZA + registro |
| Regime | Direito público | Direito privado |
| Bens | Públicos (impenhoráveis) | Privados (penhoráveis) |
| Servidores | Estatutários | CLT (ou misto) |
| Imunidade tributária | SIM | NÃO (regra) |
| Precatório | SIM | NÃO |

## 7. Fundação Pública x Fundação Privada (do Código Civil)

### 7.1. Fundação Pública
- Criada pelo Estado.
- Finalidade pública.
- Regime administrativo (mais ou menos intenso).

### 7.2. Fundação Privada (CC 62 e ss)
- Criada por particular.
- Finalidade religiosa, moral, cultural ou de assistência.
- Regime puramente civil.
- Submetida ao MP local (curadoria de fundações).

## 8. Atividades Típicas

### 8.1. Ensino
- Universidades fundacionais.

### 8.2. Pesquisa Científica
- FIOCRUZ.

### 8.3. Assistência Social
- LBA (extinta), Assistência social pública.

### 8.4. Cultura
- Fundação Cultural Palmares, Funarte.

### 8.5. Saúde
- Hemoceiros.

## 9. Controle

### 9.1. Pelo poder concedente/instituidor
- Controle finalístico.

### 9.2. Tribunal de Contas
- Toda fundação pública sujeita-se ao TCU/TCE.

### 9.3. Ministério Público
- Curadoria das fundações (CC).

## 10. Como Cebraspe cobra

- **C/E**: "Fundação Pública é SEMPRE de direito público" → **ERRADO** (pode ser privada — CF 37 XIX).
- **C/E**: "Fundação de direito público se cria por lei autorizativa" → **ERRADO** (lei específica).
- **C/E**: "Bens de fundação de direito público são penhoráveis" → **ERRADO** (impenhoráveis).
- **C/E**: "Imunidade tributária recíproca abrange fundações públicas" → **CORRETO** (CF 150 VI a §2º).
- **C/E**: "IBGE é EP" → **ERRADO** (fundação pública na maioria das definições).
- **C/E**: "Fundação pública de direito privado tem servidores estatutários" → **CUIDADO** (regra: CLT).
$content$,
$resumo$
# Resumo — Fundações Públicas

## Tipos
- DIREITO PÚBLICO (autarquia fundacional).
- DIREITO PRIVADO.

## Fundação de Direito Público
- Lei ESPECÍFICA.
- Direito público.
- Bens impenhoráveis.
- Imunidade tributária.
- Estatutários.
- Precatório.
- Ex: FIOCRUZ, FUNAI, FUNDACENTRO.

## Fundação de Direito Privado
- Lei AUTORIZA + registro civil.
- Direito privado.
- Bens penhoráveis (regra).
- SEM imunidade (regra).
- CLT (regra).

## Comparativo

| | Pública | Privada |
|---|---|---|
| Criação | LEI específica | LEI autoriza + registro |
| Regime | Direito público | Direito privado |
| Bens | Impenhoráveis | Penhoráveis |
| Imunidade | SIM | NÃO |
| Precatório | SIM | NÃO |
| Servidores | Estatutários | CLT |

## Atividades típicas
Ensino, pesquisa, cultura, saúde, assistência social.

## Top pegadinhas
1. PODE ser pública OU privada (CF 37 XIX).
2. Pública: LEI ESPECÍFICA.
3. Privada: LEI AUTORIZA + REGISTRO.
4. Pública: bens IMPENHORÁVEIS + imunidade.
5. Privada: regime civil (regra).
$resumo$
);

-- ┌─ 3. EP e SEM (Lei 13.303/16) ────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Empresas públicas e sociedades de economia mista (Lei 13.303/16)',
  'Empresas Públicas e Sociedades de Economia Mista — Lei 13.303/16',
$content$
# Empresas Públicas e Sociedades de Economia Mista — Lei 13.303/16

## 1. Visão Geral

**EP e SEM** são entidades da **Administração Indireta**, de **direito privado**, criadas por **LEI AUTORIZATIVA** (não específica como autarquia).

Lei 13.303/16 — **Lei das Estatais** — disciplina seu funcionamento.

## 2. Empresa Pública (EP)

### 2.1. Conceito
PJ de direito privado, com **100% de CAPITAL PÚBLICO**, criada por lei autorizativa, para exercer atividade econômica ou prestar serviço público.

### 2.2. Características
- Capital: 100% público (União, Estados, Municípios ou entidades da Indireta).
- **Qualquer forma societária** (S/A, Ltda, etc.).
- Criação: LEI AUTORIZA.
- Servidores: **CLT**.
- Submetida à Lei 13.303/16.
- Foro: federal se federal e em atividade típica.
- Bens em regra penhoráveis (salvo se afetados ao serviço público).

### 2.3. Exemplos
- Caixa Econômica Federal.
- Empresa Brasileira de Correios e Telégrafos (ECT/Correios).
- BNDES.
- Embrapa.
- INFRAERO.

## 3. Sociedade de Economia Mista (SEM)

### 3.1. Conceito
PJ de direito privado, com **CAPITAL MISTO** (controle público), criada por lei autorizativa, sempre em forma de SOCIEDADE ANÔNIMA (S/A).

### 3.2. Características
- Capital MISTO (público + privado).
- Controle público (maioria do capital votante).
- Sempre **S/A**.
- Lei AUTORIZA criação.
- Servidores: **CLT**.
- Acionistas privados.
- Bens em regra penhoráveis.

### 3.3. Exemplos
- Banco do Brasil.
- Petrobras.
- Eletrobrás.

## 4. EP x SEM (Comparativo)

| | EP | SEM |
|---|---|---|
| Capital | 100% público | MISTO (controle público) |
| Forma | Qualquer | SEMPRE S/A |
| Acionistas privados | NÃO | SIM |
| Exemplo | Caixa, Correios, BNDES | BB, Petrobras |

## 5. Em Atividade Econômica x Serviço Público

### 5.1. EP/SEM em ATIVIDADE ECONÔMICA (CF 173)
- Regime jurídico semelhante ao do setor privado.
- SEM imunidade tributária recíproca.
- Bens penhoráveis.
- SEM precatório.
- Submissão à CLT + regime jurídico aplicável aos privados.

### 5.2. EP/SEM em SERVIÇO PÚBLICO
- Regime próximo da Fazenda Pública.
- STF reconheceu para Correios:
  - Imunidade tributária recíproca (RE 220.906).
  - Impenhorabilidade de bens em alguns casos.

### 5.3. Caso Caixa Econômica
- Atividade econômica (banco) + serviços de utilidade pública (loterias).

## 6. Lei 13.303/16 — Lei das Estatais

### 6.1. Aplicação
- EP, SEM e suas subsidiárias da União, Estados, DF e Municípios.

### 6.2. Governança Corporativa
- Conselho de Administração + Conselho Fiscal + Comitê de Auditoria.
- Diretoria executiva.
- Código de conduta e integridade.

### 6.3. Função Social
Devem cumprir função social (art. 27):
- Geração de empregos.
- Promoção do desenvolvimento.
- Preservação do meio ambiente.
- Defesa do consumidor.

### 6.4. Licitações (arts. 28-89)
- Regime próprio simplificado (não Lei 14.133, salvo casos específicos).
- Modalidade preferencial: PREGÃO.
- Dispensa e inexigibilidade próprias.
- Limites menores que na 14.133.

### 6.5. Contratação
- Procedimento competitivo.
- Princípios: legalidade, impessoalidade, moralidade, publicidade, eficiência.

### 6.6. Pessoal
- Concurso público (CF 37 II).
- Regime CLT.
- Plano de cargos e remunerações.

## 7. Subsidiárias

CF 37 XX: a criação de subsidiárias e a participação em empresas privadas dependem de **autorização legislativa**.

⚠️ STF entende que basta UMA lei autorizando a EP/SEM mãe (não precisa de lei para cada subsidiária — Súmula Vinculante 46).

## 8. Distinção: Atividade Econômica vs Monopólio

### 8.1. Atividade Econômica (CF 173)
- Estado intervém excepcionalmente.
- Sob regime privado.

### 8.2. Monopólio (CF 177)
- Petróleo, gás, minerais nucleares.
- Atividade exclusiva da União ou sua delegação.

## 9. Sucessão Trabalhista

- Súmula 331 TST: terceirização lícita não gera vínculo direto, mas EP/SEM tomadora é responsável SUBSIDIARIAMENTE.

## 10. Como Cebraspe cobra

- **C/E**: "EP tem capital MISTO" → **ERRADO** (100% público; SEM é mista).
- **C/E**: "SEM pode adotar forma de Ltda" → **ERRADO** (sempre S/A).
- **C/E**: "Servidores de EP/SEM são estatutários" → **ERRADO** (CLT).
- **C/E**: "Correios NÃO têm imunidade tributária" → **ERRADO** (STF reconhece).
- **C/E**: "EP/SEM em atividade econômica gozam de imunidade tributária recíproca" → **ERRADO**.
- **C/E**: "Para cada subsidiária precisa de lei autorizativa específica" → **ERRADO** (SV 46).
$content$,
$resumo$
# Resumo — EP e SEM (Lei 13.303/16)

## EP
- 100% capital público.
- Qualquer forma.
- Lei AUTORIZA.
- CLT.
- Ex: Caixa, Correios, BNDES.

## SEM
- Capital MISTO.
- Sempre S/A.
- Lei AUTORIZA.
- CLT.
- Ex: BB, Petrobras, Eletrobrás.

## EP x SEM

| | EP | SEM |
|---|---|---|
| Capital | 100% púb | Misto |
| Forma | Qualquer | S/A |

## Atividade econômica x Serviço público
- Econômica (CF 173): SEM imunidade, bens penhoráveis.
- Serviço público: regime próximo da Fazenda. Correios: imunidade (STF).

## Lei 13.303/16
- Governança corporativa (CA + CF + Comitê).
- Função social (art. 27).
- Licitações próprias (PREGÃO preferencial).
- Concurso público.

## Subsidiárias (CF 37 XX)
- Autorização legislativa.
- SV 46: uma lei pra mãe basta.

## Top pegadinhas
1. EP = 100% público; SEM = misto.
2. SEM sempre S/A.
3. CLT (não estatutário).
4. Correios = imunidade tributária (RE 220.906).
5. SV 46: uma lei autoriza mãe + subsidiárias.
6. Lei 13.303/16 é o estatuto das estatais.
$resumo$
);

-- ┌─ 4. Consórcios Públicos (Lei 11.107/05) ─────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Consórcios públicos (Lei 11.107/05)',
  'Consórcios Públicos — Lei 11.107/05',
$content$
# Consórcios Públicos — Lei 11.107/05

## 1. Conceito

**Consórcio Público** é a **associação** de entes da Federação (União, Estados, DF, Municípios) para realização de objetivos de **interesse comum**, com personalidade jurídica própria.

⚠️ Fundamento: CF 241 + Lei 11.107/05.

## 2. Personalidade Jurídica

### 2.1. Dupla possibilidade

#### A) Consórcio Público de DIREITO PÚBLICO
- **ASSOCIAÇÃO PÚBLICA** — espécie de **AUTARQUIA**.
- Integra a Administração INDIRETA de TODOS os entes consorciados.

#### B) Consórcio Público de DIREITO PRIVADO
- Atende às normas civis (CC 53 e ss).
- Regime predominantemente privado.

### 2.2. Escolha da personalidade
- Definida no Protocolo de Intenções.
- Ratificada pelas leis dos entes consorciados.

## 3. Constituição

### 3.1. Etapas

#### A) Protocolo de Intenções
- Documento preliminar entre os entes interessados.
- Define objetivos, área de atuação, contribuições financeiras, regras de funcionamento.

#### B) Ratificação por LEI
- Cada ente consorciado deve aprovar lei ratificando o protocolo.

#### C) Contrato de Consórcio
- Celebrado após as ratificações.
- Cria o consórcio com personalidade jurídica.

#### D) Contrato de Rateio (anual)
- Estabelece as contribuições anuais de cada ente.

## 4. Características

### 4.1. Personalidade
Própria (pública ou privada).

### 4.2. Patrimônio
Próprio (formado por bens cedidos pelos entes).

### 4.3. Servidores
- Pode ter quadro próprio (concurso).
- Pode receber servidores cedidos.

### 4.4. Vinculação
- A TODOS os entes consorciados.

## 5. Finalidades Típicas

- Saúde (consórcios intermunicipais).
- Saneamento básico.
- Resíduos sólidos.
- Cultura e turismo.
- Educação.
- Infraestrutura compartilhada.

## 6. Vantagens

- Economia de escala.
- Compartilhamento de recursos.
- Eficiência na prestação de serviços.

## 7. Contrato de Rateio

### 7.1. Finalidade
Define a parcela financeira de cada ente.

### 7.2. Anualidade
- Anual (regra).
- Pode ser plurianual no caso de gestão associada de serviço público específico ou para amortização de bens financiados.

### 7.3. Falta de previsão orçamentária
- Sanção: o ente pode ser excluído do consórcio.

## 8. Lei 11.107/05 — Pontos Importantes

### 8.1. Cessão de servidores (art. 4º §4º)
Lei pode autorizar a cessão de servidor para o consórcio.

### 8.2. Limitação à criação de empregos
Lei 11.107: vedada a criação de empregos públicos no consórcio (regra geral; servidores são cedidos).

### 8.3. Direito de retirada
Cada ente pode se retirar do consórcio (com ratificação por lei).

### 8.4. Dissolução
Por deliberação dos entes consorciados.

## 9. Controle

### 9.1. Pelo Tribunal de Contas
- TCU se houver participação federal.
- TCEs/TCMs.

### 9.2. Pela Câmara/Assembleia dos entes consorciados.

### 9.3. Judicial.

## 10. Como Cebraspe cobra

- **C/E**: "Consórcio público é SEMPRE de direito público" → **ERRADO** (pode ser privado).
- **C/E**: "Consórcio de direito público integra a Adm Indireta de TODOS os entes consorciados" → **CORRETO**.
- **C/E**: "Consórcio público é criado por mero protocolo de intenções" → **ERRADO** (exige lei + contrato).
- **C/E**: "Servidor de consórcio público é OBRIGATORIAMENTE servidor de carreira do próprio consórcio" → **ERRADO** (pode receber cedidos).
- **C/E**: "Contrato de rateio é decenal" → **ERRADO** (anual, em regra).
- **C/E**: "Falta de previsão orçamentária NÃO gera exclusão" → **ERRADO**.
$content$,
$resumo$
# Resumo — Consórcios Públicos

## Conceito
Associação de entes federativos com personalidade jurídica para fins comuns (CF 241 + Lei 11.107/05).

## Personalidade
- DIREITO PÚBLICO: associação pública (espécie de autarquia).
- DIREITO PRIVADO: regime civil.

## Etapas de constituição
1. Protocolo de Intenções.
2. Ratificação por LEI de cada ente.
3. Contrato de Consórcio.
4. Contrato de Rateio (anual).

## Características
- Personalidade própria.
- Patrimônio próprio.
- Servidores: quadro próprio OU cedidos.
- Integra Adm Indireta de TODOS os consorciados (se público).

## Finalidades típicas
Saúde, saneamento, resíduos, cultura, educação, infraestrutura.

## Contrato de Rateio
- Anual (regra).
- Plurianual em casos específicos.
- Falta de previsão orçamentária → exclusão.

## Controle
TCU/TCE/TCM + Câmara/Assembleia + Judiciário.

## Direito de retirada
Permitido com ratificação por lei.

## Top pegadinhas
1. Personalidade pode ser PÚBLICA OU PRIVADA.
2. Público = autarquia interfederativa.
3. Integra Indireta de TODOS os consorciados.
4. Rateio = ANUAL.
5. Servidor pode ser cedido (não obrigatoriamente próprio).
6. Exige lei + contrato (não só protocolo).
$resumo$
);

-- ┌─ 5. Convênios e Termos de Cooperação ────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Convênios e termos de cooperação',
  'Convênios, Termos de Cooperação e Instrumentos Congêneres',
$content$
# Convênios, Termos de Cooperação e Instrumentos Congêneres

## 1. Visão Geral

São instrumentos jurídicos para **COOPERAÇÃO** entre entes públicos ou entre o Poder Público e entidades privadas SEM finalidade lucrativa, com **OBJETIVOS COMUNS**.

⚠️ Diferem dos contratos administrativos: não há interesses opostos, mas COINCIDENTES.

## 2. Convênio

### 2.1. Conceito
Acordo de **vontades** entre entes públicos ou entre Poder Público e particular SEM fins lucrativos, para realizar objetivos de **interesse mútuo**.

### 2.2. Características
- **CONVERGÊNCIA** de interesses (não oposição).
- Sem ânimo de lucro.
- NÃO há remuneração de uma parte pela outra.
- Cada parte mantém autonomia.
- Não exige licitação (regra).

### 2.3. Convênio x Contrato

| | Convênio | Contrato |
|---|---|---|
| Interesses | Convergentes | Opostos |
| Remuneração | Não há (regra) | SIM (preço) |
| Lucro | Vedado | Esperado |
| Licitação | NÃO (regra) | SIM (regra) |
| Liberdade de retirada | SIM | LIMITADA |

### 2.4. Aplicação
- Convênios entre União e Estados (saúde, educação).
- Convênios entre Municípios e ONGs.

## 3. Termo de Cooperação

### 3.1. Conceito
Instrumento celebrado entre **ÓRGÃOS** ou **ENTIDADES** da Administração Pública (Federal entre si), em substituição ao convênio em algumas hipóteses.

### 3.2. Características
- Para descentralização de crédito orçamentário.
- Entre entes da mesma esfera ou de esferas diferentes.

### 3.3. Decreto 6.170/07 (atualizado por Decreto 11.531/23)
- Disciplina convênios e termos de cooperação no âmbito federal.

## 4. Lei 13.019/14 — Marco Regulatório das Organizações da Sociedade Civil (OSC)

### 4.1. Objeto
Disciplina parcerias entre Adm Pública e OSCs.

### 4.2. Conceito de OSC
- Entidade privada SEM fins lucrativos.
- Voltada a atividades de interesse social.

### 4.3. Instrumentos novos (substituem convênios em muitos casos)
- **Termo de Colaboração**: Adm escolhe a parceira (objeto definido pela Adm).
- **Termo de Fomento**: OSC define o objeto (Adm apoia iniciativa da OSC).
- **Acordo de Cooperação**: sem transferência de recursos.

### 4.4. Chamamento Público
Em regra, exigido para escolha da parceira (transparência).

### 4.5. Dispensas e Inexigibilidades
Em casos específicos.

## 5. Contrato de Gestão

### 5.1. Conceito
Instrumento celebrado entre o Poder Público e:
- **Organizações Sociais (OS)** — Lei 9.637/98.
- **Agências Executivas** (autarquia/fundação qualificada como agência executiva).

### 5.2. Características
- Define metas de desempenho.
- Em troca de recursos públicos ou autonomia.
- Avaliação periódica.

### 5.3. Diferença do convênio
- Contrato de Gestão tem METAS específicas e prestação de contas.
- Convênio tem objeto mais aberto.

## 6. Termo de Parceria

### 6.1. Conceito
Instrumento celebrado entre Poder Público e **OSCIP** (Organização da Sociedade Civil de Interesse Público — Lei 9.790/99).

### 6.2. Características
- Fomento à atividade da OSCIP.
- Não exige licitação (escolha por chamamento ou direto).

## 7. Comparativo dos Instrumentos

| Instrumento | Entidade | Lei |
|---|---|---|
| **Convênio** | Adm + Adm OU + particular SEM fins lucrativos | Lei 8.666 (revogada parcialmente) / Lei 14.133 |
| **Termo de Cooperação** | Adm Federal entre si | Decreto 6.170/07 |
| **Termo de Colaboração** | Adm + OSC | Lei 13.019/14 |
| **Termo de Fomento** | Adm + OSC (iniciativa OSC) | Lei 13.019/14 |
| **Acordo de Cooperação** | Adm + OSC (sem recursos) | Lei 13.019/14 |
| **Contrato de Gestão** | Adm + OS / Agência Executiva | Lei 9.637/98 |
| **Termo de Parceria** | Adm + OSCIP | Lei 9.790/99 |

## 8. Prestação de Contas

Toda parceria com transferência de recursos públicos:
- Prestação de contas detalhada.
- Pela entidade beneficiária.
- Em prazos legais.
- Sob fiscalização do TCU/TCE/TCM.

## 9. Sanções por Descumprimento

- Devolução dos recursos.
- Inscrição em cadastro de inadimplentes.
- Impedimento de contratar/conveniar.
- Improbidade administrativa (gestores).

## 10. Como Cebraspe cobra

- **C/E**: "Convênio exige licitação como contrato" → **ERRADO** (NÃO exige, em regra).
- **C/E**: "Convênio gera obrigação de remuneração" → **ERRADO** (não há remuneração).
- **C/E**: "Termo de Colaboração e Termo de Fomento têm a mesma origem da iniciativa" → **ERRADO** (Colaboração = Adm; Fomento = OSC).
- **C/E**: "Contrato de Gestão é celebrado com OSCIP" → **ERRADO** (com OS; OSCIP é Termo de Parceria).
- **C/E**: "Acordo de Cooperação envolve transferência de recursos" → **ERRADO** (não envolve).
- **C/E**: "Convênio gera vínculo de subordinação" → **ERRADO** (autonomia mantida).
$content$,
$resumo$
# Resumo — Convênios e Termos de Cooperação

## Convênio
- Acordo de vontades + CONVERGÊNCIA de interesses.
- Sem fins lucrativos.
- Sem remuneração.
- Sem licitação (regra).

## Convênio x Contrato

| | Convênio | Contrato |
|---|---|---|
| Interesses | Convergentes | Opostos |
| Remuneração | Não | Sim |
| Licitação | Não (regra) | Sim |

## Termo de Cooperação
- Entre órgãos da Adm Federal.
- Decreto 6.170/07.

## Lei 13.019/14 (OSCs)
- **Termo de Colaboração**: Adm define o objeto.
- **Termo de Fomento**: OSC define o objeto.
- **Acordo de Cooperação**: sem transferência de recursos.
- Chamamento público obrigatório (regra).

## Contrato de Gestão
- OS (Lei 9.637/98).
- Agências Executivas.
- Metas + recursos/autonomia.

## Termo de Parceria
- OSCIP (Lei 9.790/99).

## Top pegadinhas
1. Convênio NÃO exige licitação (regra).
2. Convênio = SEM remuneração + SEM lucro.
3. Termo de Colaboração: iniciativa da ADM; Fomento: iniciativa da OSC.
4. Contrato de Gestão = OS; Termo de Parceria = OSCIP.
5. Convênio = autonomia (sem subordinação).
$resumo$
);

-- ┌─ 6. Organizações Sociais (OS — Lei 9.637/98) ────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Organizações Sociais (OS)',
  'Organizações Sociais (OS) — Lei 9.637/98',
$content$
# Organizações Sociais (OS) — Lei 9.637/98

## 1. Conceito

**Organização Social (OS)** é uma **PJ de direito PRIVADO**, **SEM fins lucrativos**, que recebe da Administração a **QUALIFICAÇÃO** como OS por atender aos requisitos da Lei 9.637/98, podendo desempenhar atividades em colaboração com o Poder Público mediante **CONTRATO DE GESTÃO**.

⚠️ Pertence ao **TERCEIRO SETOR**. NÃO é entidade da Administração Indireta.

## 2. Características

### 2.1. Natureza
- PJ de DIREITO PRIVADO.
- SEM fins lucrativos.

### 2.2. Áreas de atuação (art. 1º)
- Ensino.
- Pesquisa científica.
- Desenvolvimento tecnológico.
- Proteção e preservação do meio ambiente.
- Cultura.
- Saúde.

### 2.3. Qualificação
- Pelo Poder Executivo respectivo (Federal, Estadual, Municipal).
- Discricionária.

## 3. Requisitos para Qualificação

### 3.1. Estatutos
- Disposição expressa da natureza social das atividades.
- Finalidade não lucrativa.
- Aplicação integral de receitas em suas atividades.

### 3.2. Conselho de Administração
- Composição mista (membros do Poder Público + sociedade civil).

### 3.3. Aprovação
- Ministro/Secretário da área afim aprova a qualificação.

## 4. Contrato de Gestão

### 4.1. Conceito
Acordo entre Poder Público e OS, com:
- METAS de desempenho.
- Recursos (orçamentários, bens, servidores).
- Autonomia da OS.

### 4.2. Cláusulas
- Especificação do programa de trabalho.
- Estipulação de metas.
- Critérios de avaliação.
- Recursos a serem repassados.

### 4.3. Avaliação
- Periódica.
- Pode levar à RESCISÃO se descumprir.

## 5. Vantagens das OS

### 5.1. Para a Administração
- Foco em resultados (não meios).
- Maior eficiência.
- Compartilhamento de recursos.

### 5.2. Para a OS
- Recursos públicos.
- Bens públicos cedidos.
- Servidores cedidos.

## 6. Recursos Públicos

### 6.1. Transferência
- Por meio do contrato de gestão.
- Dinheiro, bens e servidores cedidos.

### 6.2. Submissão a Controles
- TCU/TCE/TCM.
- MP.
- Auditoria.

### 6.3. Prestação de Contas
- Anual.
- Detalhada.

## 7. Dispensa de Licitação

### 7.1. Para celebrar contrato de gestão
- Lei 14.133 art. 75 XVIII: dispensa de licitação para celebração de contratos de prestação de serviços com OS qualificadas para atividades contempladas no contrato de gestão.

### 7.2. ADI 1.923/STF
- Em parte declarada constitucional.
- Mas exige CRITÉRIOS OBJETIVOS para escolha (não pode ser totalmente discricionária).

## 8. Servidores Cedidos

- Sem prejuízo da remuneração na origem.
- Atividades correlatas à OS.

## 9. Distinções

### 9.1. OS x OSCIP

| | OS | OSCIP |
|---|---|---|
| Lei | 9.637/98 | 9.790/99 |
| Instrumento | Contrato de Gestão | Termo de Parceria |
| Áreas | Ensino, pesquisa, saúde, cultura, meio ambiente | Mais ampla |
| Qualificação | Discricionária | Vinculada (se atender requisitos) |
| Cessão de servidores | SIM | Em regra não |

### 9.2. OS x Adm Indireta
- OS NÃO integra a Adm Pública.
- É TERCEIRO SETOR (privado).

## 10. Como Cebraspe cobra

- **C/E**: "OS integra a Adm Indireta" → **ERRADO** (terceiro setor).
- **C/E**: "Qualificação como OS é VINCULADA" → **ERRADO** (discricionária).
- **C/E**: "OS pode ter fins lucrativos" → **ERRADO** (sem fins lucrativos).
- **C/E**: "Instrumento da OS é Termo de Parceria" → **ERRADO** (Contrato de Gestão; OSCIP é Termo de Parceria).
- **C/E**: "OS pode receber bens públicos" → **CORRETO** (mediante contrato).
- **C/E**: "Lei 9.637 permite OS atuar em atividade industrial lucrativa" → **ERRADO**.
$content$,
$resumo$
# Resumo — Organizações Sociais (OS)

## Conceito
PJ direito PRIVADO, SEM fins lucrativos, QUALIFICADA pelo Poder Executivo (Lei 9.637/98).

## Características
- Terceiro setor (NÃO integra Adm Indireta).
- Áreas: ensino, pesquisa, tecnologia, cultura, saúde, meio ambiente.
- Qualificação DISCRICIONÁRIA.

## Instrumento
**CONTRATO DE GESTÃO**.
- Metas + recursos + autonomia.
- Avaliação periódica.

## Recursos
- Dinheiro.
- Bens cedidos.
- Servidores cedidos (sem prejuízo da remuneração).

## Dispensa de licitação
Lei 14.133 art. 75 XVIII (com critérios objetivos — ADI 1.923/STF).

## OS x OSCIP

| | OS | OSCIP |
|---|---|---|
| Lei | 9.637/98 | 9.790/99 |
| Instrumento | Contrato de Gestão | Termo de Parceria |

## Top pegadinhas
1. OS é TERCEIRO SETOR (não Indireta).
2. Qualificação é DISCRICIONÁRIA.
3. Instrumento = CONTRATO DE GESTÃO.
4. SEM fins lucrativos.
5. ADI 1.923: dispensa OK com critérios objetivos.
6. Recebe bens e servidores cedidos.
$resumo$
);

-- ┌─ 7. OSCIP (Lei 9.790/99) ────────────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'OSCIP (Lei 9.790/99)',
  'Organizações da Sociedade Civil de Interesse Público (OSCIP) — Lei 9.790/99',
$content$
# Organizações da Sociedade Civil de Interesse Público (OSCIP) — Lei 9.790/99

## 1. Conceito

**OSCIP** é uma **PJ de direito PRIVADO**, **SEM fins lucrativos**, **QUALIFICADA pelo Ministério da Justiça** por atender aos requisitos da Lei 9.790/99, podendo celebrar **TERMO DE PARCERIA** com o Poder Público.

⚠️ Pertence ao **TERCEIRO SETOR**. NÃO integra a Administração Indireta.

## 2. Diferença Central de OS

- **OS** (Lei 9.637/98): qualificação DISCRICIONÁRIA + Contrato de Gestão.
- **OSCIP** (Lei 9.790/99): qualificação VINCULADA + Termo de Parceria.

## 3. Características

### 3.1. Natureza
- PJ de DIREITO PRIVADO.
- SEM fins lucrativos.

### 3.2. Qualificação
- Pelo **MINISTÉRIO DA JUSTIÇA**.
- VINCULADA (se atender requisitos, tem direito).

### 3.3. Atividades (art. 3º)
Ampla lista — pelo menos 1 das:
- Assistência social.
- Cultura.
- Educação.
- Saúde.
- Segurança alimentar e nutricional.
- Defesa do meio ambiente.
- Voluntariado.
- Desenvolvimento econômico, social e da economia solidária.
- Direitos.
- Combate à pobreza.
- Estudos científicos.
- Promoção de DH.
- Ética, paz, cidadania.

### 3.4. Vedações de Qualificação (art. 2º)
- Sociedades comerciais.
- Sindicatos.
- Partidos políticos.
- Instituições religiosas.
- Hospitais e escolas privadas (a menos que sem fins lucrativos).
- Mutual.
- Fundações de direito público.
- OS, ONGs (mas podem se qualificar como OSCIP).

## 4. Termo de Parceria

### 4.1. Conceito
Instrumento celebrado entre Poder Público e OSCIP para:
- Formar vínculo de cooperação.
- Fomentar atividade de interesse público.

### 4.2. Cláusulas Obrigatórias
- Especificação do programa.
- Metas e resultados.
- Prazos.
- Critérios de avaliação.
- Previsão de receitas.
- Obrigações de prestação de contas.

### 4.3. Diferença de Contrato de Gestão (OS)

| | Termo de Parceria (OSCIP) | Contrato de Gestão (OS) |
|---|---|---|
| Lei | 9.790/99 | 9.637/98 |
| Qualificação | VINCULADA (Min. Justiça) | DISCRICIONÁRIA |
| Cessão de servidores | EM REGRA NÃO | SIM |
| Repasse de bens | Restrito | Mais amplo |

## 5. Requisitos para Qualificação

### 5.1. Tempo de constituição
- 3 ANOS (ou mais) de constituição como PJ.

### 5.2. Estatuto
- Princípios da legalidade, impessoalidade, moralidade, publicidade, economicidade e eficiência.
- Adoção de práticas de gestão administrativa, necessárias e suficientes a coibir obtenção de vantagens.
- Acessibilidade pública.

### 5.3. Adesão Anterior
- Não pode ser de OS, partido político, sindicato, instituição religiosa.

### 5.4. Princípios Estatutários
- Legalidade, impessoalidade, moralidade, publicidade, economicidade, eficiência.

## 6. Vantagens

### 6.1. Para a OSCIP
- Recursos públicos via Termo de Parceria.
- Reconhecimento institucional.
- Benefícios tributários (algumas isenções).

### 6.2. Para a Adm
- Parceria com sociedade civil organizada.
- Execução de políticas públicas via privado.

## 7. Controle

### 7.1. Ministério da Justiça
- Pode cancelar a qualificação por descumprimento.

### 7.2. Tribunal de Contas
- TCU/TCE auditoria das parcerias.

### 7.3. MP
- Defesa do interesse público.

## 8. Prestação de Contas

- Detalhada (do recurso recebido).
- Demonstração financeira.
- Avaliação de metas.

## 9. Aplicação da Lei 13.019/14

A Lei 13.019/14 (MROSC — Marco Regulatório das Organizações da Sociedade Civil) impactou parcialmente OSCIPs:
- Em parte, parcerias entre OSCIP e Adm continuam pela Lei 9.790.
- Em parte, podem aplicar Lei 13.019 (Termo de Colaboração/Fomento).
- Exige CHAMAMENTO PÚBLICO (regra) também para OSCIPs.

## 10. Cancelamento da Qualificação

### 10.1. Hipóteses (art. 7º)
- Descumprimento das normas legais.
- Aplicação irregular dos recursos.
- Encerramento de atividades.

### 10.2. Procedimento
- Processo administrativo no Min. Justiça.
- Contraditório e ampla defesa.

## 11. Como Cebraspe cobra

- **C/E**: "OSCIP é entidade da Adm Indireta" → **ERRADO** (terceiro setor).
- **C/E**: "Qualificação como OSCIP é DISCRICIONÁRIA" → **ERRADO** (vinculada — Lei 9.790).
- **C/E**: "Instrumento de OSCIP é Contrato de Gestão" → **ERRADO** (Termo de Parceria).
- **C/E**: "Lei 9.790 autoriza qualificação de sindicato como OSCIP" → **ERRADO**.
- **C/E**: "OSCIP precisa ter PELO MENOS 3 anos de constituição" → **CORRETO**.
- **C/E**: "Lei 13.019/14 revogou completamente a Lei 9.790" → **ERRADO**.
$content$,
$resumo$
# Resumo — OSCIP (Lei 9.790/99)

## Conceito
PJ direito PRIVADO, SEM fins lucrativos, qualificada pelo MIN. JUSTIÇA (VINCULADA).

## Atividades (art. 3º)
Assistência, cultura, educação, saúde, ambiente, voluntariado, DH, ética, paz, cidadania.

## Vedações (art. 2º)
Sociedades comerciais, sindicatos, partidos, instituições religiosas.

## Instrumento
**TERMO DE PARCERIA**.

## OS x OSCIP

| | OS | OSCIP |
|---|---|---|
| Lei | 9.637/98 | 9.790/99 |
| Qualificação | DISCRICIONÁRIA | VINCULADA |
| Instrumento | Contrato de Gestão | Termo de Parceria |
| Cessão servidores | SIM | Em regra não |
| Min. responsável | área afim | MIN. JUSTIÇA |

## Requisitos
- 3 anos de constituição (mín.).
- Estatuto com princípios LIMPE.
- Não ser entidade vedada.

## Cancelamento
- Descumprimento.
- Aplicação irregular.
- Encerramento atividades.
- Com processo administrativo + contraditório.

## Top pegadinhas
1. OSCIP qualificação VINCULADA.
2. Instrumento = TERMO DE PARCERIA.
3. Quem qualifica: Min. JUSTIÇA.
4. 3 anos mínimos de constituição.
5. OSCIP NÃO é Adm Indireta.
$resumo$
);

-- ┌─ 8. Terceiro Setor e Sistema S ──────────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Terceiro setor e Serviços Sociais Autônomos (Sistema S)',
  'Terceiro Setor e Serviços Sociais Autônomos (Sistema S)',
$content$
# Terceiro Setor e Serviços Sociais Autônomos (Sistema S)

## 1. Conceito de Terceiro Setor

**Terceiro Setor** é o conjunto de entidades **PRIVADAS** que atuam ao **lado do Estado** (1º setor) e do **mercado** (2º setor) na realização de atividades de **interesse público** SEM fins lucrativos.

⚠️ Entidades do terceiro setor NÃO integram a Administração Pública (nem Direta nem Indireta).

## 2. Entidades do Terceiro Setor

### 2.1. Serviços Sociais Autônomos (Sistema S)
- SESI, SENAI, SESC, SENAC, SENAR, SEBRAE, SEST, SENAT.

### 2.2. Organizações Sociais (OS) — Lei 9.637/98
- Com contrato de gestão.

### 2.3. OSCIP — Lei 9.790/99
- Com termo de parceria.

### 2.4. Entidades Filantrópicas
- CEBAS (Certificação de Entidades Beneficentes de Assistência Social).
- Lei 12.101/09.

### 2.5. Organizações da Sociedade Civil (OSC) — Lei 13.019/14
- Termo de Colaboração, Termo de Fomento, Acordo de Cooperação.

### 2.6. Fundações Privadas
- Regulamentadas pelo CC (62-69).

## 3. Serviços Sociais Autônomos (Sistema S)

### 3.1. Conceito
PJ de **DIREITO PRIVADO**, criadas POR LEI, mantidas com **contribuições parafiscais**, voltadas a **ATIVIDADES DE INTERESSE SOCIAL** (educação profissional, capacitação, lazer, cultura).

### 3.2. Características
- Direito privado.
- Mantidas por contribuições compulsórias (incidem sobre folha de pagamento).
- Não integram a Adm Pública.
- Mas sujeitas a controle do TCU (RMS 26.617/STF).

### 3.3. Principais entidades

#### A) SESI — Serviço Social da Indústria
- Lei 9.403/46.

#### B) SENAI — Serviço Nacional de Aprendizagem Industrial
- Decreto-Lei 4.048/42.

#### C) SESC — Serviço Social do Comércio
- Lei 9.853/46.

#### D) SENAC — Serviço Nacional de Aprendizagem Comercial
- Decreto-Lei 8.621/46.

#### E) SENAR — Serviço Nacional de Aprendizagem Rural
- Lei 8.315/91.

#### F) SEBRAE — Serviço Brasileiro de Apoio às Micro e Pequenas Empresas
- Lei 8.029/90.

#### G) SEST, SENAT — Setor de transporte.

### 3.4. Financiamento
- **Contribuições parafiscais** (compulsórias).
- Recolhidas junto com tributos pela Receita Federal.
- Repassadas às entidades.

### 3.5. Servidores
- **CLT** (regra).
- NÃO precisam de concurso público (STF — RE 789.874).

⚠️ Pegadinha: STF decidiu que Sistema S NÃO precisa de concurso público.

### 3.6. Licitação
- NÃO se submete à Lei 14.133 (STF: regulamentos próprios).
- Princípios da Adm Pública aplicáveis (impessoalidade, moralidade).

### 3.7. Controle
- TCU (CF 70 + RMS 26.617 STF).
- Tribunal de Contas dos Estados.
- Auditoria interna.

## 4. Vantagens do Terceiro Setor

### 4.1. Para a sociedade
- Atendimento de demandas sociais.
- Eficiência maior em algumas atividades.

### 4.2. Para a Adm
- Compartilhamento de responsabilidades.
- Acesso a recursos sociais.

### 4.3. Para as entidades
- Reconhecimento institucional.
- Recursos públicos.
- Benefícios tributários.

## 5. Comparativo das Entidades

| | Lei | Instrumento | Qualificação |
|---|---|---|---|
| **OS** | 9.637/98 | Contrato de Gestão | Discricionária |
| **OSCIP** | 9.790/99 | Termo de Parceria | Vinculada |
| **OSC** | 13.019/14 | Termo de Colaboração/Fomento/Acordo | Chamamento público |
| **Sistema S** | Leis próprias | Não há instrumento específico | Lei cria |

## 6. Controle do Terceiro Setor

### 6.1. TCU/TCE
- Auditoria de recursos públicos.

### 6.2. Ministério Público
- Defesa do patrimônio público.
- Curadoria de fundações privadas.

### 6.3. Judiciário
- Ação Civil Pública.
- Ação Popular (Lei 4.717/65).

### 6.4. Sociedade civil
- LAI.
- Denúncias.

## 7. Imunidades e Benefícios Tributários

### 7.1. Imunidade tributária (CF 150 VI c)
- Templos.
- Partidos políticos.
- Sindicatos.
- Instituições de educação SEM fins lucrativos.
- Instituições de assistência social SEM fins lucrativos.

### 7.2. Para OS, OSCIP, Sistema S
- Algumas isenções específicas.
- Não imunidade ampla.

## 8. Direitos e Deveres

### 8.1. Direitos
- Receber recursos públicos (via instrumentos).
- Beneficiar-se de incentivos.

### 8.2. Deveres
- Aplicar recursos corretamente.
- Prestar contas.
- Cumprir metas.
- Não ter fins lucrativos.

## 9. Como Cebraspe cobra

- **C/E**: "Sistema S integra a Administração Indireta" → **ERRADO** (terceiro setor).
- **C/E**: "SENAI precisa de concurso público para contratar" → **ERRADO** (STF — RE 789.874).
- **C/E**: "Sistema S submete-se à Lei 14.133" → **ERRADO** (regulamentos próprios).
- **C/E**: "OSCIP pode receber recursos via Termo de Colaboração" → **CORRETO** (Lei 13.019).
- **C/E**: "Sistema S é financiado por tributos" → **CUIDADO** (contribuições parafiscais — compulsórias).
- **C/E**: "OS e OSCIP integram o Sistema S" → **ERRADO**.
$content$,
$resumo$
# Resumo — Terceiro Setor e Sistema S

## Terceiro Setor
PJs PRIVADAS, SEM fins lucrativos, com atuação de interesse público.
NÃO integra Administração.

## Sistema S
- SESI, SENAI, SESC, SENAC, SENAR, SEBRAE, SEST, SENAT.
- Direito PRIVADO.
- Criadas por lei.
- Financiadas por CONTRIBUIÇÕES PARAFISCAIS.
- CLT (sem concurso público — STF RE 789.874).
- Licitação: regulamentos próprios.
- Controle: TCU (RMS 26.617).

## Entidades do Terceiro Setor

| | Lei | Instrumento |
|---|---|---|
| OS | 9.637/98 | Contrato de Gestão |
| OSCIP | 9.790/99 | Termo de Parceria |
| OSC | 13.019/14 | T. Colaboração / Fomento / Acordo |
| Sistema S | Leis próprias | — |

## Imunidades (CF 150 VI c)
Templos, partidos, sindicatos, educação e assistência sem fins lucrativos.

## Controle
TCU, MP, Judiciário, sociedade civil (LAI).

## Top pegadinhas
1. Sistema S NÃO integra Adm.
2. Sistema S NÃO precisa de concurso (STF).
3. Financiamento: contribuições parafiscais (compulsórias).
4. Licitação: regulamento próprio.
5. Sistema S é controlado pelo TCU.
6. OS, OSCIP NÃO integram Sistema S.
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
