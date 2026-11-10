import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  avaliarTarefas, criarMonitor, mensagemAtraso, mensagemFalha, PRAZO_HORAS, NAO_VIGIADAS,
  type Execucao, type ResultadoExecucao,
} from '../vigia-regras.ts'

const H = 3_600_000
const agora = new Date('2026-11-10T12:00:00Z')
const exec = (id: string, ok: boolean, horasAtras: number): Execucao =>
  ({ id, ok, status: ok ? 200 : 500, detalhe: null, criadoEm: new Date(agora.getTime() - horasAtras * H) })
const prazos = { diaria: 27, semanal: 174 }
const avaliar = (ultimas: Record<string, Execucao>, ultimasOk: Record<string, Execucao>, vigiaHorasAtras: number | null) =>
  Object.fromEntries(avaliarTarefas({
    ultimas: new Map(Object.entries(ultimas)), ultimasOk: new Map(Object.entries(ultimasOk)),
    vigiaDesde: vigiaHorasAtras == null ? null : new Date(agora.getTime() - vigiaHorasAtras * H), agora, prazos,
  }).map((s) => [s.tarefa, s]))

describe('vigia — quem sumiu', () => {
  test('rodou dentro do prazo: ok, sem chave de aviso', () => {
    const r = avaliar({ diaria: exec('a', true, 5) }, { diaria: exec('a', true, 5) }, 100)
    assert.equal(r.diaria.estado, 'ok')
    assert.equal(r.diaria.chaveAtraso, null)
  })

  test('última rodada boa velha demais: atrasada, e a chave é essa rodada', () => {
    const r = avaliar({ diaria: exec('velha', true, 30) }, { diaria: exec('velha', true, 30) }, 100)
    assert.equal(r.diaria.estado, 'atrasada')
    assert.equal(r.diaria.chaveAtraso, 'velha')
  })

  test('prazo de cada tarefa é o dela: 30 h atrasa a diária, não a semanal', () => {
    const r = avaliar(
      { diaria: exec('d', true, 30), semanal: exec('s', true, 30) },
      { diaria: exec('d', true, 30), semanal: exec('s', true, 30) }, 100)
    assert.equal(r.diaria.estado, 'atrasada')
    assert.equal(r.semanal.estado, 'ok')
  })

  test('última rodada falhou: falhando, mesmo dentro do prazo', () => {
    const r = avaliar({ diaria: exec('f', false, 1) }, { diaria: exec('a', true, 20) }, 100)
    assert.equal(r.diaria.estado, 'falhando')
    assert.equal(r.diaria.atrasada, false)
  })

  test('falhando E sem sucesso há tempo demais: continua falhando, mas gera aviso de sumiço', () => {
    const r = avaliar({ diaria: exec('f', false, 1) }, { diaria: exec('a', true, 50) }, 100)
    assert.equal(r.diaria.estado, 'falhando')
    assert.equal(r.diaria.chaveAtraso, 'a')
  })

  test('nunca rodou: aguarda enquanto o vigia é novo, depois vira atrasada com chave "nunca"', () => {
    assert.equal(avaliar({}, {}, 10).diaria.estado, 'aguardando')
    const velho = avaliar({}, {}, 40)
    assert.equal(velho.diaria.estado, 'atrasada')
    assert.equal(velho.diaria.chaveAtraso, 'nunca')
    assert.equal(velho.semanal.estado, 'aguardando')
  })

  test('vigia sem nenhuma gravação: ninguém é acusado', () => {
    const r = avaliar({}, {}, null)
    assert.ok(Object.values(r).every((s) => s.estado === 'aguardando' && !s.chaveAtraso))
  })

  test('voltou a rodar: a chave do sumiço antigo some', () => {
    const antes = avaliar({ diaria: exec('velha', true, 30) }, { diaria: exec('velha', true, 30) }, 100)
    const depois = avaliar({ diaria: exec('nova', true, 1) }, { diaria: exec('nova', true, 1) }, 100)
    assert.equal(antes.diaria.chaveAtraso, 'velha')
    assert.equal(depois.diaria.chaveAtraso, null)
  })
})

describe('vigia — prazos batem com o vercel.json', () => {
  // Lê os agendamentos de verdade. Mudou o vercel.json sem mudar PRAZO_HORAS?
  // Este teste reprova antes do vigia acusar (ou deixar de acusar) errado.
  const crons: Array<{ path: string; schedule: string }> = JSON.parse(
    readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'),
  ).crons
  const porTarefa = new Map<string, string[]>()
  for (const c of crons) {
    const nome = c.path.replace('/api/cron/', '').split('?')[0]
    porTarefa.set(nome, [...(porTarefa.get(nome) ?? []), c.schedule])
  }

  /** Maior vão entre execuções, em horas, para os formatos usados no projeto. */
  function maiorVaoHoras(expressoes: string[]): number {
    const campos = expressoes.map((e) => e.trim().split(/\s+/))
    if (campos.every((f) => f[2] === '*' && f[4] === '*')) return 24
    if (campos.every((f) => f[2] === '*' && f[4] !== '*')) {
      const dias = [...new Set(campos.flatMap((f) => f[4].split(',').map(Number)))].sort((a, b) => a - b)
      return Math.max(...dias.map((d, i) => ((dias[(i + 1) % dias.length] - d + 7) % 7 || 7) * 24))
    }
    if (campos.every((f) => /^\d+$/.test(f[2]) && f[4] === '*')) return 31 * 24
    throw new Error(`formato de agendamento não suportado pelo teste: ${expressoes}`)
  }

  test('toda tarefa agendada é vigiada ou tem motivo para não ser', () => {
    for (const nome of porTarefa.keys())
      assert.ok(nome in PRAZO_HORAS || nome in NAO_VIGIADAS, `${nome} não está no vigia`)
  })

  test('toda tarefa vigiada existe no vercel.json', () => {
    for (const nome of Object.keys(PRAZO_HORAS)) assert.ok(porTarefa.has(nome), `${nome} não está agendada`)
  })

  test('prazo = maior vão entre execuções + folga de 3 a 12 h', () => {
    for (const [nome, prazo] of Object.entries(PRAZO_HORAS)) {
      const vao = maiorVaoHoras(porTarefa.get(nome)!)
      assert.ok(prazo - vao >= 3 && prazo - vao <= 12, `${nome}: vão ${vao} h, prazo ${prazo} h`)
    }
  })
})

describe('vigia — mensagens', () => {
  test('falha mostra a tarefa e o erro, escapando HTML', () => {
    const m = mensagemFalha('rag-index', { ok: false, status: 500, detalhe: 'HTTP 500 <erro> & mais', duracaoMs: 1 })
    assert.match(m, /<code>rag-index<\/code>/)
    assert.match(m, /&lt;erro&gt; &amp; mais/)
  })

  test('sumiço diz há quantas horas e qual é o prazo', () => {
    const [s] = avaliarTarefas({ ultimas: new Map(), ultimasOk: new Map([['diaria', exec('x', true, 30)]]), vigiaDesde: null, agora, prazos: { diaria: 27 } })
    const m = mensagemAtraso(s, agora)
    assert.match(m, /há 30 h; o prazo é 27 h/)
    assert.match(m, /CRON_SECRET/)
  })

  test('nunca rodou tem mensagem própria', () => {
    const [s] = avaliarTarefas({ ultimas: new Map(), ultimasOk: new Map(), vigiaDesde: new Date(agora.getTime() - 99 * H), agora, prazos: { diaria: 27 } })
    assert.match(mensagemAtraso(s, agora), /nunca rodou/)
  })
})

describe('vigia — o embrulho do cron', () => {
  const registro = () => {
    const vistos: Array<{ tarefa: string; r: ResultadoExecucao }> = []
    return { vistos, vigiar: async (tarefa: string, r: ResultadoExecucao) => { vistos.push({ tarefa, r }) } }
  }

  test('sucesso grava ok com o resumo da resposta', async () => {
    const { vistos, vigiar } = registro()
    const res = await criarMonitor(vigiar)('rag-index', async () => Response.json({ processados: 3 }))({})
    assert.equal(res.status, 200)
    assert.equal(vistos.length, 1)
    assert.equal(vistos[0].r.ok, true)
    assert.match(vistos[0].r.detalhe, /HTTP 200 .*processados/)
  })

  test('resposta de erro grava falha com o status', async () => {
    const { vistos, vigiar } = registro()
    await criarMonitor(vigiar)('sync', async () => Response.json({ erro: 'x' }, { status: 500 }))({})
    assert.equal(vistos[0].r.ok, false)
    assert.equal(vistos[0].r.status, 500)
  })

  test('exceção grava falha e continua subindo', async () => {
    const { vistos, vigiar } = registro()
    const rota = criarMonitor(vigiar)('sync', async () => { throw new Error('banco caiu') })
    await assert.rejects(() => rota({}), /banco caiu/)
    assert.equal(vistos[0].r.ok, false)
    assert.equal(vistos[0].r.status, null)
    assert.match(vistos[0].r.detalhe, /banco caiu/)
  })

  test('chamada recusada (401/403) não é execução: não grava', async () => {
    const { vistos, vigiar } = registro()
    for (const status of [401, 403])
      await criarMonitor(vigiar)('sync', async () => Response.json({}, { status }))({})
    assert.equal(vistos.length, 0)
  })

  test('vigia quebrado não derruba a tarefa', async () => {
    const res = await criarMonitor(async () => { throw new Error('tabela não existe') })('sync', async () => Response.json({ ok: 1 }))({})
    assert.equal(res.status, 200)
  })

  test('vigia lento não segura a tarefa além do prazo', async () => {
    const inicio = Date.now()
    const res = await criarMonitor(() => new Promise(() => {}), 50)('sync', async () => Response.json({ ok: 1 }))({})
    assert.equal(res.status, 200)
    assert.ok(Date.now() - inicio < 1000, `segurou ${Date.now() - inicio} ms`)
  })

  test('o corpo da resposta continua inteiro para quem chamou', async () => {
    const { vigiar } = registro()
    const res = await criarMonitor(vigiar)('sync', async () => Response.json({ grande: 'x'.repeat(2000) }))({})
    assert.equal((await res.json()).grande.length, 2000)
  })

  test('resumo gravado tem no máximo 500 caracteres', async () => {
    const { vistos, vigiar } = registro()
    await criarMonitor(vigiar)('sync', async () => new Response('y'.repeat(5000)))({})
    assert.equal(vistos[0].r.detalhe.length, 500)
  })
})
