-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 15 — Atualidades + DH Internacional + Decreto Uso da Força
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - Atualidades: Brasil + Mundo 2024-2026 (G20 BR, COP30, Mercosul-UE, BRICS+, IA Act)
--  - DH: Sistema Internacional (Pacto SP, Belém do Pará, Tortura, Genocídio)
--  - DH: Convenções específicas + Decreto 12.341/24 (uso de instrumentos menos letais)
--
-- IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'atualidades';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Atualidades Brasil e Mundo (2024-2026)', 'atual-brasil-mundo-2024-2026', 1.2, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Atualidades Brasil e Mundo (2024-2026)');
  END IF;

  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'direitos-humanos';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Sistema Internacional de DH (Pacto SP, Belém do Pará, Tortura, Genocídio)', 'dh-sistema-internacional', 1.4, 200, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Sistema Internacional de DH (Pacto SP, Belém do Pará, Tortura, Genocídio)');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Uso de Instrumentos Menos Letais (Lei 13.060/14 + Dec 12.341/24)', 'dh-uso-forca-instrumentos', 1.3, 201, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Uso de Instrumentos Menos Letais (Lei 13.060/14 + Dec 12.341/24)');
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

-- ┌─ 1. ATUALIDADES — Brasil e Mundo 2024-2026 ──────────────────────────────┐
SELECT upsert_material(
  'atualidades',
  'Atualidades Brasil e Mundo (2024-2026)',
  'Atualidades — Brasil e Mundo 2024-2026',
$content$
# Atualidades — Brasil e Mundo (2024-2026)

Cebraspe cobra atualidades em formato de eventos estruturados (com causa, consequência, atores). Foco aqui: fatos confirmados até junho/2026.

## 1. Brasil — Política e Economia

### 1.1. Governo Lula (3º mandato)

- Mandato 2023-2026.
- Coalizão ampla (PT, PSB, União Brasil, MDB, PP, REPUBLICANOS).
- Pautas centrais: reindustrialização (Nova Indústria Brasil), preservação Amazônia, redução desigualdade.

### 1.2. Reforma Tributária (EC 132/23)

- Aprovada em dezembro 2023.
- Substitui PIS, COFINS, IPI, ICMS, ISS por:
  - **CBS** (Contribuição sobre Bens e Serviços) — federal.
  - **IBS** (Imposto sobre Bens e Serviços) — estadual/municipal.
  - **IS** (Imposto Seletivo) — produtos prejudiciais (cigarro, álcool, agrotóxicos).
- Transição: 2026 a 2033.
- Cashback para baixa renda.
- Mantém imunidades (templos, partidos, livros).

### 1.3. Arcabouço Fiscal (LC 200/23)

- Substitui Teto de Gastos (EC 95/16).
- Crescimento despesas: 70% da variação real da receita do ano anterior, limitado a +2,5% / -0,6%.
- Gatilhos automáticos se descumprido.

### 1.4. Economia 2024-2025

- PIB 2024: ≈ +3,4%.
- Inflação (IPCA) 2024: ≈ 4,8% (estouro do teto).
- SELIC: aumentos em 2024-2025 para conter inflação (≈ 14% em meados de 2025).
- Desemprego: histórico baixo (≈ 6,5%).
- Real desvalorizado vs dólar.

### 1.5. Programas sociais

- **Bolsa Família** reformulado (linha de pobreza R$ 218/mês).
- **Pé-de-Meia**: poupança para estudantes do ensino médio público.
- **Minha Casa Minha Vida**: relançamento.
- **Auxílio Gás Social**.

### 1.6. STF e Poder Judiciário

- Composição STF (junho/2026): Barroso (Presidente), Edson Fachin, Cármen Lúcia, Gilmar Mendes, Dias Toffoli, Luiz Fux, Cristiano Zanin, Alexandre de Moraes, Flávio Dino, André Mendonça, Kassio Nunes Marques.
- Decisões marcantes:
  - Descriminalização porte maconha até 40g (RE 635.659).
  - Marco temporal terras indígenas inconstitucional (Lei 14.701/23 → ADI em julgamento).
  - Aborto até 22 semanas em discussão (ADPF 442).

### 1.7. Eleições municipais 2024

- Reeleições significativas em capitais.
- Crescimento de partidos de direita (PL, União, Republicanos).
- Polarização mantida.

### 1.8. Operação Lula Livre / Lava Jato

- STF anulou condenações de Lula (2021).
- Discussão sobre limites Lava Jato e abuso (Anti-Lava Jato).

## 2. Brasil — Sociedade e Meio Ambiente

### 2.1. Crise climática

- **Tragédia RS 2024**: inundações histroricas em maio 2024 — 180+ mortos, 2 milhões afetados.
- **Incêndios Amazônia 2024**: bateu recorde de focos de calor.
- **Pantanal**: secas históricas.
- **Política nacional climática**: PL Clima em discussão.

### 2.2. COP30 — Belém, novembro 2025

- Brasil sediou Conferência da ONU sobre Mudanças Climáticas.
- Pautas: Amazônia, financiamento climático, biodiversidade, transição energética.
- Resultado: marco de financiamento ampliado (USD 300bi/ano).

### 2.3. Censo 2022 (resultados consolidados em 2023-2024)

- População BR: 203 milhões.
- Envelhecimento populacional.
- Queda da fecundidade (1,55 filhos/mulher).
- Crescimento urbano.

## 3. Mundo — Política e Geopolítica

### 3.1. Guerra Rússia-Ucrânia (2022-)

- Continua sem solução clara em 2026.
- Ucrânia em diferentes contraofensivas.
- Trump tentou negociar cessar-fogo direto após posse.
- Europa: aumento gastos militares, OTAN ampliada (Suécia em 2024, Finlândia 2023).

### 3.2. Israel × Hamas / Hezbollah / Iran (2023-)

- Ataque Hamas em 7/10/2023 → ofensiva Israel em Gaza.
- 2024: guerra Israel-Hezbollah.
- Outubro 2024: Israel atacou Irã diretamente.
- 2025: cessar-fogo Gaza negociado.
- Crise humanitária: dezenas de milhares mortos.

### 3.3. EUA — Eleições 2024 + Governo Trump

- Trump venceu Kamala Harris (novembro 2024).
- Posse: janeiro 2025.
- Decisões marcantes:
  - Tarifas comerciais elevadas (China, México, Canadá).
  - Retirada do Acordo de Paris.
  - Política migratória endurecida.
  - Anúncio do "Stargate" — investimento em IA.

### 3.4. China — Xi Jinping

- 3º mandato confirmado.
- Crise imobiliária prolongada.
- Tensões Taiwan.
- DeepSeek (IA open-source chinesa, 2025) abalou mercados de IA dos EUA.

### 3.5. BRICS+ (ampliado)

- Composição atual: Brasil, Rússia, Índia, China, África do Sul + Egito, Etiópia, Irã, Emirados Árabes Unidos (Arábia Saudita não confirmou).
- Argentina recusou em 2023.
- Cúpula 2024 em Kazan (Rússia): discussão moeda alternativa.
- Cúpula 2025 no Rio: foco em transição energética.

### 3.6. Mercosul-UE

- Acordo assinado em dezembro 2024.
- Em ratificação pelos parlamentos.
- Resistência da França (questão agrícola).

### 3.7. G20 sob presidência brasileira (2024)

- Brasil presidiu o G20 em 2024.
- Cúpula em novembro 2024 no Rio.
- Agenda: taxação super-ricos (proposta), fome e pobreza, governança IA.

## 4. Mundo — Tecnologia e Sociedade

### 4.1. Inteligência Artificial

- **ChatGPT 5** (lançamento 2024).
- **AI Act** UE (regulamento aprovado em 2024, vigor 2026).
- **Brasil**: PL 2.338/23 (Marco Legal IA) em tramitação.
- **DeepSeek R1**: chinesa, open-source, abalou OpenAI/Anthropic.

### 4.2. Tratado Pandemias OMS

- Em negociação.
- Brasil ativo.

### 4.3. Genocídio em Gaza

- TPI emitiu mandados de prisão contra Netanyahu e Yoav Gallant (novembro 2024).
- Brasil aderiu à ação da África do Sul na CIJ por genocídio.

### 4.4. Crise migratória

- Recordes de deslocados forçados (120 milhões em 2024 — ACNUR).
- Trump endureceu fronteira EUA-México.

## 5. Como Cebraspe cobra

- **C/E**: "Brasil é membro permanente do CSNU" → **ERRADO** (pleiteia; não é).
- **C/E COP30**: "COP30 será sediada em Manaus em 2025" → **ERRADO** (Belém).
- **C/E reforma tributária**: "EC 132/23 mantém ISS, PIS e COFINS" → **ERRADO** (substitui por CBS/IBS/IS).
- **C/E BRICS**: "BRICS continua sendo Brasil, Rússia, Índia, China, África do Sul" → **ERRADO** (ampliado 2024).
- **C/E IA**: "AI Act é norma brasileira" → **ERRADO** (UE; BR é PL 2.338).
- **C/E STF**: "STF descriminalizou maconha em qualquer quantidade" → **ERRADO** (até 40g/6 plantas; uso pessoal).
$content$,
$resumo$
# Resumo — Atualidades 2024-2026

## Brasil

- Lula 3º mandato (2023-26).
- Reforma Tributária (EC 132/23): CBS + IBS + IS. Cashback baixa renda.
- Arcabouço Fiscal (LC 200/23): substitui Teto.
- Bolsa Família reformulado + Pé-de-Meia.
- Tragédia RS 2024, incêndios Amazônia, Pantanal seco.
- COP30 em Belém (nov 2025).
- Censo 2022: 203 mi habitantes, fecundidade 1,55.
- STF descriminalizou maconha até 40g (RE 635.659).

## Mundo

| Evento | Status |
|---|---|
| Rússia-Ucrânia | Em curso (2022-) |
| Israel-Hamas/Hez/Irã | Gaza cessar-fogo 2025 |
| Trump 2 | Posse jan/2025 |
| China-Xi 3º mandato | Crise imobiliária + Taiwan |
| BRICS+ | Egito, Etiópia, Irã, UAE |
| Mercosul-UE | Assinado dez/2024 |
| G20 BR | Presidência 2024 — taxação super-ricos |
| AI Act UE | Vigor 2026 |
| TPI Netanyahu | Mandado nov/2024 |

## Top pegadinhas

1. Brasil pleiteia CSNU permanente — NÃO é.
2. COP30 = Belém (não Manaus).
3. EC 132: CBS+IBS+IS (substitui PIS/COFINS/IPI/ICMS/ISS).
4. BRICS+ ampliado (não é só 5).
5. Maconha STF: até 40g/6 plantas pessoais.
6. AI Act = UE.
$resumo$
);

-- ┌─ 2. DH — Sistema Internacional ──────────────────────────────────────────┐
SELECT upsert_material(
  'direitos-humanos',
  'Sistema Internacional de DH (Pacto SP, Belém do Pará, Tortura, Genocídio)',
  'Sistema Internacional de Proteção dos Direitos Humanos',
$content$
# Sistema Internacional de Proteção dos Direitos Humanos

Bloco frequentemente cobrado em PF (DH são 5q-7q do edital). Cebraspe cobra **convenções específicas** com bastante detalhe.

## 1. Pirâmide do Sistema Internacional

### 1.1. Sistema Global (ONU)

- **Declaração Universal dos DH** (1948) — aspiracional, sem força vinculante direta.
- **Pacto Internacional de Direitos Civis e Políticos (PIDCP)** (1966) — vinculante.
- **Pacto Internacional de Direitos Econômicos, Sociais e Culturais (PIDESC)** (1966) — vinculante.

Demais convenções específicas (Genocídio, Tortura, Racismo, Mulher, Criança, PCD, etc).

### 1.2. Sistemas Regionais

- **Americano** (OEA): Convenção Americana de DH = Pacto de São José da Costa Rica.
- **Europeu** (Conselho da Europa): Convenção Europeia de DH.
- **Africano** (União Africana): Carta Africana de DH.

## 2. Convenção Americana de DH — Pacto de São José da Costa Rica (1969)

### 2.1. Adoção pelo Brasil

- Brasil ratificou em 1992 (Decreto 678/92).
- Aceitou competência da Corte IDH em 1998 (Decreto 4.463/02).

### 2.2. Direitos garantidos

- **Direito à vida** (art. 4º):
  - Vedada pena de morte para crime político.
  - Não pode ser estendida a crimes que não a tinham.
  - ⚠️ Não veda totalmente a pena de morte, mas Brasil aderiu vedando para qualquer crime.
- **Direito à integridade pessoal** (art. 5º): vedada tortura, penas cruéis. Direito do preso à dignidade.
- **Proibição da escravidão**.
- **Liberdade pessoal** (art. 7º): garantia de habeas corpus.
- **Garantias judiciais** (art. 8º): devido processo, juiz natural, presunção de inocência.
- **Princípio da legalidade e irretroatividade** (art. 9º).
- **Direito à indenização por erro judiciário** (art. 10).
- **Proteção da honra e dignidade**.
- **Liberdade de consciência e religião**.
- **Liberdade de pensamento e expressão**.

### 2.3. Sistema interamericano de proteção

- **Comissão Interamericana de DH** (CIDH): recebe denúncias, conduz investigação.
- **Corte Interamericana de DH** (Corte IDH): tribunal — pode condenar Estados.

### 2.4. Casos contra o Brasil

- **Damião Ximenes Lopes** (2006): primeira condenação do Brasil — tortura em hospital psiquiátrico.
- **Sétimo Garibaldi** (2009): ineficiência judicial.
- **Gomes Lund e outros (Guerrilha do Araguaia)** (2010): Lei de Anistia.
- **Trabalhadores Fazenda Brasil Verde** (2016): trabalho escravo.

### 2.5. Princípio Pro Homine

> "Toda regra de DH deve ser interpretada do modo mais favorável à pessoa."

## 3. Convenção contra o Genocídio (1948)

### 3.1. Conceito

> "Atos cometidos com a intenção de destruir, no todo ou em parte, um grupo nacional, étnico, racial ou religioso..."

- Matar membros do grupo.
- Causar lesão grave à integridade.
- Submeter a condições de destruição.
- Medidas que impeçam nascimentos.
- Transferência forçada de crianças.

### 3.2. No Brasil

- **Lei 2.889/56**: tipifica genocídio.
- Punição independente da participação de PJ ou agente público.

## 4. Convenção contra Tortura (1984)

### 4.1. Conceito (art. 1º)

> "Tortura: qualquer ato pelo qual dores ou sofrimentos agudos, físicos ou mentais, são infligidos intencionalmente a uma pessoa para obter informação, confissão, castigá-la por ato cometido, intimidar..."

Pressuposto: praticado por funcionário público OU com seu consentimento.

### 4.2. No Brasil

- CF 5º XLIII: equiparada a hediondo (inafiançável, sem graça/anistia).
- **Lei 9.455/97**: tipifica tortura. Tipos: prova, discriminação, castigo.
- Crime EQUIPARADO a hediondo.

## 5. Convenção contra Discriminação Racial (CERD — 1965)

- Brasil aderiu em 1969 (Decreto 65.810/69).
- Define discriminação como qualquer distinção, exclusão, restrição ou preferência baseada em raça, cor, descendência.
- **Lei 7.716/89** (Caó): pune crimes de racismo no Brasil. Inafiançável, imprescritível, sem graça (CF 5º XLII).
- **Lei 14.532/23**: injúria racial agora EQUIPARADA a racismo.

## 6. Convenção sobre Eliminação de Discriminação contra a Mulher (CEDAW — 1979)

- Brasil aderiu em 1984 (com reservas; depois retiradas).
- Promove igualdade de gênero.
- Instrumento de monitoramento: Comitê CEDAW.

### 6.1. Convenção de Belém do Pará (1994)

- Convenção Interamericana para Prevenir, Punir e Erradicar a Violência contra a Mulher.
- Brasil ratificou em 1995.
- **Lei 11.340/06 (Maria da Penha)** decorre dessa convenção.
- Tipos de violência: física, psicológica, sexual, patrimonial, moral.

## 7. Outras Convenções Importantes

### 7.1. Convenção sobre Direitos da Criança (1989)

- Aderida em 1990 (Decreto 99.710/90).
- Princípio: melhor interesse da criança.
- Base do **ECA (Lei 8.069/90)**.

### 7.2. Convenção sobre PCD (2007)

- Brasil aderiu com status de Emenda Constitucional (CF 5º §3º — primeiro tratado com esse status).
- Base do **Estatuto da PCD (Lei 13.146/15)**.

### 7.3. Convenção contra Desaparecimento Forçado (2006)

- Brasil ratificou em 2010.

### 7.4. Regras Mínimas para Tratamento de Reclusos (Mandela — 2015)

- ONU.
- Vedação à tortura, condições mínimas de detenção, separação por categorias.

## 8. Sistema Brasileiro de DH

### 8.1. Programas Nacionais de DH

- **PNDH-1** (1996).
- **PNDH-2** (2002).
- **PNDH-3** (Decreto 7.037/09) — vigente.

### 8.2. Plano Nacional de Promoção de Cidadania e DH de LGBT (2009).

### 8.3. Comitê Nacional de Prevenção e Combate à Tortura

- Lei 12.847/13.

### 8.4. Defensoria Pública

- Função essencial à Justiça (CF 134).

## 9. Como Cebraspe cobra

- **C/E**: "Brasil aceitou competência da Corte IDH em 1969" → **ERRADO** (1998).
- **C/E Pacto SJ**: "Veda completamente pena de morte" → **ERRADO** (não veda; só restringe).
- **C/E genocídio**: "Genocídio exige morte do grupo todo" → **ERRADO** (todo ou em parte; basta intenção).
- **C/E tortura**: "Tortura pode ser praticada por particular" → **CUIDADO** (no Brasil sim — Lei 9.455 admite; convenção ONU exige agente público).
- **C/E Belém do Pará**: "É convenção do sistema europeu" → **ERRADO** (americano).
- **C/E PCD**: "Convenção PCD tem status de lei ordinária" → **ERRADO** (status de EC).
$content$,
$resumo$
# Resumo — Sistema Internacional de DH

## Pirâmide

ONU (Pacto Internacional) + Sistemas Regionais (Americano, Europeu, Africano).

## Pacto São José (1969 — OEA)

- Brasil: 1992 (decreto 678).
- Corte IDH: 1998.
- Direitos: vida, integridade, liberdade, garantias judiciais, legalidade, indenização erro judiciário, honra, religião, expressão.
- Casos contra BR: Damião Ximenes, Gomes Lund (Anistia), Fazenda Brasil Verde.

## Pro Homine

Interpretação mais favorável à pessoa.

## Genocídio (1948 + Lei 2.889/56)

Destruir grupo nacional/étnico/racial/religioso. Todo ou em PARTE.

## Tortura (1984 + Lei 9.455/97)

Dor física/mental intencional para obter info, castigar, intimidar.
⚠️ Convenção ONU: agente público. Lei BR: particular também.
Equiparada a hediondo.

## CERD (1965 + Lei 7.716/89)

Racismo: inafiançável, imprescritível.
Injúria racial = racismo (Lei 14.532/23).

## Belém do Pará (1994) → Maria da Penha (Lei 11.340/06)

Violência contra mulher: física, psicológica, sexual, patrimonial, moral.

## ECA (1989 → Lei 8.069/90)

Criança: melhor interesse.

## PCD (2007 → status EC + Lei 13.146/15)

PRIMEIRO tratado com status EC no BR.

## Top pegadinhas Cebraspe

1. Corte IDH BR = 1998 (não 1992).
2. Pacto SJ NÃO veda totalmente pena de morte.
3. Genocídio = todo OU EM PARTE.
4. Convenção PCD = STATUS EC.
5. Belém do Pará = SISTEMA AMERICANO.
6. Lei BR de tortura admite particular como autor.
$resumo$
);

-- ┌─ 3. DH — Uso de Instrumentos Menos Letais ───────────────────────────────┐
SELECT upsert_material(
  'direitos-humanos',
  'Uso de Instrumentos Menos Letais (Lei 13.060/14 + Dec 12.341/24)',
  'Uso de Instrumentos de Menor Potencial Ofensivo — Lei 13.060/14 e Decreto 12.341/24',
$content$
# Uso de Instrumentos de Menor Potencial Ofensivo — Lei 13.060/14 e Decreto 12.341/24

Tema RECENTE e crítico em concursos policiais. Cebraspe começou a cobrar em 2024-2025 com força. Decreto 12.341/24 é a regulamentação atualizada.

## 1. Princípios da Atuação Policial

### 1.1. Princípios de Havana (ONU, 1990)

> "Princípios Básicos sobre Uso da Força e Armas de Fogo pelos Funcionários Responsáveis pela Aplicação da Lei."

Princípios fundamentais:
- **Legalidade**: agir dentro da lei.
- **Necessidade**: a força só quando indispensável.
- **Proporcionalidade**: força proporcional ao perigo.
- **Moderação**: usar o mínimo possível.
- **Conveniência**.

### 1.2. Princípios constitucionais e legais

- CF 5º III: vedação à tortura, tratamento desumano.
- CF 144: segurança pública é dever do Estado e responsabilidade de todos.
- CF 37: princípio da legalidade administrativa.

### 1.3. Escalonamento gradual do uso da força

Sequência preconizada (escalada):
1. **Presença policial**: uniforme, viatura.
2. **Verbalização**: ordens, advertências.
3. **Mãos livres**: contato físico controle (técnicas defensivas).
4. **Instrumentos menos letais**: cassetete, spray de pimenta, taser, munição de borracha.
5. **Arma de fogo**: último recurso, em risco iminente de vida.

## 2. Lei 13.060/14

### 2.1. Objeto

Disciplina o uso dos **instrumentos de menor potencial ofensivo** pelos agentes de segurança pública.

### 2.2. Princípios (art. 2º)

- Uso PROPORCIONAL.
- Aplicação somente quando necessário.
- Compatibilidade com normas internacionais (Havana).

### 2.3. Definição (art. 4º)

> "Instrumentos de menor potencial ofensivo são aqueles projetados especificamente para, COM REDUZIDA PROBABILIDADE DE CAUSAR MORTE OU LESÕES PERMANENTES, conter, debilitar ou incapacitar."

Exemplos: cassetete, spray de pimenta, gás OC/CS, taser/dispositivo de descarga elétrica, munição de borracha, granadas de efeito moral.

### 2.4. Capacitação obrigatória

- Treinamento técnico, jurídico, em DH.
- Continuado.

### 2.5. Registro

- Todo uso de força deve ser registrado em **Boletim de Ocorrência** ou em documento equivalente.

## 3. Decreto 12.341/24 — Regulamentação Atualizada

### 3.1. Vigência

- Publicado em 2024.
- Substitui regulamentação anterior.
- Aplicável a TODOS os órgãos de segurança pública federais.

### 3.2. Categorias de Instrumentos

- **Categoria I**: Imobilização (algemas, espuma química).
- **Categoria II**: Impactos controlados (cassetete, munição de borracha).
- **Categoria III**: Químicos (spray pimenta, gás lacrimogêneo).
- **Categoria IV**: Eletricidade (taser, dispositivos descarga elétrica).
- **Categoria V**: Acústicos e luminosos (granadas estampido).

### 3.3. Princípios reforçados

- **Necessidade absoluta**.
- **Proporcionalidade qualificada**.
- **Mínimo dano**.
- **Prestação de socorro imediato**.
- **Documentação completa do uso**.

### 3.4. Vedações específicas

- Uso contra pessoas em manifestações pacíficas (salvo violência iminente).
- Uso contra grupos vulneráveis sem necessidade (idosos, crianças, gestantes).
- Disparo de munição menos letal acima da cintura (regra geral).
- Uso de taser em pessoas com problemas cardíacos conhecidos.

### 3.5. Avaliação pós-uso

- Comissão Interna de Análise de Uso da Força.
- Investigação se houver lesão grave/morte.
- Acompanhamento da Corregedoria.

### 3.6. Princípio do mínimo dano

Mesmo no uso autorizado, o agente deve:
- Cessar imediatamente quando o objetivo for alcançado.
- Acionar atendimento médico.
- Documentar o incidente.

## 4. Uso Letal — Arma de Fogo

### 4.1. Quando é permitido (Havana art. 9º)

Apenas em:
- Legítima defesa.
- Defesa de outras pessoas contra morte/lesão grave iminente.
- Prevenção de crime grave que envolva ameaça grave à vida.
- Para deter pessoa em fuga que represente esse perigo OU prender suspeito de crime gravíssimo.

### 4.2. Vedações

- Tiros de advertência: regra é evitar (risco a terceiros).
- Disparo em veículos em movimento: só em situações extremas.
- Disparo em crianças, mulheres grávidas, idosos sem necessidade absoluta.

## 5. Responsabilização

### 5.1. Por uso INDEVIDO

- **Penal**: lesão, homicídio, abuso de autoridade.
- **Civil**: indenização à vítima.
- **Administrativa**: PAD, demissão.
- **Por DH**: pode ir ao sistema interamericano.

### 5.2. Quando NÃO há responsabilidade

- Uso dentro dos parâmetros (necessidade + proporcionalidade + escalada + registro).
- Excludente de ilicitude (legítima defesa, estado de necessidade, estrito cumprimento do dever legal).

## 6. Casos paradigmáticos brasileiros

- **Operação na Maré (RJ)**: vários incidentes resultando em mortes — questionamentos sobre proporcionalidade.
- **Manifestações 2013-2014**: uso de munições menos letais em manifestações pacíficas gerou crítica.
- **Caso Cláudia Silva Ferreira** (2014, RJ): mulher morta e arrastada por viatura — caso emblemático sobre treinamento e protocolo.

## 7. Como Cebraspe cobra

- **C/E**: "Lei 13.060/14 define instrumentos como aqueles que NÃO causam lesão" → **ERRADO** (reduzem probabilidade — podem causar).
- **C/E**: "Taser é instrumento absolutamente seguro" → **ERRADO** (vedado em casos específicos).
- **C/E**: "Arma de fogo deve ser o primeiro recurso em fugas" → **ERRADO** (último recurso).
- **C/E**: "Princípios de Havana têm força vinculante no BR" → **CUIDADO** (são orientadores; servem de parâmetro mas não são lei formal).
- **C/E**: "Decreto 12.341/24 dispensa registro do uso de força" → **ERRADO** (exige documentação completa).
- **C/E**: "Tiros de advertência são incentivados" → **ERRADO** (devem ser evitados).
$content$,
$resumo$
# Resumo — Uso da Força + Instrumentos Menos Letais

## Princípios

### Havana (ONU 1990)
LEGALIDADE + NECESSIDADE + PROPORCIONALIDADE + MODERAÇÃO + CONVENIÊNCIA.

### Escalonamento da força
1. Presença → 2. Verbalização → 3. Mãos livres → 4. Instrumentos menos letais → 5. Arma de fogo (último recurso).

## Lei 13.060/14

Disciplina instrumentos menos letais.
Definição: REDUZIDA probabilidade de morte/lesão permanente.
Exige capacitação + registro em BO.

## Decreto 12.341/24

### Categorias
I: imobilização (algema) | II: impacto (cassetete, borracha) | III: químico (spray, gás) | IV: elétrica (taser) | V: acústico/luminoso (estampido).

### Vedações
- Manifestações pacíficas.
- Grupos vulneráveis.
- Munição borracha acima da cintura.
- Taser em cardíacos.

### Princípios reforçados
Necessidade absoluta, proporcionalidade qualificada, mínimo dano, socorro imediato, documentação.

## Arma de fogo (Havana art. 9º)

Só em: legítima defesa, defesa terceiros, prevenção crime grave, deter fugitivo perigoso.
Vedados (regra): tiros advertência, disparo em veículo em movimento.

## Responsabilização

Penal + Civil + Adm + DH (caso de violação).

## Top pegadinhas Cebraspe

1. "Menos letal" = REDUZIDA probabilidade (não zero).
2. Arma de fogo = ÚLTIMO recurso.
3. Decreto 12.341 EXIGE registro completo.
4. Taser vedado em cardíacos.
5. Princípios Havana são ORIENTADORES (não lei).
6. Tiros de advertência: EVITAR.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('atualidades', 'direitos-humanos')
  );
  RAISE NOTICE 'Onda 15 OK — total de materiais nesses subjects: %', v_count;
END $$;
