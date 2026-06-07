-- ════════════════════════════════════════════════════════════════════════════
-- GRANULAR ADM — Batch 4 (8 materiais focados)
-- Data: 2026-06-07
--
-- Topics: Objeto, Adm Pública (definição), Centralização/Descentralização,
-- Adm Direta/Indireta detalhada, Autarquias, EP/SEM, Fundações, Consórcios.
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

-- ┌─ 1. Objeto do direito administrativo ────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Objeto do direito administrativo',
  'Objeto do Direito Administrativo',
$content$
# Objeto do Direito Administrativo

## 1. Conceito de Objeto

O **objeto** do Direito Administrativo é aquilo que ele REGULA, ou seja, o conjunto de matérias e relações jurídicas que constituem o seu campo de estudo.

⚠️ Não confundir "objeto" com "função administrativa". A função é a ATIVIDADE; o objeto é o CONJUNTO REGULADO.

## 2. Composição do Objeto

O Direito Administrativo, sob a doutrina majoritária (Hely Lopes Meirelles, Maria Sylvia Zanella Di Pietro, Celso Antônio Bandeira de Mello), tem como objeto:

### 2.1. Organização da Administração Pública
- Estrutura institucional do Estado.
- Adm Direta + Indireta.
- Órgãos e entidades.

### 2.2. Agentes Públicos
- Servidores, empregados, temporários, militares, agentes políticos.
- Regime jurídico de cada categoria.

### 2.3. Atividades Administrativas
- Atos administrativos.
- Contratos administrativos.
- Procedimentos administrativos.

### 2.4. Bens Públicos
- Classificação.
- Regime jurídico (impenhorabilidade, imprescritibilidade).

### 2.5. Poderes Administrativos
- Hierárquico.
- Disciplinar.
- Regulamentar.
- De polícia.
- Vinculado x discricionário.

### 2.6. Responsabilidade do Estado
- Civil (CF 37 §6º).
- Penal (servidores).
- Administrativa (servidores e empresas).

### 2.7. Controle da Administração
- Interno + externo + judicial + popular.

### 2.8. Serviços Públicos
- Conceito.
- Modalidades de prestação.
- Concessão, permissão, autorização.

### 2.9. Intervenção do Estado
- Na propriedade (desapropriação, requisição, tombamento).
- No domínio econômico.

## 3. O que NÃO faz parte do Objeto

### 3.1. Função LEGISLATIVA
- Cria leis em sentido formal.
- Regulada pelo Direito Constitucional.

### 3.2. Função JURISDICIONAL
- Resolve conflitos com força de coisa julgada.
- Regulada pelo Direito Processual.

### 3.3. Atividades Privadas do Estado
- Quando o Estado age como particular (locação simples, contrato civil) → regulado pelo Direito Civil.

## 4. Função Administrativa e Função Política

### 4.1. Função Administrativa
- Concreta, imediata, sob regime de direito público.
- Objeto do Direito Administrativo.

### 4.2. Função Política/Governo
- Escolha de fins (decisões políticas).
- Não é objeto direto do Direito Administrativo (mas tem reflexos).

### 4.3. Atos Políticos
- Veto presidencial, declaração de guerra, escolha de pessoa para cargo político.
- Em regra, NÃO sujeitos a controle judicial pleno (mas podem ser, em casos de violação constitucional).

## 5. Objeto x Conteúdo do Direito Administrativo

| Aspecto | Característica |
|---|---|
| Objeto | O QUE é regulado (matérias) |
| Conteúdo | COMO regula (princípios, regras) |

## 6. Tendências de Ampliação

O objeto do Direito Administrativo TENDE A AMPLIAR-SE, incluindo:
- **Regulação econômica** (agências reguladoras).
- **Compliance público** (programas de integridade).
- **Governança e accountability** (transparência ativa).
- **Direito Administrativo Digital** (uso de IA, blockchain, LGPD na Adm).
- **Adm Consensual** (parcerias, contratos colaborativos, OS, OSCIP).

## 7. Características Especiais do Objeto

### 7.1. Predominância do Interesse Público
- Sempre voltado ao coletivo.

### 7.2. Caráter Instrumental
- Direito Administrativo é meio para que o Estado realize seus fins.

### 7.3. Mutabilidade
- Acompanha as transformações do Estado.

## 8. Importância Prática

Saber o OBJETO ajuda a:
- Identificar quando incide o Direito Administrativo.
- Distinguir do Direito Civil (atos privados da Adm).
- Distinguir do Direito Penal (responsabilização criminal).
- Aplicar corretamente os princípios.

## 9. Como Cebraspe cobra

- **C/E**: "O objeto do Direito Administrativo inclui a função jurisdicional" → **ERRADO** (jurisdição é objeto do Processual).
- **C/E**: "Atos políticos integram o objeto do Direito Administrativo" → **ERRADO** (em regra, não).
- **C/E**: "Bens públicos NÃO integram o objeto" → **ERRADO** (integram).
- **C/E**: "O Direito Administrativo regula apenas a atividade do Executivo" → **ERRADO** (regula a função administrativa, que existe em todos os Poderes).
- **C/E**: "Quando o Estado age como particular (locação), aplica-se o Direito Administrativo" → **ERRADO** (Civil).
- **C/E**: "O objeto está em constante ampliação" → **CORRETO** (regulação, governança, etc.).
$content$,
$resumo$
# Resumo — Objeto do Direito Administrativo

## Conceito
O conjunto de MATÉRIAS reguladas pelo Direito Administrativo.

## Compõe o objeto
1. Organização da Administração.
2. Agentes públicos.
3. Atividades administrativas (atos, contratos, processos).
4. Bens públicos.
5. Poderes administrativos.
6. Responsabilidade do Estado.
7. Controle.
8. Serviços públicos.
9. Intervenção do Estado.

## NÃO compõe
- Função legislativa.
- Função jurisdicional.
- Atos políticos (regra).
- Atividades privadas do Estado.

## Tendências modernas
- Regulação econômica.
- Compliance público.
- Governança/accountability.
- Direito Administrativo Digital.
- Administração Consensual.

## Top pegadinhas
1. Jurisdição NÃO é objeto.
2. Atos políticos NÃO em regra.
3. Quando Estado age como privado → Civil.
4. Função administrativa existe em TODOS os Poderes.
5. Objeto em AMPLIAÇÃO constante.
$resumo$
);

-- ┌─ 2. Administração pública (definição geral) ─────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Administração pública',
  'Administração Pública — Conceito Amplo',
$content$
# Administração Pública — Conceito Amplo

## 1. Conceito

**Administração Pública** é o conjunto de **órgãos**, **agentes** e **atividades** voltados à **gestão concreta** dos interesses coletivos.

Pode ser analisada sob duas perspectivas principais:
- **Subjetiva (orgânica)**: QUEM administra.
- **Objetiva (funcional)**: O QUE é administrar.

## 2. Concepção Subjetiva (Orgânica)

### 2.1. Definição
Conjunto de pessoas jurídicas, órgãos e agentes que exercem a função administrativa.

### 2.2. Composição
- **União**, **Estados**, **DF**, **Municípios** (Adm Direta).
- **Autarquias**, **fundações**, **EP**, **SEM** (Adm Indireta).
- Órgãos internos: Ministérios, Secretarias, Departamentos.
- Agentes públicos.

### 2.3. Convenção gráfica
- "Administração Pública" (maiúscula) = subjetiva/orgânica.
- "administração pública" (minúscula) = objetiva/material.

## 3. Concepção Objetiva (Material/Funcional)

### 3.1. Definição
Conjunto de **atividades** desempenhadas pelo Estado (ou seus delegados) para a satisfação dos interesses coletivos.

### 3.2. Atividades típicas
- **Polícia Administrativa**: limitar direitos para preservar o interesse público.
- **Serviços Públicos**: prestações para a coletividade.
- **Fomento**: incentivos a iniciativas privadas de interesse público.
- **Intervenção**: no domínio econômico ou na propriedade.
- **Gestão Patrimonial**: dos bens públicos.

## 4. Características da Administração Pública

### 4.1. Sob regime jurídico DE DIREITO PÚBLICO
- Prerrogativas + sujeições especiais.

### 4.2. Vinculada ao INTERESSE PÚBLICO
- Não pode dispor do interesse coletivo.

### 4.3. Submissão à LEI
- Princípio da legalidade.

### 4.4. Controlada
- Interno + externo + popular + judicial.

### 4.5. Profissional
- Provimento por concurso (CF 37 II).

## 5. Tipos de Administração

### 5.1. Quanto à atividade
- **Burocrática**: focada em hierarquia, formalismo, procedimentos.
- **Gerencial**: focada em resultados, descentralização, eficiência (a partir EC 19/98).

### 5.2. Quanto à estrutura
- **Centralizada**: tudo na Adm Direta.
- **Descentralizada**: parte na Indireta.
- **Desconcentrada**: dentro da mesma PJ, em órgãos diferentes.

## 6. Evolução Histórica

### 6.1. Estado Patrimonialista
- Patrimônio do Estado confundido com o do governante.
- Cargo público como propriedade.

### 6.2. Estado Burocrático (Weber)
- Profissionalização.
- Concurso público.
- Carreira.
- Hierarquia.

### 6.3. Estado Gerencial (EC 19/98)
- Foco em resultados (princípio da eficiência).
- Avaliação de desempenho.
- Contratos de gestão.

### 6.4. Estado Pós-Burocrático (atual)
- Governança digital.
- Adm consensual.
- Open government.

## 7. Administração e Funções do Estado

### 7.1. Funções típicas
- **Legislativa**: criação de leis (Legislativo).
- **Jurisdicional**: resolução de conflitos (Judiciário).
- **Administrativa**: gestão concreta (Executivo).

### 7.2. Funções atípicas
- Todos os Poderes exercem função administrativa **internamente**.
- Ex: TJ contrata servidor (ato administrativo, mesmo no Judiciário).

## 8. Sentidos da Expressão "Administração"

| Sentido | Significado |
|---|---|
| Subjetivo | Órgãos e agentes |
| Objetivo (material) | Atividades |
| Operacional | Modo de exercício |

## 9. Princípios Constitucionais (CF 37 caput) — LIMPE
- **L**egalidade
- **I**mpessoalidade
- **M**oralidade
- **P**ublicidade
- **E**ficiência

## 10. Como Cebraspe cobra

- **C/E**: "Administração Pública em sentido subjetivo refere-se às atividades" → **ERRADO** (refere-se aos órgãos; atividades é o objetivo).
- **C/E**: "A Administração Pública só existe no Executivo" → **ERRADO** (todos os Poderes têm administração interna).
- **C/E**: "Empresas públicas integram a Administração Pública em sentido subjetivo" → **CORRETO**.
- **C/E**: "A administração gerencial substituiu integralmente a burocrática" → **ERRADO** (coexistem).
- **C/E**: "O princípio da eficiência foi introduzido pela CF/88" → **ERRADO** (EC 19/98).
$content$,
$resumo$
# Resumo — Administração Pública

## Concepções

| | Subjetiva (orgânica) | Objetiva (material) |
|---|---|---|
| Foco | QUEM | O QUÊ |
| Conteúdo | Órgãos + agentes + entidades | Atividades |
| Grafia | Maiúscula | Minúscula |

## Atividades materiais
- Polícia administrativa.
- Serviços públicos.
- Fomento.
- Intervenção.
- Gestão patrimonial.

## Características
- Direito público.
- Interesse público.
- Legalidade.
- Controlada.
- Profissional (concurso).

## Estado Gerencial
- EC 19/98 — eficiência.
- Resultados, descentralização, contratos de gestão.

## Tipos de organização
- Centralizada x Descentralizada x Desconcentrada.

## Funções do Estado
- Legislativa (Legislativo).
- Jurisdicional (Judiciário).
- Administrativa (Executivo + atipicamente os outros).

## Princípios (CF 37) — LIMPE
Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência.

## Top pegadinhas
1. Subjetiva = órgãos; Objetiva = atividades.
2. Adm existe em TODOS os Poderes.
3. Eficiência = EC 19/98 (não CF/88 original).
4. Gerencial e burocrática COEXISTEM.
$resumo$
);

-- ┌─ 3. Estado, governo e administração pública ─────────────────────────────┐
-- Tópico pode não existir com esse nome exato; vou tentar
SELECT upsert_material(
  'direito-administrativo',
  'Estado, governo e administração pública',
  'Estado, Governo e Administração Pública',
$content$
# Estado, Governo e Administração Pública

## 1. Estado

### 1.1. Conceito
**Estado** é a pessoa jurídica territorial soberana, juridicamente organizada, com poder de império sobre população e território.

### 1.2. Elementos (Teoria Tridimensional — Jellinek)
- **Povo** (elemento humano).
- **Território** (elemento físico).
- **Governo soberano** (elemento político).

⚠️ Alguns acrescentam: **Finalidade** (bem comum).

### 1.3. Personalidade Jurídica
- O Estado tem **personalidade jurídica de DIREITO PÚBLICO**.
- No Brasil: União, Estados-membros, DF, Municípios (todos com personalidade própria).
- CF 18: Federação organizada autonomamente.

### 1.4. Funções do Estado
- **Legislativa**: criar normas gerais.
- **Jurisdicional**: aplicar o direito ao caso concreto.
- **Administrativa**: executar concretamente os fins do Estado.

## 2. Governo

### 2.1. Conceito
**Governo** é o conjunto de **órgãos superiores** do Estado que dirigem a política nacional.

### 2.2. Características
- **POLÍTICO**: faz escolhas de fins (não meios).
- **DISCRICIONÁRIO**: grande margem de decisão.
- **TRANSITÓRIO**: muda com eleições.

### 2.3. Atos de Governo
- Veto presidencial.
- Declaração de guerra.
- Política externa.
- Designação para cargos políticos.

### 2.4. Características dos atos de governo
- Em regra, **POUCO SUSCETÍVEIS DE CONTROLE JUDICIAL** (mas controlados se violam CF).
- Praticados pelos AGENTES POLÍTICOS.

## 3. Administração Pública

### 3.1. Conceito
**Administração Pública** é o conjunto de órgãos e atividades que **executam concretamente** os fins traçados pelo Governo.

### 3.2. Características
- **TÉCNICA** (não política).
- **VINCULADA OU DISCRICIONÁRIA**, sempre dentro dos limites legais.
- **PERMANENTE** (não muda com eleições).
- **NEUTRAL** (servidores efetivos por concurso).

### 3.3. Atos da Administração
- Atos administrativos.
- Contratos.
- Procedimentos.

## 4. Quadro Comparativo

| | Governo | Administração |
|---|---|---|
| Função | Escolhe FINS | Escolhe MEIOS |
| Natureza | Política | Técnica |
| Decisão | Discricionária ampla | Vinculada ou discricionária dentro da lei |
| Permanência | Transitório | Permanente |
| Atos | Atos de governo (políticos) | Atos administrativos |
| Agentes | Agentes políticos | Servidores |
| Controle | Reduzido | Amplo |

## 5. Relações entre Estado, Governo e Administração

### 5.1. Hierarquia conceitual
- Estado = TODO (gênero).
- Governo + Administração = espécies dentro do Estado.

### 5.2. Inter-relação
- Governo DEFINE políticas → Administração EXECUTA.
- Administração tem AUTONOMIA TÉCNICA, mas segue diretrizes do Governo.

### 5.3. Conflito típico
- Quando o Governo quer impor decisão CONTRÁRIA à lei → Administração deve recusar.
- Ex: nomeação ilegal de servidor por critério político é nula.

## 6. Servidor vs Agente Político

| | Agente Político | Servidor |
|---|---|---|
| Vínculo | Político | Estatutário/CLT |
| Acesso | Eleição/nomeação | Concurso |
| Duração | Mandato | Indefinido |
| Função | Decisão política | Execução técnica |

## 7. Atos de Governo x Atos Administrativos

### 7.1. Atos de Governo
- Decisões POLÍTICAS de grande envergadura.
- Geralmente discricionários.
- Controle judicial REDUZIDO.

### 7.2. Atos Administrativos
- Decisões TÉCNICAS de execução.
- Vinculados ou discricionários dentro da lei.
- SUJEITOS a controle judicial amplo.

## 8. Princípios Aplicáveis

### 8.1. Ao Governo
- Soberania popular.
- Representatividade.
- Separação de poderes.

### 8.2. À Administração
- LIMPE (CF 37).
- Princípios implícitos (razoabilidade, motivação, etc.).

## 9. Controle

### 9.1. Sobre o Governo
- Eleitoral (povo).
- Político (parlamento).
- Judicial (limitado).

### 9.2. Sobre a Administração
- Interno (autocontrole).
- Externo (Legislativo + TCU + Judiciário).
- Popular.

## 10. Como Cebraspe cobra

- **C/E**: "Estado e Administração Pública são sinônimos" → **ERRADO** (Estado é mais amplo).
- **C/E**: "Governo escolhe MEIOS" → **ERRADO** (escolhe FINS; meios são da Administração).
- **C/E**: "Administração é transitória" → **ERRADO** (é permanente; o governo é transitório).
- **C/E**: "Atos de governo SEMPRE são controlados judicialmente" → **ERRADO** (controle reduzido).
- **C/E**: "Servidor de carreira é agente político" → **ERRADO** (é servidor estatutário).
- **C/E**: "A administração pública é predominantemente política" → **ERRADO** (técnica).
$content$,
$resumo$
# Resumo — Estado, Governo e Administração

## Estado (Teoria Tridimensional - Jellinek)
- **Povo** + **Território** + **Governo Soberano** (+ Finalidade).
- PJ de direito público.
- 3 funções: Legislativa, Jurisdicional, Administrativa.

## Governo
- Conjunto de órgãos SUPERIORES.
- Político, discricionário, TRANSITÓRIO.
- Escolhe FINS.
- Atos: veto, guerra, política externa.

## Administração
- Conjunto de órgãos e atividades de EXECUÇÃO.
- Técnica, vinculada/discricionária, PERMANENTE.
- Escolhe MEIOS.
- Atos administrativos.

## Comparativo

| | Governo | Administração |
|---|---|---|
| Função | FINS | MEIOS |
| Natureza | Política | Técnica |
| Permanência | Transitório | Permanente |
| Agentes | Políticos | Servidores |
| Controle | Reduzido | Amplo |

## Top pegadinhas
1. Estado é GÊNERO; Governo e Adm são ESPÉCIES.
2. Governo = FINS; Adm = MEIOS.
3. Adm é TÉCNICA e PERMANENTE.
4. Atos de governo = controle reduzido.
5. Servidor ≠ Agente Político.
$resumo$
);

-- ┌─ 4. Princípios Implícitos (detalhe Razoabilidade + Proporcionalidade) ───┐
-- Material vai pro topic que mais combine; pulando se não tiver topic claro

-- ┌─ 4. Centralização, Descentralização e Desconcentração ───────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Centralização, descentralização e desconcentração',
  'Centralização, Descentralização e Desconcentração',
$content$
# Centralização, Descentralização e Desconcentração

## 1. Visão Geral

São as três formas básicas de **organização administrativa do Estado**. Cebraspe cobra MUITO a distinção.

## 2. Centralização

### 2.1. Conceito
A Administração executa **DIRETAMENTE** suas funções, sem transferi-las a outras PJ.

### 2.2. Características
- União, Estados, DF, Municípios executam por SI MESMOS.
- Atuação pela **Administração Direta**.
- Sem criação de entes autônomos.

### 2.3. Exemplo
- Ministério da Justiça atua diretamente em assuntos da segurança pública.
- Secretaria de Saúde do Estado atua diretamente em saúde.

## 3. Descentralização

### 3.1. Conceito
A Administração **TRANSFERE** a execução de atividades a uma OUTRA pessoa jurídica (com personalidade jurídica própria).

### 3.2. Tipos de Descentralização

#### A) Descentralização POR SERVIÇOS (TÉCNICA OU FUNCIONAL)
- Cria-se entidade da **Administração INDIRETA** (autarquia, fundação, EP, SEM) para exercer atividade específica.
- Requer LEI (autarquia/fundação) ou LEI AUTORIZATIVA (EP/SEM).
- Ex: INSS (autarquia), IBAMA (autarquia), Caixa (EP).

#### B) Descentralização POR COLABORAÇÃO
- Transfere a EXECUÇÃO (não titularidade) a particulares.
- Por **CONCESSÃO**, **PERMISSÃO** ou **AUTORIZAÇÃO**.
- Ex: concessão de rodovia, permissão de transporte público.

#### C) Descentralização TERRITORIAL
- Cria-se entidade territorial (Estado, Município) com competência territorial própria.
- Ex: criação de novo Município.

#### D) Descentralização SOCIAL
- Transfere a particulares sem fins lucrativos (OS, OSCIP, Serviços Sociais Autônomos — Sistema S).

### 3.3. Vínculo entre Direta e Indireta
- NÃO há HIERARQUIA.
- Há **VINCULAÇÃO** (também chamada **CONTROLE FINALÍSTICO** ou **TUTELA**).
- Limitada ao previsto em lei.

## 4. Desconcentração

### 4.1. Conceito
**Distribuição interna** de competências dentro da MESMA pessoa jurídica.

### 4.2. Características
- Não há transferência a outra PJ.
- Cria órgãos internos (departamentos, divisões).
- Existe HIERARQUIA entre eles.

### 4.3. Exemplo
- Ministério da Justiça desconcentra em Secretarias e Departamentos.
- PF desconcentra em Superintendências Regionais.

### 4.4. Diferença para Descentralização

| | Descentralização | Desconcentração |
|---|---|---|
| Cria nova PJ? | SIM | NÃO |
| Hierarquia | NÃO (vinculação) | SIM |
| Personalidade | Nova personalidade | Mesma |
| Forma | Por lei | Por ato adm |

## 5. Vinculação x Hierarquia

### 5.1. Vinculação (Controle Finalístico)
- Entre Adm Direta e Indireta.
- Limitada à finalidade legal.
- NÃO atinge a vida interna da entidade.

### 5.2. Hierarquia
- Dentro da mesma PJ.
- Permite ordens, fiscalização, revisão, delegação.

⚠️ **Pegadinha clássica**: "O Ministro da Justiça é hierarquicamente superior ao Diretor do INSS" → **ERRADO**. Não há hierarquia direta entre Adm Direta e Indireta.

## 6. Administração Direta

### 6.1. Composição
- União.
- Estados-membros.
- Distrito Federal.
- Municípios.

### 6.2. Órgãos
- Presidência da República.
- Ministérios.
- Secretarias.
- Departamentos.

### 6.3. Características
- Personalidade jurídica de direito público (a PJ — não os órgãos).
- Imunidade tributária recíproca (CF 150 VI a).
- Bens impenhoráveis.
- Pagamento por precatório.

## 7. Administração Indireta

### 7.1. Composição (CF 37 XIX/XX + DL 200/67)
- Autarquias.
- Fundações Públicas.
- Empresas Públicas.
- Sociedades de Economia Mista.

### 7.2. Criação
- **Autarquia e Fundação Pública**: por **LEI específica**.
- **EP e SEM**: lei AUTORIZA a criação (constituição se dá após).

### 7.3. Subsidiárias
- Necessitam de autorização legislativa (CF 37 XX).

## 8. Tabela Resumo

| | Centralização | Descentralização | Desconcentração |
|---|---|---|---|
| O que ocorre | Adm faz tudo | Transfere para outra PJ | Distribuição interna |
| Cria PJ? | — | SIM | NÃO |
| Hierarquia | Interna | NÃO entre Direta e Indireta | SIM |
| Exemplo | Ministério atuando direto | Cria INSS | Cria Secretaria dentro do Ministério |

## 9. Como Cebraspe cobra

- **C/E**: "Desconcentração cria nova pessoa jurídica" → **ERRADO** (descentralização que cria).
- **C/E**: "Há hierarquia entre Ministro da Justiça e Diretor de Autarquia" → **ERRADO** (vinculação).
- **C/E**: "Autarquia é criada por lei autorizativa" → **ERRADO** (lei específica; EP/SEM que é autorizativa).
- **C/E**: "Descentralização por colaboração transfere a titularidade" → **ERRADO** (transfere só execução).
- **C/E**: "Criação de Município é descentralização territorial" → **CORRETO**.
- **C/E**: "Departamentos do Ministério são entidades da Administração Indireta" → **ERRADO** (são órgãos da Direta — desconcentração).
$content$,
$resumo$
# Resumo — Centralização, Descentralização, Desconcentração

## Centralização
- Adm Direta executa diretamente.
- Sem criar entidades novas.

## Descentralização (cria PJ)
- **Por Serviços/Técnica**: Indireta (autarquia, fundação, EP, SEM).
- **Por Colaboração**: particular (concessão/permissão).
- **Territorial**: novo ente federativo.
- **Social**: OS, OSCIP, Sistema S.

## Desconcentração (dentro da mesma PJ)
- Distribuição interna de competências.
- Cria órgãos.
- Hierarquia.

## Vinculação x Hierarquia

| | Vinculação | Hierarquia |
|---|---|---|
| Entre | Direta ↔ Indireta | Mesma PJ |
| Ordens | NÃO | SIM |
| Controle | Finalístico | Total |

## Adm Direta
União, Estados, DF, Municípios + órgãos.

## Adm Indireta (CF 37 XIX/XX)
- Autarquia (lei específica).
- Fundação Pública (lei ou lei autoriza).
- EP/SEM (lei AUTORIZA).
- Subsidiárias: autorização legislativa.

## Top pegadinhas
1. Descentralização CRIA PJ; Desconcentração NÃO.
2. Direta ↔ Indireta = VINCULAÇÃO (não hierarquia).
3. Autarquia: LEI ESPECÍFICA.
4. EP/SEM: LEI AUTORIZATIVA.
5. Colaboração: transfere EXECUÇÃO (não titularidade).
$resumo$
);

-- ┌─ 5. Administração direta e indireta ─────────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Administração direta e indireta',
  'Administração Direta e Indireta',
$content$
# Administração Direta e Indireta

## 1. Visão Geral

A **Administração Pública** divide-se estruturalmente em:
- **Administração DIRETA**: o próprio ente federativo.
- **Administração INDIRETA**: entidades autônomas criadas para executar atividades específicas.

⚠️ Base legal: **DL 200/67** (atualizado pela CF/88 e leis específicas).

## 2. Administração DIRETA

### 2.1. Composição
- **União**.
- **Estados-membros**.
- **Distrito Federal**.
- **Municípios**.

E seus órgãos internos:
- Presidência da República.
- Ministérios.
- Secretarias.
- Departamentos.
- Coordenações.

### 2.2. Características
- Pessoa jurídica de **DIREITO PÚBLICO**.
- Personalidade própria do ente federativo (não dos órgãos).
- Imunidade tributária recíproca (CF 150 VI a).
- Bens impenhoráveis (regime de precatório).
- Servidores estatutários (regra).

### 2.3. Forma de Atuação
- Executa diretamente as atividades.
- Por meio de seus órgãos (desconcentração interna).

## 3. Administração INDIRETA (CF 37 XIX/XX + DL 200/67)

### 3.1. Composição
- **Autarquias**.
- **Fundações Públicas**.
- **Empresas Públicas** (EP).
- **Sociedades de Economia Mista** (SEM).

### 3.2. Características Comuns
- **Personalidade jurídica PRÓPRIA**.
- Patrimônio próprio.
- Autonomia administrativa e financeira.
- Criadas para executar atividade específica (princípio da **ESPECIALIDADE**).

### 3.3. Princípios
- **Especialidade**: limitada à finalidade legal.
- **Controle finalístico/tutela**: pela Adm Direta.
- **Submissão à lei**: normas próprias.

## 4. Autarquia

### 4.1. Conceito
PJ de **direito público**, criada por **LEI ESPECÍFICA** (CF 37 XIX), para executar atividade típica de Estado.

### 4.2. Exemplos
- INSS, IBAMA, BACEN, INPI, ANATEL, ANS, INMETRO.

### 4.3. Características
- PJ DIREITO PÚBLICO.
- Bens impenhoráveis.
- Imunidade tributária recíproca.
- Servidores estatutários.
- Regime de precatório.
- Prazos processuais em dobro.

### 4.4. Espécies
- **Comuns**: prestam serviços tradicionais (INSS).
- **Especiais**: regime diferenciado (AGÊNCIAS REGULADORAS — autarquias em regime especial).

## 5. Fundação Pública

### 5.1. Conceito
PJ de finalidade não lucrativa, criada para realizar atividades de interesse social.

### 5.2. Tipos (CF 37 XIX)
- **Fundação de direito PÚBLICO**: criada por **LEI** específica. Tratamento similar à autarquia.
- **Fundação de direito PRIVADO**: lei autoriza criação. Regime predominantemente civil.

### 5.3. Exemplos
- FUNAI, FUNAR, IBGE (autarquia, na prática), FUNDACENTRO.

## 6. Empresa Pública (EP)

### 6.1. Conceito (DL 200/67)
PJ de **direito privado**, com **100% de capital público**, criada por LEI AUTORIZATIVA, para exercer atividade econômica ou prestar serviço público.

### 6.2. Características
- Capital 100% público (União, Estados, Municípios ou Indireta).
- Pode adotar **qualquer forma societária** (SA, LTDA, etc.).
- Servidores: **regime CLT**.
- Bens em regra penhoráveis.
- Submetidas à Lei 13.303/16 (Lei das Estatais).

### 6.3. Exemplos
- Caixa Econômica Federal, Correios (ECT), BNDES.

## 7. Sociedade de Economia Mista (SEM)

### 7.1. Conceito
PJ de **direito privado**, com **capital MISTO** (controle público), criada por LEI AUTORIZATIVA.

### 7.2. Características
- Capital misto: maioria pública (controle).
- Sempre forma de **SOCIEDADE ANÔNIMA (S/A)**.
- Servidores: regime CLT.
- Acionistas privados.
- Submetidas à Lei 13.303/16 + Lei 6.404/76.

### 7.3. Exemplos
- Banco do Brasil, Petrobras, Eletrobrás.

## 8. EP x SEM (comparativo)

| | EP | SEM |
|---|---|---|
| Capital | 100% público | Misto (controle público) |
| Forma | Qualquer | Sempre S/A |
| Exemplo | Caixa, Correios | BB, Petrobras |

## 9. EP/SEM em Atividade Econômica x Serviço Público

### 9.1. Em atividade econômica (CF 173)
- Sujeitas ao regime da iniciativa privada.
- Sem imunidade tributária.
- Bens penhoráveis.
- Não usam precatório.

### 9.2. Em serviço público
- Regime mais próximo da Fazenda Pública.
- STF: Correios têm imunidade tributária mesmo sendo EP (RE 220.906).
- Caixa Econômica em serviços postais.

## 10. Quadro Comparativo Final

| | Autarquia | Fundação Pub. | EP | SEM |
|---|---|---|---|---|
| Direito | PÚBLICO | Pub ou Priv | Privado | Privado |
| Criação | LEI específica | LEI ou autoriza | LEI autoriza | LEI autoriza |
| Capital | — | — | 100% público | Misto |
| Forma | — | — | Qualquer | S/A |
| Servidor | Estatutário | Estatutário ou CLT | CLT | CLT |

## 11. Como Cebraspe cobra

- **C/E**: "Autarquia é criada por lei autorizativa" → **ERRADO** (lei específica).
- **C/E**: "EP tem capital misto" → **ERRADO** (100% público; SEM é misto).
- **C/E**: "Correios não têm imunidade tributária por ser EP" → **ERRADO** (STF reconhece a imunidade).
- **C/E**: "SEM pode adotar forma de Ltda" → **ERRADO** (sempre S/A).
- **C/E**: "Servidor de autarquia é regido pela CLT" → **ERRADO** (estatutário).
- **C/E**: "Fundação Pública é sempre de direito público" → **ERRADO** (pode ser de direito privado).
$content$,
$resumo$
# Resumo — Administração Direta e Indireta

## Adm Direta
- União, Estados, DF, Municípios + órgãos.
- PJ de direito público.
- Imunidade tributária recíproca, precatório.

## Adm Indireta (CF 37 XIX/XX)
- Autarquia | Fundação Pública | EP | SEM.

## Autarquia
- Direito PÚBLICO.
- LEI específica.
- INSS, IBAMA, BACEN.
- Servidores estatutários.

## Fundação Pública
- Pode ser PÚBLICA (lei) ou PRIVADA (lei autoriza).
- Atividade de interesse social.

## Empresa Pública (EP)
- Direito PRIVADO.
- 100% capital público.
- LEI AUTORIZA.
- Qualquer forma societária.
- CLT.
- Ex: Caixa, Correios.

## Sociedade de Economia Mista (SEM)
- Direito PRIVADO.
- Capital MISTO (controle público).
- LEI AUTORIZA.
- Sempre S/A.
- CLT.
- Ex: BB, Petrobras.

## EP x SEM

| | EP | SEM |
|---|---|---|
| Capital | 100% púb | Misto |
| Forma | Qualquer | S/A |

## Em atividade econômica vs serviço público
- Atividade econômica: regime privado (sem imunidade, bens penhoráveis).
- Serviço público: regime próximo da Fazenda (Correios — STF imunidade).

## Top pegadinhas
1. Autarquia: LEI ESPECÍFICA.
2. EP/SEM: LEI AUTORIZA.
3. EP = 100% público; SEM = misto.
4. SEM sempre S/A.
5. Correios = EP com imunidade tributária (STF).
6. Autarquia: servidor ESTATUTÁRIO.
$resumo$
);

-- ┌─ 6. Razoabilidade e Proporcionalidade ───────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Razoabilidade e proporcionalidade',
  'Princípios da Razoabilidade e da Proporcionalidade',
$content$
# Princípios da Razoabilidade e da Proporcionalidade

## 1. Visão Geral

São **princípios IMPLÍCITOS** da Administração Pública. Limitam o exercício do poder discricionário e protegem contra atos arbitrários.

## 2. Princípio da Razoabilidade

### 2.1. Conceito
Exige que a atuação administrativa seja **CONGRUENTE** com a realidade e com os parâmetros aceitáveis pela sociedade. Veda decisões absurdas, abusivas, contraproducentes.

### 2.2. Origem
- **Common Law** (sistema anglo-saxão).
- "Reasonableness".
- Adaptado ao direito continental.

### 2.3. No Brasil
- Lei 9.784/99 (art. 2º): expressamente previsto como princípio do processo administrativo federal.
- Constituições Estaduais: muitas o citam.

### 2.4. Aplicação
- Decisões devem ser **lógicas, coerentes e sensatas**.
- Decisões absurdas podem ser ANULADAS pelo Judiciário (mesmo que dentro da discricionariedade aparente).

### 2.5. Função
- LIMITE à discricionariedade.
- Permite controle judicial até do mérito (quando há flagrante irrazoabilidade).

## 3. Princípio da Proporcionalidade

### 3.1. Conceito
Exige que a atuação administrativa seja **PROPORCIONAL** ao objetivo pretendido. Veda excessos.

### 3.2. Origem
- Direito alemão (Verhältnismäßigkeit).
- Difundido após a Segunda Guerra.

### 3.3. Tríplice Exame

Para verificar a proporcionalidade, aplica-se o **TESTE TRIPARTITE**:

#### A) Adequação (idoneidade)
- O meio escolhido é apto a atingir o fim?

#### B) Necessidade (exigibilidade)
- Não há outro meio menos restritivo igualmente eficaz?

#### C) Proporcionalidade em Sentido Estrito
- Os benefícios superam os custos? Ponderação.

### 3.4. Aplicação
- Atos restritivos de direitos.
- Sanções administrativas.
- Polícia administrativa.
- Limitações à propriedade.

## 4. Razoabilidade x Proporcionalidade

### 4.1. Doutrina majoritária
- **Praticamente sinônimos** no Brasil.
- Razoabilidade é mais ampla; proporcionalidade tem método específico (tripartite).

### 4.2. Diferença prática
- Razoabilidade: avaliação geral (atos não absurdos).
- Proporcionalidade: ponderação rigorosa em casos específicos.

## 5. Aplicação Prática

### 5.1. Atos Discricionários
- A discricionariedade NÃO é arbitrariedade.
- Mesmo atos discricionários devem ser razoáveis e proporcionais.

### 5.2. Sanções Administrativas
- Pena deve ser proporcional à infração.
- Não pode haver punição excessiva.

### 5.3. Limitações a Direitos
- Restrições só justificáveis se proporcionais.

### 5.4. Poder de Polícia
- Atuação fiscalizadora não pode ser excessiva.

## 6. Controle Judicial

### 6.1. Controle de legalidade
- Sempre cabe.

### 6.2. Controle de mérito
- Em regra, vedado ao Judiciário.
- **EXCEÇÃO**: quando há **flagrante irrazoabilidade ou desproporcionalidade**, o Judiciário pode anular o ato.

### 6.3. Discricionariedade técnica
- Decisões com fundamentos científicos: deferência ao mérito.
- Mas se houve irrazoabilidade técnica, controle judicial.

## 7. Jurisprudência

### 7.1. STF
- Aplica regularmente os princípios.
- Em controle de constitucionalidade.

### 7.2. STJ
- Aplica em decisões administrativas.
- Anulação de atos arbitrários.

## 8. Doutrina

### 8.1. Celso Antônio Bandeira de Mello
- Defende a proporcionalidade.

### 8.2. José dos Santos Carvalho Filho
- Razoabilidade é princípio amplo.

### 8.3. Luís Roberto Barroso
- Tripartite da proporcionalidade.

## 9. Importância Prática

Esses princípios são usados em:
- Anulação de atos administrativos.
- Controle de atos sancionatórios.
- Limitação ao poder discricionário.
- Defesa de direitos fundamentais.

## 10. Como Cebraspe cobra

- **C/E**: "Razoabilidade e proporcionalidade são princípios EXPRESSOS na CF" → **ERRADO** (implícitos; Lei 9.784/99 os expressa).
- **C/E**: "Discricionariedade significa arbitrariedade" → **ERRADO** (discricionariedade tem limites).
- **C/E**: "O Judiciário NUNCA pode controlar o mérito administrativo" → **ERRADO** (pode em caso de flagrante irrazoabilidade/desproporcionalidade).
- **C/E**: "O teste tripartite da proporcionalidade tem 4 etapas" → **ERRADO** (3: adequação, necessidade, proporcionalidade estrita).
- **C/E**: "Sanção administrativa não precisa ser proporcional" → **ERRADO** (deve ser proporcional à infração).
- **C/E**: "Atos discricionários NÃO se submetem ao controle judicial" → **ERRADO** (submetem-se quando há irrazoabilidade).
$content$,
$resumo$
# Resumo — Razoabilidade e Proporcionalidade

## Razoabilidade
- Congruente, lógico, sensato.
- Veda decisões absurdas.
- Origem: Common Law.
- Lei 9.784/99 art. 2º.

## Proporcionalidade
- Atuação proporcional ao fim.
- Veda excessos.
- Origem: Direito alemão.

## Teste Tripartite (Proporcionalidade)
1. **Adequação** (idoneidade).
2. **Necessidade** (exigibilidade).
3. **Proporcionalidade em sentido estrito** (ponderação).

## Aplicação
- Sanções (proporcionais à infração).
- Poder de polícia (sem excessos).
- Limitações a direitos.
- Discricionariedade (limites).

## Controle Judicial
- Sempre legalidade.
- Mérito apenas em FLAGRANTE irrazoabilidade.

## Relação com Discricionariedade
- Discricionariedade ≠ arbitrariedade.
- Mesmo atos discricionários devem ser razoáveis/proporcionais.

## Top pegadinhas
1. São IMPLÍCITOS (não expressos).
2. Teste tripartite tem 3 etapas (não 4).
3. Judiciário PODE controlar mérito em irrazoabilidade flagrante.
4. Discricionariedade NÃO é arbitrariedade.
5. Lei 9.784/99 expressa esses princípios.
$resumo$
);

-- ┌─ 7. Discricionariedade administrativa ───────────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Discricionariedade administrativa',
  'Discricionariedade Administrativa e Mérito',
$content$
# Discricionariedade Administrativa e Mérito

## 1. Conceito

**Discricionariedade** é a margem de **liberdade** conferida por lei à Administração para escolher entre alternativas igualmente válidas, de acordo com critérios de **conveniência** e **oportunidade**.

⚠️ Discricionariedade NÃO é arbitrariedade. Existe dentro dos limites da lei.

## 2. Vinculado x Discricionário

### 2.1. Ato Vinculado
- Lei define COMPLETAMENTE os elementos.
- Adm não tem escolha.
- Ex: aposentadoria voluntária (preenchidos requisitos, devida).
- Concessão de licença para casamento.

### 2.2. Ato Discricionário
- Lei dá margem de escolha.
- Adm avalia conveniência e oportunidade.
- Ex: nomeação para cargo em comissão.
- Permissão de uso de bem público.

### 2.3. Atos Parcialmente Vinculados
- Alguns elementos são vinculados (competência, finalidade, forma); outros podem ser discricionários (motivo, objeto).

⚠️ Mesmo atos discricionários têm elementos VINCULADOS (competência, finalidade, forma).

## 3. Mérito Administrativo

### 3.1. Conceito
**Mérito** é o juízo de **CONVENIÊNCIA** e **OPORTUNIDADE** que a Administração faz para escolher a melhor alternativa.

### 3.2. Componentes
- **Conveniência**: utilidade prática da decisão.
- **Oportunidade**: momento adequado para sua execução.

### 3.3. Quem decide o mérito
- **Administração**: sempre.
- **Judiciário**: NÃO controla o mérito (regra).
- **EXCEÇÃO**: o Judiciário pode anular ato por irrazoabilidade/desproporcionalidade FLAGRANTE.

## 4. Limites da Discricionariedade

### 4.1. Limites legais
- Lei delimita as opções possíveis.
- Adm não pode escolher fora da lei.

### 4.2. Limites principiológicos
- **Legalidade**: dentro da lei.
- **Razoabilidade**: decisão sensata.
- **Proporcionalidade**: sem excessos.
- **Moralidade**: ética administrativa.
- **Impessoalidade**: sem favoritismos.
- **Eficiência**: bons resultados.

### 4.3. Limites finalísticos
- Decisão deve atender ao interesse público.
- Vício de finalidade = nulidade.

## 5. Controle da Discricionariedade

### 5.1. Pelo Administrador
- **Autotutela**: pode revogar ato discricionário por inconveniência (Súmula 473 STF).
- Mas atos VINCULADOS NÃO se revogam.

### 5.2. Pelo Judiciário
- Aspectos VINCULADOS: controle pleno.
- MÉRITO: regra é não controle.
- **EXCEÇÃO**: irrazoabilidade ou desvio de poder/finalidade.

### 5.3. Pelo TCU
- Legalidade.
- Em alguns casos, oportunidade econômica.

## 6. Teorias sobre a Discricionariedade

### 6.1. Teoria da Sindicabilidade Reduzida
- Discricionariedade quase intocável pelo Judiciário.

### 6.2. Teoria da Sindicabilidade Ampla
- Discricionariedade controlável amplamente (por razoabilidade/proporcionalidade).
- **MAIS ACEITA** atualmente.

### 6.3. Teoria dos Motivos Determinantes
- Os motivos declarados pelo agente vinculam a Adm.
- Se motivo for falso, ato é nulo.

## 7. Discricionariedade Técnica

### 7.1. Conceito
Margem de escolha baseada em conhecimentos TÉCNICOS especializados.

### 7.2. Exemplos
- Decisões médicas em serviços de saúde.
- Análises de impacto ambiental (EIA/RIMA).
- Aprovações regulatórias.

### 7.3. Controle
- Maior deferência ao mérito.
- Mas se houver irrazoabilidade técnica, controle judicial.

## 8. Desvio de Poder x Vício de Finalidade

### 8.1. Desvio de Poder (ou desvio de finalidade)
- Agente público pratica ato com finalidade DIVERSA da prevista em lei.
- Mesmo que dentro da competência aparente.
- Acarreta NULIDADE.

### 8.2. Exemplos
- Remoção de servidor para puni-lo (não por interesse do serviço).
- Punição com finalidade política.

## 9. Discricionariedade e Conceitos Jurídicos Indeterminados

### 9.1. Conceitos Indeterminados
- Expressões vagas na lei: "moralidade", "boa-fé", "ordem pública".
- A Adm tem margem para INTERPRETAR.

### 9.2. Diferença para discricionariedade
- Conceitos indeterminados: a lei tem uma resposta correta (mas vaga).
- Discricionariedade: a lei admite VÁRIAS respostas válidas.

## 10. Como Cebraspe cobra

- **C/E**: "Discricionariedade é sinônimo de arbitrariedade" → **ERRADO** (discricionariedade tem limites).
- **C/E**: "Atos vinculados podem ser revogados por inconveniência" → **ERRADO** (atos vinculados não se revogam).
- **C/E mérito**: "O Judiciário JAMAIS controla o mérito administrativo" → **ERRADO** (controla em flagrante irrazoabilidade).
- **C/E**: "Desvio de finalidade NÃO anula o ato" → **ERRADO** (anula).
- **C/E**: "Mesmo atos discricionários têm elementos vinculados" → **CORRETO** (competência, finalidade, forma).
- **C/E**: "Discricionariedade técnica é sinônimo de arbitrariedade técnica" → **ERRADO**.
$content$,
$resumo$
# Resumo — Discricionariedade e Mérito

## Discricionariedade
- Margem de escolha conferida por LEI.
- Convene + Oportunidade.
- NÃO é arbitrariedade.

## Vinculado x Discricionário

| | Vinculado | Discricionário |
|---|---|---|
| Lei define tudo? | SIM | NÃO (dá margem) |
| Escolha? | NÃO | SIM (mérito) |
| Revogação? | NÃO | SIM (por inconveniência) |

## Mérito = Conveniência + Oportunidade
- Quem decide: ADMINISTRAÇÃO.
- Judiciário: REGRA não controla; EXCEÇÃO irrazoabilidade.

## Limites
- Legais (lei delimita opções).
- Principiológicos (LIMPE + razoabilidade + proporcionalidade).
- Finalísticos (interesse público).

## Controle Judicial
- Aspectos vinculados: PLENO.
- Mérito: irrazoabilidade ou desvio.

## Teoria dos Motivos Determinantes
Motivos declarados vinculam. Se falsos, ato é nulo.

## Discricionariedade Técnica
- Decisões com base técnica.
- Maior deferência.
- Controle se irrazoabilidade técnica.

## Desvio de Poder
Finalidade diversa da prevista em lei → NULIDADE.

## Top pegadinhas
1. Discricionariedade NÃO é arbitrariedade.
2. Atos vinculados NÃO se revogam.
3. Judiciário pode controlar em irrazoabilidade flagrante.
4. Mesmo atos discricionários têm elementos vinculados.
5. Desvio de finalidade = nulidade.
6. Mérito ≠ Conceitos Indeterminados.
$resumo$
);

-- ┌─ 8. Princípio da Continuidade do Serviço Público ───────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Princípio da continuidade do serviço público',
  'Princípio da Continuidade do Serviço Público',
$content$
# Princípio da Continuidade do Serviço Público

## 1. Conceito

**Princípio da Continuidade** é o princípio implícito que determina que os **serviços públicos** sejam prestados **SEM INTERRUPÇÕES** ou paralisações, garantindo permanência e regularidade.

⚠️ É um princípio IMPLÍCITO. Decorre do princípio do interesse público.

## 2. Fundamento

### 2.1. Fundamento constitucional
- CF 175 (delegação de serviços).
- CF 37 (princípios da Administração).

### 2.2. Fundamento legal
- Lei 8.987/95 (concessões).
- Lei 13.460/17 (Código de Defesa do Usuário).

### 2.3. Fundamento doutrinário
- Decorre do princípio da supremacia do interesse público.

## 3. Aplicação

### 3.1. À Administração Direta
- Serviços essenciais (saúde, educação, segurança) não podem ser interrompidos.

### 3.2. Aos Concessionários
- Devem prestar serviço regular e contínuo.
- Inexecução = caducidade (art. 38 Lei 8.987).

### 3.3. Aos Servidores
- Restrições ao direito de GREVE em alguns setores.
- Manutenção de serviços mínimos.

## 4. Exceções (Restrições)

### 4.1. Exceções legítimas
- Caso fortuito ou força maior.
- Necessidade de reparos urgentes.
- Inadimplemento do usuário (com aviso prévio — Lei 8.987 art. 6º §3º).
- Razões de ordem técnica ou segurança.

### 4.2. Lei 8.987/95 art. 6º §3º
"Não se caracteriza como descontinuidade do serviço a sua interrupção em SITUAÇÃO DE EMERGÊNCIA ou após PRÉVIO AVISO, quando:
- Motivada por razões de ordem técnica ou de segurança das instalações.
- Inadimplemento do usuário, considerado o interesse da coletividade."

⚠️ Cebraspe cobra esse dispositivo MUITO.

## 5. Greve dos Servidores Públicos

### 5.1. CF 37 VII
- Direito de greve do servidor público.
- Termos a serem definidos em LEI ESPECÍFICA.

### 5.2. Mandado de Injunção 670/STF
- Diante da OMISSÃO LEGISLATIVA, o STF aplicou a Lei 7.783/89 (Lei de Greve da iniciativa privada) AOS SERVIDORES.

### 5.3. Limitações
- Categorias de SEGURANÇA PÚBLICA (PF, PRF, PMs, PCs, PPs): NÃO podem fazer greve (STF — STA 184).
- Outras categorias: podem, mas mantendo serviços mínimos.

## 6. Aplicação Prática

### 6.1. Direito de greve
- Restrições em serviços essenciais.
- Exigência de manutenção de percentual de serviços.

### 6.2. Greves em escolas, hospitais
- Permitidas com manutenção de serviços essenciais.

### 6.3. Greves no Judiciário/Tribunais
- Permitidas mas com restrições.

### 6.4. Corte de serviços por inadimplência
- Permitido, mediante prévio aviso.
- Súmula STJ 412: dívida prescrita não autoriza corte do serviço.

## 7. Consequências do Descumprimento

### 7.1. Para a Adm Direta
- Responsabilidade por omissão.
- Indenização por danos.

### 7.2. Para concessionários
- Caducidade do contrato.
- Sanções pecuniárias.
- Reversão de bens.

### 7.3. Para servidores em greve ilegal
- Desconto de salário.
- Possibilidade de demissão (em casos extremos).
- Responsabilização disciplinar.

## 8. Princípios Relacionados

### 8.1. Modicidade Tarifária
- Tarifa razoável + continuidade.

### 8.2. Generalidade
- Para todos os usuários.

### 8.3. Cortesia
- Tratamento adequado.

### 8.4. Eficiência
- Bons resultados.

### 8.5. Adequação (regularidade)
- Prestação na forma prevista.

## 9. Súmulas Relevantes

- **Súmula 195 STJ**: em execução fiscal, é possível o pagamento parcelado.
- **Súmula 412 STJ**: dívida prescrita não autoriza corte do serviço público.

## 10. Como Cebraspe cobra

- **C/E**: "Corte de serviço por inadimplência é vedado em todas as hipóteses" → **ERRADO** (permitido com aviso prévio).
- **C/E greve**: "Servidor público NÃO tem direito de greve" → **ERRADO** (tem direito; categorias específicas não — segurança pública).
- **C/E**: "Continuidade é princípio EXPRESSO na CF" → **ERRADO** (implícito).
- **C/E**: "Greve de PF é permitida" → **ERRADO** (STF veda — STA 184).
- **C/E lei 8.987**: "Razões técnicas justificam a interrupção sem aviso prévio" → **ERRADO** (aviso prévio é exigido salvo emergência).
- **C/E**: "Concessionária pode cortar serviço por dívida prescrita" → **ERRADO** (Súmula 412 STJ).
$content$,
$resumo$
# Resumo — Continuidade do Serviço Público

## Conceito
Serviços públicos devem ser prestados SEM INTERRUPÇÕES.

## Fundamento
- Implícito (CF 175, 37).
- Lei 8.987/95.
- Lei 13.460/17 (Defesa do Usuário).

## Exceções (Lei 8.987 art. 6º §3º)
Não há descontinuidade se:
- EMERGÊNCIA.
- Aviso prévio + razões técnicas/segurança.
- Aviso prévio + inadimplemento do usuário.

## Greve dos Servidores
- CF 37 VII: direito de greve.
- STF MI 670: aplica Lei 7.783/89.
- **PROIBIDA**: segurança pública (PF, PRF, PMs, PCs, PPs).

## Súmulas STJ
- Súmula 412: dívida PRESCRITA NÃO autoriza corte.
- Súmula 195: parcelamento em execução fiscal.

## Consequências
- Adm: responsabilidade por omissão.
- Concessionária: caducidade.
- Servidor em greve ilegal: desconto, demissão, disciplinar.

## Princípios relacionados
Modicidade, generalidade, cortesia, eficiência, adequação.

## Top pegadinhas
1. Continuidade é IMPLÍCITO.
2. Corte por inadimplência é permitido (com aviso).
3. Servidor TEM direito de greve.
4. Segurança pública: SEM greve (STF).
5. Dívida prescrita NÃO autoriza corte (Súmula 412 STJ).
6. Razões técnicas: AVISO PRÉVIO (salvo emergência).
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
