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
    slug: 'quanto-tempo-estudar-por-dia-para-concurso',
    title: 'Quanto tempo de estudo por dia pra passar em concurso (a resposta honesta)',
    description: 'Não é 10 horas por dia. Nem 2. Depende do tempo até a prova, da dificuldade do concurso e da sua base. Cálculo concreto baseado em horas reais de aprovados — com calculadora pra você descobrir o seu número.',
    keywords: ['quantas horas estudar concurso', 'tempo de estudo concurso', 'rotina de estudo concurseiro', 'horas por dia concurso público'],
    category: 'Método',
    readingMin: 9,
    publishedAt: '2026-05-22',
    author: 'Equipe Gabaritai',
    tags: ['método', 'rotina', 'planejamento'],
    content: `## A pergunta que todo concurseiro faz

"Quanto tempo eu preciso estudar por dia pra passar?"

A resposta honesta começa com outra pergunta: **qual o seu prazo, qual o concurso, e qual sua base**? Sem isso, qualquer número é palpite. Vamos quebrar.

## A matemática real

Aprovados que conhecemos seguem uma faixa parecida:

- **Concurso básico** (GCM, PM Soldado de estado pequeno, PRF): ~400-500h de estudo total
- **Concurso médio** (PMDF, PCDF, CBMDF): ~600-800h
- **Concurso avançado** (PF Agente/Escrivão, PRF, Polícia Penal): ~900-1100h
- **Concurso expert** (PF Delegado, Perito, Auditor Federal): ~1500h+

Essas são **horas líquidas de estudo focado** — não contar o tempo de Instagram entre uma leitura e outra. Estudo focado é cronômetro rodando, sem distração, técnica Pomodoro ou similar.

## Como converter horas totais em rotina diária

Pega a carga total do seu concurso, divide pela quantidade de dias até a prova. Isso te dá quantas horas/dia você precisa.

> **Exemplo PMDF Soldado** (carga ~700h, prova daqui a 6 meses ≈ 180 dias)
>
> 700h ÷ 180d = **3.9h por dia**, todos os dias.

Mas ninguém estuda todos os dias. Considere 6 dias úteis por semana (1 de descanso):

> 700h ÷ (6/7 × 180) ≈ **4.5h por dia**, 6 dias por semana.

## Os 3 cenários típicos

**Cenário A — Trabalhador com 4-6h pra estudar à noite/fim de semana**: você tem 15-25h/semana. Pra concurso médio (700h), precisa de 7-10 meses. Plano: madruga 1h, à noite 2h, sábado 4h, domingo 3h.

**Cenário B — Recém-formado em tempo integral**: tem 30-40h/semana. Carga média em 4-5 meses. Cuidado com burnout — estude bloco de manhã (3-4h), tarde (3-4h), sem invadir noite todos os dias.

**Cenário C — Faculdade + estudo de concurso**: 10-15h/semana realisticamente. Concurso médio em 12-18 meses. Vai dar — mas precisa de plano longo e consistência.

## Calculadora honesta (mesmo princípio)

A gente tem uma [calculadora de tempo](/) no topo da home que faz essa conta na hora. Você ajusta horas/dia, dias/semana, e ela mostra a estimativa em meses até estar pronto. Sem cadastro.

## O erro que todo concurseiro comete

Vão te dizer "estude 8 horas por dia". Vão te dizer "se não estudar 10 horas, não passa". É papo de quem vende curso pra você se sentir culpado e comprar tudo.

**A verdade**: quem estuda **3-4 horas por dia, 6 dias por semana, durante 6-12 meses**, com método (cronograma, simulado semanal, repetição espaçada), passa. Quem tenta estudar 10 horas e cansa em 3 semanas, desiste e refaz tudo do zero — não passa.

Consistência > intensidade. Sempre.

## Quanto tempo TEM que ser focado?

Outra distorção: "estudei 6 horas hoje" muitas vezes significa "fiquei 6 horas com o caderno aberto, mas Instagram, café, conversa, planilha…"

O número que importa é **horas de cabeça baixa, sem distração externa, na atividade-fim** (ler, resolver questão, revisar flashcard). 3 horas de FOCO REAL valem mais que 6 horas de presença com mente dispersa.

Truque que funciona: cronômetro Pomodoro de 25 min, sem celular na mesa. 4 ciclos = 1h40 reais. Faz 2-3 sessões por dia → ~5h FOCADAS.

## E a regra da véspera?

Aprovados também repetem isso: "na última semana, eu desacelero". Dorme cedo, revisa LEVE, não tenta absorver conteúdo novo. Dia da prova: chega 1h antes, leva água e barra de cereal, confia no que treinou.

Quem trata véspera como sprint final geralmente vai mal. Confia no acúmulo.

---

**Próximo passo prático**: roda a calculadora de tempo na home com seus números reais. Se o resultado for assustador (ex: "preciso de 8h/dia que não tenho"), considera plano de 12 meses em vez de 6. Vale mais um plano realista que cumpre, do que um irreal que abandona em 3 semanas.`,
  },

  {
    slug: 'cronograma-de-estudos-para-concurso',
    title: 'Como montar um cronograma de estudos pra concurso (sem complicar)',
    description: 'Cronograma de concurso não precisa de planilha em 8 cores. Precisa de matéria, peso, e prioridade. Passo a passo enxuto pra montar o seu em 30 minutos, mesmo que seja o seu primeiro concurso.',
    keywords: ['cronograma de estudos concurso', 'como montar cronograma concurso', 'planilha de estudo', 'plano de estudo concurso público'],
    category: 'Planejamento',
    readingMin: 11,
    publishedAt: '2026-05-19',
    author: 'Equipe Gabaritai',
    tags: ['planejamento', 'cronograma', 'iniciante'],
    content: `## Cronograma é mapa, não decoração

A internet está cheia de cronogramas coloridos com 8 abas no Excel, cores diferentes pra cada matéria, gráfico de pizza de progresso e blocos com legenda. **Bonito, e quase sempre inútil.** Aprovado de verdade tem cronograma feio. Funcional, mas feio.

O que importa: você abre, vê o que estudar HOJE, faz, marca como feito. Acabou. Tudo o que não responde "o que faço agora" é gordura.

## Os 4 componentes obrigatórios

1. **Lista de matérias** com o peso de cada uma (% da prova)
2. **Tempo disponível por dia** (real, não otimista)
3. **Distribuição semanal** de quantas horas vão pra cada matéria
4. **Status** de cada tópico (não estudei / estudando / dominado / frágil)

Sem nenhum desses 4, não é cronograma. É lista de desejos.

## Passo 1: Extrai o peso de cada matéria

Pega o edital ativo do seu concurso. Procura "Conteúdo Programático" ou "Anexo II". Anota:

- Quantas questões caem de cada matéria (ou estima pelas 2-3 últimas provas)
- Soma o total
- Calcula o % de cada uma

> **PMDF Soldado 2024** (exemplo)
> - Constitucional: 30 questões → 25%
> - Penal: 24 → 20%
> - Administrativo: 18 → 15%
> - Português: 18 → 15%
> - Lógica: 12 → 10%
> - Processual Penal: 12 → 10%
> - Informática: 6 → 5%
> - **Total: 120 questões**

Esse % é seu **multiplicador de horas**. Constitucional tem 25% do edital → fica com 25% das suas horas.

## Passo 2: Define o tempo disponível REAL

Erro típico: "tenho 5h por dia disponíveis". Realidade: 5h - 30min reuniões da família - 30min trânsito - 30min cansaço acumulado = ~3h REAIS por dia.

Honesto sempre vence otimista. Conte pra baixo:

- Dias úteis: X horas
- Sábado: Y horas
- Domingo: Z horas (geralmente menos, simulado entra aqui)
- Total semanal: soma tudo

> **Exemplo**: 3h × 5 dias + 4h sábado + 2h domingo = **21h por semana**

## Passo 3: Distribui as horas pelas matérias

Pega o total semanal e multiplica pelo peso de cada matéria:

> 21h × 25% = **5h25 de Constitucional por semana**
> 21h × 20% = **4h20 de Penal**
> 21h × 15% = **3h15 de Administrativo**
> ...etc

Esses números viram blocos de 50-90min na sua semana. Distribui pelos dias.

## Passo 4: Cria um status por tópico

Cada matéria tem 30-80 tópicos no edital. Cria uma planilha (ou usa nossa árvore de edital verticalizado) e marca:

- 🔵 **A estudar** (não viu ainda)
- 🟡 **Estudando** (no meio)
- 🟢 **Dominado** (passou 2 simulados acertando >70% nessa matéria)
- 🔴 **Frágil** (estudou mas erra muito — precisa revisar urgente)

Esse painel é seu controle de bordo. Toda segunda-feira, olha quantos tópicos estão em cada cor e ajusta a semana.

## Passo 5: Encaixa simulado e revisão SRS

Cronograma de estudo NOVO é só metade. A outra metade é:

- **Revisão SRS** (repetição espaçada): 15-30min por dia. Os flashcards de antes voltam no momento certo pra fixar.
- **Mini-simulado** (terça e quinta): 20 questões cronometradas, 30 min. Não conta como estudo novo.
- **Simulado real** (domingo): 80-120 questões no formato exato da banca, cronometrado. Bloqueia 3h do domingo.

> Semana modelo (3h/dia × 6 dias = 18h):
>
> - Seg, Qua, Sex: 2h matéria nova + 1h revisão SRS
> - Ter, Qui: 1.5h matéria nova + 30min mini-simulado + 1h revisão SRS
> - Sáb: 2h revisão estruturada + 2h matéria nova
> - Dom: 3h simulado completo + análise dos erros

## Adapta semanalmente

Cronograma estático é cronograma morto. Toda semana você revisa: errou demais em alguma matéria no simulado? Próxima semana puxa mais horas pra ela. Acertou tudo de Constitucional? Constitucional vira revisão leve por 2 semanas, hora extra vai pra Penal.

O Gabaritai faz esse rebalanceamento **automaticamente** baseado no desempenho dos seus simulados. Sem precisar pensar.

## O cronograma morre se você não usar

Última verdade: o cronograma mais perfeito do mundo morre se você abrir só uma vez por semana. **Abre todo dia.** Marca cada bloco como feito. O hábito de seguir o cronograma é mais importante que a perfeição dele.

Quem é aprovado segue cronograma 80% das vezes. Quem não passa fica corrigindo o cronograma toda semana e estudando 30% do que planejou.

---

**Próximo passo prático**: dedica 30 min HOJE pra fazer os passos 1-4 do seu concurso. Sem isso pronto, qualquer hora de estudo é tiro no escuro.`,
  },

  {
    slug: 'estudar-para-concurso-trabalhando',
    title: 'Como estudar pra concurso trabalhando 8h por dia (rotina realista)',
    description: 'A maioria dos concurseiros não tem 8h por dia livre. Tem 2-3h roubadas do café, do almoço, da noite. Plano realista pra quem trabalha e quer passar — com rotina semanal de aprovados reais.',
    keywords: ['estudar para concurso trabalhando', 'rotina concurseiro trabalhador', 'concurso público trabalhando 8 horas', 'estudar a noite pra concurso'],
    category: 'Rotina',
    readingMin: 10,
    publishedAt: '2026-05-16',
    author: 'Equipe Gabaritai',
    tags: ['rotina', 'trabalhador', 'método'],
    content: `## O retrato real do concurseiro brasileiro

A maioria das pessoas que passa em concurso público no Brasil **não é "concurseiro full time"**. É gente que trabalha das 8 às 17h, tem família, paga aluguel, e arranja 2-4 horas por dia pra estudar nos intervalos.

Esse post é pra esse perfil. Quem tem 8h livres já tem caminho mais fácil — focam em outros artigos.

## A regra fundamental: protocolo, não força de vontade

Quem trabalha não pode contar com "vou estudar quando der vontade". Vontade é sazonal. **Protocolo é diário.**

Protocolo = você decide UMA VEZ, antes da semana começar, exatamente quando e o que vai estudar. Daí não decide mais. Só executa.

> Domingo à noite, 20 minutos: olhei meu cronograma, decidi:
> - Segunda 6h-7h30: Constitucional, capítulo 3
> - Segunda 21h-22h: Revisão SRS
> - Terça 6h-7h30: Penal, crimes contra pessoa
> - Terça 21h-22h: 20 questões de Constitucional
> ...etc

Segunda às 6h não tem decisão a tomar. Só abre o material e estuda.

## Rotina-modelo: trabalhador 9-17h

Vamos com um plano realista pra quem tem 3-3.5h por dia (rotina de aprovados):

**6h-7h30 (1h30)**: bloco principal. Cabeça fresca, sem interrupção. Material novo + 1 hora de leitura/anotação. Esse é o bloco mais valioso da semana — protege ele.

**12h-12h30 (30min)**: mini-revisão no almoço. Flashcards SRS no celular. Sem pressão.

**21h-22h (1h)**: bloco da noite. Aqui faz questões (não leitura — cabeça cansada absorve menos). 30 questões da matéria do dia + ler explicação dos erros.

**Sábado**: 4-5h. Manhã estudo novo, tarde simulado curto + descanso.

**Domingo**: 3-4h. **SIMULADO COMPLETO** + análise dos erros + planejamento da próxima semana.

Total: ~20-22h por semana. Carga 700h em 8 meses. **Suficiente pra concurso médio (PMDF, PCDF, CBMDF).**

## Os 4 inimigos do concurseiro trabalhador

**1. Cansaço real do trabalho.** Você não rende às 22h como rende às 6h. Aceite: bloco da noite é pra fazer questões mecanicamente, não pra absorver conteúdo novo. Material novo é manhã.

**2. Imprevistos da família e trabalho.** Reunião que furou. Filho doente. Hora extra surpresa. Solução: ter dia FLEXÍVEL. Geralmente quarta ou quinta. Se a semana correu bem, é dia extra de descanso. Se desabou, é dia de recuperar.

**3. Domingo de festa familiar.** Você perde o simulado. Solução: **simulado é sagrado.** Mesmo que faça às 21h da noite ou só 50 questões em vez de 120. Faz alguma coisa. Domingo sem simulado vira semana sem termômetro.

**4. Burnout em 3 meses.** É a maior ameaça. Solução: 1 dia totalmente off por semana (quinta, sexta ou sábado à noite). NÃO ESTUDA. Vai no cinema, na academia, no boteco. Sem culpa.

## Ferramentas que dobram o rendimento

**Pomodoro 25-5**: 25 min focado, 5 min pausa, repete 4x = 1h40 real. Sem celular na mesa. Aplicativo Forest ou Pomofocus.

**Flashcards no celular**: SRS roda em qualquer momento. Espera de fila, pausa no trabalho, ônibus. 5-15 cards aqui, 10 ali. Soma ao longo do dia.

**Audio + transcrição**: ouve aula no carro/transporte. Não substitui leitura, mas mantém imersão na matéria.

**Cronograma rígido na agenda**: bota no Google Calendar como compromisso. Tratá ele como reunião. Quando alguém pede esse horário, "tenho compromisso".

## O que NÃO funciona pra quem trabalha

- **"Vou estudar quando puder"**: sem horário fixo, vira nunca.
- **Estudar 8h no sábado**: rendimento despenca depois de 4h. Melhor 4h sábado + 3h domingo.
- **Tentar acompanhar quem é full-time**: você compete com o seu eu de ontem, não com o concurseiro 100% dedicado.
- **Pular simulado pra "estudar mais matéria"**: simulado é o termômetro. Sem ele, você não sabe se está evoluindo.

## Histórias reais de aprovados trabalhando

**Caso 1 — Servidor público 9-17h**, aprovado PMDF Soldado em 9 meses. Rotina: 6h-7h30 leitura, 21h-22h questões, sábado 5h, domingo 3h+simulado. Dia off: sexta noite.

**Caso 2 — Vendedora externa**, escalas variáveis, aprovada PCDF Escrivã em 14 meses. Sem rotina fixa de horário, usava blocos onde dava: às vezes 5h-7h, às vezes 18h-21h. **Constância** era 6 dias por semana, qualquer horário.

**Caso 3 — Estagiário CLT 6h por dia**, aprovado PRF em 11 meses. Conseguiu acordo de não fazer hora extra. 4h por dia de estudo + sábado integral.

Padrão comum: **rotina protegida**, **simulado dominical**, **6 dias por semana**.

## Quando não dá

Se sua rotina é 12h por dia trabalhando + filho pequeno + casa pra arrumar, talvez você precise considerar:

- Concurso de **prazo longo** (12-18 meses, não 6)
- Concurso **mais acessível** (PM local, GCM, técnico estadual) em vez de PF
- **Pausa estratégica**: 3 meses sem estudar por 6 meses dedicados — em vez de 9 meses estudando 30 min/dia que não rende nada

Honestidade: alguns concursos exigem dedicação que não dá pra ter trabalhando. Reconhecer isso te poupa anos.

---

**Próximo passo prático**: senta hoje à noite, abre o Google Calendar, coloca 5 blocos da semana (seg-sex 6h-7h30) como "Estudo". Quem entra no seu calendário, vê. Quem te chama nesse horário, vê. Isso é proteção real do seu tempo.`,
  },

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
