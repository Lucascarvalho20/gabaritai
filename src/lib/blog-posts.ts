/**
 * Catálogo de posts de blog âncora — gerenciados como dados em código
 * por enquanto. Quando crescer, vira tabela Prisma.
 *
 * Cada post tem:
 *  - slug usado na URL
 *  - title, description, keywords (SEO)
 *  - readingMin (estimativa de leitura)
 *  - publishedAt (string ISO date)
 *  - tags
 *  - content (markdown-ish — render simples no /[slug])
 *
 * Estratégia SEO: posts são "âncora" — long-form (1500+ palavras),
 * cobrem palavra-chave alta-intenção do concurseiro, têm CTA pro
 * trial e captura de email no meio + final.
 */

export type BlogPost = {
  slug: string
  title: string
  description: string
  keywords: string[]
  category: string
  readingMin: number
  publishedAt: string // ISO date
  author: string
  tags: string[]
  content: string // markdown
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'como-passar-em-concurso-publico-2026',
    title: 'Como passar em concurso público em 2026 (método honesto, sem milagre)',
    description: 'O passo a passo realista pra quem quer ser aprovado: como escolher o concurso certo, quanto tempo de estudo é razoável, quais 5 erros eliminam 80% dos candidatos antes da prova.',
    keywords: ['como passar em concurso', 'método de estudo concurso', 'estudar para concurso 2026', 'aprovação concurso público', 'cronograma de estudos'],
    category: 'Método',
    readingMin: 12,
    publishedAt: '2026-05-20',
    author: 'Equipe Gabaritai',
    tags: ['método', 'iniciante', 'concurso público'],
    content: `## Por que a maioria não passa (e não é por falta de estudo)

A imagem do concurseiro brasileiro virou um clichê: pessoa estudando 10 horas por dia, dormindo 5, abrindo mão de festa, casamento, viagem — e mesmo assim **não passa**. Não é falta de esforço. É falta de método.

Quem é aprovado em concurso público difícil (PF, PMDF, PCDF, PRF) raramente é quem mais estudou — é quem **estudou certo**. Pessoas que dedicam 3-4 horas por dia consistentemente, mas com plano, passam mais do que pessoas que estudam 8 horas sem direção. Esse post é sobre como fazer parte do primeiro grupo.

## 1. Escolha o concurso certo antes de qualquer coisa

Antes de comprar curso, abrir caderno ou montar cronograma: **escolha o concurso**. Não o "concurso dos sonhos" — o que tem maior probabilidade real de aprovação pra você, dados:

- **Tempo até a prova**: prova daqui a 60 dias com 0 base é roleta. Prova daqui a 8 meses com base intermediária é cenário ideal.
- **Sua escolaridade atual**: PF Delegado exige superior em Direito. PMDF Soldado exige só ensino médio. Não tente atravessar o caminho mais longo se o curto serve.
- **Banca**: Cebraspe (PMDF, PF, PCDF) penaliza errado, exige raciocínio mais lento. FGV (TRT, TJ) é objetiva, agressiva. FCC/VUNESP mais didáticas. Identifique qual estilo de banca casa com seu cérebro.
- **Concorrência real**: PF Agente tem 800 candidatos por vaga. PRF tem 200. PMDF Soldado tem 60. Quanto menor a relação candidato/vaga, maior sua margem.

> **Atalho prático:** se você está começando do zero e quer maximizar chance de passar nos próximos 12 meses, considere concursos estaduais (PM, PC) de cargos médios. Salário menor que o federal, sim — mas é o trampolim. Aprovado em médio, depois você vai pro federal.

## 2. O edital é seu mapa. Tudo que sai dele é distração.

90% dos concurseiros começam estudando matéria genérica: "vou estudar Direito Constitucional do zero, comprando aula no YouTube". Erro. **Pega o edital ATIVO do concurso que escolheu** e olha:

- Quantas matérias?
- Peso de cada uma (% das questões)?
- Quais ASSUNTOS dentro de cada matéria (geralmente o edital lista 30-80 tópicos por matéria)?

Esse documento é o seu chefe. Tudo que está nele você estuda; tudo que NÃO está, ignora — mesmo que o YouTuber diga que cai. **Ele não está fazendo a sua prova. O edital está.**

## 3. Distribua tempo por peso, não por preferência

Aqui é onde a maioria erra. Pessoa gosta de Direito Penal, então estuda 4 dias por semana de Direito Penal. Mas Direito Penal cai 12% da prova. Português cai 25%. **Resultado**: a pessoa fica craque em algo que decide 14 questões e fraca em algo que decide 30.

A matemática simples:

\`\`\`
horas_da_matéria_X = (peso_da_matéria_X / soma_total_dos_pesos) × horas_disponíveis
\`\`\`

Se você tem 21h/semana e Direito Constitucional tem peso 4 numa soma total de 20:

> Direito Constitucional = (4/20) × 21 = 4.2h/semana

Faz isso pra cada matéria. **Esse é seu cronograma**. Não é negociável. Não é "vou ver no que dá tempo". É exatamente isso aqui, toda semana.

## 4. Revisão > matéria nova

A descoberta que vira o jogo: você esquece **80% do que estuda em 7 dias** se não revisar. Estudar matéria nova sem revisar é encher um balde furado.

A solução tem nome científico: **repetição espaçada**. Você revê o conteúdo no momento exato em que ESTÁ prestes a esquecer. Não antes (perda de tempo), não depois (perdeu).

Na prática:

- Aprendeu hoje → revê amanhã (1d)
- Revê em 3 dias
- Revê em 7 dias
- Revê em 21 dias
- Revê em 60 dias

Pra cada conteúdo. Pra cada artigo de lei. Pra cada princípio constitucional. Esse é o algoritmo SM-2 (base do Anki, base do Gabaritai). Quem usa, passa. Quem ignora, esquece e refaz do zero.

## 5. Simulado é treino, não é teste

Concurseiro tem essa mania: estuda 3 meses, faz UM simulado pra "ver como tá", e quando vai mal, fica deprimido por uma semana.

Errado. Simulado é **treino semanal**. Não é prova final. Toda semana você faz pelo menos:

- 2 mini-simulados (terça, quinta) — 20 questões cada, 30 min
- 1 simulado real (domingo) — 80-120 questões, no tempo total da prova, no formato exato da banca

O objetivo não é ir bem. **O objetivo é detectar onde você é fraco**. Quando errou Direito Penal Crimes contra o Patrimônio 3 vezes em 2 semanas, isso vira foco da semana seguinte. O simulado é o sensor do plano.

## Os 5 erros que eliminam 80% dos candidatos

Em ordem de gravidade:

1. **Não ter cronograma escrito**. "Eu sei o que tenho que fazer" não é cronograma. Cronograma é uma planilha (ou software) com **dia, horário, matéria, conteúdo específico**. Quem não tem, perde 30 min por dia decidindo o que estudar.
2. **Estudar sem revisar**. Tratamos acima. O segundo maior buraco do balde.
3. **Pular simulado**. "Vou fazer quando estiver pronto." Você nunca vai estar pronto. Faz simulado mal, mas faz.
4. **Trocar de concurso a cada edital novo**. Concurseiro vê edital sair, larga o que estava preparando e parte pro novo. Resultado: 3 anos depois, está num eterno início de 60 dias. Foco em UM até passar.
5. **Estudar 8h/dia em 2 dias, 0 nos outros 5**. Consistência ganha de intensidade. 3h/dia, 6 dias por semana, durante 6 meses, é matemática vencedora. 10h em 2 dias e largar é receita pra burnout.

## O que o Gabaritai faz por você nesse caminho

Honestidade primeiro: nenhum software substitui o seu esforço. O que a gente faz:

- Lê o edital ATIVO do seu concurso e monta o cronograma com o peso correto.
- Aplica a repetição espaçada automaticamente — você só clica "fácil" ou "difícil" no flashcard.
- Gera simulado semanal no formato exato da banca (Cebraspe certo/errado com penalização, FGV múltipla, etc).
- Quando você erra muito uma matéria, o cronograma da próxima semana puxa mais horas pra ela. Sem você precisar pensar.
- Mentor responde dúvidas 24h, com contexto do SEU progresso (não chatbot genérico).

3 dias grátis. Sem cartão. Se não servir, sai sem dever nada. Se servir, te economiza 6 meses de tentativa-e-erro montando plano sozinho.

---

**Próximo passo prático**: pega seu edital, abre uma planilha e calcula a distribuição de horas conforme item 3. Ou usa o nosso e a gente faz isso pra você em 5 minutos.`,
  },

  {
    slug: 'cebraspe-vs-fgv-vs-fcc-como-cada-banca-pensa',
    title: 'Cebraspe vs FGV vs FCC: como cada banca pensa (e como adaptar seu estudo)',
    description: 'Cada banca tem um DNA. Quem estuda pra Cebraspe do mesmo jeito que estuda pra FGV erra a estratégia. Análise das 3 principais bancas brasileiras: estilo de questão, armadilhas favoritas e como se preparar pra cada uma.',
    keywords: ['Cebraspe', 'FGV', 'FCC', 'banca de concurso', 'estilo de questão Cebraspe', 'certo ou errado', 'múltipla escolha FGV'],
    category: 'Bancas',
    readingMin: 10,
    publishedAt: '2026-05-15',
    author: 'Equipe Gabaritai',
    tags: ['bancas', 'estratégia', 'Cebraspe', 'FGV', 'FCC'],
    content: `## Não existe "estudar pra concurso" genérico

Existe estudar pra Cebraspe. Estudar pra FGV. Estudar pra FCC. **São coisas diferentes** — não apenas no formato (certo/errado vs múltipla), mas no jeito de pensar.

Quem entende isso já está à frente de 70% dos candidatos. Esse post detalha as 3 principais bancas brasileiras.

## Cebraspe (CESPE) — a banca que penaliza pressa

**Quem faz**: PF, PMDF, PCDF, PRF, TJDFT, ANP, ABIN, MPU, e a maioria dos concursos federais de alto perfil.

**Formato típico**: questões de **certo ou errado** (cada item é uma afirmação isolada).
**Regra da casa**: 1 errada anula 1 certa. Isso é fundamental — chutar errado é PIOR do que deixar em branco.

### DNA da Cebraspe

A Cebraspe não pergunta "qual a melhor resposta". Ela afirma uma coisa e te desafia a julgar se é verdade. Cada afirmação tem **uma palavra-armadilha**:

- "**sempre**" — quase nunca certo. Direito tem exceções.
- "**nunca**" — idem.
- "**exclusivamente**" — quase sempre errado.
- "**será**" / "**deverá**" — verifica se a lei realmente impõe obrigatoriedade.
- Trocar **inclusive** por **exceto** — armadilha clássica.
- Inverter sujeito da ação — "o juiz determina" virou "o promotor determina".

### Como estudar pra Cebraspe

1. **Leia com lupa**. Não tem questão Cebraspe sem armadilha. Cada item tem que ser lido devagar 2 vezes.
2. **Decore literalidade da lei**. Cebraspe ama transcrever artigo de lei trocando UMA palavra. Quem decorou pega na hora.
3. **Aprenda a chutar racionalmente**. Se você tem certeza de 50% das questões, deixe em branco as 50% restantes. Não chute. Chute aleatório te tira pontos.
4. **Treine cronômetro no formato real**. Cebraspe dá ~2 min por item. Velocidade importa.

### Concurseiro Cebraspe é o "advogado do diabo"

Pra cada afirmação que você lê, sua reação automática deveria ser: "será que é VERDADE absoluta? tem exceção? tem situação onde isso não vale?". Se tem, marca errado.

## FGV — a banca que adora pegadinha técnica

**Quem faz**: TRT, TJ-SP, TCE-RJ, TCM-SP, Senado, e muitos tribunais.

**Formato típico**: **múltipla escolha com 5 alternativas (A-E)**. Sem penalização por erro (chute custa zero).

### DNA da FGV

A FGV ama questão técnica detalhada. Não é Cebraspe sutil — é FGV explícita. Vai cobrar o detalhe que ninguém estuda: o inciso IV do parágrafo único do artigo X. A jurisprudência específica do STF de 2019 sobre tema Y.

- **Questão longa**, com texto preparatório. Lê com calma.
- **Alternativas próximas** entre si. Você precisa CONHECER, não chutar por intuição.
- **Jurisprudência recente cai muito**. Decisão do STF/STJ dos últimos 24 meses é prato cheio FGV.
- **Doutrina específica** — autores como Hely Lopes, Celso Bandeira, Maria Sylvia (Direito Administrativo) — FGV cita posicionamento.

### Como estudar pra FGV

1. **Domine a literalidade da lei + jurisprudência recente**. Lei seca + decisões STF/STJ dos últimos 2 anos.
2. **Use bons resumos de doutrina**. Não basta lei seca como na Cebraspe.
3. **Pratique muito**. FGV repete temas. Quem fez 500 questões FGV de Direito Constitucional, conhece os 30 temas favoritos.
4. **Chute esperto**. Sem penalização, você pode chutar 100% das que não souber. Mas chute eliminando alternativas absurdas primeiro.

## FCC / VUNESP / IBFC — a banca da literalidade

**Quem faz**: TJ-SP (FCC), assembleias estaduais (FCC), municípios paulistas (VUNESP), Polícia Civil-SP (VUNESP).

**Formato típico**: múltipla escolha (4 ou 5 alternativas). Sem penalização.

### DNA da FCC

A FCC é a banca mais **literal** que existe. Ela copia o artigo de lei e bota como resposta certa. Sem reinterpretação, sem armadilha sutil. Quem decorou lei seca tira nota máxima.

- Questão objetiva, direta.
- Alternativas claras (uma certa, outras claramente erradas).
- Quase nenhuma jurisprudência (diferente da FGV).
- Resposta certa é literalmente o artigo da lei.

### Como estudar pra FCC

1. **Lei seca, lei seca, lei seca**. Não tem segredo.
2. **Faça questões anteriores em massa**. FCC tem um banco gigante, e ela repete estilo.
3. **Não inverta no chute**. Se não sabe, vai na que mais soa "lei". A FCC é honesta.

## Tabela comparativa

| Aspecto | Cebraspe | FGV | FCC |
|---|---|---|---|
| Formato | Certo/Errado | ME 5 alt. | ME 4-5 alt. |
| Penaliza erro? | Sim (1×1) | Não | Não |
| Estilo | Sutil, armadilha de palavra | Detalhe técnico | Literal |
| Jurisprudência | Pouca | Muita | Quase nada |
| Doutrina | Quase nada | Muito | Pouca |
| Velocidade | ~2min/item | ~2.5min/q | ~2.5min/q |
| Quem chuta? | Não chuta | Chuta tudo | Chuta com critério |

## Erro fatal: estudar genérico

Você abre um curso de Direito Constitucional pra concurso. Estuda 3 meses. Quando faz simulado Cebraspe, mata. Quando faz FGV, falha. Por quê? Não porque sabe menos — porque **a banca pede coisas diferentes**.

Quem está se preparando pra Cebraspe deveria fazer 70% das questões em Cebraspe. Quem está em FGV, 70% FGV. Não tem atalho — você precisa estar AMBIENTADO no estilo da sua banca.

## Como o Gabaritai resolve isso

A plataforma identifica a banca do seu concurso (extraída do edital) e:

- Filtra o banco de questões pra **só mostrar questões da SUA banca** (ou de bancas com estilo parecido).
- Simulados saem no formato exato da banca: Cebraspe vem com penalização, FGV sem, etc.
- Mentor sabe o estilo da banca e dá dica condizente.

Você não precisa lembrar disso toda vez. O sistema lembra.

---

**Próximo passo prático**: identifica a banca do seu concurso (está no edital, primeira página). Vai pro QConcursos / Tec Concursos / Gabaritai e filtra questões só dessa banca. Faz 50 antes do fim da semana. Você já vai sentir a diferença.`,
  },

  {
    slug: 'edital-verticalizado-o-que-e-e-por-que-todo-concurseiro-precisa',
    title: 'Edital verticalizado: o que é e por que todo concurseiro precisa de um',
    description: 'Edital verticalizado é a transformação do edital cru (PDF de 80 páginas) em um plano de estudo organizado: matéria, peso, assuntos, ordem. Quem não tem, perde tempo. Como fazer o seu em 30 minutos.',
    keywords: ['edital verticalizado', 'como verticalizar edital', 'edital comentado', 'plano de estudo concurso', 'cronograma de concurso'],
    category: 'Planejamento',
    readingMin: 8,
    publishedAt: '2026-05-10',
    author: 'Equipe Gabaritai',
    tags: ['planejamento', 'edital', 'iniciante'],
    content: `## O edital é uma jaca: você precisa abrir antes de comer

Edital de concurso é tipicamente um PDF de 60-120 páginas em letra miúda, cheio de "fica resolvido", "aos candidatos aprovados", "fica desde já estabelecido". A maior parte é burocracia administrativa que não interessa pra você estudar.

O que interessa de verdade está enterrado num "**Anexo II — Conteúdo Programático**" (ou nome similar) que ocupa 10-20 páginas. Ali está LITERALMENTE o que vai cair na prova.

**Edital verticalizado** é essa parte organizada em formato útil:

> Lista de matérias → cada uma com seu peso (% de questões) → cada uma desmembrada em assuntos (tópicos) → cada um marcado com "estudei / fiz questões / domino".

Sem isso, você está estudando no escuro.

## Por que o concurseiro experiente sempre verticaliza

Quem está há 2-3 anos no jogo de concurso já aprendeu, geralmente do jeito difícil, que **estudar matéria solta é desperdício**. Você abre o curso de Direito Administrativo no YouTube e dá em 80 aulas de 2 horas cada. 160 horas pra "saber" Direito Administrativo. Mas a sua prova só cobra **12 dos 40 assuntos** que estão no curso.

Resultado de quem não verticaliza:

- Estuda 160h o curso completo
- Foi rico em 28 assuntos que nunca caem na sua prova
- Foi rico em 12 que caem
- Tempo útil: ~50h. Tempo desperdiçado: ~110h.

Com edital verticalizado:

- Você sabe que esses 12 assuntos caem.
- Estuda só eles (talvez 50h totais).
- Os outros 28? **Ignora**.

**110 horas que você ganhou.**

## Como verticalizar um edital em 30 minutos

Pega o PDF do edital. Abre uma planilha (Google Sheets, Excel, Notion — qualquer coisa). Cria 4 colunas:

| Matéria | Assunto | Peso estimado | Status |

Agora segue o passo a passo:

### Passo 1 — Identifica as matérias

Procura no PDF a seção "Conteúdo Programático" ou "Anexo II". Vai ter algo tipo:

> DIREITO CONSTITUCIONAL: 1. Princípios Fundamentais. 1.1 Direitos individuais. 1.2 Direitos sociais. 2. Organização do Estado. 3. Poderes...
> DIREITO PENAL: 1. Aplicação da lei penal. 2. Crimes contra a pessoa...
> LÍNGUA PORTUGUESA: 1. Interpretação de textos. 2. Ortografia...

Cada matéria em CAIXA ALTA seguida de dois pontos é uma matéria. Lista todas.

### Passo 2 — Lista os assuntos por matéria

Embaixo de cada matéria, lista cada item numerado. Aqueles 1, 1.1, 1.2, 2, 2.1, 3 — viram linhas separadas na sua planilha. Cada subitem é UM tópico a estudar.

### Passo 3 — Estima o peso

Aqui você precisa de dois inputs:

- **Total de questões da prova** (geralmente no Anexo I ou nas regras): exemplo, 120 questões.
- **Quantas questões caem de cada matéria** (também tá no edital, ou em provas anteriores): exemplo, Constitucional cai 25, Penal cai 20, Português cai 25, Administrativo cai 20, etc.

Peso = (questões da matéria / total) × 100. Direito Constitucional = (25/120) × 100 = **20.8%**.

> **Se o edital não diz quantas questões de cada matéria** (alguns editais omitem), olha as 2-3 últimas provas do mesmo cargo: conta quantas questões caíram de cada matéria, faz a média. Concurso muda pouco entre edições.

### Passo 4 — Decide ordem de estudo

Ordena as matérias por peso (maior peso = primeiro). Esse é seu **cronograma de prioridade**.

Não significa que você estuda Constitucional 100% antes de tocar em Penal. Significa que **a cada semana**, Constitucional tem mais blocos de tempo que Penal.

### Passo 5 — Cria o status de cada tópico

Coluna "Status" recebe um destes valores conforme você avança:

- 🔵 **A estudar** (não começou)
- 🟡 **Estudando** (no meio)
- 🟢 **Dominado** (passou 2 simulados acertando > 70% de questões do tópico)
- 🔴 **Frágil** (estudou mas erra muito — precisa revisar)

**Esse status é seu painel de controle.** Toda segunda, você olha quantos tópicos estão em cada cor e decide a semana.

## Exemplo concreto: PMDF Soldado 2024

> **Direito Constitucional** (25% da prova, ~30 questões)
> - 1.1 Princípios Fundamentais (5 questões em provas anteriores) — 🟢 Dominado
> - 1.2 Direitos Fundamentais (7 questões) — 🟡 Estudando
> - 2. Organização do Estado (4 questões) — 🔵 A estudar
> - 3. Defesa do Estado (3 questões) — 🔵 A estudar
> - ...

Em uma olhada, você sabe: **falta estudar 5 tópicos grandes. Direitos Fundamentais ainda não fechei**. Próxima semana foca aí.

## O atalho: deixa que a gente faça por você

A parte de extrair e verticalizar o edital toma 30-60 minutos por concurso. O Gabaritai automatiza isso: você cola o texto do edital ou sobe o PDF, e em segundos sai a árvore verticalizada — matérias, assuntos, peso. Tudo já com o "status" começando como 🔵.

Conforme você estuda, o sistema atualiza o status sozinho baseado nos seus simulados. Quando acerta > 70% em 2 simulados seguidos no tópico, vira 🟢. Quando erra muito, vira 🔴 e o cronograma puxa mais revisão pra ele.

3 dias grátis. Sem cartão. Você pode subir um edital agora e ver a árvore montada em menos de um minuto.

---

**Próximo passo prático**: pega o edital do seu concurso AGORA. Abre uma planilha (ou usa nossa ferramenta) e verticaliza. Mesmo que leve 30 minutos, você economiza 30 horas de estudo desperdiçado nas próximas semanas.`,
  },
]

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}
