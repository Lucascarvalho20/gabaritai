-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 16 — Língua Portuguesa Avançado
-- Data: 2026-06-07
--
-- 3 materiais densos (DRAFT — aguarda revisão admin):
--  - LP: Coesão e Coerência Textual + Tipologia
--  - LP: Regência Verbal e Nominal + Colocação Pronominal + Crase (revisão)
--  - LP: Pontuação + Acentuação Gráfica + Ortografia (NA reforma)
--
-- Fecha LP universal pra todos os cursos. IDEMPOTENTE.
-- ════════════════════════════════════════════════════════════════════════════

DO $topics$
DECLARE v_subject_id text;
BEGIN
  SELECT id INTO v_subject_id FROM "subjects" WHERE slug = 'lingua-portuguesa';
  IF v_subject_id IS NOT NULL THEN
    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Coesão, Coerência e Tipologia Textual', 'lp-coesao-coerencia-tipologia', 1.3, 100, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Coesão, Coerência e Tipologia Textual');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Regência Verbal e Nominal + Colocação Pronominal', 'lp-regencia-colocacao', 1.4, 101, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Regência Verbal e Nominal + Colocação Pronominal');

    INSERT INTO "topics" (id, "subjectId", name, slug, weight, "order", "createdAt")
    SELECT gen_random_uuid()::text, v_subject_id, 'Pontuação, Acentuação Gráfica e Ortografia', 'lp-pontuacao-acentuacao', 1.3, 102, NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "topics" WHERE "subjectId" = v_subject_id AND name = 'Pontuação, Acentuação Gráfica e Ortografia');
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

-- ┌─ 1. LP — Coesão + Coerência + Tipologia ─────────────────────────────────┐
SELECT upsert_material(
  'lingua-portuguesa',
  'Coesão, Coerência e Tipologia Textual',
  'Coesão, Coerência e Tipologia Textual',
$content$
# Coesão, Coerência e Tipologia Textual

Cebraspe ama derrubar candidato em interpretação textual. Foco aqui: **mecanismos coesivos**, **fatores de coerência**, **identificação de tipos textuais**.

## 1. Coesão Textual

### 1.1. Conceito

**Coesão** = articulação entre as partes do texto. Liga frases, parágrafos, ideias. É a "amarração" superficial.

### 1.2. Coesão referencial

Retomada de elementos do texto:

#### A) Anáfora
Retoma elemento ANTERIOR.
> "**João** chegou. **Ele** estava cansado." (Ele = João)

#### B) Catáfora
Antecipa elemento POSTERIOR.
> "Considere os seguintes pontos: **a**, **b**, **c**."

#### C) Elipse
Omissão de termo recuperável pelo contexto.
> "Maria comprou pão; João, queijo." (omitido "comprou")

#### D) Pronomes (pessoais, possessivos, demonstrativos)
> "Vi o **livro**. **Ele** é interessante." (Ele substitui livro)

### 1.3. Coesão sequencial

Articulação entre orações/parágrafos por meio de:

#### A) Conectivos (operadores argumentativos)

| Tipo | Conectivos |
|---|---|
| Adição | e, também, ademais, além disso |
| Adversidade | mas, porém, contudo, entretanto, todavia |
| Causalidade | porque, pois, já que, visto que |
| Conclusão | portanto, logo, por isso, assim |
| Conformidade | conforme, segundo, de acordo com |
| Comparação | como, assim como, tal qual |
| Concessão | embora, ainda que, apesar de, mesmo que |
| Condição | se, caso, desde que, contanto que |
| Finalidade | para que, a fim de que |
| Tempo | quando, enquanto, antes que, depois que |

#### B) Pontuação como recurso coesivo
- Vírgula introduz pausa breve, separa termos.
- Ponto e vírgula separa orações próximas.
- Dois pontos introduzem explicação/enumeração.

### 1.4. Coesão lexical

#### A) Repetição
> "A **chuva** era forte. A **chuva** durou horas."

#### B) Sinonímia/Substituição lexical
> "O **carro** parou. O **veículo** quebrou."

#### C) Hiperônimo/hipônimo (geral/específico)
> "**Cães** são leais. Esse **animal** ama o dono."

#### D) Campo semântico
Palavras relacionadas pelo significado (educação → escola, professor, aluno).

## 2. Coerência Textual

### 2.1. Conceito

**Coerência** = lógica interna do texto. Garante que o conteúdo faça sentido. É a "amarração" PROFUNDA.

### 2.2. Princípios da coerência (Charolles)

#### A) Continuidade
Manutenção do tema central ao longo do texto.

#### B) Progressão
Cada parte do texto adiciona informação nova.

#### C) Não-contradição
O texto não pode afirmar uma coisa e negar a mesma adiante.

#### D) Articulação
Relações lógicas adequadas entre as partes.

### 2.3. Coerência x Coesão

- Texto pode ser **coeso e incoerente**: "Maria estudou muito. Por isso, foi à praia." (conectivo "por isso" inadequado).
- Texto pode ser **incoeso e coerente**: "Cheguei. Trabalhei. Voltei." (sem conectivos mas sentido claro).

### 2.4. Coerência pragmática

Adequação ao contexto:
- Quem fala/escreve.
- Para quem.
- Onde.
- Quando.
- Por quê.

### 2.5. Intertextualidade

Diálogo entre textos:
- **Citação direta**: aspas.
- **Citação indireta**: paráfrase.
- **Alusão**: referência implícita.
- **Paródia**: imitação irônica.

## 3. Tipologia Textual

### 3.1. Tipos textuais (5 principais)

#### A) Narrativo
- Conta um fato.
- **Elementos**: narrador, personagens, tempo, espaço, enredo.
- Verbos no pretérito (regra).
- Marcadores temporais: "então", "depois", "em seguida".

#### B) Descritivo
- Apresenta características.
- Adjetivos abundantes.
- Verbos de estado (ser, estar, parecer).

#### C) Dissertativo-argumentativo
- Defende ponto de vista.
- Estrutura: introdução, desenvolvimento (argumentos), conclusão.
- Verbos no presente.

#### D) Dissertativo-expositivo
- Apresenta informação.
- Objetiva, sem opinião.

#### E) Injuntivo
- Instrui, ordena, aconselha.
- Verbos no imperativo.
- Manuais, receitas, regras.

### 3.2. Gêneros textuais

**Gênero** ≠ tipo. Gênero é a forma social do texto.

| Gênero | Tipo predominante |
|---|---|
| Notícia | Narrativo + expositivo |
| Editorial | Argumentativo |
| Manual | Injuntivo |
| Crônica | Narrativo |
| Reportagem | Expositivo + narrativo |
| Carta argumentativa | Argumentativo |
| Receita | Injuntivo |
| Conto | Narrativo |
| Verbete | Expositivo |

## 4. Funções da Linguagem (Jakobson)

| Função | Foco | Exemplo |
|---|---|---|
| Referencial | Mensagem (objetivo) | "São Paulo tem 12 mi habitantes." |
| Emotiva/Expressiva | Emissor | "Ai, meu Deus, como estou cansado!" |
| Conativa/Apelativa | Receptor | "Compre já! Não perca!" |
| Fática | Canal | "Alô?", "Você está aí?" |
| Metalinguística | Código | "Substantivo é palavra que..." |
| Poética | Mensagem (forma) | Poesias, propagandas com rimas |

## 5. Como Cebraspe cobra

- **C/E**: "Coesão e coerência são sinônimos" → **ERRADO** (coesão = superficial; coerência = profunda).
- **C/E**: "Texto coeso é necessariamente coerente" → **ERRADO** (pode ser coeso e incoerente).
- **C/E pronome**: "Uso de pronome demonstrativo 'este/esta' refere-se a algo já citado" → **CUIDADO** (este = perto do falante/futuro; esse = perto do ouvinte/passado).
- **C/E tipo**: "Receita culinária é gênero do tipo descritivo" → **ERRADO** (injuntivo).
- **C/E função**: "Anúncio com apelo direto ao consumidor tem predominância da função poética" → **ERRADO** (conativa/apelativa).
- **C/E conectivo**: "O 'porém' indica conclusão" → **ERRADO** (adversidade).
$content$,
$resumo$
# Resumo — Coesão + Coerência + Tipologia

## Coesão (superficial)

### Referencial
- Anáfora: retoma anterior.
- Catáfora: antecipa posterior.
- Elipse: omite recuperável.
- Pronomes.

### Sequencial
Conectivos (adição, adversidade, causa, conclusão, etc).

### Lexical
Repetição, sinonímia, hiperônimo/hipônimo, campo semântico.

## Coerência (profunda)

Princípios Charolles: **continuidade + progressão + não-contradição + articulação**.

Texto pode ser:
- Coeso E incoerente.
- Incoeso E coerente.

## Tipos textuais

| Tipo | Característica |
|---|---|
| Narrativo | Conta fato (pretérito) |
| Descritivo | Caracteriza (adjetivos) |
| Dissertativo-argumentativo | Defende tese |
| Dissertativo-expositivo | Apresenta info |
| Injuntivo | Instrui (imperativo) |

## Gêneros

Notícia, editorial, manual, crônica, reportagem, carta, receita, conto, verbete.

## Funções da Linguagem (Jakobson)

| Função | Foco |
|---|---|
| Referencial | Mensagem |
| Emotiva | Emissor |
| Conativa | Receptor |
| Fática | Canal |
| Metalinguística | Código |
| Poética | Forma da mensagem |

## Top pegadinhas Cebraspe

1. Coesão ≠ Coerência.
2. Receita = injuntivo (não descritivo).
3. "Porém" = adversidade (não conclusão).
4. Apelo ao consumidor = conativa.
5. "Este/esta" = falante/futuro; "esse/essa" = ouvinte/passado.
6. Texto coeso pode ser INCOERENTE.
$resumo$
);

-- ┌─ 2. LP — Regência + Colocação Pronominal ────────────────────────────────┐
SELECT upsert_material(
  'lingua-portuguesa',
  'Regência Verbal e Nominal + Colocação Pronominal',
  'Regência Verbal e Nominal e Colocação Pronominal',
$content$
# Regência Verbal e Nominal e Colocação Pronominal

Tema clássico onde quem domina ganha pontos garantidos. Cebraspe cobra os verbos mais frequentes + as 3 colocações (próclise/ênclise/mesóclise).

## 1. Regência Verbal

### 1.1. Conceito

**Regência verbal** = relação entre verbo e seu complemento (objeto direto, indireto ou ambos).

### 1.2. Verbos transitivos diretos (VTD)

Pedem objeto SEM preposição.
- **Ver** algo.
- **Ouvir** algo.
- **Receber** algo.

### 1.3. Verbos transitivos indiretos (VTI)

Pedem objeto COM preposição.
- **Gostar de** algo.
- **Acreditar em** algo.
- **Pertencer a** alguém.

### 1.4. Verbos transitivos diretos e indiretos (VTDI)

Pedem dois complementos.
- **Dar** algo (OD) a alguém (OI).
- **Entregar** algo a alguém.

### 1.5. Verbos polirregentes (mudam de sentido conforme regência)

#### A) Aspirar

- **VTD** = inalar, respirar.
  > "Aspirei o perfume."
- **VTI** (aspirar A) = pretender, almejar.
  > "Aspiro ao cargo."

#### B) Assistir

- **VTI** (a) = ver, presenciar.
  > "Assisti ao filme."
- **VTI** (a) = caber, pertencer.
  > "Esse direito assiste ao funcionário."
- **VTD/VI** = ajudar, prestar assistência.
  > "O médico assistiu o paciente."

#### C) Visar

- **VTD** = mirar, alvejar; pôr visto em.
  > "Visou o documento."
- **VTI** (a) = ter por objetivo.
  > "Visa ao primeiro lugar."

#### D) Implicar

- **VTD** = acarretar, gerar consequência.
  > "A decisão implica gastos."
- **VTI** (com) = ter implicância.
  > "Ele implica com tudo."

#### E) Esquecer / Lembrar

- **VTD** (sem pronome): "Esqueci o livro."
- **Pronominal** (com): "Esqueceram-se do livro." / "Lembrei-me do filho."

#### F) Preferir

Regra: VTDI obrigatoriamente.
> "Prefiro arroz **a** feijão." (NÃO "do que").

#### G) Obedecer / Desobedecer / Pagar / Perdoar

Pedem preposição **A** quando o complemento é pessoa.
> "Obedeço **aos** pais."

#### H) Chegar / Ir

Pedem preposição **A** (NÃO "em").
> "Chegou **a** São Paulo." (não "em")

#### I) Namorar

VTD (sem preposição).
> "Namorei Maria." (não "com")

### 1.6. Verbo Querer

- **VTD** = desejar.
  > "Quero água."
- **VTI** (querer A/A bem A) = estimar.
  > "Quero bem ao amigo."

## 2. Regência Nominal

### 2.1. Conceito

Relação entre nome (substantivo, adjetivo, advérbio) e seu complemento.

### 2.2. Nomes mais cobrados

| Nome | Preposição |
|---|---|
| Acesso | a |
| Adepto | de |
| Apto | a, para |
| Atento | a, em |
| Avesso | a |
| Capaz | de, para |
| Compatível | com |
| Curioso | de, por |
| Desejoso | de |
| Devoção | a, para com |
| Dúvida | em, sobre |
| Falta | a, com, de |
| Favorável | a |
| Hostil | a |
| Necessidade | de |
| Pena | de |
| Próximo | a, de |
| Útil | a, para |

## 3. Crase (revisão)

### 3.1. Conceito

Fusão de dois sons "a" — preposição "a" + artigo "a" OU pronome "a/aquela".

### 3.2. Quando ocorre

- Antes de palavra feminina + verbo que pede "a".
  > "Refiro-me **à** Maria." (referir-se A + a Maria)
- Locuções femininas: à noite, à tarde, à medida que, à proporção que, às vezes.
- Antes de horas determinadas: às 8h, à uma hora.

### 3.3. Quando NÃO ocorre

- Antes de palavra masculina: "Foi a pé."
- Antes de verbo: "Começou a estudar."
- Antes de pronome pessoal: "Vi a ela."
- Antes de plurais sem artigo: "Refere-se a pessoas."

### 3.4. Crase facultativa

- Antes de pronome possessivo feminino: "Refiro-me à/a minha amiga."
- Antes de nome próprio feminino: "Voltei à/a Roma."
- Após "até": "Vou até à/a casa."

## 4. Colocação Pronominal

### 4.1. Tipos

- **Próclise**: pronome ANTES do verbo. "**Me** dê uma chance."
- **Mesóclise**: pronome NO MEIO do verbo. "Dar-**te**-ei o livro."
- **Ênclise**: pronome DEPOIS do verbo. "Dê-**me** uma chance."

### 4.2. Quando usar PRÓCLISE (atrai)

1. **Palavras negativas**: não, nunca, jamais, nada.
   > "**Não** me diga isso."
2. **Pronomes indefinidos**: alguém, todos, ninguém.
   > "Alguém te chamou."
3. **Pronomes relativos**: que, quem, qual.
   > "O homem que te procura..."
4. **Pronomes interrogativos**: quem, qual, o que.
   > "Quem te disse?"
5. **Advérbios** (sem vírgula): aqui, hoje, sempre, talvez.
   > "Hoje me sinto bem."
6. **Conjunções subordinativas**: que, embora, se, quando.
   > "Embora me visse triste..."
7. **Em orações exclamativas/optativas**:
   > "Deus o abençoe!"

### 4.3. Quando usar MESÓCLISE

- Verbos no FUTURO (presente ou pretérito), SEM palavra atrativa.
> "Dar-te-ei o livro."
> "Dar-te-ia o livro."

### 4.4. Quando usar ÊNCLISE

- Início de oração: "Diga-me a verdade." (NÃO "Me diga...")
- Verbo no imperativo afirmativo: "Cale-se!"
- Verbo no infinitivo: "É tempo de calar-se."
- Verbo no gerúndio: "Calando-se, pode pensar."

### 4.5. Locuções verbais

- Auxiliar no presente + verbo principal: várias posições possíveis.
> "Quero **te** ver." OU "Quero ver-**te**." OU "Quero-**te** ver."
- Se houver palavra atrativa: próclise em relação ao auxiliar.
> "Não **te** quero ver."

## 5. Como Cebraspe cobra

- **C/E**: "Aspirar ao cargo é VTD" → **ERRADO** (VTI).
- **C/E**: "Assistir o filme está correto" → **ERRADO** (deve ser "ao filme" no sentido de ver).
- **C/E**: "Prefiro arroz do que feijão" → **ERRADO** ("a feijão").
- **C/E**: "Chegou em São Paulo" → **ERRADO** ("a São Paulo").
- **C/E crase**: "Refiro-me a Maria" → **ERRADO** (deveria ser "à Maria").
- **C/E próclise**: "Não diga-me isso" → **ERRADO** (negação atrai → "Não me diga isso").
- **C/E mesóclise**: "Far-te-ei justiça" → **CORRETO** (futuro do presente sem atrativa).
- **C/E ênclise**: "Me explique" no início de frase → **ERRADO** (deve ser "Explique-me").
$content$,
$resumo$
# Resumo — Regência + Colocação Pronominal

## Verbos polirregentes (TOP)

| Verbo | Sentido | Regência |
|---|---|---|
| Aspirar | inalar | VTD |
| Aspirar | almejar | VTI (a) |
| Assistir | ver | VTI (a) |
| Assistir | ajudar | VTD |
| Visar | mirar | VTD |
| Visar | objetivar | VTI (a) |
| Implicar | acarretar | VTD |
| Implicar | implicância | VTI (com) |
| Preferir | preferir | VTDI (a, NÃO "do que") |
| Obedecer | obedecer | VTI (a) |
| Chegar/Ir | local | VTI (a, NÃO em) |
| Namorar | namorar | VTD (NÃO com) |

## Regência Nominal frequente

Acesso A | Apto A/PARA | Capaz DE/PARA | Compatível COM | Favorável A | Próximo A/DE | Útil A/PARA.

## Crase (resumo)

USA: feminino + verbo pede A; locuções femininas; horas determinadas.
NÃO usa: masculino; verbo; pronome pessoal; plural sem artigo.
Facultativa: possessivo feminino, nome próprio feminino, após "até".

## Colocação

### Próclise (ANTES)
Negação, indefinido, relativo, interrogativo, advérbio, conjunção subordinativa, exclamativa/optativa.

### Mesóclise (NO MEIO)
Futuro + SEM atrativa.

### Ênclise (DEPOIS)
Início de oração, imperativo afirmativo, infinitivo, gerúndio.

## Top pegadinhas Cebraspe

1. Aspirar AO cargo (VTI).
2. Assistir AO filme (ver).
3. Prefiro X A Y (NÃO "do que").
4. Chegou A São Paulo (NÃO "em").
5. Próclise atraída por NEGAÇÃO/INDEFINIDO/RELATIVO/INTERROGATIVO.
6. Mesóclise SÓ no futuro sem atrativa.
$resumo$
);

-- ┌─ 3. LP — Pontuação + Acentuação + Ortografia ────────────────────────────┐
SELECT upsert_material(
  'lingua-portuguesa',
  'Pontuação, Acentuação Gráfica e Ortografia',
  'Pontuação, Acentuação Gráfica e Ortografia',
$content$
# Pontuação, Acentuação Gráfica e Ortografia

Decoreba + treino. Cebraspe cobra muito sutileza: vírgula em adjunto adverbial, hífen pós-acordo ortográfico, acento agudo em paroxítonas.

## 1. Pontuação

### 1.1. Vírgula — USOS PRINCIPAIS

#### A) Separar termos enumerados
> "Comprei pão, leite, manteiga e ovos."

#### B) Separar vocativo
> "**João,** venha aqui."

#### C) Isolar aposto
> "Pedro, **meu irmão**, chegou."

#### D) Adjunto adverbial DESLOCADO (anteposto)
> "**Ontem,** fui ao cinema."

Adjunto curto NO LUGAR USUAL: vírgula opcional.
> "Fui ontem ao cinema." OU "Fui, ontem, ao cinema."

#### E) Separar orações COORDENADAS
> "Comprei pão**,** mas esqueci o leite." (adversativa exige vírgula)

#### F) Antes de "e/ou" com sujeitos DIFERENTES
> "Estudei**,** e meu irmão jogou."

#### G) Antes de "POIS" causal (sentido de "porque")
> "Trouxe guarda-chuva**,** pois ia chover."

#### H) Antes de "MAS, PORÉM, CONTUDO, TODAVIA, ENTRETANTO"
> "Quis sair**,** mas estava cansado."

### 1.2. Vírgula — NÃO USA

#### A) Entre sujeito e verbo
> ✗ "João, foi ao mercado."
> ✓ "João foi ao mercado."

#### B) Entre verbo e complemento
> ✗ "Comprei, pão."
> ✓ "Comprei pão."

#### C) Em orações restritivas
> ✓ "Os alunos que estudam passam." (sem vírgula = só esses)
> ✗ "Os alunos, que estudam, passam." (com vírgula = todos)

### 1.3. Ponto e vírgula

- Separa orações próximas SEM conjunção.
> "Estudei muito; passei."
- Separa enumeração de itens com vírgulas internas.
> "Comprei: pães, doces e biscoitos; frutas como maçã, banana e uva; bebidas."

### 1.4. Dois pontos

- Introduz enumeração.
> "Quero três coisas: paz, saúde e felicidade."
- Introduz citação ou explicação.
> "Disse o juiz: 'Está condenado'."

### 1.5. Reticências

- Pausa intencional ou suspensão.
> "Eu queria... não sei mais."

### 1.6. Aspas

- Citação direta.
- Termos em sentido figurado/irônico.
- Estrangeirismos.

### 1.7. Travessão

- Substitui parênteses.
- Indica fala de personagem.
- Ênfase.

### 1.8. Parênteses

- Comentário paralelo.
- Informação adicional.

## 2. Acentuação Gráfica

### 2.1. Regras básicas

#### A) Monossílabos tônicos
- Acentuam terminados em **A, E, O** (+ S): pá, pés, sós.

#### B) Oxítonas
- Acentuam terminadas em **A, E, O** (+ S), **EM/ENS**: café, sofá, parabéns.

#### C) Paroxítonas
- Acentuam NÃO terminadas em A, E, O, EM/ENS.
- Ou seja: terminadas em **I, IS, US, UM, UNS, L, N, R, X, PS, Ã/Ãs, ÃO/ÃOs, DITONGO**.
- Exemplos: júri, tórax, álbum, tórax, fórceps.

#### D) Proparoxítonas
- TODAS são acentuadas: lâmpada, médico, álibi, vínculo.

### 2.2. Acento diferencial

Após o Novo Acordo Ortográfico (vigência total 2016):
- **MANTIDOS**:
  - "Pôde" (passado de poder) vs "pode" (presente).
  - "Pôr" (verbo) vs "por" (preposição).
  - "Têm/Vêm" (3ª pessoa plural) vs "tem/vem" (singular).
- **REMOVIDOS**:
  - "Para" (verbo parar) já não tem acento.
  - "Pelo" (substantivo) já não tem acento.
  - "Pera" (substantivo fruta) já não tem acento.

### 2.3. Hiato e ditongo

- Antes do acordo: "feiúra", "baiúca", "ji-boia" tinham acento.
- Após o acordo: **não acentuam** ditongos abertos "ei/oi" em paroxítonas. "Heroico", "ideia", "jiboia".
- Hiatos com I/U tônicos isolados continuam acentuados: "saída", "saúde", "país".

### 2.4. Trema

- ABOLIDO no Acordo. "Linguiça", "tranquilo", "consequência".
- Mantido em nomes próprios estrangeiros: "Müller", "Hübner".

## 3. Ortografia (Acordo Ortográfico 2009)

### 3.1. Alfabeto

26 letras: K, W, Y oficialmente incluídas.

### 3.2. Hífen

#### A) USA

- Prefixos terminados na MESMA letra que começa a próxima:
  > anti-inflamatório, micro-ondas, super-resistente.
- Após prefixos: ex-, vice-, sem-, pré-, pós-, pró-:
  > ex-presidente, vice-líder, sem-terra.
- Antes de palavras iniciadas por H:
  > anti-higiênico, super-homem.

#### B) NÃO usa

- Junto sem hifen se prefixo + palavra (formando junto):
  > antibiótico, hidromassagem, infraestrutura.
- Prefixos terminados em vogal + consoante:
  > autopista, semicírculo.

#### C) Duplicação de letras

- Prefixo R + R: duplica.
  > anti**rr**efluxo, contra**rr**eferência.
- Prefixo S + S: duplica.
  > anti**ss**ético, contra**ss**enso.

### 3.3. Pegadinhas comuns

- **"Mau" x "mal"**:
  - Mau = adjetivo (oposto a bom): "menino mau".
  - Mal = advérbio (oposto a bem) OU substantivo: "agir mal", "o mal existe".
- **"A par" x "ao par"**:
  - A par = ciente.
  - Ao par = igualado.
- **"Onde" x "aonde"**:
  - Onde = lugar fixo. "Onde mora?"
  - Aonde = movimento. "Aonde vai?"
- **"Mas" x "mais"**:
  - Mas = conjunção adversativa.
  - Mais = advérbio de quantidade.

## 4. Como Cebraspe cobra

- **C/E vírgula**: "Use vírgula entre sujeito e verbo se o sujeito for longo" → **ERRADO** (nunca).
- **C/E acento**: "Heroico tem acento agudo no 'oi'" → **ERRADO** (acordo removeu).
- **C/E acento diferencial**: "'Pôde' não tem mais acento" → **ERRADO** (mantido).
- **C/E hífen**: "Anti-inflamatório está sem hífen está correto" → **ERRADO** (com hífen — anti+i = mesma letra).
- **C/E**: "Trema é usado em 'cinquenta'" → **ERRADO** (abolido).
- **C/E proparoxítona**: "Médico não tem acento" → **ERRADO** (toda proparoxítona acentua).
$content$,
$resumo$
# Resumo — Pontuação + Acentuação + Ortografia

## Pontuação — Vírgula

### USA
- Enumeração.
- Vocativo, aposto.
- Adjunto adverbial deslocado.
- Coordenadas (mas, porém, contudo, todavia, entretanto, pois causal).
- Sujeitos DIFERENTES antes de "e".

### NÃO usa
- Entre sujeito e verbo.
- Entre verbo e complemento.
- Em oração restritiva.

## Outros sinais

- Ponto e vírgula: orações próximas sem conj; enumerações com vírgulas internas.
- Dois pontos: enumeração, citação.
- Reticências: pausa.
- Aspas: citação, sentido figurado.
- Travessão: parêntese, fala.

## Acentuação

| Tipo | Acentua se | Exemplo |
|---|---|---|
| Monossílabo | A, E, O | pá, pés |
| Oxítona | A, E, O (+S), EM/ENS | café, parabéns |
| Paroxítona | NÃO A, E, O, EM/ENS | júri, tórax |
| Proparoxítona | TODAS | lâmpada |

### Diferenciais MANTIDOS
- **Pôde** vs pode.
- **Pôr** vs por.
- **Têm/Vêm** vs tem/vem.

### Diferenciais REMOVIDOS
- Para, pelo, pera.

### Acordo (vigência 2016)
- Trema ABOLIDO (cinquenta, tranquilo).
- Ditongos abertos "ei/oi" em paroxítonas NÃO acentuam (heroico, ideia).
- Hiatos I/U tônicos isolados continuam (saída, saúde).

## Hífen

USA: mesma letra (anti-inflamatório), antes de H (super-homem), prefixos ex-/vice-/pré-/pós-/pró-.
NÃO usa: vogal+consoante, junções comuns (antibiótico, hidromassagem).
RR/SS dobram: antirreflexo, antissocial.

## Pegadinhas comuns

| | |
|---|---|
| Mau (adj) | Mal (advérbio/sub) |
| A par (ciente) | Ao par (igual) |
| Onde (fixo) | Aonde (movimento) |
| Mas (adversativa) | Mais (quantidade) |

## Top pegadinhas Cebraspe

1. NÃO vírgula entre sujeito-verbo.
2. Pôde/Pôr/Têm-Vêm MANTÊM acento.
3. Heroico, ideia: SEM acento.
4. Trema ABOLIDO (salvo nomes estrangeiros).
5. Anti-inflamatório COM hífen (mesma letra).
6. Toda proparoxítona acentua.
$resumo$
);

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);

DO $$
DECLARE v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "materials"
  WHERE "subjectId" IN (
    SELECT id FROM "subjects" WHERE slug IN ('lingua-portuguesa')
  );
  RAISE NOTICE 'Onda 16 OK — total de materiais em LP: %', v_count;
END $$;
