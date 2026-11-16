/**
 * Testes de integração: o código de verdade contra um PostgreSQL + pgvector
 * de verdade. Cobre o que teste unitário não alcança — SQL escrito à mão
 * (busca vetorial, lápide), filtros de relação do Prisma, e principalmente
 * CONCORRÊNCIA: três notificações de pagamento disparadas ao mesmo tempo.
 *
 * Rodar:  npm run test:integracao   (sobe um Postgres descartável no Docker)
 *
 * ⚠️ Este teste APAGA os dados do banco antes de rodar. Por isso se recusa a
 * rodar se a URL não for de um banco local de teste — apontar para produção
 * por engano não pode ser possível.
 */
const URL_BANCO = process.env.INTEGRACAO_DATABASE_URL ?? 'postgresql://postgres:ensaio@localhost:55432/ensaio'
{
  const u = new URL(URL_BANCO)
  const local = ['localhost', '127.0.0.1', 'postgres'].includes(u.hostname)
  const nomeDeTeste = /ensaio|test/.test(u.pathname)
  if (!local || !nomeDeTeste) {
    console.error(`Recusado: ${u.hostname}${u.pathname} não parece um banco local de teste. Este teste apaga dados.`)
    process.exit(2)
  }
}
process.env.DATABASE_URL = URL_BANCO
process.env.GEMINI_API_KEY = 'chave-falsa-do-ensaio'
process.env.NODE_ENV = 'test'

// ── Embeddings falsos e determinísticos: saco de palavras em 1536 dimensões ──
const DIM = 1536
function vetor(texto: string): number[] {
  const v = new Array(DIM).fill(0)
  for (const p of texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((x) => x.length > 2)) {
    let h = 2166136261
    for (const c of p) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    v[(h >>> 0) % DIM] += 1
  }
  const n = Math.hypot(...v) || 1
  return v.map((x) => x / n)
}
const fetchReal = globalThis.fetch
// Mensagens que o Telegram "recebeu", e um interruptor para simular o Telegram fora do ar.
const telegram: string[] = []
let telegramFora = false
globalThis.fetch = (async (url: any, init?: any) => {
  if (String(url).includes('batchEmbedContents')) {
    const corpo = JSON.parse(init.body)
    return Response.json({ embeddings: corpo.requests.map((r: any) => ({ values: vetor(r.content.parts[0].text) })) })
  }
  if (String(url).includes('api.telegram.org')) {
    if (telegramFora) return Response.json({ ok: false }, { status: 502 })
    telegram.push(JSON.parse(init.body).text)
  }
  return Response.json({ ok: true }) // telegram/e-mail: sem rede no ensaio
}) as typeof fetch
void fetchReal

const W = new URL('../../src/lib/', import.meta.url).href
const { prisma } = await import(W + 'prisma.ts')
const { indexarLote } = await import(W + 'rag/indexar.ts')
const { searchMaterial } = await import(W + 'rag/search.ts')
const { materiasDoAluno } = await import(W + 'rag/escopo-aluno.ts')
const { carregarContextoAluno, ferramentasDiagnostico } = await import(W + 'agente/ferramentas-diagnostico.ts')
const { rodarAgente } = await import(W + 'agente/loop.ts')
const { runSchedule, persistSchedule, ajustesDoPlano } = await import(W + 'schedule-helpers.ts')
const { applyMpPaymentToLocal } = await import(W + 'payment-sync.ts')
const { ferramentasMcp } = await import(new URL('../../mcp/ferramentas.ts', import.meta.url).href)
const { carregarConteudo, estimativaDoEdital, estimativasDosConcursos } = await import(W + 'tempo-estudo-dados.ts')
const { REVISAO_FRACAO } = await import(W + 'tempo-estudo.ts')
const rotaTempo = await import(new URL('../../src/app/api/tempo/concursos/route.ts', import.meta.url).href)
const { monitorarCron, avisarAtrasos, situacaoDasTarefas, vigiaNaoInstalado } = await import(W + 'vigia.ts')
const { importarProva, idDoItem } = await import(W + 'provas/importar.ts')
const { lerArquivoDeProva } = await import(W + 'provas/arquivo.ts')
const provasAluno = await import(W + 'provas/aluno.ts')
const { somarAoDominio } = await import(W + 'dominio.ts')
const { migracoesAplicadas } = await import(W + 'migracoes.ts')

let falhas = 0
async function caso(nome: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`  OK     ${nome}`) }
  catch (e: any) { falhas++; console.log(`  FALHA  ${nome}\n         ${String(e?.message ?? e).split('\n')[0]}`) }
}
function exigir(cond: unknown, msg: string) { if (!cond) throw new Error(msg) }

// ── Banco limpo (já validado acima que é um banco de teste) ──────────────────
await prisma.$executeRawUnsafe('TRUNCATE users, courses, subjects, materials, pricing_plans RESTART IDENTITY CASCADE')

// ── Dados de teste ───────────────────────────────────────────────────────────
const texto = (tema: string, rep: string) =>
  `${tema}. ` + Array.from({ length: 12 }, () => rep).join(' ') + ' Conteúdo de apoio para revisão do aluno com exemplos práticos e jurisprudência relevante.'

await prisma.user.create({ data: { id: 'ens-user', name: 'Aluno Ensaio', password: 'x', email: 'ensaio@teste.local' } })
await prisma.user.create({ data: { id: 'ens-outro', name: 'Outro Aluno', password: 'x', email: 'outro@teste.local' } })
await prisma.course.create({ data: { id: 'ens-curso', slug: 'ens-curso', name: 'Curso Ensaio' } })
for (const [id, nome] of [['ens-penal', 'Direito Penal Ensaio'], ['ens-port', 'Português Ensaio'], ['ens-contab', 'Contabilidade Ensaio']])
  await prisma.subject.create({ data: { id, slug: id, name: nome } })
await prisma.edital.create({ data: {
  id: 'ens-edital', courseId: 'ens-curso', ano: 2027, titulo: 'Edital Ensaio', isActive: true,
  dataProva: new Date(Date.now() + 90 * 864e5),
  subjects: { create: [{ subjectId: 'ens-penal', weight: 3 }, { subjectId: 'ens-port', weight: 2 }] },
} })
await prisma.userCourseEnrollment.create({ data: { userId: 'ens-user', courseId: 'ens-curso', isPrimary: true, isActive: true } })
await prisma.userSubjectMastery.createMany({ data: [
  { userId: 'ens-user', courseId: 'ens-curso', subjectId: 'ens-penal', totalAttempts: 40, correctAttempts: 12 },
  { userId: 'ens-user', courseId: 'ens-curso', subjectId: 'ens-port', totalAttempts: 40, correctAttempts: 36 },
  // dado de OUTRO aluno, que o agente nunca pode ver
  { userId: 'ens-outro', courseId: 'ens-curso', subjectId: 'ens-penal', totalAttempts: 99, correctAttempts: 99 },
] })
await prisma.topic.create({ data: { id: 'ens-top-presc', subjectId: 'ens-penal', name: 'Prescrição' } })
await prisma.topicAttempt.create({ data: { userId: 'ens-user', topicId: 'ens-top-presc', totalAttempts: 10, correctAttempts: 2, masteryScore: 0.2 } })
for (const n of [1, 2]) {
  await prisma.question.create({ data: { id: `ens-q${n}`, subjectId: 'ens-penal', enunciado: `Questão ${n} sobre prescrição da pretensão punitiva`, alternativas: [], gabarito: 'A', explicacao: '-' } })
  await prisma.questionAttempt.create({ data: { userId: 'ens-user', questionId: `ens-q${n}`, selected: 'B', correct: false } })
}
await prisma.material.create({ data: { id: 'ens-mat-penal', title: 'Prescrição penal', subjectId: 'ens-penal', active: true,
  content: texto('Prescrição no direito penal', 'prescrição penal pretensão punitiva') } })
await prisma.material.create({ data: { id: 'ens-mat-contab', title: 'Prescrição tributária', subjectId: 'ens-contab', active: true,
  content: texto('Prescrição na contabilidade', 'prescrição tributária crédito fiscal') } })
await prisma.material.create({ data: { id: 'ens-mat-curto', title: 'Rascunho', subjectId: 'ens-penal', active: true, content: 'texto curto demais' } })

console.log('\nRAG')
await caso('indexa o que tem texto e põe lápide no que não tem', async () => {
  const r = await indexarLote({ batch: 10 })
  exigir(r.processados === 3, `processados=${r.processados}`)
  exigir(r.detalhe.find((d) => d.materialId === 'ens-mat-curto')?.skipped, 'curto deveria ser pulado')
  exigir(r.remaining === 0, `remaining=${r.remaining}`)
})
await caso('a fila não trava: segunda chamada não reprocessa nada', async () => {
  const r = await indexarLote({ batch: 10 })
  exigir(r.processados === 0, `reprocessou ${r.processados}`)
})
await caso('busca SEM filtro acha as duas matérias', async () => {
  const r = await searchMaterial('prescrição penal', { limit: 5 })
  const mats = new Set(r.map((c: any) => c.materialId))
  exigir(mats.has('ens-mat-penal') && mats.has('ens-mat-contab'), `achou ${[...mats]}`)
})
await caso('busca COM escopo do edital ignora matéria fora da prova', async () => {
  const escopo = await materiasDoAluno('ens-user')
  exigir(escopo?.length === 2 && !escopo.includes('ens-contab'), `escopo=${escopo}`)
  const r = await searchMaterial('prescrição penal', { limit: 5, subjectIds: escopo })
  exigir(r.length > 0, 'nada encontrado')
  exigir(r.every((c: any) => c.materialId === 'ens-mat-penal'), `vazou: ${r.map((c: any) => c.materialId)}`)
})
await caso('lápide nunca aparece na busca', async () => {
  const r = await searchMaterial('texto curto demais', { limit: 10 })
  exigir(!r.some((c: any) => c.materialId === 'ens-mat-curto'), 'lápide apareceu')
})

console.log('\nAGENTE')
const ctx = await carregarContextoAluno('ens-user')
const fs = ferramentasDiagnostico('ens-user', ctx!)
const f = (n: string) => fs.find((x: any) => x.nome === n)!
await caso('contexto tem só as matérias do edital', async () => {
  exigir(ctx?.materias.length === 2, `matérias=${ctx?.materias.length}`)
})
await caso('consultar_desempenho: Penal primeiro, e só dados DESTE aluno', async () => {
  const r: any[] = await f('consultar_desempenho').executar({}) as any[]
  exigir(r[0].materia_id === 'ens-penal', `primeiro=${r[0].materia_id}`)
  exigir(r[0].acerto === '30%', `acerto Penal=${r[0].acerto} (o outro aluno tem 100%)`)
})
await caso('topicos_fracos, erros_recentes, tempo_ate_prova', async () => {
  const t: any = await f('topicos_fracos').executar({ materia_id: 'ens-penal' })
  exigir(t[0]?.topico === 'Prescrição', JSON.stringify(t))
  const e: any = await f('erros_recentes').executar({ materia_id: 'ens-penal' })
  exigir(Array.isArray(e) && e.length === 2, JSON.stringify(e))
  const d: any = await f('tempo_ate_prova').executar({})
  exigir(d.dias_ate_prova >= 89 && d.dias_ate_prova <= 91, JSON.stringify(d))
})
await caso('buscar_material no escopo devolve o material certo', async () => {
  const r: any = await f('buscar_material').executar({ materia_id: 'ens-penal', consulta: 'prescrição penal' })
  exigir(Array.isArray(r) && r[0]?.material === 'Prescrição penal', JSON.stringify(r).slice(0, 120))
})
await caso('matéria fora do edital é recusada em todas as ferramentas', async () => {
  for (const n of ['topicos_fracos', 'erros_recentes', 'buscar_material']) {
    let recusou = false
    try { await f(n).executar({ materia_id: 'ens-contab', consulta: 'x' }) } catch { recusou = true }
    exigir(recusou, `${n} aceitou matéria fora do escopo`)
  }
})
await caso('loop completo com modelo roteirizado entrega plano com nome do banco', async () => {
  let i = 0
  const roteiro = [
    { conteudo: null, chamadas: [{ id: 'a', type: 'function', function: { name: 'consultar_desempenho', arguments: '{}' } }] },
    { conteudo: null, chamadas: [{ id: 'b', type: 'function', function: { name: 'topicos_fracos', arguments: '{"materia_id":"ens-penal"}' } }] },
    { conteudo: null, chamadas: [{ id: 'c', type: 'function', function: { name: 'entregar_plano', arguments: JSON.stringify({
      resumo: 'Penal concentra a maior perda.', prioridades: [{ materia_id: 'ens-penal', motivo: '30% de acerto, 60% da prova.', acoes: ['Resolver 20 questões de Prescrição'] }],
    }) } }] },
  ]
  const r: any = await rodarAgente({ sistema: 's', pedido: 'p', ferramentas: fs, ferramentaFinal: 'entregar_plano', llm: async () => roteiro[i++] as any })
  exigir(r.ok, r.erro)
  exigir(r.resultado.prioridades[0].materia === 'Direito Penal Ensaio', JSON.stringify(r.resultado))
})

console.log('\nCRONOGRAMA ADAPTATIVO')
await caso('ajuste por desempenho redistribui e fica gravado no plano', async () => {
  const dto = { courseId: 'ens-curso', editalId: 'ens-edital', hoursPerDay: 3, daysPerWeek: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 90 * 864e5).toISOString(), adaptarDesempenho: true }
  const comAjuste = await runSchedule(dto, 'ens-user')
  const semAjuste = await runSchedule({ ...dto, adaptarDesempenho: false }, 'ens-user')
  exigir(comAjuste.perSubject['ens-penal'].minutes > semAjuste.perSubject['ens-penal'].minutes, 'Penal não ganhou tempo')
  exigir(comAjuste.perSubject['ens-port'].minutes < semAjuste.perSubject['ens-port'].minutes, 'Português não cedeu tempo')
  const plano = await persistSchedule('ens-user', dto, comAjuste)
  const salvo = await prisma.studyPlan.findUnique({ where: { id: plano.id } })
  exigir(salvo?.adaptarDesempenho === true && salvo?.turbo === false, 'modos não gravados')
  const ajustes = await ajustesDoPlano(salvo!)
  exigir(ajustes.find((a: any) => a.id === 'ens-penal')!.fator > 1, 'ajustesDoPlano inconsistente')
})

console.log('\nPAGAMENTO')
await prisma.pricingPlan.create({ data: { id: 'ens-plano', slug: 'ens-plano', name: 'Plano Ensaio', type: 'SINGLE_COURSE', interval: 'MONTH',
  priceCents: 100, coverageType: 'SPECIFIC', coverageData: ['ens-curso'], features: [] } })
await prisma.payment.create({ data: { id: 'ens-pay', userId: 'ens-outro', provider: 'mercadopago', amount: 1, plan: 'BASIC',
  status: 'PENDING', pricingPlanId: 'ens-plano', pricingPlanSlug: 'ens-plano', providerPaymentId: '999001' } })
const mp = (status: string) => ({ id: 999001, status, status_detail: status === 'approved' ? 'accredited' : 'pending_waiting_transfer',
  external_reference: 'ens-pay', payment_method_id: 'pix', payment_type_id: 'bank_transfer', transaction_amount: 1,
  date_approved: status === 'approved' ? new Date().toISOString() : null, date_created: new Date().toISOString(), payer: {} })

await caso('três notificações SIMULTÂNEAS de aprovado liberam UMA vez', async () => {
  const r = await Promise.all([applyMpPaymentToLocal(mp('approved') as any), applyMpPaymentToLocal(mp('approved') as any), applyMpPaymentToLocal(mp('approved') as any)])
  const liberou = r.filter((x: any) => x.ok && x.fulfilled).length
  const plano = await prisma.pricingPlan.findUnique({ where: { id: 'ens-plano' } })
  exigir(liberou === 1, `liberou ${liberou} vezes`)
  exigir(plano?.soldCount === 1, `soldCount=${plano?.soldCount}`)
})
await caso('notificação atrasada "pending" não desfaz o "approved"', async () => {
  const r: any = await applyMpPaymentToLocal(mp('pending') as any)
  exigir(!r.ok && String(r.reason).startsWith('transicao_ignorada'), JSON.stringify(r))
  const p = await prisma.payment.findUnique({ where: { id: 'ens-pay' } })
  exigir(p?.status === 'APPROVED' && p?.fulfilledAt, `status=${p?.status}`)
})
await caso('liberou exatamente o curso do plano', async () => {
  const m = await prisma.userCourseEnrollment.findMany({ where: { userId: 'ens-outro' } })
  exigir(m.length === 1 && m[0].courseId === 'ens-curso' && m[0].source === 'PAID', JSON.stringify(m))
})

await caso('pagamento liberado antes de fulfilledAt existir NÃO é liberado de novo', async () => {
  // O estado exato do pagamento de teste de R$ 1,00 em produção.
  await prisma.pricingPlan.create({ data: { id: 'ens-plano2', slug: 'ens-plano2', name: 'Plano Legado', type: 'SINGLE_COURSE',
    interval: 'MONTH', priceCents: 100, coverageType: 'SPECIFIC', coverageData: ['ens-curso'], features: [], soldCount: 1 } })
  await prisma.payment.create({ data: { id: 'ens-legado', userId: 'ens-user', provider: 'mercadopago', amount: 1, plan: 'BASIC',
    status: 'PENDING', pricingPlanId: 'ens-plano2', pricingPlanSlug: 'ens-plano2', providerPaymentId: '999002',
    paidAt: new Date(), expiresAt: new Date(Date.now() + 30 * 864e5), fulfilledAt: null } })
  const r: any = await applyMpPaymentToLocal({ ...mp('approved'), id: 999002, external_reference: 'ens-legado' } as any)
  const plano = await prisma.pricingPlan.findUnique({ where: { id: 'ens-plano2' } })
  const p = await prisma.payment.findUnique({ where: { id: 'ens-legado' } })
  exigir(r.ok && !r.fulfilled, `liberou de novo: ${JSON.stringify(r)}`)
  exigir(plano?.soldCount === 1, `soldCount foi para ${plano?.soldCount}`)
  exigir(p?.status === 'APPROVED', `status=${p?.status} (deveria virar APPROVED)`)
})

console.log('\nMCP')
const mcp = (n: string) => ferramentasMcp.find((f: any) => f.nome === n)!
await caso('listar_concursos conta matérias e questões do edital', async () => {
  const r: any[] = await mcp('listar_concursos').executar({}) as any[]
  const c = r.find((x) => x.slug === 'ens-curso')
  exigir(c?.materias === 2 && c?.questoes === 2, JSON.stringify(c))
})
await caso('cobertura_do_edital acha a lacuna: matéria sem questão', async () => {
  const r: any = await mcp('cobertura_do_edital').executar({ concurso: 'ens-curso' })
  exigir(r.resumo.sem_questao.includes('Português Ensaio'), JSON.stringify(r.resumo))
  const penal = r.materias.find((m: any) => m.materia === 'Direito Penal Ensaio')
  exigir(penal.questoes === 2 && penal.topicos_sem_questao.includes('Prescrição'), JSON.stringify(penal))
})
await caso('desempenho_agregado omite grupo com menos de 3 alunos (privacidade)', async () => {
  const antes: any = await mcp('desempenho_agregado').executar({ concurso: 'ens-curso' })
  exigir(antes.materias.length === 0 && antes.omitidas_por_privacidade === 2, JSON.stringify(antes))
  await prisma.user.create({ data: { id: 'ens-terceiro', name: 'Terceiro', password: 'x', email: 'terceiro@teste.local' } })
  await prisma.userSubjectMastery.create({ data: { userId: 'ens-terceiro', courseId: 'ens-curso', subjectId: 'ens-penal', totalAttempts: 10, correctAttempts: 5 } })
  const depois: any = await mcp('desempenho_agregado').executar({ concurso: 'ens-curso' })
  const penal = depois.materias.find((m: any) => m.materia === 'Direito Penal Ensaio')
  exigir(penal?.alunos === 3, JSON.stringify(depois))
  exigir(!JSON.stringify(depois).includes('ens-user'), 'vazou id de aluno')
})

console.log('\nTEMPO DE ESTUDO (economizador de tempo)')
// Conteúdo com tudo o que pode enganar a contagem: markdown, rascunho mais
// novo que o publicado, resumo, material rejeitado, inativo, tópico arquivado.
const palavras = (n: number, p = 'termo') => Array.from({ length: n }, (_, i) => `${p}${i}`).join(' ')
const markdown11 = '# Tentativa\n\n| Conceito | Artigo |\n|---|---|\n| Tentativa | art. 14 |\n\n- **Início** da execução — sem consumação.\n'
await prisma.topic.create({ data: { id: 'ens-top-tent', subjectId: 'ens-penal', name: 'Tentativa' } })
await prisma.topic.create({ data: { id: 'ens-top-arq', subjectId: 'ens-penal', name: 'Arquivado', archivedAt: new Date() } })
await prisma.topic.create({ data: { id: 'ens-top-crase', subjectId: 'ens-port', name: 'Crase' } })
await prisma.topic.create({ data: { id: 'ens-top-conc', subjectId: 'ens-port', name: 'Concordância' } })
await prisma.topic.create({ data: { id: 'ens-top-vazio', subjectId: 'ens-port', name: 'Só marcação' } })
// Árvore: subassunto sem texto sob assunto com texto (coberto); assunto que só agrupa (coberto pelo filho).
await prisma.topic.create({ data: { id: 'ens-top-tent-filho', subjectId: 'ens-penal', name: 'Tentativa inidônea', parentId: 'ens-top-tent' } })
await prisma.topic.create({ data: { id: 'ens-top-pai', subjectId: 'ens-port', name: 'Pontuação' } })
await prisma.topic.create({ data: { id: 'ens-top-filho', subjectId: 'ens-port', name: 'Vírgula', parentId: 'ens-top-pai' } })
const mat = (id: string, topicId: string, subjectId: string, content: string, extra: Record<string, unknown> = {}) =>
  prisma.material.create({ data: { id, title: id, topicId, subjectId, content, type: 'TEXTO', status: 'PUBLISHED', active: true, ...extra } })
await mat('ens-m-tent', 'ens-top-tent', 'ens-penal', markdown11 + palavras(1189))          // 1200 palavras = 10 min
await mat('ens-m-tent-draft', 'ens-top-tent', 'ens-penal', palavras(5000), { status: 'DRAFT' }) // mais novo, mas rascunho
await mat('ens-m-tent-resumo', 'ens-top-tent', 'ens-penal', palavras(300), { type: 'RESUMO' })  // resumo perde do texto
await mat('ens-m-presc-rej', 'ens-top-presc', 'ens-penal', palavras(9999), { status: 'REJECTED' })
await mat('ens-m-presc-inativo', 'ens-top-presc', 'ens-penal', palavras(4444), { active: false })
await mat('ens-m-arq', 'ens-top-arq', 'ens-penal', palavras(7777))
await mat('ens-m-crase', 'ens-top-crase', 'ens-port', palavras(2400), { status: 'DRAFT' })    // mede, mas não é publicado
await mat('ens-m-vazio', 'ens-top-vazio', 'ens-port', '---\n| | |\n***\n> \n')
await mat('ens-m-crase-resumo', 'ens-top-crase', 'ens-port', palavras(200), { type: 'RESUMO' }) // publicado; o texto segue rascunho
// Questões: anulada e inativa não contam. Tempos: abaixo de 5 s e acima de 15 min ficam fora.
await prisma.question.create({ data: { id: 'ens-q3', subjectId: 'ens-penal', enunciado: 'anulada', alternativas: [], gabarito: 'A', explicacao: '-', anulada: true } })
await prisma.question.create({ data: { id: 'ens-q4', subjectId: 'ens-penal', enunciado: 'inativa', alternativas: [], gabarito: 'A', explicacao: '-', active: false } })
await prisma.question.create({ data: { id: 'ens-qp1', subjectId: 'ens-port', enunciado: 'crase', alternativas: [], gabarito: 'A', explicacao: '-' } })
const tentativa = (questionId: string, timeMs: number) => ({ userId: 'ens-user', questionId, selected: 'A', correct: true, timeMs })
await prisma.questionAttempt.createMany({ data: [
  ...Array.from({ length: 20 }, () => tentativa('ens-q1', 60_000)),
  tentativa('ens-q1', 2_000), tentativa('ens-q2', 3_600_000),
  ...Array.from({ length: 3 }, () => tentativa('ens-qp1', 30_000)),
] })
// Concursos que NÃO podem aparecer na lista pública.
await prisma.course.create({ data: { id: 'ens-inativo', slug: 'ens-inativo', name: 'Curso Inativo', active: false } })
await prisma.edital.create({ data: { courseId: 'ens-inativo', ano: 2027, titulo: 'x', isActive: true, subjects: { create: [{ subjectId: 'ens-penal' }] } } })
await prisma.course.create({ data: { id: 'ens-sem-ativo', slug: 'ens-sem-ativo', name: 'Sem Edital Ativo' } })
await prisma.edital.create({ data: { courseId: 'ens-sem-ativo', ano: 2027, titulo: 'x', isActive: false, subjects: { create: [{ subjectId: 'ens-penal' }] } } })

await caso('conta palavras no SQL ignorando marcação, e escolhe o material certo do tópico', async () => {
  const { porEdital } = await carregarConteudo(new Map([['e', [{ id: 'ens-penal', nome: 'P', peso: 1 }, { id: 'ens-port', nome: 'L', peso: 1 }]]]))
  const [penal, port] = porEdital.get('e')!
  const tent = penal.topicos.find((t: any) => t.id === 'ens-top-tent')
  exigir(tent?.palavras === 1200 && tent?.publicado === true, `Tentativa: ${JSON.stringify(tent)} (publicado de 1200 palavras, não o rascunho nem o resumo)`)
  exigir(penal.topicos.length === 3, `tópico arquivado entrou: ${penal.topicos.map((t: any) => t.id)}`)
  exigir(penal.topicos.find((t: any) => t.id === 'ens-top-tent-filho')?.paiId === 'ens-top-tent', 'a árvore não veio do banco')
  exigir(penal.topicos.find((t: any) => t.id === 'ens-top-presc')?.palavras === null, 'rejeitado/inativo foi medido')
  const vazio = port.topicos.find((t: any) => t.id === 'ens-top-vazio')
  exigir(vazio?.palavras === null && vazio?.publicado === false, `só marcação contou como conteúdo: ${JSON.stringify(vazio)}`)
  const crase = port.topicos.find((t: any) => t.id === 'ens-top-crase')
  // Mede o TEXTO (rascunho, 2.400 palavras), mas conta como publicado: o resumo dele está liberado ao aluno.
  exigir(crase?.palavras === 2400 && crase?.publicado === true, `Crase: ${JSON.stringify(crase)}`)
  exigir(penal.questoes === 2 && port.questoes === 1, `questões: penal=${penal.questoes} port=${port.questoes}`)
  exigir(penal.tempoQuestao?.medianaMs === 60_000 && penal.tempoQuestao?.amostras === 20, `tempo penal: ${JSON.stringify(penal.tempoQuestao)}`)
})
await caso('estimativa do edital confere número a número', async () => {
  const e: any = await estimativaDoEdital('ens-edital')
  const penal = e.materias.find((m: any) => m.id === 'ens-penal')
  const port = e.materias.find((m: any) => m.id === 'ens-port')
  // Penal: Tentativa medida (10 min) + Prescrição herdando a mediana da matéria (10) = 20; o subassunto
  // da Tentativa está coberto pelo texto dela e não soma. 2 questões × 1 min reais.
  exigir(penal.teoriaMin === 20 && penal.topicosMedidos === 1 && penal.topicosPublicados === 1, JSON.stringify(penal))
  exigir(penal.topicosCobertos === 1 && penal.topicosEstimados === 1, JSON.stringify(penal))
  exigir(penal.fonteTempoQuestao === 'medido' && penal.questoesMin === 2, JSON.stringify(penal))
  // Português: Crase 20 min (rascunho mede) + Concordância, Só marcação e Vírgula estimados pela mediana (20 cada) = 80;
  // "Pontuação" só agrupa a Vírgula e não soma. 3 tentativas são poucas → mediana da plataforma.
  exigir(port.teoriaMin === 80 && port.topicosPublicados === 1, JSON.stringify(port))
  exigir(port.topicosCobertos === 1 && port.topicosEstimados === 3, JSON.stringify(port))
  exigir(port.fonteTempoQuestao === 'medido_geral' && port.minPorQuestao === 1, JSON.stringify(port))
  const esperado = 20 + 2 + 20 * REVISAO_FRACAO + 80 + 1 + 80 * REVISAO_FRACAO
  exigir(Math.abs(e.totalMin - esperado) < 0.2, `total ${e.totalMin} ≠ ${esperado.toFixed(1)}`)
})
await caso('lista pública: só curso ativo com edital ativo, e sem dado de aluno', async () => {
  const lista: any[] = await estimativasDosConcursos()
  const slugs = lista.map((c) => c.slug)
  exigir(slugs.includes('ens-curso'), `faltou ens-curso: ${slugs}`)
  exigir(!slugs.includes('ens-inativo') && !slugs.includes('ens-sem-ativo'), `entrou indevido: ${slugs}`)
  const c = lista.find((x) => x.slug === 'ens-curso')
  exigir(c.edital.titulo === 'Edital Ensaio' && typeof c.edital.dataProva === 'string', JSON.stringify(c.edital))
  exigir(!JSON.stringify(lista).includes('ens-user'), 'vazou id de aluno')
})
await caso('rota pública responde com cache de CDN e limita abuso por IP', async () => {
  const pedir = (ip: string) => rotaTempo.GET(new Request('http://ensaio/api/tempo/concursos', { headers: { 'x-forwarded-for': ip } }))
  const r: Response = await pedir('10.0.0.1')
  exigir(r.status === 200, `status ${r.status}`)
  exigir(/s-maxage=3600/.test(r.headers.get('cache-control') ?? ''), `cache-control: ${r.headers.get('cache-control')}`)
  const corpo = await r.json()
  const direto = await estimativaDoEdital('ens-edital')
  exigir(corpo.concursos.find((c: any) => c.slug === 'ens-curso').estimativa.totalMin === direto!.totalMin, 'rota e função discordam')
  let ultimo = 200
  for (let i = 0; i < 30; i++) ultimo = (await pedir('10.0.0.2')).status
  exigir(ultimo === 200, `bloqueou cedo: ${ultimo}`)
  exigir((await pedir('10.0.0.2')).status === 429, '31ª consulta no minuto deveria ser recusada')
})
await caso('cronograma sem editalId usa o edital do curso e o tempo medido', async () => {
  const dto = { courseId: 'ens-curso', hoursPerDay: 3, daysPerWeek: [1, 2, 3, 4, 5],
    startDate: new Date().toISOString(), endDate: new Date(Date.now() + 60 * 864e5).toISOString() }
  const r: any = await runSchedule(dto, 'ens-user')
  exigir(r.editalId === 'ens-edital', `editalId=${r.editalId}`)
  exigir(Object.keys(r.perSubject).sort().join() === 'ens-penal,ens-port', `matérias: ${Object.keys(r.perSubject)}`)
  const e = await estimativaDoEdital('ens-edital')
  exigir(Math.abs(r.totalMinRecommended - e!.totalMin) < 0.5, `cronograma pede ${r.totalMinRecommended} min, estimativa diz ${e!.totalMin}`)
  const plano = await persistSchedule('ens-user', dto, r)
  const salvo = await prisma.studyPlan.findUnique({ where: { id: plano.id } })
  exigir(salvo?.editalId === 'ens-edital', `plano salvo sem edital: ${salvo?.editalId}`)
  exigir(Math.abs(salvo!.totalHoursNeeded * 60 - e!.totalMin) < 0.5, `horas gravadas: ${salvo?.totalHoursNeeded}`)
})

console.log('\nPROVAS ANTERIORES (PF 2021 de verdade)')
await prisma.course.create({ data: { id: 'ens-pf-agente', slug: 'pf-agente', name: 'PF — Agente (ensaio)' } })
await prisma.banca.create({ data: { slug: 'cebraspe', name: 'Cebraspe' } })
await prisma.user.create({ data: { id: 'ens-aluno-pf', name: 'Aluno PF', password: 'x', email: 'aluno-pf@teste.local', hasFullAccess: true } })
await prisma.user.create({ data: { id: 'ens-sem-plano', name: 'Sem Plano', password: 'x', email: 'sem-plano@teste.local' } })
const arqPf = lerArquivoDeProva('pf-2021-agente')
let provaPf = ''

await caso('importa a prova real: 120 itens, textos-base ligados, anulados continuam na prova', async () => {
  const r: any = await importarProva(arqPf)
  provaPf = r.provaId
  exigir(r.itens === 120 && r.anulados === 5 && r.textos === 2, JSON.stringify(r))
  const ativos = await prisma.question.count({ where: { provaId: provaPf, active: true } })
  exigir(ativos === 120, `ativos=${ativos} (anulado não pode sumir da prova)`)
  const q1: any = await prisma.question.findUnique({ where: { id: idDoItem('pf-2021-agente', 1) }, include: { provaTexto: true, subject: true } })
  exigir(q1.provaTexto?.codigo === '2A1-I' && q1.subject?.name === 'Língua Portuguesa' && q1.gabaritoOficial === 'E', JSON.stringify({ t: q1.provaTexto?.codigo, s: q1.subject?.name, g: q1.gabaritoOficial }))
  const q28: any = await prisma.question.findUnique({ where: { id: idDoItem('pf-2021-agente', 28) } })
  exigir(q28.anulada && q28.active && q28.gabarito === '', JSON.stringify(q28))
})
await caso('reimportar não duplica e não apaga o comentário escrito para o item', async () => {
  await prisma.question.update({ where: { id: idDoItem('pf-2021-agente', 2) }, data: { explicacao: 'Comentário do professor.' } })
  await importarProva(arqPf)
  exigir((await prisma.question.count({ where: { provaId: provaPf } })) === 120, 'duplicou itens')
  exigir((await prisma.provaTexto.count({ where: { provaId: provaPf } })) === 2, 'duplicou textos')
  const q2 = await prisma.question.findUnique({ where: { id: idDoItem('pf-2021-agente', 2) } })
  exigir(q2?.explicacao === 'Comentário do professor.', `explicação perdida: ${q2?.explicacao}`)
})
await caso('sem o curso: lista com cadeado, e prova e gabarito recusados', async () => {
  const lista: any = await provasAluno.provasDoCurso('ens-sem-plano', 'pf-agente')
  exigir(lista.acesso === false && lista.provas.length === 1, JSON.stringify({ acesso: lista.acesso, n: lista.provas.length }))
  for (const f of [() => provasAluno.iniciarTentativa('ens-sem-plano', provaPf), () => provasAluno.gabaritoDaProva('ens-sem-plano', provaPf)]) {
    let status = 0
    try { await f() } catch (e: any) { status = e.status }
    exigir(status === 403, `status ${status}`)
  }
})
let tentativa1 = ''
await caso('iniciar: 4h30 do edital, textos e itens SEM gabarito; abrir de novo retoma a mesma', async () => {
  const r: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)
  tentativa1 = r.tentativa.id
  exigir(r.itens.length === 120 && r.textos.length === 2, `itens ${r.itens.length}`)
  exigir(r.tentativa.duracaoMin === 270, `duração ${r.tentativa.duracaoMin}`)
  const vazou = JSON.stringify(r.itens).match(/"gabarito"|gabaritoOficial|explicacao/)
  exigir(!vazou, `gabarito vazou para o navegador: ${vazou}`)
  const deNovo: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)
  exigir(deNovo.retomada && deNovo.tentativa.id === tentativa1, 'não retomou a tentativa aberta')
})
await caso('abrir a prova 3 vezes ao mesmo tempo cria UMA tentativa só', async () => {
  await prisma.provaTentativa.deleteMany({ where: { userId: 'ens-aluno-pf', provaId: provaPf, status: 'EM_ANDAMENTO', id: { not: tentativa1 } } })
  const rs: any[] = await Promise.all([1, 2, 3].map(() => provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)))
  exigir(new Set(rs.map((r) => r.tentativa.id)).size === 1, `ids: ${rs.map((r) => r.tentativa.id)}`)
  const abertas = await prisma.provaTentativa.count({ where: { userId: 'ens-aluno-pf', provaId: provaPf, status: 'EM_ANDAMENTO' } })
  exigir(abertas === 1, `${abertas} tentativas abertas`)
})
await caso('salvar respostas: guarda só alternativa válida de item desta prova', async () => {
  const ids = arqPf.itens.map((i: any) => idDoItem('pf-2021-agente', i.numero))
  const r: any = await provasAluno.salvarRespostas('ens-aluno-pf', tentativa1, { [ids[0]]: 'e', [ids[1]]: 'Z', 'item-de-outra-prova': 'C' })
  exigir(r.salvas === 1, JSON.stringify(r))
  const t: any = await prisma.provaTentativa.findUnique({ where: { id: tentativa1 } })
  exigir(t.respostas[ids[0]] === 'E' && Object.keys(t.respostas).length === 1, JSON.stringify(t.respostas))
})
await caso('entregar com o gabarito inteiro certo: 120 de 120 (115 + 5 anulados)', async () => {
  const respostas = Object.fromEntries(arqPf.itens.filter((i: any) => !i.anulada).map((i: any) => [idDoItem('pf-2021-agente', i.numero), i.gabarito]))
  await provasAluno.entregarTentativa('ens-aluno-pf', tentativa1, { respostas })
  const t: any = await prisma.provaTentativa.findUnique({ where: { id: tentativa1 } })
  exigir(t.status === 'ENTREGUE' && t.pontos === 120 && t.acertos === 115 && t.anuladas === 5, JSON.stringify({ s: t.status, p: t.pontos, a: t.acertos }))
  const historico = await prisma.questionAttempt.count({ where: { userId: 'ens-aluno-pf' } })
  exigir(historico === 115, `tentativas de questão gravadas: ${historico}`)
  const dominio = await prisma.userSubjectMastery.count({ where: { userId: 'ens-aluno-pf', courseId: 'ens-pf-agente' } })
  exigir(dominio === 10, `matérias no domínio: ${dominio}`)
})
await caso('refazer guarda as DUAS tentativas: o histórico não se apaga', async () => {
  const r: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)
  exigir(r.tentativa.id !== tentativa1 && !r.retomada, 'reaproveitou a tentativa entregue')
  // Erra os 24 de Português (marca o contrário) e deixa o resto em branco.
  const lp = arqPf.itens.filter((i: any) => i.materia === 'Língua Portuguesa' && !i.anulada)
  const respostas = Object.fromEntries(lp.map((i: any) => [idDoItem('pf-2021-agente', i.numero), i.gabarito === 'C' ? 'E' : 'C']))
  await provasAluno.entregarTentativa('ens-aluno-pf', r.tentativa.id, { respostas })
  const lista: any = await provasAluno.provasDoCurso('ens-aluno-pf', 'pf-agente')
  const p = lista.provas[0]
  exigir(p.tentativas.length === 2 && p.melhor === 120, JSON.stringify({ n: p.tentativas.length, melhor: p.melhor }))
  const res: any = await provasAluno.resultadoDaTentativa('ens-aluno-pf', r.tentativa.id)
  exigir(res.tentativa.pontos === -24 + 5, `pontos ${res.tentativa.pontos} (24 erros − 24, + 5 anulados)`)
  exigir(res.tentativa.revisar[0]?.materia === 'Língua Portuguesa', JSON.stringify(res.tentativa.revisar.slice(0, 2)))
  exigir(res.anterior?.pontos === 120, `comparação com a anterior: ${JSON.stringify(res.anterior)}`)
  exigir(res.itens.find((i: any) => i.numero === 1).situacao === 'errado' && res.itens.find((i: any) => i.numero === 61).situacao === 'branco', 'situação por item errada')
})
await caso('tempo esgotado: não salva mais, e a entrega usa só o que já estava salvo', async () => {
  const r: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)
  const id1 = idDoItem('pf-2021-agente', 1)
  await provasAluno.salvarRespostas('ens-aluno-pf', r.tentativa.id, { [id1]: 'E' })
  await prisma.provaTentativa.update({ where: { id: r.tentativa.id }, data: { expiraEm: new Date(Date.now() - 10 * 60_000) } })
  let status = 0
  try { await provasAluno.salvarRespostas('ens-aluno-pf', r.tentativa.id, { [id1]: 'C' }) } catch (e: any) { status = e.status }
  exigir(status === 409, `salvou depois do tempo (status ${status})`)
  const tudoCerto = Object.fromEntries(arqPf.itens.filter((i: any) => !i.anulada).map((i: any) => [idDoItem('pf-2021-agente', i.numero), i.gabarito]))
  await provasAluno.entregarTentativa('ens-aluno-pf', r.tentativa.id, { respostas: tudoCerto })
  const t: any = await prisma.provaTentativa.findUnique({ where: { id: r.tentativa.id } })
  exigir(t.status === 'EXPIRADA' && t.pontos === 1 + 5, `status ${t.status}, pontos ${t.pontos} (só o item salvo + anulados)`)
})
await caso('duas abas entregando ao mesmo tempo: corrige uma vez só', async () => {
  const r: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPf)
  const antes = await prisma.questionAttempt.count({ where: { userId: 'ens-aluno-pf' } })
  const respostas = { [idDoItem('pf-2021-agente', 1)]: 'E', [idDoItem('pf-2021-agente', 2)]: 'C' }
  const rs: any[] = await Promise.all([1, 2, 3].map(() => provasAluno.entregarTentativa('ens-aluno-pf', r.tentativa.id, { respostas })))
  exigir(rs.filter((x) => !x.jaEntregue).length === 1, JSON.stringify(rs))
  const depois = await prisma.questionAttempt.count({ where: { userId: 'ens-aluno-pf' } })
  exigir(depois - antes === 2, `gravou ${depois - antes} respostas (deveriam ser 2)`)
})
await caso('desempenho somado nas provas: aponta a matéria a revisar', async () => {
  const d: any = await provasAluno.desempenhoEmProvas('ens-aluno-pf', 'pf-agente')
  exigir(d.tentativas.length === 4, `tentativas ${d.tentativas.length}`)
  exigir(d.revisar.some((m: any) => m.materia === 'Língua Portuguesa'), JSON.stringify(d.revisar.map((m: any) => m.materia)))
})

console.log('\nRESPOSTA DE QUESTÃO (rota rápida)')
await caso('domínio por matéria: 10 respostas simultâneas somam 10, sem perder nenhuma', async () => {
  const base = { userId: 'ens-outro', courseId: 'ens-curso', subjectId: 'ens-port' }
  await prisma.userSubjectMastery.deleteMany({ where: base })
  await Promise.all(Array.from({ length: 10 }, (_, i) => somarAoDominio({ ...base, acertou: i < 7, idNovo: `usm-ensaio-${i}` })))
  const m = await prisma.userSubjectMastery.findUnique({ where: { userId_courseId_subjectId: base } })
  exigir(m?.totalAttempts === 10 && m?.correctAttempts === 7 && m?.masteryScore === 70, JSON.stringify(m))
  const r = await somarAoDominio({ ...base, acertou: false, idNovo: 'usm-ensaio-x' })
  exigir(r.antes === 70 && r.novo === 64 && r.total === 11, JSON.stringify(r))
})

console.log('\nVIGIA DOS CRONS')
process.env.TELEGRAM_BOT_TOKEN = 'token-falso-do-ensaio'
process.env.TELEGRAM_CHAT_ID = '1'
delete process.env.ADMIN_EMAIL
await prisma.$executeRawUnsafe('TRUNCATE cron_execucoes, cron_alertas')
const pedidoCron = () => new Request('http://ensaio/api/cron/x')
const diasAtras = (d: number) => new Date(Date.now() - d * 864e5)

await caso('rodada boa grava; recusada não grava; falha grava e avisa na hora', async () => {
  await monitorarCron('rag-index', async () => Response.json({ processados: 2 }))(pedidoCron())
  await monitorarCron('rag-index', async () => Response.json({ message: 'sem senha' }, { status: 403 }))(pedidoCron())
  const antes = telegram.length
  await monitorarCron('sync', async () => Response.json({ erro: 'x' }, { status: 500 }))(pedidoCron())
  const linhas = await prisma.cronExecucao.findMany({ orderBy: { criadoEm: 'asc' } })
  exigir(linhas.length === 2, `gravou ${linhas.length} (a recusada não podia contar)`)
  exigir(linhas[0].tarefa === 'rag-index' && linhas[0].ok && /processados/.test(linhas[0].detalhe ?? ''), JSON.stringify(linhas[0]))
  exigir(linhas[1].tarefa === 'sync' && !linhas[1].ok && linhas[1].status === 500, JSON.stringify(linhas[1]))
  exigir(telegram.slice(antes).some((t) => t.includes('Tarefa falhou') && t.includes('sync')), `telegram: ${telegram.slice(antes)}`)
})
await caso('vigia recém-ligado: quem ainda não rodou aguarda, ninguém é acusado', async () => {
  const s = Object.fromEntries((await situacaoDasTarefas()).map((x: any) => [x.tarefa, x]))
  exigir(s['rag-index'].estado === 'ok' && s.sync.estado === 'falhando', `${s['rag-index'].estado}/${s.sync.estado}`)
  exigir(s['weekly-backup'].estado === 'aguardando' && !s['weekly-backup'].chaveAtraso, s['weekly-backup'].estado)
  exigir((await avisarAtrasos()).length === 0, 'acusou cedo demais')
})
await caso('cron parado é denunciado pelos outros — uma vez só, mesmo com 3 conferências em paralelo', async () => {
  // O vigia passa a estar no ar há 8 dias: a rodada boa de reconciliar ficou velha.
  await prisma.cronExecucao.create({ data: { tarefa: 'reconciliar-pagamentos', ok: true, duracaoMs: 1, criadoEm: diasAtras(8) } })
  const antes = telegram.length
  const r = await Promise.all([avisarAtrasos(), avisarAtrasos(), avisarAtrasos()])
  const esperado = ['detect-new-editais', 'generate-weekly-mocks', 'reconciliar-pagamentos', 'sync', 'weekly-backup']
  exigir(r.flat().sort().join() === esperado.join(), `avisadas: ${r.flat().sort()}`)
  exigir(telegram.length - antes === 5, `${telegram.length - antes} mensagens para 5 sumiços`)
  exigir(telegram.slice(antes).some((t) => /Tarefa sumiu.*reconciliar-pagamentos/s.test(t)), 'faltou a mensagem com a última rodada boa')
  exigir((await avisarAtrasos()).length === 0, 'avisou o mesmo sumiço de novo')
})
await caso('Telegram fora do ar: a trava é solta e a próxima conferência tenta de novo', async () => {
  await prisma.cronExecucao.create({ data: { tarefa: 'cleanup', ok: true, duracaoMs: 1, criadoEm: diasAtras(40) } })
  telegramFora = true
  exigir((await avisarAtrasos()).length === 0, 'contou como avisado sem entregar')
  exigir((await prisma.cronAlerta.count({ where: { tarefa: 'cleanup' } })) === 0, 'trava ficou presa')
  telegramFora = false
  const r = await avisarAtrasos()
  exigir(r.join() === 'cleanup', `segunda tentativa: ${r}`)
})
await caso('voltou a rodar: deixa de estar atrasada', async () => {
  await monitorarCron('reconciliar-pagamentos', async () => Response.json({ verificados: 0 }))(pedidoCron())
  const s = (await situacaoDasTarefas()).find((x: any) => x.tarefa === 'reconciliar-pagamentos')
  exigir(s.estado === 'ok' && !s.chaveAtraso, JSON.stringify(s))
})

await caso('antes do SQL do vigia rodar em produção: nada quebra, a falha ainda avisa', async () => {
  await prisma.$executeRawUnsafe('DROP TABLE cron_execucoes, cron_alertas')
  let lido: unknown = null
  try { await situacaoDasTarefas() } catch (e) { lido = e }
  exigir(lido && vigiaNaoInstalado(lido), `painel não reconheceu a tabela ausente: ${String(lido).slice(0, 120)}`)
  const ok = await monitorarCron('rag-index', async () => Response.json({ processados: 1 }))(pedidoCron())
  exigir(ok.status === 200, `cron bom quebrou: ${ok.status}`)
  const antes = telegram.length
  const ruim = await monitorarCron('sync', async () => Response.json({ erro: 'x' }, { status: 500 }))(pedidoCron())
  exigir(ruim.status === 500, 'a resposta da tarefa mudou')
  exigir(telegram.slice(antes).some((t) => t.includes('Tarefa falhou')), 'sem tabela, a falha deixou de avisar')
})

console.log('\nREGISTRO DE MIGRAÇÕES (trava do deploy)')
await caso('o SQL das provas se registra; as antigas são reconhecidas pela tabela', async () => {
  const { aplicadas, registro } = await migracoesAplicadas()
  exigir(registro, 'tabela schema_migracoes não existe')
  exigir(aplicadas.includes('2026-11-14-provas-anteriores'), `faltou a das provas: ${aplicadas}`)
  exigir(aplicadas.includes('2026-11-09-cronograma-adaptativo-e-rag'), `faltou a do RAG (sonda material_chunks): ${aplicadas}`)
  // O vigia derrubou cron_execucoes no cenário acima: a sonda tem de perceber.
  exigir(!aplicadas.includes('2026-11-10-vigia-crons'), `acusou o vigia sem a tabela: ${aplicadas}`)
})
await caso('produção antes do SQL (sem o registro): responde, não quebra', async () => {
  await prisma.$executeRawUnsafe('DROP TABLE schema_migracoes')
  const { aplicadas, registro } = await migracoesAplicadas()
  exigir(!registro, 'disse que o registro existe')
  exigir(aplicadas.join() === '2026-11-09-cronograma-adaptativo-e-rag', `lista errada: ${aplicadas}`)
})

await prisma.$disconnect()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS PASSARAM')
process.exit(falhas ? 1 : 0)
