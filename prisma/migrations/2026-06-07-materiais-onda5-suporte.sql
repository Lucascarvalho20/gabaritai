-- ════════════════════════════════════════════════════════════════════════════
-- MATERIAIS ONDA 5 — Cebraspe (LP + Info + RL + DH)
-- Data: 2026-06-07
--
-- 8 materiais densos (DRAFT — aguarda revisão admin) das matérias de suporte:
--  - LP: Interpretação, Crase, Concordância, Sintaxe
--  - Info: Office, Segurança
--  - RL: Lógica proposicional
--  - DH: Atuação policial
--
-- IDEMPOTENTE. Preserva REVIEWED/PUBLISHED. Depende da onda 1.
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
  ON CONFLICT ("materialId") DO UPDATE SET resumo = EXCLUDED.resumo, "generatedAt" = NOW();
END;
$func$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- LP — Compreensão e Intelecção de Textos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'lingua-portuguesa',
  'Compreensão e intelecção de textos',
  'Compreensão e Intelecção de Textos',
  $md$
# Compreensão e Intelecção de Textos

O tópico **mais cobrado** em LP do Cebraspe. Geralmente 2-4 questões por prova. Exige técnica de leitura + atenção a substituições e paráfrases.

## Diferença essencial: Compreensão x Interpretação

### Compreensão
- Identificar o que está **explícito** no texto
- Resposta DENTRO do texto
- Decodificar palavras, frases, parágrafos
- "Segundo o texto, X é responsável por…"

### Interpretação
- **Inferir** o que está implícito
- Vai ALÉM do texto literal
- Conclusões lógicas baseadas em pistas
- "Pode-se concluir que…"

**Atenção Cebraspe**: prefere usar verbos como "depreende-se", "infere-se" — sinaliza interpretação. "Afirma-se", "menciona-se" — sinaliza compreensão.

## Tipos de Texto

### Quanto à tipologia
- **Narrativo**: conta uma história (personagens, tempo, espaço)
- **Descritivo**: detalha características
- **Dissertativo-Argumentativo**: tese + argumentos + conclusão
- **Expositivo**: apresenta informações sem opinar
- **Injuntivo**: dá instruções (receitas, manuais)

### Quanto ao gênero
Notícia, editorial, crônica, artigo de opinião, ensaio, resenha, conto, romance, poema, etc.

## Estrutura do Texto Dissertativo (mais cobrado)

1. **Introdução**: apresenta a tese (ideia principal)
2. **Desenvolvimento**: argumentos sustentando a tese
3. **Conclusão**: retomada + síntese

## Técnicas de Leitura (Cebraspe)

### Skimming (leitura rápida)
- Pega ideia geral em ~30s
- Olha primeira/última frase de cada parágrafo
- Útil pra responder "tema principal", "tese central"

### Scanning (busca específica)
- Procura palavra-chave
- Útil pra responder "segundo o texto, X significa Y"

## Estratégia Cebraspe (CERTO/ERRADO)

### Pegadinhas clássicas
1. **Troca de palavra-chave**: muda só uma palavra (ex: "deve" → "pode")
2. **Generalização indevida**: texto fala "alguns" e item diz "todos"
3. **Inversão de causa/efeito**: troca quem causa o quê
4. **Paráfrase com erro sutil**: reescreve mantendo ~95% da ideia, mas distorce ponto crítico
5. **Conclusão com salto lógico**: assume premissas não-textuais

### Como atacar
1. Lê o item PRIMEIRO (sabe o que procurar)
2. Localiza trecho no texto
3. Compara palavra por palavra (não fia em "lembrar")
4. CUIDADO com:
   - Adjetivos qualificativos novos
   - Quantificadores ("todos", "alguns", "nenhum")
   - Modalizadores ("pode", "deve", "talvez")
   - Conectivos lógicos ("portanto", "no entanto")

## Coesão e Coerência

### Coesão
- LIGAÇÕES gramaticais entre frases/parágrafos
- Mecanismos: pronomes (ele, ela, isso), conectivos (porque, mas, entretanto), repetição de palavras, sinônimos

### Coerência
- LIGAÇÕES de sentido entre ideias
- Texto coerente: não tem contradição interna, segue progressão lógica

**Cebraspe ama**: substituir pronome ou conectivo no texto e perguntar se mantém o sentido. Muitas vezes NÃO mantém — pequena mudança altera referência.

## Ambiguidade e Polissemia

### Ambiguidade
- Frase com duas interpretações possíveis
- Defeito (em geral) — em poesia pode ser intencional

### Polissemia
- Palavra com múltiplos sentidos
- Sentido determinado pelo contexto

### Conotação x Denotação
- **Denotação**: sentido literal, objetivo, dicionário
- **Conotação**: sentido figurado, subjetivo, contextual

## Inferência

3 tipos:
- **Lógica**: dedução por silogismo
- **Pragmática**: baseada em conhecimento de mundo
- **Linguística**: pistas textuais

**Inferir = ir além do literal SEM contradizer o texto.**

## Como cai na Cebraspe

**Item 1 (CERTO):** "O texto apresenta argumentos em defesa da reforma administrativa, ressaltando seus possíveis benefícios para a eficiência do serviço público."

**Item 2 (ERRADO):** "Conforme o texto, todas as instituições públicas devem aderir imediatamente ao novo modelo de gestão."
> Errado se o texto disse "algumas" ou "podem" — generalização indevida.

**Item 3 (CERTO):** "Depreende-se do trecho que o autor é favorável à medida, ainda que reconheça suas limitações."

**Item 4 (ERRADO):** "O autor defende explicitamente que a reforma resultará em queda de salários dos servidores."
> Errado se o texto não disse isso — extrapolação.

## Estratégia
- LEIA O TEXTO INTEIRO antes dos itens (não vale ler por partes)
- Marque a tese central + 2-3 argumentos principais
- Em CADA item, RELEIA o trecho relacionado
- NUNCA responda só pela memória do texto
- Cuidado com paráfrases que parecem corretas mas trocam UMA palavra
$md$,
  $resumo$
## Resumo — Compreensão e Intelecção

### Compreensão x Interpretação
- **Compreensão**: o que está EXPLÍCITO ("segundo o texto…")
- **Interpretação**: o que está IMPLÍCITO ("depreende-se que…")

### Tipologia Textual
- Narrativo, Descritivo, **Dissertativo-Argumentativo** (mais cobrado), Expositivo, Injuntivo

### Pegadinhas Cebraspe
1. Troca de palavra-chave (deve ↔ pode)
2. Generalização indevida (alguns ↔ todos)
3. Inversão causa/efeito
4. Paráfrase com erro sutil em 1 palavra
5. Conclusão com salto lógico

### Coesão x Coerência
- **Coesão**: ligação GRAMATICAL (pronomes, conectivos)
- **Coerência**: ligação de SENTIDO

### Como atacar
1. Lê item primeiro
2. Localiza trecho
3. Compara palavra por palavra
4. Quantificadores (todo/algum/nenhum) e modalizadores (pode/deve) = ARMADILHA

### Inferência
Vai além do literal SEM contradizer o texto

### Pegadinhas Cebraspe
- "Todos" quando texto disse "alguns" → ERRADO
- Conclusão extrapolada → ERRADO
- Substituição de pronome pode alterar referência
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- LP — Crase
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'lingua-portuguesa',
  'Emprego do sinal indicativo de crase',
  'Crase — Emprego do Acento Grave',
  $md$
# Crase — Emprego do Sinal Indicativo

A crase é a fusão de duas vogais idênticas, em geral da preposição **a** com o artigo definido **a/as** ou com o pronome demonstrativo **aquele/aquela**. Cobra muito em CE.

## Regra de Ouro (memorize)

**A crase ocorre quando há, simultaneamente:**
1. Uma palavra que **EXIGE PREPOSIÇÃO "A"** antes (verbo, nome, locução)
2. Uma palavra **FEMININA QUE ACEITA O ARTIGO "A"** depois

> Fórmula: **Preposição A + Artigo A = À** (crase)

## Casos OBRIGATÓRIOS (ocorre crase)

### 1. Antes de palavra feminina que admite "a/as" como artigo
- Vou **à** escola. (vou A + A escola)
- Fui **às** compras. (fui A + AS compras)

### Teste prático (REGRA MASCULINA)
> Troca a palavra feminina por masculina equivalente. Se virar "AO", tem crase.

- "Vou à escola" → "Vou ao colégio" → **CRASE OBRIGATÓRIA**
- "Estudo italiano" → "Estudo o francês" → SEM "ao", SEM crase

### 2. Locuções adverbiais femininas
- À noite, às vezes, à tarde, à direita, à esquerda, às pressas, à força, às escondidas

### 3. Locuções prepositivas femininas
- À procura de, à beira de, à frente de, à custa de, à medida que, à proporção que

### 4. Locuções conjuntivas femininas
- À medida que, à proporção que

### 5. Antes de "aquela/aquele/aquilo" (a + aquela = àquela)
- Voltei **àquela** cidade. (a + aquela)
- Refiro-me **àqueles** projetos. (a + aqueles)
- Cheguei **àquilo** que prometi. (a + aquilo)

### 6. Indicação de horas determinadas
- Vou ao trabalho **às 8h**. (a + as 8 horas)
- A reunião começa **à uma da tarde**.

### Detalhe
- "Daqui A pouco" — SEM crase (não tem artigo "a" depois)
- "Daqui A 5 minutos" — SEM crase

## Casos PROIBIDOS (não há crase)

### 1. Antes de palavra masculina
- Vou a pé. Refiro-me a Pedro. Andei a cavalo.

**Exceção**: "à moda de" oculta — "Bife à (moda de) Parmegiana", "frango à (moda de) passarinho", "redigi o texto à Machado de Assis".

### 2. Antes de verbo
- Começou **a chover**. Voltou **a estudar**.

### 3. Antes de pronome pessoal
- Refiro-me **a você**. Cumprimentei **a ela**.

### 4. Antes de palavras femininas no sentido genérico
- Não dou ouvidos **a mulheres** indiscretas. (sem artigo definido)
- Compare: "Não dou ouvidos **às mulheres** que conheço" → sentido específico, COM artigo, COM crase.

### 5. Antes de "uma" (artigo indefinido)
- Refiro-me **a uma** colega. (não há artigo definido "a")
- **Exceção**: "à uma hora" (horário) — locução de horário sempre crase

### 6. Entre palavras repetidas (a + a)
- Cara **a** cara, gota **a** gota, dia **a** dia, frente **a** frente, face **a** face

### 7. Antes de "casa" (sentido genérico, sua própria casa)
- Vou **a casa**. (própria casa, sem determinante)
- COMPARE: "Vou **à casa de** Maria" (casa qualificada → com artigo, com crase)

### 8. Antes de "terra" (sentido oposto a bordo/mar)
- O marinheiro foi **a terra**. (sentido de "desembarcou")
- COMPARE: "Voltei **à terra** dos meus pais" (terra específica)

### 9. Antes de nomes próprios femininos íntimos
- Refiro-me **a Maria** (sem artigo) — caso a pessoa não use artigo no cotidiano

### 10. Antes de "distância" sem determinante
- Manteve-se **a distância**.
- COMPARE: "Manteve-se **à distância de** 100m" (com determinante, com crase)

## Casos FACULTATIVOS (pode ou não ter)

### 1. Antes de nome próprio feminino (não-íntimo)
- Refiro-me a Joana / à Joana

### 2. Antes de pronome possessivo feminino singular
- Refiro-me a minha mãe / à minha mãe

### 3. Após preposição "até"
- Fui até a escola / Fui até à escola

## Como cai na Cebraspe

**Item 1 (CERTO):** "Em 'O servidor dirigiu-se à autoridade competente', o acento grave indica crase, justificada pela regência do verbo dirigir-se e pelo gênero feminino do substantivo."

**Item 2 (ERRADO):** "Em 'Refiro-me àquele projeto', o acento grave é desnecessário."
> Errado: a + aquele = àquele — crase OBRIGATÓRIA.

**Item 3 (CERTO):** "Não há crase em 'Vou a Brasília' porque o nome 'Brasília' não admite o artigo definido."

**Item 4 (ERRADO):** "Em 'Estou às pressas', o acento grave deve ser suprimido."
> Errado: locução adverbial feminina = CRASE.

### Teste do "voltar/ir de"
- "Vou A Brasília" → "Volto DE Brasília" → SEM crase (cidade não pede artigo)
- "Vou À Bahia" → "Volto DA Bahia" → COM crase (estado pede artigo)

## Estratégia
1. **Regra masculina**: troca por equivalente masculino — virou "ao" = crase
2. **Mnemônico das locuções**: TODAS femininas com crase
3. Em "aquele/aquela/aquilo": SEMPRE crase se vem depois de A
4. "Casa" e "terra" sem determinante: SEM crase
5. Locuções "a a" repetidas: SEM crase
$md$,
  $resumo$
## Resumo — Crase

### Regra de Ouro
Crase = **preposição A + artigo/pronome A** = **À**

### Teste Masculino (★)
Troca por equivalente masculino:
- Virou "AO" → CRASE
- NÃO virou "AO" → SEM CRASE

### OBRIGATÓRIO
1. Palavra feminina com artigo (à escola, às compras)
2. **Locuções adverbiais** femininas (às vezes, à noite, à tarde)
3. **Locuções prepositivas** femininas (à frente de, à beira de)
4. **A + aquele/aquela/aquilo** = **àquele/àquela/àquilo**
5. **Horas determinadas** (às 8h, à uma da tarde)

### PROIBIDO
1. Antes de masculino (a pé, a cavalo)
2. Antes de verbo (começou a chover)
3. Antes de pronome pessoal (a você, a ela)
4. Antes de artigo indefinido (a uma colega)
5. Palavras repetidas (cara a cara, dia a dia)
6. "Casa" (própria), "terra" (oposto mar), "distância" sem determinante
7. Sentido genérico sem artigo

### FACULTATIVO
- Nome próprio feminino (a/à Joana)
- Pronome possessivo (a/à minha mãe)
- Depois de "até" (até a/à escola)

### Pegadinhas Cebraspe
- "Vou A Brasília" SEM crase (cidade sem artigo: "volto DE Brasília")
- "Vou À Bahia" COM crase ("volto DA Bahia")
- "Bife à parmegiana" = à moda de (à oculta)
- "Daqui A pouco" SEM crase (não há artigo)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- LP — Concordância
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'lingua-portuguesa',
  'Concordância nominal e verbal',
  'Concordância Nominal e Verbal',
  $md$
# Concordância Nominal e Verbal

Tema clássico em CE. Cebraspe ama testar casos especiais de concordância.

## Concordância Verbal

### Regra Geral
Verbo concorda com sujeito em **número e pessoa**.
- O aluno **estuda**. / Os alunos **estudam**.

## Casos Especiais

### 1. Sujeito Coletivo
- Concorda no SINGULAR
- "A multidão **gritou**."
- **Exceção**: coletivo + de + plural → pode plural
  - "A maioria dos alunos **passou/passaram**" (ambas aceitas)

### 2. Sujeito Composto Anteposto
- Concorda no PLURAL
- "João e Maria **chegaram**."

### 3. Sujeito Composto Posposto
- Pode no PLURAL ou SINGULAR (concorda com mais próximo)
- "**Chegaram/Chegou** João e Maria."

### 4. Verbo HAVER (impessoal)
- Quando significa "existir": INVARIÁVEL no singular
- "**Há** muitos alunos." (não "hão")
- "**Houve** problemas." (não "houveram")

### 5. Verbo FAZER (tempo decorrido)
- Impessoal — INVARIÁVEL no singular
- "**Faz** dez anos que ele estuda." (não "fazem")

### 6. Pronome Relativo QUE
- Concorda com o ANTECEDENTE
- "Fui eu que **escrevi**." (que = eu → 1ª pessoa)
- "Foram eles que **escreveram**." (que = eles)

### 7. Pronome Relativo QUEM
- Concorda na 3ª pessoa do SINGULAR
- "Fui eu quem **escreveu**." (3ª p sing)
- OU concorda com o sujeito da oração principal (forma menos comum)

### 8. Expressões "mais de", "menos de", "cerca de"
- Concorda com o NUMERAL
- "Mais de um aluno **chegou**." (singular)
- "Mais de dois alunos **chegaram**." (plural)
- **Pegadinha**: "Mais de um aluno se cumprimentaram." (verbo no plural pela ideia recíproca)

### 9. Expressões partitivas
- "A maioria de", "grande parte de" — pode singular ou plural
- "A maioria dos alunos **chegou/chegaram**" (ambas)

### 10. Sujeito "um e outro", "nem um nem outro"
- Verbo no SINGULAR ou PLURAL (ambas)
- "Um e outro **chegou/chegaram**"

### 11. Sujeito com porcentagem
- Concorda com o numeral OU com o substantivo
- "30% dos alunos **passou/passaram**" (ambas)
- "30% **passou/passaram**" (concorda com numeral pl/sing conforme)

## Concordância Nominal

### Regra Geral
Adjetivo concorda com substantivo em **gênero e número**.

### Casos Especiais

### 1. Adjetivo + 2 substantivos
- **Anteposto**: concorda com o mais próximo
  - "**Belo** filme e atuação."
- **Posposto**: concorda com mais próximo OU todos no plural
  - "Filme e atuação **bela/belos**."

### 2. "Anexo", "incluso", "obrigado", "mesmo", "próprio", "leso"
- Concordam com o nome
- "**Anexa** vai a fatura." (não "anexo")
- "**Obrigada**, disse a moça."

### 3. "É bom", "é necessário", "é preciso", "é proibido"
- **Sem artigo** → INVARIÁVEL
  - "Verdura **é bom** para a saúde."
- **Com artigo** → CONCORDA
  - "A verdura **é boa** para a saúde."

### 4. "Meio" (advérbio x adjetivo)
- Adjetivo (meio = metade) → concorda
  - "Comprei **meia** dúzia."
- Advérbio (meio = um pouco) → INVARIÁVEL
  - "Ela está **meio** cansada."

### 5. "Bastante"
- Adjetivo → concorda
  - "Estudei **bastantes** matérias."
- Advérbio → INVARIÁVEL
  - "Ela é **bastante** inteligente."

### 6. "Menos"
- SEMPRE invariável
- "Menos alunos. Menos problemas." (não "menas")

### 7. Numerais ordinais
- "1º a 5º andares" → "1º AO 5º andares" (sg) ou "1º E 5º andares" (pl)

## Como cai na Cebraspe

**Item 1 (CERTO):** "Em 'Faz dez anos que estudo concursos', o verbo 'fazer' é impessoal e deve permanecer invariável no singular."

**Item 2 (ERRADO):** "Em 'Houveram muitos candidatos aprovados', a forma verbal está corretamente flexionada no plural."
> Errado: HAVER no sentido de "existir" é INVARIÁVEL no singular → "Houve muitos".

**Item 3 (CERTO):** "Em 'Mais de um aluno se cumprimentaram', o verbo no plural se justifica pela ideia de reciprocidade."

**Item 4 (ERRADO):** "Em 'Verdura são bons para a saúde', a concordância está correta."
> Errado: SEM artigo, expressão "é bom" é invariável → "Verdura é bom".

## Estratégia
- **HAVER (existir)** e **FAZER (tempo)** = INVARIÁVEIS no singular
- **Que** (relativo) concorda com antecedente; **Quem** = 3ª pessoa sing
- **Anexo, obrigado, mesmo** = concordam
- **Meio, bastante, muito** podem ser advérbio (invariável) ou adjetivo (concorda)
- **Menos** SEMPRE invariável
- "É bom/necessário/preciso" SEM artigo = invariável
$md$,
  $resumo$
## Resumo — Concordância

### VERBAL — Casos Especiais
- **HAVER** (existir) e **FAZER** (tempo) = **INVARIÁVEIS** sing
- **Sujeito composto anteposto**: PLURAL
- **Sujeito composto posposto**: pode concordar com mais próximo
- **Coletivo** (multidão): SINGULAR (regra)
- **A maioria de + pl**: sing OU plural (aceitas)
- **QUE relativo**: concorda com antecedente
- **QUEM relativo**: 3ª pessoa SINGULAR
- **Mais de um**: SING (a menos que recíproco)
- **Porcentagem**: concorda com numeral OU substantivo

### NOMINAL — Casos Especiais
- **Anexo, obrigado, mesmo, próprio**: CONCORDAM
- **É bom, é necessário, é preciso** (sem artigo): **INVARIÁVEIS**
- **É boa** (com artigo): concorda
- **Meio** adjetivo (metade): concorda → meia hora
- **Meio** advérbio (um pouco): INVARIÁVEL → meio cansada
- **Bastante** adjetivo (muitos): concorda → bastantes matérias
- **Bastante** advérbio (muito): INVARIÁVEL → bastante inteligente
- **Menos**: SEMPRE invariável (NÃO "menas")

### Pegadinhas Cebraspe
- "Houveram pessoas" ERRADO → "Houve pessoas"
- "Fazem 10 anos" ERRADO → "Faz 10 anos"
- "Menos pessoas" CERTO; "Menas pessoas" ERRADO
- "Verdura é bom" CERTO (sem artigo, invariável)
- "Meia da noite" CERTO; "Meio cansada" CERTO
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- INFO — Office (Word, Excel, PowerPoint)
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'informatica',
  'Edição de Textos, Planilhas e Apresentações (Microsoft Office e LibreOffice)',
  'Microsoft Office e LibreOffice',
  $md$
# Microsoft Office e LibreOffice

Bloco de **alta cobrança** em Cebraspe. Cobra atalhos, fórmulas Excel e diferenças entre suites.

## Microsoft Word

### Atalhos essenciais
- **Ctrl + B**: Negrito (Bold)
- **Ctrl + I**: Itálico
- **Ctrl + U**: Sublinhado (Underline)
- **Ctrl + C / X / V**: Copiar / Recortar / Colar
- **Ctrl + Z / Y**: Desfazer / Refazer
- **Ctrl + A**: Selecionar tudo
- **Ctrl + F**: Localizar
- **Ctrl + H**: Substituir
- **Ctrl + L**: Alinhar à Esquerda
- **Ctrl + E**: Centralizar
- **Ctrl + R**: Alinhar à Direita
- **Ctrl + J**: Justificar
- **Ctrl + N**: Novo documento (em PT-BR)
- **Ctrl + S**: Salvar
- **Ctrl + P**: Imprimir
- **F7**: Verificar ortografia
- **F12**: Salvar como
- **Shift + F3**: Alterna maiúsculas/minúsculas

### Extensões
- **.docx**: padrão Word 2007+
- **.doc**: Word 97-2003
- **.dotx**: modelo
- **.pdf**: exportação

## Microsoft Excel

### Atalhos
- **F2**: Editar célula
- **Ctrl + ;**: Insere data atual
- **Ctrl + Shift + ;**: Insere hora atual
- **Alt + =**: Auto-soma
- **Ctrl + 1**: Formatar células
- **Ctrl + Page Up/Down**: Navegar entre planilhas

### Referências
- **A1**: relativa (muda ao copiar)
- **$A$1**: absoluta (não muda)
- **$A1**: mista (coluna fixa, linha muda)
- **A$1**: mista (linha fixa, coluna muda)

### Fórmulas Essenciais

**Matemáticas:**
- `=SOMA(A1:A10)` → soma intervalo
- `=MÉDIA(A1:A10)` → média
- `=MÁXIMO(A1:A10)` → maior valor
- `=MÍNIMO(A1:A10)` → menor valor
- `=CONT.NÚM(A1:A10)` → conta números
- `=CONT.VALORES(A1:A10)` → conta não vazios
- `=CONT.SE(A1:A10;">5")` → conta com condição
- `=SOMASE(A1:A10;">5";B1:B10)` → soma com condição

**Lógicas:**
- `=SE(A1>5;"Aprovado";"Reprovado")` → se-então
- `=E(A1>5;B1<10)` → e (todas verdadeiras)
- `=OU(A1>5;B1<10)` → ou (pelo menos uma)
- `=SE.ERRO(A1/B1;"Erro")` → trata erro

**Texto:**
- `=CONCATENAR(A1;" ";B1)` ou `=A1 & " " & B1` → junta
- `=ESQUERDA(A1;3)` → primeiros 3 caracteres
- `=DIREITA(A1;3)` → últimos 3 caracteres
- `=MAIÚSCULA(A1)` → MAIÚSCULAS
- `=MINÚSCULA(A1)` → minúsculas
- `=NÚM.CARACT(A1)` → comprimento

**Procura:**
- `=PROCV(valor;tabela;col;0)` → busca vertical (exato = 0)
- `=ÍNDICE(tabela;lin;col)` → retorna por linha/coluna
- `=CORRESP(valor;intervalo;0)` → posição

### Erros do Excel
- **#DIV/0!**: divisão por zero
- **#N/D**: valor não encontrado (PROCV)
- **#REF!**: referência inválida
- **#NOME?**: nome de fórmula errado
- **#VALOR!**: tipo errado de argumento
- **#NÚM!**: número inválido

## PowerPoint

### Atalhos
- **F5**: Apresentação do início
- **Shift + F5**: Apresentação do slide atual
- **Esc**: Sai da apresentação
- **B**: Tela preta durante apresentação
- **W**: Tela branca
- **Ctrl + M**: Novo slide

### Extensões
- **.pptx**: padrão
- **.pps/ppsx**: apresentação direta (autorun)

## LibreOffice (alternativa gratuita)

Equivalências:
| Microsoft | LibreOffice |
|---|---|
| Word | Writer (.odt) |
| Excel | Calc (.ods) |
| PowerPoint | Impress (.odp) |
| Outlook | (sem direto) |
| Access | Base (.odb) |

### Compatibilidade
- LibreOffice ABRE arquivos .docx, .xlsx, .pptx
- Pode salvar nesses formatos
- Mas: formatação complexa pode quebrar

## Como cai na Cebraspe

**Item 1 (CERTO):** "No Microsoft Excel, a fórmula =SOMASE(A1:A10;'>10';B1:B10) soma os valores correspondentes em B quando os valores em A são maiores que 10."

**Item 2 (ERRADO):** "No Microsoft Word, o atalho Ctrl+P é utilizado para colar o conteúdo da área de transferência."
> Errado: Ctrl+P imprime. Colar é Ctrl+V.

**Item 3 (CERTO):** "A referência absoluta no Excel, indicada pelo cifrão ($), impede que a referência seja alterada ao copiar a fórmula para outra célula."

**Item 4 (ERRADO):** "O LibreOffice Calc não é capaz de abrir arquivos no formato .xlsx do Microsoft Excel."
> Errado: o Calc abre .xlsx desde versão 3.5.

## Estratégia
- Decore atalhos básicos (Ctrl + letra)
- Fórmulas Excel: SOMA, MÉDIA, CONT.SE, SOMASE, PROCV, SE
- Referências: $A$1 (abs), A1 (relativa), $A1/A$1 (mistas)
- Erros: #DIV/0!, #N/D, #VALOR!, #REF!
- LibreOffice = equivalências: Writer/Calc/Impress
$md$,
  $resumo$
## Resumo — Office

### Word — Atalhos
- **Ctrl + B/I/U**: Negrito/Itálico/Sublinhado
- **Ctrl + C/X/V**: Copiar/Recortar/Colar
- **Ctrl + Z/Y**: Desfazer/Refazer
- **Ctrl + L/E/R/J**: Alinhar Esq/Centro/Dir/Justificar
- **Ctrl + S**: Salvar
- **F7**: Ortografia
- **F12**: Salvar como
- **Shift+F3**: Maiúscula/minúscula

### Excel — Fórmulas Chave
- **SOMA, MÉDIA, MÁXIMO, MÍNIMO, CONT.NÚM, CONT.VALORES**
- **SE(condição; verdadeiro; falso)**
- **CONT.SE / SOMASE**
- **PROCV(valor; tabela; col; 0)** — exato
- **ESQUERDA, DIREITA, CONCATENAR**

### Referências Excel
- **A1**: relativa
- **$A$1**: absoluta
- **$A1 / A$1**: mistas

### Erros Excel
- **#DIV/0!**: divisão por zero
- **#N/D**: PROCV não achou
- **#REF!**: referência inválida
- **#NOME?**: fórmula errada
- **#VALOR!**: tipo errado

### Equivalências LibreOffice
- **Writer** = Word (.odt)
- **Calc** = Excel (.ods)
- **Impress** = PowerPoint (.odp)
- LibreOffice ABRE .docx/.xlsx/.pptx

### Pegadinhas Cebraspe
- Ctrl+P imprime (NÃO cola)
- $A$1 NÃO muda ao copiar (absoluta)
- LibreOffice é COMPATÍVEL com Office
- SOMASE filtra com critério
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- INFO — Segurança da Informação
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'informatica',
  'Segurança da Informação: ataques, malware, criptografia, certificação digital',
  'Segurança da Informação',
  $md$
# Segurança da Informação

Bloco essencial pra concursos da PF, PRF, PCDF. Cebraspe cobra **CID + 3 A's**, **malwares**, **criptografia**, **certificação digital**.

## Pilares da Segurança da Informação

### CID (ou CIA em inglês)
- **C**onfidencialidade: só autorizados acessam
- **I**ntegridade: dados não alterados sem autorização
- **D**isponibilidade: acesso quando necessário

### 3 A's (Triade complementar)
- **A**utenticidade: prova de origem
- **A**utenticação: identifica usuário
- **A**utorização: define permissões
- **A**uditoria/Não-repúdio: rastreamento

## Tipos de Malware

### Vírus
- Precisa de hospedeiro (arquivo, programa)
- Se propaga ao ser EXECUTADO
- Anexa-se a outro código

### Worm (Verme)
- AUTÔNOMO (não precisa hospedeiro)
- Se propaga sozinho pela rede
- Consome banda, lentifica sistemas

### Trojan (Cavalo de Troia)
- Disfarçado de programa legítimo
- NÃO se replica sozinho
- Abre porta pra invasão
- Tipos: backdoor, downloader, banker, dropper

### Spyware
- Espiona atividades do usuário
- Coleta dados (senhas, hábitos)

### Keylogger
- Captura digitação do teclado
- Tipo específico de spyware

### Adware
- Exibe anúncios não solicitados
- Geralmente não é malicioso (mas invasivo)

### Ransomware
- CRIPTOGRAFA dados da vítima
- Exige RESGATE (geralmente bitcoin)
- WannaCry, Petya — casos famosos

### Rootkit
- Esconde sua própria presença
- Ganha privilégios de root/admin
- Difícil de detectar

### Bot/Botnet
- Computador "zumbi"
- Controlado remotamente
- Forma rede pra ataques DDoS

### Phishing
- NÃO é malware tecnicamente
- Engenharia social — fingir ser entidade confiável
- Geralmente por email/SMS

### Pharming
- Redireciona DNS pra site falso
- Mais sofisticado que phishing

## Tipos de Ataque

### DoS (Denial of Service)
- Sobrecarga de requisições
- Tira serviço do ar
- Um único atacante

### DDoS (Distributed DoS)
- Múltiplos atacantes (botnet)
- Volume gigantesco
- Mais difícil de mitigar

### Man-in-the-Middle (MITM)
- Atacante INTERCEPTA comunicação entre 2 partes
- Pode ler/modificar mensagens

### Sniffing
- Captura pacotes de rede
- Útil em redes não criptografadas

### Spoofing
- Falsifica identidade (IP, email, ARP)

### SQL Injection
- Injeta comando SQL em campos de entrada
- Acessa/modifica banco

### XSS (Cross-Site Scripting)
- Injeta script no navegador da vítima

### Brute Force
- Tentativa exaustiva de senhas

### Engenharia Social
- Manipulação psicológica
- Phishing é um tipo

## Criptografia

### Simétrica
- MESMA chave criptografa e descriptografa
- Rápida
- Problema: distribuição segura da chave
- Algoritmos: **AES**, **DES**, **3DES**, **RC4**, **Blowfish**

### Assimétrica (Chave Pública)
- DUAS chaves: pública (criptografa) e privada (descriptografa)
- Mais lenta
- Resolve problema de distribuição
- Algoritmos: **RSA**, **ECC**, **DSA**, **Diffie-Hellman**

### Hash
- Função de mão única (não dá pra descriptografar)
- Verifica integridade
- Algoritmos: **MD5** (inseguro), **SHA-1** (inseguro), **SHA-256**, **SHA-3**

### Como usar na prática
1. Hash gera "impressão digital" do arquivo
2. Compara hash antes/depois → se igual, sem alteração
3. Senhas: hash + salt (anti-rainbow table)

## Certificação Digital

### Conceito
- Documento eletrônico que **identifica** pessoa/empresa
- Garante: **autenticidade** + **integridade** + **não-repúdio**

### ICP-Brasil
- Infraestrutura de Chaves Públicas Brasileira
- Hierarquia: AC-Raiz → AC → AR → Usuário
- **AC** (Autoridade Certificadora): emite certificados (ex: Serpro, Certisign, Soluti)
- **AR** (Autoridade de Registro): valida identidade do solicitante
- AC-Raiz: ITI (Instituto Nacional de Tecnologia da Informação)

### Tipos
- **A1**: arquivo no computador, validade 1 ano
- **A3**: token/cartão, validade 1-5 anos (mais seguro)
- **S1**, **S3**: sigilo (assinatura + criptografia)
- **T3**, **T4**: tempo (datação)

### Assinatura Digital
- Hash do documento + criptografia com chave PRIVADA do emissor
- Verificação: descriptografa com chave PÚBLICA do emissor
- Garante autenticidade + integridade + não-repúdio

## Backup

### Tipos
- **Completo (Full)**: tudo
- **Incremental**: só o que mudou desde o último backup (qualquer tipo)
- **Diferencial**: tudo que mudou desde o último FULL
- **Espelhado**: cópia idêntica em tempo real

### Estratégia 3-2-1
- **3** cópias dos dados
- **2** mídias diferentes
- **1** offsite (fora do local)

## Antivírus e Firewall

### Antivírus
- Detecta/remove malware
- Métodos: assinatura, heurística, comportamental

### Firewall
- Filtra tráfego (regras)
- **Stateful**: rastreia estado das conexões
- **Stateless**: só pacote isolado
- Hardware ou software

## Como cai na Cebraspe

**Item 1 (CERTO):** "O ransomware é um tipo de malware que criptografa os dados da vítima e exige pagamento de resgate, geralmente em criptomoedas, para a liberação."

**Item 2 (ERRADO):** "O worm, diferentemente do vírus, necessita de um hospedeiro para se propagar."
> Errado: INVERTIDO. **Vírus precisa de hospedeiro**, worm é autônomo.

**Item 3 (CERTO):** "Na criptografia assimétrica, uma das chaves é tornada pública, enquanto a outra deve ser mantida em sigilo absoluto."

**Item 4 (ERRADO):** "A função hash é uma criptografia simétrica reversível, permitindo descriptografar a mensagem original."
> Errado: hash é **mão única** (irreversível).

## Estratégia
- Pilares: **CID** + **3 A's**
- Vírus = hospedeiro / Worm = autônomo / Trojan = disfarce
- Simétrica = uma chave (AES, DES) / Assimétrica = par (RSA)
- Hash = mão única (MD5, SHA)
- DoS = 1 atacante / DDoS = muitos
- Backup 3-2-1
$md$,
  $resumo$
## Resumo — Segurança da Informação

### Pilares
- **CID**: Confidencialidade, Integridade, Disponibilidade
- **3 A's**: Autenticidade, Autenticação, Autorização (+ Auditoria/Não-repúdio)

### Malware
- **Vírus**: precisa de hospedeiro
- **Worm**: AUTÔNOMO, propaga sozinho
- **Trojan**: disfarçado, abre backdoor
- **Spyware**: espiona; **Keylogger**: digitação
- **Ransomware**: CRIPTOGRAFA + exige resgate
- **Rootkit**: esconde + privilégios admin
- **Bot/Botnet**: zumbi controlado

### Ataques
- **DoS**: 1 atacante; **DDoS**: muitos (botnet)
- **MITM**: intercepta comunicação
- **Phishing**: engenharia social (email)
- **Pharming**: redireciona DNS
- **SQL Injection**, **XSS**, **Brute Force**, **Spoofing**

### Criptografia
- **Simétrica** (1 chave): AES, DES, 3DES — rápida
- **Assimétrica** (par): RSA, ECC, Diffie-Hellman — lenta, segura
- **Hash** (mão única): MD5 (inseguro), SHA-256

### Certificação Digital (ICP-Brasil)
- AC-Raiz (ITI) → AC → AR → Usuário
- **A1**: arquivo, 1 ano
- **A3**: token/cartão, 1-5 anos (mais seguro)
- Garante: autenticidade + integridade + não-repúdio

### Backup
- **Full / Incremental / Diferencial / Espelhado**
- Regra **3-2-1**: 3 cópias, 2 mídias, 1 offsite

### Pegadinhas Cebraspe
- **Vírus** precisa hospedeiro (NÃO worm)
- **Hash** é IRREVERSÍVEL (mão única)
- **Assimétrica** tem 2 chaves
- **DoS** ≠ DDoS (1 × muitos)
- Phishing ≠ Pharming (e-mail × DNS)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- RL — Lógica Proposicional
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'raciocinio-logico',
  'Lógica proposicional: conectivos, tabela-verdade, equivalências',
  'Lógica Proposicional',
  $md$
# Lógica Proposicional

Tema clássico em RL. Cebraspe cobra **conectivos**, **tabela-verdade**, **equivalências** e **negações**.

## Proposição
- Frase declarativa que pode ser V ou F (NUNCA ambas)
- Exemplos: "Está chovendo." (proposição); "Que dia é hoje?" (NÃO é)

### NÃO são proposições
- Perguntas, exclamações, ordens, frases sem sentido determinado

## Conectivos Lógicos

| Conectivo | Símbolo | Nome | Lê-se |
|---|---|---|---|
| ~ ou ¬ | ¬p | Negação | "não p" |
| ∧ | p ∧ q | Conjunção | "p E q" |
| ∨ | p ∨ q | Disjunção | "p OU q" (inclusiva) |
| ⊕ | p ⊕ q | Disjunção exclusiva | "ou p ou q" |
| → | p → q | Condicional | "se p então q" |
| ↔ | p ↔ q | Bicondicional | "p se e somente se q" |

## Tabela-Verdade dos Conectivos

### Negação (¬p)
| p | ¬p |
|---|---|
| V | F |
| F | V |

### Conjunção (p ∧ q) — "E"
Só é V se AMBOS V.
| p | q | p ∧ q |
|---|---|---|
| V | V | **V** |
| V | F | F |
| F | V | F |
| F | F | F |

### Disjunção (p ∨ q) — "OU" (inclusiva)
Só é F se AMBOS F.
| p | q | p ∨ q |
|---|---|---|
| V | V | V |
| V | F | V |
| F | V | V |
| F | F | **F** |

### Disjunção Exclusiva (p ⊕ q) — "OU... OU..."
V quando EXATAMENTE UM é V.
| p | q | p ⊕ q |
|---|---|---|
| V | V | F |
| V | F | V |
| F | V | V |
| F | F | F |

### Condicional (p → q) — "Se p então q"
**SÓ é F** quando p é V e q é F (V → F).
| p | q | p → q |
|---|---|---|
| V | V | V |
| V | F | **F** |
| F | V | V |
| F | F | V |

### Bicondicional (p ↔ q) — "Se e somente se"
V quando AMBOS iguais.
| p | q | p ↔ q |
|---|---|---|
| V | V | V |
| V | F | F |
| F | V | F |
| F | F | V |

## Equivalências Lógicas (CRÍTICAS)

### Condicional → Disjunção
**p → q ≡ ¬p ∨ q**

Exemplo: "Se chove, então me molho" = "NÃO chove OU me molho"

### Contrapositiva
**p → q ≡ ¬q → ¬p**

Exemplo: "Se chove, então me molho" = "Se NÃO me molho, então NÃO chove"

**⚠️ Pegadinha Cebraspe**: a recíproca (q → p) NÃO é equivalente!

### Bicondicional
**p ↔ q ≡ (p → q) ∧ (q → p)**

### Leis de De Morgan (NEGAÇÃO de conjunção/disjunção)

**¬(p ∧ q) ≡ ¬p ∨ ¬q**
> Negar "p E q" = "não p OU não q"

**¬(p ∨ q) ≡ ¬p ∧ ¬q**
> Negar "p OU q" = "não p E não q"

### Negação da Condicional
**¬(p → q) ≡ p ∧ ¬q**
> Negar "se p então q" = "p E não q"

Exemplo: Negar "Se estudo, passo" = "Estudo E não passo"

### Negação do Bicondicional
**¬(p ↔ q) ≡ p ⊕ q** (disjunção exclusiva)

## Tautologia, Contradição, Contingência

### Tautologia
- SEMPRE V (independente de p, q)
- Exemplo: p ∨ ¬p

### Contradição
- SEMPRE F
- Exemplo: p ∧ ¬p

### Contingência
- Pode ser V ou F dependendo

## Quantificadores

### Universal (∀ — para todo)
- "Todo X é Y"

### Existencial (∃ — existe)
- "Algum X é Y"

### Negações
**¬(∀x P(x)) ≡ ∃x ¬P(x)**
> Negar "todo X é Y" = "existe X que NÃO é Y"

**¬(∃x P(x)) ≡ ∀x ¬P(x)**
> Negar "algum X é Y" = "nenhum X é Y" (todo X não é Y)

### Pegadinha clássica Cebraspe
- "Todos os concurseiros estudam" → negação: "EXISTE concurseiro que NÃO estuda" (NÃO é "nenhum concurseiro estuda")

## Argumento Válido

### Modus Ponens (Afirmando o antecedente)
- Premissa 1: p → q
- Premissa 2: p
- Conclusão: **q** ✅ VÁLIDO

### Modus Tollens (Negando o consequente)
- Premissa 1: p → q
- Premissa 2: ¬q
- Conclusão: **¬p** ✅ VÁLIDO

### Falácias (argumentos INVÁLIDOS)

**Afirmação do consequente** (INVÁLIDA):
- p → q
- q
- ∴ p ❌

**Negação do antecedente** (INVÁLIDA):
- p → q
- ¬p
- ∴ ¬q ❌

## Como cai na Cebraspe

**Item 1 (CERTO):** "A proposição 'Se chove, então não vou ao parque' é equivalente a 'Não chove ou não vou ao parque'."

**Item 2 (ERRADO):** "A negação de 'Todos os alunos estudaram' é 'Nenhum aluno estudou'."
> Errado: negação correta é "EXISTE aluno que NÃO estudou" (algum não estudou).

**Item 3 (CERTO):** "Pela contrapositiva, a proposição 'Se estudo, passo' equivale a 'Se não passo, então não estudo'."

**Item 4 (ERRADO):** "Pela lei de De Morgan, a negação de 'p ∧ q' é '¬p ∧ ¬q'."
> Errado: a negação correta é '¬p ∨ ¬q' (troca conectivo).

## Estratégia
- Decore a tabela-verdade dos 5 conectivos
- Condicional → Disjunção: **p→q ≡ ¬p∨q** (essencial)
- Contrapositiva: **p→q ≡ ¬q→¬p** (NÃO confundir com recíproca)
- De Morgan: negar troca ∧↔∨
- Modus Ponens (válido) ≠ Afirmação do consequente (falácia)
- Quantificadores: ¬todo = existe que não; ¬existe = todo que não
$md$,
  $resumo$
## Resumo — Lógica Proposicional

### Conectivos (Tabela-Verdade)
| | V/V | V/F | F/V | F/F |
|---|---|---|---|---|
| ∧ (E) | V | F | F | F |
| ∨ (OU) | V | V | V | **F** |
| → (se...então) | V | **F** | V | V |
| ↔ (sse) | V | F | F | V |

### Equivalências Críticas
- **p → q ≡ ¬p ∨ q** (condicional → disjunção)
- **p → q ≡ ¬q → ¬p** (contrapositiva)
- **¬(p ∧ q) ≡ ¬p ∨ ¬q** (De Morgan 1)
- **¬(p ∨ q) ≡ ¬p ∧ ¬q** (De Morgan 2)
- **¬(p → q) ≡ p ∧ ¬q** (negação condicional)

### Quantificadores (Negação)
- **¬(∀x P(x)) ≡ ∃x ¬P(x)** — negar "todo" = "existe que não"
- **¬(∃x P(x)) ≡ ∀x ¬P(x)** — negar "algum" = "nenhum/todo não"

### Argumentos Válidos
- **Modus Ponens**: p→q, p ⊢ q ✅
- **Modus Tollens**: p→q, ¬q ⊢ ¬p ✅

### Falácias (INVÁLIDOS)
- Afirmação do consequente: p→q, q ⊢ p ❌
- Negação do antecedente: p→q, ¬p ⊢ ¬q ❌

### Pegadinhas Cebraspe
- Negar "todos" = "EXISTE que não" (NÃO "nenhum")
- Contrapositiva (¬q→¬p) ≠ Recíproca (q→p)
- ¬(p∧q) = ¬p **OU** ¬q (NÃO ¬p ∧ ¬q)
- p→q é V quando p é F (paradoxo material)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DH — Atuação Policial e Direitos Humanos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direitos-humanos',
  'Atuação policial e Direitos Humanos: uso da força, abordagem',
  'Atuação Policial e Direitos Humanos',
  $md$
# Atuação Policial e Direitos Humanos

Tema **CRÍTICO** para PF, PRF, PCDF, PMDF. Cobra **princípios do uso da força**, **abordagem**, **abuso de autoridade**.

## Base Normativa

### Internacional
- **Código de Conduta para Encarregados da Aplicação da Lei** (ONU, 1979)
- **Princípios Básicos sobre o Uso da Força e Armas de Fogo** (ONU, 1990)
- **Regras Mínimas para Tratamento dos Reclusos** (Mandela, 2015)

### Nacional
- **CF/88, Art 5º** (direitos fundamentais)
- **Lei 13.869/2019** (Lei de Abuso de Autoridade — substituiu a 4.898/65)
- **Lei 9.455/97** (Lei de Tortura)
- **Portaria Interministerial 4.226/2010** (Diretrizes sobre uso da força)
- **Súmulas Vinculantes 11 (algemas) e 14 (defesa no IP)**

## Princípios do Uso da Força (Portaria 4.226/2010)

### 1. Princípio da LEGALIDADE
- Uso da força só conforme a LEI
- Decorrência do Art 5º, II CF

### 2. Princípio da NECESSIDADE
- Força só quando ESTRITAMENTE NECESSÁRIA
- Esgotados meios alternativos

### 3. Princípio da PROPORCIONALIDADE
- Força usada deve ser PROPORCIONAL à ameaça
- Mais grave a ameaça → mais grave a resposta admitida

### 4. Princípio da MODERAÇÃO
- Mínimo necessário pra alcançar o objetivo

### 5. Princípio da CONVENIÊNCIA
- Avaliação contextual sobre uso

## Escala (Continuum) do Uso da Força

1. **Presença policial** (uniforme, viatura)
2. **Verbalização** (comandos verbais)
3. **Controle de contato** (mãos vazias)
4. **Técnicas físicas** (chave de braço)
5. **Armas menos letais** (spray, taser, bastão)
6. **Arma de fogo** (último recurso)

### Arma de Fogo — Uso (Art 6º Portaria 4.226)
Apenas quando:
- Risco IMINENTE de morte ou lesão grave
- Impedir crime que envolva ameaça à vida
- Prender pessoa que represente risco
- Outras alternativas inadequadas

### Tiros de Advertência
- **PROIBIDOS** pela Portaria 4.226/2010

## Abordagem Policial

### Pressupostos
- **Fundada suspeita** (Art 244 CPP)
- Não pode ser arbitrária ou discriminatória

### Procedimento
1. Identificação verbal: "Polícia, parado!"
2. Verbalização: explicar razão
3. Busca pessoal (mesmo sexo, regra)
4. Pode haver verificação de objetos (Art 244 CPP)

### O que NÃO PODE
- Discriminação racial (perfilamento ilegal)
- Violência gratuita
- Constrangimento desnecessário
- Algemar sem motivo (SV 11)

## Súmula Vinculante 11 — Algemas

> Só é lícito o uso de algemas em casos de:
> 1. RESISTÊNCIA à prisão
> 2. FUNDADO RECEIO DE FUGA
> 3. PERIGO À INTEGRIDADE física própria ou alheia

### Por escrito
- Necessário JUSTIFICATIVA POR ESCRITO da autoridade
- Sob pena de:
  - Responsabilidade civil, disciplinar, penal do agente
  - Nulidade da prisão/ato processual
  - Indenização à vítima

## Lei de Abuso de Autoridade (Lei 13.869/2019)

### Sujeito ativo
- Agente público — civil, militar, magistrado, MP, todos

### Sujeito passivo
- Sociedade (titularidade difusa)
- Vítima direta concreta

### Elemento subjetivo
- DOLO ESPECÍFICO: prejudicar outrem, beneficiar-se ou a 3º, mero capricho ou satisfação pessoal

### Crimes mais cobrados
- **Art 9º**: Decretar prisão fora hipóteses legais
- **Art 10**: Decretar condução coercitiva antes de intimação
- **Art 13**: Constranger preso/detido a depor
- **Art 15**: Constranger a depor sob ameaça
- **Art 22**: Invadir imóvel alheio
- **Art 28**: Divulgar gravação processual judicial sigilosa
- **Art 33**: Exigir info, bens sem autorização legal

### Penas
- Detenção (geralmente 1-4 anos) + multa
- Perda do cargo (se reincidência por crime contra Adm)
- Inabilitação até 3 anos

## Lei de Tortura (Lei 9.455/97)

### Conduta
- Submeter pessoa sob guarda/poder/autoridade a sofrimento físico/mental
- Para fim de: obter info/declaração, em razão de discriminação, aplicar castigo pessoal

### Pena
- Reclusão 2 a 8 anos
- **HEDIONDO** (Art 5º, XLIII CF)
- IMPRESCRITÍVEL e INAFIANÇÁVEL

## Como cai na Cebraspe

**Item 1 (CERTO):** "Conforme entendimento do STF, o uso de algemas deve ser justificado por escrito pela autoridade competente nos casos de resistência, fundado receio de fuga ou perigo à integridade física."

**Item 2 (ERRADO):** "Os tiros de advertência são autorizados pela Portaria Interministerial 4.226/2010 como recurso intermediário entre técnicas físicas e o disparo letal."
> Errado: tiros de advertência são **PROIBIDOS** pela Portaria.

**Item 3 (CERTO):** "Pelo princípio da proporcionalidade, o nível de força empregado pela polícia deve guardar relação direta com o nível da ameaça enfrentada."

**Item 4 (ERRADO):** "A Lei 13.869/2019 (Abuso de Autoridade) admite a punição do agente público por mero erro funcional ou opinião jurídica controvertida."
> Errado: a lei exige DOLO ESPECÍFICO; mera divergência interpretativa NÃO configura crime.

## Estratégia
- Princípios do uso da força: **LE-NE-PRO-MO-CO** (Legalidade, Necessidade, Proporcionalidade, Moderação, Conveniência)
- Continuum do uso: 6 níveis (presença → arma de fogo)
- Tiros de advertência: PROIBIDOS
- Algemas: SV 11 — 3 hipóteses + justificativa por escrito
- Abuso de Autoridade: dolo específico (não basta culpa)
$md$,
  $resumo$
## Resumo — Atuação Policial e DH

### Base Normativa
- **Internacional**: Código ONU (1979), Princípios Uso de Força (1990), Mandela (2015)
- **Nacional**: Lei 13.869/19 (Abuso de Autoridade), Lei 9.455/97 (Tortura), Portaria 4.226/10

### Princípios do Uso da Força
1. **L**egalidade
2. **N**ecessidade
3. **P**roporcionalidade
4. **M**oderação
5. **C**onveniência

### Continuum do Uso da Força (6 níveis)
1. Presença policial
2. Verbalização
3. Controle de contato
4. Técnicas físicas
5. Armas menos letais
6. **Arma de fogo** (último recurso)

### Tiros de Advertência
**PROIBIDOS** (Portaria 4.226/10)

### Algemas — SV 11
- Resistência à prisão
- Fundado receio de fuga
- Perigo à integridade física
- JUSTIFICATIVA POR ESCRITO obrigatória

### Abuso de Autoridade (Lei 13.869/19)
- **Dolo específico** (prejudicar, beneficiar-se, capricho)
- Mero erro funcional NÃO é crime
- Crimes principais: Art 9º (prisão fora hipótese), Art 13 (constrange preso), Art 22 (invasão)
- Pena: detenção 1-4 anos + perda cargo + inabilitação

### Tortura (Lei 9.455/97)
- Reclusão 2-8 anos
- **HEDIONDO**, IMPRESCRITÍVEL, INAFIANÇÁVEL
- CF Art 5º, XLIII

### Pegadinhas Cebraspe
- Tiros de advertência **PROIBIDOS**
- Algemas exigem justificativa **POR ESCRITO**
- Abuso de Autoridade requer **DOLO ESPECÍFICO**
- Tortura = HEDIONDO + imprescritível
- Continuum: 6 níveis (NÃO 5)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- LP — Sintaxe da Oração e do Período
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'lingua-portuguesa',
  'Sintaxe da oração e do período',
  'Sintaxe da Oração e do Período',
  $md$
# Sintaxe da Oração e do Período

Tema central de LP em Cebraspe. Cobra **termos da oração**, **período composto** e **subordinação**.

## Termos da Oração

### Termos Essenciais
1. **Sujeito**: de quem se fala
2. **Predicado**: o que se fala do sujeito

### Termos Integrantes
1. **Complemento Verbal** (OD, OI)
2. **Complemento Nominal**
3. **Agente da Passiva**

### Termos Acessórios
1. **Adjunto Adnominal**
2. **Adjunto Adverbial**
3. **Aposto**

### Termo Independente
- **Vocativo**

## Sujeito — Classificação

### Determinado
- **Simples**: 1 núcleo. "**João** estuda."
- **Composto**: 2+ núcleos. "**João e Maria** estudam."
- **Oculto/desinencial**: identificado pela desinência. "**Estudo** muito." (eu)

### Indeterminado
- Não pode/quer-se identificar. 2 formas:
  - **Verbo na 3ª pl** sem referente: "**Falaram** mal de você."
  - **Verbo + SE** (verbos transitivos indiretos): "**Precisa-se** de funcionários."

### Inexistente (Oração sem sujeito)
- Verbos impessoais:
  - **Haver** (existir): "**Há** problemas."
  - **Fazer** (tempo): "**Faz** 10 anos."
  - Fenômenos naturais: "**Chove** muito."

## Predicado — Classificação

### Predicado Verbal
- Núcleo é VERBO
- "Maria **estudou** muito."

### Predicado Nominal
- Núcleo é NOME (predicativo do sujeito)
- Verbo de ligação: ser, estar, parecer, ficar, continuar, permanecer
- "Maria **é** **inteligente**." (predicativo)

### Predicado Verbo-Nominal
- 2 núcleos: VERBO + NOME
- "Maria **chegou** **cansada**." (predicativo + ação)

## Complementos Verbais

### Objeto Direto (OD)
- Sem preposição obrigatória
- Responde "o quê? quem?"
- "Comprei **o livro**."

### Objeto Indireto (OI)
- COM preposição obrigatória
- "Gosto **de música**."

### Objeto Direto Preposicionado
- OD que recebe preposição POR ÊNFASE/EVITAR AMBIGUIDADE
- "Amo **a Deus**." (= "amo Deus")

### Objeto Pleonástico
- Repetição enfática com pronome
- "**O livro**, comprei-**o** ontem."

## Complemento Nominal vs Adjunto Adnominal

### Complemento Nominal (CN)
- Completa SENTIDO de **substantivo abstrato**, adjetivo ou advérbio
- Tem PREPOSIÇÃO
- Sentido PASSIVO (sofre a ação)
- "Tenho amor **a Deus**." (CN — abstrato + preposição)

### Adjunto Adnominal (AdjAdn)
- Modifica/qualifica SUBSTANTIVO concreto
- Sentido ATIVO (pratica a ação)
- "O livro **de João**." (de quem é → AdjAdn)

### Pegadinha clássica
- "Construção **da casa**" — pode ser:
  - CN se "casa" sofre a ação (a casa foi construída)
  - AdjAdn se "casa" é quem constrói (raro)

## Adjuntos

### Adjunto Adnominal
- Artigo, numeral, pronome adjetivo, adjetivo, locução adjetiva
- "**O meu primeiro** professor **de inglês**."

### Adjunto Adverbial
- Modifica VERBO, ADJETIVO ou OUTRO ADVÉRBIO
- Tipos: tempo, lugar, modo, intensidade, causa, finalidade, instrumento, meio, etc.

## Aposto vs Vocativo

### Aposto
- EXPLICA outro termo da oração
- Pode estar entre vírgulas
- "Pedro, **o professor**, chegou."

### Vocativo
- INVOCA, CHAMA
- Independente da oração
- "**Pedro**, vem cá!"

## Período Composto

### Por Coordenação
- Orações INDEPENDENTES
- Conectadas por conjunções coordenativas

### Tipos de Conjunções Coordenativas
- **Aditiva**: e, nem, mas também
- **Adversativa**: mas, porém, contudo, todavia, entretanto
- **Alternativa**: ou, ou...ou, ora...ora
- **Conclusiva**: logo, portanto, por isso, assim
- **Explicativa**: pois, porque, que (justifica)

### Por Subordinação
- Oração SUBORDINADA depende de uma PRINCIPAL

### Tipos de Subordinadas

#### Substantivas
Exercem função de substantivo. Tipos:
- **Subjetiva**: faz papel de sujeito. "É importante **que você estude**."
- **Objetiva direta**: OD. "Quero **que você venha**."
- **Objetiva indireta**: OI. "Preciso **de que você venha**."
- **Completiva nominal**: CN. "Tenho necessidade **de que você venha**."
- **Predicativa**: predicativo. "Minha esperança é **que você venha**."
- **Apositiva**: aposto. "Quero uma coisa: **que você venha**."

#### Adjetivas
Função de adjetivo (modifica substantivo). Tipos:
- **Restritiva**: especifica, sem vírgulas. "Alunos **que estudam** passam."
- **Explicativa**: explica, COM vírgulas. "Os alunos, **que estudam**, passam."

#### Adverbiais
Função de advérbio. Tipos:
- **Causal**: porque, como, visto que, já que
- **Comparativa**: como, tal qual, do que
- **Concessiva**: embora, conquanto, ainda que, mesmo que
- **Condicional**: se, caso, contanto que
- **Conformativa**: conforme, segundo, como
- **Consecutiva**: tal/tanto/tão... que
- **Final**: a fim de que, para que
- **Proporcional**: à medida que, à proporção que
- **Temporal**: quando, enquanto, assim que, logo que

## Como cai na Cebraspe

**Item 1 (CERTO):** "Em 'Há muitas pessoas na sala', a oração é sem sujeito, pois o verbo 'haver' é impessoal no sentido de existir."

**Item 2 (ERRADO):** "Em 'Maria comprou um livro', a expressão 'um livro' funciona como objeto indireto do verbo comprar."
> Errado: "comprar" é transitivo direto, "um livro" é OD (sem preposição).

**Item 3 (CERTO):** "Em 'Os alunos que estudaram passaram', a oração 'que estudaram' é subordinada adjetiva restritiva, sem vírgulas."

**Item 4 (ERRADO):** "Em 'Embora chova, sairei', a oração subordinada classifica-se como adverbial condicional."
> Errado: "embora" introduz oração CONCESSIVA.

## Estratégia
- Sujeito: determinado (S/C/oculto), indeterminado, inexistente
- Predicado: verbal, nominal, verbo-nominal
- CN x AdjAdn: abstrato + preposição (CN); concreto modificado (AdjAdn)
- Adjetivas: RESTRITIVA (sem vírgula) × EXPLICATIVA (com vírgula)
- Adverbiais: decore as 9 conjunções (especialmente concessivas EMBORA)
$md$,
  $resumo$
## Resumo — Sintaxe

### Termos da Oração
- **Essenciais**: Sujeito + Predicado
- **Integrantes**: OD, OI, CN, Agente Passiva
- **Acessórios**: AdjAdn, AdjAdv, Aposto
- **Independente**: Vocativo

### Sujeito
- **Determinado**: simples, composto, oculto
- **Indeterminado**: 3ª pl sem referente / verbo + SE
- **Inexistente**: HAVER (existir), FAZER (tempo), fenômenos

### Predicado
- **Verbal**: núcleo verbo
- **Nominal**: núcleo nome + verbo de ligação (ser/estar/parecer)
- **Verbo-Nominal**: 2 núcleos

### CN x Adjunto Adnominal
- **CN**: completa abstrato + tem preposição + sentido passivo
- **AdjAdn**: modifica concreto + sentido ativo

### Conjunções Coordenativas
- Aditiva (e, nem), Adversativa (mas, porém)
- Alternativa (ou), Conclusiva (logo), Explicativa (pois)

### Subordinadas
- **Substantivas**: subjetiva, OD, OI, CN, predicativa, apositiva
- **Adjetivas**: RESTRITIVA (sem vírgula) x EXPLICATIVA (com vírgula)
- **Adverbiais**: causal, comparativa, **concessiva (embora)**, condicional, conformativa, consecutiva, final, proporcional, temporal

### Pegadinhas Cebraspe
- "Haver" (existir) = SEM SUJEITO
- Restritiva NÃO leva vírgula; explicativa SIM
- "Embora" = CONCESSIVA (NÃO condicional)
- CN tem preposição + sentido passivo
- "Maria é inteligente" = predicado NOMINAL
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- DH — Conceito e Fundamentos dos Direitos Humanos
-- ──────────────────────────────────────────────────────────────────────────
SELECT upsert_material(
  'direitos-humanos',
  'Conceito, fundamentos e características dos Direitos Humanos',
  'Conceito e Características dos Direitos Humanos',
  $md$
# Conceito, Fundamentos e Características dos Direitos Humanos

Bloco introdutório, mas com **alta cobrança**. Cebraspe ama características dos DH e dimensões (gerações).

## Conceito

**Direitos Humanos** são o conjunto de direitos básicos, mínimos, inerentes à condição humana, sem os quais a vida com dignidade é inviável. Reconhecidos no **plano internacional**.

### Distinções importantes

| Direitos Humanos | Direitos Fundamentais |
|---|---|
| Plano INTERNACIONAL | Plano CONSTITUCIONAL |
| Tratados, declarações ONU | Constituição de cada Estado |
| DUDH (1948) | CF/88 (Art 5º+) |

- Os mesmos direitos podem ser "humanos" no plano internacional e "fundamentais" quando inscritos na CF.

## Fundamentação Filosófica

### Jusnaturalismo
- Direitos NATURAIS, inerentes ao ser humano
- Independem de reconhecimento estatal
- Tomás de Aquino, John Locke

### Positivismo
- Direitos só existem se POSITIVADOS em norma
- Hans Kelsen
- Crítica: levou a abusos (regimes legalmente autoritários)

### Pós-Positivismo (corrente atual)
- Combina norma + princípios
- DH são positivados MAS têm carga moral suprapositiva
- Robert Alexy, Ronald Dworkin

## Características dos Direitos Humanos (MEMORIZE)

### 1. UNIVERSALIDADE
- Aplicáveis a TODOS os seres humanos
- Independem de raça, sexo, religião, nacionalidade

### 2. INERÊNCIA
- Inerentes à condição humana
- Não dependem de concessão estatal

### 3. HISTORICIDADE
- Construídos HISTORICAMENTE
- Evoluem com a sociedade
- Geram novas dimensões/gerações

### 4. INALIENABILIDADE
- Não podem ser TRANSFERIDOS, VENDIDOS, CEDIDOS

### 5. IRRENUNCIABILIDADE
- Não podem ser RENUNCIADOS pelo titular
- O exercício pode não ser feito, mas a titularidade NÃO se perde

### 6. IMPRESCRITIBILIDADE
- NÃO se perdem pelo decurso do tempo

### 7. INTERDEPENDÊNCIA e INDIVISIBILIDADE
- Conjunto interligado (civis, políticos, sociais)
- Não se pode garantir um sem garantir os outros
- Princípio da indivisibilidade reforçado em Viena (1993)

### 8. CONCORRENTES
- Podem ser exercidos SIMULTANEAMENTE

### 9. RELATIVIDADE/LIMITABILIDADE
- Nenhum direito é ABSOLUTO
- Podem ser RESTRINGIDOS em colisão com outros
- Princípio da proporcionalidade

### 10. EFETIVIDADE
- Estado deve adotar medidas para sua plena realização

## Dimensões (Gerações) dos Direitos Humanos

### Atenção pedagógica
- "Gerações" sugere superação, "dimensões" sugere acumulação. A doutrina atual prefere **DIMENSÕES**.

### 1ª Dimensão — LIBERDADE
- **Direitos CIVIS e POLÍTICOS**
- Característica: defesa contra ESTADO (não-intervenção)
- Marco histórico: Revolução Francesa (1789), Declaração de Independência EUA (1776)
- Exemplos: vida, liberdade, propriedade, voto, devido processo legal

### 2ª Dimensão — IGUALDADE
- **Direitos SOCIAIS, ECONÔMICOS e CULTURAIS**
- Característica: PRESTAÇÃO POSITIVA do Estado
- Marco: Constituição Mexicana (1917), Constituição de Weimar (1919)
- Exemplos: saúde, educação, trabalho, moradia, previdência

### 3ª Dimensão — FRATERNIDADE/SOLIDARIEDADE
- **Direitos COLETIVOS e DIFUSOS**
- Característica: titularidade COLETIVA, transindividual
- Marco: pós-2ª Guerra
- Exemplos: meio ambiente, paz, autodeterminação dos povos, desenvolvimento

### 4ª Dimensão (controvertida — Bonavides)
- BIOÉTICA, DEMOCRACIA DIRETA, INFORMAÇÃO
- Exemplos: direito à informação, manipulação genética, biossegurança

### 5ª Dimensão (Bonavides)
- DIREITO À PAZ (universalização)

### 6ª Dimensão (alguns autores)
- ÁGUA POTÁVEL

## Princípios Fundamentais (Viena, 1993)

### Conferência Mundial de Viena
- Reafirmou: **universalidade**, **indivisibilidade**, **interdependência** e **inter-relação** dos DH

### Tese de Viena
> "Todos os direitos humanos são universais, indivisíveis, interdependentes e inter-relacionados"

## Estado, Soberania e Direitos Humanos

### Mitigação da Soberania
- DH limitam a soberania
- Tribunais internacionais podem responsabilizar Estados
- Ex.: Corte Interamericana de DH

### Brasil e o Pacto de San José
- Aderiu em 1992
- Reconhece jurisdição obrigatória da Corte IDH (1998)

## Como cai na Cebraspe

**Item 1 (CERTO):** "A universalidade é uma das características essenciais dos direitos humanos, segundo a qual esses direitos pertencem a todos os seres humanos, independentemente de qualquer condição."

**Item 2 (ERRADO):** "Os direitos humanos têm caráter absoluto, não podendo ser relativizados sob nenhuma circunstância."
> Errado: nenhum direito é absoluto (princípio da relatividade/limitabilidade).

**Item 3 (CERTO):** "Os direitos humanos de primeira dimensão estão associados à liberdade, surgiram com as revoluções liberais e impõem ao Estado uma postura de não-intervenção."

**Item 4 (ERRADO):** "A Constituição Federal de 1988 trata dos direitos humanos, enquanto os tratados internacionais regulam os direitos fundamentais."
> Errado: INVERTIDO. **DH no plano internacional; DFundamentais na CF.**

## Súmulas e Jurisprudência
- **STF, RE 466.343**: tratados de DH não aprovados pelo §3º do Art 5º têm status SUPRALEGAL (Pacto de San José)
- **STF, ADPF 153**: Lei de Anistia (interpretação compatível com DH)

## Estratégia
- Memorize características (U-I-H-I-I-I-I-C-R-E)
- 3 primeiras dimensões: liberdade (civil/político), igualdade (social), fraternidade (difuso/coletivo)
- Brasil aderiu a Pacto San José em 1992
- DH ≠ DFundamentais (plano internacional × constitucional)
- Status dos tratados DH: §3º Art 5º (EC) ou supralegal
$md$,
  $resumo$
## Resumo — Conceito de DH

### DH x DFundamentais
| DH | DF |
|---|---|
| Plano INTERNACIONAL | Plano CONSTITUCIONAL |
| DUDH, tratados | CF/88, Art 5º+ |

### Características (UNI-IN-HI-IN-IR-IM)
- **UNI**versalidade
- **IN**erência
- **HI**storicidade
- **IN**alienabilidade
- **IR**renunciabilidade
- **IM**prescritibilidade
- Interdependência/Indivisibilidade
- Concorrentes
- **Relatividade** (nenhum absoluto)
- Efetividade

### Dimensões (Gerações)
- **1ª — LIBERDADE**: civis/políticos (Rev. Francesa 1789) — defesa contra Estado
- **2ª — IGUALDADE**: sociais/econômicos/culturais (Const Mexicana 1917, Weimar 1919) — prestação positiva
- **3ª — FRATERNIDADE**: coletivos/difusos (pós-2ª Guerra) — meio ambiente, paz, autodeterminação
- **4ª** (Bonavides): bioética, democracia direta, informação
- **5ª**: paz
- **6ª**: água potável

### Conferência de Viena (1993)
**Universalidade + Indivisibilidade + Interdependência + Inter-relação**

### Status dos Tratados DH (STF)
- Aprovados pelo §3º Art 5º (3/5 + 2 turnos) = **EMENDA CONSTITUCIONAL**
- Sem isso = **SUPRALEGAL** (acima da lei, abaixo da CF — RE 466.343)

### Brasil
- Aderiu Pacto San José 1992
- Reconhece Corte IDH 1998

### Pegadinhas Cebraspe
- Nenhum direito é ABSOLUTO
- DH (internacional) ≠ DF (constitucional)
- 1ª dimensão = Liberdade (NÃO igualdade)
- Tratado DH sem §3º = SUPRALEGAL (não EC)
- Indivisibilidade reforçada em Viena (1993)
$resumo$
);

-- ──────────────────────────────────────────────────────────────────────────
-- Verificação
-- ──────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS total_materiais_ai FROM "materials" WHERE origin = 'ai';

DROP FUNCTION IF EXISTS upsert_material(text, text, text, text, text);
