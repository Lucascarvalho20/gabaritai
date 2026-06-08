-- =====================================================================
-- BATCH 6 GRANULAR — Direito Administrativo
-- Bens Públicos + Intervenção do Estado na Propriedade
-- =====================================================================
-- 8 materiais (1500-2000 palavras cada), 1 por tópico específico.
-- Idempotente: pode rodar várias vezes; preserva status REVIEWED/PUBLISHED.
-- =====================================================================

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

-- =====================================================================
-- 1/8 — Bens Públicos: Classificação (uso comum, especial, dominical)
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Bens Públicos - Classificação',
  'Bens Públicos — Classificação (CC art. 99): uso comum, uso especial e dominicais',

E'# Bens Públicos — Classificação\n\n'
'## 1. Conceito e fundamento legal\n\n'
'Bens públicos são, nos termos do art. 98 do Código Civil de 2002, "os bens do domínio nacional pertencentes às pessoas jurídicas de direito público interno". Todos os demais (inclusive bens de empresas públicas e sociedades de economia mista, em regra) são considerados **bens particulares**.\n\n'
'O critério legal é, portanto, **subjetivo (titularidade)**: se o titular é pessoa jurídica de direito público interno (União, Estados, DF, Municípios, autarquias e fundações públicas de direito público), o bem é público. A doutrina majoritária (Celso Antônio Bandeira de Mello, Marçal Justen Filho, Maria Sylvia Di Pietro) acrescenta um critério funcional: bens de pessoas privadas afetados a serviço público essencial também recebem proteção (ex.: bens de concessionárias diretamente vinculados à concessão, súmula 39 STJ).\n\n'
'## 2. Classificação do art. 99 do CC\n\n'
'O art. 99 do Código Civil estabelece a clássica tripartição:\n\n'
'### 2.1. Bens de uso comum do povo (inciso I)\n\n'
'São os bens destinados ao uso indistinto de toda a coletividade. Exemplos clássicos: **rios, mares, estradas, ruas, praças, praias** (Lei 7.661/88), parques municipais abertos ao público.\n\n'
'Características marcantes:\n'
'- Uso por qualquer pessoa, sem necessidade de autorização individual (em regra)\n'
'- Gratuidade como regra (CC art. 103: "O uso comum dos bens públicos pode ser gratuito ou retribuído, conforme for estabelecido legalmente pela entidade a cuja administração pertencerem")\n'
'- A cobrança (pedágio em rodovias, ingresso em parques) **depende de lei**\n'
'- Não há ato administrativo individualizado de concessão — basta o uso conforme a destinação\n\n'
'O uso comum pode ser **normal** (conforme a destinação ordinária — caminhar pela rua) ou **anormal** (com finalidade diversa — fechar rua para festa). O uso anormal exige consentimento estatal (autorização, permissão ou concessão de uso).\n\n'
'### 2.2. Bens de uso especial (inciso II)\n\n'
'São os bens **afetados a serviço ou estabelecimento da Administração**. Exemplos: prédios de repartições públicas, escolas públicas, hospitais públicos, universidades federais, aeroportos, quartéis, viaturas, mobiliário das repartições, bens de autarquias.\n\n'
'Características:\n'
'- Destinados a um fim público específico (não ao uso geral da população)\n'
'- Acesso restrito ao público conforme a finalidade (você entra na repartição para atendimento, não para morar)\n'
'- A utilização particular por terceiro (ex.: lanchonete dentro de fórum) exige instrumento de delegação\n\n'
'### 2.3. Bens dominicais (inciso III)\n\n'
'São os bens que **constituem o patrimônio das pessoas jurídicas de direito público, como objeto de direito pessoal ou real**, de cada uma dessas entidades. São os bens **sem destinação pública específica** — o Estado os possui como proprietário privado.\n\n'
'Exemplos: terras devolutas, prédios públicos desativados, móveis em desuso, ações de empresas pertencentes ao Estado, créditos da Fazenda.\n\n'
'**Característica decisiva:** apenas os bens dominicais podem, em regra, ser **alienados** (CC art. 101), porque os bens de uso comum e especial estão **afetados** a uma destinação pública e são, por isso, inalienáveis enquanto perdurar a afetação.\n\n'
'## 3. Afetação e desafetação\n\n'
'Os bens passam de uma categoria a outra por **afetação** (consagração a uma destinação pública) ou **desafetação** (perda dessa destinação).\n\n'
'- **Afetação:** pode ocorrer por lei, por ato administrativo ou por fato natural/uso (ex.: rio que se forma naturalmente em área pública).\n'
'- **Desafetação:** em regra, exige forma equivalente (lei desafeta o que foi afetado por lei). Para a maior parte da doutrina, fatos naturais (incêndio que destrói prédio público) também desafetam.\n\n'
'A desafetação é pressuposto da alienação: para vender uma escola pública desativada, primeiro é preciso desafetá-la (transformá-la em bem dominical) e depois licitar a venda, conforme a Lei 14.133/21 (concorrência ou leilão, conforme o caso) e a Lei 8.666/93 (ainda aplicável a contratos antigos).\n\n'
'## 4. Critérios doutrinários alternativos de classificação\n\n'
'Além da classificação legal, a doutrina trabalha com outros critérios:\n\n'
'### Quanto à titularidade:\n'
'- **Federais** (CF art. 20)\n'
'- **Estaduais** (CF art. 26)\n'
'- **Municipais** (sem rol expresso na CF)\n'
'- **Distritais** (DF acumula competências estaduais e municipais)\n\n'
'### Quanto à disponibilidade:\n'
'- **Indisponíveis:** uso comum (mar, rios)\n'
'- **Patrimoniais indisponíveis:** uso especial (hospital público em funcionamento)\n'
'- **Patrimoniais disponíveis:** dominicais (prédio desativado)\n\n'
'## 5. Aplicação concreta — concursos\n\n'
'**Questões CESPE/Cebraspe** costumam cobrar:\n'
'- "Praça pública é bem de uso comum" ✅\n'
'- "Prédio do INSS é bem de uso especial" ✅ (afetado a serviço público)\n'
'- "Terras devolutas são bens de uso comum" ❌ — são **dominicais** (CF art. 20, II classifica como da União, mas a doutrina e a jurisprudência tratam como dominicais)\n'
'- "Bens das estatais (Petrobras, BB) são bens públicos" ❌ — em regra, são **privados** (CC art. 98), salvo afetados a serviço público essencial conforme jurisprudência do STF (ECT, INFRAERO equiparados à Fazenda Pública para fins de impenhorabilidade — RE 220.906/DF)\n\n'
'## 6. Quadro-resumo\n\n'
'| Categoria | Destinação | Exemplo | Alienável? |\n'
'|---|---|---|---|\n'
'| Uso comum | Coletividade indistinta | Rua, praia, rio | Não (enquanto afetado) |\n'
'| Uso especial | Serviço/estabelecimento | Escola, hospital, quartel | Não (enquanto afetado) |\n'
'| Dominical | Patrimônio sem destinação | Terra devoluta, prédio desativado | Sim (após desafetação, se for o caso) |\n\n'
'## 7. Conclusão\n\n'
'A classificação do art. 99 do CC é o ponto de partida para entender o regime dos bens públicos: ela determina **alienabilidade, formas de uso por particulares, possibilidade de desafetação** e o tratamento jurisprudencial. Para concursos policiais, dominar essa classificação é pré-requisito para compreender os regimes de impenhorabilidade, imprescritibilidade e não-onerabilidade que serão estudados a seguir.\n',

  'Bens públicos (CC art. 98-99) classificam-se em uso comum (povo: ruas, praças, rios), uso especial (afetados a serviço: hospitais, escolas, repartições) e dominicais (patrimônio sem destinação: terras devolutas, prédios desativados). Só os dominicais podem ser alienados, salvo desafetação prévia dos demais. A afetação consagra a destinação pública; a desafetação remove-a, viabilizando alienação após licitação (Lei 14.133/21). Bens de estatais em regra são privados, salvo afetação a serviço público essencial (jurisprudência STF: ECT, INFRAERO).'
);

-- =====================================================================
-- 2/8 — Bens Públicos: Regime Jurídico (impenhorabilidade etc.)
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Bens Públicos - Regime Jurídico',
  'Regime jurídico dos bens públicos: inalienabilidade, impenhorabilidade, imprescritibilidade, não-onerabilidade',

E'# Bens Públicos — Regime Jurídico\n\n'
'## 1. Visão geral\n\n'
'O regime jurídico dos bens públicos é marcado por quatro atributos fundamentais que decorrem da supremacia do interesse público e do princípio da indisponibilidade do interesse público:\n\n'
'1. **Inalienabilidade** (relativa)\n'
'2. **Impenhorabilidade**\n'
'3. **Imprescritibilidade** (não usucapibilidade)\n'
'4. **Não-onerabilidade** (impossibilidade de oneração real)\n\n'
'Esses atributos protegem o patrimônio público da ação de credores, especuladores e do próprio descuido administrativo.\n\n'
'## 2. Inalienabilidade (CC arts. 100 e 101)\n\n'
'### 2.1. Regra geral\n\n'
'O art. 100 do CC dispõe: *"Os bens públicos de uso comum do povo e os de uso especial são inalienáveis, enquanto conservarem a sua qualificação, na forma que a lei determinar."*\n\n'
'Já o art. 101: *"Os bens públicos dominicais podem ser alienados, observadas as exigências da lei."*\n\n'
'Síntese:\n'
'- Bens de **uso comum** e **uso especial** → **inalienáveis** enquanto afetados\n'
'- Bens **dominicais** → **alienáveis**, mediante condições legais\n\n'
'### 2.2. Inalienabilidade é absoluta?\n\n'
'**Não.** Trata-se de **inalienabilidade relativa**: o que veda a alienação é a afetação. Desafetado o bem (lei, ato ou fato natural), ele passa a dominical e pode ser alienado.\n\n'
'### 2.3. Requisitos para alienação de bens dominicais\n\n'
'A Lei 14.133/21 (Nova Lei de Licitações), no art. 76, estabelece:\n\n'
'**Bens imóveis:**\n'
'- Autorização legislativa para a Administração direta, autarquias e fundações\n'
'- Avaliação prévia\n'
'- Licitação na modalidade **leilão** (regra) ou **dispensa** em hipóteses específicas (art. 76, I)\n'
'- Justificado interesse público\n\n'
'**Bens móveis:**\n'
'- Avaliação prévia\n'
'- Licitação na modalidade **leilão**\n'
'- Dispensa em hipóteses do art. 76, II (doação, permuta, venda para outro órgão público etc.)\n\n'
'### 2.4. Hipóteses de dispensa de licitação para alienação\n\n'
'A Lei 14.133/21 prevê várias hipóteses em que a alienação de bens públicos pode ser feita sem licitação: doação para fins de interesse social, permuta entre órgãos públicos, venda a outro ente da Federação, dação em pagamento, investidura (alienação de área remanescente inaproveitável a proprietário lindeiro), entre outras.\n\n'
'## 3. Impenhorabilidade\n\n'
'### 3.1. Fundamento constitucional\n\n'
'Não há vedação explícita à penhora de bens públicos na CF, mas ela decorre do **regime de precatórios** (CF art. 100). Como as dívidas da Fazenda Pública são pagas por precatório (ou RPV — requisição de pequeno valor), os bens públicos não respondem por execução individual contra o ente público.\n\n'
'### 3.2. Alcance\n\n'
'A impenhorabilidade alcança **todos os bens públicos**, independentemente da categoria (uso comum, especial ou dominical). É um atributo mais amplo que a inalienabilidade.\n\n'
'### 3.3. Bens de estatais\n\n'
'Em regra, **bens de empresas públicas e sociedades de economia mista são penhoráveis** porque submetidos ao regime de direito privado (CF art. 173, § 1º, II). Exceções jurisprudenciais consagradas:\n\n'
'- **ECT (Correios):** RE 220.906/DF — equiparada à Fazenda Pública pelo STF; bens impenhoráveis. Razão: serviço público em regime de monopólio (art. 21, X CF)\n'
'- **INFRAERO:** mesmo tratamento por prestação de serviço público em regime de monopólio\n'
'- **Outras estatais prestadoras de serviço público exclusivo** podem ser equiparadas caso a caso (Casa da Moeda — RE 610.517)\n\n'
'## 4. Imprescritibilidade (não usucapibilidade)\n\n'
'### 4.1. Vedação constitucional\n\n'
'A Constituição é categórica:\n\n'
'- **Art. 183, § 3º:** "Os imóveis públicos não serão adquiridos por usucapião."\n'
'- **Art. 191, parágrafo único:** "Os imóveis públicos não serão adquiridos por usucapião."\n\n'
'### 4.2. Reforço legal\n\n'
'- **Súmula 340 STF** (1963, ainda vigente): "Desde a vigência do CC, os bens dominicais, como os demais bens públicos, não podem ser adquiridos por usucapião."\n'
'- **CC art. 102:** "Os bens públicos não estão sujeitos a usucapião."\n\n'
'### 4.3. Alcance\n\n'
'Vale para **todos os bens públicos** — móveis e imóveis; uso comum, especial ou dominicais — e para todas as modalidades de usucapião (ordinária, extraordinária, especial urbana, especial rural, coletiva, familiar).\n\n'
'### 4.4. Posse de boa-fé sobre bem público?\n\n'
'O STJ e o STF firmaram entendimento de que **não há posse, mas mera detenção**, sobre bem público invadido. Logo, o ocupante não tem direito a indenização por benfeitorias e nem retenção (REsp 945.055; REsp 808.708). A Administração pode retomar o bem por autotutela ou ação de reintegração.\n\n'
'## 5. Não-onerabilidade\n\n'
'### 5.1. Conceito\n\n'
'Os bens públicos **não podem ser objeto de direitos reais de garantia** — não podem ser hipotecados, dados em penhor ou em anticrese.\n\n'
'### 5.2. Razão\n\n'
'Se o bem público não pode ser penhorado nem alienado por dívida, dar garantia real seria inócuo — o credor não poderia executar a garantia.\n\n'
'### 5.3. Bens dominicais\n\n'
'Mesmo bens dominicais, embora alienáveis, **não podem ser dados em garantia real** enquanto integrarem o patrimônio público. Só após a alienação a particular podem ser onerados.\n\n'
'## 6. Quadro-resumo comparativo\n\n'
'| Atributo | Uso comum | Uso especial | Dominical |\n'
'|---|---|---|---|\n'
'| Inalienabilidade | Sim (enquanto afetado) | Sim (enquanto afetado) | Não (alienável c/ requisitos) |\n'
'| Impenhorabilidade | Sim | Sim | Sim |\n'
'| Imprescritibilidade | Sim | Sim | Sim |\n'
'| Não-onerabilidade | Sim | Sim | Sim |\n\n'
'## 7. Tópicos de prova\n\n'
'**Pegadinhas frequentes:**\n'
'- "Bem dominical é alienável" ✅, mas "é penhorável" ❌\n'
'- "Bem público pode ser usucapido após 20 anos de posse mansa" ❌ — nenhuma modalidade serve\n'
'- "ECT tem bens penhoráveis porque é estatal" ❌ — STF equipara à Fazenda\n'
'- "Para alienar prédio público desativado basta o leilão" ❌ — exige antes desafetação + autorização legislativa + avaliação\n'
'- "Particular pode hipotecar bem dominical comprado em leilão" ✅ — após sair do patrimônio público, o bem deixa de ser público\n\n'
'## 8. Conclusão\n\n'
'O regime jurídico dos bens públicos é a tradução prática da indisponibilidade do interesse público sobre o patrimônio estatal. Os quatro atributos — inalienabilidade relativa, impenhorabilidade absoluta, imprescritibilidade absoluta e não-onerabilidade — formam um escudo de proteção em torno do patrimônio coletivo. Para a banca, decorar o quadro comparativo e dominar as exceções jurisprudenciais (ECT, INFRAERO) garante acerto em pelo menos uma questão objetiva por prova.\n',

  'Bens públicos têm 4 atributos: inalienabilidade relativa (uso comum/especial: inalienáveis enquanto afetados; dominicais: alienáveis com requisitos da Lei 14.133/21 — autorização legislativa para imóveis + avaliação + leilão), impenhorabilidade absoluta (regime de precatórios CF 100; ECT e INFRAERO equiparadas), imprescritibilidade absoluta (CF 183§3º, 191pu, Súmula 340 STF, CC 102 — nenhuma modalidade de usucapião) e não-onerabilidade (sem hipoteca/penhor). Ocupação de bem público é mera detenção, sem direito a indenização por benfeitorias.'
);

-- =====================================================================
-- 3/8 — Desapropriação
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Desapropriação',
  'Desapropriação: fundamentos constitucionais, modalidades e procedimento (DL 3.365/41)',

E'# Desapropriação\n\n'
'## 1. Conceito\n\n'
'Desapropriação é a forma originária de aquisição da propriedade pelo Poder Público, em que o Estado, fundado em necessidade pública, utilidade pública ou interesse social, retira a propriedade de um particular (ou de outro ente), mediante o pagamento de **justa indenização**, em regra prévia e em dinheiro.\n\n'
'É **modalidade de intervenção supressiva** na propriedade (a propriedade é retirada do titular), em contraposição às modalidades restritivas (servidão, tombamento, requisição, ocupação, limitação), que apenas limitam ou condicionam o uso.\n\n'
'## 2. Fundamento constitucional\n\n'
'A Constituição prevê três regimes principais:\n\n'
'### 2.1. Desapropriação ordinária — CF art. 5º, XXIV\n\n'
'*"A lei estabelecerá o procedimento para desapropriação por necessidade ou utilidade pública, ou por interesse social, mediante justa e prévia indenização em dinheiro, ressalvados os casos previstos nesta Constituição."*\n\n'
'Características:\n'
'- Indenização **prévia, justa e em dinheiro**\n'
'- Procedimento regulado pelo **DL 3.365/41** (utilidade/necessidade pública) e pela **Lei 4.132/62** (interesse social)\n\n'
'### 2.2. Desapropriação para reforma urbana — CF art. 182, § 4º, III\n\n'
'Aplicada a imóvel urbano subutilizado/não utilizado, após:\n'
'1. Parcelamento ou edificação compulsórios\n'
'2. IPTU progressivo no tempo (até 15%)\n'
'3. **Desapropriação com pagamento em títulos da dívida pública**, resgatáveis em até 10 anos, com juros legais\n\n'
'Regulamentado pelo **Estatuto da Cidade — Lei 10.257/01**.\n\n'
'### 2.3. Desapropriação para reforma agrária — CF art. 184\n\n'
'Aplicada a imóvel rural que não cumpra a função social. **Competência exclusiva da União.** Indenização em **títulos da dívida agrária (TDA)**, resgatáveis em até 20 anos. Benfeitorias úteis e necessárias são pagas em dinheiro.\n\n'
'**Imunidade:** pequena e média propriedade rural (cujo proprietário não possua outra) e propriedade produtiva (CF art. 185).\n\n'
'### 2.4. Desapropriação confiscatória — CF art. 243\n\n'
'**Sem indenização.** Aplica-se a propriedades onde se cultivem plantas psicotrópicas ilegais ou se explore trabalho escravo. O imóvel é destinado à reforma agrária e a programas de habitação popular. Regulada pela **Lei 8.257/91**.\n\n'
'## 3. Modalidades comuns (ordinária)\n\n'
'### 3.1. Necessidade pública (DL 3.365/41 art. 5º)\n'
'Casos urgentes (segurança nacional, defesa do Estado, socorro público em calamidade).\n\n'
'### 3.2. Utilidade pública (DL 3.365/41 art. 5º — rol extenso)\n'
'Inclui: construção de obras públicas, abertura de vias, criação de bens públicos, monumentos, exploração de minas, abertura de hospitais, escolas etc.\n\n'
'### 3.3. Interesse social (Lei 4.132/62)\n'
'Inclui: aproveitamento de bem improdutivo, construção de habitação popular, distribuição de propriedade rural, proteção do solo etc.\n\n'
'## 4. Procedimento (DL 3.365/41)\n\n'
'### 4.1. Fase declaratória\n\n'
'- **Decreto expropriatório** do chefe do Executivo (competente o ente federativo titular do interesse: U, E, DF, M)\n'
'- Conteúdo: declara o imóvel de utilidade pública/interesse social, identifica o bem, define a destinação\n'
'- **Efeitos:**\n'
'  - Autoridades podem **entrar no imóvel** para perícias (uso da força policial em caso de oposição)\n'
'  - Fixa o estado do bem (benfeitorias posteriores ao decreto não são indenizadas, salvo as necessárias)\n'
'  - **Prazo de caducidade do decreto:** 5 anos para utilidade pública (DL 3.365/41 art. 10) ou 2 anos para interesse social (Lei 4.132/62 art. 3º). Após esses prazos, novo decreto só pode ser feito após 1 ano de carência.\n\n'
'### 4.2. Fase executiva — pode ser:\n\n'
'**a) Administrativa (extrajudicial):** se houver acordo sobre o valor, lavra-se escritura e transfere-se a propriedade no cartório.\n\n'
'**b) Judicial:** se não houver acordo, o Poder Público propõe **ação de desapropriação**, que tem por objeto **apenas a fixação da justa indenização**. Não se discute mérito do ato expropriatório, salvo vício de competência ou desvio de finalidade (DL 3.365/41 art. 9º).\n\n'
'A ação tem rito especial. Permite-se **imissão provisória na posse**, mediante depósito prévio (art. 15 do DL), mesmo antes do trânsito em julgado.\n\n'
'## 5. Justa indenização\n\n'
'Inclui:\n'
'- **Valor real do bem** na época da avaliação\n'
'- **Juros compensatórios:** 12% ao ano sobre a diferença entre 80% do preço ofertado e o valor final (Súmula 618 STF — interpretação posterior à MP 2.183-56/01 reduziu para 6% a.a., porém o STF, na ADI 2.332, suspendeu cautelarmente a redução e manteve 12% para muitos casos)\n'
'- **Juros moratórios:** 6% ao ano após o trânsito em julgado, devidos a partir de 1º de janeiro do exercício seguinte ao precatório (Súmula Vinculante 17)\n'
'- **Honorários advocatícios:** limitados conforme o DL 3.365/41 (com redação dada pela MP 2.183-56/01, 0,5% a 5% sobre a diferença entre oferta e indenização final)\n'
'- **Correção monetária**\n'
'- **Lucros cessantes e danos emergentes** comprovados\n\n'
'## 6. Desistência da desapropriação\n\n'
'O Poder Público pode **desistir** da desapropriação até o pagamento (Súmula 13 STJ). A desistência:\n'
'- Não exige consentimento do expropriado\n'
'- Obriga a devolver o bem no estado em que se encontre\n'
'- Responsabiliza por danos comprovados\n\n'
'## 7. Retrocessão (CC art. 519)\n\n'
'É o **direito de o ex-proprietário reaver o imóvel** (ou exigir indenização) se o Estado deixar de dar ao bem a destinação prevista no decreto, **dando-lhe destinação totalmente diversa do interesse público** (tredestinação ilícita).\n\n'
'- **Tredestinação lícita:** muda-se a destinação mas mantém-se a finalidade pública (escola vira hospital). Não gera retrocessão.\n'
'- **Tredestinação ilícita:** o bem é desviado para finalidade privada ou abandonado. Gera retrocessão.\n'
'- **Adestinação:** ausência de qualquer destinação útil por longo tempo. Tese minoritária equipara à tredestinação ilícita.\n\n'
'**Natureza jurídica da retrocessão:** controvertida. STJ admite tanto reivindicação (natureza real) quanto perdas e danos (natureza pessoal) — REsp 412.634.\n\n'
'## 8. Desapropriação indireta\n\n'
'Ocorre quando o Estado se apossa do bem **sem o procedimento regular** (sem decreto, sem indenização, sem ação). O proprietário, por não poder mais reivindicar (porque já houve afetação do bem ao uso público), tem direito apenas à **indenização por perdas e danos** — ação ordinária, prescrição decenal (CC art. 1.238 c/c CC art. 205, Súmula 119 STJ — usucapião extraordinária — sentido invertido).\n\n'
'A jurisprudência atual fixou prazo prescricional de **10 anos** para a ação indenizatória (STJ, REsp 1.300.442).\n\n'
'## 9. Conclusão\n\n'
'A desapropriação é o instrumento mais drástico de intervenção na propriedade — retira-a integralmente do titular. Em concursos policiais (Delegado, Escrivão), cobra-se especialmente: (a) fundamentos constitucionais e diferenças entre desapropriação ordinária, urbanística, rural e confiscatória; (b) caducidade do decreto (5 anos/2 anos); (c) limites da discussão judicial (só valor); (d) imissão provisória; (e) retrocessão e tredestinação. Dominar essas chaves resolve a maioria das questões.\n',

  'Desapropriação é intervenção supressiva: retira propriedade mediante justa indenização. Modalidades: ordinária (CF 5º XXIV — prévia/dinheiro), urbanística (CF 182§4º III — títulos 10 anos, IPTU progressivo antes), rural (CF 184 — TDA 20 anos, exclusiva União, imunes pequena/média/produtiva), confiscatória (CF 243 — sem indenização, drogas/trabalho escravo). Procedimento DL 3.365/41: decreto (caduca 5 anos), ação só discute valor, imissão provisória com depósito. Justa indenização = valor real + juros compensatórios 12% + moratórios 6% + honorários + correção. Retrocessão = ex-proprietário reaver bem se houver tredestinação ilícita.'
);

-- =====================================================================
-- 4/8 — Servidão Administrativa
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Servidão Administrativa',
  'Servidão administrativa: direito real público sobre coisa alheia',

E'# Servidão Administrativa\n\n'
'## 1. Conceito\n\n'
'Servidão administrativa é um **direito real público** que impõe ao proprietário de um imóvel particular a obrigação de **suportar uma utilização específica** em favor do Poder Público (ou de seu concessionário/permissionário), para execução de obra ou serviço de interesse coletivo, **sem retirar a propriedade**.\n\n'
'É **modalidade restritiva** de intervenção (e não supressiva). O proprietário continua sendo dono — apenas tem de tolerar a passagem de fios, dutos, aquedutos, faixa de domínio etc.\n\n'
'## 2. Distinção da servidão civil\n\n'
'| Aspecto | Servidão civil (CC art. 1.378) | Servidão administrativa |\n'
'|---|---|---|\n'
'| Titular | Proprietário do prédio dominante | Poder Público / coletividade |\n'
'| Finalidade | Utilidade do prédio dominante (privada) | Utilidade pública |\n'
'| Existe prédio dominante? | Sim (relação real prédio-prédio) | Não necessariamente (interesse coletivo) |\n'
'| Regime | Direito privado | Direito público |\n'
'| Constituição | Acordo + registro | Acordo, lei ou sentença judicial |\n\n'
'## 3. Fundamento normativo\n\n'
'- **DL 3.365/41 art. 40:** *"O expropriante poderá constituir servidões mediante indenização na forma desta lei."*\n'
'- **CF art. 5º, XXIII, XXIV** (função social e desapropriação) por analogia\n'
'- Legislação específica (Código de Águas, Lei de concessões de energia, telecomunicações etc.)\n\n'
'## 4. Características\n\n'
'- **Caráter real:** segue o bem (não se extingue pela alienação do imóvel serviente)\n'
'- **Perpetuidade:** em regra, é permanente (enquanto subsistir a obra/serviço que a justifica)\n'
'- **Onerosidade condicionada:** só há indenização se houver **prejuízo concreto e comprovado**. A simples instituição da servidão não gera indenização automática — diferentemente da desapropriação, em que a indenização é da essência.\n'
'- **Registro no RGI:** para oposição erga omnes\n\n'
'## 5. Formas de constituição\n\n'
'### 5.1. Por acordo\n'
'Mediante decreto declaratório (similar ao da desapropriação) seguido de instrumento contratual com o proprietário. Levado a registro.\n\n'
'### 5.2. Por sentença judicial\n'
'Quando não há acordo, ajuíza-se ação adaptada ao rito do DL 3.365/41 (analogia à desapropriação). Discute-se a indenização (se houver prejuízo).\n\n'
'### 5.3. Por lei\n'
'Algumas servidões nascem diretamente da lei (ex.: servidão de aqueduto em terrenos marginais a rios federais).\n\n'
'## 6. Indenização\n\n'
'### Regra: indenização somente se houver dano efetivo\n\n'
'A servidão não enseja indenização automática. O proprietário deve **comprovar prejuízo concreto** — restrição efetiva à utilização do imóvel, depreciação patrimonial, etc.\n\n'
'Exemplo: torre de transmissão da Eletrobras em fazenda. Se a torre ocupa pequena área e o proprietário continua plantando, dificilmente há indenização significativa. Se impede uma cultura específica (lavoura mecanizada), há prejuízo e indenização.\n\n'
'### Componentes da indenização (quando devida):\n'
'- Depreciação do valor do imóvel\n'
'- Lucros cessantes\n'
'- Danos emergentes\n'
'- Eventualmente, despesas de adaptação\n\n'
'## 7. Extinção\n\n'
'A servidão administrativa extingue-se por:\n\n'
'1. **Desaparecimento do bem serviente** (ex.: terreno absorvido pela obra pública)\n'
'2. **Incorporação do bem ao patrimônio público** (a servidão sobre o próprio bem público é juridicamente impossível — confusão entre titularidades)\n'
'3. **Desafetação do interesse público** (não há mais obra/serviço que a justifique)\n'
'4. **Acordo formal** de extinção, com cancelamento do registro\n\n'
'## 8. Exemplos práticos\n\n'
'- **Faixa de domínio de rodovias:** passagem de fios, oleodutos\n'
'- **Linhas de transmissão de energia:** servidão sobre fazendas para passagem de torres da rede básica\n'
'- **Aquedutos públicos:** travessia de propriedades para abastecimento\n'
'- **Telecomunicações:** instalação de torres e cabos\n'
'- **Passagem de gasodutos** (ex.: GASBOL — gás Bolívia-Brasil)\n'
'- **Servidão de placas indicativas em fachadas** (nomes de rua), embora controvertida — alguns autores classificam como limitação administrativa\n\n'
'## 9. Servidão x Desapropriação parcial\n\n'
'A diferença é qualitativa, não quantitativa:\n'
'- **Desapropriação parcial:** o Poder Público adquire a propriedade de uma fração do imóvel\n'
'- **Servidão:** o Poder Público adquire apenas um **direito de uso específico**, e a propriedade permanece com o particular\n\n'
'Se a "servidão" tornar **impraticável o uso normal do imóvel pelo proprietário**, ela se converte em desapropriação indireta para fins de indenização (jurisprudência consolidada — REsp 781.314, REsp 1.230.687).\n\n'
'## 10. Quadro-resumo\n\n'
'| Característica | Servidão Administrativa |\n'
'|---|---|\n'
'| Natureza | Direito real público sobre coisa alheia |\n'
'| Propriedade | Permanece com o particular |\n'
'| Indenização | Só se houver prejuízo |\n'
'| Constituição | Acordo, sentença ou lei |\n'
'| Registro | Sim, no RGI |\n'
'| Caráter | Permanente, em regra |\n'
'| Modalidade | Restritiva (não supressiva) |\n\n'
'## 11. Conclusão\n\n'
'A servidão administrativa é instrumento essencial para **viabilizar infraestrutura coletiva sem o custo de uma desapropriação total**. Em concursos, cobra-se especialmente: (a) distinção com a desapropriação (mantém propriedade); (b) distinção com a servidão civil (interesse público, sem prédio dominante); (c) regra da indenização (só com prejuízo); (d) caráter perpétuo; (e) hipótese em que se converte em desapropriação indireta. Os exemplos clássicos (linhas de transmissão, faixa de domínio) devem ser memorizados.\n',

  'Servidão administrativa é direito real público sobre coisa alheia que obriga proprietário a suportar uso específico em favor do interesse público, SEM perder a propriedade. Modalidade restritiva (≠ desapropriação que é supressiva). Distingue-se da servidão civil pelo interesse (público x privado) e pela inexistência de prédio dominante. Constitui-se por acordo, sentença ou lei. Indenização APENAS se houver prejuízo concreto comprovado. Caráter perpétuo. Exemplos: linhas de transmissão, faixa de domínio rodoviário, gasoduto. Se inviabiliza uso normal do imóvel, converte-se em desapropriação indireta.'
);

-- =====================================================================
-- 5/8 — Tombamento
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Tombamento',
  'Tombamento: proteção do patrimônio cultural (DL 25/37 + CF 216)',

E'# Tombamento\n\n'
'## 1. Conceito\n\n'
'Tombamento é a **modalidade restritiva de intervenção na propriedade** pela qual o Poder Público, mediante procedimento administrativo (ou raramente legislativo/judicial), reconhece a relevância **histórica, artística, arqueológica, paisagística, científica, etnográfica, bibliográfica ou cultural** de um bem e impõe sua **preservação**, sujeitando o proprietário a deveres específicos.\n\n'
'Não transfere a propriedade — o bem continua com o titular —, mas restringe substancialmente o **jus abutendi** (direito de modificar/destruir).\n\n'
'## 2. Fundamentos normativos\n\n'
'- **CF art. 23, III:** competência comum (U, E, DF, M) para proteger documentos, obras e bens de valor histórico, artístico e cultural\n'
'- **CF art. 24, VII:** competência concorrente para legislar\n'
'- **CF art. 30, IX:** competência municipal para proteger patrimônio local\n'
'- **CF art. 216, § 1º:** *"O Poder Público, com a colaboração da comunidade, promoverá e protegerá o patrimônio cultural brasileiro, por meio de inventários, registros, vigilância, tombamento e desapropriação..."*\n'
'- **DL 25/37 (Lei do Tombamento):** norma federal principal, mas serve de base para todos os entes\n'
'- **DL 3.866/41:** regula o cancelamento\n'
'- **Lei 11.483/07:** redefine atribuições do IPHAN no patrimônio ferroviário\n'
'- **Decreto 3.551/00:** registro de bens culturais imateriais\n\n'
'## 3. Objeto\n\n'
'**Podem ser tombados:**\n'
'- Bens **móveis** (obras de arte, livros raros, arquivos)\n'
'- Bens **imóveis** (igrejas, palacetes, casarões, prédios, ruínas, conjuntos arquitetônicos)\n'
'- Bens **integrantes do patrimônio natural** (paisagens, sítios naturais com valor cultural — não confundir com unidades de conservação ambiental)\n'
'- Bens **públicos** e **privados**, **nacionais** e **estrangeiros** (após processo, conforme convenções internacionais)\n\n'
'## 4. Classificações\n\n'
'### 4.1. Quanto à manifestação de vontade do proprietário\n\n'
'**a) Voluntário:** o próprio proprietário requer o tombamento.\n\n'
'**b) Compulsório:** instaurado pela Administração de ofício, com possibilidade de contestação pelo proprietário (DL 25/37 art. 9º).\n\n'
'### 4.2. Quanto à eficácia temporal\n\n'
'**a) Provisório:** durante o procedimento, após notificação. Já produz efeitos restritivos.\n\n'
'**b) Definitivo:** após inscrição em um dos quatro **Livros do Tombo** (DL 25/37 art. 4º):\n'
'  - I — Livro do Tombo Arqueológico, Etnográfico e Paisagístico\n'
'  - II — Livro do Tombo Histórico\n'
'  - III — Livro do Tombo das Belas-Artes\n'
'  - IV — Livro do Tombo das Artes Aplicadas\n\n'
'### 4.3. Quanto à abrangência\n\n'
'**a) Individual:** bem específico (uma casa, uma estátua).\n\n'
'**b) Geral:** conjunto de bens (centro histórico de Ouro Preto, Olinda).\n\n'
'### 4.4. Quanto ao ente federativo\n\n'
'**a) Federal:** IPHAN/União\n'
'**b) Estadual:** órgãos estaduais (ex.: CONDEPHAAT em SP)\n'
'**c) Municipal:** órgãos municipais (Conselho Municipal de Patrimônio)\n\n'
'O tombamento pode ser **concorrente** — vários entes podem tombar o mesmo bem em níveis diferentes (federal e municipal).\n\n'
'## 5. Procedimento (DL 25/37)\n\n'
'### 5.1. Tombamento compulsório de bem privado\n\n'
'1. **Iniciativa:** órgão competente identifica o bem\n'
'2. **Notificação** do proprietário\n'
'3. **Prazo de 15 dias** para anuência ou impugnação\n'
'4. **Impugnação:** órgão técnico decide; recurso ao Conselho Consultivo\n'
'5. **Inscrição no Livro do Tombo:** tombamento definitivo\n'
'6. **Averbação no RGI** (para imóveis): efeito erga omnes\n\n'
'### 5.2. Bem público\n\n'
'Para tombar bem público de outro ente federativo, basta notificação à autoridade. Não há ação contenciosa — o ato é entendido como cooperação federativa.\n\n'
'## 6. Deveres do proprietário\n\n'
'Uma vez tombado o bem, o proprietário fica sujeito a:\n\n'
'- **Conservar o bem** em boas condições. Se não tem recursos, deve comunicar à autoridade, que decidirá entre desapropriar ou subsidiar a conservação (DL 25/37 art. 19)\n'
'- **Não destruir, demolir ou mutilar** o bem (crime — CP art. 165 e Lei 9.605/98)\n'
'- **Não modificar, restaurar ou reparar** sem prévia autorização do órgão tombador\n'
'- **Não retirar o bem do país** (móveis) sem autorização e por prazo determinado\n'
'- **Comunicar furto, roubo ou extravio** em 5 dias\n'
'- **Direito de preferência:** se o proprietário pretender vender, deve comunicar ao ente federativo tombador, que tem prazo de 30 dias para exercer a preferência (Art. 22 do DL 25/37 — STF declarou parcialmente inconstitucional a forma processual, ADI 1.247, mas o direito de preferência subsiste)\n'
'- **Restrição na vizinhança:** imóveis vizinhos não podem ter construção que prejudique a visibilidade do bem tombado, nem afixar cartazes/anúncios (DL 25/37 art. 18)\n\n'
'## 7. Indenização\n\n'
'### Regra: tombamento não gera indenização automática\n\n'
'A restrição é genérica e não retira o uso normal. Como em outras restrições de polícia administrativa, **só há indenização se o tombamento esvaziar economicamente o bem** (ex.: imóvel comercial que, tombado, não pode mais ser usado para qualquer atividade rentável).\n\n'
'A jurisprudência admite indenização em casos excepcionais (REsp 220.983).\n\n'
'## 8. Efeito tributário\n\n'
'A maioria dos Municípios concede **isenção total ou parcial de IPTU** sobre imóveis tombados, como compensação pela restrição. Não é regra constitucional — depende de lei municipal.\n\n'
'## 9. Cancelamento do tombamento (destombamento)\n\n'
'Possível, embora excepcional, quando:\n\n'
'- **Desaparecimento do valor cultural** do bem\n'
'- **Erro de inscrição** original\n'
'- **Razões de interesse público superior** (caso raro)\n\n'
'O ato é discricionário do ente tombador e segue procedimento administrativo similar.\n\n'
'## 10. Distinção: tombamento x registro (patrimônio imaterial)\n\n'
'O **tombamento** protege bens **materiais** (móveis e imóveis).\n\n'
'O **registro** (Decreto 3.551/00) protege bens **imateriais** — saberes, expressões, modos de fazer, lugares, celebrações (samba, frevo, ofício das paneleiras de Goiabeiras, etc.).\n\n'
'## 11. Tópicos de prova\n\n'
'**Pegadinhas frequentes em concursos policiais:**\n'
'- "Tombamento transfere a propriedade ao Poder Público" ❌ — é restritivo\n'
'- "Tombamento gera indenização automática" ❌ — só em casos excepcionais\n'
'- "Patrimônio imaterial é objeto de tombamento" ❌ — é objeto de **registro**\n'
'- "Apenas a União pode tombar" ❌ — competência comum (CF 23, III)\n'
'- "Vizinho de bem tombado pode construir o que quiser" ❌ — há restrição de visibilidade\n'
'- "Em caso de venda, proprietário não precisa avisar o ente tombador" ❌ — há direito de preferência\n\n'
'## 12. Conclusão\n\n'
'O tombamento é o principal instrumento de proteção do patrimônio cultural brasileiro. Conhecer o DL 25/37, os quatro Livros do Tombo, as classificações (voluntário/compulsório, provisório/definitivo, individual/geral) e os deveres do proprietário (incluindo a restrição de vizinhança e o direito de preferência) é essencial para qualquer prova de Direito Administrativo nas carreiras policiais.\n',

  'Tombamento (DL 25/37 + CF 216) é intervenção restritiva que protege bens materiais de valor histórico/artístico/cultural sem transferir propriedade. Pode ser voluntário ou compulsório; provisório (após notificação) ou definitivo (inscrição em um dos 4 Livros do Tombo); individual ou geral. Competência comum (U/E/DF/M). Deveres do proprietário: conservar, não modificar sem autorização, direito de preferência ao ente tombador em caso de venda, restrição de visibilidade aos vizinhos. Indenização só excepcional (esvaziamento econômico). Bem imaterial = registro (Dec 3.551/00), não tombamento.'
);

-- =====================================================================
-- 6/8 — Requisição
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Requisição',
  'Requisição administrativa: uso de bens/serviços particulares em situação de perigo público iminente',

E'# Requisição Administrativa\n\n'
'## 1. Conceito\n\n'
'Requisição administrativa é a **utilização compulsória, pelo Poder Público, de bens (móveis, imóveis, fungíveis ou infungíveis) ou serviços particulares**, em situação de **perigo público iminente**, mediante indenização **ulterior** (posterior), se houver dano.\n\n'
'É **modalidade restritiva temporária** de intervenção: o Poder Público usa o bem por tempo determinado, devolvendo-o ao final (no caso dos bens infungíveis), ou consumindo-o (no caso dos fungíveis), com pagamento da indenização cabível.\n\n'
'## 2. Fundamentos normativos\n\n'
'### 2.1. Constituição Federal\n\n'
'- **Art. 5º, XXV:** *"No caso de iminente perigo público, a autoridade competente poderá usar de propriedade particular, assegurada ao proprietário indenização ulterior, se houver dano."*\n'
'- **Art. 22, III:** competência privativa da União para legislar sobre requisições civis e militares em caso de iminente perigo e em tempo de guerra\n'
'- **Art. 139, VII:** durante o estado de sítio, possibilidade de requisição\n'
'- **Art. 136, § 1º, II:** durante o estado de defesa, possibilidade de ocupação e uso temporário de bens e serviços públicos\n\n'
'### 2.2. Legislação infraconstitucional\n\n'
'- **DL 4.812/42:** disciplina a requisição militar e civil em tempo de guerra\n'
'- **Lei 8.080/90 (SUS) art. 15, XIII:** prevê requisição de bens e serviços essenciais ao SUS em situações de calamidade pública\n'
'- **Lei 13.979/20** (revogada em 2022, mas relevante historicamente): autorizou requisições no enfrentamento da COVID-19\n\n'
'## 3. Pressupostos\n\n'
'Para a validade da requisição, são pressupostos cumulativos:\n\n'
'1. **Perigo público iminente:** ameaça concreta, atual ou próxima, à coletividade (calamidade, epidemia, comoção, guerra, incêndio, enchente)\n'
'2. **Necessidade do bem/serviço** para enfrentar o perigo\n'
'3. **Proporcionalidade:** a medida deve ser adequada e necessária; se houver alternativa menos gravosa, deve-se preferi-la\n'
'4. **Ato administrativo competente:** ordem da autoridade designada por lei (não é qualquer agente público)\n\n'
'## 4. Objeto\n\n'
'A requisição pode recair sobre:\n\n'
'- **Bens móveis fungíveis:** alimentos, combustíveis, medicamentos, materiais sanitários (consumo durante o uso, indenização sobre o valor)\n'
'- **Bens móveis infungíveis:** veículos, equipamentos, máquinas (devolução ao final)\n'
'- **Bens imóveis:** prédios, terrenos, hospitais particulares para uso provisório como pontos de socorro\n'
'- **Serviços particulares:** mão de obra especializada (médicos, técnicos) em situações de calamidade\n\n'
'## 5. Características\n\n'
'- **Autoexecutoriedade:** independe de autorização judicial prévia\n'
'- **Caráter temporário:** dura enquanto perdurar o perigo\n'
'- **Indenização ulterior, se houver dano:** diferentemente da desapropriação, a indenização não é prévia, e não é automática — só haverá pagamento se for comprovado o dano (apuração posterior, em ação própria ou administrativamente)\n'
'- **Não há transferência de propriedade** (bens infungíveis) — o bem volta ao titular\n'
'- **Coercitividade:** o particular não pode se opor sem incorrer em desobediência\n\n'
'## 6. Espécies\n\n'
'### 6.1. Quanto ao contexto\n\n'
'**a) Requisição civil:** em tempo de paz, motivada por calamidade, epidemia, comoção etc.\n\n'
'**b) Requisição militar:** em tempo de guerra (estado de guerra declarado ou agressão estrangeira) — também aplicável em estados excepcionais (sítio, defesa).\n\n'
'### 6.2. Quanto ao objeto\n\n'
'**a) De bens** (móveis ou imóveis)\n'
'**b) De serviços**\n\n'
'## 7. Distinção com institutos correlatos\n\n'
'| Aspecto | Requisição | Desapropriação | Servidão | Ocupação Temporária |\n'
'|---|---|---|---|---|\n'
'| Transfere propriedade? | Não (salvo bens fungíveis consumidos) | Sim | Não | Não |\n'
'| Caráter | Temporário | Permanente | Permanente | Temporário |\n'
'| Pressuposto | Perigo iminente | Utilidade/necessidade pública ou interesse social | Obra ou serviço público | Apoio a obra/serviço |\n'
'| Indenização | Ulterior, se houver dano | Prévia, justa, em dinheiro | Só se houver prejuízo | Só se houver prejuízo |\n\n'
'A diferença essencial é o **pressuposto de urgência** (perigo iminente), que justifica a autoexecutoriedade e a indenização ulterior.\n\n'
'## 8. Exemplos históricos e atuais\n\n'
'- **COVID-19:** requisição de leitos particulares, EPIs, máscaras, ventiladores em diversos estados — alguns judicializados, em geral confirmados pelo STF (ACO 3.464; ADI 6.341)\n'
'- **Calamidades climáticas:** requisição de embarcações, helicópteros e abrigos em desastres\n'
'- **Manifestações de 1964 e revoltas urbanas:** requisição de meios de transporte\n'
'- **Incêndio florestal:** requisição de água potável e equipamentos\n\n'
'## 9. Limites e controle\n\n'
'A requisição, mesmo autoexecutória, sujeita-se a:\n\n'
'- **Controle judicial:** ação para anulação se ausentes os pressupostos (não houve perigo iminente, ou houve abuso). Particular pode também buscar indenização\n'
'- **Princípio da proporcionalidade:** se medidas menos invasivas eram possíveis, a requisição é abusiva\n'
'- **Reserva de competência:** a autoridade requisitante deve estar prevista em lei (governador, prefeito, ministro, dirigente do SUS etc.)\n'
'- **Limites temporais:** vencido o perigo, a requisição cessa automaticamente\n\n'
'## 10. Aspecto penal\n\n'
'A recusa do particular em entregar o bem ou prestar o serviço requisitado, sem justa causa, pode caracterizar **desobediência** (CP art. 330) ou crime específico em legislação especial. Mas o particular sempre pode discutir judicialmente a legalidade da requisição.\n\n'
'## 11. Tópicos de prova\n\n'
'**Pegadinhas frequentes:**\n'
'- "Requisição exige indenização prévia" ❌ — é **ulterior**, e só **se houver dano**\n'
'- "Requisição transfere propriedade" ❌ — em regra, é uso temporário; só bens fungíveis consumidos\n'
'- "Requisição pode ser feita sem autorização judicial" ✅ — é autoexecutória\n'
'- "Particular pode se opor à requisição na hora" ❌ — só pode buscar reparação judicial depois\n'
'- "Requisição militar é vedada em tempos de paz" ❌ — Constituição admite em situações de iminente perigo (não exige guerra)\n'
'- "A pandemia justificou requisição de leitos privados" ✅ — chancelado pelo STF\n\n'
'## 12. Conclusão\n\n'
'A requisição administrativa é o instrumento mais ágil de intervenção na propriedade — dispensa procedimento prévio, prazos formais e indenização antecipada. Em compensação, depende do pressuposto excepcional (perigo iminente) e da temporariedade. Para concursos, dominar a distinção com desapropriação (caráter temporário x permanente), servidão (perigo iminente x interesse genérico) e ocupação temporária (perigo iminente x apoio a obra) é a chave.\n',

  'Requisição administrativa (CF 5º XXV) é uso compulsório temporário de bens/serviços particulares em IMINENTE PERIGO PÚBLICO, com indenização ULTERIOR e APENAS SE HOUVER DANO. Pode ser civil (paz) ou militar (guerra/excepcionais). Recai sobre móveis fungíveis (consumo), infungíveis (devolução), imóveis e serviços. Autoexecutória, dispensa autorização judicial. Distingue-se de: desapropriação (permanente, prévia), servidão (permanente, sem urgência), ocupação temporária (apoio a obra). Casos: COVID-19, calamidades, guerra. Recusa = desobediência (CP 330).'
);

-- =====================================================================
-- 7/8 — Ocupação Temporária
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Ocupação Temporária',
  'Ocupação temporária: uso provisório de imóvel particular para apoio a obra ou serviço público',

E'# Ocupação Temporária\n\n'
'## 1. Conceito\n\n'
'Ocupação temporária é a **modalidade restritiva e transitória** de intervenção do Estado na propriedade pela qual o Poder Público utiliza, **por tempo determinado**, imóvel particular **não edificado**, próximo à obra pública, para servir de apoio à execução desta — como depósito de materiais, alojamento de trabalhadores, canteiro de obras, vias de acesso temporárias etc.\n\n'
'Não transfere a propriedade. Encerrada a obra, o imóvel é devolvido ao titular, com indenização pelos danos eventualmente causados.\n\n'
'## 2. Fundamento normativo\n\n'
'**DL 3.365/41 art. 36** (Lei de Desapropriações): *"É permitida a ocupação temporária, que será indenizada, afinal, por ação própria, de terrenos não edificados, vizinhos às obras e necessários à sua realização."*\n\n'
'Existem outras hipóteses específicas em leis setoriais (mineração, energia, telecomunicações etc.) e na **Lei 6.766/79** (parcelamento do solo urbano).\n\n'
'## 3. Distinção entre ocupação remunerada e gratuita\n\n'
'### 3.1. Ocupação temporária remunerada (clássica)\n\n'
'- Vinculada a obra pública\n'
'- Recai apenas sobre **terreno não edificado**\n'
'- Há indenização pelos prejuízos comprovados\n'
'- Não tem caráter urgente nem excepcional\n\n'
'### 3.2. Ocupação temporária gratuita\n\n'
'Prevista em legislações específicas — por exemplo, **Lei 8.745/93 art. 5º** (uso de prédios para eleições — pelo TSE/TRE/cartórios eleitorais), uso de escolas particulares para juntas eleitorais, mesas receptoras etc. Geralmente sem indenização porque não há prejuízo material.\n\n'
'A jurisprudência também reconheceu legítima a ocupação não onerosa para o serviço eleitoral.\n\n'
'## 4. Pressupostos\n\n'
'Para a ocupação temporária remunerada do DL 3.365/41:\n\n'
'1. **Existência de obra pública** (não basta serviço genérico)\n'
'2. **Vizinhança do imóvel à obra** (utilidade logística)\n'
'3. **Imóvel não edificado** (terreno; construções recebem outro tratamento)\n'
'4. **Necessidade do uso** para a execução da obra\n'
'5. **Ato administrativo formal** (decreto de ocupação ou ato equivalente)\n\n'
'## 5. Procedimento\n\n'
'- **Decreto ou ato administrativo:** fundamentado, identificando o imóvel e a obra\n'
'- **Notificação do proprietário**\n'
'- **Eventual avaliação** dos danos previsíveis (canteiro de obras pode degradar o terreno)\n'
'- **Possibilidade de prévio depósito** se houver expectativa de dano\n'
'- **Imissão no uso** — em geral pacífica; em caso de oposição, recorre-se à autotutela ou ao judiciário\n'
'- **Devolução ao fim da obra**, com pagamento da indenização cabível\n\n'
'## 6. Indenização\n\n'
'Diferentemente da desapropriação, a indenização **não é automática**: depende de **comprovação de prejuízo**. O dano típico é:\n\n'
'- Desgaste do terreno\n'
'- Impedimento de uso normal (ex.: lavoura interrompida)\n'
'- Necessidade de recuperação após devolução\n\n'
'O fundamento doutrinário é a **responsabilidade objetiva por dano** decorrente da intervenção estatal (CF art. 37, § 6º).\n\n'
'## 7. Características\n\n'
'- **Transitoriedade:** essência do instituto — dura o tempo da obra\n'
'- **Restritividade:** não suprime a propriedade\n'
'- **Onerosidade condicionada:** indenização só com dano comprovado\n'
'- **Especificidade do objeto:** terreno não edificado (na modalidade clássica)\n'
'- **Vinculação à obra pública**\n\n'
'## 8. Distinção entre os institutos\n\n'
'| Aspecto | Ocupação Temporária | Servidão Administrativa | Requisição | Desapropriação |\n'
'|---|---|---|---|---|\n'
'| Caráter | Temporário | Permanente | Temporário | Definitivo |\n'
'| Transfere propriedade? | Não | Não | Não (regra) | Sim |\n'
'| Pressuposto | Obra pública | Obra ou serviço público | Perigo iminente | Utilidade/necessidade/interesse social |\n'
'| Indenização | Posterior, se houver dano | Idem | Posterior, se houver dano | Prévia e justa |\n'
'| Objeto típico | Terreno não edificado vizinho | Direito real sobre imóvel | Móvel, imóvel, serviço | Imóvel ou móvel |\n\n'
'**Atenção:** a ocupação temporária e a servidão se distinguem essencialmente pela **transitoriedade** (a ocupação acaba; a servidão é perpétua). A ocupação e a requisição se distinguem pelo **pressuposto** (a requisição exige perigo iminente; a ocupação, apoio a obra).\n\n'
'## 9. Exemplos práticos\n\n'
'- Canteiro de obras de viaduto urbano em terreno baldio vizinho\n'
'- Depósito de materiais em fazenda lindeira a rodovia em construção\n'
'- Via de acesso provisória atravessando propriedade para chegar à obra\n'
'- Uso de imóvel particular como sala de eleição (gratuita)\n'
'- Pesquisa arqueológica ou mineral em terreno particular (legislação específica)\n\n'
'## 10. Controle e limites\n\n'
'- **Judicial:** ação para questionar abusos (descaracterização da finalidade pública, ausência de obra, duração excessiva)\n'
'- **Administrativo:** recurso hierárquico\n'
'- **Limite temporal:** se a "ocupação temporária" se prolongar indefinidamente ou inviabilizar permanentemente o uso, **converte-se em desapropriação indireta**, com nova indenização integral\n'
'- **Princípios:** legalidade, proporcionalidade, motivação\n\n'
'## 11. Tópicos de prova\n\n'
'**Pegadinhas frequentes:**\n'
'- "Ocupação temporária transfere propriedade" ❌ — apenas uso\n'
'- "Ocupação temporária pode ser instituída para serviço genérico" ❌ — só para **obra pública** (modalidade clássica)\n'
'- "Indenização é prévia" ❌ — é **posterior**, se houver dano\n'
'- "Recai sobre imóvel edificado" ❌ — em regra, **terreno não edificado**\n'
'- "Pode ser gratuita" ✅ — modalidades específicas (eleitoral)\n'
'- "Permanente" ❌ — é **temporária**\n\n'
'## 12. Conclusão\n\n'
'A ocupação temporária é o instrumento de menor impacto entre as intervenções na propriedade — pressupõe apenas obra pública, usa o terreno por tempo determinado, devolve ao final, e só indeniza se houver dano. Em concursos, é cobrada principalmente em comparação com os outros institutos (requisição, servidão, desapropriação): dominar a tabela comparativa do tópico 8 resolve a grande maioria das questões objetivas.\n',

  'Ocupação temporária (DL 3.365/41 art. 36) é uso transitório de terreno particular NÃO edificado, vizinho a obra pública, para apoio à execução desta (canteiro, depósito, via de acesso). Indenização POSTERIOR e APENAS SE HOUVER DANO. Devolução ao fim da obra. Modalidade gratuita: imóvel para eleição (TSE/TRE). Distingue-se: temporária (≠ servidão permanente); apoio a obra (≠ requisição que exige perigo iminente); não-supressiva (≠ desapropriação). Se prolongada indefinidamente, vira desapropriação indireta.'
);

-- =====================================================================
-- 8/8 — Limitação Administrativa
-- =====================================================================
SELECT upsert_material(
  'direito-administrativo',
  'Limitação Administrativa',
  'Limitação administrativa: restrição geral de polícia que condiciona o exercício da propriedade',

E'# Limitação Administrativa\n\n'
'## 1. Conceito\n\n'
'Limitação administrativa é a **modalidade mais comum e menos invasiva de intervenção do Estado na propriedade**. Consiste em **imposições gerais, abstratas e gratuitas**, dirigidas a propriedades indeterminadas, decorrentes do poder de polícia, com a finalidade de condicionar o exercício do direito de propriedade ao bem-estar social.\n\n'
'Não retira a propriedade. Não transfere uso. Apenas estabelece **deveres positivos (fazer) ou negativos (não fazer)** ao proprietário. Em regra, **não há indenização**, porque o ônus é genérico e atinge a todos.\n\n'
'## 2. Fundamentos normativos\n\n'
'- **CF art. 5º, XXII e XXIII:** garantia da propriedade condicionada à função social\n'
'- **CF art. 170, II e III:** ordem econômica fundada na propriedade privada e na função social\n'
'- **CF art. 182:** política urbana — função social da propriedade urbana\n'
'- **CF art. 186:** função social da propriedade rural\n'
'- **Código Civil art. 1.228, § 1º:** *"O direito de propriedade deve ser exercido em consonância com as suas finalidades econômicas e sociais..."*\n'
'- Leis específicas: Código Florestal (Lei 12.651/12), Estatuto da Cidade (Lei 10.257/01), legislação urbanística municipal, código de posturas, código sanitário etc.\n\n'
'## 3. Características essenciais\n\n'
'### 3.1. Generalidade\n\n'
'A limitação atinge **propriedades indeterminadas** — todos os imóveis em uma região, todos os terrenos urbanos, todas as propriedades rurais que se encaixem em certo perfil. Não há ato individual contra um proprietário específico.\n\n'
'### 3.2. Caráter unilateral\n\n'
'É imposta pelo Estado, sem necessidade de aceitação ou compensação.\n\n'
'### 3.3. Gratuidade\n\n'
'Em regra, **não há indenização**. O fundamento é que a limitação atua sobre o **caráter genérico** da propriedade e atinge a todos igualmente. Exceção: **se a limitação for tão drástica que esvazie o conteúdo econômico** específico de um bem, configura-se direito à indenização (jurisprudência consolidada — REsp 922.786, REsp 1.165.346).\n\n'
'### 3.4. Não-supressão da propriedade\n\n'
'O proprietário continua com o **jus utendi, fruendi e abutendi** — apenas condicionados.\n\n'
'### 3.5. Decorre do poder de polícia administrativa\n\n'
'A limitação é manifestação típica do **poder de polícia** (CTN art. 78). É instrumento de proteção do interesse público sobre o uso e o gozo da propriedade.\n\n'
'## 4. Espécies e exemplos\n\n'
'### 4.1. Limitações de natureza urbanística\n\n'
'- **Recuos obrigatórios** de construção (afastamentos frontais, laterais, fundos)\n'
'- **Gabarito máximo** de altura\n'
'- **Coeficiente de aproveitamento** máximo do terreno\n'
'- **Taxa de ocupação** e **taxa de permeabilidade**\n'
'- **Zoneamento:** áreas residenciais, comerciais, industriais\n'
'- **Áreas non aedificandi** (perto de cursos d''água, dutos, ferrovias, rodovias)\n'
'- **Obrigação de cercar terreno** baldio em área urbana\n'
'- **Obrigação de manter calçada** em condições\n\n'
'### 4.2. Limitações de natureza ambiental\n\n'
'- **Áreas de preservação permanente (APP)** — Código Florestal\n'
'- **Reserva legal** em propriedades rurais (% variável por bioma)\n'
'- Proibição de retirada de vegetação nativa em certas áreas\n'
'- Restrições no uso de agrotóxicos\n'
'- Cota de exploração florestal\n\n'
'### 4.3. Limitações sanitárias\n\n'
'- Obrigação de vacinação animal\n'
'- Combate à dengue (acesso de agentes a quintais para vistoria)\n'
'- Regras de armazenamento de alimentos\n\n'
'### 4.4. Limitações de segurança\n\n'
'- Regras de construção (PPCI — Plano de Prevenção e Combate a Incêndio)\n'
'- Distância mínima de paióis de explosivos\n'
'- Restrição de altura próximo a aeroportos (Anac)\n\n'
'### 4.5. Limitações relativas ao patrimônio cultural (vizinhança)\n\n'
'- Restrição de visibilidade em imóveis vizinhos a bens tombados (DL 25/37 art. 18)\n\n'
'## 5. Distinção dos demais institutos de intervenção\n\n'
'| Aspecto | Limitação | Servidão | Desapropriação | Requisição | Ocupação | Tombamento |\n'
'|---|---|---|---|---|---|---|\n'
'| Caráter | Geral, abstrato | Específico, real | Específico | Específico, urgente | Específico, vinculado a obra | Específico |\n'
'| Atingimento | Coletivo | Imóvel individual | Imóvel individual | Bem individual | Imóvel individual | Bem cultural individual |\n'
'| Indenização | Não (em regra) | Só com prejuízo | Prévia e justa | Posterior se houver dano | Posterior se houver dano | Excepcional |\n'
'| Modalidade | Restritiva | Restritiva | Supressiva | Restritiva | Restritiva | Restritiva |\n'
'| Permanente? | Sim | Sim | Sim (suprime) | Não | Não | Sim |\n\n'
'**A grande chave distintiva da limitação é a generalidade.** As demais modalidades têm objeto específico e identificável; a limitação atinge propriedades indeterminadas em razão de sua localização ou natureza.\n\n'
'## 6. Indenização excepcional\n\n'
'Embora a regra seja a gratuidade, a jurisprudência reconhece direito à indenização quando:\n\n'
'1. **A limitação esvazia substancialmente o conteúdo econômico** do bem específico (ex.: criação de parque ambiental que torna a fazenda totalmente improdutiva, embora o ato seja "geral")\n'
'2. **A limitação atinge especialmente um imóvel determinado**, descaracterizando o caráter geral (configura desapropriação indireta)\n'
'3. **Há sucessão de atos restritivos** que culminam em inviabilização\n\n'
'O STJ tem precedentes consolidados nesse sentido: REsp 1.343.741, REsp 922.786.\n\n'
'## 7. Distinção crucial: limitação x servidão\n\n'
'Essa é a comparação mais cobrada em provas:\n\n'
'| Aspecto | Limitação | Servidão |\n'
'|---|---|---|\n'
'| Generalidade | Geral, abstrata | Específica, concreta |\n'
'| Natureza | Obrigação (faz/não faz) | Direito real |\n'
'| Beneficiário | Coletividade | Poder Público (ou obra/serviço determinado) |\n'
'| Registro? | Não há (não há instituição individual) | Sim (RGI) |\n'
'| Indenização | Em regra, não | Se houver prejuízo |\n\n'
'**Exemplo prático:** lei municipal proíbe construir prédio com mais de 4 andares na orla = **limitação**. Decreto institui faixa de torres de transmissão sobre fazenda específica do Sr. João = **servidão**.\n\n'
'## 8. Controle judicial\n\n'
'A limitação está sujeita a controle judicial quanto a:\n\n'
'- **Legalidade:** está prevista em lei?\n'
'- **Razoabilidade e proporcionalidade:** é meio adequado, necessário e proporcional?\n'
'- **Não-confiscatoriedade:** não esvazia o conteúdo econômico essencial?\n'
'- **Isonomia:** atinge igualmente os que estão em situação igual?\n\n'
'## 9. Tópicos de prova\n\n'
'**Pegadinhas frequentes:**\n'
'- "Limitação administrativa gera indenização sempre" ❌ — em regra, **não gera**\n'
'- "Limitação administrativa é direito real" ❌ — é **obrigação** (dever de fazer ou não fazer); servidão é que é direito real\n'
'- "Limitação atinge imóvel específico" ❌ — é **geral**\n'
'- "Limitação suprime a propriedade" ❌ — é **restritiva**\n'
'- "Recuo obrigatório de construção é exemplo de servidão" ❌ — é **limitação**\n'
'- "APP é desapropriação" ❌ — é **limitação ambiental** (com exceções jurisprudenciais para casos extremos)\n\n'
'## 10. Conclusão\n\n'
'A limitação administrativa é a modalidade de intervenção mais difusa e cotidiana — qualquer cidadão é tocado por ela ao construir uma casa, manter um terreno baldio ou cuidar de sua propriedade rural. Para concursos policiais, dominar a **regra da generalidade** e a **distinção com servidão** é determinante. Lembrar também que a indenização é exceção, mas existe quando o ônus particularizado descaracteriza o caráter genérico do instituto.\n',

  'Limitação administrativa é a modalidade mais comum e menos invasiva de intervenção na propriedade. Características: geral, abstrata, gratuita, decorre do poder de polícia, impõe obrigações de fazer ou não fazer (não é direito real). Exemplos: recuos, gabarito, zoneamento, APP, reserva legal, vacinação, normas sanitárias. Em regra NÃO gera indenização (atinge a todos); exceção quando esvazia conteúdo econômico de bem específico (vira desapropriação indireta). Distingue-se da servidão pela GENERALIDADE (limitação) x especificidade (servidão).'
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

-- =====================================================================
-- FIM BATCH 6 — 8 materiais granulares
-- Próximo: Batch 7 (Princípios + Improbidade detalhada)
-- =====================================================================
