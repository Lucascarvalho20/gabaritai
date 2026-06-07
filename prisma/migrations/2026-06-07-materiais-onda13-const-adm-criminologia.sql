-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 13 — Const Ações + Adm Detalhe + Vitimologia
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Constitucional: Remédios Constitucionais (HC, MS, MI, HD, ADI, ADC, ADPF)
--  - Administrativo: Bens Públicos + Lei 8.112/90 detalhada
--  - Criminologia: Vitimologia + Antropologia Criminal
--
-- Fecha cobertura das carreiras policiais. IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-constitucional';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Remédios Constitucionais (HC, MS, MI, HD, ADI, ADC, ADPF)', 'const-remedios-constitucionais', 1.5, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Remédios Constitucionais (HC, MS, MI, HD, ADI, ADC, ADPF)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direito-administrativo';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Bens Públicos e Servidores (Lei 8.112/90 detalhada)', 'adm-bens-servidores-8112', 1.4, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Bens Públicos e Servidores (Lei 8.112/90 detalhada)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'criminologia';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Vitimologia e Antropologia Criminal', 'crimi-vitimo-antropo', 1.3, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Vitimologia e Antropologia Criminal');
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

-- ┌─ 1. CONSTITUCIONAL — Remédios Constitucionais ───────────────────────────┐
SELECT upsert_material(
  'direito-constitucional',
  'Remédios Constitucionais (HC, MS, MI, HD, ADI, ADC, ADPF)',
  'Remédios Constitucionais e Controle de Constitucionalidade',
$content$
# Remédios Constitucionais e Controle de Constitucionalidade

Tema chave de Constitucional. Cebraspe ama detalhes de cabimento + legitimidade + efeitos. Decore as tabelas — não tem atalho.

## 1. Habeas Corpus (CF 5º LXVIII)

### 1.1. Conceito
Tutela a **liberdade de locomoção** contra coação/ameaça ilegal ou abuso de poder.

### 1.2. Espécies
- **Preventivo** (salvo-conduto): ameaça iminente.
- **Liberatório/Repressivo**: já há constrição.

### 1.3. Características
- Gratuito.
- Sem advogado (qualquer pessoa impetra).
- Ação penal não-condicionada.

### 1.4. NÃO cabe
- Punição disciplinar militar (CF 142 §2º).
- Suspensão de direitos políticos.
- Pena pecuniária pura.

## 2. Mandado de Segurança (CF 5º LXIX-LXX)

### 2.1. Conceito (Lei 12.016/09)
Protege **direito líquido e certo** não amparado por HC ou HD, contra ilegalidade/abuso de poder de **autoridade pública** ou agente de PJ no exercício de função pública.

### 2.2. Direito líquido e certo
- Comprovável por prova **PRÉ-CONSTITUÍDA** (documental).
- Não cabe dilação probatória.

### 2.3. Prazo
- **120 dias** decadenciais do conhecimento do ato.
- ⚠️ Após esse prazo NÃO cabe MS (mas cabe ação ordinária).

### 2.4. MS Coletivo (CF 5º LXX)
Impetra:
- Partido político com representação no Congresso.
- Organização sindical, entidade de classe ou associação legalmente constituída em **funcionamento há pelo menos 1 ano**.

### 2.5. Súmulas relevantes
- **Súmula 266 STF**: não cabe MS contra lei em tese.
- **Súmula 267 STF**: não cabe MS contra ato com recurso administrativo com efeito suspensivo.
- **Súmula 268 STF**: não cabe MS contra decisão judicial com trânsito em julgado.
- **Súmula 269 STF**: não substitui ação de cobrança.
- **Súmula 271 STF**: efeitos financeiros do MS só após sua impetração.
- **Súmula 333 STJ**: cabe MS contra ato de Comissão Parlamentar de Inquérito.

## 3. Mandado de Injunção (CF 5º LXXI)

### 3.1. Conceito
Combate à **omissão legislativa ou administrativa** que torne inviável o exercício de direitos/liberdades constitucionais e prerrogativas de nacionalidade, soberania e cidadania.

### 3.2. Regulamento — Lei 13.300/16
- Antes: STF declarava só a omissão (não-concretista).
- Hoje: STF tem **postura concretista** — supre temporariamente a omissão (concretista geral ou individual).

### 3.3. Legitimidade
- Ativa: qualquer pessoa que se beneficie do direito.
- Passiva: órgão omisso.

### 3.4. Coletivo
- Mesma legitimidade do MS coletivo.

## 4. Habeas Data (CF 5º LXXII)

### 4.1. Conceito
Garante:
- Conhecimento de informações relativas à pessoa do impetrante (constantes de registros públicos).
- Retificação dos dados.

### 4.2. Lei 9.507/97
- Personalíssimo: só o próprio titular impetra (salvo morto: herdeiros).
- Gratuito.
- Exige negativa prévia administrativa OU silêncio (decurso de 10 dias).

### 4.3. NÃO cabe
- Pra obter certidões de processo (cabe MS).
- Sigilo de informações por interesse de Estado.

## 5. Ação Popular (CF 5º LXXIII)

### 5.1. Conceito (Lei 4.717/65)
Qualquer **cidadão** pode anular ato lesivo:
- Patrimônio público.
- Moralidade administrativa.
- Meio ambiente.
- Patrimônio histórico-cultural.

### 5.2. Legitimidade
- Ativa: cidadão (eleitor em pleno exercício).
- Passiva: agente, autoridade, beneficiário do ato lesivo.

### 5.3. Custas
- Isenção (salvo má-fé).

## 6. Ação Civil Pública (Lei 7.347/85)

### 6.1. Conceito
Defesa de:
- Patrimônio público e social.
- Meio ambiente.
- Consumidor.
- Bens e direitos de valor artístico, estético, histórico, turístico e paisagístico.
- Ordem econômica.

### 6.2. Legitimidade
- **MP**, **Defensoria Pública**, União, Estados, Municípios, autarquias, fundações, empresas públicas, associações constituídas há **1 ano+**.

## 7. Controle Concentrado de Constitucionalidade

### 7.1. ADI — Ação Direta de Inconstitucionalidade (CF 103)

#### Legitimados (CF 103)
- Presidente da República.
- Mesa do Senado.
- Mesa da Câmara.
- Mesa de Assembleia Legislativa ou Câmara Legislativa do DF.
- Governador de Estado/DF.
- Procurador-Geral da República.
- Conselho Federal da OAB.
- Partido político com representação no Congresso.
- Confederação sindical ou entidade de classe de âmbito nacional.

#### Pertinência temática
- Exigida para: Mesa AL, Governador, Confederação sindical, Entidade de classe.
- Universais (sem pertinência): PR, Mesa Senado, Mesa Câmara, PGR, OAB, Partido político.

#### Objeto
- Lei ou ato normativo FEDERAL ou ESTADUAL.
- NÃO atinge: lei municipal, lei revogada, lei anterior à CF (não-recepção).

#### Efeitos
- **Erga omnes** (contra todos).
- **Ex tunc** (retroativo) — regra.
- **Vinculante** (administração e demais órgãos do judiciário).

### 7.2. ADC — Ação Declaratória de Constitucionalidade (CF 102 I a)

#### Legitimados
Mesmos da ADI.

#### Objeto
- Lei ou ato normativo FEDERAL (só federal — diferente da ADI).
- Exige controvérsia judicial relevante.

#### Efeitos
- Mesmos da ADI: erga omnes, ex tunc, vinculante.

### 7.3. ADPF — Arguição de Descumprimento de Preceito Fundamental (CF 102 §1º)

#### Lei 9.882/99
- **Subsidiária**: só quando não houver outro meio eficaz.

#### Objeto
- Lei ou ato normativo (até MUNICIPAL e ANTERIOR à CF).
- Ato concreto do poder público.

#### Legitimidade
Mesmos da ADI.

### 7.4. ADO — Ação Direta de Inconstitucionalidade por Omissão (CF 103 §2º)

- Combate omissão legislativa.
- STF declara omissão e dá ciência.
- Órgão administrativo: prazo de 30 dias pra suprir.

### 7.5. Tabela comparativa

| Ação | Objeto | Quem legitimado | Efeito |
|---|---|---|---|
| ADI | Lei/ato fed ou est | 9 do art. 103 | Erga omnes, ex tunc, vinculante |
| ADC | Lei FEDERAL | 9 do art. 103 | Idem ADI |
| ADPF | Lei/ato (até municipal e anterior CF) | 9 do art. 103 | Idem ADI |
| ADO | Omissão legislativa | 9 do art. 103 | Declaração + 30d ao Adm |

## 8. Controle Difuso

### 8.1. Conceito
Qualquer juiz/tribunal pode declarar incidentalmente inconstitucionalidade no caso concreto.

### 8.2. Efeitos
- **Inter partes** (entre as partes).
- **Ex tunc** (regra).
- NÃO vinculante.

### 8.3. Reserva de Plenário (CF 97)
Tribunais só declaram inconstitucionalidade por maioria absoluta do plenário OU órgão especial.

### 8.4. Súmula Vinculante (CF 103-A)
- Após reiteradas decisões.
- Aprovada por 2/3 do STF.
- Vinculante administração e demais juízos.

### 8.5. Abstrativização do controle difuso
- STF: tende à extensão dos efeitos do controle difuso (Tema 218/STF — RE 580.108 e ADI 5.766).

## 9. Como Cebraspe cobra

- **C/E**: "MS coletivo pode ser impetrado por associação constituída há 6 meses" → **ERRADO** (1 ano +).
- **C/E**: "Prazo do MS é prescricional de 120 dias" → **ERRADO** (decadencial).
- **C/E**: "ADI atinge lei municipal" → **ERRADO** (federal ou estadual; municipal só ADPF).
- **C/E**: "MI ainda é não-concretista" → **ERRADO** (Lei 13.300/16 + STF: concretista).
- **C/E**: "Ação popular pode ser proposta por estrangeiro residente" → **ERRADO** (apenas cidadão = eleitor).
- **C/E**: "Habeas data substitui MS para obter certidão" → **ERRADO** (não).
$content$,
$resumo$
# Resumo — Remédios Constitucionais

## HC (CF 5º LXVIII)

Liberdade de locomoção. Preventivo (salvo-conduto) ou liberatório. Gratuito, sem advogado. NÃO cabe: punição disciplinar militar, suspensão direitos políticos, pena pecuniária.

## MS (CF 5º LXIX + Lei 12.016/09)

- Direito líquido e certo (prova pré-constituída).
- 120 dias decadenciais.
- Coletivo: partido + sindicato/associação ≥ 1 ano.
- Súmulas STF: 266 (lei em tese ❌), 267 (recurso adm c/ susp ❌), 268 (trânsito julgado ❌), 271 (efeitos só pós-impetração).

## MI (CF 5º LXXI + Lei 13.300/16)

Omissão de norma regulamentadora → STF supre (concretista).

## HD (CF 5º LXXII + Lei 9.507/97)

Conhecer/retificar informações pessoais. Personalíssimo. Exige negativa adm prévia.

## Ação Popular (CF 5º LXXIII + Lei 4.717/65)

Cidadão anula ato lesivo: patrimônio, moralidade, ambiente, histórico-cultural.

## ACP (Lei 7.347/85)

MP + Defensoria + entes + associação ≥ 1 ano.

## Controle CONCENTRADO

| Ação | Objeto | Efeito |
|---|---|---|
| ADI | Lei FED/EST | Erga omnes, ex tunc, vinculante |
| ADC | Lei FED | Idem |
| ADPF | Lei/ato até municipal e pré-CF | Idem |
| ADO | Omissão | Declaração + 30d adm |

### Legitimados ADI/ADC/ADPF/ADO (CF 103)
PR, Mesa Sen, Mesa Cam, Mesa AL, Governador, PGR, OAB, Partido c/ rep, Confederação sindical, Entidade classe nacional.

### Pertinência temática
- EXIGE: Mesa AL, Governador, Confederação sindical, Entidade classe.
- DISPENSA: PR, Mesas federais, PGR, OAB, Partido.

## Controle DIFUSO

Inter partes, ex tunc. Reserva de plenário (CF 97): maioria absoluta. Súmula Vinculante: 2/3 STF.

## Top pegadinhas Cebraspe

1. MS = 120 dias DECADENCIAIS (não prescricionais).
2. Associação MS coletivo = ≥ 1 ano.
3. ADI: lei fed/est (NÃO municipal — só ADPF).
4. MI hoje é CONCRETISTA.
5. HD: personalíssimo (só titular).
6. ADPF é SUBSIDIÁRIA.
$resumo$
);

-- ┌─ 2. ADMINISTRATIVO — Bens Públicos + Lei 8.112 detalhada ────────────────┐
SELECT upsert_material(
  'direito-administrativo',
  'Bens Públicos e Servidores (Lei 8.112/90 detalhada)',
  'Bens Públicos e Servidores Públicos (Lei 8.112/90 detalhada)',
$content$
# Bens Públicos e Servidores Públicos (Lei 8.112/90 detalhada)

Complementa Ondas anteriores. Cebraspe cobra DETALHE da 8.112 (prazos, vacância, regimes).

## 1. Bens Públicos (CC 98-103)

### 1.1. Conceito

Bens **do domínio do Poder Público** (União, Estados, DF, Municípios, autarquias).

### 1.2. Classificação (CC 99)

- **Uso comum do povo**: ruas, praças, mares, rios.
- **Uso especial**: edifícios destinados ao serviço público.
- **Dominicais**: patrimônio das pessoas jurídicas de direito público (terras devolutas, prédios desafetados).

### 1.3. Características

- **Inalienabilidade relativa** (CC 100): bens de uso comum e especial são inalienáveis enquanto conservarem essa qualificação.
- **Imprescritibilidade** (CF 183 §3º; CC 102): não se adquirem por usucapião.
- **Impenhorabilidade**: não podem ser penhorados.
- **Não-onerabilidade**: não podem ser hipotecados/empenhorados.

### 1.4. Afetação e desafetação

- **Afetação**: destinação a uso público específico.
- **Desafetação**: retirada da destinação pública — torna o bem alienável.

### 1.5. Alienação

Bens dominicais podem ser alienados mediante:
- Lei autorizativa.
- Avaliação prévia.
- Licitação (Lei 14.133/21).
- Modalidades: concorrência, leilão, dispensa em casos especiais.

### 1.6. Uso de bem público por particular

- **Autorização**: ato unilateral, discricionário, precário, gratuito ou oneroso.
- **Permissão**: ato unilateral, discricionário, precário, gratuito ou oneroso.
- **Concessão**: contrato, bilateral, prazo determinado.
- **Cessão**: transferência entre pessoas jurídicas de direito público.

## 2. Servidores Públicos — Visão Geral

### 2.1. Categorias

- **Estatutários**: regime jurídico próprio (Lei 8.112/90 — federais).
- **Empregados públicos**: CLT (empresas públicas, sociedades de economia mista).
- **Temporários** (CF 37 IX): excepcional interesse público; sem concurso.
- **Comissionados** (cargo em comissão): livre nomeação e exoneração.

### 2.2. Princípios constitucionais

- Concurso público (CF 37 II).
- Acessibilidade (CF 37 I).
- Estabilidade após 3 anos + avaliação especial de desempenho.
- Vedação de acúmulo de cargos (CF 37 XVI/XVII) — salvo exceções.

## 3. Lei 8.112/90 — Detalhamento

### 3.1. Provimento (arts. 8-14)

Formas de provimento:
- **Nomeação**: forma originária.
- **Promoção**.
- **Readaptação**: investido em cargo compatível com nova limitação física/mental.
- **Reversão**: aposentado volta — invalidez cessou.
- **Aproveitamento**: servidor em disponibilidade.
- **Reintegração**: anulação de demissão.
- **Recondução**: retorno ao cargo anterior por inabilitação em estágio probatório no novo.

### 3.2. Posse e exercício

- **Posse** (art. 13): até **30 dias** após nomeação.
- **Exercício** (art. 15): até **15 dias** após posse.
- ⚠️ Servidor estável que é nomeado pra outro cargo: TEM até 15 dias pra entrar em exercício após nomeação (não precisa de posse).

### 3.3. Estágio probatório (art. 20)

- Duração: 24 meses (Lei 8.112) — mas CF 41 alterado pela EC 19: **3 anos** (36 meses).
- Avaliação: assiduidade, disciplina, capacidade de iniciativa, produtividade, responsabilidade.
- Reprovação = exoneração.

### 3.4. Estabilidade (CF 41 + 8.112)

- 3 anos efetivo exercício.
- Aprovação especial de desempenho.
- Servidor estável só perde cargo por:
  - Sentença judicial transitada em julgado.
  - Processo administrativo (ampla defesa).
  - Avaliação periódica de desempenho.

### 3.5. Vacância (art. 33)

Causas:
- Exoneração.
- Demissão.
- Promoção.
- Readaptação.
- Aposentadoria.
- Posse em cargo inacumulável.
- Falecimento.

### 3.6. Remoção (art. 36)

Tipos:
- **De ofício**: interesse da administração.
- **A pedido**: a critério da administração.
- **A pedido com motivação específica**:
  - Saúde do servidor/dependente.
  - Acompanhamento de cônjuge servidor.
  - Por concurso de remoção.

### 3.7. Direitos e Vantagens

- **Vencimento**: retribuição pecuniária do cargo.
- **Remuneração**: vencimento + vantagens pecuniárias.
- **Subsídio**: parcela única (para magistrados, MP, militares, agentes políticos).
- **Indenizações**: ajuda de custo, diárias, transporte, auxílio-moradia (≤ 25% do subsídio).
- **Gratificações e adicionais**:
  - Insalubridade, periculosidade.
  - Serviço extraordinário.
  - Noturno.
  - Adicional por tempo de serviço (extinto na maioria).

### 3.8. Férias (arts. 77-80)

- 30 dias ininterruptos (após 12 meses).
- 1ª férias: 12 meses do exercício.
- Acumulação: 2 períodos.
- Adicional de 1/3 (CF 7º XVII).

### 3.9. Licenças (arts. 81-91)

- **Por motivo de doença em pessoa da família**: até 60 dias remuneradas.
- **Por motivo de afastamento do cônjuge**.
- **Para atividade política**: 3 meses antes do pleito.
- **Para capacitação**: 3 meses a cada quinquênio.
- **Tratamento da própria saúde** (≤ 24 meses): perícia.
- **Gestante**: 120 dias.
- **Paternidade**: 5 dias (alguns 20 dias após Lei 13.257/16 — Programa Empresa Cidadã).
- **Para servir em organismo internacional**.
- **Para tratar de interesses particulares** (até 3 anos, sem remuneração).
- **Por motivo de adoção**: análoga à gestante.

### 3.10. Afastamentos

- Para servir a outro órgão (mantém vínculo).
- Para exercício de mandato eletivo (CF 38).

### 3.11. Regime disciplinar (arts. 116-142)

**Deveres** (116): zelo, lealdade, observância de normas, presteza, sigilo, urbanidade.

**Proibições** (117): retirar documento, recusar fé, promover manifestação, propinas, comércio (salvo acionista), usura.

**Responsabilidade** (121-126): civil + penal + administrativa, INDEPENDENTES — salvo absolvição criminal por inexistência do fato ou negativa de autoria.

**Penalidades** (127):
1. Advertência.
2. Suspensão (até 90 dias).
3. Demissão.
4. Cassação de aposentadoria.
5. Destituição de cargo em comissão.
6. Destituição de função comissionada.

**Demissão** (132): crimes contra adm, abandono cargo (30+ dias contínuos), inassiduidade habitual (60 dias intercalados em 12 meses), improbidade, corrupção, acumulação ilegal, etc.

### 3.12. Sindicância e PAD

- **Sindicância** (143-145):
  - Inquisitorial ou contraditória.
  - Pode resultar em arquivamento, instauração de PAD, ou penalidade até 30 dias suspensão.
- **PAD** (arts. 148-182):
  - Fases: instauração, instrução, defesa, relatório, julgamento.
  - Comissão de 3 servidores estáveis.
  - Prazo: 60 dias + 60 dias prorrogáveis.
  - Indiciado: ampla defesa, contraditório.
- **Verdade sabida**: dispensa formalidades quando o fato é notório.

### 3.13. Aposentadoria (pós-EC 103/19)

- Voluntária: 65/62 + 25/30/35 anos de contribuição (varia categoria).
- Compulsória: 75 anos.
- Por invalidez permanente.

## 4. Acúmulo de cargos

### 4.1. Vedação (CF 37 XVI)

Vedada em regra. EXCEÇÕES:
- Dois cargos de **professor**.
- Um de **professor + outro técnico/científico**.
- Dois cargos privativos de **profissionais de saúde** com profissões regulamentadas.
- Magistrado + ensino (CF 95 §ú).
- MP + ensino (CF 128 §5º II).

Exige **compatibilidade de horários**.

### 4.2. Servidor + mandato eletivo (CF 38)

- Federal/estadual eletivo: afastado.
- Prefeito: afastado.
- Vereador: pode acumular se houver compatibilidade.

## 5. Como Cebraspe cobra

- **C/E**: "Bem público é imprescritível, mas pode ser usucapido" → **ERRADO** (imprescritível).
- **C/E**: "Posse em cargo público dentro de 15 dias após nomeação" → **ERRADO** (30 dias).
- **C/E**: "Recondução é forma de provimento originária" → **ERRADO** (derivada).
- **C/E estabilidade**: "Estabilidade é adquirida com 2 anos" → **ERRADO** (3 anos EC 19/98).
- **C/E PAD**: "PAD pode ser instaurado por sindicância" → **CORRETO**.
- **C/E acúmulo**: "Servidor pode acumular 2 cargos administrativos" → **ERRADO** (só exceções específicas).
- **C/E compulsória**: "Aposentadoria compulsória é aos 70 anos" → **ERRADO** (75 — LC 152/15).
$content$,
$resumo$
# Resumo — Bens Públicos + Lei 8.112

## Bens Públicos

| Tipo | Exemplo |
|---|---|
| Uso comum | Ruas, praças, mares |
| Uso especial | Edifícios públicos |
| Dominicais | Patrimônio (alienável) |

Características: inalienabilidade RELATIVA, IMPRESCRITIBILIDADE, impenhorabilidade, não-onerabilidade.

Uso por particular: autorização (uni, precária) > permissão > concessão (contratual) > cessão (entre PJ públicas).

## Provimento (8.112 art. 8)

Nomeação > Promoção > Readaptação > Reversão > Aproveitamento > Reintegração > Recondução.

## Prazos

- Posse: 30 dias da nomeação.
- Exercício: 15 dias da posse.
- Estágio probatório: 36 meses (CF 41).
- Estabilidade: 3 anos (CF 41).

## Licenças

| Tipo | Prazo |
|---|---|
| Doença familiar | 60 dias remuneradas |
| Capacitação | 3 meses/quinquênio |
| Tratamento saúde | até 24 meses |
| Gestante | 120 dias |
| Paternidade | 5 ou 20 dias |
| Interesses particulares | até 3 anos sem remuneração |

## Penalidades (127)

1. Advertência | 2. Suspensão (90d) | 3. Demissão | 4. Cassação aposent. | 5/6. Destituição.

## Demissão (132)

Crime adm, abandono (30d contínuos), inassiduidade (60d intercal. em 12m), improbidade, corrupção, acumulação ilegal.

## PAD

Comissão 3 estáveis. 60d + 60d. Ampla defesa e contraditório.

## Acúmulo (CF 37 XVI)

Vedado salvo: 2 professores | professor + técnico/cient. | 2 saúde regulamentadas | magistrado/MP + ensino.

## Aposentadoria pós-EC 103

- Voluntária: 65/62 + 25-35 contribuição.
- Compulsória: 75 anos (LC 152/15).
- Invalidez permanente.

## Top pegadinhas Cebraspe

1. Bens públicos IMPRESCRITÍVEIS (não usucapíveis).
2. Posse: 30 dias / Exercício: 15 dias.
3. Estabilidade: 3 ANOS (CF 41 pós-EC 19).
4. Compulsória 75 anos (não 70).
5. Acumulação ilegal = DEMISSÃO.
6. Responsabilidades INDEPENDENTES (salvo absolvição por inexistência).
$resumo$
);

-- ┌─ 3. CRIMINOLOGIA — Vitimologia + Antropologia Criminal ──────────────────┐
SELECT upsert_material(
  'criminologia',
  'Vitimologia e Antropologia Criminal',
  'Vitimologia e Antropologia Criminal',
$content$
# Vitimologia e Antropologia Criminal

Complementa Criminologia que já está cadastrada. Cebraspe cobra ESCOLAS criminológicas + classificação de vítimas.

## 1. Antropologia Criminal (Escola Positiva)

### 1.1. Cesare Lombroso (1835-1909) — "L'Uomo Delinquente" (1876)

- Pai da Antropologia Criminal.
- Tese: **criminoso nato** — características biológicas anômalas (atavismo).
- Estigmas físicos: assimetria craniana, fronte fugidia, arcadas superciliares salientes, mandíbula proeminente, orelhas grandes, tatuagens.
- Atualmente: **superado** pela criminologia moderna, mas ainda cobrado historicamente.

### 1.2. Tipologia de Lombroso

- **Criminoso nato**.
- **Criminoso louco**.
- **Criminoso por paixão**.
- **Criminoso de ocasião**.
- **Criminoso habitual**.

### 1.3. Enrico Ferri — "Sociologia Criminal" (1881)

- Discípulo de Lombroso.
- **Negação do livre-arbítrio**: criminoso responde por necessidade social.
- **Substitutivos penais**: educação, integração social como prevenção.
- Tipologia ampliada: criminoso nato, louco, habitual, ocasional e passional.

### 1.4. Rafael Garofalo — "Criminologia" (1885)

- **Cunhou o termo "criminologia"**.
- **Crime natural**: aquele que ofende sentimentos altruístas (piedade e probidade).
- Defendeu eliminação dos incorrigíveis.

### 1.5. Críticas à Escola Positiva

- Determinismo biológico → preconceito (especialmente racial).
- Ignora fatores sociais/econômicos.
- Hoje: combinação biopsicossocial é aceita.

## 2. Escolas Criminológicas

### 2.1. Escola Clássica (Beccaria, Bentham)

- Livre-arbítrio.
- Crime = escolha racional.
- Pena proporcional → prevenção geral.
- **"Dos Delitos e das Penas"** (1764).

### 2.2. Escola Positiva (Lombroso, Ferri, Garofalo)

- Determinismo biológico/social.
- Sociedade defende-se.
- **Medida de segurança** > pena retributiva.

### 2.3. Terza Scuola (Carnevale, Alimena)

- Síntese: livre-arbítrio + fatores externos.

### 2.4. Escola Sociológica

- **Émile Durkheim** (1858-1917): crime é fenômeno NORMAL e necessário — sociedade não pode evitar totalmente.
- **Escola de Chicago** (1920-30): **desorganização social urbana** explica criminalidade.
- **Anomia** (Robert Merton): tensão entre objetivos culturais e meios disponíveis gera desvio.
- **Subcultura criminal** (Albert Cohen): jovens criam subcultura por não atingirem objetivos da classe média.
- **Teoria do labelling** (Becker): crime existe porque sociedade rotula. **Etiquetamento** = chave.

### 2.5. Escola Crítica (Marxismo, Baratta)

- Crime como instrumento de controle social.
- Cifras ocultas: a maior parte dos crimes não chega ao sistema.

## 3. Criminologia Contemporânea

### 3.1. Teoria das Janelas Quebradas (Broken Windows)

- **Wilson e Kelling** (1982).
- Pequenas desordens (vandalismo, sujeira) → escala pra crimes maiores.
- Influenciou política de "tolerância zero" em NY.

### 3.2. Prevenção situacional

- Reduzir oportunidades para crime.
- CPTED (Crime Prevention Through Environmental Design).

### 3.3. Teoria das Atividades Rotineiras (Cohen & Felson)

Crime requer 3 elementos simultâneos:
1. **Ofensor motivado**.
2. **Alvo adequado**.
3. **Ausência de guardião capaz**.

### 3.4. Cifras

- **Cifra negra**: crimes não reportados/conhecidos.
- **Cifra dourada**: crimes de colarinho branco impunes.
- **Cifra cinza**: registrados mas sem identificação do autor.

## 4. Vitimologia

### 4.1. Conceito

Estudo da **vítima**:
- Seu papel.
- Sua relação com o criminoso.
- Suas características.
- O dano sofrido.
- Os direitos.

### 4.2. Histórico

- **Benjamin Mendelsohn** (década de 40): pai da vitimologia.
- **Hans Von Hentig**: clássico "The Criminal and His Victim" (1948).

### 4.3. Classificação de vítimas (Mendelsohn)

1. **Completamente inocente** (ex: criança de colo).
2. **De culpa leve / ignorância**.
3. **Tão culpada quanto o autor** (ex: provocação verbal).
4. **Mais culpada que o autor** (ex: lutador de briga).
5. **Unicamente culpada** (ex: agressor que morre em legítima defesa).
6. **Simuladora**.

### 4.4. Classificação de Hentig

- Jovem.
- Mulher.
- Idoso.
- Imigrante.
- Minoria.
- Deprimido.
- Solitário.
- Atormentado.
- Tirano.
- "Vítima" provocadora.
- Vítima por ignorância.
- Vítima imune.
- Vítima reincidente.

### 4.5. Vitimologia moderna

- Foco em **direitos da vítima**.
- Reparação de danos (CPP 387 IV; CP 91 I após Anticrime).
- Programas de proteção a vítimas e testemunhas (Lei 9.807/99).
- Justiça restaurativa.

### 4.6. Vitimização

- **Primária**: o crime em si.
- **Secundária**: revitimização pelo sistema (interrogatórios, mídia).
- **Terciária**: estigma social pós-evento.

### 4.7. Vítima na CF e legislação

- CF 5º XLV: pena não passa da pessoa do condenado, mas obrigação de reparar dano pode atingir herdeiros.
- CPP 387 IV: juiz fixa valor mínimo de reparação na sentença.
- CP 91 I (após Anticrime): perda de bens em favor da vítima.

## 5. Direitos da Vítima

### 5.1. CF e legislação infraconstitucional

- Direito à informação sobre o processo.
- Direito à proteção integral (Lei 9.807/99).
- Direito à reparação.
- Acesso ao Ministério Público.

### 5.2. Programa de Proteção a Vítimas e Testemunhas (Lei 9.807/99)

- PROVITA.
- Pessoas em risco em razão de colaboração com investigação.
- Mudança de identidade, residência, prestação financeira.

## 6. Como Cebraspe cobra

- **C/E**: "Lombroso defendeu o criminoso nato com base em estudos sociais" → **ERRADO** (biológicos — atavismo).
- **C/E**: "Garofalo criou o termo criminologia" → **CORRETO**.
- **C/E vitimologia**: "Mendelsohn é o pai da vitimologia" → **CORRETO**.
- **C/E Janelas Quebradas**: "A teoria das janelas quebradas é da Escola Positiva" → **ERRADO** (Wilson e Kelling, 1982 — moderna).
- **C/E vítima**: "Vítima completamente inocente é categoria de Hentig" → **ERRADO** (Mendelsohn).
- **C/E vitimização**: "Revitimização pelo sistema chama-se vitimização terciária" → **ERRADO** (secundária).
- **C/E cifra**: "Cifra dourada é crime de colarinho branco impune" → **CORRETO**.
$content$,
$resumo$
# Resumo — Vitimologia e Antropologia Criminal

## Escola Clássica (Beccaria 1764)

Livre-arbítrio. Crime = escolha racional. Pena proporcional.

## Escola Positiva (Lombroso, Ferri, Garofalo)

- **Lombroso** (1876): criminoso NATO, atavismo, estigmas físicos.
- **Ferri**: negação livre-arbítrio; substitutivos penais.
- **Garofalo**: criou termo "criminologia"; crime natural.

## Escola Sociológica

- **Durkheim**: crime é NORMAL.
- **Escola Chicago**: desorganização urbana.
- **Anomia** (Merton): tensão objetivos x meios.
- **Subcultura** (Cohen): jovens classes desfavorecidas.
- **Labelling** (Becker): rotulação social.

## Criminologia Moderna

- **Janelas Quebradas** (Wilson/Kelling 1982).
- **CPTED**: prevenção situacional pelo design.
- **Atividades Rotineiras** (Cohen/Felson): ofensor + alvo + ausência guardião.

## Cifras

- Negra: não reportados.
- Dourada: colarinho branco impune.
- Cinza: registrados sem autor.

## Vitimologia

- **Mendelsohn**: pai da vitimologia.
- **Hentig**: "The Criminal and His Victim" (1948).

### Mendelsohn — 6 categorias
Completamente inocente → de culpa leve → tão culpada → mais culpada → unicamente culpada → simuladora.

### Vitimização
- Primária: o crime.
- Secundária: sistema revitimiza.
- Terciária: estigma social.

## Direitos da vítima

- CPP 387 IV: reparação mínima na sentença.
- CP 91 I (Anticrime): perda bens em favor.
- Lei 9.807/99: PROVITA.

## Top pegadinhas Cebraspe

1. Lombroso = atavismo biológico (não social).
2. Garofalo criou "criminologia".
3. Mendelsohn pai da vitimologia (6 categorias).
4. Vitim. SECUNDÁRIA = sistema; TERCIÁRIA = social.
5. Janelas Quebradas é MODERNA (não Escola Positiva).
6. Atividades Rotineiras = ofensor + alvo + ausência guardião.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN (
      'direito-constitucional', 'direito-administrativo', 'criminologia'
    )
  );
  RAISE NOTICE 'Onda 13 OK — total de materiais nesses subjects: %', v_count;
END $$;
