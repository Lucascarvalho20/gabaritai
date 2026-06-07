-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 14 — Crimes Honra + Abuso de Autoridade + Improbidade
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Penal: Crimes contra Honra (138-145) + Adm Justiça (338-359) + Adm Pública restante
--  - Lei 13.869/19 (Abuso de Autoridade) detalhada + Estatuto Desarmamento (10.826/03)
--  - Lei 8.429/92 (Improbidade) atualizada pela Lei 14.230/21
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-penal';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Crimes contra Honra e Adm Justiça (CP 138-145, 338-359)', 'pen-honra-adm-justica', 1.2, 500, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Crimes contra Honra e Adm Justiça (CP 138-145, 338-359)');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Abuso de Autoridade (Lei 13.869/19) e Desarmamento (10.826/03)', 'pen-abuso-desarmamento', 1.4, 501, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Abuso de Autoridade (Lei 13.869/19) e Desarmamento (10.826/03)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Improbidade Administrativa (Lei 8.429/92 + Lei 14.230/21)', 'adm-improbidade-detalhada', 1.5, 300, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Improbidade Administrativa (Lei 8.429/92 + Lei 14.230/21)');
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

-- ┌─ 1. PENAL — Crimes Honra + Adm Justiça ──────────────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Crimes contra Honra e Adm Justiça (CP 138-145, 338-359)',
  'Crimes contra a Honra e Crimes contra a Administração da Justiça',
$content$
# Crimes contra a Honra e Crimes contra a Administração da Justiça

Dois blocos do CP que faltavam fechar. Cebraspe cobra muito a diferença entre Calúnia/Difamação/Injúria + crimes específicos contra Adm Justiça (denunciação caluniosa, falso testemunho).

## 1. Crimes contra a Honra (CP 138-145)

### 1.1. Bem jurídico

- **Honra objetiva** (reputação social): calúnia, difamação.
- **Honra subjetiva** (dignidade interna): injúria.

### 1.2. Calúnia (CP 138)

> "Caluniar alguém, imputando-lhe falsamente fato definido como CRIME."

- **Elementos**: imputação + falsa + fato definido como crime + a pessoa determinada.
- **Pena**: detenção 6 meses a 2 anos + multa.
- **§1º**: quem propala, sabendo falso, responde também.
- **§2º**: caluniar morto = punível.
- **§3º — Exceção da verdade**: admitida (salvo crime de AP privada não iniciada ou em algumas situações específicas).

### 1.3. Difamação (CP 139)

> "Difamar alguém, imputando-lhe FATO OFENSIVO à sua reputação."

- Fato NÃO precisa ser crime; basta ofensa à reputação.
- **Pena**: detenção 3 meses a 1 ano + multa.
- **Exceção da verdade**: REGRA = não admitida.
  - **EXCEÇÃO**: se ofendido é funcionário público + ofensa relativa ao exercício de função.

### 1.4. Injúria (CP 140)

> "Injuriar alguém, ofendendo-lhe a DIGNIDADE OU DECORO."

- Ofensa subjetiva (xingar, chamar de incompetente).
- **Pena**: detenção 1 a 6 meses OU multa.
- **§1º**: juiz pode deixar de aplicar pena (provocação ou retorsão imediata).
- **§2º — Injúria real**: violência ou vias de fato vexatórias. Pena: detenção 3 meses a 1 ano + multa.
- **§3º — Injúria preconceituosa**: utilização de elementos referentes à raça, cor, etnia, religião, origem, idade, deficiência (incluído pela Lei 12.033/09). Pena: reclusão 1 a 3 anos + multa. AP pública incondicionada (Lei 14.532/23 transformou esta em INJÚRIA RACIAL = crime de racismo equiparado).

### 1.5. Injúria racial (após Lei 14.532/23)

- **Mudança paradigmática**: STJ/STF antes considerava injúria racial; Lei 14.532/23 equiparou a **RACISMO** (Lei 7.716/89) → crime IMPRESCRITÍVEL e INAFIANÇÁVEL.
- Pena: reclusão 2 a 5 anos + multa (na Lei 7.716/89).

### 1.6. Disposições comuns

**Causas de aumento** (CP 141):
- Contra o Presidente da República ou chefe de governo estrangeiro.
- Contra funcionário público em razão da função.
- Na presença de várias pessoas, ou por meio que facilite a divulgação.
- Contra pessoa maior de 60 anos ou portadora de deficiência.
- Mediante paga ou promessa de recompensa.

**Exclusão de crime** (CP 142):
- Ofensa no debate judicial.
- Opinião desfavorável em crítica literária, artística ou científica.
- Conceito desfavorável em desempenho de função.

**Retratação** (CP 143):
- Antes da sentença → calúnia e difamação extintas.
- Injúria NÃO é extinta por retratação.

**Ação penal** (CP 145):
- Privada (regra).
- Pública condicionada à representação se contra funcionário no exercício de função.
- Pública incondicionada se injúria racial (após mudança).

## 2. Crimes contra a Administração da Justiça (CP 338-359)

### 2.1. Bem jurídico

Regular funcionamento do sistema de justiça.

### 2.2. Reingresso de estrangeiro expulso (338)

### 2.3. Denunciação caluniosa (339)

> "Dar causa à instauração de investigação policial, processo judicial, instauração de PAD..., imputando a alguém crime de que o sabe inocente."

- **Pena**: reclusão 2 a 8 anos + multa.
- §1º: aumento se anonimato ou nome suposto.
- §2º: redução de 1/2 se contravenção.

### 2.4. Comunicação falsa de crime (340)

- Inicia investigação ciente da inveracidade.
- Pena: detenção 1 a 6 meses + multa.

### 2.5. Autoacusação falsa (341)

### 2.6. Falso testemunho ou falsa perícia (342)

> "Fazer afirmação falsa, ou negar/calar a verdade em depoimento, perícia, tradução em processo judicial, policial, adm, CPI."

- **Pena**: reclusão 2 a 4 anos + multa.
- **§1º — Causa de aumento (1/6 a 1/3)**: cometido com corrupção do agente.
- **§2º — Causa de aumento**: se cometido em processo de feedback contra fé pública.
- **§3º — Extinção da punibilidade**: se o agente se retrata ou declara a verdade antes da sentença no processo em que ocorreu.

### 2.7. Corrupção ativa de testemunha, perito... (343)

### 2.8. Coação no curso do processo (344)

> "Usar de violência ou grave ameaça com fim de favorecer interesse próprio ou alheio, contra autoridade, parte, funcionário, perito, testemunha..."

- Pena: reclusão 1 a 4 anos + multa.

### 2.9. Exercício arbitrário das próprias razões (345)

### 2.10. Fraude processual (347)

- Inovar artificiosamente o estado do lugar/coisa/pessoa no curso de processo.
- Pena: detenção 3 meses a 2 anos + multa.

### 2.11. Favorecimento pessoal (348)

- Auxiliar alguém após crime, a subtrair-se da ação de autoridade.
- Não se aplica ao parente próximo (escusa absolutória).

### 2.12. Favorecimento real (349)

- Prestar auxílio para tornar seguro o proveito do crime.

### 2.13. Exercício arbitrário ou abuso de poder (350) — REVOGADO pela Lei 13.869/19

### 2.14. Fuga de preso (351)

### 2.15. Patrocínio infiel (355)

- Advogado/procurador que trai sua função, prejudicando interesse do cliente.

### 2.16. Sonegação de papel ou objeto de valor probatório (356)

## 3. Como Cebraspe cobra

- **C/E**: "Caluniar morto é fato atípico" → **ERRADO** (CP 138 §2º).
- **C/E**: "Exceção da verdade é admitida em todos os crimes contra honra" → **ERRADO** (regra: só calúnia; difamação só se funcionário público).
- **C/E**: "Injúria pode ser extinta por retratação" → **ERRADO** (apenas calúnia e difamação — CP 143).
- **C/E**: "Injúria racial agora é crime de racismo" → **CORRETO** (Lei 14.532/23).
- **C/E**: "Denunciação caluniosa exige instauração efetiva de investigação" → **CORRETO** (dar causa).
- **C/E**: "Falso testemunho permite retratação até o trânsito em julgado" → **ERRADO** (até a sentença).
$content$,
$resumo$
# Resumo — Crimes contra Honra + Adm Justiça

## Honra

| | Calúnia (138) | Difamação (139) | Injúria (140) |
|---|---|---|---|
| Fato | CRIME | Ofensivo (não-crime) | Subjetiva |
| Honra | Objetiva | Objetiva | Subjetiva |
| Pena | 6m-2a det + multa | 3m-1a det + multa | 1-6m det OU multa |
| Exceção da verdade | SIM | NÃO (salvo func. púb) | NÃO |
| Retratação extingue | SIM | SIM | NÃO |

### Injúria — modalidades
- §2º Real: violência/vias de fato → 3m-1a det.
- §3º Preconceituosa: hoje injúria racial = RACISMO (Lei 14.532/23) — IMPRESCRITÍVEL, INAFIANÇÁVEL.

### Aumento (141)
PR/chefe estrangeiro, funcionário público, várias pessoas, > 60 anos/PCD, paga/recompensa.

### Exclusão (142)
Debate judicial, crítica literária/artística/científica, conceito em função.

## Adm Justiça

| Art. | Crime | Pena |
|---|---|---|
| 339 | Denunciação caluniosa | Reclusão 2-8 + multa |
| 340 | Comunicação falsa | Det 1-6m + multa |
| 342 | Falso testemunho/perícia | Reclusão 2-4 + multa |
| 343 | Corrupção testemunha | Reclusão |
| 344 | Coação no curso | Reclusão 1-4 + multa |
| 347 | Fraude processual | Det 3m-2a + multa |
| 348 | Favorecimento pessoal | Det |
| 349 | Favorecimento real | Det |
| 351 | Fuga de preso | Det |
| 355 | Patrocínio infiel | Det |

### Falso testemunho (342) — extinção
Retratação ANTES da sentença → extingue punibilidade.

## Top pegadinhas Cebraspe

1. Caluniar MORTO = punível.
2. Exceção verdade: REGRA só na calúnia.
3. Retratação extingue: SÓ calúnia e difamação.
4. Injúria racial = RACISMO (Lei 14.532/23).
5. Falso testemunho: retratação ATÉ a sentença.
6. CP 350 (exerc arbitrário) foi REVOGADO pela Lei 13.869.
$resumo$
);

-- ┌─ 2. PENAL — Abuso de Autoridade + Desarmamento ──────────────────────────┐
SELECT upsert_material(
  'direito-penal',
  'Abuso de Autoridade (Lei 13.869/19) e Desarmamento (10.826/03)',
  'Lei de Abuso de Autoridade (13.869/19) e Estatuto do Desarmamento (10.826/03)',
$content$
# Lei de Abuso de Autoridade (13.869/19) e Estatuto do Desarmamento (10.826/03)

Dois temas críticos pra carreiras policiais. Cebraspe cobra DIRETO a letra das leis — tipos penais específicos, penas, agentes.

## 1. Lei 13.869/19 — Nova Lei de Abuso de Autoridade

### 1.1. Contexto

Revogou a antiga Lei 4.898/65. Trouxe **tipos novos**, penas mais altas e restrição de aplicação (exigência do **especial fim de agir**).

### 1.2. Elemento subjetivo (art. 1º §1º)

⚠️ **CRUCIAL**: agente público só responde se agiu:
- Com a **finalidade específica** de prejudicar outrem, beneficiar a si ou a terceiro, OU
- Por **mero capricho** ou **satisfação pessoal**.

Sem esse especial fim de agir → ATÍPICO. Mera divergência de interpretação NÃO é crime.

### 1.3. Sujeito ativo

**Qualquer agente público** (art. 2º): servidor público, militar, terceirizado, jurado, conscrito.

### 1.4. Crimes específicos

#### Art. 9º — Decretar prisão sem fundamento legal
- Pena: reclusão 1-4 anos + multa.

#### Art. 10 — Decretar condução coercitiva sem prévia intimação
- Pena: detenção 1-4 anos + multa.

#### Art. 12 — Constranger preso com violência/grave ameaça a depor contra si
- Pena: reclusão 1-4 anos + multa.

#### Art. 13 — Constranger preso a depor de modo absurdo
- Pena: detenção 1-4 anos + multa.

#### Art. 15 — Constranger a depor (delegado, juiz, MP) sob ameaça de prisão sem fundamento legal
- Pena: detenção 1-4 anos + multa.

#### Art. 16 — Deixar de identificar-se ou identificar-se falsamente em ato de polícia
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 18 — Submeter preso a exposição ridicularizante ou ofensiva
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 19 — Impedir ou retardar pedido de habeas corpus
- Pena: detenção 1-4 anos + multa.

#### Art. 20 — Impedir o acesso do preso à entrevista pessoal e reservada com advogado
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 22 — Invadir imóvel alheio para inquérito sem mandado e fora das hipóteses constitucionais
- Pena: detenção 1-4 anos + multa.

#### Art. 25 — Proceder à obtenção de prova com violação à intimidade da vida privada
- Pena: detenção 1-4 anos + multa.

#### Art. 28 — Divulgar gravação ou trecho de gravação sem autorização (com fim ilícito)
- Pena: detenção 1-4 anos + multa.

#### Art. 30 — Dar início ou prosseguir investigação ciente de inocência do investigado
- Pena: detenção 1-4 anos + multa.

#### Art. 32 — Negar a custódia
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 33 — Exigir informação ou tratamento privilegiado
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 36 — Decretar quebra de sigilo bancário/fiscal sem fundamento ou desnecessariamente
- Pena: detenção 1-4 anos + multa.

#### Art. 37 — Demorar demasiadamente o recolhimento de preso
- Pena: detenção 6 meses a 2 anos + multa.

#### Art. 38 — Indagar sobre crime sem informar direito ao silêncio
- Pena: detenção 6 meses a 2 anos + multa.

### 1.5. Sanções administrativas e civis

Independentes da ação penal:
- Civil: reparação do dano.
- Administrativa: pode levar à demissão.

### 1.6. Tríplice responsabilização

Idêntica à servidor: civil + penal + administrativa — independentes.

## 2. Estatuto do Desarmamento — Lei 10.826/03

### 2.1. SINARM e SIGMA

- **SINARM** (Sistema Nacional de Armas): vinculado à PF, gerencia armas de uso permitido.
- **SIGMA** (Sistema de Gerenciamento Militar de Armas): exército, controla armas de uso restrito/proibido.

### 2.2. Classificação de armas

- **Uso permitido**: civis comuns mediante autorização (revólveres .22, .32, .38; carabinas .22, etc).
- **Uso restrito**: forças armadas + civis específicos (calibres .40, .45, 9mm; armas longas .308 etc).
- **Uso proibido**: armas de guerra (metralhadora, granada, lança-chamas).

### 2.3. Posse x Porte

- **Posse** (art. 12): manter arma em residência ou dependência de trabalho (próprio do detentor da empresa).
- **Porte** (art. 14): transportar ou trazer arma fora dos limites de posse.

### 2.4. Crimes (10.826/03)

#### Art. 12 — Posse irregular de arma de USO PERMITIDO
- Pena: detenção 1-3 anos + multa.
- **Crime de menor potencial** (sob restrita interpretação).

#### Art. 14 — Porte ilegal de arma de USO PERMITIDO
- Pena: reclusão 2-4 anos + multa.

#### Art. 15 — Disparo de arma de fogo em via pública
- Pena: reclusão 2-4 anos + multa.

#### Art. 16 — Posse OU porte de arma de USO RESTRITO
- Pena: reclusão 3-6 anos + multa.
- **Hediondo** se uso PROIBIDO (após Pacote Anticrime).

#### Art. 16 §1º — Causas de aumento
- Suprimir/alterar marca/numeração.
- Modificar características da arma.
- Posse de arma com numeração raspada.
- Arma de procedência estrangeira não desembaraçada.

#### Art. 17 — Comércio ilegal de arma de fogo (Hediondo)
- Reclusão 6-12 anos + multa.

#### Art. 18 — Tráfico internacional de arma de fogo (Hediondo)
- Reclusão 8-16 anos + multa.

### 2.5. Hediondos do Estatuto

Após Lei 13.964/19 (Pacote Anticrime):
- **Posse/porte de arma de USO PROIBIDO** (art. 16 caput em determinadas hipóteses).
- **Comércio ilegal** (art. 17).
- **Tráfico internacional** (art. 18).

### 2.6. Registro e porte civil

- Requisitos (art. 4º):
  - Idade ≥ 25 anos.
  - Comprovar idoneidade (antecedentes criminais).
  - Capacidade técnica (curso).
  - Aptidão psicológica.
  - Ocupação lícita.
- Porte civil: apenas mediante autorização da PF.

### 2.7. Atribuições

- **PF (SINARM)**: armas de uso permitido.
- **Exército (SIGMA)**: armas de uso restrito.

## 3. Como Cebraspe cobra

- **C/E abuso**: "Mera divergência de interpretação caracteriza abuso de autoridade" → **ERRADO** (exige finalidade específica — art. 1º §1º).
- **C/E abuso**: "Abuso de autoridade pode ser cometido por particular" → **ERRADO** (agente público).
- **C/E desarmamento**: "Posse e porte de arma são conceitos sinônimos" → **ERRADO**.
- **C/E desarmamento**: "Disparo em via pública é crime de menor potencial" → **ERRADO** (reclusão 2-4 anos).
- **C/E SINARM/SIGMA**: "PF controla armas de uso restrito" → **ERRADO** (uso permitido = PF; restrito = Exército).
- **C/E hediondo**: "Posse de arma de uso permitido é hediondo" → **ERRADO** (só de uso PROIBIDO/comércio/tráfico).
$content$,
$resumo$
# Resumo — Abuso de Autoridade + Desarmamento

## Lei 13.869/19 — Abuso

### Elemento subjetivo (art. 1º §1º)
ESPECIAL FIM DE AGIR: prejudicar + beneficiar + capricho + satisfação pessoal.
Sem isso = atípico.

### Sujeito ativo
Qualquer agente público (servidor, militar, jurado).

### Tríplice responsabilização
Civil + Penal + Administrativa (independentes).

### Tipos clássicos
- 9º: prisão sem fundamento.
- 10º: condução coercitiva sem intimação.
- 12: tortura branca p/ confissão.
- 18: exposição vexatória.
- 19: impedir HC.
- 20: impedir entrevista advogado.
- 22: invasão sem mandado.
- 25: prova viola intimidade.
- 33: tratamento privilegiado.
- 36: quebra sigilo desnecessária.
- 38: indagar sem informar silêncio.

## Lei 10.826/03 — Desarmamento

### Sistemas
- **SINARM** (PF): uso permitido.
- **SIGMA** (Exército): uso restrito.

### Classificação
Permitido | Restrito | PROIBIDO.

### Posse vs Porte
- Posse: residência/trabalho próprio.
- Porte: transporte fora.

### Crimes principais

| Art. | Crime | Pena |
|---|---|---|
| 12 | Posse uso permitido | Det 1-3a |
| 14 | Porte uso permitido | Rec 2-4a |
| 15 | Disparo via pública | Rec 2-4a |
| 16 | Posse/porte uso restrito | Rec 3-6a |
| 16 (proibido) | Hediondo | — |
| 17 | Comércio ilegal | Rec 6-12 (HEDIONDO) |
| 18 | Tráfico internacional | Rec 8-16 (HEDIONDO) |

### Requisitos porte civil (art. 4º)
≥ 25 anos + idoneidade + capacidade técnica + aptidão psicológica + ocupação lícita.

## Top pegadinhas Cebraspe

1. Abuso: EXIGE finalidade específica.
2. Abuso só agente público.
3. PF = uso permitido (não restrito).
4. Disparo via pública = RECLUSÃO 2-4 anos.
5. Hediondo: PROIBIDO + comércio + tráfico internacional.
6. CP 350 (exerc arbitrário) foi REVOGADO pela 13.869.
$resumo$
);

-- ┌─ 3. ADMINISTRATIVO — Improbidade detalhada ──────────────────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Improbidade Administrativa (Lei 8.429/92 + Lei 14.230/21)',
  'Lei de Improbidade Administrativa (8.429/92) atualizada pela Lei 14.230/21',
$content$
# Lei de Improbidade Administrativa (8.429/92) atualizada pela Lei 14.230/21

A reforma da Lei 14.230/21 (sancionada outubro/21) mudou MUITO. Cebraspe vai cobrar as mudanças.

## 1. Fundamento constitucional

**CF 37 §4º**:
> "Os atos de improbidade administrativa importarão a suspensão dos direitos políticos, a perda da função pública, a indisponibilidade dos bens e o ressarcimento ao erário..."

Improbidade ≠ crime — sanção CIVIL.

## 2. Mudanças centrais da Lei 14.230/21

### 2.1. EXIGÊNCIA DE DOLO (art. 1º §1º)

**ANTES da reforma**: ato de improbidade podia ser por **culpa OU dolo**.
**DEPOIS da reforma**: SOMENTE ATOS DOLOSOS. **Modalidade culposa REVOGADA**.

⚠️ **PEGADINHA CLÁSSICA**: A culposa não existe mais. Cebraspe vai testar isso.

### 2.2. Definição de DOLO ESPECÍFICO (art. 1º §2º)

> "Vontade livre e consciente de alcançar o resultado ilícito tipificado nos arts. 9º, 10 e 11."

Não basta dolo genérico — exige vontade específica de alcançar a improbidade.

### 2.3. Prazos prescricionais (art. 23)

- **8 anos** para apurar atos de improbidade contados do fato.
- Suspensa pelo prazo de investigação preliminar/PAD/inquérito.

### 2.4. Aplicação retroativa

STF (ARE 843.989 — 2022): a abolição da modalidade culposa é **RETROATIVA** — beneficia investigados/réus.

## 3. Sujeitos

### 3.1. Sujeito ativo (art. 2º)

Agente público — qualquer pessoa que exerça função pública (mandato, cargo, emprego, função, com ou sem remuneração).

### 3.2. Sujeito passivo (art. 1º)

- Administração direta + indireta dos 3 Poderes.
- Empresa pública, sociedade economia mista, autarquia, fundação.
- Empresas/entidades que recebem recursos públicos.

### 3.3. Particular (art. 3º)

Particular pode ser responsabilizado se:
- Induzir/concorrer dolosamente.
- Beneficiar-se direta ou indiretamente.

Sem agente público envolvido → NÃO há improbidade.

## 4. Atos de Improbidade

### 4.1. Atos que IMPORTAM ENRIQUECIMENTO ILÍCITO (art. 9º)

Auferir qualquer tipo de vantagem patrimonial indevida em razão do exercício de função.

Exemplos do rol:
- Receber vantagem econômica para tolerar prática de crime.
- Receber comissão.
- Adquirir bens em valor desproporcional à evolução patrimonial.
- Usar veículo público em proveito próprio.
- Receber vantagem para fazer/deixar de fazer ato regular.

**Sanções** (art. 12 I):
- Perda dos bens ilícitos.
- Ressarcimento integral do dano.
- Perda da função pública.
- Suspensão dos direitos políticos: 8 a 14 anos.
- Multa civil: até 12x o valor do acréscimo patrimonial.
- Proibição de contratar com Poder Público: 14 anos.

### 4.2. Atos que CAUSAM PREJUÍZO AO ERÁRIO (art. 10)

Lesão patrimonial dolosa.

Exemplos do rol:
- Facilitar/concorrer para apropriação indevida.
- Permitir uso desautorizado.
- Doar irregularmente.
- Liberar verba pública sem rigorosa observância.
- Frustrar licitude de licitação.
- Realizar despesa sem prévio empenho.
- Realizar operação sem observar normas legais.

**Sanções** (art. 12 II):
- Ressarcimento integral.
- Perda dos bens ilícitos.
- Perda da função pública.
- Suspensão direitos políticos: 5 a 12 anos.
- Multa civil: até 2x o valor do dano.
- Proibição contratar: 12 anos.

### 4.3. Atos que ATENTAM contra PRINCÍPIOS (art. 11)

Violação de princípios da administração com DOLO ESPECÍFICO de obter para si ou para outrem vantagem.

⚠️ A Lei 14.230/21 REDUZIU o rol (vários itens foram retirados ou ressalvados):
- Praticar ato visando fim proibido.
- Negar publicidade aos atos oficiais.
- Frustrar a licitude de concurso público.
- Deixar de prestar contas.
- Revelar fato/circunstância sigilosa.

Itens REVOGADOS: retardar/deixar de praticar ato, deixar de fundamentar ato, etc.

**Sanções** (art. 12 III):
- Perda da função pública.
- Suspensão direitos políticos: até 4 anos (sem mínimo).
- Multa civil: até 24x remuneração.
- Proibição contratar: 4 anos.

### 4.4. Tabela resumo

| Tipo | Pena | Multa | Susp. dir. pol. | Proib. contratar |
|---|---|---|---|---|
| **9º** Enriquecimento | Mais grave | 12x acréscimo | 8-14 anos | 14 anos |
| **10º** Dano ao erário | Média | 2x dano | 5-12 anos | 12 anos |
| **11º** Princípios | Mais leve | 24x remuneração | até 4 anos | 4 anos |

## 5. Procedimento

### 5.1. Investigação preliminar

- Por inquérito civil do MP.
- Sem efeito penal.

### 5.2. Ação de Improbidade

**Foro**: cível comum (regra). Em hipóteses específicas, juízos federais.

**Legitimidade**:
- **MP**: prioritariamente.
- **Pessoa jurídica interessada**: em concorrência ao MP.
- **Particular**: NÃO tem legitimidade (após reforma — antes podia em alguns casos).

### 5.3. Notificação prévia

Lei 14.230 reforça: réu deve ser notificado para apresentar defesa prévia ANTES do recebimento da inicial.

### 5.4. Acordo de não persecução civil (art. 17-B)

- Possibilidade de acordo.
- Restrições: ressarcimento integral + multa mínima.

### 5.5. Súmulas STJ relevantes

- **Súmula 634 STJ**: ação por improbidade tem prazo de 30 dias para resposta.
- **Súmula 643 STJ**: aplicação da Lei 8.429 a agentes políticos (governadores, prefeitos, parlamentares).

### 5.6. Agentes políticos

- STF (Pet. 3.211 e ARE 803.225): aplicação plena da 8.429 a TODOS os agentes políticos (incluindo Presidente, ministros, governadores, prefeitos, parlamentares).
- ⚠️ Antes havia divergência — hoje superada.

## 6. Como Cebraspe cobra

- **C/E**: "Ato de improbidade pode ser culposo" → **ERRADO** (após Lei 14.230 — só doloso).
- **C/E**: "Prefeito não pode ser réu em ação de improbidade" → **ERRADO** (pode).
- **C/E**: "Particular pode ser réu sozinho, sem agente público" → **ERRADO** (concorrência exigida).
- **C/E**: "Sanções da improbidade são automáticas" → **ERRADO** (decisão judicial).
- **C/E**: "Suspensão direitos políticos no art. 9º é de 5 a 12 anos" → **ERRADO** (8-14 — confunde com art. 10).
- **C/E**: "Prazo prescricional é de 5 anos" → **ERRADO** (8 anos pós-reforma).
- **C/E retroatividade**: "Abolição da culposa não retroage" → **ERRADO** (STF aplicou retroatividade — ARE 843.989).
$content$,
$resumo$
# Resumo — Improbidade (Lei 8.429 + Lei 14.230)

## Mudança CENTRAL pós-14.230/21

**SÓ DOLOSO**. Culposo REVOGADO. Aplicação RETROATIVA (STF ARE 843.989).

## Fundamento

CF 37 §4º: perda função + suspensão dir. políticos + indisponibilidade bens + ressarcimento.

## Sujeitos

- Ativo: qualquer agente público.
- Passivo: Adm direta + indireta + recebedora de recursos.
- Particular só CONCORRENTE com agente.

## Atos

### Art. 9 — Enriquecimento Ilícito (mais grave)
Vantagem patrimonial indevida. Sanções: multa 12x acréscimo, suspensão 8-14a, proibição contratar 14a.

### Art. 10 — Dano ao Erário
Lesão patrimonial dolosa. Multa 2x dano, suspensão 5-12a, proibição 12a.

### Art. 11 — Princípios (rol REDUZIDO pós-reforma)
Exige DOLO ESPECÍFICO. Suspensão até 4a, multa 24x remuneração, proibição 4a.

## Tabela rápida

| | Multa | Susp. | Proibição |
|---|---|---|---|
| 9 | 12x | 8-14a | 14a |
| 10 | 2x | 5-12a | 12a |
| 11 | 24x remun | até 4a | 4a |

## Procedimento

- Investigação MP (inquérito civil).
- Foro: cível comum.
- Legitimidade: MP + PJ interessada (NÃO particular).
- Notificação prévia ao réu.
- Acordo de não persecução civil possível (art. 17-B).

## Prescrição

- **8 anos** (Lei 14.230 art. 23).
- Suspensa por investigação.

## Agentes políticos

STF: 8.429 aplica a TODOS (Presidente, ministros, governadores, prefeitos, parlamentares).

## Top pegadinhas Cebraspe

1. SÓ DOLOSO (culposa REVOGADA).
2. Aplicação RETROATIVA da abolição.
3. Prescrição = 8 ANOS.
4. Suspensão dir. políticos: 8-14 / 5-12 / até 4 (art. 9/10/11).
5. Particular NÃO age sozinho.
6. Agentes políticos respondem normalmente.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('direito-penal', 'direito-administrativo')
  );
  RAISE NOTICE 'Onda 14 OK — total de materiais nesses subjects: %', v_count;
END $$;
