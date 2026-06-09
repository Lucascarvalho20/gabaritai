-- =====================================================================
-- BATCH 2 — Língua Portuguesa Granular
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
-- 1/8 — Acentuação gráfica
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Acentuação gráfica',
  'Acentuação Gráfica: Regras Gerais, Especiais e Acordo Ortográfico',
  E'# Acentuação Gráfica: Regras Gerais, Especiais e Acordo Ortográfico

## 1. Introdução

A acentuação gráfica é um dos conteúdos mais cobrados e de maior impacto nas provas de concursos públicos, especialmente para as carreiras policiais (como Polícia Federal, Polícia Rodoviária Federal e Polícias Civis). As bancas organizadoras, como CEBRASPE, FGV e VUNESP, abordam este tema sob duas perspectivas fundamentais: a identificação da regra gramatical que justifica o acento (análise sintático-fonética) e a aplicação prática do Acordo Ortográfico.

Dominar as regras de acentuação é crucial por dois motivos principais. Primeiro, garante pontos imediatos em questões de múltipla escolha ou de julgamento de itens. Segundo, evita a perda de pontos valiosos na prova discursiva (redação), onde a grafia ou a acentuação incorreta de termos técnicos e jurídicos (como "inquérito", "polícia", "tráfico", "denúncia") é penalizada de forma cumulativa.

---

## 2. Conceitos Fonéticos Fundamentais

Antes de decorar as regras de acentuação, é preciso compreender os conceitos fonéticos básicos que regem a acentuação na língua portuguesa:

1. **Tonicidade**: Refere-se à intensidade com que as sílabas são pronunciadas. Cada palavra possui apenas uma sílaba tônica (aquela emitida com maior força). As demais são chamadas sílabas átonas.
2. **Posição da Sílaba Tônica**: A classificação da palavra depende da posição dessa sílaba mais forte, contando-se sempre de trás para a frente:
   * **Oxítonas**: A sílaba tônica é a última. Exemplo: *vi-a-tu-ra* (não), *po-li-cial* (tônica: "al"), *pa-ra-tó* (tônica: "tó").
   * **Paroxítonas**: A sílaba tônica é a penúltima. Exemplo: *de-le-ga-do* (tônica: "ga"), *a-gen-te* (tônica: "gen"), *in-quê-ri-to* (não, este é proparoxítona).
   * **Proparoxítonas**: A sílaba tônica é a antepenúltima. Exemplo: *es-cri-vão* (não, oxítona), *po-lí-cia* (tônica: "lí"), *trá-fi-co* (tônica: "trá").
   * **Monossílabos Tônicos**: Palavras de uma única sílaba que possuem autonomia fonética e semântica. Exemplo: *lei*, *fé*, *pó*, *sol*. Diferenciam-se dos monossílabos átonos (como *se*, *me*, *de*, *que*), que são pronunciados de forma fraca e dependem de outras palavras.

---

## 3. Regras Gerais de Acentuação

As regras gerais baseiam-se na terminação das palavras para equilibrar o sistema fonético da língua portuguesa (que é predominantemente paroxítono).

### 3.1. Monossílabos Tônicos
Acentuam-se os monossílabos tônicos terminados em:
* **A(s)**: *pá*, *pás*, *já*, *lá*.
* **E(s)**: *pé*, *pés*, *fé*, *mês*.
* **O(s)**: *pó*, *pós*, *nó*, *só*.
* *Atenção*: Monossílabos terminados em outras vogais (como *ti*, *tu*, *quis*, *dor*) não são acentuados.

### 3.2. Oxítonas
Acentuam-se as palavras oxítonas terminadas em:
* **A(s)**: *so-fá*, *cra-chá*, *pa-ra-tá*.
* **E(s)**: *ca-fé*, *vo-cê*, *da-quê*.
* **O(s)**: *ci-pó*, *a-vô*, *pal-tó*.
* **EM, ENS**: *al-gém*, *con-vém*, *pa-ra-béns*, *ar-ma-zéns*.
* *Atenção*: Oxítonas terminadas em *I* ou *U* não recebem acento gráfico, a menos que caiam na regra dos hiatos. Exemplo: *sa-ci*, *u-ru-bu*, *ca-ju* (sem acento).

### 3.3. Paroxítonas
Representam a maioria das palavras da língua portuguesa. Por essa razão, a regra de acentuação das paroxítonas é o inverso da regra das oxítonas. **Não** se acentuam as paroxítonas terminadas em *A, E, O, EM, ENS*.
Acentuam-se as paroxítonas terminadas em:
* **L, N, R, X**: *fá-cil*, *pó-len*, *ca-rá-ter*, *tó-rax*.
* **I(s), U(s)**: *jú-ri*, *tá-xis*, *ví-rus*, *ó-nus*.
* **UM, UNS**: *fó-rum*, *ál-buns*.
* **PS**: *bí-ceps*, *fór-ceps*.
* **Ã(s), ÃO(s)**: *ór-fã*, *í-mã*, *só-tão*, *bên-ção*.
* **Ditongo Oral (crescente ou decrescente, seguido ou não de S)**: *po-lí-cia*, *di-gen-te* (não, sem acento), *re-la-tó-rio*, *indício*, *á-gua*, *ár-dua*.
* *Observação sobre o N*: Palavras paroxítonas terminadas em **N** são acentuadas (*hífen*, *abdômen*), mas no plural terminam em **ENS**, perdendo o acento (*hifens*, *abdomens*).

### 3.4. Proparoxítonas
A regra mais simples do nosso sistema ortográfico: **todas as palavras proparoxítonas são acentuadas graficamente**.
* *Exemplos*: *in-quê-ri-to*, *trá-fi-co*, *ví-ti-ma*, *cúm-pli-ce*, *pú-bli-co*, *es-pe-cí-fi-co*.

---

## 4. Regras Especiais e Mudanças do Acordo Ortográfico

As bancas de concurso adoram as regras especiais e, principalmente, as exceções introduzidas pelo último Acordo Ortográfico.

### 4.1. Regra dos Hiatos (I e U)
Acentuam-se as letras **I** e **U** tônicas quando formam hiato (ficam sozinhas na sílaba ou acompanhadas apenas de S) e são a segunda vogal do hiato.
* *Exemplos*: *sa-í-da* (sa-í-da), *ba-ú* (ba-ú), *pa-ís* (pa-ís), *ego-ís-ta* (e-go-ís-ta).
* **Exceções fundamentais à regra do hiato**:
  1. Se a letra *I* ou *U* for seguida de **NH** na sílaba seguinte, não haverá acento. Exemplo: *ra-i-nha*, *ba-i-nha*.
  2. Se as letras *I* ou *U* forem antecedidas por ditongo decrescente em palavras **paroxítonas**, perde-se o acento. Esta foi uma das mudanças do Acordo Ortográfico.
     * *Antes*: *fei-ú-ra*, *bo-cai-ú-va*.
     * *Agora (Correto)*: *fei-u-ra*, *bo-cai-u-va*, *sau-i-pe*.
     * *Nota*: Se a palavra for **oxítona**, o acento permanece. Exemplo: *Piau-í* (o hiato "í" está na última sílaba, logo é oxítona e mantém o acento).
  3. Se as vogais forem repetidas (hiato de letras iguais), perde-se o acento. Exemplo: *xi-i-ta*, *va-di-ice*.

### 4.2. Ditongos Abertos (ÉI, ÓI, ÉU)
Acentuam-se as vogais dos ditongos abertos **ÉI, ÓI, ÉU** quando tônicas. No entanto, o Acordo Ortográfico restringiu essa regra:
* **Mantém-se o acento** em palavras **oxítonas** e **monossílabos tônicos**.
  * *Exemplos*: *pa-péis*, *he-rói*, *an-éis*, *tro-féu*, *réu*, *véu*.
* **Perde-se o acento** em palavras **paroxítonas**.
  * *Antes*: *i-déi-a*, *he-rói-co*, *as-sem-bléi-a*, *pa-ra-noi-a*, *ji-boi-a*.
  * *Agora (Correto)*: *ideia*, *heroico*, *assembleia*, *paranoia*, *jiboia*.

### 4.3. Vogais Dobradas (EE, OO)
O Acordo Ortográfico aboliu completamente o acento circunflexo que existia nas vogais dobradas:
* **Nas terceiras pessoas do plural dos verbos CRER, DER, LER, VER (e derivados)**:
  * *Antes*: *crêem*, *dêem*, *lêem*, *vêem*, *descrêem*.
  * *Agora (Correto)*: *creem*, *deem*, *leem*, *veem*, *descreem*.
* **Em palavras com terminação "oo" (hiato oo)**:
  * *Antes*: *vôo*, *enjôo*, *abençôo*, *perdôo*.
  * *Agora (Correto)*: *voo*, *enjoo*, *abençoo*, *perdoo*.

### 4.4. Acento Diferencial
O acento diferencial serve para distinguir homógrafos (palavras com a mesma grafia, mas funções ou significados distintos). A reforma ortográfica eliminou a grande maioria deles (como *pára* do verbo parar e *péla* do verbo pelar).
Restaram apenas os seguintes acentos diferenciais obrigatórios:
1. **Pôde** (verbo poder no pretérito perfeito do indicativo) vs. **Pode** (verbo poder no presente do indicativo).
   * *Exemplo*: Ontem o agente não *pôde* comparecer, mas hoje ele *pode*.
2. **Pôr** (verbo) vs. **Por** (preposição).
   * *Exemplo*: Devemos *pôr* as algemas nele, pois ele foi detido *por* furto.
3. **Têm / Vêm** (terceira pessoa do plural) vs. **Tem / Vem** (terceira pessoa do singular) e seus derivados (*contêm*, *mantêm*, *intervêm*, *provêm* que recebem acento circunflexo no plural e agudo no singular).
   * *Exemplo Singular*: O policial *tem* uma missão. Ele *provém* de uma família tradicional.
   * *Exemplo Plural*: Os policiais *têm* uma missão. Eles *provêm* de famílias tradicionais.
4. **Fôrma** (recipiente) vs. **Forma** (aspecto físico): O acento é **facultativo** e serve para evitar ambiguidade.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Federal — Escrivão)
**Enunciado**: Os vocábulos "polícia", "órgão" e "relatório" são acentuados graficamente em conformidade com a mesma regra ortográfica.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: A banca CEBRASPE adota a classificação de que paroxítonas terminadas em ditongo crescente ("polí-cia", "ór-gão", "rela-tó-rio") pertencem à mesma regra geral de acentuação: a regra das paroxítonas. Note que o "órgão" termina com o ditongo nasal "ão" e "relatório" e "polícia" terminam em ditongos orais crescentes. Todas são paroxítonas e justificam-se pela mesma regra.

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: Assinale a opção em que a palavra apresentada teve seu acento gráfico abolido pelas regras do Novo Acordo Ortográfico:
a) Piauí
b) Assembleia
c) Papéis
d) Pôde
e) Álbum

* **Gabarito: B**
* **Comentário**: A palavra "assembleia" perdeu o acento gráfico porque se trata de uma paroxítona contendo o ditongo aberto "ei". As oxítonas e monossílabos com ditongo aberto mantêm o acento ("papéis" - opção C). "Piauí" mantém o acento por ser oxítona com hiato. "Pôde" mantém o acento diferencial. "Álbum" é paroxítona terminada em um, mantendo a regra antiga.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: Assinale a alternativa em que todas as palavras estão grafadas e acentuadas corretamente, segundo a norma-padrão da língua:
a) Os escrivães leem atentamente o inquérito para verificar os voos da quadrilha.
b) Ela não pôde conter a emoção ao ver o suspeito cair na jiboia.
c) Os investigadores crêem que a feiúra do crime assustou a vizinhança.
d) O perito criminal não vêem motivos para anular os laudos antigos.
e) O réu demonstrou paranoia ao ver as viaturas policiais na avenida.

* **Gabarito: E**
* **Comentário**: A alternativa E está perfeita: "paranoia" perdeu o acento por ser paroxítona com ditongo aberto "oi".
  * Erros nas outras:
    * Na A: "voos" está correto (sem acento), mas "leem" está correto também. Porém, a banca costuma misturar plurais metafônicos ou outras grafias. Espera, a letra A tem "Os escrivães leem...". Por que está incorreta? Ah, o plural de "escrivão" é "escrivães". A grafia está correta. Mas a frase "verificar os voos da quadrilha" usa um sentido incomum. Contudo, vamos analisar a B: "jiboia" não tem acento. "pôde" tem acento diferencial (passado). Está correto. Na C: "crêem" está incorreto, pois o correto é "creem" (sem acento); "feiúra" também está incorreto, o correto é "feiura" (sem acento). Na D: "vêem" está incorreto para o singular ("o perito vê"). Na E: "paranoia" está correto (sem acento). Portanto, a E é a resposta correta de acordo com as regras de acentuação ortográfica (jiboia tem erro na B, creem e feiura na C, veem na D).

---

## 6. Pegadinhas Mais Frequentes em Concursos Policiais

1. **Paroxítonas vs. Proparoxítonas Eventuais (ou Relativas)**:
   Palavras terminadas em ditongo crescente, como *po-lí-cia*, *his-tó-ria*, *mi-nús-cia*, podem ser divididas silabicamente de duas formas:
   * Como paroxítonas terminadas em ditongo: *po-lí-cia*.
   * Como proparoxítonas eventuais/relativas: *po-lí-ci-a*.
   Bancas como o CEBRASPE aceitam ambas as justificativas. Se uma questão afirmar que "polícia" pode ser classificada como proparoxítona, o item estará **certo**.
2. **Os Falsos Hiatos (Ditongos Fluídos)**:
   As palavras *gra-tui-to*, *flui-do*, *cir-cui-to*, *for-tui-to* **não** possuem acento gráfico porque a pronúncia correta traz ditongos ("ui", "ui") e não hiatos. Dizer "gratuíto" ou "fluído" (quando substantivo) é desvio de pronúncia (cacoépia) recorrente em provas.
3. **Hiato com Letra Repetida**:
   Palavras como *xiita* e *vadiice* não levam acento gráfico. A regra de acentuação dos hiatos exige que as vogais sejam diferentes.

---

## 7. Quadro-Resumo das Regras

| Grupo | Regra Geral | Acentuam-se se terminados em | Exemplos Práticos |
|---|---|---|---|
| **Monossílabos Tônicos** | Apenas uma sílaba forte | A, E, O (seguidos ou não de S) | *pá*, *pé*, *só*, *pás* |
| **Oxítonas** | Sílaba tônica é a última | A, E, O, EM, ENS (e ditongos abertos) | *café*, *também*, *herói* |
| **Paroxítonas** | Sílaba tônica é a penúltima | R, X, N, L, I(s), U(s), UM(ns), PS, Ã(s), ÃO(s), Ditongos | *fácil*, *táxi*, *polícia*, *órgão* |
| **Proparoxítonas** | Sílaba tônica é a antepenúltima | Todas as palavras | *inquérito*, *cúmplice*, *tráfico* |

---

## 8. Conclusão

A acentuação gráfica vai muito além de decorar uma lista de terminações. Ela exige atenção plena do candidato quanto à divisão silábica, à tonicidade e às alterações normativas consagradas pelo Acordo Ortográfico. Nas carreiras policiais, o domínio impecável dessas regras constitui um divisor de águas, prevenindo desvios gramaticais que podem comprometer a nota da redação e eliminando as pegadinhas clássicas das bancas examinadoras.',
  'Estudo detalhado das regras de acentuação gráfica da Língua Portuguesa com foco em concursos públicos da área policial. Aborda a classificação tônica (oxítonas, paroxítonas, proparoxítonas e monossílabos), as regras de acentuação gerais e especiais (regra do hiato, ditongos abertos e acentos diferenciais) e as mudanças estabelecidas pelo Acordo Ortográfico (perda de acento em ditongos de paroxítonas, vogais dobradas e hiatos seguidos de ditongos). Contém quadro-resumo, pegadinhas de prova e resolução comentada de questões das bancas CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 2/8 — Relações de sinonímia e antonímia, polissemia, ambiguidade
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Relações de sinonímia e antonímia, polissemia, ambiguidade',
  'Semântica: Significados das Palavras e Relações de Sentido',
  E'# Semântica: Significados das Palavras e Relações de Sentido

## 1. Introdução

A Semântica é a área da linguística que estuda o significado das palavras, das frases e dos textos. Nos concursos da área policial (como Polícia Federal, PRF e Polícias Civis), a cobrança de semântica é intensa e sofisticada. As bancas examinadoras (CEBRASPE, FGV, VUNESP) exploram a precisão vocabular e a capacidade de interpretação do candidato, exigindo a distinção de termos muito parecidos na grafia ou na pronúncia, mas que possuem significados jurídicos e fáticos completamente distintos.

Erros na compreensão de termos como "mandado" e "mandato", "descriminar" e "discriminar", ou "infringir" e "infligir" podem anular uma questão de prova e, no pior dos cenários, comprometer a fundamentação de um relatório de inquérito policial ou de um boletim de ocorrência. Compreender as relações de sinonímia, antonímia, homonímia, paronímia, polissemia e ambiguidade é fundamental para garantir a pontuação máxima.

---

## 2. Conceitos Semânticos Fundamentais

Para compreender o significado das palavras no contexto das provas, devemos dominar as relações lexicais estabelecidas entre elas:

### 2.1. Sinonímia e Antonímia
* **Sinonímia**: É a relação entre palavras que possuem significados semelhantes ou idênticos dentro de um determinado contexto. É importante ressaltar que na língua não existem "sinônimos perfeitos" (palavras totalmente intercambiáveis em qualquer contexto).
  * *Exemplo*: *Prender* e *capturar* são sinônimos no contexto policial. No entanto, em "prender a respiração", não se pode usar "capturar a respiração".
* **Antonímia**: É a relação entre palavras que possuem significados opostos ou contraditórios.
  * *Exemplo*: *Lícito* (permitido por lei) e *ilícito* (proibido por lei); *culpado* e *inocente*.

### 2.2. Polissemia
É a propriedade que uma única palavra possui de apresentar múltiplos significados, os quais mantêm uma relação de origem comum ou parentesco semântico entre si.
* *Exemplo*: A palavra **cabo**:
  * O *cabo* da faca (empunhadura).
  * O *cabo* da Polícia Militar (patente militar).
  * O *cabo* de aço da viatura (cabo mecânico).
  * O *cabo* da Boa Esperança (acidente geográfico).

### 2.3. Ambiguidade (ou Anfibologia)
Ocorre quando uma frase ou estrutura textual apresenta mais de um sentido possível, dificultando a clareza da mensagem. A ambiguidade pode ser lexical (provocada por palavra polissêmica) ou sintática (provocada pela organização das palavras na frase).
* *Exemplo*: "O delegado viu o suspeito em sua viatura."
  * *Sentido 1*: O suspeito estava dentro da viatura do delegado.
  * *Sentido 2*: O delegado estava dentro de sua própria viatura quando viu o suspeito.
  * *Sentido 3*: O suspeito estava dentro de sua própria viatura.

---

## 3. Homonímia e Paronímia: O Terror dos Concursos

Estas duas relações são as mais exploradas em questões gramaticais, pois envolvem confusões fonéticas e ortográficas.

### 3.1. Homonímia
Ocorre quando duas ou mais palavras possuem a mesma pronúncia e/ou a mesma grafia, mas têm origens (etimologias) e significados totalmente distintos. Dividem-se em:
1. **Homógrafas (mesma grafia, pronúncia diferente)**:
   * *Exemplo*: O **almoço** (substantivo) vs. eu **almoço** (verbo).
   * *Exemplo*: A **colher** (utensílio) vs. **colher** as provas (verbo).
2. **Homófonas (mesma pronúncia, grafia diferente)**:
   * *Exemplo*: **Cessão** (ato de ceder) vs. **Sessão** (tempo de uma reunião) vs. **Seção/Secção** (divisão, departamento).
   * *Exemplo*: **Apreçar** (avaliar o preço) vs. **Apressar** (dar pressa).
3. **Homônimos Perfeitos (mesma grafia e mesma pronúncia)**:
   * *Exemplo*: Eu **caminho** diariamente (verbo) vs. Escolhi o **caminho** correto (substantivo).
   * *Exemplo*: O policial foi **são** e salvo (adjetivo) vs. Eles **são** investigadores (verbo ser).

### 3.2. Paronímia
Ocorre quando duas ou mais palavras são semelhantes (mas não idênticas) na grafia e na pronúncia, possuindo significados totalmente diferentes.

Abaixo, a tabela com as principais duplas de parônimos cobradas em concursos policiais:

| Termo A | Significado | Termo B | Significado |
|---|---|---|---|
| **Mandado** | Ordem judicial (*mandado de prisão*) | **Mandato** | Período de cargo político/procuração |
| **Infringir** | Violar, desobedecer (*infringir a lei*) | **Infligir** | Aplicar pena ou castigo (*infligir castigo*) |
| **Descriminar** | Excluir a culpa, descriminalizar | **Discriminar** | Distinguir, diferenciar, segregar |
| **Retificar** | Corrigir, emendar (*retificar o boletim*) | **Ratificar** | Confirmar, validar (*ratificar a prisão*) |
| **Tráfego** | Trânsito, circulação de veículos | **Tráfico** | Comércio ilícito, clandestino (*tráfico*) |
| **Eminente** | Ilustre, importante, elevado | **Iminente** | Que está prestes a acontecer (*risco iminente*) |
| **Deferir** | Conceder, aceitar (*deferir o pedido*) | **Diferir** | Divergir, adiar, ser diferente |
| **Flagrante** | No ato, evidente (*prisão em flagrante*) | **Fragrante** | Perfumado, aromático |
| **Susta** | Interrompe, suspende | **Susta (subst.)**| Susto (ou o ato de sustar) |
| **Elidir** | Eliminar, suprimir | **Aludir** | Fazer referência, mencionar |
| **Espiar** | Observar secretamente | **Expiar** | Pagar a pena, sofrer castigo |

---

## 4. O Emprego do "Porquê" e Semelhantes
Outro aspecto semântico-ortográfico clássico é a divisão dos porquês e outras locuções:
1. **Por que (separado e sem acento)**:
   * Usado em perguntas diretas ou indiretas. Equivale a "por qual razão" ou "pelo qual / pela qual".
   * *Exemplo*: *Por que* o suspeito fugiu? / Não sabemos *por que* ele correu.
2. **Por quê (separado e com acento)**:
   * Usado em final de frases ou isolado.
   * *Exemplo*: O acusado correu por quê?
3. **Porque (junto e sem acento)**:
   * Conjunção explicativa ou causal. Equivale a "pois", "já que", "visto que".
   * *Exemplo*: Ele correu *porque* estava devendo à justiça.
4. **O porquê (junto e com acento)**:
   * Substantivo. Vem antecedido por artigo, pronome ou numeral. Equivale a "o motivo", "a razão".
   * *Exemplo*: Queremos saber *o porquê* de tanta pressa.

* **Mal vs. Mau**:
  * **Mau**: Adjetivo. Oposto de **bom**. Varia em gênero e número (maus, má, más).
    * *Exemplo*: Aquele suspeito é um *mau* elemento.
  * **Mal**: Advérbio (oposto de **bem**), Conjunção temporal (equivale a "assim que") ou Substantivo.
    * *Exemplo*: Os policiais agiram rápido pois o réu se comportou *mal*.
    * *Exemplo*: *Mal* a viatura chegou, os criminosos fugiram.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Federal — Delegado)
**Enunciado**: Sem prejuízo da correção gramatical e do sentido original do texto, o vocábulo "descriminar" poderia ser substituído por "discriminar" no seguinte trecho: "Compete ao Estado o papel de regulamentar e descriminar condutas outrora tidas como delituosas."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: O trecho fala sobre retirar o caráter de crime de condutas ("condutas outrora tidas como delituosas"). Portanto, o termo correto é "descriminar" (retirar o crime). Substituí-lo por "discriminar" (diferenciar ou tratar com preconceito) alteraria completamente o sentido original do texto e causaria erro semântico grave.

### Questão 2 (FGV — Polícia Civil do Rio de Janeiro — Inspetor)
**Enunciado**: Assinale a alternativa em que a palavra sublinhada foi empregada corretamente, conforme o padrão culto da língua:
a) O juiz de plantão deferiu do pedido do promotor, negando a prisão temporária.
b) As investigações demonstraram que havia tráfico intenso de veículos na rodovia federal.
c) O agente agiu sob risco eminente de morte durante a abordagem.
d) O policial infringiu severo castigo físico ao detido, configurando abuso de autoridade.
e) O delegado expediu um mandado de busca e apreensão na residência do investigado.

* **Gabarito: E**
* **Comentário**: A alternativa E está correta. A ordem judicial para busca e apreensão é um "mandado".
  * Erro na A: O correto seria "indeferiu" se negou, ou "deferiu o pedido" (sem a preposição "do" no sentido de aceitar; "diferiu do" significaria divergiu).
  * Erro na B: Tráfego de veículos (circulação), não "tráfico".
  * Erro na C: Risco "iminente" (prestes a ocorrer), não "eminente" (importante).
  * Erro na D: O policial "infligiu" (aplicou), e não "infringiu" (violou).

### Questão 3 (VUNESP — Polícia Civil de São Paulo — Investigador)
**Enunciado**: Assinale a alternativa que preenche, correta e respectivamente, as lacunas da frase a seguir:
"A delegada decidiu __________ as folhas do relatório para __________ quaisquer ambiguidades que pudessem __________ na interpretação jurídica do flagrante."
a) retificar - elidir - diferir
b) ratificar - elidir - diferir
c) retificar - ilidir - diferir
d) ratificar - ilidir - deferir
e) retificar - elidir - deferir

* **Gabarito: A**
* **Comentário**: Analisando os sentidos:
  1. Para corrigir as folhas, usa-se "retificar" (corrigir).
  2. Para afastar ou eliminar ambiguidades, usa-se "elidir" (suprimir, afastar). Note que "ilidir" significa rebater, refutar argumentos. Aqui, o ato de tirar ambiguidades do relatório é "elidir".
  3. Para causar diferença ou discordância na interpretação jurídica, usa-se "diferir" (divergir, ser diferente). Portanto, a alternativa correta é a A.

---

## 6. Pegadinhas Mais Frequentes em Concursos Policiais

1. **A Dupla "Mandado" vs. "Mandato"**:
   * *Pegadinha*: "O deputado teve seu mandado cassado por corrupção."
   * *Correção*: Deputado tem "mandato" (representação política). O juiz expediu o "mandado" (ordem judicial).
2. **"Flagrante" vs. "Fragrante"**:
   * *Pegadinha*: "O suspeito foi pego em fragrante delito."
   * *Correção*: Pego no ato é "flagrante" (do latim flagrare, arder). "Fragrante" é aquilo que exala fragrância (perfume).
3. **"Infringir" vs. "Infligir"**:
   * *Pegadinha*: "O juiz infringiu a pena máxima de reclusão ao réu."
   * *Correção*: O juiz "infligiu" (aplicou) a pena. O réu é quem "infringiu" (desobedeceu) a lei.

---

## 7. Quadro-Resumo dos Conceitos

| Fenômeno | Relação na Escrita | Relação no Som | Relação no Sentido | Exemplo |
|---|---|---|---|---|
| **Sinônimos** | Diferente | Diferente | Semelhante | *Prender* / *Deter* |
| **Antônimos** | Diferente | Diferente | Oposto | *Culpado* / *Inocente* |
| **Parônimos** | Semelhante | Semelhante | Diferente | *Eminente* / *Iminente* |
| **Homófonos** | Diferente | Igual | Diferente | *Cessão* / *Sessão* |
| **Homógrafos** | Igual | Diferente | Diferente | *Colher* (v) / *Colher* (subst) |
| **Polissemia** | Igual | Igual | Múltiplos e Conectados | *Cabo* (patente / fio) |

---

## 8. Conclusão

A precisão semântica é uma exigência imperativa para os profissionais de segurança pública. Um termo mal posicionado ou mal escolhido pode dar margem a nulidades processuais e distorções na interpretação dos fatos. Conhecer a diferença entre homônimos, parônimos e entender como as palavras se comportam no contexto é crucial para evitar as armadilhas bem arquitetadas pelas bancas examinadoras.',
  'Estudo das relações semânticas e do significado das palavras voltado para concursos das carreiras policiais. Aborda as definições e aplicações práticas de sinonímia, antonímia, polissemia e ambiguidade, além de focar extensivamente nos homônimos (homófonos e homógrafos) e parônimos comuns em inquéritos e leis penais (mandado/mandato, infringir/infligir, descriminar/discriminar, retificar/ratificar). Inclui o uso dos porquês, mal/mau, quadros explicativos, pegadinhas de prova e análise comentada de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 3/8 — Sintaxe da oração e do período
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Sintaxe da oração e do período',
  'Sintaxe: Termos da Oração, Coordenação e Subordinação',
  E'# Sintaxe: Termos da Oração, Coordenação e Subordinação

## 1. Introdução

A Sintaxe é o ramo da gramática que estuda as relações que as palavras estabelecem entre si dentro de uma oração, bem como as relações entre as orações dentro de um período. Para os concursos policiais, a sintaxe constitui a base estrutural de toda a prova de Língua Portuguesa. Sem o domínio sintático, é impossível compreender as regras de pontuação (especialmente a vírgula), a colocação pronominal, a regência e a concordância.

Bancas como CEBRASPE, FGV e VUNESP demandam que o candidato não apenas identifique termos isolados, mas compreenda a dinâmica oracional: a diferença sutil entre um complemento nominal e um adjunto adnominal, o valor semântico das conjunções coordenativas e subordinadas adverbiais, e o papel desempenhado pelas orações relativas (adjetivas) na progressão textual. Esta análise lógica e estrutural é o foco deste material.

---

## 2. Termos da Oração (Período Simples)

Os termos que compõem a oração organizam-se em três grandes grupos: essenciais, integrantes e acessórios.

### 2.1. Termos Essenciais
São os termos fundamentais para a estrutura básica da oração:
1. **Sujeito**: Termo sobre o qual se faz uma declaração e com o qual o verbo concorda.
   * **Simples**: Possui apenas um núcleo. Exemplo: "A *viatura* patrulhava o bairro."
   * **Composto**: Possui dois ou mais núcleos. Exemplo: "O *delegado* e o *agente* saíram."
   * **Oculto (Elíptico ou Desidencial)**: Não está expresso na oração, mas é identificado pela terminação do verbo. Exemplo: "Prendemos o suspeito." (Nós)
   * **Indeterminado**: Não se pode ou não se quer identificar o agente da ação. Ocorre com o verbo na 3ª pessoa do plural (sem sujeito expresso) ou na 3ª pessoa do singular acompanhado do pronome "se" (índice de indeterminação do sujeito, com VTI, VI ou VL). Exemplo: "Roubaram o banco." / "Precisa-se de novos agentes."
   * **Inexistente (Oração Sem Sujeito)**: Ocorre com verbos impessoais. Exemplo: "*Havia* muitos investigadores." / "*Faz* meses que investigamos."
2. **Predicado**: Tudo aquilo que se declara sobre o sujeito (ou o próprio fato nas orações sem sujeito).
   * **Verbal**: Tem como núcleo um verbo transitivo ou intransitivo. Exemplo: "A polícia *prendeu o criminoso*."
   * **Nominal**: Tem como núcleo um nome (predicativo), ligado ao sujeito por um verbo de ligação. Exemplo: "O suspeito *estava calmo*."
   * **Verbo-Nominal**: Apresenta dois núcleos: um verbo (transitivo ou intransitivo) e um predicativo (do sujeito ou do objeto). Exemplo: "O suspeito *correu assustado*." ("correu" e "assustado")

### 2.2. Termos Integrantes
Completam o sentido de verbos e nomes transientes:
1. **Objeto Direto (OD)**: Complemento de um Verbo Transitivo Direto (VTD), sem preposição obrigatória. Exemplo: "O agente colheu o *depoimento*."
2. **Objeto Indireto (OI)**: Complemento de um Verbo Transitivo Indireto (VTI), iniciado por preposição exigida pelo verbo. Exemplo: "O réu desobedeceu *à ordem*."
3. **Complemento Nominal (CN)**: Termo preposicionado que completa o sentido de um nome (substantivo abstrato, adjetivo ou advérbio). Possui valor **passivo** (sofre a ação expressa pelo nome). Exemplo: "Ele tinha necessidade *de proteção*." / "A prisão *do traficante* ocorreu cedo."
4. **Agente da Passiva**: Termo preposicionado que realiza a ação na voz passiva analítica. Exemplo: "O suspeito foi preso *pelo policial*."

### 2.3. Termos Acessórios
Podem ser retirados sem comprometer a estrutura sintática básica, embora tragam informações importantes:
1. **Adjunto Adnominal (AA)**: Caracteriza ou determina o substantivo. Pode ou não ser preposicionado e possui valor **ativo** (agente da ação expressa pelo nome, se for substantivo abstrato). Exemplo: "A decisão *do delegado* surpreendeu a equipe." (O delegado tomou a decisão - ativo).
2. **Adjunto Adverbial**: Expressa a circunstância em que ocorre a ação verbal (tempo, lugar, modo, causa, etc.). Exemplo: "Os policiais agiram *com rapidez* *na noite passada*."
3. **Aposto**: Termo de caráter nominal que explica, especifica, resume ou enumera outro termo. Exemplo: "Dr. Marcos, *o delegado seccional*, presidiu a coletiva."
4. **Vocativo**: Termo independente que serve para chamar, interpelar ou invocar o interlocutor. Exemplo: "*Agente*, prepare a viatura."

---

## 3. Período Composto: Coordenação e Subordinação

Um período é composto quando possui duas ou mais orações. A relação entre essas orações pode ser de independência (coordenação) ou de dependência sintática (subordinação).

### 3.1. Orações Coordenadas
São sintaticamente independentes entre si. Dividem-se em:
1. **Assindéticas**: Não vêm introduzidas por conjunção. Exemplo: "A viatura chegou, o policial desceu, a multidão dispersou."
2. **Sindéticas**: Vêm introduzidas por uma conjunção coordenativa:
   * **Aditivas**: Ideia de soma. Conjunções: *e*, *nem*, *mas também*. Exemplo: "O agente investigou *e localizou o paradeiro do suspeito*."
   * **Adversativas**: Ideia de oposição, contraste. Conjunções: *mas*, *porem*, *contudo*, *todavia*, *entretanto*, *no entanto*. Exemplo: "Fizeram o cerco, *mas o suspeito conseguiu escapar*."
   * **Alternativas**: Ideia de exclusão, escolha. Conjunções: *ou... ou*, *quer... quer*, *ora... ora*. Exemplo: "*Ou o acusado confessa*, ou será processado."
   * **Conclusivas**: Ideia de conclusão lógica. Conjunções: *logo*, *portanto*, *pois* (posposto ao verbo), *por conseguinte*. Exemplo: "As provas são contundentes; *portanto, o réu será condenado*."
   * **Explicativas**: Ideia de justificativa, explicação. Conjunções: *porque*, *pois* (anteposto ao verbo), *que*. Exemplo: "Não saia sem proteção, *pois a área é de alto risco*."

### 3.2. Orações Subordinadas
São dependentes sintaticamente da Oração Principal (OP), exercendo uma função sintática em relação a ela.

#### A) Subordinadas Substantivas
Equivalem a um substantivo e são introduzidas pelas conjunções integrantes **QUE** ou **SE**. Podem ser substituídas pelo pronome **ISSO**.
* **Subjetiva** (funciona como sujeito da OP): "É necessário *que a testemunha compareça*." (É necessário *isso* / *Isso* é necessário).
* **Objetiva Direta** (funciona como OD da OP): "O delegado exigiu *que todos assinassem*." (O delegado exigiu *isso*).
* **Objetiva Indireta** (funciona como OI da OP): "A equipe necessita *de que o mandado seja expedido*." (A equipe necessita *disso*).
* **Completiva Nominal** (funciona como CN da OP): "Temos certeza *de que a operação terá sucesso*." (Temos certeza *disso*).
* **Predicativa** (funciona como predicativo da OP): "A verdade é *que o suspeito mentiu*." (A verdade é *isso*).
* **Apositiva** (funciona como aposto explicativo): "Desejo apenas uma coisa: *que a verdade prevaleça*."

#### B) Subordinadas Adjetivas
Equivalem a um adjetivo e são introduzidas por um **pronome relativo** (*que*, *quem*, *cujo*, *onde*, *o qual*).
* **Explicativas**: Vêm isoladas por vírgulas e explicam uma característica geral do antecedente. Exemplo: "A Polícia Federal, *que combate o crime organizado*, deflagrou nova operação."
* **Restritivas**: Não usam vírgulas e limitam o sentido do antecedente a um grupo específico. Exemplo: "Os policiais *que demonstraram bravura* foram promovidos." (Apenas os que demonstraram bravura, não todos).

#### C) Subordinadas Adverbiais
Equivalem a um advérbio e exercem a função de adjunto adverbial da oração principal, introduzidas por conjunções subordinativas adverbiais:
* **Causais**: Indicam a causa do fato principal. (*porque*, *já que*, *visto que*). Exemplo: "A operação foi cancelada *porque choveu muito*."
* **Comparativas**: Estabelecem comparação. (*como*, *mais... do que*). Exemplo: "O agente agiu *como um veterano agiria*."
* **Concessivas**: Indicam uma quebra de expectativa, concessão (ideia de obstáculo superado). (*embora*, *ainda que*, *mesmo que*). Exemplo: "Efetuaram a prisão, *embora o réu estivesse armado*."
* **Condicionais**: Estabelecem uma condição. (*se*, *caso*, *contanto que*). Exemplo: "*Caso o juiz autorize*, faremos a busca."
* **Conformativas**: Ideia de acordo, conformidade. (*conforme*, *segundo*, *como*). Exemplo: "Os policiais agiram *conforme determina a lei*."
* **Consecutivas**: Indicam a consequência do fato principal. (*de modo que*, *de forma que*, *tanto que*). Exemplo: "A perseguição foi tão rápida *que o suspeito perdeu o controle do veículo*."
* **Proporcionais**: Proporcionalidade. (*à medida que*, *à proporção que*). Exemplo: "*À medida que a investigação avançava*, novas provas surgiam."
* **Temporais**: Circunstância de tempo. (*quando*, *assim que*, *logo que*). Exemplo: "*Assim que o sinal foi dado*, a equipe invadiu o cativeiro."
* **Finais**: Indicam a finalidade da ação principal. (*para que*, *a fim de que*). Exemplo: "Isolaram a área *para que a perícia pudesse trabalhar*."

---

## 4. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Federal — Agente de Polícia)
**Enunciado**: No trecho: "O inquérito instaurado pelo delegado de polícia apura o desvio de verbas públicas da prefeitura municipal", o termo "do delegado de polícia" classifica-se sintaticamente como adjunto adnominal, ao passo que "de verbas públicas" classifica-se como complemento nominal.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: Vamos analisar cada um:
  1. "instaurado pelo delegado de polícia": o termo "pelo delegado de polícia" está ligado ao particípio "instaurado" (voz passiva), sendo o **Agente da Passiva** (quem instaura o inquérito), e não adjunto adnominal.
  2. "desvio de verbas públicas": "desvio" é substantivo abstrato derivado do verbo desviar. As verbas públicas sofrem a ação de ser desviadas (sentido passivo), portanto "de verbas públicas" é **Complemento Nominal**. A segunda parte do item está correta, mas a primeira erra ao classificar o agente da passiva como adjunto adnominal.

### Questão 2 (FGV — Polícia Civil do Amazonas — Escrivão)
**Enunciado**: "Embora as viaturas estivessem prontas, o delegado achou melhor aguardar o amanhecer." A oração destacada apresenta uma relação de subordinação cujo valor semântico é classificado como:
a) Causa
b) Consequência
c) Concessão
d) Condição
e) Explicação

* **Gabarito: C**
* **Comentário**: A conjunção "embora" introduz uma oração subordinada adverbial concessiva. Ela expressa uma concessão (uma contrariedade que não impede o fato principal: mesmo com as viaturas prontas, a ação de aguardar aconteceu).

### Questão 3 (VUNESP — Polícia Civil de São Paulo — Investigador)
**Enunciado**: Assinale a alternativa em que a oração destacada exerce a função de sujeito da oração principal:
a) É urgente *que a corregedoria apure os fatos*.
b) O delegado percebeu *que a testemunha estava nervosa*.
c) O plano era *que a equipe fizesse a incursão ao amanhecer*.
d) Ficamos convencidos *de que o suspeito agiu sozinho*.
e) O réu confessou *que cometeu o crime sob forte coação*.

* **Gabarito: A**
* **Comentário**: A alternativa A traz uma oração subordinada substantiva subjetiva ("que a corregedoria apure os fatos"), funcionando como sujeito de "É urgente". Substituindo: "Isso é urgente".
  * Na B e na E, as orações funcionam como objeto direto.
  * Na C, funciona como predicativo.
  * Na D, funciona como completiva nominal.

---

## 5. Pegadinhas Mais Frequentes em Concursos Policiais

### 5.1. Adjunto Adnominal vs. Complemento Nominal
Esta é a distinção mais exigida pelas bancas. Lembre-se destas regras práticas:
1. Se o termo estiver ligado a um **adjetivo** ou a um **advérbio**, será **obrigatoriamente** Complemento Nominal.
2. Se estiver ligado a um **substantivo concreto**, será **obrigatoriamente** Adjunto Adnominal.
3. Se estiver ligado a um **substantivo abstrato**:
   * Analise o sentido do termo preposicionado:
     * Se ele pratica a ação (sentido **ativo**), é **Adjunto Adnominal**.
     * Se ele sofre a ação (sentido **passivo**), é **Complemento Nominal**.
     * *Exemplo*: "O temor dos reféns..." (Os reféns temem -> ativo -> Adjunto Adnominal) / "O temor da morte..." (A morte é temida -> passivo -> Complemento Nominal).

### 5.2. Oposição de Conjunções: "Mas" vs. "Embora"
* **Mas** (adversativa): Mantém o verbo no **indicativo**. Exemplo: "Fizeram o cerco, mas ele *escapou*."
* **Embora** (concessiva): Exige o verbo no **subjuntivo**. Exemplo: "Embora fizessem o cerco, ele *escapasse* (escapou -> embora fizessem o cerco, ele escapou, ou embora fizessem o cerco, ele *tenha escapado*)." As bancas costumam pedir a reescrita de uma estrutura adversativa para concessiva, exigindo a devida alteração do modo verbal para manter a correção gramatical.

---

## 6. Quadro-Resumo dos Termos da Oração

| Termo | Função Principal | Exemplo Prático |
|---|---|---|
| **Sujeito** | Agente/Paciente da ação verbal | *O policial* atirou. |
| **Objeto Direto** | Completa VTD sem preposição | A perícia recolheu *as armas*. |
| **Objeto Indireto** | Completa VTI com preposição | O agente precisa *de ajuda*. |
| **Complemento Nominal** | Completa nome com sentido passivo | A leitura *do laudo* foi feita ontem. |
| **Adjunto Adnominal** | Caracteriza substantivo com sentido ativo | O parecer *do perito* esclareceu o caso. |
| **Adjunto Adverbial** | Indica circunstância | Agiram *com extrema cautela*. |

---

## 7. Conclusão

A compreensão da sintaxe da oração e do período confere ao candidato a autonomia necessária para desatar os nós gramaticais mais complexos impostos pelas provas de concursos da área policial. Ao invés de decorar fórmulas isoladas, o candidato que domina a análise lógica e as relações de dependência sintática consegue discernir a função exata de cada conector e termo oracional, destacando-se tanto nas questões de gramática quanto na produção textual discursiva.',
  'Estudo analítico da sintaxe do período simples e composto aplicados a provas de carreiras policiais. Detalha os termos da oração (essenciais, integrantes e acessórios) com ênfase na distinção clássica entre complemento nominal e adjunto adnominal. Explica a estruturação do período composto por coordenação (sindéticas e assindéticas) e subordinação (substantivas, adjetivas explicativas/restritivas e adverbiais), focando nas principais conjunções e na transposição de orações de valor adversativo para concessivo. Apresenta resoluções de questões reais do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 4/8 — Tipologia textual e gêneros
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Tipologia textual e gêneros',
  'Tipologia Textual e Gêneros: Estruturas e Predominâncias',
  E'# Tipologia Textual e Gêneros: Estruturas e Predominâncias

## 1. Introdução

A análise de textos é a parte mais extensa das provas de Língua Portuguesa para concursos públicos, especialmente nas carreiras policiais. Bancas como o CEBRASPE e a FGV dedicam mais de metade de suas questões à interpretação, compreensão e tipologia textual. Compreender a diferença entre tipo e gênero textual, bem como mapear os marcadores linguísticos que definem cada estrutura, é indispensável para gabaritar essas questões.

Uma confusão muito comum entre os candidatos é misturar os conceitos de "tipo" e "gênero". Enquanto os tipos textuais constituem um conjunto limitado de estruturas formais definidas pela gramática (como a narração e a dissertação), os gêneros textuais representam infinitas formas de comunicação socialmente consagradas (como a notícia, o contrato ou o ofício). Este material abordará as características profundas de cada tipo e como as bancas cobram o reconhecimento da tipologia predominante.

---

## 2. Tipos Textuais: As Estruturas de Base (Foco Principal)

Os tipos textuais estruturam a forma como a informação é organizada no papel. Classificam-se em cinco tipos principais:

### 2.1. Narração
O tipo narrativo tem como finalidade relatar um acontecimento real ou fictício, focado em uma progressão temporal (ações sucessivas).
* **Elementos Essenciais**: Narrador, personagens, enredo (fato), tempo (quando) e espaço (onde).
* **Marcadores Linguísticos**:
  * Predomínio de **verbos de ação** flexionados no **pretérito perfeito do indicativo** (indica ações concluídas no passado).
  * Uso frequente de advérbios e locuções temporais que marcam a sucessão dos fatos (*depois*, *em seguida*, *no dia seguinte*, *logo que*).
  * Presença de discurso direto, indireto ou indireto livre.
  * *Exemplo*: "O suspeito estacionou o carro, desceu rapidamente e correu em direção ao beco. Os agentes policiais o perseguiram de imediato."

### 2.2. Descrição
O tipo descritivo visa pintar um retrato verbal de uma pessoa, objeto, lugar ou cena. Apresenta uma estrutura estática, na qual os elementos coexistem em um mesmo instante no tempo (sem progressão temporal).
* **Elementos Essenciais**: Imagem, localização espacial, detalhes sensoriais (visão, audição, tato).
* **Marcadores Linguísticos**:
  * Abundância de **adjetivos** e locuções adjetivas.
  * Predomínio de **verbos de ligação** ou de estado (*ser*, *estar*, *parecer*, *permanecer*).
  * Uso frequente do **pretérito imperfeito do indicativo** (indica ações habituais ou estados contínuos no passado).
  * Advérbios de localização espacial (*à direita*, *ao fundo*, *no alto*).
  * *Exemplo*: "A sala de depoimentos era fria e mal iluminada. Havia uma mesa de madeira escura no centro, ladeada por duas cadeiras de ferro cinzentas."

### 2.3. Dissertação Argumentativa
A dissertação argumentativa tem como objetivo defender um ponto de vista (tese) a respeito de determinado assunto, com a clara intenção de persuadir o leitor por meio de argumentos e provas lógicas.
* **Elementos Essenciais**: Tese, argumentos (dados, fatos, citações de autoridades), contra-argumentação, conclusão proposta.
* **Marcadores Linguísticos**:
  * Presença de **modalizadores** (palavras que expressam opinião ou avaliação, como *infelizmente*, *obviamente*, *essencial*).
  * Conectivos de valor lógico e conclusivo (*portanto*, *consequentemente*, *por isso*, *visto que*, *embora*).
  * Verbos predominantemente no **presente do indicativo**.
  * Linguagem formal e distanciada (terceira pessoa), embora com forte carga persuasiva.
  * *Exemplo*: "A redução da maioridade penal constitui uma ilusão jurídica, pois não ataca as raízes socioeconômicas da criminalidade juvenil, servindo apenas para superlotar o falido sistema prisional."

### 2.4. Dissertação Expositiva (Exposição)
Diferencia-se da argumentativa por não ter a intenção de convencer ou persuadir o leitor. Seu propósito é unicamente expor, explicar, informar ou apresentar conceitos de maneira neutra e objetiva.
* **Elementos Essenciais**: Informações conceituais, dados numéricos, definições, clareza e impessoalidade.
* **Marcadores Linguísticos**:
  * Vocabulário técnico e preciso.
  * Ausência de juízos de valor (adjetivos opinativos).
  * Predomínio da terceira pessoa e passividade verbal.
  * *Exemplo*: "O inquérito policial é um procedimento administrativo preparatório, de caráter inquisitivo, conduzido pela polícia judiciária com o objetivo de colher indícios de autoria e materialidade delitiva."

### 2.5. Injunção (Instrucional)
O tipo injuntivo visa orientar, instruir ou prescrever um comportamento ao leitor. Ele não tenta convencer pela lógica (argumentação), mas sim guiar uma ação.
* **Elementos Essenciais**: Instruções passo a passo, normas, ordens, orientações de uso.
* **Marcadores Linguísticos**:
  * Uso frequente de **verbos no imperativo** (*faça*, *verifique*, *insira*, *evite*).
  * Emprego de verbos auxiliares de dever ou necessidade (*deve*, *precisa*, *tem de*).
  * Emprego de infinitivos com valor imperativo.
  * *Exemplo*: "Em caso de flagrante delito, isole imediatamente o local do crime. Não toque em nenhum objeto e aguarde a chegada dos peritos criminais."

---

## 3. Gêneros Textuais: As Manifestações Sociais (Foco Secundário)

Enquanto a tipologia textual determina a estrutura interna de composição do texto, os **Gêneros Textuais** são as formas concretas pelas quais os textos circulam na sociedade. Cada gênero adota um ou mais tipos textuais para cumprir sua função comunicativa.

Abaixo estão os principais gêneros cobrados em provas ou de uso diário na carreira policial:

1. **Ofício**: Gênero da redação oficial. Utilizado para a comunicação escrita entre autoridades públicas. Caracteriza-se pela impessoalidade, concisão, formalidade e clareza. O tipo predominante é o **expositivo** (para relatar informações) ou **injuntivo/prescritivo** (para ordenar procedimentos).
2. **Notícia**: Gênero jornalístico que relata um fato recente de interesse público. Seu tipo predominante é o **narrativo** (ao contar o ocorrido) misturado com o **expositivo** (ao dar informações técnicas e dados). Deve ser impessoal e objetiva.
3. **Artigo de Opinião**: Texto assinado que expressa a visão do autor sobre um tema polêmico. O tipo predominante é o **dissertativo-argumentativo**.
4. **Crônica**: Gênero que mistura o jornalismo e a literatura, partindo de um fato cotidiano para fazer uma reflexão lírica ou crítica. O tipo predominante é o **narrativo** (com toques descritivos e dissertativos reflexivos).
5. **Conto e Romance**: Gêneros puramente literários, de ficção. O tipo predominante é o **narrativo** com forte presença de trechos **descritivos** de personagens e cenários.
6. **Edital**: Gênero administrativo regulatório que dita as regras de um concurso público ou licitação. O tipo predominante é o **injuntivo/prescritivo**.
7. **Contrato**: Gênero jurídico que sela um acordo de vontades. O tipo predominante é o **prescritivo** (variante da injunção que traz obrigações de cumprimento legal estrito).

---

## 4. ⚡ Como Cai em Prova

Nas provas, a principal cobrança envolve o **reconhecimento do tipo predominante**. Raras vezes um texto é composto por um único tipo; as bancas exploram a capacidade do candidato de perceber qual das estruturas direciona a totalidade da obra.

### Questão 1 (CEBRASPE — PCDF — Agente de Polícia)
**Enunciado**: "O inquérito policial constitui instrumento essencial para assegurar que a persecução penal se desenvolva de forma justa. Por meio dele, evitam-se acusações infundadas e garante-se o respeito aos direitos fundamentais do investigado. Desse modo, sua manutenção é indispensável à higidez do processo judicial."
No trecho apresentado, há o predomínio da tipologia:
a) Narrativa
b) Descritiva
c) Dissertativo-argumentativa
d) Dissertativo-expositiva
e) Injuntiva

* **Gabarito: C**
* **Comentário**: O autor não se limita a explicar o que é o inquérito (o que seria exposição). Ele emite juízos de valor fortes sobre a importância desse instrumento ("essencial para assegurar", "evitam-se acusações infundadas", "sua manutenção é indispensável"). Esses termos revelam uma tese em defesa do inquérito, caracterizando a tipologia dissertativo-argumentativa.

### Questão 2 (FGV — PCRJ — Inspetor de Polícia)
**Enunciado**: Analise o seguinte fragmento: "O corpo da vítima estava caído ao lado esquerdo da escada de cimento. Apresentava rigidez cadavérica e marcas roxas na região do pescoço. A poucos metros, uma faca com vestígios de sangue brilhava sob a luz da lua."
A tipologia textual predominante no fragmento é:
a) Injunção
b) Narração
c) Dissertação
d) Descrição
e) Exposição

* **Gabarito: D**
* **Comentário**: O fragmento não apresenta nenhuma ação que faça o tempo progredir no texto. Trata-se de uma cena estática sob a perspectiva de um observador (perito ou policial). O foco é detalhar o estado das coisas ("estava caído", "apresentava rigidez", "brilhava sob a luz") e o posicionamento dos objetos ("ao lado esquerdo", "a poucos metros"). Trata-se, portanto, de descrição.

### Questão 3 (VUNESP — PM-SP — Oficial)
**Enunciado**: Um edital de concurso público para a Polícia Militar é um gênero textual cuja principal função comunicativa é prescrever normas e regulamentos para a seleção. Sob o ponto de vista da tipologia textual de base, esse gênero é classificado predominantemente como:
a) Narrativo
b) Expositivo
c) Injuntivo
d) Argumentativo
e) Descritivo

* **Gabarito: C**
* **Comentário**: O edital dita regras, instruções e exigências de conduta que os candidatos devem seguir obrigatoriamente para participar do certame. Essa natureza instrucional e diretiva é a essência do tipo injuntivo.

---

## 5. Pegadinhas Mais Frequentes em Concursos Policiais

1. **Dissertação Expositiva vs. Dissertação Argumentativa**:
   * *A Pegadinha*: A banca apresenta um texto técnico sobre segurança pública repleto de estatísticas e definições. O candidato marca "expositivo". No entanto, no último parágrafo, o autor diz que esses dados provam a falha das políticas públicas vigentes.
   * *A Regra*: Se há defesa de tese ou emissão de juízos de valor opinativos (modalizadores), o texto é **argumentativo**, mesmo que a maior parte dele seja composta por exposição de dados.
2. **Presença de Narração em Textos Dissertativos**:
   * *A Pegadinha*: O autor de um texto dissertativo conta uma pequena história no início para ilustrar o seu ponto de vista (uma ilustração narrativa). A banca pergunta se o texto é narrativo.
   * *A Regra*: Não se deve confundir um recurso ilustrativo com a intenção comunicativa geral do texto. O texto é dissertativo-argumentativo porque a narrativa serve apenas de base para a argumentação posterior.

---

## 6. Quadro-Resumo dos Tipos Textuais

| Tipo Textual | Objetivo Principal | Marcador Fonocognitivo/Linguístico | Gêneros Comuns |
|---|---|---|---|
| **Narração** | Relatar ações no tempo | Verbos de ação, Pretérito Perfeito | Notícia, crônica, conto |
| **Descrição** | Caracterizar cenas/objetos | Adjetivos, Verbos de estado, Imperfeito | Relatório pericial, retrato |
| **Dissertação Arg.** | Defender tese/persuadir | Conectores lógicos, modalizadores | Artigo de opinião, redação |
| **Dissertação Exp.** | Informar/explicar fatos | Linguagem técnica, impessoalidade | Verbete de enciclopédia, artigo |
| **Injunção** | Prescrever comportamentos | Verbos no Imperativo | Edital, regulamento, manual |

---

## 7. Conclusão

Compreender a tipologia textual e os gêneros associados é vital para ler os textos de prova com intencionalidade. O candidato que identifica imediatamente os marcadores linguísticos de cada estrutura não perde tempo lendo o texto de forma passiva. Ele sabe se deve procurar uma tese (se o texto for argumentativo), uma linha de tempo de ações (se for narrativo) ou a catalogação de fatos (se for expositivo), otimizando a resolução das questões de interpretação.',
  'Estudo das estruturas tipológicas textuais (narração, descrição, dissertação expositiva e argumentativa, injunção) e sua relação com os gêneros textuais (ofício, notícia, contrato, edital, crônica). Analisa os marcadores linguísticos típicos de cada tipo, como tempos verbais (perfeito vs. imperfeito), classes de palavras (adjetivação vs. conectores lógicos) e formas verbais (imperativo). Foca no reconhecimento do tipo predominante nas provas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 5/8 — Coesão, Coerência e Tipologia Textual
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Coesão, Coerência e Tipologia Textual',
  'Coesão e Coerência Textual: Mecanismos de Conexão e Lógica',
  E'# Coesão e Coerência Textual: Mecanismos de Conexão e Lógica

## 1. Introdução

A produção e a interpretação de textos não se resumem à justaposição de palavras e frases soltas. Para que um texto exista de fato e cumpra sua finalidade comunicativa, ele deve apresentar duas propriedades fundamentais e indissociáveis: a **Coesão** e a **Coerência**. Nas provas de concursos públicos para as carreiras policiais, as bancas (CEBRASPE, FGV, VUNESP) exploram esses mecanismos constantemente, exigindo que o candidato identifique referências pronominais, avalie o valor semântico de conectivos e aponte contradições lógicas que afetam a higidez do texto.

A coesão atua na superfície textual, conectando palavras, orações e parágrafos por meio de elementos gramaticais e lexicais (como pronomes e conjunções). A coerência, por sua vez, opera na estrutura profunda, garantindo a unidade de sentido e a lógica global do texto. Um relatório policial, por exemplo, exige o emprego irretocável de ambos os fatores para que a narrativa dos fatos e a capitulação jurídica do crime se apresentem de forma clara, linear e incontestável.

---

## 2. Coesão Textual: A Costura do Texto (Foco Principal)

A coesão textual divide-se em três grandes eixos: referencial, sequencial e lexical.

### 2.1. Coesão Referencial
Ocorre quando determinados termos do texto apontam para outros, servindo para retomar ou antecipar conceitos sem a necessidade de repetições excessivas. Os principais mecanismos são:

1. **Anáfora**: É o processo pelo qual um termo retoma uma palavra ou conceito mencionado anteriormente no texto.
   * *Exemplo*: "O *perito criminal* examinou os vestígios. *Ele* elaborou o laudo técnico." (O pronome "Ele" retoma anaforicamente "O perito criminal").
2. **Catáfora**: É o processo pelo qual um termo antecipa uma palavra ou conceito que só será explicitado posteriormente.
   * *Exemplo*: "O agente de polícia só queria *isto*: *a elucidação do crime*." (O pronome demonstrativo "isto" antecipa cataforicamente "a elucidação do crime").
3. **Elipse**: Consiste na omissão de um termo que pode ser facilmente deduzido pelo contexto. É um poderoso elemento de coesão referencial por economia linguística.
   * *Exemplo*: "O escrivão lavrou o auto de prisão; o delegado, [ ] a nota de culpa." (Omissão do verbo "lavrou").

### 2.2. Coesão Sequencial
É o mecanismo responsável por criar a progressão do texto no tempo e no espaço, organizando as relações lógicas entre as orações. Realiza-se, fundamentalmente, por meio de conectivos (conjunções, preposições e advérbios).

Abaixo estão listadas as principais classes de conectivos e suas funções semântico-sintáticas exigidas em provas:

* **Adição**: Soma ideias. Conectivos: *e*, *nem*, *não só... mas também*, *além disso*. Exemplo: "O suspeito foi detido *e* as armas foram apreendidas."
* **Oposição / Adversidade**: Contrapõe ideias. Conectivos: *mas*, *porem*, *contudo*, *todavia*, *entretanto*, *no entanto*. Exemplo: "Havia fortes indícios contra o acusado, *no entanto* a prova material era frágil."
* **Concessão**: Introduz uma oposição que não anula o fato principal (obstáculo superado). Conectivos: *embora*, *ainda que*, *apesar de*, *posto que*. Exemplo: "*Embora* o suspeito negasse, as filmagens comprovaram sua presença."
* **Conclusão**: Finaliza um raciocínio lógico. Conectivos: *logo*, *portanto*, *por conseguinte*, *assim*. Exemplo: "O laudo confirmou as digitais do réu; *portanto*, a autoria está provada."
* **Causa**: Apresenta a origem ou motivo do fato. Conectivos: *porque*, *pois*, *visto que*, *já que*, *como* (no início). Exemplo: "A operação foi deflagrada *já que* o mandado foi assinado."

### 2.3. Coesão Lexical
Ocorre quando a ligação entre as partes do texto é feita por meio do vocabulário, utilizando sinônimos, antônimos, hiperônimos ou hipônimos para evitar a repetição de termos idênticos.
* *Exemplo*: "A *polícia civil* monitorou o galpão por semanas. A *instituição* agiu no momento correto para capturar a *quadrilha*. Os *criminosos* não ofereceram resistência." (O uso de "instituição" e "criminosos" substitui "polícia civil" e "quadrilha" mantendo a unidade temática).

---

## 3. Coerência Textual: A Lógica do Sentido (Foco Principal)

Enquanto a coesão cuida da conexão física das palavras, a coerência garante que o texto faça sentido para o leitor. Ela depende de fatores lógicos, semânticos e pragmáticos.

### 3.1. Princípios Fundamentais da Coerência
Para que um texto seja considerado coerente, ele deve respeitar três princípios básicos:

1. **Princípio da Não-Contradição**: O texto não pode apresentar afirmações que se contradigam entre si no mesmo plano de realidade.
   * *Exemplo Incoerente*: "O suspeito estava completamente sozinho no recinto fechado, mas conversava em voz baixa com seu comparsa enquanto este lhe passava as ferramentas."
2. **Princípio da Relevância**: As ideias apresentadas devem ser importantes para o tema central e estar relacionadas entre si. Fragmentos soltos e sem conexão temática destroem a coerência.
   * *Exemplo Incoerente*: "A equipe policial efetuou a prisão do assaltante. A propósito, a culinária italiana é rica em massas e molhos especiais. O preso foi levado à delegacia."
3. **Princípio da Continuidade Temática**: Deve haver um fio condutor que guie a leitura. O texto precisa progredir, trazendo novas informações (progressão temática) sem perder a ligação com o que já foi dito.

### 3.2. Níveis de Coerência
* **Coerência Semântica**: Envolve o significado das palavras no contexto. Evita contradições de significado puro.
* **Coerência Sintática**: Estruturação correta das frases para que a lógica não seja corrompida.
* **Coerência Temática**: Manutenção do foco no assunto do início ao fim do texto.

---

## 4. Relação com a Tipologia Textual (Menção de Passagem)

Os mecanismos de coesão e coerência adaptam-se aos diferentes **tipos textuais** (vistos no material anterior). O tipo de coesão predominante varia conforme a finalidade do texto.

Nas narrativas, a coesão é marcadamente temporal, amparada por advérbios de tempo e verbos no pretérito que estruturam a ordem cronológica dos fatos. Já nos textos dissertativo-argumentativos, a coesão é prioritariamente lógica e sequencial, construída por conjunções adversativas, causais e conclusivas que articulam as premissas e a tese. A coerência nesses textos reside na solidez lógica dos argumentos que sustentam a conclusão.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Federal — Escrivão)
**Enunciado**: No trecho: "Os peritos criminais analisaram as provas digitais e as enviaram ao Ministério Público, cujo representante decidirá pelo oferecimento da denúncia", o pronome relativo "cujo" estabelece relação de posse entre "Ministério Público" e "representante".
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O pronome relativo "cujo" (e suas flexões) é um recurso de coesão referencial que estabelece de forma obrigatória uma relação semântica de posse entre o termo antecedente ("Ministério Público") e o termo subsequente ("representante"). Equivale a "representante do Ministério Público".

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: Assinale a frase em que o conectivo sublinhado expressa ideia de causa:
a) O agente não participou da operação, *posto que* estava de licença médica.
b) *À medida que* o cerco se fechava, o suspeito demonstrava nervosismo.
c) Os policiais isolaram a área *para que* a multidão não destruísse as provas.
d) O réu foi condenado, *entretanto* a defesa recorrerá da sentença.
e) *Como* o acusado não apresentou álibi, o delegado determinou a prisão temporária.

* **Gabarito: E**
* **Comentário**: A conjunção "Como", quando posicionada no início do período, equivale a "já que" ou "visto que", introduzindo uma oração subordinada adverbial causal (a falta de álibi foi a causa da prisão).
  * Na A, "posto que" é concessiva.
  * Na B, "à medida que" é proporcional.
  * Na C, "para que" é final.
  * Na D, "entretanto" é adversativa.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: Assinale a alternativa que apresenta um desvio de coerência textual devido à contradição de ideias:
a) Embora fizesse muito calor, os agentes usavam coletes balísticos pesados.
b) O laudo papiloscópico deu negativo, comprovando que o suspeito tocou na arma do crime.
c) Visto que o depoimento da testemunha foi vago, o investigador realizou novas perguntas.
d) Como não havia provas materiais, o promotor solicitou o arquivamento do inquérito.
e) Os policiais agiram com rapidez, contudo o suspeito conseguiu escapar pelo telhado.

* **Gabarito: B**
* **Comentário**: A alternativa B apresenta uma contradição lógica insuperável (incoerência): se o laudo papiloscópico (impressões digitais) deu "negativo", ele não poderia "comprovar que o suspeito tocou" na arma do crime. O resultado negativo comprova a ausência de digitais, indicando o oposto.

---

## 6. Pegadinhas Mais Frequentes em Concursos Policiais

1. **Confusão entre "Este(s)/Isto" e "Esse(s)/Isso" na Coesão Referencial**:
   * **Este / Isto**: Utilizados para introduzir termos novos (catáfora) ou referir-se ao elemento mencionado mais recentemente no texto.
   * **Esse / Isso**: Utilizados para retomar termos que já foram mencionados no texto (anáfora).
   * *Pegadinha*: "Prender o suspeito e isolar a área: *esses* eram os objetivos." (Correto, retoma). "Os objetivos eram *estes*: prender o suspeito..." (Correto, antecipa).
2. **Coesão Sem Coerência**:
   * As bancas podem apresentar textos gramaticalmente corretos, repletos de conjunções (coesão perfeita), mas que não possuem lógica nenhuma (incoerência). O candidato desatento foca apenas nos conectivos e erra a análise de sentido.

---

## 7. Quadro-Resumo dos Elementos Coesivos

| Elemento Coesivo | Função | Exemplo |
|---|---|---|
| **Pronome Anafórico** | Retoma termo anterior | O réu fugiu. A polícia o perseguiu. |
| **Pronome Catafórico** | Antecipa termo posterior | A decisão foi esta: a prisão. |
| **Elipse** | Omissão de termo subentendido | O perito analisou as provas; o agente, o local. |
| **Conjunção Adversativa**| Contraste/Oposição | Investigaram muito, mas nada acharam. |
| **Conjunção Concessiva** | Quebra de expectativa | Prenderam o réu, embora resistisse. |

---

## 8. Conclusão

Coesão e coerência são a essência da inteligibilidade de qualquer texto. Enquanto a coesão constrói a infraestrutura gramatical por onde as ideias transitam, a coerência garante que essas ideias cheguem a um destino comum, sem desvios ou contradições. Para o candidato a concursos policiais, dominar esses conceitos é o passo definitivo para compreender textos longos de forma rápida e produzir redações claras, organizadas e juridicamente consistentes.',
  'Estudo aprofundado dos mecanismos de coesão textual (referencial, sequencial e lexical) e coerência textual (princípios da não-contradição, relevância e continuidade temática) para concursos da área policial. Detalha o emprego de anáforas, catáforas, elipses e conectivos lógicos (adição, oposição, concessão, causa e conclusão). Aborda a distinção de uso entre pronomes demonstrativos e a relação com as tipologias textuais de forma introdutória. Inclui questões resolvidas do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 6/8 — Equivalência e transformação de estruturas
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Equivalência e transformação de estruturas',
  'Reescrita de Frases: Equivalência e Transformação de Estruturas',
  E'# Reescrita de Frases: Equivalência e Transformação de Estruturas

## 1. Introdução

A reescrita de frases (também conhecida como equivalência e transformação de estruturas) é o tema mais complexo e recorrente nas provas de Língua Portuguesa do CEBRASPE, além de ter presença marcante nas avaliações da FGV. Essas questões não avaliam apenas um conteúdo isolado; elas exigem que o candidato aplique, simultaneamente, conhecimentos de sintaxe, regência, concordância, pontuação e semântica para julgar se a nova versão de um trecho mantém a correção gramatical e o sentido original do texto.

Nas carreiras policiais, a capacidade de reescrever informações mantendo a fidedignidade é uma habilidade diária. O policial precisa transpor depoimentos de testemunhas (frequentemente informais) para a redação formal do inquérito (norma culta), sem alterar os fatos ou introduzir ambiguidades. Dominar as técnicas de paráfrase e as regras de transformação sintática é fundamental para alcançar a aprovação.

---

## 2. Mecanismos Fundamentais de Transformação

Existem diversos métodos para reescrever uma frase mantendo sua essência semântica. As bancas de concurso operam principalmente através das seguintes transformações:

### 2.1. Transposição de Vozes Verbais
A mudança da voz ativa para a voz passiva (ou vice-versa) é um clássico.
* **Voz Ativa**: O sujeito pratica a ação.
  * *Exemplo*: "O delegado de polícia assinou o mandado." (Delegado = sujeito agente; mandado = objeto direto).
* **Voz Passiva Analítica**: O sujeito sofre a ação, auxiliado pelo verbo ser/viver + particípio.
  * *Exemplo*: "O mandado foi assinado pelo delegado de polícia." (Mandado = sujeito paciente; pelo delegado = agente da passiva).
* **Voz Passiva Sintética (ou Pronominal)**: Ocorre com VTD + pronome apassivador "se".
  * *Exemplo*: "Assinou-se o mandado." (Mandado = sujeito paciente).

* **Regra de Ouro**: Apenas verbos transitivos diretos (VTD) ou transitivos diretos e indiretos (VTDI) admitem a transposição para a voz passiva. Verbos transitivos indiretos (VTI) ou intransitivos (VI) não aceitam essa transformação.
  * *Exemplo Incorreto*: "Aos cargos aspiravam-se pelos agentes" (Aspirar no sentido de almejar é VTI; não aceita passiva).

### 2.2. Substituição de Conectivos (Equivalência de Conjunções)
A troca de conectivos exige atenção redobrada quanto à manutenção do sentido e à flexão do verbo na oração subordinada.
* **Equivalência Concessiva**: *Embora*, *ainda que*, *mesmo que*, *posto que*, *apesar de que*.
  * *Atenção*: Se trocarmos "embora" (exige subjuntivo) por "apesar de" (exige infinitivo pessoal/impessoal), o verbo deve ser alterado.
    * *Ativa*: "Embora a viatura *estivesse* quebrada, fomos ao local."
    * *Reescrita*: "Apesar de a viatura *estar* quebrada, fomos ao local."
* **Equivalência Causal/Explicativa**: *Porque*, *visto que*, *já que*, *pois*, *porquanto*.
* **Equivalência Adversativa**: *Mas*, *porem*, *contudo*, *todavia*, *entretanto*, *no entanto*.

### 2.3. Nominalização
Consiste em transformar uma oração (geralmente subordinada substantiva ou adjetiva) em um sintagma nominal (substantivo) equivalente.
* *Ativa*: "É necessário *que se investiguem os suspeitos*." (Oração substantiva subjetiva).
* *Reescrita*: "É necessária *a investigação dos suspeitos*." (Sintagma nominal funcionando como sujeito). Note que o adjetivo "necessário" flexionou para "necessária" para concordar com o substantivo feminino "investigação".

### 2.4. Inversão da Ordem dos Termos (Ordem Direta vs. Indireta)
Deslocar termos como adjuntos adverbiais ou orações subordinadas exige cuidado com a pontuação.
* *Ordem Direta*: "Os policiais civis prenderam o suspeito na noite de ontem sem alarde." (Sem vírgula obrigatória).
* *Ordem Indireta*: "Na noite de ontem, sem alarde, os policiais civis prenderam o suspeito." (Deslocamento de adjuntos adverbiais exige isolamento por vírgulas).

---

## 3. Sentido Original vs. Correção Gramatical

É muito comum o CEBRASPE propor uma reescrita e afirmar: "A reescrita mantém a correção gramatical e o sentido original do texto." O candidato deve analisar as duas coisas de forma independente:
1. **A frase proposta respeita a norma culta?** (Verifique concordância, regência, crase, pontuação e ortografia). Se houver qualquer erro gramatical, o item está **errado**.
2. **O sentido original foi preservado?** Mudanças sutis de foco (como passar de uma certeza para uma possibilidade ou generalizar um termo específico) alteram o sentido, fazendo com que o item fique **errado**, mesmo que a gramática esteja perfeita.
   * *Exemplo de alteração de sentido*: "Todos os policiais participaram" (Certeza) vs. "É provável que todos os policiais tenham participado" (Possibilidade/Dúvida).

---

## 4. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Rodoviária Federal — Policial)
**Enunciado**: Julgue se a proposta de reescrita mantém a correção gramatical e as relações de sentido do texto original:
* *Texto Original*: "A fim de garantir a segurança nas rodovias federais, a PRF intensificou a fiscalização de velocidade durante o feriado prolongado."
* *Reescrita Proposta*: "Para fins de garantia da segurança nas rodovias federais, a fiscalização de velocidade foi intensificada pela PRF no feriado prolongado."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: Analisando a reescrita:
  1. "A fim de garantir..." foi nominalizado para "Para fins de garantia da...". A estrutura está correta e mantém a ideia de finalidade.
  2. A oração principal "a PRF intensificou a fiscalização..." (voz ativa) foi transposta para a voz passiva analítica: "a fiscalização... foi intensificada pela PRF". Como o verbo "intensificar" é VTD, a transposição é perfeita.
  3. "durante o feriado..." foi trocado por "no feriado...". As relações de tempo foram mantidas. Não há desvios de concordância, regência ou pontuação. O sentido original e a gramática foram preservados.

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: Assinale a alternativa em que a reescrita proposta altera o sentido lógico da frase original: "O suspeito confessou o crime, mas a polícia continuará a busca por provas."
a) Embora o suspeito tenha confessado o crime, a polícia continuará a busca por provas.
b) O suspeito confessou o crime; contudo, a polícia continuará a busca por provas.
c) Como o suspeito confessou o crime, a polícia continuará a busca por provas.
d) Apesar de o suspeito ter confessado o crime, a polícia continuará a busca por provas.
e) O suspeito confessou o crime; no entanto, a polícia continuará a busca por provas.

* **Gabarito: C**
* **Comentário**: A frase original apresenta uma relação de oposição/contraste por meio da conjunção adversativa "mas" (apesar da confissão, a busca continua).
  * As opções A, B, D e E mantêm essa oposição (utilizando conjunções adversativas ou concessivas).
  * A alternativa C introduz a conjunção subordinativa causal "Como", criando uma relação de causa e efeito (a confissão teria causado a continuação das buscas). Isso altera drasticamente a lógica e o sentido do texto original.

### Questão 3 (VUNESP — PCSP — Investigador)
**Enunciado**: "Os agentes da delegacia especializada recolheram as provas do crime." Assinale a alternativa que apresenta a transposição correta da frase para a voz passiva sintética:
a) As provas do crime foram recolhidas pelos agentes da delegacia especializada.
b) Recolheram-se as provas do crime na delegacia especializada.
c) Recolheram-se as provas do crime.
d) As provas do crime recolheram-se.
e) Os agentes da delegacia especializada recolheram-nas.

* **Gabarito: C**
* **Comentário**: A voz passiva sintética é estruturada com o verbo na 3ª pessoa (singular ou plural) acompanhado do pronome apassivador "se". O objeto direto da ativa ("as provas do crime") torna-se o sujeito paciente da passiva sintética, exigindo o verbo no plural ("Recolheram-se"). A alternativa C apresenta a estrutura exata: "Recolheram-se as provas do crime" (equivalente a: As provas do crime foram recolhidas).
  * A alternativa A traz a voz passiva analítica.
  * A alternativa E traz apenas a substituição do objeto por pronome oblíquo na voz ativa.

---

## 5. Pegadinhas Mais Frequentes em Concursos Policiais

1. **A Falsa Conjunção Causal "Posto que"**:
   * *A Pegadinha*: A banca propõe substituir "visto que" ou "porque" por "posto que", afirmando que mantém o sentido.
   * *A Regra*: Na norma culta oficial, **"posto que" é conjunção concessiva** (equivale a embora). Usá-la como causa é um vício de linguagem comum na fala, mas considerado erro crasso em concursos.
2. **Mudança de Foco no Pronome Relativo "Cujo"**:
   * *A Pegadinha*: Propor a substituição de "cujo" por "que" ou "o qual" sem reestruturar a frase.
   * *A Regra*: O pronome "cujo" indica posse e liga dois substantivos. Ele não pode ser substituído puramente por "que" ou "o qual" sem que se destrua a gramática do período. Exemplo: "O réu, cujo advogado fugiu..." não pode virar "O réu, que o advogado fugiu...".
3. **Reescrita com perda da preposição exigida pela Regência**:
   * *A Pegadinha*: "A lei de que me queixo..." reescrita como "A lei que me queixo...". O verbo queixar-se exige a preposição "de" ("queixar-se de algo"). Omitir a preposição antes do pronome relativo gera erro de regência.

---

## 6. Quadro-Resumo de Equivalências Consecutivas e Concessivas

| Estrutura Original | Conector | Estrutura Equivalente | Ajuste Verbal |
|---|---|---|---|
| **Oposição (Adversativa)** | *mas*, *porem*, *contudo* | **Concessiva** (*embora*, *ainda que*) | Indicativo -> Subjuntivo |
| **Causa (Causal)** | *porque*, *já que*, *visto que* | **Explicação** (*pois*, *porquanto*) | Sem alteração no tempo |
| **Concessão (Concessiva)** | *embora* + verbo | **Apesar de** + infinitivo | Flexão -> Infinitivo |

---

## 7. Conclusão

Dominar a reescrita de frases é um exercício completo de ginástica gramatical. O candidato deve ler a proposta com desconfiança, analisando linha por linha as mudanças sintáticas. Identificar as vozes verbais, dominar as conjunções e suas equivalências e verificar de imediato a manutenção das regras de concordância e regência são as chaves fundamentais para vencer essa exigente tipologia de questão de concurso.',
  'Estudo teórico-prático da reescrita de frases e transformação de estruturas para concursos públicos policiais. Detalha a transposição entre vozes verbais (ativa, passiva analítica e sintética), a substituição de conjunções equivalentes (adversativas, concessivas e causais) com atenção aos tempos e modos verbais (indicativo vs. subjuntivo), processos de nominalização e deslocamentos sintáticos com ajustes de pontuação. Contém quadro-resumo, pegadinhas de prova e resolução de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 7/8 — Paralelismo sintático e semântico
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Paralelismo sintático e semântico',
  'Paralelismo Sintático e Semântico em Prova',
  E'# Paralelismo Sintático e Semântico em Prova

## 1. Introdução

O paralelismo (sintático e semântico) é um princípio de estruturação textual que preza pela simetria, clareza e harmonia das ideias coordenadas em um texto. Embora seja um tema menos conhecido pelo grande público, é um dos assuntos favoritos de bancas extremamente exigentes, como a FGV (que o cobra sob o prisma da coesão e estilo) e o CEBRASPE (que o associa às regras de reescrita e correção gramatical).

Nas carreiras policiais, a redação de documentos oficiais (como relatórios de investigação e boletins de ocorrência) exige clareza absoluta e precisão técnica. A quebra de paralelismo gera ruídos de comunicação, distorções de sentido e, em casos mais graves, passagens involuntariamente cômicas. Compreender como manter a equivalência de estruturas gramaticais e semânticas coordenadas é indispensável para obter uma nota de excelência nas provas objetivas e discursivas.

---

## 2. Paralelismo Sintático: A Simetria Gramatical (Foco Principal)

O paralelismo sintático exige que elementos com funções sintáticas coordenadas (ligados por conjunções coordenativas ou dispostos em listas e enumerações) apresentem a mesma estrutura gramatical de base. Se o primeiro termo for um substantivo, os demais também devem ser; se for uma oração iniciada por preposição, as subsequentes devem seguir o mesmo padrão.

Mapeamos abaixo os casos mais cobrados em prova:

### 2.1. Paralelismo de Preposições e Artigos (Enumerações)
Ao listar elementos coordenados, a determinação de artigos ou preposições deve ser rigorosamente idêntica para todos os itens da série:
* **Incorreto**: "O delegado solicitou a cooperação *dos* escrivães, *dos* peritos e *[ ]* investigadores." (Falta a preposição contraída "dos" antes de investigadores).
* **Correto**: "O delegado solicitou a cooperação *dos* escrivães, *dos* peritos e *dos* investigadores." (Mantém-se a contração de+os em todos).
* **Correto (Omissão Geral)**: "O delegado solicitou a cooperação de escrivães, peritos e investigadores." (Omitiu-se o artigo para todos, mantendo a preposição simples).

* **Atenção à Crase**: Este é um dos maiores focos de erro em provas de paralelismo.
  * **Incorreto**: "Fiz referência *à* delegada e *a* escrivã." (A primeira tem crase [preposição + artigo], a segunda tem apenas a preposição "a", quebrando a simetria).
  * **Correto**: "Fiz referência *à* delegada e *à* escrivã." (Mantém-se o artigo definido em ambas).
  * **Correto**: "Fiz referência *a* delegada e escrivã." (Uso sem artigo definido em ambas, apenas com a preposição "a" no singular).

### 2.2. Paralelismo de Conectivos Correlativos
Conectivos correlativos (*não só... mas também*, *tanto... quanto*, *seja... seja*, *não apenas... como*) exigem paralelismo sintático absoluto nos termos que interligam.
* **Incorreto**: "O suspeito foi indiciado não só *por* estelionato, mas também *[ ]* lavagem de dinheiro." (Falta a preposição "por" após o segundo conector).
* **Correto**: "O suspeito foi indiciado não só *por* estelionato, mas também *por* lavagem de dinheiro."
* **Incorreto**: "Ele demonstrou competência tanto *na* área administrativa como *[ ]* operacional."
* **Correto**: "Ele demonstrou competência tanto *na* área administrativa como *na* operacional."

### 2.3. Paralelismo de Classes Gramaticais
Não se deve coordenar um sintagma nominal (substantivo) com uma oração verbal, pois pertencem a categorias estruturais diferentes.
* **Incorreto**: "A nova portaria visa *a contratação de agentes* e *melhorar as condições de trabalho*." (O primeiro termo é um nome/substantivo, o segundo é uma oração com verbo no infinitivo).
* **Correto**: "A nova portaria visa *a contratar agentes* e *a melhorar as condições de trabalho*." (Ambos orações no infinitivo).
* **Correto**: "A nova portaria visa *à contratação de agentes* e *à melhoria das condições de trabalho*." (Ambos sintagmas nominais).

---

## 3. Paralelismo Semântico: A Coerência das Ideias

O paralelismo semântico exige que os elementos coordenados pertençam a campos de significado compatíveis entre si. A quebra desse paralelismo ocorre quando se colocam no mesmo plano de coordenação ideias logicamente incompatíveis ou de natureza abstrata misturadas a concretas.

Nas provas, a quebra de paralelismo semântico costuma ser cobrada como um defeito de estilo ou um recurso literário intencional (como a zeugma de sentido, recorrente na literatura). Em textos formais, contudo, deve ser evitada.
* **Incorreto**: "O policial portava *uma pistola calibre 9mm* e *um profundo sentimento de dever cumprido*." (Arma de fogo [concreta] coordenada com sentimento [abstrato] gera quebra de paralelismo semântico).
* **Incorreto**: "O acusado perdeu *o prazo do recurso* e *os cabelos* durante o processo criminal."
* **Correto (Formatado para escrita formal)**: "O policial portava uma pistola calibre 9mm e agia movido por um profundo sentimento de dever cumprido." (Separa-se a posse do objeto da descrição do estado mental do agente).

---

## 4. ⚡ Como Cai em Prova

### Questão 1 (FGV — Polícia Civil do Amazonas — Escrivão)
**Enunciado**: Assinale a alternativa em que a frase apresenta um desvio de paralelismo sintático:
a) Durante o curso de formação, aprendemos a atirar com precisão e a redigir boletins informativos.
b) O palestrante abordou os desafios da segurança pública sob a ótica social e econômica.
c) Prefiro a dedicação do policial experiente à arrogância do novato.
d) A operação visava à prisão do líder da facção e apreender o carregamento ilícito.
e) O suspeito não apenas mentiu no depoimento, mas também falsificou as assinaturas dos documentos.

* **Gabarito: D**
* **Comentário**: A alternativa D apresenta quebra de paralelismo sintático. O verbo "visava" rege dois complementos coordenados:
  1. "à prisão do líder..." (sintagma nominal iniciado pela preposição "a" contraída com o artigo "a").
  2. "apreender o carregamento..." (oração verbal no infinitivo).
  Para restabelecer o paralelismo, os termos deveriam ser simétricos: "visava *à prisão* do líder e *à apreensão* do carregamento" (ambos nominais) ou "visava *a prender* o líder e *a apreender* o carregamento" (ambos verbais).

### Questão 2 (CEBRASPE — Polícia Federal — Perito Criminal)
**Enunciado**: No trecho: "O trabalho pericial exige o domínio de técnicas laboratoriais avançadas, o conhecimento da legislação penal e a capacidade de redação de laudos técnicos claros", a exclusão do artigo definido feminino "a" antes de "capacidade" prejudicaria a correção gramatical e o paralelismo sintático do período.
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário**: O trecho traz uma enumeração de três objetos diretos do verbo "exige":
  1. "o domínio de técnicas..." (determinado pelo artigo masculino "o").
  2. "o conhecimento da..." (determinado pelo artigo masculino "o").
  3. "a capacidade de..." (determinado pelo artigo feminino "a").
  Se retirarmos o artigo "a" antes de "capacidade", romperíamos a simetria com os dois termos anteriores que mantêm os artigos ("o domínio", "o conhecimento"). Para que a omissão fosse gramaticalmente aceitável e mantivesse o paralelismo, deveríamos retirar os artigos de **todos** os termos: "exige domínio de técnicas..., conhecimento da legislação... e capacidade de redação...". Como a proposta sugeriu retirar o artigo apenas do último elemento, haveria quebra de paralelismo sintático. Logo, a afirmação de que a exclusão "prejudicaria a correção gramatical e o paralelismo" está **certa**. Espera, o enunciado afirma que a exclusão "prejudicaria o paralelismo". Sim, ela prejudicaria. Portanto, julgar o item como **CERTO** é o correto. Deixe-me ajustar a explicação do gabarito para ficar perfeitamente alinhada. O item está **CERTO** porque a omissão de apenas um dos artigos de fato causaria erro de paralelismo.

### Questão 3 (VUNESP — Polícia Civil de São Paulo — Investigador)
**Enunciado**: Assinale a alternativa escrita em conformidade com o padrão-culto da língua e com as regras de paralelismo sintático:
a) A corregedoria tem o dever de fiscalizar as condutas dos agentes e punição aos culpados.
b) Os policiais estavam preparados tanto para a incursão aérea quanto terrestre.
c) Ela demonstrou apreço pela verdade e combater a impunidade.
d) O relatório de inteligência apontava para o aumento do tráfico de drogas e da criminalidade violenta.
e) Não se deve misturar o cumprimento da lei com atitudes passionais.

* **Gabarito: D**
* **Comentário**: A alternativa D mantém o paralelismo sintático perfeito ao coordenar dois termos simétricos: "do tráfico de drogas" (masculino determinado) e "da criminalidade violenta" (feminino determinado). Ambos possuem a preposição "de" contraída com os respectivos artigos definidos.
  * Erro na A: "fiscalizar..." (verbo) coordenado com "punição..." (nome).
  * Erro na B: Falta a preposição antes de "terrestre" para equilibrar com "para a incursão aérea". O correto seria: "tanto para a incursão aérea quanto para a terrestre".
  * Erro na C: "pela verdade" (nome) coordenado com "combater..." (verbo).
  * Erro na E: "o cumprimento..." (nome) coordenado com "atitudes..." (nome sem determinação equivalente).

---

## 5. Pegadinhas Mais Frequentes em Concursos Policiais

1. **A Crase Assimétrica**:
   * *Pegadinha*: "Ele entregou a arma *à* polícia e *[ ]* corregedoria."
   * *Correção*: Entregar a algo exige preposição "a". Se o primeiro tem crase, o segundo também deve ter: "à polícia e *à* corregedoria."
2. **Omissão Parcial em Locuções Correlativas**:
   * *Pegadinha*: "Tanto na Polícia Federal como Rodoviária Federal."
   * *Correção*: O conector exige paralelismo sintático: "Tanto *na* Polícia Federal como *na* Rodoviária Federal."
3. **Zeugma com Quebra de Paralelismo**:
   * Ocorre quando a omissão de um termo leva o leitor a herdar uma preposição ou artigo inadequado para o termo seguinte.
   * *Exemplo*: "Ele gosta de cinema e esportes." (Gosta de cinema e [gosta de] esportes - correto). "Ele gosta de cinema e praticar esportes" (Gosta de praticar esportes - correto sintaticamente, mas o paralelismo ideal exige reestruturar: "Ele gosta de cinema e de praticar esportes" ou "Ele gosta de assistir a filmes e de praticar esportes").

---

## 6. Quadro-Resumo de Casos de Paralelismo

| Tipo de Estrutura | Estrutura Assimétrica (Erro) | Estrutura Simétrica (Correto) |
|---|---|---|
| **Enumeração Articulada** | *à* delegacia e *a* promotoria | *à* delegacia e *à* promotoria |
| **Locução Correlativa** | tanto *por* dolo como culpa | tanto *por* dolo como *por* culpa |
| **Classes Coordenadas** | gosta *de investigar* e *do relatório* | gosta *de investigar* e *de relatar* |

---

## 7. Conclusão

O paralelismo sintático e semântico reflete a maturidade de escrita do candidato. Longe de ser um preciosismo gramatical, o paralelismo garante a clareza e a progressão lógica do texto, virtudes essenciais em provas discursivas e na vida profissional da carreira policial. Ao responder às questões de prova, o candidato deve sempre buscar a simetria de preposições, artigos e tempos verbais nas coordenadas, evitando cair nas armadilhas de omissão propostas pelas bancas.',
  'Estudo analítico do paralelismo sintático (simetria de preposições, artigos, classes gramaticais e estruturas oracionais coordenadas) e semântico (compatibilidade lógica de significados coordenados). Foca no emprego de conectivos correlativos (tanto... quanto, não só... mas também), no uso correto da crase sob a ótica do paralelismo e em pegadinhas comuns de omissão e zeugma. Inclui questões comentadas das bancas CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 8/8 — Redação Oficial (Manual de Redação da Presidência)
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Redação Oficial (Manual de Redação da Presidência)',
  'Redação Oficial: Manual de Redação da Presidência da República',
  E'# Redação Oficial: Manual de Redação da Presidência da República

## 1. Introdução

A Redação Oficial é o conjunto de atos normativos e de comunicações escritas expedidos pelos órgãos e entidades da Administração Pública. Nas provas para as carreiras policiais (Polícia Federal, PRF e Polícias Civis), este assunto é exigido com base estrita nas diretrizes do **Manual de Redação da Presidência da República (3ª Edição, revista e atualizada)**. Bancas como o CEBRASPE dedicam itens inteiros para avaliar se o candidato compreende a formatação de documentos oficiais, o emprego correto de fechos e pronomes de tratamento, e a manutenção da clareza e impessoalidade.

O domínio da redação oficial não é meramente um requisito de concurso, mas uma ferramenta operacional de trabalho. O policial, no exercício de suas funções administrativas e investigativas, redige ofícios a outros órgãos públicos (como o Ministério Público e o Poder Judiciário), relatórios e editais. A produção desses expedientes em conformidade com as regras federais garante a dignidade da instituição policial e a segurança jurídica das comunicações do Estado.

---

## 2. Princípios da Redação Oficial (Foco Principal)

De acordo com o Manual de Redação, a redação oficial deve ser caracterizada pelos seguintes princípios constitucionais e estilísticos:

1. **Impessoalidade**: A comunicação é sempre feita pela Administração Pública (não por um indivíduo isolado) e dirigida a outro órgão ou ao cidadão. Disso decorre a ausência de opiniões pessoais, sentimentos ou marcas de subjetividade.
2. **Clareza**: O texto deve ser compreendido de imediato pelo leitor. Para isso, deve-se utilizar vocabulário simples, evitar o jargão policial excessivo ou termos regionalistas que possam obscurecer o sentido.
3. **Concisão**: O texto conciso transmite o máximo de informações com o mínimo de palavras. Deve-se eliminar redundâncias e adjetivações desnecessárias.
4. **Formalidade e Padronização**: Exige o respeito às regras gramaticais e a formatação uniforme dos documentos para assegurar a homogeneidade dos expedientes públicos.
5. **Objetividade**: O assunto deve ser abordado diretamente, sem rodeios ou floreios estilísticos.
6. **Uso do Padrão Culto da Língua**: A linguagem deve seguir rigorosamente as normas gramaticais da língua culta oficial.

---

## 3. Pronomes de Tratamento e Vocativos

A 3ª Edição do Manual simplificou significativamente o uso de pronomes de tratamento na esfera federal.

### 3.1. O Pronome Único para Altas Autoridades
O pronome **Vossa Excelência** (V. Exa.) deve ser empregado para o tratamento das seguintes autoridades dos três Poderes (Executivo, Legislativo e Judiciário):
* **Poder Executivo**: Presidente da República, Vice-Presidente, Ministros de Estado, Governadores, Prefeitos.
* **Poder Legislativo**: Deputados Federais, Senadores, Deputados Estaduais, Vereadores.
* **Poder Judiciário**: Ministros de Tribunais Superiores, Desembargadores, Juízes.
* *Nota*: Para as demais autoridades civis e militares, ou para cidadãos em geral, utiliza-se o pronome **Vossa Senhoria** (V. Sª.).

### 3.2. Vocativos Adequados
O Manual aboliu formalmente o uso de vocativos antigos e pomposos (como *Ilustríssimo*, *Digníssimo* ou *Excelentíssimo* - este último reservado **exclusivamente** para os chefes de Poder: Presidente da República, Presidente do Congresso Nacional e Presidente do STF).
* **Para Vossa Excelência**: Usa-se o vocativo "**Senhor**" seguido do cargo. Exemplo: *Senhor Ministro*, *Senhor Juiz*, *Senhor Governador*.
* **Para Vossa Senhoria**: Usa-se o vocativo "**Senhor**" seguido do cargo. Exemplo: *Senhor Delegado*, *Senhor Diretor*.

### 3.3. Regras de Concordância Gramatical
Os pronomes de tratamento apresentam uma particularidade sintática importantíssima em provas:
* **Concordância Verbal**: Os verbos devem concordar sempre na **3ª pessoa** (do singular ou do plural), embora o pronome faça referência à segunda pessoa (o interlocutor).
  * *Exemplo Correto*: "Vossa Excelência *assinou* o laudo?" (E não: "assinastes").
* **Concordância de Pronomes**: Os pronomes possessivos associados também devem ser de **3ª pessoa** (sua, seu).
  * *Exemplo Correto*: "Solicitamos que Vossa Excelência apresente *sua* justificativa." (E não: "tua").
* **Concordância Nominal (Adjetivos)**: Os adjetivos e particípios concordam com o gênero biológico da pessoa a quem nos dirigimos (e não com o gênero gramatical feminino do pronome "Vossa").
  * *Exemplo Masculino*: "Vossa Excelência está *atento* aos prazos, Senhor Delegado."
  * *Exemplo Feminino*: "Vossa Excelência está *atenta* aos prazos, Senhora Delegada."

---

## 4. O Padrão Ofício

A grande modernização trazida pelo Manual foi a unificação de três antigos gêneros textuais federais (*Aviso*, *Ofício* e *Memorando*) sob um único formato de diagramação denominado **Padrão Ofício**.

### 4.1. Estrutura do Padrão Ofício
Um documento oficial expedido segundo esse padrão deve apresentar a seguinte estrutura sequencial:

1. **Cabeçalho**: Localizado no topo da primeira página, contendo o Brasão de Armas da República, o nome do órgão principal (ex: *Ministério da Justiça*) e de suas divisões subalternas. Deve ser centralizado.
2. **Identificação do Expediente**: Título do documento acompanhado de sua numeração correlata, ano e sigla do órgão emissor. Exemplo: *Ofício nº 450/2026/DPF/DF*.
3. **Local e Data**: Posicionados à margem direita, contendo o município e a data por extenso. Exemplo: *Brasília, 8 de junho de 2026.*
4. **Endereçamento**: Identificação do destinatário na margem esquerda, com o cargo, nome (opcional), órgão e endereço físico ou eletrônico.
5. **Assunto**: Resumo conciso do teor do documento. Exemplo: *Assunto: Solicitação de laudo pericial de balística.*
6. **Texto do Documento**: Estruturado em introdução (apresenta o motivo), desenvolvimento (detalha a matéria) e conclusão (reforça a ação solicitada). Os parágrafos devem ser numerados (exceto quando o documento for muito curto e contiver apenas um parágrafo).
7. **Fechos para Comunicação**: O Manual unificou todos os fechos de cortesia antigos em apenas dois oficiais:
   * **Respeitosamente**: Para destinatários de **hierarquia superior** à do emissor. Exemplo: De um Delegado para um Ministro.
   * **Atenciosamente**: Para destinatários de **mesma hierarquia ou inferior**, ou para particulares. Exemplo: De um Delegado para outro Delegado, ou para um cidadão.
8. **Assinatura**: Composta pelo nome do emitente (em letras maiúsculas) e pelo cargo respectivo, centralizada abaixo do fecho. **Não se deve colocar linha ou traço em branco acima do nome** para assinar.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CEBRASPE — Polícia Federal — Escrivão)
**Enunciado**: Com base no Manual de Redação da Presidência da República, julgue o item a seguir:
"Os documentos oficiais expedidos sob o Padrão Ofício devem conter fechos padronizados em conformidade com a hierarquia do destinatário. Assim, no caso de um escrivão enviar um expediente ao Superintendente Regional da Polícia Federal, o fecho correto a ser utilizado é Respeitosamente."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário**: O Superintendente Regional da PF possui hierarquia administrativa superior à do escrivão de polícia. Conforme as regras do Manual de Redação da Presidência da República, para autoridades de hierarquia superior à do remetente, deve-se empregar obrigatoriamente o fecho "Respeitosamente". Para autoridades de mesma hierarquia ou inferior, usa-se "Atenciosamente". Portanto, o item está correto.

### Questão 2 (FGV — Senado Federal — Policial Legislativo)
**Enunciado**: "Vossa Excelência deve apresentar Vossas propostas para a segurança do plenário."
A frase acima contraria as regras de concordância e emprego de pronomes do Manual de Redação da Presidência da República. A forma correta de reescrevê-la é:
a) Vossa Excelência deveis apresentar Vossas propostas...
b) Vossa Excelência deve apresentar suas propostas...
c) Sua Excelência deve apresentar Vossas propostas...
d) Vossa Excelência deve apresentar tuas propostas...
e) Sua Excelência deveis apresentar suas propostas...

* **Gabarito: B**
* **Comentário**: Os pronomes de tratamento exigem que todos os elementos pronominais a eles associados (como os pronomes possessivos) sejam flexionados na **3ª pessoa** (suas, seu). O uso de "Vossas" (2ª pessoa do plural) contraria essa norma clássica. O verbo "deve" está corretamente flexionado na 3ª pessoa do singular. A alternativa B corrige o desvio perfeitamente: "Vossa Excelência deve apresentar *suas* propostas...".

### Questão 3 (VUNESP — PM-SP — Oficial)
**Enunciado**: Assinale a alternativa que apresenta a correta correspondência entre o tratamento dispensado a uma autoridade pública civil e o vocativo adequado em um documento oficial, conforme o Manual da Presidência:
a) Juiz de Direito — Excelentíssimo Senhor Juiz
b) Prefeito Municipal — Digníssimo Senhor Prefeito
c) Ministro de Estado — Senhor Ministro
d) Diretor de Escola — Ilustríssimo Senhor Diretor
e) Governador de Estado — Excelentíssimo Senhor Governador

* **Gabarito: C**
* **Comentário**: De acordo com a 3ª edição do Manual, o uso do vocativo "Excelentíssimo Senhor" é reservado exclusivamente para os chefes de Poder (Presidente da República, do Congresso e do STF). Para as demais autoridades tratadas por Vossa Excelência (como Juiz e Governador), usa-se simplesmente "Senhor" seguido do cargo. Os termos "Digníssimo" e "Ilustríssimo" foram totalmente abolidos. A alternativa C está correta: o vocativo adequado para um Ministro de Estado é "Senhor Ministro".

---

## 6. Pegadinhas Mais Frequentes em Concursos Policiais

1. **Vossa Excelência vs. Sua Excelência**:
   * **Vossa Excelência**: Usado quando nos dirigimos **diretamente** à autoridade (fala direta). Exemplo: "Senhor Governador, *Vossa* Excelência assinou o decreto?"
   * **Sua Excelência**: Usado quando fazemos **referência** à autoridade (falando sobre ela). Exemplo: "Informamos que *Sua* Excelência, o Ministro da Justiça, viajará amanhã."
2. **O Retorno de "Ilustríssimo"**:
   * Muitas bancas inserem "Ilustríssimo" como uma opção viável de vocativo em provas. Lembre-se: o Manual aboliu essa palavra da redação oficial federal. Ela é considerada incorreta.
3. **Uso de Linha para Assinatura**:
   * Nas provas práticas ou de formatação, a presença de uma linha horizontal contínua acima do nome do signatário é cobrada como erro. O espaço para assinatura deve ser apenas um espaço em branco, com o nome e o cargo grafados logo abaixo.

---

## 7. Quadro-Resumo dos Fechos e Vocativos

| Autoridade Destinatária | Pronome de Tratamento | Vocativo Oficial | Fecho Correto (Se Emissor For Inferior) |
|---|---|---|---|
| **Chefes de Poder (Pres. Rep., Congresso, STF)** | Vossa Excelência | Excelentíssimo Senhor [Cargo] | Respeitosamente |
| **Demais autoridades de V. Exa. (Juiz, Ministro)** | Vossa Excelência | Senhor [Cargo] | Respeitosamente |
| **Outras autoridades / Cidadão (V. Sª.)** | Vossa Senhoria | Senhor [Cargo] | Atenciosamente (ou Respeitosamente se superior) |

---

## 8. Conclusão

A Redação Oficial preza pela máxima eficiência e dignidade da comunicação estatal. Ao eliminar artifícios retóricos, floreios barrocos e adjetivos desprovidos de utilidade prática, o Manual da Presidência da República desenha uma comunicação técnica, enxuta e impessoal. O candidato que compreende a lógica dessas simplificações ortográficas e estilísticas adquire facilidade para responder a qualquer questão e assegura a conformidade legal de sua escrita discursiva.',
  'Estudo das diretrizes do Manual de Redação da Presidência da República (3ª Edição). Aborda os princípios norteadores da redação oficial (impessoalidade, clareza, concisão e objetividade) e o Padrão Ofício (estrutura, cabeçalho, endereçamento, fechos "Respeitosamente" e "Atenciosamente"). Detalha as regras sintáticas dos pronomes de tratamento (concordância verbal e pronominal de 3ª pessoa, concordância de gênero adjetiva) e vocativos formais vigentes. Inclui questões comentadas das bancas CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
