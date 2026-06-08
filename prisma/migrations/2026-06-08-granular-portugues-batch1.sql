-- =====================================================================
-- BATCH 1 — Língua Portuguesa Granular
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
-- 1/8 — Concordância nominal e verbal
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Concordância nominal e verbal',
  'Concordância Nominal e Verbal para Concursos Policiais',
  E'# Concordância Nominal e Verbal

## 1. Introdução

A concordância é um dos pilares mais cobrados na prova de Língua Portuguesa para concursos policiais (como PF, PRF, PCDF, PCSP e PCRJ). Bancas como o CEBRASPE e a FGV exploram constantemente as relações sintáticas que envolvem o verbo e os nomes na oração para identificar se o candidato compreende a estrutura oracional básica e os desvios cultos. A importância reside no fato de que o domínio das regras de concordância garante não apenas pontos preciosos nas questões objetivas de gramática e reescrita, mas também a pontuação máxima no critério de correção gramatical na redação discursiva.

---

## 2. Conceitos Fundamentais

A concordância divide-se em duas esferas principais:

1. **Concordância Verbal**: É a harmonia sintática que se estabelece entre o verbo e o sujeito. A regra geral determina que o verbo deve flexionar-se em número (singular/plural) e pessoa (1ª, 2ª ou 3ª) para concordar com o núcleo do sujeito.
   * *Exemplo:* A viatura policial localizou o suspeito. (Viatura [núcleo singular] = localizou [3ª pessoa singular])
   * *Exemplo:* As viaturas policiais localizaram os suspeitos. (Viaturas [núcleo plural] = localizaram [3ª pessoa plural])

2. **Concordância Nominal**: É a harmonia que se estabelece entre os nomes. A regra geral estipula que os determinantes (artigos, adjetivos, pronomes adjetivos, numerais e particípios) concordam em gênero (masculino/feminino) e número com o substantivo a que se referem.
   * *Exemplo:* A nova portaria ministerial foi publicada ontem. (Nova [fem/sing], ministerial [fem/sing] concordam com portaria [substantivo fem/sing])

---

## 3. Regras com Exemplos Comentados

### 3.1. Concordância Verbal: Regras Fundamentais

#### A) Sujeito Composto
* **Anteposto ao verbo**: O verbo vai obrigatoriamente para o plural.
  * *Exemplo:* O inspetor e o escrivão colheram o depoimento.
* **Posposto ao verbo**: O verbo pode concordar com o núcleo mais próximo ou ir para o plural.
  * *Exemplo:* Compareceu o inspetor e o escrivão. (Concordância atrativa, comum em bancas como a FGV)
  * *Exemplo:* Compareceram o inspetor e o escrivão. (Concordância gramatical padrão)

#### B) Verbos Impessoais (Haver e Fazer)
Esta é a principal fonte de questões nas provas de carreiras policiais.
* **Verbo HAVER no sentido de "existir", "ocorrer" ou "tempo decorrido"**: É impessoal. Não tem sujeito. Deve ficar rigorosamente na **3ª pessoa do singular**.
  * *Exemplo Correto:* Havia muitos manifestantes diante da delegacia. (E não: "Haviam muitos...")
  * *Exemplo Correto:* Deve haver novas investigações no caso. (Em locução verbal, o verbo auxiliar herda a impessoalidade)
* **Verbo FAZER indicando tempo decorrido ou clima**: Também é impessoal e fica no singular.
  * *Exemplo Correto:* Faz dez anos que ingressei na corporação. (E não: "Fazem dez anos...")

#### C) O Pronome Apassivadora "SE" vs. Índice de Indeterminação do Sujeito "SE"
Outra pegadinha clássica das bancas organizadoras.
* **Com Verbo Transitivo Direto (VTD) ou Transitivo Direto e Indireto (VTDI)**: O "se" funciona como **partícula apassivadora**. O termo sem preposição será o sujeito paciente, e o verbo deve concordar com ele.
  * *Exemplo:* Alugam-se armamentos. (Armamentos [sujeito no plural] = alugam-se [plural])
  * *Exemplo:* Busca-se o suspeito. (O suspeito [sujeito singular] = busca-se [singular])
* **Com Verbo Transitivo Indireto (VTI), Intransitivo (VI) ou de Ligação (VL)**: O "se" é **índice de indeterminação do sujeito**. O sujeito é indeterminado, e o verbo deve ficar fixo na **3ª pessoa do singular**.
  * *Exemplo:* Precisa-se de novos agentes. (De novos agentes é objeto indireto preposicionado. O verbo fica no singular: "precisa-se")

#### D) Sujeito representado por Expressões Partitivas ("a maioria de", "grande parte de")
Se o núcleo do sujeito for uma expressão partitiva seguida de substantivo ou pronome no plural, o verbo pode ficar no singular (concordando com a expressão) ou ir para o plural (concordando com o termo no plural).
* *Exemplo:* A maioria dos policiais participou da operação. (Concordância com "A maioria")
* *Exemplo:* A maioria dos policiais participaram da operação. (Concordância com "policiais")

### 3.2. Concordância Nominal: Regras Fundamentais

#### A) Adjetivo que modifica vários substantivos
* **Posposto aos substantivos**: O adjetivo concorda com o substantivo mais próximo ou vai para o plural (se forem de gêneros diferentes, prevalece o masculino plural).
  * *Exemplo:* Encontramos o delegado e a escrivã empenhada. (Atrativa)
  * *Exemplo:* Encontramos o delegado e a escrivã empenhados. (Masculino plural geral)
* **Anteposto aos substantivos**: O adjetivo concorda obrigatoriamente com o substantivo mais próximo.
  * *Exemplo:* Avistamos a nova viatura e armamentos. (Concorda com viatura)
  * *Exemplo:* Avistamos o novo armamento e viaturas. (Concorda com armamento)

#### B) Palavras especiais e expressões
* **Anexo, Incluso, Próprio, Obrigado, Mesmo**: Funcionam como adjetivos. Devem concordar em gênero e número com o substantivo.
  * *Exemplo:* As provas seguem anexas ao inquérito.
  * *Exemplo:* Eles mesmos redigiram o boletim de ocorrência.
  * *Exemplo:* A delegada disse: "Muito obrigada pelo relatório".
  * *Observação:* A locução "em anexo" é invariável. Exemplo: "As provas seguem em anexo".
* **Meio, Bastante, Barato, Caro**:
  * Se funcionarem como **adjetivo/pronome** (modificando substantivo), variam.
    * *Exemplo:* Havia bastantes indícios contra o réu. (Bastantes = muitos)
    * *Exemplo:* Bebeu meia garrafa de água. (Meia = metade)
  * Se funcionarem como **adverbio** (modificando adjetivo, verbo ou outro advérbio), são invariáveis.
    * *Exemplo:* Os policiais estavam bastante cansados. (Bastante = muito)
    * *Exemplo:* Ela estava meio apreensiva com o depoimento. (Meio = um pouco)
* **Alerta, Menos**: São palavras **invariáveis**.
  * *Exemplo Correto:* Os policiais estão alerta. (Nunca "alertas")
  * *Exemplo Correto:* Havia menos testemunhas no tribunal. (Nunca "menas")

---

## 4. Casos Especiais e Exceções

1. **Pronomes Relativos "QUE" e "QUEM"**:
   * Com o pronome **QUE**, o verbo concorda com o termo antecedente.
     * *Exemplo:* Fui eu que efetuei a prisão. ("eu" antecede "que" -> verbo na 1ª pessoa do singular)
   * Com o pronome **QUEM**, o verbo pode ficar na 3ª pessoa do singular ou concordar com o termo antecedente.
     * *Exemplo:* Fui eu quem efetuou a prisão. (3ª pessoa singular)
     * *Exemplo:* Fui eu quem efetuei a prisão. (Concordando com "eu")
2. **Concordância com o verbo SER**:
   * O verbo SER pode concordar com o sujeito ou com o predicativo do sujeito. Em geral, se um dos termos for pronome pessoal ou pessoa, a concordância é feita preferencialmente com ele.
     * *Exemplo:* O foco da polícia eram as fraudes cibernéticas. (Concorda com o predicativo "as fraudes")
     * *Exemplo:* O culpado sou eu. (Concorda com o pronome "eu")
3. **Silepse (Concordância Ideológica)**: Ocorre quando a concordância é feita com a ideia subentendida e não com o termo explícito. Muito comum em redações e textos literários, mas as bancas costumam apontar como desvio em provas de reescrita formal.
     * *Exemplo:* A população gritavam por justiça. (Silepse de número: população remete a muitas pessoas)

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PCDF — Escrivão de Polícia)
**Enunciado:** Julgue o item quanto à correção gramatical:
"Haveria, no decorrer do inquérito policial, de existirem razões suficientes para a decretação da prisão preventiva."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário:** O verbo "haver" está funcionando aqui como verbo auxiliar de uma locução verbal cujo verbo principal é "existir" ("haveria de existir"). Quando o verbo "haver" é auxiliar de outro verbo que não seja impessoal, ele deve concordar normalmente com o sujeito. No entanto, o verbo principal aqui é "existir", que possui sujeito ("razões suficientes"). O verbo principal "existir" é pessoal, logo ele flexiona-se ("existirem"), mas a locução verbal inteira deve concordar com o sujeito "razões suficientes". Portanto, o correto seria: "Haveriam, no decorrer do inquérito, de existir..." ou "Haveria de existir razões..." (no singular se considerássemos o haver como impessoal, mas aqui "existir" atua como principal e atrai o plural para a locução). Na verdade, a locução estruturada com "haver de + existir" exige a flexão do auxiliar: "Haveriam de existir razões". Como a banca deixou o auxiliar no singular e o principal no plural ("Haveria... de existirem"), a estrutura está incorreta.

### Questão 2 (FGV — Inspetor de Polícia Civil — PCRJ)
**Enunciado:** Assinale a frase que apresenta ERRO de concordância verbal:
a) Fazem dez meses que a investigação foi concluída pela corregedoria.
b) Trata-se de crimes de lavagem de dinheiro de alta complexidade.
c) Haviam restado poucas pistas no local do latrocínio.
d) Choveram denúncias anônimas após a divulgação do retrato falado.
e) Não se devem poupar esforços para a localização do refém.

* **Gabarito: A**
* **Comentário:** O verbo "fazer" quando expressa tempo decorrido é impessoal e deve permanecer no singular. A forma correta é: "Faz dez meses...". A alternativa B está correta pois "trata-se" possui o "se" como índice de indeterminação do sujeito (VTI + se), exigindo verbo no singular. A alternativa C está correta porque o sujeito é "poucas pistas" e o verbo "restar" é pessoal ("haviam restado" - o auxiliar concorda). A alternativa D está correta pois "choveram" está usado em sentido figurado (pessoal). A alternativa E está correta porque o "se" é partícula apassivadora (devem-se poupar esforços = esforços não devem ser poupados).

### Questão 3 (VUNESP — Investigador de Polícia — PCSP)
**Enunciado:** Assinale a alternativa correta quanto à concordância nominal:
a) As declarações prestadas pelos suspeitos foram bastantes confusas.
b) Seguem inclusos na pasta os laudos periciais da balística.
c) A perita considerou desnecessário a realização de novas diligências.
d) Ficou decidido que a equipe policial manteria as portas abertas e os agentes alertas.
e) Ela mesma declarou que estava meia desconfiada do álibi do acusado.

* **Gabarito: B**
* **Comentário:** A alternativa B está correta porque "inclusos" concorda com "os laudos periciais" (masculino plural). 
  * Erro na A: "confusas" é adjetivo, logo "bastantes" deveria ser "bastante" (advérbio = muito).
  * Erro na C: O termo é "a realização" (feminino), logo a concordância correta seria "desnecessária a realização".
  * Erro na D: "Alerta" é invariável, devendo ficar no singular ("agentes alerta").
  * Erro na E: "Meio" no sentido de "um pouco" é advérbio e não varia ("meio desconfiada").

---

## 6. Pegadinhas Mais Frequentes

1. **Falso sujeito preposicionado**: O sujeito nunca vem precedido de preposição. As bancas adoram colocar um termo plural preposicionado logo antes do verbo para induzir o candidato ao erro.
   * *Pegadinha:* "A prisão dos sequestradores ocorreram ontem." (O núcleo é "prisão" [singular], o verbo correto é "ocorreu". "Dos sequestradores" é apenas adjunto adnominal preposicionado).
2. **"Bastante" vs "Bastantes"**: Substitua por "muito" ou "muitos". Se couber "muitos", use "bastantes" no plural. Se couber "muito", use "bastante" no singular.
3. **Verbos que concordam com porcentagem**: 
   * Se a porcentagem não vier acompanhada de especificação: o verbo concorda com o número da porcentagem. (Ex: "1% preferiu silenciar", "20% exigiram presença").
   * Se vier especificada: o verbo concorda com o número ou com o termo especificador. (Ex: "25% da tropa faltou/faltaram").
4. **Locução verbal com verbo impessoal**: A impessoalidade do verbo principal sempre se transmite para o verbo auxiliar.
   * *Pegadinha:* "Devem haver suspeitos na sala." -> Correto: "Deve haver suspeitos na sala."

---

## 7. Quadro-Resumo

| Caso | Regra Sintática | Exemplo Prático |
|---|---|---|
| **Haver (existir/tempo)** | Fixo no Singular | *Houve* ocorrências na noite passada. |
| **Fazer (tempo/clima)** | Fixo no Singular | *Faz* duas semanas que a equipe viajou. |
| **Partícula "se" (VTD)** | Verbo concorda com o sujeito | *Instauraram-se* novos inquéritos. |
| **Índice "se" (VTI)** | Fixo no Singular (3ª pes.) | *Precisa-se* de novas pistas. |
| **Palavra "Alerta"** | Invariável | Os sentinelas continuavam *alerta*. |
| **Palavra "Menos"** | Invariável (não existe menas) | Havia *menos* viaturas disponíveis. |
| **Expressões de quantidade** | Concorda com o coletivo ou com o termo | A maioria dos réus *ficou/ficaram* calados. |

---

## 8. Conclusão

Dominar a concordância nominal e verbal exige mais do que memorizar regras: exige a capacidade de analisar a sintaxe da oração e identificar o sujeito e os núcleos aos quais o verbo e os nomes se referem. Para concursos de carreiras policiais, o foco absoluto deve ser na identificação do papel da palavra "se", na impessoalidade dos verbos "haver" e "fazer", e no comportamento de termos invariáveis como "alerta" e "menos". Praticar a análise sintática resolverá 90% das questões de concordância nas provas de concurso.

---',
  'Concordância verbal (relação sujeito-verbo) e nominal (relação substantivo-determinantes). Foco em verbos impessoais (haver como existir, fazer com tempo decorrido), partícula apassivadora (VTD+se) vs índice de indeterminação do sujeito (VTI+se), concordância nominal de palavras especiais (anexo, bastante, meio, alerta, menos) e análise de questões reais de concurso das bancas CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 2/8 — Regência nominal e verbal
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Regência nominal e verbal',
  'Regência Nominal e Verbal: Guia Completo com Foco em Bancas',
  E'# Regência Nominal e Verbal

## 1. Introdução

O estudo da regência (nominal e verbal) é indispensável para candidatos a concursos das carreiras policiais. As bancas utilizam a regência como um instrumento de avaliação da capacidade de análise sintática e semântica do candidato, associando o emprego correto das preposições a mudanças sutis de significado dos verbos ou à correção gramatical de estruturas complexas. Erros de regência verbal (como o clássico uso de "implicar em") e a omissão de preposição antes de pronomes relativos são recorrentemente explorados em provas do CEBRASPE, FGV e VUNESP. Além disso, a regência está intimamente ligada ao uso da crase, tornando este tema duplamente importante.

---

## 2. Conceitos Fundamentais

A regência estuda a relação de subordinação que se estabelece entre um termo regente (que exige um complemento) e um termo regido (o complemento que conclui o sentido do regente).

* **Regência Verbal**: Ocorre quando o termo regente é um **verbo**. O verbo exige ou não uma preposição para se ligar ao seu complemento (objeto direto ou indireto).
  * *Exemplo:* Os policiais aspiram *a* cargos melhores. (Aspiram [termo regente, exige prep. "a"] = a cargos melhores [termo regido, objeto indireto])
* **Regência Nominal**: Ocorre quando o termo regente é um **nome** (substantivo, adjetivo ou advérbio). O nome exige uma preposição específica para se ligar ao seu complemento nominal.
  * *Exemplo:* A conduta do agente foi nociva *à* investigação. (Nociva [adjetivo regente, exige prep. "a"] = à investigação [complemento nominal regido])

---

## 3. Regras com Exemplos Comentados

### 3.1. Regência Verbal: Verbos Fundamentais em Concursos

Abaixo estão listados os verbos mais explorados em provas policiais, cujos significados mudam de acordo com a preposição empregada.

#### A) Assistir
* **Sentido de "ver", "presenciar"**: É Transitivo Indireto. Exige a preposição **A**. Não admite o pronome "lhe" como objeto indireto na norma culta (usa-se "a ele", "a ela").
  * *Exemplo:* Os policiais assistiram *ao* julgamento do réu. (E não: "assistiram o julgamento")
* **Sentido de "dar assistência", "ajudar"**: Admite dupla regência (Transitivo Direto ou Transitivo Indireto).
  * *Exemplo:* O médico legista assistiu *o* perito. (Ou: "assistiu *ao* perito")
* **Sentido de "caber", "pertencer" (direito)**: É Transitivo Indireto. Exige a preposição **A**. Admite o pronome "lhe".
  * *Exemplo:* Assiste *ao* acusado o direito de permanecer em silêncio. (Ou: "Assiste-*lhe* o direito...")
* **Sentido de "morar", "residir"**: É Intransitivo. Exige a preposição **EM** acompanhada de adjunto adverbial de lugar.
  * *Exemplo:* A testemunha assiste *em* Florianópolis.

#### B) Aspirar
* **Sentido de "sorver", "cheirar", "respirar"**: É Transitivo Direto. Não exige preposição.
  * *Exemplo:* O cão farejador aspirou *o* ar da sala.
* **Sentido de "desejar", "almejar", "pretender"**: É Transitivo Indireto. Exige a preposição **A**. Não admite "lhe" (usa-se "a ele", "a eles").
  * *Exemplo:* Todos os candidatos aspiram *ao* cargo de investigador. (E não: "aspiram o cargo")

#### C) Visar
* **Sentido de "dar visto", "mirar"**: É Transitivo Direto. Não exige preposição.
  * *Exemplo:* O delegado visou *as* folhas do inquérito.
* **Sentido de "objetivar", "ter em vista"**: É Transitivo Indireto. Exige a preposição **A**.
  * *Exemplo:* A nova estratégia de segurança visa *ao* combate do crime organizado. (E não: "visa o combate")

#### D) Preferir
* É Transitivo Direto e Indireto. A estrutura culta exige: **preferir alguma coisa A outra**.
* **Atenção**: É terminantemente proibido usar expressões de intensidade como "mais", "muito mais", ou a preposição "do que".
  * *Exemplo Incorreto:* Prefiro trabalhar no plantão do que no expediente.
  * *Exemplo Correto:* Prefiro o serviço de plantão *ao* de expediente.

#### E) Esquecer e Lembrar
* **Forma Não Pronome (sem pronome oblíquo)**: São Transitivos Diretos. Não exigem preposição.
  * *Exemplo:* O réu esqueceu *o* álibi.
* **Forma Pronome (com pronome oblíquo "se")**: São Transitivos Indiretos. Exigem a preposição **DE**.
  * *Exemplo:* O réu esqueceu-*se do* álibi.
  * *Observação:* A mistura dessas estruturas gera erro grave em provas (ex: "ele esqueceu do relatório" -> incorreto; correto: "ele se esqueceu do relatório" ou "ele esqueceu o relatório").

#### F) Implicar
* **Sentido de "acarretar", "trazer como consequência"**: É Transitivo Direto. Não exige preposição.
  * *Exemplo:* A recusa em soprar o bafômetro implica *multa* gravíssima. (E não: "implica em multa")
* **Sentido de "ter implicância"**: É Transitivo Indireto. Exige preposição **COM**.
  * *Exemplo:* O inspetor implicava *com* o novato.

### 3.2. Regência Nominal: Casos Críticos

Diversos adjetivos e substantivos exigem preposições específicas que costumam ser confundidas na linguagem coloquial.

* **Aversão**: exige *a*, *para*, *por*. (Ex: "Tinha aversão *a* burocracia/aversão *pela* corrupção").
* **Atento**: exige *a*, *em*. (Ex: "O policial estava atento *aos* detalhes").
* **Contemporâneo**: exige *a*, *de*. (Ex: "O caso é contemporâneo *à* reforma penal").
* **Nocivo / Benéfico**: exige *a*. (Ex: "Poluição é nociva *à* saúde").
* **Imune**: exige *a*, *de*. (Ex: "O parlamentar não é imune *a* processo criminal").
* **Prefácio / Introdução**: exige *a*, *de*. (Ex: "O prefácio *ao* livro foi escrito pelo secretário").

---

## 4. Casos Especiais: Regência com Pronomes Relativos

Este é o padrão preferido do CEBRASPE para anular itens de candidatos desatentos. Quando a oração subordinada adjetiva é introduzida por um pronome relativo (que, quem, cujo, onde, a qual), **se o verbo da oração subordinada exigir preposição, esta deve ser transposta para antes do pronome relativo**.

* *Exemplo 1 (Verbo Aspirar = desejar):*
  * O cargo *a que* aspiro exige nível superior. (Quem aspira, aspira **a** algo. A preposição "a" migra para antes do "que").
* *Exemplo 2 (Verbo Confiar = VTI que pede "em"):*
  * Estes são os agentes *em quem* confio. (Quem confia, confia **em** alguém).
* *Exemplo 3 (Verbo Aludir = VTI que pede "a" + substantivo feminino):*
  * A lei *à qual* aludimos foi revogada. (Aludir pede "a" + a qual = à qual com crase).

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PF — Papiloscopista)
**Enunciado:** Julgue a correção gramatical do trecho:
"Os peritos criminais necessitam identificar a substância com que os suspeitos tiveram contato no laboratório clandestino."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário:** O verbo da oração subordinada é "tiveram contato". O substantivo "contato" exige a preposição "com" (quem tem contato, tem contato **com** algo). O pronome relativo "que" retoma "a substância". A preposição "com" exigida pelo nome foi corretamente deslocada para antes do pronome relativo ("com que").

### Questão 2 (FGV — PC-RJ — Delegado de Polícia)
**Enunciado:** Assinale a opção em que a regência do verbo sublinhado está de acordo com a norma-padrão:
a) Os policiais assistiram *ao* resgate dramático das vítimas de sequestro.
b) Preferimos prender o assaltante *do que* deixá-lo fugir sob custódia.
c) O inquérito instaurado pelo delegado de polícia implicou *em* punições severas aos réus.
d) Custou *ao* escrivão para terminar de digitar o longo depoimento da testemunha.
e) O novo sistema de monitoramento de câmeras visa *o* controle da criminalidade no centro.

* **Gabarito: A**
* **Comentário:** 
  * A está correta porque "assistiram ao resgate" usa "assistir" no sentido de presenciar, que exige objeto indireto com a preposição "a".
  * B está errada pelo uso de "do que" (o correto é "Preferimos prender o assaltante *a* deixá-lo fugir").
  * C está errada porque "implicar" (acarretar) é Transitivo Direto ("implicou punições", sem "em").
  * D está errada porque o verbo "custar" (ser difícil) na norma culta constrói-se como "Custou ao escrivão terminar..." (sem o "para" e com a oração subjetiva como sujeito).
  * E está errada porque "visar" (objetivar) pede preposição "a" ("visa ao controle").

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa em que a regência nominal está correta:
a) Ele demonstrou capacidade em coordenar a operação com calma.
b) O detento mostrou-se inclinado de confessar a autoria do roubo.
c) O plano de fuga arquitetado era equivalente com o do ano anterior.
d) Os policiais estavam ávidos por receber as diretrizes do comandante.
e) A testemunha demonstrou total alheamento com os fatos narrados.

* **Gabarito: D**
* **Comentário:** O adjetivo "ávidos" rege corretamente a preposição "por" ou "de" (quem está ávido, está ávido *por* algo ou *de* algo).
  * Na A, o substantivo "capacidade" rege a preposição "de" ("capacidade *de* coordenar" ou "capacidade *para* coordenar").
  * Na B, "inclinado" rege a preposição "a" ("inclinado *a* confessar").
  * Na C, "equivalente" exige a preposição "a" ("equivalente *ao* do ano anterior").
  * Na E, "alheamento" rege a preposição "a" ou "de" ("alheamento *dos* fatos" ou *aos* fatos).

---

## 6. Pegadinhas Mais Frequentes

1. **"Implicar em"**: É o campeão absoluto de erros em redações e questões de reescrita. Lembre-se: "Implicar" no sentido de "trazer consequências" é **VTD** (não pede "em").
   * *Incorreto:* "Isso implica em demissão." -> *Correto:* "Isso implica demissão."
2. **"Esquecer do"**: Misturar a regência pronominal com a não-pronominal é erro certo.
   * *Incorreto:* "Esqueci do coldre." -> *Correto:* "Esqueci o coldre" ou "Esqueci-me do coldre".
3. **"Custar" (dificuldade)**: Na linguagem coloquial, dizemos "eu custei para entender". Na norma culta, o ser humano nunca é sujeito desse verbo. O sujeito é a ação.
   * *Incorreto:* "O policial custou para achar a pista." -> *Correto:* "Custou ao policial achar a pista." (Achar a pista custou ao policial).
4. **Responder**: No sentido de dar resposta a algo, exige preposição "a" (VTI).
   * *Incorreto:* "Respondi o questionário da corregedoria." -> *Correto:* "Respondi ao questionário..."

---

## 7. Quadro-Resumo

| Verbo / Nome | Sentido / Tipo | Regência Padrão | Exemplo |
|---|---|---|---|
| **Assistir** | Ver / Presenciar | Exige **A** | Assistimos *ao* treinamento. |
| **Aspirar** | Desejar | Exige **A** | Aspiro *ao* cargo de Delegado. |
| **Visar** | Objetivar | Exige **A** | Visamos *à* paz social. |
| **Implicar** | Acarretar | VTD (Sem Preposição) | A infração implica *multa*. |
| **Preferir** | Escolha | Algo **A** outra coisa | Prefiro a verdade *à* mentira. |
| **Lembrar-se** | Pronominal | Exige **DE** | Lembrou-se *do* distintivo. |
| **Esquecer** | Não Pronominal | VTD (Sem Preposição) | Esqueceu *o* relatório. |
| **Nocivo** | Adjetivo | Exige **A** | Droga é nociva *ao* cérebro. |

---

## 8. Conclusão

A regência é um tema altamente lógico que exige a memorização de algumas regências específicas de verbos e nomes chave, além de um forte domínio da sintaxe de orações subordinadas adjetivas (o posicionamento das preposições antes do "que" ou "quem"). Para garantir o sucesso nas provas de carreiras policiais, revise com frequência o comportamento dos verbos *assistir*, *aspirar*, *visar*, *preferir* e *implicar*, e sempre verifique se a preposição exigida pelos verbos foi adequadamente transportada nas orações adjetivas.

---',
  'Regência verbal e nominal na norma-padrão. Análise da transitividade de verbos recorrentes (assistir, aspirar, visar, preferir, esquecer/lembrar, implicar) e das preposições exigidas por nomes comuns. Foco em pegadinhas de concurso, transposição de preposições antes de pronomes relativos em orações adjetivas, e resolução de questões reais do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 3/8 — Emprego do sinal indicativo de crase
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Emprego do sinal indicativo de crase',
  'Emprego do Sinal Indicativo de Crase: Regras e Prática de Prova',
  E'# Emprego do Sinal Indicativo de Crase

## 1. Introdução

O emprego do acento grave, indicador da crase, é um dos assuntos mais frequentes e decisivos em provas de concursos policiais. Bancas como o CEBRASPE, a FGV e a VUNESP cobram a identificação dos casos obrigatórios, proibidos e facultativos para testar a atenção gramatical do candidato e sua habilidade de reescrita. A crase não é uma mera regra de pronúncia, mas um fenômeno estritamente gráfico-sintático. Dominar suas regras evita penalizações na prova objetiva e garante a precisão exigida na redação discursiva.

---

## 2. Conceitos Fundamentais

A palavra "crase" é de origem grega e significa "fusão" ou "mistura". Na Língua Portuguesa, ela representa a fusão de duas vogais idênticas, especificamente:

$$\\text{Preposição A} + \\text{Artigo Feminino A(S)} = \\text{À(S)}$$

Para que a crase ocorra, é necessária a presença simultânea de dois fatores:
1. **Regência**: Um termo regente (verbo ou nome) que exige a preposição **A**.
2. **Admissão**: Um termo regido (substantivo feminino) que admite o artigo definido feminino **A** ou **AS**, ou que seja um pronome demonstrativo iniciado pela letra A (aquele, aquela, aquilo).
   * *Exemplo:* Referiu-se *à* delegada. (Referir-se pede preposição **A**; delegada aceita artigo **A** -> A + A = À)

---

## 3. Regras com Exemplos Comentados

### 3.1. Casos Obrigatórios

#### A) Antes de Substantivos Femininos com Regência Adequada
É a aplicação direta da regra geral. Substitua a palavra feminina por uma masculina equivalente: se surgir a forma **AO**, há crase.
* *Exemplo:* O escrivão entregou as cópias *à* investigadora. (Substituindo por investigador: "entregou as cópias *ao* investigador" -> Crase obrigatória).

#### B) Locuções Femininas (Adverbiais, Prepositivas e Conjuntivas)
As locuções que possuem núcleo feminino sempre recebem o acento grave indicador de crase, independentemente da regência.
* **Locuções Adverbiais**: à noite, à tarde, às pressas, às escondidas, à deriva, à beira-mar.
  * *Exemplo:* Os agentes agiram *à noite* no morro.
* **Locuções Prepositivas** (estruturadas com "à + palavra feminina + de"): à procura de, à espera de, à iminência de.
  * *Exemplo:* A equipe estava *à procura de* pistas.
* **Locuções Conjuntivas**: à medida que, à proporção que.
  * *Exemplo:* *À medida que* a investigação avançava, o suspeito se isolava.

#### C) Indicação de Horas Determinadas
A crase ocorre antes de numerais que indicam horas exatas.
* *Exemplo:* A operação policial terá início *às 6 horas*.
* *Exemplo:* O plantão termina *à uma hora* da manhã.
* *Observação:* Se houver preposições como *para, desde, após, perante, sob*, não ocorre crase. (Ex: "A reunião estava marcada *para as* 14h").

#### D) Nomes de Cidades e Países (Regra do "Vou a, Volto da")
Para saber se o nome de um lugar admite artigo feminino, use o mnemônico:
* *Se vou A e volto DA, crase HÁ.*
* *Se vou A e volto DE, crase pra QUÊ?*
  * *Exemplo:* Vou *à* Bahia. (Volto *da* Bahia -> crase há)
  * *Exemplo:* Vou *a* Brasília. (Volto *de* Brasília -> sem crase)
  * *Exceção:* Se o nome do lugar vier especificado por um adjunto adnominal, haverá crase. (Ex: "Vou *à* Brasília de JK").

#### E) Antes dos Pronomes Demonstrativos "Aquele(s)", "Aquela(s)", "Aquilo"
Ocorre a fusão da preposição **A** exigida pelo termo regente com a letra **A** inicial desses pronomes.
* *Exemplo:* O policial aludiu *àquele* suspeito no depoimento. (Quem alude, alude *a* -> a + aquele = àquele)

### 3.2. Casos Proibidos

Bancas de concurso adoram inserir o acento grave nestas situações para pegar candidatos pelo ouvido.

1. **Antes de palavras masculinas**: Não existe artigo feminino "a" antes de termo masculino.
   * *Exemplo Incorreto:* Viagem à prazo, crime à mão armada, ronda à pé.
   * *Exemplo Correto:* Viagem a prazo, crime a mão armada, ronda a pé.
2. **Antes de verbos no infinitivo**: Verbos não admitem artigo feminino.
   * *Exemplo Incorreto:* Disposto à colaborar, a partir de hoje.
   * *Exemplo Correto:* Disposto a colaborar, a partir de hoje.
3. **Antes de pronomes pessoais e de tratamento**: (exceto *senhora, senhorita* e *dona*).
   * *Exemplo Incorreto:* Dirigi-me à ela, solicitou à Vossa Excelência.
   * *Exemplo Correto:* Dirigi-me a ela, solicitou a Vossa Excelência.
4. **Entre palavras repetidas formando expressões**:
   * *Exemplo Incorreto:* Cara à cara, dia à dia, frente à frente.
   * *Exemplo Correto:* Cara a cara, dia a dia, frente a frente.
5. **Com o "A" no singular diante de palavra no plural**: Se o "A" estiver no singular, ele é apenas preposição (não há artigo "as"), logo não pode haver crase.
   * *Exemplo Incorreto:* Refiro-me à testemunhas.
   * *Exemplo Correto:* Refiro-me *a* testemunhas. (Ou: "Refiro-me *às* testemunhas", se houver artigo).

### 3.3. Casos Facultativos

Estes casos são cruciais para questões do tipo "Assinale a opção em que a retirada do acento grave altera a correção gramatical do texto".

1. **Antes de nomes próprios de mulheres (no singular)**: O uso do artigo antes de nomes próprios femininos é opcional no Brasil.
   * *Exemplo:* Entreguei o mandado *a* Maria. (Sem crase)
   * *Exemplo:* Entreguei o mandado *à* Maria. (Com crase)
2. **Antes de pronomes possessivos femininos no singular**:
   * *Exemplo:* Fez alusão *a* minha viatura. (Sem crase)
   * *Exemplo:* Fez alusão *à* minha viatura. (Com crase)
   * *Atenção:* Se o pronome possessivo estiver no plural, a crase torna-se obrigatória caso venha o "as". (Ex: "Fez alusão *às* minhas viaturas").
3. **Após a preposição ATÉ**:
   * *Exemplo:* Os agentes caminharam até *a* delegacia. (Sem crase)
   * *Exemplo:* Os agentes caminharam até *à* delegacia. (Com crase)

---

## 4. Casos Especiais

* **À moda de / À maneira de**: Ocorre crase mesmo antes de palavras masculinas se a expressão "à moda de" estiver implícita.
  * *Exemplo:* Escrevia *à* Camões. (À maneira de Camões)
  * *Exemplo:* Churrasco *à* Oswaldo Aranha. (À moda de Oswaldo Aranha)
* **Casa e Terra**:
  * A palavra **casa** (sentido de lar próprio) só admite crase se estiver especificada.
    * *Exemplo:* O policial voltou *a* casa. (Sem crase)
    * *Exemplo:* O policial voltou *à* casa *do coronel*. (Especificada -> com crase)
  * A palavra **terra** (sentido de terra firme, oposta a mar/ar) só admite crase se estiver especificada.
    * *Exemplo:* Os marinheiros desceram *a* terra. (Sem crase)
    * *Exemplo:* Os imigrantes regressaram *à* terra *natal*. (Especificada -> com crase)

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PRF — Policial)
**Enunciado:** O emprego do sinal indicativo de crase em "O acesso às tecnologias de informação" é obrigatório. Caso a palavra "tecnologias" fosse substituída por "recursos", a redação correta seria "O acesso aos recursos de informação".
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário:** A questão cobra a regra geral de substituição. "Acesso" exige a preposição "a" (quem tem acesso, tem acesso *a*). "Tecnologias" (feminino plural) admite o artigo "as", resultando na fusão "às". Ao substituir pelo masculino plural "recursos", temos "a" (preposição) + "os" (artigo) = "aos". Isso confirma que a crase era de fato obrigatória e a substituição está gramaticalmente correta.

### Questão 2 (FGV — PC-RJ — Inspetor de Polícia)
**Enunciado:** Assinale a opção que apresenta a frase em que o emprego do sinal indicativo de crase está INCORRETO:
a) O acusado declarou-se disposto a colaborar com as investigações à partir de amanhã.
b) Os policiais civis compareceram à reunião marcada para as quatorze horas.
c) O motorista da viatura dirigiu-se àquela guarita que ficava na divisa do estado.
d) Não daremos informações à imprensa até que o inquérito seja concluído.
e) O delegado prestou depoimento favorável à liberação da verba ministerial.

* **Gabarito: A**
* **Comentário:** O erro está na alternativa A. A palavra "partir" é um verbo no infinitivo, e a norma gramatical proíbe terminantemente o uso da crase antes de verbos. A grafia correta é "a partir de". Todas as outras alternativas estão corretas: B tem indicação de horas; C tem crase antes do demonstrativo "aquela"; D tem objeto indireto feminino da regência do verbo "dar" ("dar informações *à* imprensa"); E tem complemento nominal regido pelo adjetivo "favorável" ("favorável *à* liberação").

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa em que a presença ou ausência da crase é facultativa:
a) A promotora fez uma grave advertência à testemunha que mentiu.
b) Os agentes da lei mantiveram-se atentos à movimentação suspeita.
c) O jovem detento escreveu uma carta de desculpas à sua mãe.
d) O resgate da vítima de sequestro ocorreu às escuras na mata densa.
e) O suspeito do latrocínio foi conduzido diretamente à delegacia.

* **Gabarito: C**
* **Comentário:** A alternativa C apresenta a crase antes do pronome possessivo feminino singular "sua" ("à sua mãe"). De acordo com a gramática normativa, o uso do artigo antes de pronome possessivo feminino singular é opcional, tornando o acento grave opcional (pode ser "à sua mãe" ou "a sua mãe"). Em todos os outros casos, a crase é obrigatória por regência verbal ou nominal e pela presença das locuções.

---

## 6. Pegadinhas Mais Frequentes

1. **"A partir de" com crase**: As bancas apostam que o candidato se confunde devido ao uso comercial errôneo dessa locução. Memorize: **Não há crase antes de verbo.**
2. **"Frente a frente" e outras expressões repetidas**: Não há artigo no meio dessas expressões, apenas preposição. Portanto, a crase é proibida.
3. **Falsa crase em horas antecedidas de preposição**: "Chegou *após às* 15h" (Errado). O correto é "Chegou *após as* 15h" (a preposição "após" impede a presença da preposição "a").
4. **"A" singular antes de palavra no plural**: Se o substantivo seguinte está no plural e o "a" está no singular, trata-se de preposição pura. Não use crase.

---

## 7. Quadro-Resumo

| Situação | Regra de Uso | Exemplo Prático |
|---|---|---|
| **Antes de Masculino** | Proibido | Andar *a* cavalo. |
| **Antes de Verbo** | Proibido | Começou *a* chover. |
| **Expressões Repetidas** | Proibido | Ficou cara *a* cara. |
| **Adverbiais Femininas** | Obrigatório | Saiu *à* noite. |
| **Horas Determinadas** | Obrigatório | Chegou *às* 14 horas. |
| **Antes de Nomes de Mulheres** | Facultativo | Entreguei *à/a* Patrícia. |
| **Antes de Possessivo Singular** | Facultativo | Fui *à/a* minha sala. |

---

## 8. Conclusão

A crase não deve ser encarada como uma marcação aleatória de escrita, mas sim como a união exata da preposição "a" exigida pelo termo regente com o artigo feminino "a" do termo regido. Para gabaritar crase em concursos policiais, o candidato deve focar na identificação de substantivos masculinos e verbos no infinitivo (que proíbem a crase) e na verificação atenta dos casos facultativos, que são os preferidos das bancas para testar a flexibilidade e a reescrita gramatical.

---',
  'Estudo aprofundado do emprego do sinal indicativo de crase. Definição do fenômeno gráfico-sintático da contração (preposição + artigo/pronome), análise dos casos obrigatórios (relação regente/regido, locuções femininas e horas exatas), casos proibidos (masculinos, verbos, pronomes) e casos facultativos (possessivos e nomes próprios). Inclui resolução comentada de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 4/8 — Colocação pronominal
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Colocação pronominal',
  'Colocação Pronominal: Próclise, Mesóclise e Ênclise em Prova',
  E'# Colocação Pronominal

## 1. Introdução

A colocação pronominal — o estudo da correta posição dos pronomes oblíquos átonos (me, te, se, nos, vos, o, a, os, as, lhe, lhes) em relação ao verbo — é um dos tópicos mais frequentes em provas de Língua Portuguesa para as carreiras policiais. Bancas como o CEBRASPE exploram muito a reescrita de frases para verificar se o candidato sabe deslocar o pronome mantendo a correção gramatical. Já a FGV e a VUNESP cobram a identificação de desvios da norma-padrão em orações que envolvem palavras atrativas e locuções verbais, estruturas que aparecem com frequência nos boletins de ocorrência e inquéritos policiais.

---

## 2. Conceitos Fundamentais

Os pronomes oblíquos átonos podem ocupar três posições em relação ao verbo:

1. **Próclise**: O pronome é colocado **antes** do verbo.
   * *Exemplo:* Não *se* cometa injustiça aqui.
2. **Mesóclise**: O pronome é colocado **no meio** do verbo (característica de linguagem formal e culta).
   * *Exemplo:* Entregar-*lhe*-ei o relatório amanhã.
3. **Ênclise**: O pronome é colocado **depois** do verbo.
   * *Exemplo:* Entregou-*se* o suspeito voluntariamente.

A colocação correta depende da presença de **palavras atrativas** (que exigem a próclise) ou do tempo verbal empregado.

---

## 3. Regras com Exemplos Comentados

### 3.1. Próclise (Casos Atrativos)

Na Língua Portuguesa falada no Brasil, a próclise é a posição mais comum. Na norma padrão escrita, ela é obrigatória sempre que houver um fator de atração. Os principais fatores de atração são:

#### A) Palavras de Sentido Negativo
Não, nunca, jamais, nada, ninguém, nem, tampouco.
* *Exemplo:* Jamais *se* soube a verdade sobre o crime. (E não: "Jamais soube-se...")

#### B) Conjunções Subordinativas
Que, porque, quando, como, se, caso, embora, conforme.
* *Exemplo:* O inspetor pediu que *nos* apresentássemos. (O "que" conjunção atrai o pronome)

#### C) Pronomes Relativos
Que, quem, cujo, o qual, onde.
* *Exemplo:* Esta é a delegacia onde *se* encontram as provas. (O "onde" pronome relativo atrai)

#### D) Pronomes Indefinidos e Demonstrativos
Tudo, algo, alguém, nada, isto, isso, aquilo, este, aquele.
* *Exemplo:* Alguém *o* avisou sobre o mandado de prisão.
* *Exemplo:* Isso *nos* causou grande preocupação.

#### E) Advérbios (sem pausa por vírgula)
Se o advérbio estiver imediatamente antes do verbo, sem vírgula, ele atrai o pronome. Se houver vírgula, a atração é anulada e usa-se a ênclise.
* *Exemplo:* Hoje *se* realizou a operação policial. (Sem vírgula = próclise obrigatória)
* *Exemplo:* Hoje, realizou-*se* a operação policial. (Com vírgula = ênclise obrigatória, pois não se inicia frase/oração isolada por vírgula com pronome oblíquo).

#### F) Frases Interrogativas, Exclamativas e Optativas (que exprimem desejo)
* *Exemplo:* Quem *te* entregou as chaves? (Interrogativa)
* *Exemplo:* Deus *o* acompanhe na ronda! (Optativa)

#### G) Em + Gerúndio
Sempre que o verbo estiver no gerúndio precedido da preposição "em", a próclise é obrigatória.
* *Exemplo:* *Em se tratando de* crimes contra a vida, a tolerância é zero.

### 3.2. Ênclise (Casos Padrão)

A ênclise é a posição básica do português padrão. Ela deve ser usada nas seguintes situações:

#### A) Início de Frase
A norma culta proíbe terminantemente iniciar orações com pronomes oblíquos átonos.
* *Exemplo Incorreto:* Me empreste a algema.
* *Exemplo Correto:* Empreste-*me* a algema.

#### B) Verbo no Imperativo Afirmativo
* *Exemplo:* Agentes, apresentem-*se* ao delegado imediatamente!

#### C) Verbo no Infinitivo Impessoal (ou Pessoal se não houver atração)
O infinitivo aceita muito bem a ênclise, sendo esta preferida em vários contextos formais.
* *Exemplo:* Era preciso investigar-*se* o caso a fundo.

#### D) Verbo no Gerúndio (sem a preposição "em")
* *Exemplo:* O suspeito tentou fugir, despistando-*nos* na mata.

### 3.3. Mesóclise

A mesóclise só ocorre com verbos conjugados no **Futuro do Presente** ou no **Futuro do Pretérito**, desde que não haja nenhuma palavra atrativa que exija a próclise.
* *Exemplo:* Realizar-*se*-á o julgamento na próxima semana. (Futuro do presente, início de frase)
* *Exemplo:* Defender-*me*-ia se tivesse advogado. (Futuro do pretérito, início de frase)
* *Observação com palavra atrativa:* Não *se* realizará o julgamento. (A palavra negativa "não" exige a próclise, anulando a mesóclise).

---

## 4. Casos Especiais: Locuções Verbais

Este é o ponto mais complexo da matéria e o preferido da banca VUNESP em provas de nível médio e superior.

Nas locuções verbais (verbo auxiliar + verbo principal no infinitivo, gerúndio ou particípio), a colocação varia conforme o verbo principal:

### A) Auxiliar + Infinitivo ou Gerúndio
* **Sem palavra atrativa**: O pronome pode ficar depois do verbo auxiliar ou depois do principal.
  * *Exemplo:* Quero *lhe* dizer o plano. / Quero dizer-*lhe* o plano.
* **Com palavra atrativa**: O pronome pode ficar antes do verbo auxiliar (próclise ao auxiliar) ou depois do principal (ênclise ao principal - esta é a grande pegadinha!).
  * *Exemplo:* Não *lhe* quero dizer o plano. (Próclise ao auxiliar)
  * *Exemplo:* Não quero dizer-*lhe* o plano. (Ênclise ao principal - correto!)
  * *Exemplo Incorreto:* Não quero *lhe* dizer. (O pronome não pode ficar solto no meio de uma locução se houver atração antes, embora seja comum no Brasil. Se houver hífen, fica correto: "Não quero-lhe dizer", embora algumas bancas rechacem).

### B) Auxiliar + Particípio
* **Atenção**: É **proibido** colocar pronome oblíquo após verbo no particípio (ênclise ao particípio não existe!).
  * *Exemplo Incorreto:* O delegado tinha prendido-*o*.
  * *Exemplo Correto:* O delegado tinha-*o* prendido. (Ênclise ao auxiliar)
  * *Exemplo Correto:* O delegado se tinha prendido... / Não *o* tinha prendido. (Se houver palavra atrativa)

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PCDF — Agente de Polícia)
**Enunciado:** Julgue o item quanto à correção gramatical:
"O réu, no momento em que recebeu a denúncia, esquivou-se de responder às perguntas, alegando que nada lhe fora perguntado anteriormente."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário:** Há dois casos de colocação pronominal importantes aqui:
  1. "esquivou-se": Está no início da oração adjetiva explicativa, após uma vírgula ("O réu, [...] recebeu a denúncia, esquivou-se"). A vírgula isola a oração subordinada adverbial temporal interposta. Portanto, o verbo iniciar-se após a vírgula exige ênclise.
  2. "nada lhe fora perguntado": A palavra "nada" é um pronome indefinido de sentido negativo, atuando como um forte fator de atração. A próclise "lhe fora" está plenamente correta e obrigatória.

### Questão 2 (FGV — PC-RJ — Inspetor de Polícia)
**Enunciado:** Assinale a opção que apresenta um erro de colocação pronominal conforme a norma-padrão:
a) Me disseram que a operação policial foi um absoluto sucesso.
b) Ninguém se manifestou na delegacia sobre o paradeiro das joias.
c) Os investigadores, após a reunião, retiraram-se em silêncio.
d) Conforme nos informou o perito, o laudo ficará pronto amanhã.
e) Se me disserem a verdade, poderei ajudar na defesa.

* **Gabarito: A**
* **Comentário:** A alternativa A está incorreta porque a frase se inicia com o pronome oblíquo átonos "Me" ("Me disseram"). De acordo com a gramática normativa de Língua Portuguesa, é proibido iniciar orações com pronomes oblíquos átonos. O correto seria: "Disseram-me que a operação...". As demais alternativas estão corretas: B tem próclise por palavra negativa "ninguém"; C tem ênclise após vírgula; D tem próclise por conjunção subordinativa conformativa "conforme"; E tem próclise por conjunção subordinativa condicional "Se".

### Questão 3 (VUNESP — PC-SP — Delegado de Polícia)
**Enunciado:** Assinale a alternativa correta quanto à colocação pronominal em locuções verbais:
a) O comissário de polícia não tinha sentido-se seguro com o depoimento.
b) Os policiais queriam prender-lhe na tarde de ontem.
c) Jamais deveriam ter-nos enviado para aquela área de risco.
d) Não se deve punir o suspeito sem provas concretas.
e) Quero-lhe ver no gabinete do delegado geral ainda hoje.

* **Gabarito: D**
* **Comentário:** A alternativa D está correta porque a palavra negativa "Não" atrai o pronome para antes do verbo auxiliar ("Não se deve punir").
  * A está incorreta porque há ênclise a um particípio ("sentido-se"), o que é estritamente proibido.
  * B está incorreta porque o pronome adequado seria "o" (objeto direto de prender: "prender-lo/prendê-lo" e não "prender-lhe").
  * C está incorreta porque não se faz ênclise ao particípio "enviado", e embora "ter" seja infinitivo, "ter-nos enviado" com hífen é rejeitado por algumas bancas em face da atração da palavra negativa "Jamais" que exige "Jamais nos deveriam ter enviado".
  * E está incorreta porque a ênclise ao verbo "quero" ("Quero-lhe ver") é gramaticalmente aceitável, mas o verbo "ver" exige objeto direto "o/a" e não objeto indireto "lhe" ("Quero-o ver" ou "Quero ver-o").

---

## 6. Pegadinhas Mais Frequentes

1. **Ênclise ao Particípio**: É o erro preferido das bancas. Lembre-se: **Nunca use pronome após particípio.** (Ex: "Tinha prendido-o" -> *Incorreto*).
2. **Advérbio isolado por vírgula**: Um advérbio comum (como "hoje", "aqui", "agora") atrai o pronome para a próclise. Contudo, se houver uma vírgula imediatamente após o advérbio, a atração deixa de existir.
   * *Atrativo:* "Hoje se estuda."
   * *Não atrativo:* "Hoje, estuda-se."
3. **Falsa Próclise em Locuções Verbais com "Que"**: O "que" atrai o pronome para antes do auxiliar. Mas lembre-se de que a ênclise ao principal continua correta!
   * *Correto:* "Que se deve fazer."
   * *Correto:* "Que deve fazer-se."

---

## 7. Quadro-Resumo

| Fator | Posição Padrão | Exemplo Prático |
|---|---|---|
| **Palavras Negativas** | Próclise | Não *se* afaste. |
| **Pronomes Relativos** | Próclise | A arma que *se* usou. |
| **Subordinativas** | Próclise | Caso *nos* chamem, iremos. |
| **Início de Frase** | Ênclise | Entregou-*se* ontem. |
| **Após Vírgula** | Ênclise | O agente, ouvindo-o, calou-*se*. |
| **Futuro (sem atração)** | Mesóclise | Prender-*te*-ei amanhã. |
| **Auxiliar + Particípio** | Ênclise ao Auxiliar | Tinha-*me* avisado. (Nunca avisado-me) |

---

## 8. Conclusão

A colocação pronominal exige a memorização de dois conjuntos de regras: os fatores de atração da próclise (como palavras negativas e pronomes relativos) e as restrições da ênclise (não iniciar orações e não usar após particípios). Para as provas de carreiras policiais, dedique atenção especial à colocação pronominal em locuções verbais, pois as bancas exploram constantemente a proibição do particípio e a colocação do pronome junto ao verbo principal no infinitivo.

---',
  'Estudo das regras de colocação pronominal (próclise, mesóclise e ênclise). Foco nas palavras atrativas da próclise (negativas, pronomes, advérbios, conjunções), na proibição de pronomes no início de frases e na ênclise a verbos no particípio. Inclui detalhamento do posicionamento pronominal em locuções verbais e a resolução comentada de questões de concurso do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 5/8 — Pontuação
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Pontuação',
  'Pontuação: Emprego da Vírgula e Demais Sinais de Pontuação',
  E'# Pontuação

## 1. Introdução

O emprego dos sinais de pontuação, com destaque absoluto para a vírgula, é um dos temas de maior peso nas provas de Língua Portuguesa para as carreiras policiais. Bancas como o CEBRASPE, a FGV e a VUNESP cobram a pontuação sob a perspectiva da sintaxe e da semântica, exigindo que o candidato saiba associar a presença ou ausência da vírgula à correção gramatical e às alterações de sentido do texto. Em redações discursivas de concursos policiais, a pontuação incorreta é uma das maiores fontes de perda de pontos, pois pode truncar o sentido do texto e prejudicar a clareza e a concisão exigidas na redação oficial.

---

## 2. Conceitos Fundamentais

A pontuação não serve para marcar as pausas de respiração do leitor, como popularmente se divulga. **A pontuação baseia-se na estrutura sintática da oração.**

Na Língua Portuguesa, a ordem direta da oração é:

$$\\text{Sujeito} \\rightarrow \\text{Verbo} \\rightarrow \\text{Complementos} \\rightarrow \\text{Adjuntos Adverbiais}$$

* **Regra de Ouro (Proibições)**: É terminantemente proibido separar por vírgula os termos que possuem ligação sintática direta.
  1. **Não se separa o Sujeito do Verbo.**
     * *Exemplo Incorreto:* O delegado de plantão, lavrou o auto de prisão.
     * *Exemplo Correto:* O delegado de plantão lavrou o auto de prisão.
  2. **Não se separa o Verbo de seus Complementos (Objetos).**
     * *Exemplo Incorreto:* O perito recolheu, as impressões digitais da arma.
     * *Exemplo Correto:* O perito recolheu as impressões digitais da arma.
  3. **Não se separa o Nome de seu Adjunto Adnominal ou Complemento Nominal.**

---

## 3. Regras com Exemplos Comentados: O Uso da Vírgula

### 3.1. Vírgula no Interior da Oração (Termos Simples)

#### A) Vocativo (Isolamento Obrigatório)
O vocativo (termo usado para chamar ou interpelar o interlocutor) deve ser isolado por vírgulas em qualquer posição da frase.
* *Exemplo:* Agente, traga o relatório de investigação.
* *Exemplo:* Traga o relatório, agente, para que eu o assine.

#### B) Aposto Explicativo (Isolamento Obrigatório)
O aposto explicativo (termo de base nominal que explica ou detalha um substantivo anterior) deve vir isolado por vírgulas, travessões ou parênteses.
* *Exemplo:* O escrivão, funcionário exemplar, redigiu o termo de depoimento.
* *Observação:* O aposto especificativo (que restringe o nome) não aceita vírgula. Exemplo: "O delegado Silva ordenou a ronda." (Silva é aposto especificativo).

#### C) Adjuntos Adverbiais Deslocados
Quando o adjunto adverbial (ou oração adverbial) é retirado de sua posição natural (o final da frase) e colocado no início ou no meio da oração:
* **Se for de longa extensão** (geralmente 3 ou mais palavras): A vírgula é **obrigatória**.
  * *Exemplo:* *Durante a noite de ontem*, a equipe policial realizou a prisão.
* **Se for de curta extensão** (1 ou 2 palavras): A vírgula é **facultativa** (opcional).
  * *Exemplo:* *Ontem*, a equipe policial realizou a prisão. (Ou: "Ontem a equipe...")

#### D) Elementos de uma Lista (Enumeração)
* *Exemplo:* O suspeito portava algemas, celulares, coletes *e* radiotransmissores. (O "e" final dispensa a vírgula para o último elemento).

#### E) Omissão do Verbo (Zeugma)
A vírgula é usada para indicar que um verbo mencionado anteriormente foi omitido.
* *Exemplo:* A Polícia Federal investiga crimes federais; a Polícia Civil, crimes estaduais. (A segunda vírgula indica a omissão do verbo "investiga").

### 3.2. Vírgula entre Orações (Período Composto)

#### A) Orações Coordenadas Assindéticas e Sindéticas
Separadas por vírgula, com exceção das aditivas introduzidas pela conjunção "e" (ver casos especiais).
* *Exemplo:* O policial avistou o suspeito, deu voz de prisão, algemou-o. (Assindéticas)
* *Exemplo:* O suspeito tentou fugir, *mas* foi contido pelos agentes. (Coordenada adversativa)
* *Exemplo:* Estude bastante, *pois* a prova está próxima. (Coordenada explicativa)

#### B) Orações Adjetivas (Explicativas vs. Restritivas)
Esta regra é de importância vital nas provas do CEBRASPE.
* **Orações Adjetivas Explicativas**: Vêm **entre vírgulas**. Explicam uma característica que pertence a todo o grupo.
  * *Exemplo:* Os policiais, *que são concursados*, agiram com rapidez. (Significado: Todos os policiais em questão são concursados e todos agiram com rapidez).
* **Orações Adjetivas Restritivas**: **Não possuem vírgulas**. Restringem a característica a apenas uma parte do grupo.
  * *Exemplo:* Os policiais *que são concursados* agiram com rapidez. (Significado: Apenas a parcela dos policiais que é concursada agiu com rapidez; os não concursados não agiram).

#### C) Orações Adverbiais Deslocadas
Se a oração subordinada adverbial vier antes da oração principal, a vírgula é obrigatória. Se vier depois, a vírgula é facultativa.
* *Exemplo:* *Quando soou o alarme*, os guardas trancaram os portões. (Anteposta -> Obrigatória)
* *Exemplo:* Os guardas trancaram os portões *quando soou o alarme*. (Posposta -> Facultativa/Opcional)

---

## 4. Casos Especiais de Pontuação

1. **Vírgula antes do "E"**: Em regra, não se usa vírgula antes da conjunção aditiva "e". No entanto, ela é recomendável/obrigatória em dois casos:
   * **Sujeitos Diferentes**: Quando as orações coordenadas aditivas possuem sujeitos distintos.
     * *Exemplo:* O delegado encerrou o inquérito, *e* o promotor ofereceu a denúncia. (Sujeito 1: O delegado; Sujeito 2: o promotor).
   * **Polissíndeto** (repetição da conjunção para dar ênfase).
     * *Exemplo:* E corre, *e* grita, *e* atira, sem rumo.
2. **Substituição de Sinais de Pontuação**: O CEBRASPE adora cobrar a substituição de vírgulas por travessões ou parênteses.
   * *Regra:* Um termo explicativo isolado por dupla vírgula pode ser isolado por duplo travessão ou por parênteses sem prejuízo para a correção gramatical.
     * *Exemplo:* O suspeito, que portava drogas, foi preso.
     * *Reescrita:* O suspeito — que portava drogas — foi preso.
     * *Reescrita:* O suspeito (que portava drogas) foi preso.
3. **Ponto e Vírgula**: Usado para separar orações coordenadas muito longas que já possuam vírgulas internas ou para separar itens de leis e regulamentos.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PCDF — Escrivão de Polícia)
**Enunciado:** Julgue o item quanto à correção gramatical do período:
"A investigação de crimes de lavagem de dinheiro, que exige conhecimentos especializados em contabilidade, demanda tempo e cooperação internacional."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário:** A oração "que exige conhecimentos especializados em contabilidade" é uma oração subordinada adjetiva explicativa (pois explica uma característica intrínseca à investigação desses crimes). O uso das vírgulas para isolá-la está perfeitamente correto. A remoção das vírgulas preservaria a correção gramatical, mas alteraria o sentido, transformando-a em restritiva.

### Questão 2 (FGV — PC-AL — Delegado de Polícia)
**Enunciado:** Assinale a opção que apresenta um erro de pontuação conforme a norma-padrão:
a) Durante a madrugada de ontem, os investigadores vigiaram o cativeiro.
b) O perito criminal, que assinou o laudo, atua no instituto de criminalística.
c) Conclui-se, portanto, que a autoria do crime está definida no inquérito.
d) Exigiu-se do suspeito, que apresentasse sua identificação civil.
e) O acusado alegou legítima defesa; a promotoria, homicídio qualificado.

* **Gabarito: D**
* **Comentário:** O erro está na alternativa D. O verbo "exigir" exige um complemento ("exigiu-se *isso* do suspeito"). A oração "que apresentasse sua identificação civil" funciona como oração subordinada substantiva objetiva direta. Não se pode separar o verbo de seu objeto direto por vírgula. Portanto, a vírgula após "suspeito" está incorreta.
  * A está correta: adjunto adverbial longo deslocado ("Durante a madrugada de ontem").
  * B está correta: oração adjetiva explicativa entre vírgulas.
  * C está correta: conjunção conclusiva intercalada ("..., portanto, ...").
  * E está correta: vírgula marcando a elipse do verbo "alegou" na segunda oração ("a promotoria [alegou] homicídio").

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa em que a inserção da vírgula altera o sentido da oração, sem prejudicar a correção gramatical:
a) Os policiais federais que participaram da operação receberam elogios.
b) Amanhã os novos agentes civis tomarão posse no auditório da secretaria.
c) O inquérito policial foi concluído pelo delegado em tempo recorde.
d) Os suspeitos de cometer o latrocínio, fugiram em direção à fronteira.
e) Apresente o distintivo policial, quando chegar à guarita da corregedoria.

* **Gabarito: A**
* **Comentário:** A alternativa A apresenta originalmente uma oração subordinada adjetiva restritiva ("que participaram da operação"). Isso significa que apenas os policiais federais participaram da operação receberam elogios. Se inserirmos vírgulas ("Os policiais federais, que participaram da operação, receberam elogios"), a oração torna-se explicativa, indicando que todos os policiais federais participaram da operação e todos receberam elogios. Trata-se de uma alteração clássica de semântica que preserva a gramática.

---

## 6. Pegadinhas Mais Frequentes

1. **Vírgula após sujeito longo**: O candidato vê um sujeito muito extenso e sente a "necessidade física" de colocar uma vírgula antes do verbo. Isso é erro crasso!
   * *Pegadinha:* "O suspeito de ter liderado o assalto à agência bancária no centro da cidade, foi preso ontem." (O sujeito é todo o bloco antes do verbo; a vírgula está errada).
2. **Adjunto adverbial curto com vírgula facultativa apontada como obrigatória**: As bancas costumam afirmar que a remoção da vírgula em "Hoje, realizou-se a perícia" geraria erro gramatical. Falso, pois o adjunto "Hoje" é curto e a vírgula é opcional.
3. **Vírgula separando o "que" integrante**: Em orações integrantes ("Disseram que..."), a vírgula antes do "que" é proibida.

---

## 7. Quadro-Resumo

| Caso | Tipo de Regra | Exemplo |
|---|---|---|
| **Sujeito e Verbo** | Proibido | O agente [sem vírgula] agiu rápido. |
| **Verbo e Objeto** | Proibido | Recolheu [sem vírgula] as provas. |
| **Vocativo** | Obrigatório | Ajude-me, *colega*, com este relatório. |
| **Aposto Explicativo** | Obrigatório | O caso, *um mistério*, foi resolvido. |
| **Adjunto Adverbial Longo** | Obrigatório (se deslocado) | *Na noite do crime*, chovia bastante. |
| **Adjunto Adverbial Curto** | Facultativo (se deslocado) | *Ontem*[,] a viatura quebrou. |
| **Oração Adjetiva Explicativa** | Obrigatório (entre vírgulas) | O réu, *que mentiu*, foi condenado. |

---

## 8. Conclusão

Gabaritar pontuação em concursos policiais requer o abandono definitivo da ideia de que a vírgula representa uma pausa na respiração. A pontuação é sintática. Lembre-se sempre de que os termos essenciais (sujeito, verbo e complementos) não podem ser fragmentados e que o deslocamento de adjuntos adverbiais longos ou a caracterização de orações explicativas exigem o uso correto das vírgulas para manter o texto polido e inequívoco.

---',
  'Estudo das regras de emprego dos sinais de pontuação com foco na vírgula. Análise da ordem direta da oração e das proibições de uso da vírgula (sujeito/verbo e verbo/complemento), casos obrigatórios (vocativo, aposto explicativo, adjuntos deslocados longos) e facultativos. Análise semântico-sintática de orações adjetivas explicativas e restritivas. Inclui questões comentadas de bancas.'
);

-- =====================================================================
-- 6/8 — Compreensão e intelecção de textos
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Compreensão e intelecção de textos',
  'Compreensão e Intelecção de Textos: Técnicas de Leitura para Concursos',
  E'# Compreensão e Intelecção de Textos

## 1. Introdução

A compreensão e intelecção de textos representam o bloco com maior número de questões na prova de Língua Portuguesa de qualquer concurso policial (chegando a corresponder a 30% ou 40% das questões elaboradas pelo CEBRASPE, FGV ou VUNESP). Saber ler, interpretar e extrair as ideias principais de um texto, distinguindo o que está explicitamente escrito do que é apenas sugerido ou inferido, é a habilidade que diferencia os candidatos aprovados. Em exames de carreiras policiais, os textos frequentemente abordam temas de segurança pública, direitos humanos, inquéritos ou crônicas policiais, exigindo leitura analítica e fria por parte do candidato.

---

## 2. Conceitos Fundamentais

Muitos candidatos tratam "compreensão" e "interpretação" como sinônimos, o que gera erros cruciais em questões que exigem comandos específicos da banca.

1. **Compreensão (Intelecção)**: É a análise objetiva do que está **escrito no texto**. Trata-se de decodificar as palavras, períodos e parágrafos de forma explícita.
   * *Comandos de Prova:* "Segundo o texto...", "De acordo com o autor...", "O texto afirma que...", "Na linha X, o autor diz...".
   * *Regra:* A resposta está explícita ou parafraseada no próprio texto.
2. **Interpretação**: É a análise subjetiva-lógica do que se **conclui a partir do texto**. Trata-se de ler "nas entrelinhas", identificando ideias implícitas que têm sustentação lógica no texto.
   * *Comandos de Prova:* "Infere-se do texto que...", "Depreende-se do texto que...", "O texto sugere que...", "Conclui-se do texto que...".
   * *Regra:* A resposta não está escrita textualmente, mas é uma conclusão lógica e autorizada pelo texto.

---

## 3. Regras de Ouro e Técnicas de Leitura

### 3.1. Análise da Coesão Textual
A coesão é a costura gramatical do texto (feita por pronomes, conjunções, advérbios). Identificar os referentes é vital para resolver questões de reescrita e interpretação.
* **Coesão Anafórica**: Termo que retoma algo já dito.
  * *Exemplo:* O policial efetuou a prisão do suspeito. *Ele* não esboçou reação. (O pronome "Ele" retoma anaforicamente "o suspeito").
* **Coesão Catafórica**: Termo que antecipa algo que será dito.
  * *Exemplo:* Só queríamos *isto*: a elucidação do latrocínio. (O pronome "isto" antecipa a explicação).

### 3.2. Marcação de Palavras Limitadoras e Generalizadoras
Bancas de concurso adoram usar palavras categóricas para criar itens errados. Sempre circule no texto termos como:
* **Limitadores/Excludentes**: só, apenas, somente, unicamente, exclusivamente.
* **Generalizadores**: todos, nenhum, sempre, nunca, jamais, qualquer.
* *Dica de Prova:* Se uma alternativa contiver uma dessas palavras extremas, desconfie. Na maioria das vezes, o texto original é mais flexível e não autoriza tal rigores.

### 3.3. Identificação do Tipo Textual Dominante
Os textos de concurso dividem-se em diferentes tipologias, sendo as principais:
* **Expositivo**: Apresenta fatos, dados e informações de forma objetiva, sem emitir opinião. Muito comum em notícias ou relatórios de segurança.
* **Argumentativo**: Defende um ponto de vista (tese) por meio de argumentos, visando convencer o leitor. É o predileto do CEBRASPE para textos longos de filosofia do direito ou sociologia da violência.
* **Narrativo**: Conta uma história com personagens, tempo e espaço. Comum em crônicas ou relatos de casos práticos.

---

## 4. O Processo de Paráfrase (Reescrita de Frases)

O CEBRASPE e a FGV dedicam muitas questões à paráfrase (reescrever um trecho do texto mantendo o sentido original e a correção gramatical). Para gabaritar essas questões, verifique três parâmetros:

1. **Correção Gramatical**: A nova estrutura atende às regras de concordância, regência, crase e pontuação?
2. **Coerência Textual**: A lógica interna da frase foi mantida?
3. **Semântica (Sentido)**: Houve alteração no sentido original?
   * *Exemplo:* "A violência urbana cresce, embora a polícia aja."
   * *Reescrita correta:* "Apesar de a polícia agir, o crescimento da violência urbana é contínuo."
   * *Reescrita incorreta:* "A violência urbana cresce, portanto a polícia age." (A conjunção concessiva "embora" foi erroneamente substituída pela conclusiva "portanto", alterando a relação lógica).

---

## 5. ⚡ Como Cai em Prova

### Texto de Referência
*"A atividade policial civil, baseada na investigação criminal e na busca pela verdade real, desempenha um papel pacificador na sociedade. Ao identificar os autores de infrações penais e colher provas incontestáveis, a instituição evita linchamentos públicos e resguarda as garantias constitucionais dos suspeitos, impedindo a barbárie."*

### Questão 1 (CESPE/CEBRASPE — PCDF — Agente)
**Enunciado:** Com base no texto de referência, julgue o item:
"Conclui-se das ideias do texto que a identificação dos autores de infrações penais constitui a única forma de evitar linchamentos públicos na sociedade."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário:** O texto afirma que a identificação dos autores de infrações penais evita linchamentos públicos, mas em momento algum afirma ser a "única" forma de atingir esse objetivo. A introdução da palavra limitadora "única" configura extrapolação de ideias, tornando o item incorreto.

### Questão 2 (FGV — PC-RJ — Inspetor de Polícia)
**Enunciado:** De acordo com o texto de referência, a atividade policial civil desempenha um papel pacificador porque:
a) Garante a condenação sumária dos indiciados.
b) Desconsidera as provas que não sejam biológicas.
c) Age no resguardo das garantias constitucionais e na coleta de provas legais.
d) Reduz a criminalidade urbana a zero.
e) Substitui a atuação do Poder Judiciário.

* **Gabarito: C**
* **Comentário:** A alternativa C está perfeitamente de acordo com a compreensão do texto, que afirma textualmente que a instituição "resguarda as garantias constitucionais dos suspeitos" e "colhe provas incontestáveis". 
  * A está incorreta (o texto fala em garantias, não condenação sumária).
  * B está incorreta (extrapolação total, não fala em provas exclusivamente biológicas).
  * D está incorreta (generalização excessiva: "reduz a zero").
  * E está incorreta (erro conceitual de direito administrativo e constitucional).

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa que apresenta uma paráfrase gramaticalmente correta e fiel ao sentido do texto de referência para o trecho: *"Ao identificar os autores de infrações penais [...] a instituição evita linchamentos públicos..."*
a) A instituição evita linchamentos públicos desde que identifique os autores de infrações penais.
b) À medida que identifica os autores de infrações penais, a instituição evita linchamentos públicos.
c) Identificando-se os autores de infrações penais, os linchamentos públicos são evitados pela instituição.
d) Caso identifique os autores de infrações penais a instituição evitaria linchamentos públicos.
e) Conquanto identifique os autores de infrações penais, os linchamentos públicos são evitados pela instituição.

* **Gabarito: C**
* **Comentário:** A alternativa C mantém a relação de causa/modo expressa pela oração reduzida de gerúndio no texto original e preserva a correção sintática passiva ("os linchamentos públicos são evitados pela instituição").
  * A e D mudam a relação para condição ("desde que", "caso").
  * B muda para proporção ("à medida que").
  * E muda para concessão ("conquanto").

---

## 6. Pegadinhas Mais Frequentes: Os Três Erros Clássicos

1. **Extrapolação**: É o erro mais comum. Ocorre quando o candidato faz uma associação pessoal ou ideológica com o tema do texto e escolhe uma alternativa que traz ideias que não estão no texto (mesmo que pareçam corretas no mundo real).
   * *Dica:* Se a informação não pode ser provada com linhas ou parágrafos do texto, ela é incorreta.
2. **Redução**: Ocorre quando a alternativa foca apenas em um detalhe secundário do texto, mas a questão pede a ideia central ou a totalidade do pensamento do autor. A alternativa está correta em si, mas incompleta para responder ao comando.
3. **Contradição**: Ocorre quando a alternativa afirma exatamente o oposto do que está no texto. Muitas vezes usa sinônimos ou palavras difíceis para disfarçar a negação.

---

## 7. Quadro-Resumo

| Critério | Compreensão de Texto | Interpretação de Texto |
|---|---|---|
| **Localização** | Explícita no texto. | Implícita no texto (nas entrelinhas). |
| **Atividade** | Decodificação e paráfrase. | Dedução e inferência lógica. |
| **Comando Comum** | "De acordo com o texto..." | "Infere-se do texto que..." |
| **Foco** | O que o autor *disse*. | O que o autor *quis dizer*. |
| **Erro Comum** | Errar a paráfrase gramatical. | Extrapolar as ideias e inventar conclusões. |

---

## 8. Conclusão

Compreender e interpretar textos não é uma tarefa subjetiva que depende do gosto pessoal do candidato. Trata-se de uma análise rigorosa e objetiva de marcas linguísticas deixadas pelo autor. Nas provas de concursos policiais, leia sempre o texto com atenção especial à coesão textual, às conjunções lógicas e aos termos generalizadores. Identificar o tipo de comando (se de compreensão ou de interpretação) garantirá que você localize a resposta exata exigida pelo examinador.

---',
  'Técnicas de leitura voltadas para a compreensão (intelecção explícita) e interpretação (inferência lógica) de textos em concursos públicos. Análise de coesão anafórica/catafórica, tipologia textual, identificação de termos limitadores e técnicas de paráfrase/reescritura de períodos. Inclui resolução comentada de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 7/8 — Ortografia oficial
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Ortografia oficial',
  'Ortografia Oficial e o Novo Acordo Ortográfico',
  E'# Ortografia Oficial

## 1. Introdução

A grafia correta dos termos da Língua Portuguesa — a ortografia oficial — é um pré-requisito básico para quem busca a aprovação em carreiras policiais. A clareza de um Boletim de Ocorrência, de um Relatório de Investigação ou de um Auto de Prisão em Flagrante depende de uma redação que siga estritamente a norma-padrão. Por isso, bancas como o CEBRASPE, a FGV e a VUNESP cobram regras de grafia de letras (S/Z, X/CH, G/J) e, de forma massiva, as novas regras do Acordo Ortográfico (uso do hífen). Erros comuns como o uso de "a partir de" com crase ou o emprego incorreto do hífen em "autoescola" são armadilhas clássicas preparadas para eliminar candidatos desatentos.

---

## 2. Conceitos Fundamentais

A ortografia oficial é o conjunto de convenções que estabelece a escrita correta das palavras de uma língua. Ela se subdivide em:
1. **Grafia de Palavras (Emprego de Letras)**: Uso de letras com sons semelhantes (homófonas), em que a etimologia da palavra ou regras morfológicas definem a grafia correta.
2. **Hifenização**: Regras que determinam o uso do hífen na formação de palavras compostas e derivadas por prefixação, profundamente alteradas pelo Acordo Ortográfico em vigor.
3. **Parônimos e Homônimos**: Termos que possuem grafias ou pronúncias muito semelhantes, mas significados distintos (ex: *porque / por que / porquê / por quê*).

---

## 3. Regras com Exemplos Comentados

### 3.1. Emprego de Letras (S, Z, G, J, X, CH)

#### A) O Uso de S ou Z
* **Usa-se S**:
  * Nos sufixos **-ês** e **-esa**, que indicam origem, nacionalidade ou título. (Ex: *português, calabresa, duquesa*).
  * No sufixo **-isa**, indicador de ocupação feminina. (Ex: *poetisa, profetisa, papisa*).
  * Após ditongos. (Ex: *coisa, lousa, deusa, causa*).
  * Nos verbos derivados de palavras cuja raiz já possui "S". (Ex: *analisar* [de análise], *pesquisar* [de pesquisa], *paralisar* [de paralisia]).
* **Usa-se Z**:
  * Nos sufixos **-ez** e **-eza**, que formam substantivos abstratos a partir de adjetivos. (Ex: *belo $\\rightarrow$ beleza*, *rápido $\\rightarrow$ rapidez*, *sensato $\\rightarrow$ sensatez*).
  * No sufixo **-izar**, quando a palavra primitiva não possui "S" na raiz. (Ex: *atual $\\rightarrow$ atualizar*, *civil $\\rightarrow$ civilizar*, *fácil $\\rightarrow$ facilitar*).

#### B) O Uso de G ou J
* **Usa-se G**:
  * Nas palavras terminadas em **-agem**, **-igem**, **-ugem**. (Ex: *viagem* [substantivo], *vertigem*, *ferrugem*).
    * *Exceções:* *pajem* e *lambujem*.
  * Nas palavras terminadas em **-ágio**, **-égio**, **-ígio**, **-ógio**, **-úgio**. (Ex: *pedágio, colégio, prestígio, relógio, refúgio*).
* **Usa-se J**:
  * Nas formas verbais de verbos terminados em **-jar** ou **-jear**. (Ex: *viajar $\\rightarrow$ que eles viajem*, *arranjar $\\rightarrow$ arranjem*, *despejar $\\rightarrow$ despejem*).
    * *Pegadinha:* "A viagem" (substantivo) escreve-se com **G**. "Que eles viajem" (verbo) escreve-se com **J**.

---

### 3.2. O Uso do Hífen (Acordo Ortográfico)

O Acordo Ortográfico de 2009 unificou as regras de hifenização de palavras prefixadas. O mnemônico fundamental é: **"Os opostos se atraem, os iguais se repelem."**

#### A) Vogal com Vogal
* **Vogais Diferentes**: NÃO se usa hífen. As letras se unem.
  * *Exemplo:* autoescola, infraestrutura, contraindicação, semiaberto.
* **Vogais Iguais**: USA-SE hífen.
  * *Exemplo:* micro-ondas, anti-inflamatório, arque-inimigo.

#### B) Vogal com Consoante
* Em regra, NÃO se usa hífen quando o prefixo termina em vogal e o segundo elemento começa com consoante.
  * *Exemplo:* autopeça, semicírculo, geopolítica.
* **Caso Especial (R e S)**: Se o segundo elemento começar com **R** ou **S**, o hífen não é usado e a consoante deve ser duplicada.
  * *Exemplo:* antissocial (anti + social), contrarregra (contra + regra), minissaia (mini + saia).

#### C) Consoante com Consoante
* **Consoantes Diferentes**: NÃO se usa hífen.
  * *Exemplo:* superinteressante, hipermercado, subdiretor.
* **Consoantes Iguais**: USA-SE hífen.
  * *Exemplo:* super-resistente, sub-bibliotecário.

#### D) Segundo Elemento Iniciado por "H"
Sempre se usa o hífen quando o segundo elemento inicia-se com a letra **H**.
* *Exemplo:* anti-higiênico, super-homem, co-herdeiro.

#### E) Prefixos Especiais (Sempre Exigem Hífen)
Os prefixos **ex-** (estado anterior), **vice-**, **recém-**, **sem-**, **além-**, **aquém-**, **pós-**, **pré-** e **pró-** (tônicos) exigem sempre o uso do hífen.
* *Exemplo:* ex-presidiário, vice-diretor, recém-nomeado, sem-terra, pós-graduação.

---

## 4. Homônimos e Parônimos de Alta Cobrança

### A) Os Quatro "Porquês"
* **Por que** (separado e sem acento):
  1. Equivale a "por qual razão" (perguntas diretas/indiretas). Ex: *Por que* a viatura quebrou?
  2. Equivale a "pelo qual / pela qual / pelos quais / pelas quais". Ex: Os caminhos *por que* andei eram perigosos.
* **Por quê** (separado e com acento): Usado em final de frases ou isolado.
  * *Exemplo:* O suspeito fugiu e ninguém sabe *por quê*.
* **Porque** (junto e sem acento): Conjunção explicativa ou causal (equivale a *pois*, *já que*, *visto que*). Usado em respostas.
  * *Exemplo:* Não saímos em ronda *porque* faltou combustível.
* **Porquê** (junto e com acento): Funciona como substantivo (equivale a *motivo*, *razão*). Vem sempre precedido de determinante (artigo, pronome, numeral).
  * *Exemplo:* O delegado quer saber o *porquê* da ausência de registros.

### B) Mal vs. Mau
* **Mal**: É o oposto de **BEM**. Pode ser advérbio, conjunção temporal (quando) ou substantivo.
  * *Exemplo:* O criminoso comportou-se *mal* na audiência.
  * *Exemplo:* *Mal* o alarme soou, os policiais agiram.
* **Mau**: É o oposto de **BOM**. É sempre um adjetivo (modifica substantivo).
  * *Exemplo:* O suspeito prestou um *mau* depoimento.

### C) Mas vs. Mais
* **Mas**: Conjunção adversativa (equivale a *porém*, *contudo*, *entretanto*).
  * *Exemplo:* A equipe investigou muito, *mas* não achou a pista.
* **Mais**: Advérbio de intensidade ou pronome indefinido de quantidade (oposto de menos).
  * *Exemplo:* Queremos *mais* agentes na rua.

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PCDF — Escrivão de Polícia)
**Enunciado:** O vocábulo "autoestima" é grafado sem hífen de acordo com as regras estabelecidas pelo Acordo Ortográfico. O mesmo ocorre com os vocábulos "autoajuda" e "contraordem".
**( ) CERTO  ( ) ERRADO**

* **Gabarito: CERTO**
* **Comentário:** A regra do Acordo Ortográfico para vogais diferentes estabelece que elas se unem sem hífen. Os prefixos *auto-* e *contra-* terminam em vogal ("o" e "a"). Os segundos elementos começam com vogais diferentes ("e", "a" e "o"). Portanto, "autoestima", "autoajuda" e "contraordem" devem ser grafados de forma aglutinada, sem hífen.

### Questão 2 (FGV — PC-RJ — Inspetor de Polícia)
**Enunciado:** Assinale a opção em que a frase apresenta a grafia correta de acordo com a norma-padrão:
a) Os policiais não entenderam por que o detento estava tão nervoso.
b) O laudo pericial foi entregue em mãos, mas haviam mais relatórios pendentes.
c) O plano de fuga foi mal sucedido porque os agentes estavam de sobreaviso.
d) Ela mesma quis fazer a análise das digitais, pois é uma excelente profetiza.
e) O motorista da viatura andava à pé pelas ruas escuras do centro.

* **Gabarito: A**
* **Comentário:** 
  * A está correta: "por que" separado e sem acento é usado em perguntas indiretas (equivale a "por qual razão").
  * B está incorreta: "haviam" (verbo haver impessoal) deve ser singular: "havia mais relatórios".
  * C está incorreta: o correto é "mal-sucedido" (prefixo *mal* antes de consoante exige hífen).
  * D está incorreta: "profetiza" escreve-se com S ("profetisa" - sufixo de ocupação feminina).
  * E está incorreta: "a pé" é locução masculina e não admite crase.

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa que apresenta palavras grafadas corretamente segundo as regras vigentes do Acordo Ortográfico:
a) Anti-higiênico, microondas, super-resistente.
b) Antissocial, micro-ondas, super-resistente.
c) Anti social, microondas, superresistente.
d) Antissocial, micro-ondas, superresistente.
e) Anti-social, microondas, super-resistente.

* **Gabarito: B**
* **Comentário:** 
  * "Antissocial": prefixo termina em vogal e o segundo elemento começa com "S" -> remove-se o hífen e duplica-se a consoante.
  * "Micro-ondas": vogais iguais repelem-se, exige hífen.
  * "Super-resistente": consoantes iguais repelem-se, exige hífen.

---

## 6. Pegadinhas Mais Frequentes

1. **"Viagem" (substantivo) vs. "Viajem" (verbo)**: As bancas exploram a homofonia dessas palavras em frases de reescrita.
   * *Exemplo:* "A *viagem* foi excelente. Espero que eles *viajem* bem."
2. **Hífen com o prefixo "Co-"**: O prefixo "co-" em geral aglutina com o segundo elemento, mesmo que comece com a mesma vogal.
   * *Exemplo:* cooperar, coordenar, coobrigar (exceção à regra geral das vogais iguais!).
3. **"Improvisar" com Z**: Por analogia com "atualizar", muitos escrevem "improvisar" com Z. Mas "improvisar" deriva de "improviso" (que tem S na raiz), logo escreve-se com S.
4. **"A par" escrito como "Ao par"**: Em contextos de informação, usa-se a locução "estar a par" (e não "estar ao par").

---

## 7. Quadro-Resumo: Regras do Hífen

| Regra | Condição Sintática | Exemplo |
|---|---|---|
| **Vogais Diferentes** | Sem Hífen (une) | autoescola |
| **Vogais Iguais** | Com Hífen | micro-ondas |
| **R ou S após vogal** | Sem Hífen e duplica | antissocial, contrarregra |
| **Consoantes Diferentes** | Sem Hífen (une) | superinteressante |
| **Consoantes Iguais** | Com Hífen | super-resistente |
| **Iniciado por H** | Com Hífen | anti-higiênico |
| **Prefixos Especiais (Ex-, Vice-)** | Com Hífen Sempre | ex-diretor, vice-presidente |

---

## 8. Conclusão

Gabaritar ortografia oficial em concursos policiais exige foco em duas frentes: a memorização de morfemas geradores de dúvida (como os sufixos -ês/-esa e -ez/-eza) e a consolidação prática das regras do Acordo Ortográfico sobre hifenização. Dominar a regra do "opostos se atraem e iguais se repelem" resolverá a maioria das questões de hífen, enquanto a análise sintática resolverá o emprego dos "porquês". Dedicar-se a esses detalhes garante a pontuação máxima nas questões objetivas de grafia.

---',
  'Normas de ortografia oficial e Acordo Ortográfico aplicadas a concursos públicos. Emprego de grafia de letras específicas (S/Z, G/J, X/CH), regras consolidadas para o uso do hífen com prefixos, o emprego dos quatro porquês e distinção de homônimos/parônimos comuns (mal/mau, mas/mais). Resolução de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- 8/8 — Formação, classe e emprego de palavras
-- =====================================================================
SELECT upsert_material(
  'lingua-portuguesa',
  'Formação, classe e emprego de palavras',
  'Morfologia: Classes de Palavras e Processos de Formação',
  E'# Morfologia: Formação, Classe e Emprego de Palavras

## 1. Introdução

A morfologia é o estudo da estrutura interna, da formação e da classificação das palavras em categorias gramaticais (as dez classes de palavras). Trata-se da base indispensável para a sintaxe e a semântica em provas de concursos policiais. Bancas como o CEBRASPE, a FGV e a VUNESP cobram este tema de forma integrada: exigem que o candidato saiba identificar os processos de formação de palavras (especialmente a derivação regressiva e a parassíntese), compreenda o valor semântico das conjunções e dos pronomes nas orações, e domine a flexão de verbos irregulares de alta recorrência jurídica e policial (como *reaver*, *deter*, *intervir* e *ver/vir*).

---

## 2. Estrutura e Formação de Palavras

As palavras são compostas por unidades mínimas de significado chamadas **morfemas**.

* **Radical**: Elemento base que carrega a significação da palavra. (Ex: *polic-* em polícia, policial, policiamento).
* **Afixos**: Elementos agregados ao radical para alterar seu sentido. Dividem-se em **prefixos** (antes do radical: *in-*útil) e **sufixos** (depois do radical: leal-*dade*).
* **Vogal Temática**: Une o radical às desinências nos verbos (a, e, i, indicando as conjugações: cant-**a**-r, vend-**e**-r, part-**i**-r).

### Processos de Formação

#### A) Derivação
Formação de novas palavras a partir de uma única palavra primitiva.
* **Prefixal**: Acréscimo de prefixo. (Ex: *des*fazer, *in*justiça).
* **Sufixal**: Acréscimo de sufixo. (Ex: criminos*amente*, perici*ador*).
* **Parassintética (Parassíntese)**: Acréscimo simultâneo e obrigatório de prefixo e sufixo. Se retirarmos um deles, a palavra restante não existe no idioma.
  * *Exemplo:* *en*tard*ecer* (Não existe "entarde" nem "tardecer").
  * *Diferença de Prefixal e Sufixal:* Em *deslealdade*, se tirarmos o prefixo, temos "lealdade" (existe). Em parassíntese, a retirada de qualquer afixo destrói a palavra.
* **Regressiva (Deverbal)**: Redução da palavra primitiva. Ocorre na formação de substantivos abstratos a partir de verbos que indicam ação (muito comum no jargão jurídico-policial).
  * *Exemplo:* combater $\\rightarrow$ o combate; prender $\\rightarrow$ a prisão; arrestar $\\rightarrow$ o arresto; buscar $\\rightarrow$ a busca.
* **Imprópria**: Mudança de classe gramatical da palavra sem alteração na sua grafia.
  * *Exemplo:* O *jantar* estava excelente. (*Jantar*, originalmente verbo, funciona como substantivo devido ao artigo "O").

#### B) Composição
Formação de palavras pela união de dois ou mais radicais.
* **Justaposição**: Sem perda de fonemas. (Ex: passatempo, girassol, guarda-civil).
* **Aglutinação**: Com perda de fonemas. (Ex: planalto [plano + alto], fidalgo [filho + de + algo], embora [em + boa + hora]).

---

## 3. Emprego das Classes de Palavras (Foco em Concursos)

Das dez classes de palavras, três são as campeãs absolutas de cobrança: **conjunções, pronomes e verbos**.

### 3.1. Conjunções (Morfossintaxe de Alta Recorrência)
As conjunções coordenativas e subordinativas são o esqueleto lógico do texto. As bancas exigem a substituição de uma conjunção por outra equivalente mantendo o sentido.

* **Adversativas** (ideia de oposição): mas, porém, contudo, todavia, entretanto, no entanto.
* **Concessivas** (oposição que não impede a ação principal): embora, mesmo que, ainda que, posto que, conquanto, apesar de.
  * *Pegadinha:* Substituir uma adversativa por uma concessiva exige alteração no modo verbal.
    * *Adversativa:* Estudou, *mas não passou*. (Indicativo)
    * *Concessiva:* *Embora tenha estudado*, não passou. (Subjuntivo)
* **Conclusivas**: logo, portanto, pois (posposto ao verbo), por conseguinte.
* **Explicativas**: porque, pois (antecedente ao verbo), que.

### 3.2. Pronomes Pessoais e Demonstrativos
* **Pronomes O/A vs. LHE**:
  * **O/A** (e variantes lo, la, no, na) funcionam como **Objeto Direto** (verbos transitivos diretos).
    * *Exemplo:* O policial deteve *o suspeito* $\\rightarrow$ O policial deteve-*o*.
  * **LHE** funciona como **Objeto Indireto** (verbos transitivos indiretos que pedem preposição *a* ou *para*).
    * *Exemplo:* Entreguei o relatório *ao delegado* $\\rightarrow$ Entreguei-*lhe* o relatório.
    * *Pegadinha:* Usar "lhe" para verbos VTD é erro grave. (Incorreto: "Eu lhe amo", "Eu lhe vi ontem").
* **Pronomes Demonstrativos (Este, Esse, Aquele)**:
  * **Este(s), Esta(s), Isto**: Referem-se ao que está próximo de quem fala, ao tempo presente ou a elementos que serão mencionados no texto (catáfora).
    * *Exemplo:* *Este* ano de 2026 está sendo produtivo.
  * **Esse(s), Essa(s), Isso**: Referem-se ao que está próximo de quem ouve, ao tempo passado relativamente próximo ou a elementos já mencionados no texto (anáfórica).
    * *Exemplo:* A prisão ocorreu ontem; *esse* fato gerou repercussão.
  * **Aquele(s), Aquela(s), Aquilo**: Referem-se ao que está distante de ambos ou ao passado remoto.

### 3.3. Verbos Irregulares de Alta Cobrança
Os verbos derivados de **ter, vir, ver e pôr** herdam a conjugação dos primitivos.

* **Deter, Manter, Conter, Reter** (derivados de TER):
  * *Ter:* se ele *tivesse* $\\rightarrow$ *Deter:* se ele *detivesse* (e não "detesse").
  * *Ter:* se ele *tiver* $\\rightarrow$ *Deter:* se ele *detiver* (e não "deter").
* **Intervir** (derivado de VIR):
  * *Vir:* ele *veio* $\\rightarrow$ *Intervir:* ele *interveio* (e não "interviu").
  * *Vir:* se ele *vier* $\\rightarrow$ *Intervir:* se ele *intervier* (e não "intervir").
* **Reaver** (derivado de HAVER): É verbo defectivo. No presente do indicativo, só possui as formas da 1ª e 2ª pessoa do plural (nós reavemos, vós reaveis). Não existe "eu reavejo".
  * *Pretérito Perfeito:* eu *reouve*, ele *reouve*, eles *reouveram*.

---

## 4. Casos Especiais: Substantivação e Adjetivação

* **Substantivação**: Ocorre quando qualquer vocábulo (verbo, adjetivo, advérbio) assume a função de substantivo devido à presença de um artigo ou outro determinante antes dele.
  * *Exemplo:* O *sim* do réu pareceu forçado. (O advérbio "sim" foi substantivado pelo artigo "O").
* **Adjetivação**: Ocorre quando um substantivo passa a atuar com valor de adjetivo, qualificando outro substantivo. Nesse caso, o termo adjetivado torna-se invariável.
  * *Exemplo:* Compramos camisas *rosa*. (E não: "camisas rosas", pois rosa é substantivo usado como adjetivo).

---

## 5. ⚡ Como Cai em Prova

### Questão 1 (CESPE/CEBRASPE — PCDF — Inspetor de Polícia)
**Enunciado:** Julgue o item quanto à flexão verbal na frase:
"Se a corregedoria intervisse a tempo na investigação, os desvios éticos teriam sido detectados."
**( ) CERTO  ( ) ERRADO**

* **Gabarito: ERRADO**
* **Comentário:** O verbo é "intervir", derivado de "vir". A conjugação no pretérito imperfeito do subjuntivo do verbo vir é "se ele *viesse*". Portanto, a forma correta do verbo intervir é "se a corregedoria *interviesse*" (e não "intervisse"). A flexão errônea de verbos derivados é uma das maiores armadilhas da banca.

### Questão 2 (FGV — PC-AL — Escrivão de Polícia)
**Enunciado:** No trecho: *"O suspeito cometeu o furto; no entanto, o vigia noturno não percebeu a ação"*, a conjunção sublinhada pode ser substituída sem alteração de sentido e com manutenção da correção gramatical por:
a) conquanto
b) por conseguinte
c) conquanto que
d) contudo
e) visto que

* **Gabarito: D**
* **Comentário:** A conjunção "no entanto" é coordenativa adversativa (indica oposição). A única conjunção adversativa entre as opções é "contudo".
  * A e C são concessivas ("conquanto", "conquanto que").
  * B é conclusiva ("por conseguinte").
  * E é causal ("visto que").

### Questão 3 (VUNESP — PC-SP — Investigador)
**Enunciado:** Assinale a alternativa que apresenta o correto processo de formação da palavra sublinhada na frase: *"O delegado determinou o **resgate** das vítimas de sequestro."*
a) Derivação prefixal e sufixal.
b) Derivação parassintética.
c) Derivação regressiva.
d) Derivação imprópria.
e) Composição por aglutinação.

* **Gabarito: C**
* **Comentário:** A palavra "resgate" é um substantivo abstrato que indica ação, derivado do verbo "resgatar" por meio da redução da palavra primitiva (perda do sufixo verbal "-ar"). Trata-se de um caso clássico de derivação regressiva (também chamada de substantivo deverbal).

---

## 6. Pegadinhas Mais Frequentes

1. **"Interviu"**: O erro de falar "o policial interviu no caso" é comum, mas na norma culta a forma correta é **interveio** (derivado de vir: ele veio -> ele interveio).
2. **Confundir Derivação Prefixal e Sufixal com Parassintética**: Cubra o prefixo da palavra. Se a palavra resultante existir no dicionário, o processo é de derivação prefixal e sufixal. Se não existir, é parassíntese.
   * *Prefixal/Sufixal:* deslealdade -> lealdade (existe).
   * *Parassintética:* empobrecer -> pobrecer (não existe).
3. **Uso incorreto do pronome "lhe" com verbos de regência direta**: Verbos como *ajudar*, *deter*, *prender*, *ver*, *ouvir* são VTD. Exigem o pronome **o/a**. As bancas tentam induzir o uso do "lhe".
   * *Incorreto:* "O guarda prendeu-lhe." -> *Correto:* "O guarda prendeu-o."

---

## 7. Quadro-Resumo: Classes e Estrutura

| Classe / Processo | Característica Principal | Exemplo Prático |
|---|---|---|
| **Conjunção Adversativa** | Indica oposição (coorde.) | Estudou, *mas* foi reprovado. |
| **Conjunção Concessiva** | Indica oposição (subord.) | *Embora* estudasse, falhou. |
| **Derivação Regressiva** | Verbo de ação vira nome curto | Julgar $\\rightarrow$ o *júri* / Ajudar $\\rightarrow$ a *ajuda* |
| **Derivação Parassintética** | Prefixo + sufixo obrigatórios | *En*trist*ecer* |
| **Intervir (passado)** | Derivado de Vir (ele veio) | O agente *interveio*. |
| **Reaver (presente)** | Defectivo (só nós e vós) | Nós *reavemos* a arma. |

---

## 8. Conclusão

A morfologia constitui a base de toda a Língua Portuguesa para concursos. Para obter a pontuação máxima nas provas policiais, o candidato deve priorizar o estudo da semântica das conjunções coordenativas e subordinativas (especialmente adversativas e concessivas), consolidar a flexão de verbos irregulares de alta recorrência e identificar os pronomes adequados para a substituição de complementos verbais diretos e indiretos. Esses pontos somados cobrem a grande maioria das questões de morfologia cobradas nos exames.

---',
  'Estudo da estrutura e dos processos de formação de palavras (derivação prefixal, sufixal, parassintética, regressiva e imprópria; composição por justaposição e aglutinação). Análise sintático-semântica das classes gramaticais mais cobradas em concursos públicos (conjunções, pronomes demonstrativos/pessoais, verbos irregulares derivados de ter, vir, ver e pôr). Resolução de questões do CEBRASPE, FGV e VUNESP.'
);

-- =====================================================================
-- Limpeza
-- =====================================================================
DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
