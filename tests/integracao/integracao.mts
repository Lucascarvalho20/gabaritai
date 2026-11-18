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
  // Toda matéria da prova fica no curso: senão os itens somem do banco de questões do aluno.
  const doCurso = await prisma.courseSubject.findMany({ where: { course: { slug: arqPf.curso } }, select: { subject: { select: { name: true } } } })
  const nomes = new Set(doCurso.map((c) => c.subject.name))
  const faltando = [...new Set(arqPf.itens.map((i: any) => i.materia))].filter((m) => !nomes.has(m))
  exigir(faltando.length === 0, `matérias da prova fora do curso: ${faltando}`)
})
await caso('reimportar não duplica e não apaga o comentário escrito para o item', async () => {
  await prisma.question.update({ where: { id: idDoItem('pf-2021-agente', 2) }, data: { explicacao: 'Comentário do professor.' } })
  await importarProva(arqPf)
  exigir((await prisma.question.count({ where: { provaId: provaPf } })) === 120, 'duplicou itens')
  exigir((await prisma.provaTexto.count({ where: { provaId: provaPf } })) === 2, 'duplicou textos')
  const q2 = await prisma.question.findUnique({ where: { id: idDoItem('pf-2021-agente', 2) } })
  exigir(q2?.explicacao === 'Comentário do professor.', `explicação perdida: ${q2?.explicacao}`)
})
await caso('reimportar atualiza a justificativa da banca corrigida no arquivo, e só ela', async () => {
  // Fórmula corrigida no JSON (o caso da PCDF 2021: "3.198160□" virou "3.198/160").
  await prisma.question.update({ where: { id: idDoItem('pf-2021-agente', 3) }, data: { explicacao: 'Justificativa oficial da banca: CERTO. 3.198160□ = 19,98.' } })
  const corrigido = { ...arqPf, itens: arqPf.itens.map((i: any) => i.numero === 3 ? { ...i, explicacao: 'Justificativa oficial da banca: CERTO. 3.198/160 = 19,98.' } : i) }
  await importarProva(corrigido)
  const [q3, q2] = await Promise.all([3, 2].map((n) => prisma.question.findUnique({ where: { id: idDoItem('pf-2021-agente', n) } })))
  exigir(q3?.explicacao === 'Justificativa oficial da banca: CERTO. 3.198/160 = 19,98.', `justificativa não atualizou: ${q3?.explicacao}`)
  exigir(q2?.explicacao === 'Comentário do professor.', `comentário do professor perdido: ${q2?.explicacao}`)
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
await caso('anotação da tentativa: o aluno escreve, lê no resultado e no histórico; vazio apaga', async () => {
  const r: any = await provasAluno.anotarTentativa('ens-aluno-pf', tentativa1, '  fui mediano:\u0007 errei crase  \n\n\n\nna próxima, Penal primeiro  ')
  exigir(r.anotacao === 'fui mediano: errei crase\n\nna próxima, Penal primeiro', JSON.stringify(r.anotacao))
  const res: any = await provasAluno.resultadoDaTentativa('ens-aluno-pf', tentativa1)
  exigir(res.tentativa.anotacao === r.anotacao, 'o resultado não traz a anotação')
  const lista: any = await provasAluno.provasDoCurso('ens-aluno-pf', 'pf-agente')
  const t1 = lista.provas.flatMap((p: any) => p.tentativas).find((t: any) => t.id === tentativa1)
  exigir(t1?.anotacao === r.anotacao && typeof t1.tempoMs === 'number', JSON.stringify(t1))
  const longa: any = await provasAluno.anotarTentativa('ens-aluno-pf', tentativa1, 'x'.repeat(900))
  exigir(longa.anotacao.length === 500, `tamanho ${longa.anotacao.length}`)
  const vazia: any = await provasAluno.anotarTentativa('ens-aluno-pf', tentativa1, '   ')
  exigir(vazia.anotacao === null && (await prisma.provaTentativa.findUnique({ where: { id: tentativa1 } }))?.anotacao === null, 'vazio deveria apagar')
})
await caso('anotação na tentativa de OUTRO aluno: 404, como se não existisse, e nada muda', async () => {
  await provasAluno.anotarTentativa('ens-aluno-pf', tentativa1, 'minha anotação')
  let status = 0
  try { await provasAluno.anotarTentativa('ens-outro', tentativa1, 'invasão') } catch (e: any) { status = e.status }
  exigir(status === 404, `status ${status}`)
  exigir((await prisma.provaTentativa.findUnique({ where: { id: tentativa1 } }))?.anotacao === 'minha anotação', 'a anotação mudou')
})

console.log('\nPROVA DE MÚLTIPLA ESCOLHA (PMDF 2023 de verdade)')
{
  await prisma.course.create({ data: { id: 'ens-pmdf', slug: 'pmdf-soldado', name: 'PMDF — Soldado (ensaio)' } })
  const arqPm = lerArquivoDeProva('pmdf-2023-soldado')
  let provaPm = ''
  await caso('importa 80 questões A–E: banca nova entra no cadastro e o destaque da prova continua', async () => {
    const r: any = await importarProva(arqPm)
    provaPm = r.provaId
    exigir(r.itens === 80 && r.anulados === 3, JSON.stringify(r))
    const banca = await prisma.banca.findUnique({ where: { slug: 'instituto-aocp' } })
    exigir(banca?.name === 'Instituto AOCP', `banca: ${JSON.stringify(banca)}`)
    const q3: any = await prisma.question.findUnique({ where: { id: idDoItem('pmdf-2023-soldado', 3) } })
    exigir(Array.isArray(q3.alternativas) && q3.alternativas.map((a: any) => a.letra).join('') === 'ABCDE', JSON.stringify(q3.alternativas))
    exigir(/<u>até<\/u>/.test(q3.alternativas[0].texto), `sublinhado perdido: ${q3.alternativas[0].texto}`)
    exigir(q3.gabaritoOficial === 'C', `gabarito ${q3.gabaritoOficial}`)
  })
  await caso('nota de múltipla escolha: erro não desconta e anulada vale para todos', async () => {
    const r: any = await provasAluno.iniciarTentativa('ens-aluno-pf', provaPm)
    exigir(r.tentativa.duracaoMin === 300 && r.itens.length === 80, `duração ${r.tentativa.duracaoMin}, itens ${r.itens.length}`)
    const outra = (l: string) => (l === 'E' ? 'A' : String.fromCharCode(l.charCodeAt(0) + 1))
    const validas = arqPm.itens.filter((i: any) => !i.anulada)
    // erra as 10 primeiras de propósito, acerta o resto
    const respostas = Object.fromEntries(validas.map((i: any, k: number) => [idDoItem('pmdf-2023-soldado', i.numero), k < 10 ? outra(i.gabarito) : i.gabarito]))
    await provasAluno.entregarTentativa('ens-aluno-pf', r.tentativa.id, { respostas })
    const t: any = await prisma.provaTentativa.findUnique({ where: { id: r.tentativa.id } })
    // 77 válidas: 67 acertos + 3 anuladas = 70; as 10 erradas não tiram ponto
    exigir(t.acertos === 67 && t.erros === 10 && t.anuladas === 3 && t.pontos === 70 && t.pontosMax === 80,
      JSON.stringify({ acertos: t.acertos, erros: t.erros, anuladas: t.anuladas, pontos: t.pontos, max: t.pontosMax }))
  })
}

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

console.log('\nCADASTRO E LOGIN (quem chega entra; senha e CPF não vazam)')
{
  const { NextRequest } = await import('next/server')
  const rota = (p: string) => import(new URL(`../../src/app/api/${p}/route.ts`, import.meta.url).href)
  const [rCadastro, rLogin] = await Promise.all([rota('auth/register'), rota('auth/login')])
  const { decryptCpf } = await import(W + 'cpf.ts')
  const { getUserContentMode } = await import(W + 'trial-content.ts')
  const CPF = '12345678909' // dígitos verificadores válidos
  const post = (modulo: any, caminho: string, corpo: unknown, ip: string) =>
    modulo.POST(new NextRequest(`http://localhost${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(corpo),
    }))
  // Sem Resend, o e-mail cai no "modo dev" e é impresso no console: silencia.
  const cadastrar = async (corpo: unknown, ip = '10.0.0.1') => {
    const log = console.log
    console.log = () => {}
    try { return await post(rCadastro, '/api/auth/register', corpo, ip) } finally { console.log = log }
  }
  const entrar = (email: string, password: string, ip: string) => post(rLogin, '/api/auth/login', { email, password }, ip)

  await caso('cadastro novo entra: 201, senha só em bcrypt, CPF só em hash e cifrado, 7 dias de teste', async () => {
    const r = await cadastrar({ name: 'Aluna Nova', email: ' Nova@Teste.Local ', password: 'senha-de-teste-1', cpf: '123.456.789-09' })
    const texto = await r.text()
    exigir(r.status === 201, `status ${r.status}: ${texto}`)
    exigir(!texto.includes('senha-de-teste-1') && !texto.includes(CPF) && !texto.includes('$2'), 'a resposta devolveu senha, CPF ou hash')
    const u = await prisma.user.findUnique({ where: { email: 'nova@teste.local' }, include: { trials: true } })
    exigir(!!u, 'conta não gravada com o e-mail normalizado')
    exigir(u!.password.startsWith('$2') && u!.password !== 'senha-de-teste-1', 'senha fora do bcrypt')
    exigir(/^[0-9a-f]{64}$/.test(u!.cpfHash ?? ''), `cpfHash ${u!.cpfHash}`)
    exigir(!u!.cpfEncrypted!.includes(CPF) && decryptCpf(u!.cpfEncrypted!) === CPF, 'CPF cifrado errado')
    const dias = (u!.trials[0]?.endsAt.getTime() - Date.now()) / 864e5
    exigir(u!.trials.length === 1 && dias > 6.9 && dias <= 7, `teste de ${dias.toFixed(2)} dias`)
  })
  await caso('o mesmo e-mail ou o mesmo CPF não abrem segunda conta: 409', async () => {
    const mesmoEmail = await cadastrar({ name: 'Outra', email: 'NOVA@teste.local', password: 'outra-senha-1', cpf: '529.982.247-25' })
    const mesmoCpf = await cadastrar({ name: 'Outra', email: 'outra@teste.local', password: 'outra-senha-1', cpf: CPF })
    exigir(mesmoEmail.status === 409 && mesmoCpf.status === 409, `e-mail ${mesmoEmail.status}, CPF ${mesmoCpf.status}`)
    const contas = await prisma.user.count({ where: { email: { in: ['nova@teste.local', 'outra@teste.local'] } } })
    exigir(contas === 1, `${contas} contas`)
  })
  await caso('dado inválido não entra: CPF com dígito errado, senha curta, campo faltando → 400', async () => {
    const rs = [
      await cadastrar({ name: 'X', email: 'x1@teste.local', password: 'senha-123', cpf: '123.456.789-00' }, '10.0.0.2'),
      await cadastrar({ name: 'X', email: 'x2@teste.local', password: '12345', cpf: '529.982.247-25' }, '10.0.0.2'),
      await cadastrar({ name: 'X', email: 'x3@teste.local', password: 'senha-123' }, '10.0.0.2'),
    ]
    exigir(rs.every((r) => r.status === 400), rs.map((r) => r.status).join(', '))
    const gravadas = await prisma.user.count({ where: { email: { in: ['x1@teste.local', 'x2@teste.local', 'x3@teste.local'] } } })
    exigir(gravadas === 0, `${gravadas} contas inválidas gravadas`)
  })
  await caso('login: senha certa entra com cookie httpOnly; senha errada e e-mail que não existe dão a mesma resposta', async () => {
    const ok = await entrar('nova@teste.local', 'senha-de-teste-1', '10.0.0.3')
    const corpo = await ok.json()
    const cookie = ok.headers.get('set-cookie') ?? ''
    exigir(ok.status === 200 && typeof corpo.token === 'string', `status ${ok.status}`)
    exigir(/gabaritai_token=/.test(cookie) && /httponly/i.test(cookie), `cookie: ${cookie}`)
    exigir(!JSON.stringify(corpo).includes('$2') && !('password' in corpo.user), 'o login devolveu o hash da senha')
    const errada = await entrar('nova@teste.local', 'senha-errada', '10.0.0.4')
    const ninguem = await entrar('ninguem@teste.local', 'senha-errada', '10.0.0.4')
    const [de, dn] = [await errada.json(), await ninguem.json()]
    exigir(errada.status === 401 && ninguem.status === 401 && de.message === dn.message,
      `${errada.status} "${de.message}" × ${ninguem.status} "${dn.message}"`)
  })
  await caso('passados os 7 dias, a conta continua entrando e organizando, mas o conteúdo fecha', async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { email: 'nova@teste.local' } })
    exigir((await getUserContentMode(u.id)) === 'TRIAL_RESUMOS', 'no teste de 7 dias devia ver conteúdo')
    await prisma.trialPeriod.updateMany({ where: { userId: u.id }, data: { endsAt: new Date(Date.now() - 864e5) } })
    const modo = await getUserContentMode(u.id)
    exigir(modo === 'FREE_PLANNER', `depois do teste: ${modo}`)
    const login = await entrar('nova@teste.local', 'senha-de-teste-1', '10.0.0.5')
    exigir(login.status === 200, `login depois do teste: ${login.status}`)
  })
  await caso('em produção, o cadastro nunca devolve o link de confirmar e-mail', async () => {
    const antes = { NODE_ENV: process.env.NODE_ENV, CPF_SALT: process.env.CPF_SALT, CPF_ENCRYPTION_KEY: process.env.CPF_ENCRYPTION_KEY }
    Object.assign(process.env, { NODE_ENV: 'production', CPF_SALT: 'sal-do-ensaio', CPF_ENCRYPTION_KEY: 'chave-do-ensaio-com-32-bytes-ok!' })
    try {
      const r = await cadastrar({ name: 'Prod', email: 'prod@teste.local', password: 'senha-de-teste-2', cpf: '529.982.247-25' }, '10.0.0.6')
      const d = await r.json()
      exigir(r.status === 201 && d.emailMode === 'dev' && !('devVerifyUrl' in d), `status ${r.status}, link ${'devVerifyUrl' in d ? 'na resposta' : 'ausente'}`)
    } finally {
      for (const [k, v] of Object.entries(antes)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  })
}

console.log('\nPAYWALL (conta gratuita organiza; conteúdo é do plano pago)')
{
  const { NextRequest } = await import('next/server')
  const { signToken } = await import(W + 'jwt.ts')
  const rota = (p: string) => import(new URL(`../../src/app/api/${p}/route.ts`, import.meta.url).href)
  const [rSessao, rQuestoes, rSimulado, rImprimir, rDiag, rGerar] = await Promise.all([
    rota('sessao/[id]'), rota('me/questoes'), rota('simulados/[id]'), rota('simulados/[id]/print'),
    rota('me/diagnostico/start'), rota('ai/gerar'),
  ])
  await prisma.user.createMany({ data: [
    { id: 'pw-gratis', name: 'Plano Gratuito', password: 'x', email: 'gratis@teste.local' },
    { id: 'pw-trial', name: 'Em Trial', password: 'x', email: 'trial@teste.local' },
  ] })
  await prisma.trialPeriod.create({ data: { userId: 'pw-trial', endsAt: new Date(Date.now() + 5 * 864e5) } })
  for (const userId of ['pw-gratis', 'pw-trial'])
    await prisma.userCourseEnrollment.create({ data: { userId, courseId: 'ens-curso', isPrimary: true, isActive: true } })
  await prisma.question.create({ data: { id: 'pw-q1', subjectId: 'ens-penal', enunciado: 'Questão oficial do paywall', alternativas: [], gabarito: 'C', explicacao: 'explicação que só o plano pago vê', source: 'OFFICIAL' } })
  const sessoes: Record<string, string> = {}
  for (const userId of ['pw-gratis', 'pw-trial']) {
    const plano = await prisma.studyPlan.create({ data: { userId, courseId: 'ens-curso', hoursPerDay: 2, daysPerWeek: [1, 2, 3, 4, 5], startDate: new Date(), endDate: new Date(Date.now() + 30 * 864e5) } })
    sessoes[userId] = (await prisma.studyPlanSession.create({ data: { studyPlanId: plano.id, date: new Date(), durationMin: 50, subjectId: 'ens-penal' } })).id
  }
  const simulado = await prisma.mockExam.create({ data: { title: 'Simulado do paywall', questions: ['pw-q1'], courseId: 'ens-curso' } })
  const pedido = async (sub: string, caminho: string, metodo = 'GET', corpo?: unknown) =>
    new NextRequest(`http://localhost${caminho}`, {
      method: metodo,
      headers: { authorization: `Bearer ${await signToken({ sub })}`, 'content-type': 'application/json' },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    })
  // Nenhuma chamada a modelo de IA pode sair de uma conta gratuita.
  const chamadasIA: string[] = []
  const fetchAntes = globalThis.fetch
  globalThis.fetch = (async (url: any, init?: any) => {
    if (/generativelanguage|groq\.com|openai\.com|anthropic\.com|deepseek/.test(String(url))) chamadasIA.push(String(url))
    return fetchAntes(url, init)
  }) as typeof fetch

  await caso('sessão de estudo no gratuito: checklist e cronômetro, sem questão, flashcard nem resumo', async () => {
    const r = await rSessao.GET(await pedido('pw-gratis', `/api/sessao/${sessoes['pw-gratis']}`), { params: { id: sessoes['pw-gratis'] } })
    const d = await r.json()
    exigir(r.status === 200 && d.locked === true && d.session?.durationMin === 50, `status ${r.status}, locked ${d.locked}`)
    exigir(d.officialQuestions.length === 0 && d.aiQuestions.length === 0 && d.flashcards.length === 0 && d.resumo === null,
      JSON.stringify({ oficiais: d.officialQuestions.length, ia: d.aiQuestions.length, resumo: d.resumo }))
    exigir(!JSON.stringify(d).includes('só o plano pago vê'), 'a explicação vazou na resposta')
  })
  await caso('aba Questões no gratuito: 403, sem enunciado', async () => {
    const r = await rQuestoes.GET(await pedido('pw-gratis', '/api/me/questoes'))
    const d = await r.json()
    exigir(r.status === 403 && d.locked === true && d.questions.length === 0, `status ${r.status}`)
  })
  await caso('simulado que não iniciou, no gratuito: 403 ao abrir e ao imprimir', async () => {
    const ctx = { params: { id: simulado.id } }
    const abrir = await rSimulado.GET(await pedido('pw-gratis', `/api/simulados/${simulado.id}`), ctx)
    const imprimir = await rImprimir.GET(await pedido('pw-gratis', `/api/simulados/${simulado.id}/print`), ctx)
    exigir(abrir.status === 403 && imprimir.status === 403, `abrir ${abrir.status}, imprimir ${imprimir.status}`)
  })
  await caso('diagnóstico inicial e geração com IA no gratuito: 403, sem chamar o modelo', async () => {
    const diag = await rDiag.POST(await pedido('pw-gratis', '/api/me/diagnostico/start', 'POST', {}))
    const gerar = await rGerar.POST(await pedido('pw-gratis', '/api/ai/gerar', 'POST', { tipo: 'questoes', materia: 'Penal', curso: 'Ensaio' }))
    exigir(diag.status === 403 && gerar.status === 403, `diagnóstico ${diag.status}, gerar ${gerar.status}`)
    exigir(chamadasIA.length === 0, `uma conta gratuita chamou a IA: ${chamadasIA[0]}`)
  })
  await caso('trial vê o conteúdo: sessão com questões, aba Questões e simulado abrem', async () => {
    const r = await rSessao.GET(await pedido('pw-trial', `/api/sessao/${sessoes['pw-trial']}`), { params: { id: sessoes['pw-trial'] } })
    const d = await r.json()
    exigir(r.status === 200 && d.locked === false && d.officialQuestions.some((q: any) => q.id === 'pw-q1'), `status ${r.status}, locked ${d.locked}`)
    const q = await rQuestoes.GET(await pedido('pw-trial', '/api/me/questoes'))
    const sim = await rSimulado.GET(await pedido('pw-trial', `/api/simulados/${simulado.id}`), { params: { id: simulado.id } })
    exigir(q.status === 200 && sim.status === 200, `questões ${q.status}, simulado ${sim.status}`)
  })
  globalThis.fetch = fetchAntes
}

console.log('\nMENTOR NA SESSÃO DE ESTUDO (busca pela matéria + modelo local)')
{
  const { NextRequest } = await import('next/server')
  const { signToken } = await import(W + 'jwt.ts')
  const rChat = await import(new URL('../../src/app/api/ai/chat/route.ts', import.meta.url).href)
  await prisma.user.create({ data: { id: 'mentor-aluno', name: 'Aluna do Mentor', password: 'x', email: 'mentor@teste.local' } })
  await prisma.userCourseEnrollment.create({ data: { userId: 'mentor-aluno', courseId: 'ens-curso', isPrimary: true, isActive: true } })
  await prisma.trialPeriod.create({ data: { userId: 'mentor-aluno', endsAt: new Date(Date.now() + 5 * 864e5) } })
  // Um "Ollama" de mentira, no formato da OpenAI que o Ollama de verdade fala.
  const pedidos: any[] = []
  const fetchAntes = globalThis.fetch
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url) === 'http://ollama.ensaio/v1/chat/completions') {
      pedidos.push(JSON.parse(init.body))
      return Response.json({ choices: [{ message: { content: 'Resposta do modelo local.' } }] })
    }
    return fetchAntes(url, init)
  }) as typeof fetch
  process.env.OLLAMA_URL = 'http://ollama.ensaio'
  const perguntar = async (extra: object, sub = 'mentor-aluno') => {
    const r = await rChat.POST(new NextRequest('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { authorization: `Bearer ${await signToken({ sub })}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'o que é prescrição penal?', ...extra }),
    }))
    return { status: r.status, d: await r.json() }
  }
  try {
    await caso('da sessão de Penal: busca no material de Penal e responde pelo modelo local', async () => {
      const { status, d } = await perguntar({ subjectId: 'ens-penal', topicId: 'ens-top-presc' })
      exigir(status === 200 && d.provider === 'ollama' && d.response === 'Resposta do modelo local.', JSON.stringify({ status, provider: d.provider, msg: d.message }))
      exigir(d.fontes.length > 0 && d.fontes.every((f: any) => f.titulo === 'Prescrição penal'), JSON.stringify(d.fontes))
      const sistema = pedidos.at(-1).messages[0].content
      exigir(sistema.includes('sessão de estudo de Direito Penal Ensaio, tópico "Prescrição"'), 'o prompt não diz a matéria da sessão')
    })
    await caso('matéria de fora do edital do aluno é ignorada: nada do material de outro curso', async () => {
      const { status, d } = await perguntar({ subjectId: 'ens-contab' })
      exigir(status === 200, `status ${status}`)
      exigir(!d.fontes.some((f: any) => f.titulo === 'Prescrição tributária'), `vazou: ${JSON.stringify(d.fontes)}`)
      exigir(!pedidos.at(-1).messages[0].content.includes('Contabilidade Ensaio'), 'o prompt citou a matéria de fora')
    })
    await caso('token assinado de conta que não existe mais: 401, sem plano nem cota, sem chamar modelo', async () => {
      const antes = pedidos.length
      const { status } = await perguntar({ subjectId: 'ens-penal' }, 'conta-apagada')
      exigir(status === 401 && pedidos.length === antes, `status ${status}, chamadas ao modelo ${pedidos.length - antes}`)
    })
  } finally {
    globalThis.fetch = fetchAntes
    delete process.env.OLLAMA_URL
  }
}

console.log('\nCALCULADORA DE TEMPO (cursos do aluno + edital em PDF)')
{
  const { NextRequest } = await import('next/server')
  const { signToken } = await import(W + 'jwt.ts')
  const { similaridade, juntar } = await import(W + 'calculadora.ts')
  const rCalc = await import(new URL('../../src/app/api/me/calculadora/route.ts', import.meta.url).href)
  const rEdital = await import(new URL('../../src/app/api/me/calculadora/edital/route.ts', import.meta.url).href)

  // Um curso irmão (mesmas matérias do ens-curso) e um distante (só Contabilidade).
  await prisma.course.create({ data: { id: 'calc-irmao', slug: 'calc-irmao', name: 'Curso Irmão' } })
  await prisma.edital.create({ data: { courseId: 'calc-irmao', ano: 2027, titulo: 'Edital Irmão', isActive: true,
    subjects: { create: [{ subjectId: 'ens-penal', weight: 15, expectedQuestions: 15 }, { subjectId: 'ens-port', weight: 10, expectedQuestions: 10 }] } } })
  await prisma.course.create({ data: { id: 'calc-distante', slug: 'calc-distante', name: 'Curso Distante' } })
  await prisma.edital.create({ data: { courseId: 'calc-distante', ano: 2027, titulo: 'Edital Distante', isActive: true,
    subjects: { create: [{ subjectId: 'ens-contab', weight: 20 }] } } })
  // O robô de editais achou um edital mais novo do ens-curso, ainda em revisão.
  await prisma.edital.create({ data: { courseId: 'ens-curso', ano: 2028, titulo: 'Edital Ensaio 2028 (rascunho)', isActive: false } })

  const em5dias = new Date(Date.now() + 5 * 864e5)
  await prisma.user.create({ data: { id: 'calc-livre', name: 'Conta Gratuita', password: 'x', email: 'calc-livre@teste.local' } })
  await prisma.userCourseEnrollment.create({ data: { userId: 'calc-livre', courseId: 'ens-curso', isPrimary: true, isActive: true } })
  await prisma.user.create({ data: { id: 'calc-pago', name: 'Aluno de Três Cursos', password: 'x', email: 'calc-pago@teste.local' } })
  await prisma.trialPeriod.create({ data: { userId: 'calc-pago', endsAt: em5dias } })
  for (const [courseId, isPrimary] of [['calc-irmao', false], ['ens-curso', true], ['calc-distante', false]] as const)
    await prisma.userCourseEnrollment.create({ data: { userId: 'calc-pago', courseId, isPrimary, isActive: true } })
  await prisma.user.create({ data: { id: 'calc-um', name: 'Aluno de Um Curso', password: 'x', email: 'calc-um@teste.local' } })
  await prisma.trialPeriod.create({ data: { userId: 'calc-um', endsAt: em5dias } })
  await prisma.userCourseEnrollment.create({ data: { userId: 'calc-um', courseId: 'calc-irmao', isPrimary: true, isActive: true } })

  const cabecalho = async (sub: string) => ({ authorization: `Bearer ${await signToken({ sub })}` })
  const cursosDe = async (sub: string) => {
    const r = await rCalc.GET(new NextRequest('http://localhost/api/me/calculadora', { headers: await cabecalho(sub) }))
    return { status: r.status, d: await r.json() }
  }

  await caso('conta gratuita: só o edital em PDF — a conta pelo conteúdo do curso é do plano pago', async () => {
    const { status, d } = await cursosDe('calc-livre')
    exigir(status === 200 && d.modo === 'gratuito' && d.cursos.length === 0, JSON.stringify(d))
  })
  await caso('plano pago: só os cursos do aluno, o principal primeiro, com estimativa e o edital novo avisado', async () => {
    const { status, d } = await cursosDe('calc-pago')
    exigir(status === 200 && d.modo === 'pago', `${status} ${d.modo}`)
    exigir(d.cursos.map((c: any) => c.courseId).join() === 'ens-curso,calc-distante,calc-irmao', d.cursos.map((c: any) => c.courseId).join())
    const ens = d.cursos[0]
    exigir(ens.principal && ens.estimativa.totalMin > 0 && ens.editalNovoEmRevisao?.ano === 2028, JSON.stringify({ p: ens.principal, t: ens.estimativa.totalMin, n: ens.editalNovoEmRevisao }))
    const irmao = d.cursos.find((c: any) => c.courseId === 'calc-irmao')
    exigir(irmao.editalNovoEmRevisao === null, 'o irmão não tem edital novo')
    exigir(irmao.estimativa.materias.find((m: any) => m.id === 'ens-penal').questoesNaProva === 15, 'questões da matéria na prova')
  })
  await caso('dois cursos parecidos juntam (matéria comum uma vez); o distante não', async () => {
    const { d } = await cursosDe('calc-pago')
    const [ens, distante, irmao] = d.cursos
    exigir(similaridade(ens.estimativa, irmao.estimativa).parecidos, 'irmão deveria ser parecido')
    exigir(!similaridade(ens.estimativa, distante.estimativa).parecidos, 'distante não deveria ser parecido')
    const j = juntar(ens.estimativa, irmao.estimativa)
    exigir(j.materias.length === 2 && j.totalMin < ens.estimativa.totalMin + irmao.estimativa.totalMin, `${j.materias.length} ${j.totalMin}`)
  })
  await caso('aluno de um curso não vê o curso de outro aluno', async () => {
    const { d } = await cursosDe('calc-um')
    exigir(d.modo === 'pago' && d.cursos.length === 1 && d.cursos[0].courseId === 'calc-irmao', JSON.stringify(d.cursos.map((c: any) => c.courseId)))
  })

  // A "IA": responde no formato do Gemini, com o JSON que estiver em `resposta`.
  let resposta: unknown = null
  let chamadasIA = 0
  const fetchAntes = globalThis.fetch
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).includes(':generateContent')) {
      chamadasIA++
      return Response.json({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(resposta) + '\n```' }] } }] })
    }
    return fetchAntes(url, init)
  }) as typeof fetch
  const editalValido = {
    editalGeral: { orgao: 'Polícia Ensaio', banca: 'Cebraspe', ano: 2027, dataProva: '2027-08-15' },
    cargos: [{ nome: 'Agente', totalQuestoes: 120, materias: [
      { nome: 'Noções de Direito Penal Ensaio', qtdQuestoes: 20, peso: 1, topicos: [{ nome: 'Prescrição', subtopicos: [] }, { nome: 'Tentativa', subtopicos: ['Idônea', 'Inidônea'] }] },
      { nome: 'Geografia do DF', qtdQuestoes: 5, peso: null, topicos: [{ nome: 'Relevo', subtopicos: [] }] },
    ] }],
  }
  const pdf = (marca: string, tamanho = 0) => Buffer.concat([Buffer.from(`%PDF-1.7\n${marca}\n`), Buffer.alloc(tamanho)])
  // Cada envio de um IP diferente: o limite por IP tem caso próprio, no fim.
  let ipSeq = 0
  const enviar = async (sub: string | null, arquivo: Buffer, ip = `198.51.100.${++ipSeq}`) => {
    const fd = new FormData()
    fd.append('pdf', new Blob([arquivo], { type: 'application/pdf' }), 'edital.pdf')
    const r = await rEdital.POST(new NextRequest('http://localhost/api/me/calculadora/edital', {
      method: 'POST', body: fd, headers: { ...(sub ? await cabecalho(sub) : {}), 'x-forwarded-for': ip },
    }))
    return { status: r.status, d: await r.json() }
  }
  const cota = async (userId: string) =>
    (await prisma.dailyAIQuota.findMany({ where: { userId, kind: 'edital_aluno' } })).reduce((s: number, q: any) => s + q.count, 0)

  try {
    await caso('sem login: as duas rotas recusam (401)', async () => {
      const r1 = await rCalc.GET(new NextRequest('http://localhost/api/me/calculadora'))
      const { status } = await enviar(null, pdf('x'))
      exigir(r1.status === 401 && status === 401 && chamadasIA === 0, `${r1.status} ${status}`)
    })
    await caso('PDF da conta gratuita: a IA lê, e a matéria do site dá o tempo por tópico', async () => {
      resposta = editalValido
      const { status, d } = await enviar('calc-livre', pdf('edital-a'))
      exigir(status === 200 && !d.doCache && chamadasIA === 1, `${status} ${JSON.stringify(d).slice(0, 200)}`)
      exigir(d.edital.orgao === 'Polícia Ensaio' && d.edital.dataProva === '2027-08-15', JSON.stringify(d.edital))
      const est = d.cargos[0].estimativa
      const penal = est.materias.find((m: any) => m.nome === 'Noções de Direito Penal Ensaio')
      exigir(penal.topicos === 3 && penal.base === 'materia' && penal.materiaDoSite === 'Direito Penal Ensaio' && penal.pontos === 20, JSON.stringify(penal))
      const geo = est.materias.find((m: any) => m.nome === 'Geografia do DF')
      exigir(geo.base === 'plataforma' && geo.pontos === 5, JSON.stringify(geo))
      exigir(await cota('calc-livre') === 1, 'a leitura conta 1 na cota')
    })
    await caso('o mesmo PDF de novo sai do cache: a IA não trabalha e a cota não gasta', async () => {
      const { status, d } = await enviar('calc-pago', pdf('edital-a'))
      exigir(status === 200 && d.doCache && chamadasIA === 1 && await cota('calc-pago') === 0, `${status} cache=${d.doCache} ia=${chamadasIA}`)
      const guardado = await prisma.aIGenerationCache.findFirst({ where: { kind: 'edital_aluno' } })
      exigir(!JSON.stringify(guardado?.content).includes('%PDF'), 'o arquivo não pode ficar guardado')
    })
    await caso('arquivo que não é PDF: 400; PDF acima de 4 MB: 413 — sem chamar a IA', async () => {
      const falso = await enviar('calc-livre', Buffer.from('<html>oi</html>'))
      const grande = await enviar('calc-livre', pdf('grande', 4 * 1024 * 1024))
      exigir(falso.status === 400 && grande.status === 413 && chamadasIA === 1, `${falso.status} ${grande.status} ia=${chamadasIA}`)
    })
    await caso('documento que não é edital: 422 com a explicação — e conta na cota (a IA trabalhou)', async () => {
      resposta = { erro: 'é um boleto bancário' }
      const { status, d } = await enviar('calc-livre', pdf('boleto'))
      exigir(status === 422 && /boleto/.test(d.message) && await cota('calc-livre') === 2, `${status} ${d.message}`)
      exigir(!(await prisma.aIGenerationCache.findMany({ where: { kind: 'edital_aluno' } })).some((c: any) => JSON.stringify(c.content).includes('boleto')), 'erro não vai para o cache')
    })
    await caso('texto colado: a mesma leitura, pelo texto', async () => {
      resposta = editalValido
      const r = await rEdital.POST(new NextRequest('http://localhost/api/me/calculadora/edital', {
        method: 'POST', headers: { ...(await cabecalho('calc-livre')), 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.200' },
        body: JSON.stringify({ texto: 'EDITAL Nº 1. Data da prova 15/08/2027. CONTEÚDO PROGRAMÁTICO: ' + 'Direito Penal: prescrição, tentativa. '.repeat(20) }),
      }))
      const d = await r.json()
      exigir(r.status === 200 && d.cargos[0].estimativa.materias.length === 2 && await cota('calc-livre') === 3, `${r.status} ${JSON.stringify(d).slice(0, 160)}`)
    })
    await caso('cota diária: no limite, 429 sem chamar a IA', async () => {
      for (const marca of ['b', 'c']) exigir((await enviar('calc-livre', pdf(marca))).status === 200, `envio ${marca}`)
      const antes = chamadasIA
      const { status, d } = await enviar('calc-livre', pdf('d'))
      exigir(status === 429 && chamadasIA === antes && /amanhã/i.test(d.message), `${status} ia=${chamadasIA - antes} ${d.message}`)
    })
    await caso('muitos envios do mesmo IP num minuto: 429 antes de qualquer leitura', async () => {
      const respostas = []
      for (let i = 0; i < 7; i++) respostas.push(await enviar('calc-pago', pdf('edital-a'), '203.0.113.9'))
      const ultimo = respostas[6]
      exigir(respostas.slice(0, 6).every((r) => r.status === 200) && ultimo.status === 429 && /Muitos envios/.test(ultimo.d.message),
        respostas.map((r) => r.status).join())
    })
  } finally {
    globalThis.fetch = fetchAntes
  }
}

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
