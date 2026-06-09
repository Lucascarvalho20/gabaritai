-- =====================================================================
-- BATCH 1 — Direitos Humanos Granular
-- =====================================================================
-- 8 materiais (1500-2000 palavras cada), 1 por tópico específico.
-- Idempotente: pode rodar várias vezes; preserva status REVIEWED/PUBLISHED.
-- Subject slug: direitos-humanos
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
-- 1/8 — Conceito, fundamentos e características dos Direitos Humanos
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Conceito, fundamentos e características dos Direitos Humanos',
  'Direitos Humanos: Conceito, Fundamentos e Características',
  E'# Direitos Humanos: Conceito, Fundamentos e Características

## 1. Introdução

O estudo dos Direitos Humanos é obrigatório nos editais dos principais concursos policiais brasileiros (PF, PRF, PCDF, PMDF, PMGO). As bancas CEBRASPE, FGV e VUNESP cobram tanto a fundamentação teórica quanto os tratados internacionais e a legislação brasileira. Para o policial, os Direitos Humanos não são uma abstração acadêmica: são o marco normativo que regula o uso da força, as abordagens, as prisões e toda a interação entre o Estado e o cidadão.

---

## 2. Conceito de Direitos Humanos

### 2.1. Definição
Direitos Humanos são os direitos fundamentais inerentes a toda pessoa humana, independentemente de raça, sexo, nacionalidade, etnia, língua, religião ou qualquer outra condição. Eles incluem o direito à vida, à liberdade, à igualdade, à segurança, à educação, ao trabalho e à participação política.

### 2.2. Fundamentos Filosóficos

| Corrente | Fundamento | Defensores |
|---|---|---|
| **Jusnaturalismo** | Direitos derivam da natureza humana, são anteriores ao Estado | John Locke, Hugo Grócio |
| **Positivismo Jurídico** | Direitos existem porque foram positivados (escritos em lei/tratados) | Hans Kelsen |
| **Teoria Crítica** | Direitos são conquistas históricas resultantes de lutas sociais | Norberto Bobbio |
| **Dignidade da Pessoa Humana** | Fundamento central: todo ser humano tem valor intrínseco | Immanuel Kant |

Para o CEBRASPE, a visão predominante em provas é a de **Norberto Bobbio**: os direitos humanos são **históricos** (construídos ao longo do tempo), **não nascem todos de uma vez nem de uma vez por todas**.

---

## 3. Características dos Direitos Humanos

| Característica | Definição |
|---|---|
| **Universalidade** | Valem para todas as pessoas, em todos os lugares |
| **Indivisibilidade** | Não podem ser divididos: direitos civis, políticos, sociais e econômicos formam um todo |
| **Interdependência** | A realização de um direito depende da realização dos demais |
| **Inalienabilidade** | Não podem ser vendidos, cedidos ou transferidos |
| **Irrenunciabilidade** | A pessoa não pode renunciar a seus direitos fundamentais |
| **Imprescritibilidade** | Não se perdem pelo decurso do tempo |
| **Historicidade** | São construídos historicamente, evoluem com a sociedade |
| **Limitabilidade (Relatividade)** | Nenhum direito é absoluto; podem ser limitados em caso de colisão com outros direitos |
| **Não-Taxatividade** | O rol de direitos não é fechado; novos direitos podem ser reconhecidos |

### 3.1. Atenção para Provas
A característica mais cobrada é a **relatividade (limitabilidade)**: as bancas afirmam que os direitos humanos são absolutos — o que é **ERRADO**. Nenhum direito fundamental é absoluto. Até o direito à vida admite exceção (legítima defesa, estado de guerra declarada — CF, art. 5°, XLVII).

---

## 4. Gerações (Dimensões) dos Direitos Humanos

| Geração | Foco | Lema | Direitos | Marco Histórico |
|---|---|---|---|---|
| **1ª Geração** | Liberdade | Liberdade | Civis e políticos (vida, liberdade, propriedade, voto) | Revoluções Francesa e Americana (séc. XVIII) |
| **2ª Geração** | Igualdade | Igualdade | Econômicos, sociais e culturais (educação, saúde, trabalho) | Revolução Industrial, Constituição de Weimar (1919) |
| **3ª Geração** | Fraternidade | Solidariedade | Difusos e coletivos (meio ambiente, paz, desenvolvimento, autodeterminação) | Pós-2ª Guerra Mundial |
| **4ª Geração** | Democracia | Pluralismo | Democracia, informação, pluralismo | Globalização, era digital |
| **5ª Geração** | Paz | Paz | Direito à paz como direito autônomo | Karel Vasak, Paulo Bonavides |

### 4.1. Importante
A doutrina mais aceita em provas é a de **Karel Vasak** (3 gerações: liberdade, igualdade, fraternidade). **Paulo Bonavides** propôs a 4ª (democracia) e 5ª (paz) gerações. O termo "gerações" é criticado por sugerir que uma substitui a outra; por isso, muitos autores preferem **"dimensões"** (coexistem e se complementam).

---

## 5. Evolução Histórica

| Documento | Ano | Significado |
|---|---|---|
| **Magna Carta** | 1215 | Limitação do poder do rei (habeas corpus embrionário) |
| **Petition of Rights** | 1628 | Limites ao poder de tributar e prender |
| **Habeas Corpus Act** | 1679 | Garantia contra prisão arbitrária |
| **Bill of Rights (Inglaterra)** | 1689 | Parlamento acima do rei |
| **Declaração de Independência dos EUA** | 1776 | "Todos os homens são criados iguais" |
| **Declaração dos Direitos do Homem e do Cidadão** | 1789 | Revolução Francesa: liberdade, igualdade, fraternidade |
| **Constituição de Weimar** | 1919 | Direitos sociais e econômicos (2ª geração) |
| **Carta das Nações Unidas** | 1945 | Criação da ONU e compromisso com os DH |
| **Declaração Universal dos DH** | 1948 | Marco fundamental dos DH modernos |

---

## 6. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: Os Direitos Humanos são absolutos, ou seja, não podem ser restringidos em nenhuma circunstância.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: Nenhum direito fundamental é absoluto. Eles podem ser limitados quando colidem com outros direitos ou com o interesse público. A relatividade é uma das características dos DH.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: A característica dos Direitos Humanos segundo a qual eles não podem ser cedidos, vendidos ou transferidos é a:
a) Universalidade
b) Imprescritibilidade
c) Irrenunciabilidade
d) Inalienabilidade
e) Historicidade

* **Gabarito: D**
* **Comentário**: Inalienabilidade significa que os DH não podem ser alienados (vendidos, cedidos, transferidos). Irrenunciabilidade significa que não se pode renunciar a eles.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: Segundo a doutrina de Karel Vasak, os Direitos Humanos de terceira geração (dimensão) são caracterizados pelo valor da:
a) Liberdade
b) Igualdade
c) Fraternidade
d) Democracia
e) Paz

* **Gabarito: C**
* **Comentário**: 1ª geração = Liberdade. 2ª geração = Igualdade. 3ª geração = Fraternidade (solidariedade). Democracia seria 4ª (Bonavides) e Paz seria 5ª.

---

## 7. Pegadinhas Mais Frequentes

1. **"Direitos Humanos são absolutos"**: ERRADO. São relativos (limitáveis).
2. **"Geração substitui a anterior"**: ERRADO. As gerações/dimensões coexistem e se complementam (cumulatividade).
3. **Inalienabilidade vs. Irrenunciabilidade**: Inalienável = não pode transferir para outro. Irrenunciável = não pode abrir mão.
4. **"Direitos Humanos são apenas para bandidos"**: Falsa premissa que aparece em questões de "senso comum". DH são para TODAS as pessoas.

---

## 8. Conclusão

O domínio dos conceitos, fundamentos e características dos Direitos Humanos é o alicerce para todo o restante da matéria. O candidato deve memorizar as características (especialmente a relatividade/limitabilidade), as gerações/dimensões e a evolução histórica. Essas definições são cobradas de forma direta e representam pontos garantidos para quem estudou.',
  'Estudo dos conceitos, fundamentos e características dos Direitos Humanos para concursos policiais. Aborda definição, fundamentos filosóficos (jusnaturalismo, positivismo, teoria crítica, dignidade humana), características essenciais (universalidade, indivisibilidade, inalienabilidade, relatividade), gerações/dimensões dos DH (1ª a 5ª), evolução histórica (Magna Carta à DUDH) e questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 2/8 — Direitos Humanos na Constituição de 1988
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Direitos Humanos na Constituição de 1988',
  'Direitos Humanos na Constituição Federal de 1988',
  E'# Direitos Humanos na Constituição Federal de 1988

## 1. Introdução

A Constituição Federal de 1988, apelidada de "Constituição Cidadã", é o documento mais importante para o estudo dos Direitos Humanos no Brasil. Ela consagrou um extenso catálogo de direitos fundamentais no Título II (arts. 5° a 17) e estabeleceu mecanismos de proteção inéditos na história constitucional brasileira. Para os concursos policiais, o art. 5° é de longe o dispositivo mais cobrado em todas as bancas. O policial que atua diariamente com abordagens, prisões e investigações precisa conhecer cada inciso do art. 5° para garantir que sua atuação seja legal e legítima.

---

## 2. Estrutura dos Direitos Fundamentais na CF/88

### 2.1. Título II — Dos Direitos e Garantias Fundamentais

| Capítulo | Artigos | Conteúdo |
|---|---|---|
| I | Art. 5° | Direitos e deveres individuais e coletivos |
| II | Arts. 6° a 11 | Direitos sociais |
| III | Arts. 12 e 13 | Nacionalidade |
| IV | Arts. 14 a 16 | Direitos políticos |
| V | Art. 17 | Partidos políticos |

---

## 3. Art. 5° — Incisos Essenciais para Provas Policiais

### 3.1. Direitos de Liberdade e Igualdade
* **Caput**: "Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos **estrangeiros residentes no País** a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade."
* **Atenção**: O STF estende os direitos do art. 5° também aos estrangeiros não residentes (em trânsito, turistas, etc.).

### 3.2. Incisos Mais Cobrados

| Inciso | Direito | Resumo |
|---|---|---|
| **III** | Proibição de tortura | Ninguém será submetido a tortura nem a tratamento desumano ou degradante |
| **XI** | Inviolabilidade do domicílio | Casa é asilo inviolável. Exceções: flagrante delito, desastre, socorro, ordem judicial (de dia) |
| **XII** | Sigilo de correspondência e comunicações | Inviolável, salvo interceptação telefônica com ordem judicial para investigação criminal ou processo penal |
| **XXXIII** | Direito à informação | Todos têm direito a receber informações dos órgãos públicos |
| **XXXV** | Acesso à Justiça | A lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito |
| **XXXIX** | Legalidade penal | Não há crime sem lei anterior que o defina, nem pena sem prévia cominação legal |
| **XLI** | Punição à discriminação | A lei punirá qualquer discriminação atentatória dos direitos e liberdades fundamentais |
| **XLII** | Racismo | Crime inafiançável e imprescritível |
| **XLIII** | Crimes hediondos | Inafiançáveis e insuscetíveis de graça/anistia (tortura, tráfico, terrorismo) |
| **XLVII** | Proibição de penas | Não haverá pena de morte (salvo guerra declarada), perpétua, trabalhos forçados, banimento, cruéis |
| **XLIX** | Direitos dos presos | Assegurado aos presos o respeito à integridade física e moral |
| **LIV** | Devido processo legal | Ninguém será privado da liberdade sem o devido processo legal |
| **LV** | Contraditório e ampla defesa | Assegurados aos litigantes em processo judicial ou administrativo |
| **LVI** | Provas ilícitas | São inadmissíveis as provas obtidas por meios ilícitos |
| **LXI** | Prisão legal | Ninguém será preso senão em flagrante delito ou por ordem escrita e fundamentada de autoridade judiciária competente |
| **LXIII** | Direito ao silêncio | O preso será informado de seus direitos, entre eles o de permanecer calado |
| **LXVIII** | Habeas corpus | Concedido quando alguém sofrer violência ou coação em sua liberdade de locomoção |

---

## 4. Tratados Internacionais e a CF/88

### 4.1. Art. 5°, §2° — Cláusula de Abertura
"Os direitos e garantias expressos nesta Constituição não excluem outros decorrentes do regime e dos princípios por ela adotados, ou dos **tratados internacionais** em que a República Federativa do Brasil seja parte."

### 4.2. Art. 5°, §3° — Status dos Tratados (EC 45/2004)
"Os tratados e convenções internacionais sobre direitos humanos que forem aprovados, em cada Casa do Congresso Nacional, em **dois turnos**, por **três quintos** dos votos dos respectivos membros, serão equivalentes às **emendas constitucionais**."

### 4.3. Hierarquia dos Tratados

| Procedimento | Status | Exemplo |
|---|---|---|
| Aprovado com quórum de EC (3/5, dois turnos) | **Emenda Constitucional** | Convenção sobre Pessoas com Deficiência (2009), Tratado de Marraqueche (2018) |
| Aprovado com quórum simples (antes da EC 45/2004 ou sem quórum especial) | **Supralegal** (acima da lei, abaixo da CF) | Pacto de San José da Costa Rica |
| Tratado sobre outros temas (não DH) | **Lei ordinária** | Tratados comerciais |

---

## 5. Remédios Constitucionais

| Remédio | Artigo | Proteção |
|---|---|---|
| **Habeas Corpus** | Art. 5°, LXVIII | Liberdade de locomoção |
| **Habeas Data** | Art. 5°, LXXII | Acesso a informações pessoais em bancos de dados públicos |
| **Mandado de Segurança** | Art. 5°, LXIX | Direito líquido e certo contra ato ilegal de autoridade |
| **Mandado de Injunção** | Art. 5°, LXXI | Quando falta norma regulamentadora que impeça exercício de direito |
| **Ação Popular** | Art. 5°, LXXIII | Qualquer cidadão pode anular ato lesivo ao patrimônio público |

---

## 6. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PRF — Policial)
**Enunciado**: Segundo a CF/88, a casa é asilo inviolável do indivíduo, nela ninguém podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: Reprodução literal do art. 5°, XI. As exceções para entrada sem consentimento são: flagrante delito (qualquer hora), desastre (qualquer hora), socorro (qualquer hora) e determinação judicial (apenas durante o dia).

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: De acordo com a Constituição Federal, os tratados internacionais sobre direitos humanos aprovados pelo Congresso Nacional com quórum de emenda constitucional terão status de:
a) Lei ordinária
b) Lei complementar
c) Emenda constitucional
d) Norma supralegal
e) Decreto legislativo

* **Gabarito: C**
* **Comentário**: Art. 5°, §3°: tratados de DH aprovados em dois turnos, por 3/5 dos votos em cada Casa, equivalem a emendas constitucionais.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: O remédio constitucional cabível quando alguém sofrer violência ou coação em sua liberdade de locomoção, por ilegalidade ou abuso de poder, é:
a) Mandado de Segurança
b) Habeas Data
c) Mandado de Injunção
d) Habeas Corpus
e) Ação Popular

* **Gabarito: D**
* **Comentário**: O Habeas Corpus protege a liberdade de locomoção (ir e vir). Mandado de Segurança protege direito líquido e certo. Habeas Data protege acesso a dados pessoais.

---

## 7. Pegadinhas Mais Frequentes

1. **Art. 5° protege apenas brasileiros**: ERRADO. O caput fala em "brasileiros e estrangeiros residentes", mas o STF estende a todos os que estejam no território.
2. **Entrada em domicílio por ordem judicial a qualquer hora**: ERRADO. A ordem judicial permite entrada apenas durante o **dia**. Flagrante, desastre e socorro permitem a qualquer hora.
3. **Racismo é crime inafiançável e imprescritível**: CERTO. É o único crime que combina essas duas características na CF.
4. **Pena de morte é totalmente proibida**: ERRADO. É proibida em regra, mas admitida em caso de **guerra declarada** (art. 5°, XLVII, "a").

---

## 8. Conclusão

A Constituição de 1988 é a norma central dos Direitos Humanos no Brasil. Para os concursos policiais, o art. 5° é o dispositivo mais importante, com destaque para os incisos sobre prisão, domicílio, sigilo, tortura, devido processo legal e direito ao silêncio. O candidato que memoriza os incisos-chave e compreende a hierarquia dos tratados internacionais está preparado para a maioria das questões.',
  'Estudo dos Direitos Humanos na Constituição Federal de 1988 para concursos policiais. Aborda a estrutura do Título II (arts. 5° a 17), os incisos mais cobrados do art. 5° (tortura, domicílio, sigilo, prisão, silêncio, provas ilícitas, racismo, crimes hediondos), o status dos tratados internacionais de DH (emenda constitucional vs. supralegal) e os remédios constitucionais (habeas corpus, habeas data, mandado de segurança). Questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 3/8 — Declaração Universal dos Direitos Humanos (DUDH 1948)
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Declaração Universal dos Direitos Humanos (DUDH 1948)',
  'Declaração Universal dos Direitos Humanos: Artigos e Princípios',
  E'# Declaração Universal dos Direitos Humanos (1948)

## 1. Introdução

A Declaração Universal dos Direitos Humanos (DUDH), adotada pela Assembleia Geral das Nações Unidas em **10 de dezembro de 1948** (Resolução 217-A), é o documento mais importante da história dos Direitos Humanos. Composta por **30 artigos**, ela estabelece um padrão mínimo de direitos e liberdades que todos os povos e nações devem garantir. Para os concursos policiais, a DUDH é cobrada de forma direta, com questões que pedem o conteúdo de artigos específicos e o contexto histórico de sua criação.

---

## 2. Contexto Histórico

A DUDH foi elaborada após os horrores da Segunda Guerra Mundial e do Holocausto, como uma resposta da comunidade internacional à necessidade de proteger a dignidade humana contra atrocidades estatais.

* **Comitê de Redação**: Presidido por Eleanor Roosevelt (EUA), com participação de René Cassin (França), Charles Malik (Líbano), Peng Chun Chang (China) e outros.
* **Aprovação**: 48 votos a favor, 0 contra, 8 abstenções (URSS, Arábia Saudita, África do Sul e outros).
* **Natureza Jurídica**: Resolução da Assembleia Geral da ONU. Formalmente, **não é um tratado** (não é juridicamente vinculante). Porém, a doutrina majoritária considera que seus princípios integram o **jus cogens** (normas imperativas de Direito Internacional).

---

## 3. Estrutura da DUDH

| Artigos | Conteúdo |
|---|---|
| **1 e 2** | Princípios gerais: liberdade, igualdade, não-discriminação |
| **3 a 11** | Direitos civis (vida, liberdade, segurança, proibição de escravidão e tortura) |
| **12 a 17** | Direitos do indivíduo em relação à sociedade (privacidade, nacionalidade, propriedade) |
| **18 a 21** | Liberdades públicas (pensamento, religião, opinião, reunião, participação política) |
| **22 a 27** | Direitos econômicos, sociais e culturais (trabalho, repouso, educação, cultura) |
| **28 a 30** | Disposições gerais (ordem social, deveres, limites) |

---

## 4. Artigos Mais Cobrados em Provas

### Art. 1°
"Todos os seres humanos nascem livres e iguais em dignidade e em direitos. Dotados de razão e de consciência, devem agir uns para com os outros em espírito de fraternidade."

### Art. 2°
Não-discriminação: Todos os direitos se aplicam sem distinção de raça, cor, sexo, língua, religião, opinião política, origem nacional ou social, fortuna, nascimento ou qualquer outra condição.

### Art. 3°
"Todo indivíduo tem direito à vida, à liberdade e à segurança pessoal."

### Art. 4°
Proibição da escravidão: "Ninguém será mantido em escravatura ou em servidão."

### Art. 5°
Proibição da tortura: "Ninguém será submetido a tortura nem a penas ou tratamentos cruéis, desumanos ou degradantes."

### Art. 9°
"Ninguém pode ser arbitrariamente preso, detido ou exilado."

### Art. 11°
Presunção de inocência: "Toda a pessoa acusada de um ato delituoso presume-se inocente até que a sua culpabilidade fique legalmente provada."

### Art. 13°
Liberdade de locomoção: Toda pessoa tem direito de circular e de escolher residência no interior de um Estado, e de deixar e regressar a qualquer país.

### Art. 18°
Liberdade de pensamento, consciência e religião.

### Art. 19°
Liberdade de opinião e expressão, incluindo o direito de procurar, receber e difundir informações.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: A Declaração Universal dos Direitos Humanos de 1948 é um tratado internacional juridicamente vinculante para todos os Estados-membros da ONU.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: A DUDH é uma **resolução** da Assembleia Geral da ONU, não um tratado. Formalmente, não possui força jurídica vinculante. No entanto, seus princípios são considerados parte do costume internacional e do jus cogens.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: Segundo a Declaração Universal dos Direitos Humanos, o artigo que estabelece que "ninguém será submetido a tortura nem a penas ou tratamentos cruéis, desumanos ou degradantes" é o:
a) Artigo 1°
b) Artigo 3°
c) Artigo 5°
d) Artigo 9°
e) Artigo 11°

* **Gabarito: C**
* **Comentário**: Art. 5° da DUDH trata da proibição da tortura. Art. 1° trata de liberdade e igualdade. Art. 3° trata de vida, liberdade e segurança. Art. 9° trata de prisão arbitrária. Art. 11° trata de presunção de inocência.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: A Declaração Universal dos Direitos Humanos foi adotada pela Assembleia Geral das Nações Unidas em:
a) 1945
b) 1948
c) 1950
d) 1966
e) 1969

* **Gabarito: B**
* **Comentário**: A DUDH foi adotada em 10 de dezembro de 1948. Em 1945, foi criada a ONU (Carta de São Francisco). Em 1966, foram adotados os Pactos Internacionais (PIDCP e PIDESC). Em 1969, foi adotada a Convenção Americana (Pacto de San José).

---

## 6. Pegadinhas Mais Frequentes

1. **DUDH é tratado**: ERRADO. É resolução (não vinculante formalmente).
2. **DUDH foi aprovada por unanimidade**: ERRADO. Houve 8 abstenções (0 votos contra).
3. **DUDH tem 30 artigos**: CERTO. Memorize este número.
4. **Art. 1° = liberdade e igualdade em dignidade**: Não confundir com Art. 3° (vida, liberdade e segurança).

---

## 7. Conclusão

A DUDH é a "certidão de nascimento" do sistema internacional de proteção dos Direitos Humanos. Para o concursando, é essencial memorizar os artigos-chave (1°, 3°, 5°, 9°, 11°), saber que ela é uma resolução (não tratado) e conhecer o contexto pós-Segunda Guerra de sua criação.',
  'Estudo da Declaração Universal dos Direitos Humanos (1948) para concursos policiais. Aborda o contexto histórico (pós-Segunda Guerra), a natureza jurídica (resolução vs. tratado), a estrutura dos 30 artigos, os artigos mais cobrados (vida, tortura, prisão arbitrária, presunção de inocência, liberdade de locomoção) e questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 4/8 — Sistema Interamericano (Pacto de San José da Costa Rica)
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Sistema Interamericano (Pacto de San José da Costa Rica)',
  'Sistema Interamericano de Direitos Humanos e Pacto de San José',
  E'# Sistema Interamericano de Direitos Humanos e Pacto de San José

## 1. Introdução

O Sistema Interamericano de Proteção dos Direitos Humanos é o mecanismo regional de proteção das Américas, vinculado à Organização dos Estados Americanos (OEA). Seu instrumento normativo central é a **Convenção Americana sobre Direitos Humanos**, conhecida como **Pacto de San José da Costa Rica**, adotada em **1969** e ratificada pelo Brasil em **1992**. Para os concursos policiais, este tema é cobrado com frequência pelo CEBRASPE, especialmente nas provas de PF e PRF.

---

## 2. Convenção Americana (Pacto de San José da Costa Rica)

### 2.1. Dados Essenciais
* **Adoção**: 22 de novembro de 1969
* **Entrada em vigor**: 18 de julho de 1978
* **Ratificação pelo Brasil**: Decreto 678, de 6 de novembro de 1992
* **Status no Brasil**: Norma **supralegal** (acima da lei ordinária, abaixo da Constituição — RE 466.343/2008, STF)

### 2.2. Direitos Protegidos (Parte I)

| Artigo | Direito |
|---|---|
| **Art. 4°** | Direito à vida (desde a concepção, em geral) |
| **Art. 5°** | Direito à integridade pessoal (proibição de tortura) |
| **Art. 6°** | Proibição da escravidão e servidão |
| **Art. 7°** | Direito à liberdade pessoal |
| **Art. 8°** | Garantias judiciais (devido processo legal, presunção de inocência) |
| **Art. 9°** | Princípio da legalidade e da retroatividade |
| **Art. 11** | Proteção da honra e dignidade |
| **Art. 13** | Liberdade de pensamento e expressão |
| **Art. 22** | Direito de circulação e residência |
| **Art. 25** | Proteção judicial (recurso efetivo) |

### 2.3. Regras sobre Pena de Morte (Art. 4°)
A Convenção NÃO proíbe a pena de morte absolutamente, mas estabelece restrições severas:
* Não pode ser restabelecida em Estados que a aboliram.
* Não pode ser aplicada a menores de 18 anos, maiores de 70 anos ou mulheres grávidas.
* Não pode ser estendida a delitos que não a previam no momento da ratificação.

### 2.4. Proibição de Prisão por Dívida (Art. 7°, §7°)
"Ninguém deve ser detido por dívidas." Exceção: inadimplemento de obrigação alimentar (pensão alimentícia).
* **No Brasil**: O STF entendeu que o Pacto de San José tornou ilícita a prisão civil do depositário infiel, restando apenas a prisão por dívida de alimentos (Súmula Vinculante 25).

---

## 3. Órgãos do Sistema Interamericano

### 3.1. Comissão Interamericana de Direitos Humanos (CIDH)
* **Sede**: Washington, D.C. (EUA)
* **Composição**: 7 membros (comissários), eleitos pela Assembleia Geral da OEA para mandatos de 4 anos, com uma reeleição.
* **Funções**: Receber petições individuais de vítimas, realizar visitas in loco, emitir relatórios e recomendações, submeter casos à Corte IDH.
* **Qualquer pessoa** pode peticionar à CIDH (não precisa ser o Estado).

### 3.2. Corte Interamericana de Direitos Humanos (Corte IDH)
* **Sede**: San José, Costa Rica.
* **Composição**: 7 juízes, eleitos pela Assembleia Geral da OEA para mandatos de 6 anos, com uma reeleição.
* **Funções**: Julgar casos contenciosos e emitir opiniões consultivas.
* **Quem pode acionar a Corte**: Apenas a **CIDH** e os **Estados-parte**. Indivíduos NÃO podem acionar a Corte diretamente.
* **Jurisdição obrigatória**: O Brasil reconheceu a jurisdição obrigatória da Corte IDH em 1998 (Decreto 4.463/2002).

### 3.3. Tabela Comparativa

| | CIDH | Corte IDH |
|---|---|---|
| **Natureza** | Órgão autônomo da OEA | Órgão judicial |
| **Sede** | Washington, D.C. | San José, Costa Rica |
| **Membros** | 7 comissários (4 anos) | 7 juízes (6 anos) |
| **Acesso individual** | Sim (qualquer pessoa) | Não (só CIDH ou Estado) |
| **Decisões** | Recomendações | Sentenças vinculantes |

---

## 4. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: De acordo com a Convenção Americana sobre Direitos Humanos, qualquer pessoa pode peticionar diretamente à Corte Interamericana de Direitos Humanos alegando violação de seus direitos.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: Indivíduos podem peticionar à **CIDH** (Comissão), não diretamente à Corte. A Corte só pode ser acionada pela CIDH ou por um Estado-parte.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: A Convenção Americana sobre Direitos Humanos (Pacto de San José) foi ratificada pelo Brasil no ano de:
a) 1969
b) 1978
c) 1988
d) 1992
e) 1998

* **Gabarito: D**
* **Comentário**: A Convenção foi adotada em 1969, entrou em vigor em 1978, e foi ratificada pelo Brasil em 1992 (Decreto 678/92). Em 1998, o Brasil reconheceu a jurisdição da Corte IDH.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: Segundo o Pacto de San José da Costa Rica, a única hipótese de prisão civil por dívida admitida é:
a) Depositário infiel
b) Devedor de alimentos
c) Devedor fiscal
d) Fiador em contrato de locação
e) Inadimplente de multa criminal

* **Gabarito: B**
* **Comentário**: O art. 7°, §7° do Pacto de San José admite apenas a prisão por dívida de obrigação alimentar. O STF, por meio da SV 25, declarou ilícita a prisão do depositário infiel.

---

## 5. Pegadinhas Mais Frequentes

1. **Indivíduo NÃO aciona a Corte diretamente**: Apenas a CIDH e Estados-parte podem.
2. **Pacto de San José NÃO tem status de emenda constitucional**: Tem status supralegal (foi aprovado antes da EC 45/2004, sem quórum especial).
3. **Pena de morte no Pacto**: Não é absolutamente proibida, mas não pode ser restabelecida por quem já aboliu.
4. **Prisão do depositário infiel**: Era prevista na CF (art. 5°, LXVII), mas o STF a considerou ilícita à luz do Pacto de San José (SV 25).

---

## 6. Conclusão

O Sistema Interamericano é o principal mecanismo regional de proteção dos Direitos Humanos aplicável ao Brasil. O candidato deve memorizar a diferença entre CIDH e Corte IDH (especialmente quem pode peticionar a cada uma), o status supralegal do Pacto de San José e suas regras sobre pena de morte e prisão por dívida.',
  'Estudo do Sistema Interamericano de Direitos Humanos para concursos policiais. Aborda a Convenção Americana (Pacto de San José), seus direitos protegidos, regras sobre pena de morte e prisão por dívida, a CIDH (Comissão) e a Corte IDH (composição, competência, acesso). Detalha o status supralegal no Brasil, a Súmula Vinculante 25 e questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 5/8 — Convenção contra a Tortura e Lei 9.455/97
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Convenção contra a Tortura e Lei 9.455/97',
  'Tortura: Convenção da ONU, Convenção Interamericana e Lei 9.455/97',
  E'# Tortura: Convenção da ONU, Convenção Interamericana e Lei 9.455/97

## 1. Introdução

A proibição da tortura é uma das normas mais fundamentais do Direito Internacional dos Direitos Humanos, considerada **jus cogens** (norma imperativa inderrogável). Para os concursos policiais, este tema é de importância máxima: a tortura é crime diretamente associado à atuação policial, e as bancas CEBRASPE, FGV e VUNESP cobram tanto os tratados internacionais quanto a lei brasileira (Lei 9.455/97). O policial que pratica tortura comete crime inafiançável e insuscetível de graça ou anistia.

---

## 2. Convenção da ONU contra a Tortura (1984)

### 2.1. Dados Essenciais
* **Nome completo**: Convenção contra a Tortura e Outros Tratamentos ou Penas Cruéis, Desumanos ou Degradantes
* **Adoção**: 1984 (ONU)
* **Ratificação pelo Brasil**: 1989

### 2.2. Definição de Tortura (Art. 1°)
Tortura é qualquer ato pelo qual dores ou sofrimentos agudos, físicos ou mentais, são infligidos intencionalmente a uma pessoa com os fins de:
* Obter informações ou confissões;
* Punir por ato cometido ou que se suspeita ter cometido;
* Intimidar ou coagir;
* Por qualquer razão baseada em discriminação.

**Requisito**: O ato deve ser praticado por agente público ou pessoa no exercício de funções públicas, ou por instigação ou com consentimento destes.

### 2.3. Princípios Fundamentais
* **Proibição absoluta** (art. 2°): Nenhuma circunstância excepcional (guerra, instabilidade política, emergência pública) pode ser invocada para justificar a tortura.
* **Non-refoulement** (art. 3°): Proibição de expulsar, devolver ou extraditar uma pessoa para outro Estado quando houver razões substanciais para crer que ela seria submetida a tortura.

---

## 3. Convenção Interamericana para Prevenir e Punir a Tortura (1985)

### 3.1. Definição mais ampla
A Convenção Interamericana tem definição mais ampla que a da ONU: inclui a tortura praticada por **particulares** (não apenas agentes públicos), quando instigada por funcionário público.

### 3.2. Obrigações dos Estados
* Tipificar a tortura como crime em sua legislação interna.
* Não admitir confissões obtidas mediante tortura como prova.
* Garantir que policiais e agentes de custódia recebam treinamento adequado sobre proibição de tortura.

---

## 4. Lei 9.455/97 — Lei de Tortura (Brasil)

### 4.1. Crime de Tortura (Art. 1°)

**Inciso I — Tortura-prova / Tortura-crime / Tortura-discriminação:**
Constranger alguém com emprego de violência ou grave ameaça, causando-lhe sofrimento físico ou mental:
* a) para obter informação, declaração ou confissão (tortura-prova);
* b) para provocar ação ou omissão de natureza criminosa (tortura-crime);
* c) em razão de discriminação racial ou religiosa (tortura-discriminação).

**Inciso II — Tortura-castigo:**
Submeter alguém, sob sua guarda, poder ou autoridade, com emprego de violência ou grave ameaça, a intenso sofrimento físico ou mental, como forma de aplicar castigo pessoal ou medida de caráter preventivo.

**§1° — Equiparado (tortura por omissão):**
Na mesma pena incorre quem submete pessoa presa ou sujeita a medida de segurança a sofrimento físico ou mental, por intermédio da prática de ato não previsto em lei ou não resultante de medida legal.

**§2° — Tortura-omissão (forma privilegiada):**
Aquele que se omite em face dessas condutas, quando tinha o dever de evitá-las ou apurá-las. Pena de detenção de 1 a 4 anos (menor que a tortura-ação).

### 4.2. Penas

| Modalidade | Pena |
|---|---|
| **Tortura-ação (art. 1°, I e II, §1°)** | Reclusão de 2 a 8 anos |
| **Tortura-omissão (art. 1°, §2°)** | Detenção de 1 a 4 anos |
| **Resultado lesão grave** | Reclusão de 4 a 10 anos |
| **Resultado morte (tortura qualificada)** | Reclusão de 8 a 16 anos |
| **Aumento de 1/6 a 1/3** | Se cometida por agente público |

### 4.3. Características do Crime de Tortura
* **Inafiançável**: Não cabe fiança (CF, art. 5°, XLIII).
* **Insuscetível de graça ou anistia**: Não cabe perdão presidencial (CF, art. 5°, XLIII).
* **Crime comum**: Pode ser praticado por qualquer pessoa (não apenas agente público).
* **Efeitos da condenação**: Perda do cargo e interdição para exercício de função pública pelo dobro da pena.
* **Regime inicial**: Fechado (art. 1°, §7°).
* **É crime hediondo?** A tortura é **equiparada** a crime hediondo (Lei 8.072/90).

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PRF — Policial)
**Enunciado**: A Lei 9.455/97 define como crime de tortura apenas os atos praticados por agentes públicos no exercício de suas funções.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: A Lei 9.455/97 define a tortura como **crime comum**, ou seja, pode ser praticado por qualquer pessoa, não apenas agentes públicos. A condição de agente público é causa de **aumento de pena** (1/6 a 1/3), não elementar do tipo.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: Segundo a Lei 9.455/97, a pena para o crime de tortura que resulta em morte da vítima é de:
a) 2 a 8 anos de reclusão
b) 4 a 10 anos de reclusão
c) 6 a 12 anos de reclusão
d) 8 a 16 anos de reclusão
e) 12 a 30 anos de reclusão

* **Gabarito: D**
* **Comentário**: Tortura com resultado morte: reclusão de 8 a 16 anos. Tortura simples: 2 a 8. Resultado lesão grave: 4 a 10.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: De acordo com a Convenção da ONU contra a Tortura, a proibição da tortura:
a) Pode ser suspensa em caso de guerra.
b) Pode ser relativizada em caso de ameaça terrorista.
c) É absoluta, não admitindo nenhuma exceção.
d) Depende da legislação interna de cada país.
e) Aplica-se apenas a prisioneiros de guerra.

* **Gabarito: C**
* **Comentário**: O art. 2° da Convenção é categórico: nenhuma circunstância excepcional pode ser invocada para justificar a tortura. A proibição é absoluta.

---

## 6. Pegadinhas Mais Frequentes

1. **Tortura é crime COMUM (não próprio)**: Qualquer pessoa pode cometer, não apenas agente público.
2. **Tortura-omissão tem pena menor**: Detenção de 1 a 4 anos (vs. reclusão de 2 a 8 para tortura-ação).
3. **Crime inafiançável E insuscetível de graça/anistia**: Mas NÃO é imprescritível (diferente do racismo).
4. **Regime inicial fechado**: O §7° da Lei 9.455/97 determina regime inicialmente fechado.

---

## 7. Conclusão

A tortura é um dos temas mais relevantes para concursos policiais, pois envolve diretamente a atuação profissional. O candidato deve dominar a definição legal (Lei 9.455/97), as modalidades (ação, castigo, omissão), as penas e qualificadoras, e as disposições dos tratados internacionais.',
  'Estudo sobre Tortura para concursos policiais. Aborda a Convenção da ONU (1984), a Convenção Interamericana (1985) e a Lei 9.455/97 (crime de tortura no Brasil). Detalha as modalidades (tortura-prova, tortura-crime, tortura-discriminação, tortura-castigo, tortura-omissão), penas, qualificadoras (resultado morte), aumento de pena para agente público, e características processuais (inafiançável, insuscetível de graça). Questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 6/8 — Direitos das mulheres, crianças, idosos, PCD, LGBTQIA+
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Direitos das mulheres, crianças, idosos, PCD, LGBTQIA+',
  'Proteção de Grupos Vulneráveis: Mulheres, Crianças, Idosos e PCD',
  E'# Proteção de Grupos Vulneráveis: Mulheres, Crianças, Idosos e PCD

## 1. Introdução

A proteção de grupos vulneráveis é um dos pilares do sistema de Direitos Humanos, tanto no plano internacional quanto na legislação brasileira. Os concursos policiais cobram a legislação específica de proteção a mulheres (Lei Maria da Penha), crianças e adolescentes (ECA), idosos (Estatuto do Idoso) e pessoas com deficiência (Estatuto da PCD). O policial é frequentemente o primeiro agente do Estado a intervir em situações de violência contra esses grupos, tornando essencial o conhecimento da legislação aplicável.

---

## 2. Proteção Internacional

### 2.1. Principais Tratados

| Tratado | Ano | Grupo Protegido |
|---|---|---|
| **CEDAW** (Convenção sobre Eliminação de Todas as Formas de Discriminação contra a Mulher) | 1979 | Mulheres |
| **Convenção sobre os Direitos da Criança** | 1989 | Crianças e adolescentes |
| **Convenção sobre os Direitos das Pessoas com Deficiência** | 2006 | PCD |
| **Convenção Interamericana para Prevenir, Punir e Erradicar a Violência contra a Mulher** (Belém do Pará) | 1994 | Mulheres |

---

## 3. Direitos das Mulheres — Lei Maria da Penha (Lei 11.340/2006)

### 3.1. Origem do Nome
Maria da Penha Maia Fernandes sofreu duas tentativas de homicídio pelo marido (1983). O caso foi levado à CIDH (Comissão Interamericana), que condenou o Brasil por omissão. A lei foi criada em resposta.

### 3.2. Formas de Violência Doméstica (Art. 7°)
* **Física**: Qualquer conduta que ofenda a integridade ou saúde corporal.
* **Psicológica**: Dano emocional, diminuição da autoestima, humilhação, ridicularização, vigilância constante, perseguição (stalking).
* **Sexual**: Ação que constranja a mulher a presenciar, manter ou participar de relação sexual não desejada.
* **Patrimonial**: Retenção, subtração ou destruição de bens, documentos ou instrumentos de trabalho.
* **Moral**: Calúnia, difamação ou injúria.

### 3.3. Medidas Protetivas de Urgência (Arts. 22-24)
* Afastamento do agressor do lar.
* Proibição de aproximação e contato com a vítima.
* Restrição de visitas aos dependentes menores.
* Prestação de alimentos provisionais.

### 3.4. Aspectos Processuais Importantes
* A ação penal é **pública incondicionada** para lesão corporal (STF, ADI 4.424).
* NÃO se aplica a Lei 9.099/95 (Juizados Especiais).
* A mulher NÃO pode renunciar à representação na delegacia (o MP prossegue).

---

## 4. Direitos das Crianças e Adolescentes — ECA (Lei 8.069/90)

### 4.1. Princípios Fundamentais
* **Proteção Integral**: Crianças e adolescentes são sujeitos de direitos, com prioridade absoluta.
* **Melhor Interesse da Criança**: Em qualquer decisão, o interesse da criança deve prevalecer.
* **Prioridade Absoluta** (art. 4°): Primazia em receber proteção e socorro, precedência no atendimento.

### 4.2. Definições
* **Criança**: Até 12 anos incompletos.
* **Adolescente**: De 12 a 18 anos.
* Criança pratica **ato infracional**, não crime. Aplica-se medida de **proteção**.
* Adolescente pratica **ato infracional**. Aplica-se **medida socioeducativa** (advertência, prestação de serviços, liberdade assistida, semiliberdade, internação).

### 4.3. Internação (Art. 121-122)
* Máximo de **3 anos**.
* Reavaliação a cada **6 meses** no máximo.
* Liberação compulsória aos **21 anos**.
* Só cabe para ato infracional com violência/grave ameaça, ou reiteração.

---

## 5. Direitos dos Idosos — Estatuto do Idoso (Lei 10.741/2003)

### 5.1. Definição
**Idoso**: pessoa com idade igual ou superior a **60 anos**.

### 5.2. Direitos Principais
* Atendimento prioritário em serviços públicos e privados.
* Gratuidade em transportes coletivos urbanos (maiores de 65 anos — CF, art. 230, §2°).
* Prioridade na tramitação de processos judiciais.
* Proteção contra violência, negligência, discriminação, exploração e crueldade.

### 5.3. Crimes contra Idosos (Arts. 95-108)
* Discriminar idoso: pena de reclusão de 6 meses a 1 ano + multa.
* Abandono de idoso em hospital: detenção de 6 meses a 3 anos + multa.
* Exposição a perigo: reclusão de 2 meses a 2 anos.

---

## 6. Direitos das Pessoas com Deficiência

### 6.1. Convenção da ONU sobre PCD (2006)
* Ratificada pelo Brasil em 2009 com status de **emenda constitucional** (primeiro tratado aprovado com quórum do art. 5°, §3° da CF).
* Define PCD como aquela que tem impedimentos de longo prazo (físico, mental, intelectual ou sensorial) que podem obstruir sua participação plena na sociedade.

### 6.2. Estatuto da PCD (Lei 13.146/2015)
* Garante acessibilidade, educação inclusiva, trabalho, moradia.
* Capacidade civil: a PCD tem plena capacidade civil (pode casar, votar, exercer direitos).
* A deficiência NÃO afeta a plena capacidade civil da pessoa.

---

## 7. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PCDF — Escrivão)
**Enunciado**: A Lei Maria da Penha (Lei 11.340/2006) prevê cinco formas de violência doméstica e familiar contra a mulher: física, psicológica, sexual, patrimonial e moral.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O art. 7° da Lei Maria da Penha elenca exatamente essas cinco formas de violência.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: De acordo com o ECA, a medida socioeducativa de internação tem prazo máximo de:
a) 1 ano
b) 2 anos
c) 3 anos
d) 5 anos
e) Indeterminado

* **Gabarito: C**
* **Comentário**: A internação não pode exceder 3 anos, com reavaliação a cada 6 meses no máximo, e liberação compulsória aos 21 anos.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: A Convenção da ONU sobre os Direitos das Pessoas com Deficiência foi incorporada ao ordenamento jurídico brasileiro com status de:
a) Lei ordinária
b) Lei complementar
c) Norma supralegal
d) Emenda constitucional
e) Decreto autônomo

* **Gabarito: D**
* **Comentário**: A Convenção sobre PCD foi o primeiro (e até hoje um dos poucos) tratado de DH aprovado com quórum de emenda constitucional (art. 5°, §3° da CF).

---

## 8. Pegadinhas Mais Frequentes

1. **Idoso é 60+**: Mas transporte gratuito é para 65+ (CF).
2. **ECA — Internação máxima de 3 anos**: Não confundir com os prazos do Código Penal.
3. **PCD tem plena capacidade civil**: O Estatuto da PCD (2015) alterou o Código Civil.
4. **Lei Maria da Penha — ação penal incondicionada** para lesão corporal (não depende de representação da vítima).

---

## 9. Conclusão

A proteção de grupos vulneráveis é um tema transversal que conecta Direitos Humanos, Direito Constitucional e legislação penal especial. Para o concursando, é essencial conhecer as cinco formas de violência da Lei Maria da Penha, os princípios do ECA, os direitos dos idosos e o status constitucional da Convenção sobre PCD.',
  'Estudo da proteção de grupos vulneráveis para concursos policiais. Aborda a Lei Maria da Penha (formas de violência, medidas protetivas), o ECA (proteção integral, medidas socioeducativas, internação), o Estatuto do Idoso (definição, direitos, crimes) e os direitos das pessoas com deficiência (Convenção da ONU com status de EC, Estatuto da PCD). Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 7/8 — Direitos dos presos, Lei de Execução Penal e Regras de Mandela
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Direitos dos presos, Lei de Execução Penal e Regras de Mandela',
  'Direitos dos Presos: LEP, Regras de Mandela e Proteção Internacional',
  E'# Direitos dos Presos: LEP, Regras de Mandela e Proteção Internacional

## 1. Introdução

Os direitos dos presos são um dos temas mais cobrados nos concursos policiais, especialmente pelo CEBRASPE em provas para PF, PRF e PCDF. O policial lida diariamente com pessoas privadas de liberdade — desde a prisão em flagrante até o transporte e custódia de presos. Conhecer os direitos garantidos pela Constituição Federal, pela Lei de Execução Penal (LEP — Lei 7.210/84) e pelas Regras Mínimas das Nações Unidas para o Tratamento de Reclusos (Regras de Mandela) é fundamental para uma atuação legal e ética.

---

## 2. Direitos dos Presos na Constituição Federal

### 2.1. Art. 5° — Incisos Relevantes

| Inciso | Garantia |
|---|---|
| **III** | Proibição de tortura e tratamento desumano |
| **XLVII** | Proibição de penas cruéis, perpétuas, de morte (salvo guerra), trabalhos forçados, banimento |
| **XLVIII** | Pena será cumprida em estabelecimentos distintos conforme natureza do delito, idade e sexo |
| **XLIX** | Respeito à integridade física e moral do preso |
| **L** | Presidiárias terão condições para permanecer com filhos durante amamentação |
| **LXI** | Ninguém será preso senão em flagrante ou por ordem judicial |
| **LXII** | Comunicação imediata da prisão ao juiz e à família |
| **LXIII** | Direito ao silêncio e à assistência da família e de advogado |
| **LXIV** | Identificação dos responsáveis pela prisão |

---

## 3. Lei de Execução Penal (Lei 7.210/84)

### 3.1. Direitos do Preso (Art. 41)
* Alimentação suficiente e vestuário.
* Trabalho e sua remuneração.
* Previdência social.
* Exercício de atividades profissionais, intelectuais, artísticas e desportivas.
* Assistência material, à saúde, jurídica, educacional, social e religiosa.
* Proteção contra qualquer forma de sensacionalismo.
* Entrevista pessoal e reservada com advogado.
* Visita do cônjuge, companheira, parentes e amigos.
* Chamamento nominal.
* Igualdade de tratamento, salvo quanto às exigências de individualização da pena.
* Audiência com o diretor do estabelecimento.
* Representação e petição a qualquer autoridade.
* Contato com o mundo exterior por correspondência escrita, leitura e meios de informação.
* Atestado de pena a cumprir (emitido anualmente).

### 3.2. Deveres do Preso (Art. 39)
* Comportamento disciplinado e cumprimento da sentença.
* Obediência ao servidor e respeito a qualquer pessoa.
* Urbanidade e respeito com os demais condenados.
* Submeter-se à sanção disciplinar imposta.
* Execução do trabalho, tarefas e ordens.
* Indenização à vítima ou seus sucessores.
* Higiene pessoal e asseio da cela.

### 3.3. Assistências Previstas (Art. 10-27)

| Tipo | Conteúdo |
|---|---|
| **Material** | Alimentação, vestuário, instalações |
| **Saúde** | Atendimento médico, farmacêutico, odontológico |
| **Jurídica** | Acesso a defensor público |
| **Educacional** | Ensino fundamental obrigatório, profissionalizante |
| **Social** | Amparo ao preso e orientação de retorno à sociedade |
| **Religiosa** | Liberdade de culto, posse de livros de instrução religiosa |

### 3.4. Remição da Pena
* **Trabalho**: A cada **3 dias** de trabalho, remição de **1 dia** de pena.
* **Estudo**: A cada **12 horas** de estudo (frequência escolar), remição de **1 dia** de pena.
* Trabalho e estudo podem ser cumulados.

---

## 4. Regras de Mandela (ONU, 2015)

### 4.1. O que são
As Regras Mínimas das Nações Unidas para o Tratamento de Reclusos, revisadas em 2015 e rebatizadas como "Regras de Mandela" (em homenagem a Nelson Mandela), estabelecem padrões internacionais mínimos para o tratamento de pessoas presas.

### 4.2. Princípios Fundamentais

| Regra | Conteúdo |
|---|---|
| **Regra 1** | Todos os reclusos devem ser tratados com respeito à dignidade e valor humanos |
| **Regra 2** | Não-discriminação: as regras se aplicam imparcialmente |
| **Regra 43** | Proibição de confinamento solitário prolongado (mais de 15 dias consecutivos) |
| **Regra 44** | Confinamento solitário indefinido ou prolongado é proibido (constitui tortura) |
| **Regras 47-49** | Sanções disciplinares: proibição de punições coletivas, cruéis, desumanas ou degradantes |
| **Regras 71-72** | Trabalho dos reclusos: não pode ser aflitivo; condições similares às do mercado livre |
| **Regras 104-108** | Inspeções: estabelecimentos devem ser regularmente inspecionados |

### 4.3. Regra sobre Isolamento
A Regra 44 define que **confinamento solitário prolongado** (mais de 15 dias consecutivos) configura **tortura ou tratamento cruel**. Esta regra é muito cobrada em provas.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PF — Agente)
**Enunciado**: Segundo a Lei de Execução Penal (Lei 7.210/84), o preso tem direito a ser chamado pelo nome, sendo proibida a identificação por números.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O art. 41, XI da LEP garante o direito ao "chamamento nominal". O preso não pode ser tratado apenas como um número.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: De acordo com as Regras de Mandela (ONU), o confinamento solitário prolongado é aquele que excede:
a) 7 dias consecutivos
b) 10 dias consecutivos
c) 15 dias consecutivos
d) 21 dias consecutivos
e) 30 dias consecutivos

* **Gabarito: C**
* **Comentário**: A Regra 44 das Regras de Mandela define que o confinamento solitário que excede 15 dias consecutivos é considerado prolongado e constitui tratamento cruel ou tortura.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: De acordo com a Lei de Execução Penal, a remição pelo trabalho ocorre na proporção de:
a) 1 dia de pena para cada 2 dias de trabalho
b) 1 dia de pena para cada 3 dias de trabalho
c) 1 dia de pena para cada 5 dias de trabalho
d) 1 dia de pena para cada 7 dias de trabalho
e) 1 dia de pena para cada 10 dias de trabalho

* **Gabarito: B**
* **Comentário**: A cada 3 dias de trabalho, desconta-se 1 dia de pena. Para estudo, a proporção é de 12 horas de estudo para 1 dia de pena.

---

## 6. Pegadinhas Mais Frequentes

1. **Preso TEM direito a trabalho**: Trabalho é direito e dever do preso (art. 28 e 41 da LEP).
2. **Remição por estudo E trabalho podem ser cumulados**: O preso pode estudar e trabalhar ao mesmo tempo para remir pena.
3. **Confinamento solitário prolongado = mais de 15 dias**: Regra 44 de Mandela.
4. **Preso tem direito a voto?**: Depende. Preso provisório (sem condenação transitada) pode votar. Preso condenado definitivamente tem direitos políticos suspensos.

---

## 7. Conclusão

Os direitos dos presos são garantias fundamentais que o policial deve conhecer e respeitar. A LEP, as Regras de Mandela e a Constituição Federal convergem no princípio de que a privação de liberdade não retira a dignidade da pessoa humana. Para o concurso, os pontos-chave são: direitos do art. 41 da LEP, remição pelo trabalho (3 por 1), confinamento solitário (limite de 15 dias) e as assistências obrigatórias.',
  'Estudo dos Direitos dos Presos para concursos policiais. Aborda a proteção constitucional (art. 5°), a Lei de Execução Penal (direitos e deveres do preso, assistências, remição pelo trabalho e estudo) e as Regras de Mandela (tratamento mínimo, proibição de confinamento solitário prolongado acima de 15 dias). Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 8/8 — Atuação policial e Direitos Humanos: uso da força, abordagem
-- =====================================================================
SELECT upsert_material(
  'direitos-humanos',
  'Atuação policial e Direitos Humanos: uso da força, abordagem',
  'Atuação Policial e Direitos Humanos: Uso da Força e Abordagem',
  E'# Atuação Policial e Direitos Humanos: Uso da Força e Abordagem

## 1. Introdução

A relação entre a atuação policial e os Direitos Humanos é o tema mais prático e direto da disciplina para os concursos de carreiras policiais. As bancas CEBRASPE, FGV e VUNESP cobram os princípios internacionais que regulam o uso da força pelos agentes de segurança pública, com base nos documentos da ONU: o **Código de Conduta para os Funcionários Responsáveis pela Aplicação da Lei** (1979) e os **Princípios Básicos sobre o Uso da Força e de Armas de Fogo** (1990). O policial que desconhece esses limites arrisca cometer crimes e violar tratados internacionais.

---

## 2. Código de Conduta para Funcionários Responsáveis pela Aplicação da Lei (ONU, 1979)

### 2.1. Artigos Principais

| Artigo | Conteúdo |
|---|---|
| **Art. 1°** | Funcionários responsáveis pela aplicação da lei devem cumprir suas funções a serviço da comunidade e proteger todas as pessoas contra atos ilegais |
| **Art. 2°** | Devem respeitar e proteger a dignidade humana e manter e apoiar os direitos humanos de todas as pessoas |
| **Art. 3°** | Só podem usar a força quando estritamente necessário e na medida exigida para o cumprimento do dever |
| **Art. 5°** | Nenhum funcionário pode infligir, instigar ou tolerar qualquer ato de tortura |
| **Art. 7°** | Não cometerão atos de corrupção e se oporão rigorosamente a tais atos |
| **Art. 8°** | Devem respeitar a lei e este Código, e impedir violações |

### 2.2. Conceito de "Funcionário Responsável pela Aplicação da Lei"
Inclui todos os agentes da lei, nomeados ou eleitos, que exercem poderes policiais, especialmente de prisão e detenção. Abrange policiais civis, militares, federais, guardas municipais e agentes penitenciários.

---

## 3. Princípios Básicos sobre o Uso da Força e de Armas de Fogo (ONU, 1990)

### 3.1. Princípios Norteadores

| Princípio | Definição |
|---|---|
| **Legalidade** | O uso da força deve estar previsto em lei |
| **Necessidade** | A força só deve ser usada quando não houver outro meio eficaz |
| **Proporcionalidade** | A intensidade da força deve ser proporcional à ameaça enfrentada |
| **Moderação** | Usar o mínimo de força necessário para atingir o objetivo legítimo |
| **Conveniência** | Utilizar meios adequados e autorizados |

### 3.2. Uso de Armas de Fogo
Os Princípios Básicos estabelecem que o uso de armas de fogo é medida **extrema** e só deve ocorrer quando:
* Houver risco iminente de morte ou lesão grave (legítima defesa própria ou de terceiros).
* Para prevenir crime particularmente grave que envolva ameaça à vida.
* Para prender pessoa que represente perigo e resista à autoridade.
* **Sempre**: O agente deve se identificar, dar clara advertência da intenção de usar arma de fogo e dar tempo suficiente para que a advertência seja cumprida (exceto se isso colocar o agente ou terceiros em perigo).

### 3.3. Após o Uso da Força
* Prestar socorro médico aos feridos o mais rápido possível.
* Comunicar imediatamente aos superiores hierárquicos.
* Garantir que familiares dos feridos ou mortos sejam notificados.
* Investigação independente de todo incidente envolvendo morte ou lesão grave.

---

## 4. Modelo de Uso Progressivo (Escalonado) da Força

| Nível | Comportamento do Cidadão | Resposta Policial |
|---|---|---|
| **1** | Cooperativo | Presença policial, verbalização |
| **2** | Resistência passiva (não obedece, corpo mole) | Verbalização, controle de contato (mãos) |
| **3** | Resistência ativa (empurra, tenta fugir) | Imobilização, técnicas de controle, uso de algemas |
| **4** | Agressão não letal (socos, chutes, objetos) | Uso de agentes químicos (spray de pimenta), arma de menor potencial ofensivo (Taser) |
| **5** | Agressão letal (arma de fogo, faca, risco de morte) | Uso de arma de fogo (força letal) |

**Princípio**: A resposta policial deve ser **gradual e proporcional** ao nível de resistência ou agressão. O objetivo é **resolver** a situação com o **mínimo de dano** possível.

---

## 5. Uso de Algemas

### 5.1. Súmula Vinculante 11 (STF)
"Só é lícito o uso de algemas em casos de **resistência** e de **fundado receio de fuga ou de perigo à integridade física** própria ou alheia, por parte do preso ou de terceiros, justificada a excepcionalidade por escrito, sob pena de responsabilidade disciplinar, civil e penal do agente ou da autoridade e de **nulidade da prisão** ou do ato processual a que se refere, sem prejuízo da responsabilidade civil do Estado."

### 5.2. Regra Prática
* O uso de algemas é **exceção**, não regra.
* Deve haver **justificativa escrita** (resistência, risco de fuga, perigo).
* Uso injustificado pode causar **nulidade da prisão**.

---

## 6. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — PRF — Policial)
**Enunciado**: Segundo o Código de Conduta da ONU para Funcionários Responsáveis pela Aplicação da Lei, os agentes policiais podem usar a força sempre que julgarem conveniente para manter a ordem pública.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: O art. 3° do Código de Conduta estabelece que a força só pode ser usada quando **estritamente necessário** e na **medida exigida** para o cumprimento do dever. Não é uma decisão discricionária baseada em conveniência.

### Questão 2 (FGV — PCRJ — Inspetor)
**Enunciado**: De acordo com os Princípios Básicos da ONU sobre o Uso da Força, antes de utilizar arma de fogo, o agente deve:
a) Obter autorização judicial prévia.
b) Identificar-se e dar clara advertência de sua intenção.
c) Consultar o superior hierárquico por rádio.
d) Registrar boletim de ocorrência preventivo.
e) Solicitar reforço policial e aguardar.

* **Gabarito: B**
* **Comentário**: Os Princípios Básicos exigem identificação e advertência clara antes do uso da arma de fogo, com tempo para cumprimento, salvo se isso colocar o agente ou terceiros em perigo imediato.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: De acordo com a Súmula Vinculante 11 do STF, o uso de algemas:
a) É sempre obrigatório em qualquer prisão em flagrante.
b) Só é lícito em casos de resistência ou fundado receio de fuga ou perigo.
c) É proibido em qualquer circunstância.
d) Depende de autorização judicial prévia.
e) Só é permitido para presos por crimes hediondos.

* **Gabarito: B**
* **Comentário**: A SV 11 estabelece que o uso de algemas é excepcional, cabível apenas em caso de resistência, fundado receio de fuga ou perigo à integridade física, devendo ser justificado por escrito.

---

## 7. Pegadinhas Mais Frequentes

1. **Uso da força NÃO é discricionário**: É vinculado aos princípios de legalidade, necessidade e proporcionalidade.
2. **Arma de fogo é último recurso**: Só em caso de risco iminente de morte ou lesão grave.
3. **Algemas são exceção, não regra**: Uso injustificado pode anular a prisão (SV 11).
4. **Após uso da força com lesão, há dever de socorro**: Prestar assistência médica é obrigatório, mesmo para o agressor.

---

## 8. Quadro-Resumo

| Documento | Ano | Foco |
|---|---|---|
| **Código de Conduta (ONU)** | 1979 | Deveres dos agentes de segurança |
| **Princípios Básicos (ONU)** | 1990 | Uso da força e armas de fogo |
| **Súmula Vinculante 11 (STF)** | 2008 | Uso de algemas |

---

## 9. Conclusão

A atuação policial em conformidade com os Direitos Humanos não é uma limitação, mas uma garantia de legitimidade e legalidade da ação do Estado. O policial que conhece os princípios de uso da força (legalidade, necessidade, proporcionalidade, moderação), as regras sobre armas de fogo e algemas, e os documentos internacionais da ONU está preparado tanto para a prova quanto para a carreira.',
  'Estudo da Atuação Policial e Direitos Humanos para concursos policiais. Aborda o Código de Conduta da ONU (1979), os Princípios Básicos sobre Uso da Força e Armas de Fogo (1990), o modelo de uso progressivo da força, a Súmula Vinculante 11 (algemas) e os princípios de legalidade, necessidade e proporcionalidade. Inclui questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
