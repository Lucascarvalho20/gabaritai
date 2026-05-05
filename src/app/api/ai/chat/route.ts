import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { DEMO_USERS } from '@/lib/demo-users'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const payload = await verifyToken(auth.split(' ')[1])
  if (!payload) return NextResponse.json({ message: 'Token inválido' }, { status: 401 })

  const user = DEMO_USERS.find(u => u.id === payload.sub)
  const { message, history = [] } = await req.json()

  const systemPrompt = buildMentorPrompt(user)

  // Tenta Claude primeiro, depois OpenAI, depois resposta de fallback
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (anthropicKey) {
    try {
      const res = await callClaude(message, history, systemPrompt, anthropicKey)
      return NextResponse.json({ response: res })
    } catch (e) {
      console.error('Claude error:', e)
    }
  }

  if (openaiKey) {
    try {
      const res = await callOpenAI(message, history, systemPrompt, openaiKey)
      return NextResponse.json({ response: res })
    } catch (e) {
      console.error('OpenAI error:', e)
    }
  }

  // Fallback inteligente quando não há chave configurada
  const fallback = generateFallbackResponse(message, user)
  return NextResponse.json({ response: fallback })
}

async function callClaude(
  message: string,
  history: Array<{ role: string; content: string }>,
  system: string,
  apiKey: string
): Promise<string> {
  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 2048,
      system,
      messages,
    }),
  })

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`)
  const data = await res.json()
  return data.content[0].text
}

async function callOpenAI(
  message: string,
  history: Array<{ role: string; content: string }>,
  system: string,
  apiKey: string
): Promise<string> {
  const messages = [
    { role: 'system', content: system },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o',
      max_tokens: 2048,
      messages,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

function buildMentorPrompt(user: any): string {
  const nome = user?.name?.split(' ')[0] ?? 'Concurseiro'
  const concurso = user?.concursoAlvo ?? 'concurso público'
  const nivel = user?.nivel ?? 'intermediario'
  const meta = user?.meta ?? ''
  const horasDia = user?.horasDia ?? '3'

  return `Você é o Mentor IA do GabaritAI — plataforma de estudos para concursos públicos brasileiros.

## SEU ALUNO
- Nome: ${nome}
- Concurso alvo: ${concurso}
- Nível atual: ${nivel}
- Horas disponíveis por dia: ${horasDia}h
- Meta pessoal: "${meta}"

## SUA MISSÃO
1. Ser um mentor próximo, motivador e estratégico — não genérico
2. Adaptar cada resposta ao perfil do aluno (concurso, nível, disponibilidade)
3. Para questões jurídicas, citar artigos e legislação específica do concurso
4. Dar feedback honesto sobre progresso e viabilidade de aprovação
5. Sugerir técnicas de estudo (pomodoro, spaced repetition, revisões ativas)
6. Linguagem: próxima, direta e motivadora — português do Brasil
7. Para Polícias: usar linguagem mais técnica/estratégica; para Bancos: mais analítica

## FORMATO
- Use markdown para organizar (negrito, bullets, numeração)
- Seja conciso mas completo — evite enrolação
- Sempre termine com um próximo passo concreto para o aluno`
}

function generateFallbackResponse(message: string, user: any): string {
  const nome = user?.name?.split(' ')[0] ?? 'Concurseiro'
  const concurso = user?.concursoAlvo ?? 'seu concurso'
  const msgLower = message.toLowerCase()

  if (msgLower.includes('ponto fraco') || msgLower.includes('dificuldade') || msgLower.includes('errando')) {
    return `Analisando seu histórico, ${nome}! 📊

Com base nos seus dados de desempenho para **${concurso}**, identifiquei que suas maiores dificuldades estão concentradas em:

1. **Matemática/Raciocínio Lógico** — taxa de acerto abaixo de 60%
2. **Conhecimentos Específicos** — questões situacionais da banca

**Plano de ação recomendado:**
- Dedique **40% do tempo** para as matérias com menor acerto
- Use os flashcards para fixar conceitos que você erra repetidamente
- Faça simulados semanais para calibrar seu progresso

**Próximo passo:** Acesse a seção de Questões agora e filtre por "questões que errei" — revisar seus erros é mais eficiente do que estudar conteúdo novo.

> ⚠️ **Atenção:** Para respostas personalizadas com IA real, configure a chave ANTHROPIC_API_KEY no arquivo .env`
  }

  if (msgLower.includes('cronograma') || msgLower.includes('plano') || msgLower.includes('horas')) {
    return `Ótima pergunta, ${nome}! Vou montar uma análise do seu cronograma para **${concurso}**. 📅

**Análise de viabilidade:**
Com base nas horas que você tem disponíveis por dia, calculei:

✅ É possível fechar o edital antes da prova
📌 Você precisará manter consistência de pelo menos 5 dias por semana
🔄 Reserve os últimos 30 dias para revisão intensiva

**Distribuição sugerida de hoje:**
- 45 min → Teoria (matéria mais fraca)
- 30 min → 20 questões práticas
- 15 min → Revisão de flashcards

**Próximo passo:** Acesse o Cronograma para ver seu plano completo desta semana.

> ⚠️ Configure ANTHROPIC_API_KEY no .env para análises personalizadas com IA real.`
  }

  if (msgLower.includes('aprovação') || msgLower.includes('chance') || msgLower.includes('passar')) {
    return `${nome}, vou ser direto com você sobre **${concurso}**! 🎯

**Análise da sua situação atual:**
- Você está no caminho certo, mas há pontos a melhorar
- Sua taxa de acerto atual: ~72% (simulados recentes)
- Meta mínima para aprovação: 70-75% (varia por concurso)

**O que vai definir sua aprovação:**
1. Consistência nos estudos (sequência de dias sem falhar)
2. Foco nos pontos fracos identificados pela IA
3. Simulados semanais no estilo da banca

**Previsão:** Mantendo o ritmo atual, você tem **boa chance** de aprovação. A chave é não parar.

**Próximo passo:** Faça o simulado semanal hoje para calibrar onde você realmente está.

> ⚠️ Configure ANTHROPIC_API_KEY no .env para análises preditivas reais com IA.`
  }

  return `Olá, ${nome}! Estou aqui para te ajudar com seus estudos para **${concurso}**. 🧠

Posso te ajudar com:
- 📊 **Análise de desempenho** e pontos fracos
- 📅 **Ajuste do cronograma** de estudos
- 📝 **Explicações** de qualquer matéria do edital
- 🎯 **Estratégias** para a banca do seu concurso
- 💡 **Dicas** de técnicas de memorização

**Pergunte algo específico**, como:
- "Qual meu maior ponto fraco?"
- "Explique inviolabilidade domiciliar"
- "Como está minha chance de aprovação?"

> ⚠️ **Modo demo ativo** — Configure ANTHROPIC_API_KEY no arquivo \`apps/web/.env.local\` para respostas com IA real (Claude). Veja o arquivo COMO_INSTALAR.md.`
}
