'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, FileUp, Info, Loader2, Lock, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { EstimativaEdital } from '@/lib/tempo-estudo'
import {
  avaliarEtapas, daquiAMeses, diasDaSemana, etapasDeDuasProvas, fraseVoltas, juntar, percentualCoberto, pontosDaMateria,
  prioridadePorPontos, similaridade, MAX_CURSOS_JUNTOS, SIMILARIDADE_MINIMA,
  type Etapa, type EstimativaPrograma, type MateriaPrograma,
} from '@/lib/calculadora'
import { POMODORO, REVISOES } from '@/lib/metodo-estudo'

/**
 * Calculadora de tempo do aluno: "dá tempo de estudar o edital até a prova?".
 *
 *  - Meus cursos (plano pago e teste de 7 dias): o conteúdo do site, medido
 *    tópico a tópico (GET /api/me/calculadora). Com dois cursos parecidos,
 *    dá para juntar — a matéria comum conta uma vez.
 *  - Edital em PDF (todos, inclusive o gratuito): a IA lê o edital e a conta é
 *    uma suposição — tópicos do programa × tempo de um tópico da mesma matéria
 *    no site (POST /api/me/calculadora/edital).
 *
 * As contas com as horas do aluno rodam aqui (calculadora.ts), com a mesma
 * régua do cronograma: pomodoros que cabem nas horas e revisões em 1, 7, 15 e
 * 30 dias.
 */

type Curso = {
  courseId: string
  slug: string
  nome: string
  edital: { id: string; titulo: string; ano: number; banca: string | null; dataProva: string | null }
  estimativa: EstimativaEdital
  principal: boolean
  editalNovoEmRevisao: { ano: number; titulo: string } | null
}
type CargoLido = { nome: string; totalQuestoes: number | null; programa: MateriaPrograma[]; estimativa: EstimativaPrograma }
type EditalLido = {
  edital: { orgao: string | null; banca: string | null; ano: number | null; dataProva: string | null }
  cargos: CargoLido[]
  doCache: boolean
}
type LinhaMateria = { id: string; nome: string; pontos: number; pontosTexto: string; totalMin: number; detalhe: string }

const fmtNum = (n: number, casas = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
const fmtHoras = (min: number, casas = 1) => (min < 60 ? `${Math.round(min)} min` : `${fmtNum(min / 60, casas)} h`)
const fmtData = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const fmtDuracaoDia = (min: number) => `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`
// Datas ao meio-dia local: a diferença entre duas é um número inteiro de dias.
const hojeInput = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const doInput = (v: string) => (v ? new Date(`${v}T12:00:00`) : null)
const futura = (iso: string | null | undefined) => { const d = iso?.slice(0, 10) ?? ''; return d > hojeInput() ? d : '' }

export default function CalculadoraPage() {
  const [aba, setAba] = useState<'cursos' | 'pdf'>('cursos')
  const [horasPorDia, setHorasPorDia] = useState(3)
  const [diasPorSemana, setDiasPorSemana] = useState(6)
  const [datas, setDatas] = useState<Record<string, string>>({})

  const [dados, setDados] = useState<{ modo: 'pago' | 'gratuito'; cursos: Curso[] } | null>(null)
  const [erroCursos, setErroCursos] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let vivo = true
    setErroCursos(false)
    api.get('/me/calculadora')
      .then(({ data }) => {
        if (!vivo) return
        setDados(data)
        if (data.modo === 'gratuito') setAba('pdf')
        setDatas((atual) => {
          const novas = { ...atual }
          for (const c of data.cursos as Curso[]) if (!(c.courseId in novas)) novas[c.courseId] = futura(c.edital.dataProva)
          return novas
        })
      })
      .catch(() => vivo && setErroCursos(true))
    return () => { vivo = false }
  }, [tentativa])

  const disp = { horasPorDia, diasPorSemana }
  const mudarData = (chave: string, valor: string) => setDatas((d) => ({ ...d, [chave]: valor }))

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-foreground">Calculadora de tempo</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Dá tempo de estudar o edital até a prova? Diga quanto você estuda e veja quando termina.
        </p>
      </div>

      <div role="tablist" aria-label="Como calcular" className="inline-flex rounded-xl border border-border bg-muted/40 p-1 gap-1">
        {([['cursos', 'Meus cursos', BookOpen], ['pdf', 'Edital em PDF', FileUp]] as const).map(([id, rotulo, Icone]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
              aba === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icone className="w-4 h-4" /> {rotulo}
            {id === 'cursos' && dados?.modo === 'gratuito' && <Lock className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      {aba === 'cursos' ? (
        erroCursos ? (
          <div className="card p-6 text-sm flex flex-wrap items-center gap-3">
            <span>Não foi possível carregar seus cursos agora.</span>
            <button type="button" onClick={() => setTentativa((t) => t + 1)} className="btn-ghost btn-sm">
              <RefreshCw className="w-3.5 h-3.5" /> Tentar de novo
            </button>
          </div>
        ) : !dados ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
        ) : dados.modo === 'gratuito' ? (
          <div className="card p-6 space-y-3 max-w-2xl">
            <p className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> A conta pelo conteúdo do seu curso é do plano pago</p>
            <p className="text-sm text-muted-foreground">
              No plano pago, a calculadora conta o material de cada tópico do seu curso e o tempo que os alunos levam de
              verdade nas questões — e, se você tiver dois cursos parecidos, junta os dois sem contar a mesma matéria duas
              vezes. No gratuito, ela lê o edital em PDF e faz uma estimativa pelo programa.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => setAba('pdf')} className="btn-primary btn-md">Usar o edital em PDF</button>
              <Link href="/planos" className="btn-ghost btn-md">Ver planos</Link>
            </div>
          </div>
        ) : dados.cursos.length === 0 ? (
          <div className="card p-6 text-sm max-w-2xl">
            Nenhum curso seu tem edital cadastrado ainda. Ative um curso em{' '}
            <Link href="/dashboard/meus-cursos" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">Meus Cursos</Link>{' '}
            ou use o edital em PDF.
          </div>
        ) : (
          <MeusCursos cursos={dados.cursos} disp={disp} datas={datas} mudarData={mudarData}
            controles={<ControlesTempo {...disp} setHorasPorDia={setHorasPorDia} setDiasPorSemana={setDiasPorSemana} />} />
        )
      ) : (
        <EditalEmPdf modo={dados?.modo ?? 'gratuito'} disp={disp} data={datas.pdf ?? ''} mudarData={(v) => mudarData('pdf', v)}
          controles={<ControlesTempo {...disp} setHorasPorDia={setHorasPorDia} setDiasPorSemana={setDiasPorSemana} />} />
      )}

      <details className="card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Como a conta é feita</summary>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li><strong className="text-foreground">Meus cursos:</strong> o material de cada tópico do edital (palavras ÷ 120 por minuto, ritmo de leitura para memorizar), as questões do banco no tempo real dos alunos e as revisões. Tópico ainda sem material recebe a mediana dos tópicos medidos da matéria.</li>
          <li><strong className="text-foreground">Edital em PDF:</strong> uma suposição. A IA lê o programa do edital; cada tópico vale o tempo que um tópico da mesma matéria leva aqui no site. Matéria que o site não tem usa a média do site.</li>
          <li><strong className="text-foreground">Pomodoro:</strong> suas horas viram blocos de {POMODORO.focoMin} min de foco com {POMODORO.pausaCurtaMin} de pausa, e {POMODORO.pausaLongaMin} a cada {POMODORO.blocosAtePausaLonga}. Só o foco conta.</li>
          <li><strong className="text-foreground">Revisão espaçada:</strong> cada estudo ganha {REVISOES.length} revisões — {REVISOES.map((r) => r.nome).join(', ').replace(/, ([^,]*)$/, ' e $1')} depois —, cada uma mais curta que a anterior. Já estão no total.</li>
          <li><strong className="text-foreground">Quando não cabe:</strong> as horas por dia que fariam caber e, com as suas horas, as matérias que dão mais pontos por hora de estudo. A conta supõe que estudar metade de uma matéria rende metade dos pontos dela — é uma simplificação.</li>
        </ul>
      </details>
    </div>
  )
}

function ControlesTempo(p: { horasPorDia: number; diasPorSemana: number; setHorasPorDia: (n: number) => void; setDiasPorSemana: (n: number) => void }) {
  return (
    <>
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label htmlFor="calc-horas" className="text-sm font-medium">Horas por dia</label>
          <span className="text-sm font-semibold tabular-nums">{fmtNum(p.horasPorDia, 1)} h</span>
        </div>
        <input id="calc-horas" type="range" min={1} max={12} step={0.5} value={p.horasPorDia}
          onChange={(ev) => p.setHorasPorDia(Number(ev.target.value))} className="w-full accent-brand-500" />
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label htmlFor="calc-dias" className="text-sm font-medium">Dias por semana</label>
          <span className="text-sm font-semibold tabular-nums">{p.diasPorSemana}</span>
        </div>
        <input id="calc-dias" type="range" min={1} max={7} step={1} value={p.diasPorSemana}
          onChange={(ev) => p.setDiasPorSemana(Number(ev.target.value))} className="w-full accent-brand-500" />
      </div>
    </>
  )
}

function CampoData({ id, rotulo, valor, doEdital, onChange }: { id: string; rotulo: string; valor: string; doEdital: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="label">{rotulo}</label>
      <input id={id} type="date" className="input" value={valor} min={hojeInput()} onChange={(ev) => onChange(ev.target.value)} />
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <span className="text-xs text-muted-foreground">Prazo rápido:</span>
        {([[3, '3 meses'], [6, '6 meses'], [12, '1 ano']] as const).map(([m, rot]) => (
          <button key={m} type="button" onClick={() => onChange(daquiAMeses(doInput(hojeInput())!, m))}
            className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted">{rot}</button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {valor && valor === doEdital ? 'Data do edital. Pode mudar.' : 'Até quando você vai estudar: a data da prova, ou um prazo seu.'}
      </p>
    </div>
  )
}

// ─── Meus cursos ─────────────────────────────────────────────────────────────

function MeusCursos({ cursos, disp, datas, mudarData, controles }: {
  cursos: Curso[]
  disp: { horasPorDia: number; diasPorSemana: number }
  datas: Record<string, string>
  mudarData: (chave: string, valor: string) => void
  controles: ReactNode
}) {
  const [principalId, setPrincipalId] = useState(cursos[0].courseId)
  const [segundoId, setSegundoId] = useState<string | null>(null)
  const principal = cursos.find((c) => c.courseId === principalId) ?? cursos[0]
  const outros = cursos.filter((c) => c.courseId !== principal.courseId)
  const parecencas = useMemo(
    () => new Map(outros.map((c) => [c.courseId, similaridade(principal.estimativa, c.estimativa)])),
    [principal, outros],
  )
  const segundo = segundoId && parecencas.get(segundoId)?.parecidos ? outros.find((c) => c.courseId === segundoId) ?? null : null

  const estimativa = segundo ? juntar(principal.estimativa, segundo.estimativa) : principal.estimativa
  const prova = (c: Curso) => ({ rotulo: c.nome, totalMin: c.estimativa.totalMin, dataProva: doInput(datas[c.courseId] ?? '') })
  const etapas: Etapa[] = segundo
    ? etapasDeDuasProvas(prova(principal), prova(segundo), estimativa.totalMin)
    : [prova(principal)]
  const materias: LinhaMateria[] = estimativa.materias.map((m) => ({
    id: m.id, nome: m.nome, pontos: pontosDaMateria(m), totalMin: m.totalMin,
    pontosTexto: m.questoesNaProva ? `${fmtNum(m.questoesNaProva)} questões na prova` : `peso ${fmtNum(m.peso, 1)}`,
    detalhe: m.semConteudo ? 'sem tópicos ainda · estimado' : `${m.topicosMedidos} de ${m.topicos} tópicos com material`,
  }))
  const dataPrincipal = datas[principal.courseId] ?? ''
  const cronograma = !segundo
    ? `/dashboard/cronograma?curso=${principal.courseId}&horas=${disp.horasPorDia}&dias=${diasDaSemana(disp.diasPorSemana).join(',')}${dataPrincipal ? `&prova=${dataPrincipal}` : ''}`
    : undefined

  return (
    <div className="card p-5 sm:p-7 grid lg:grid-cols-[1fr_1px_360px] gap-6">
      <div className="space-y-5 min-w-0">
        {cursos.length === 1 ? (
          <div>
            <p className="label">Seu curso</p>
            <p className="font-semibold">{principal.nome}</p>
          </div>
        ) : (
          <fieldset>
            <legend className="label">Curso</legend>
            <div className="space-y-1.5">
              {cursos.map((c) => (
                <label key={c.courseId} className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer',
                  c.courseId === principal.courseId ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/20' : 'border-border hover:bg-muted/50')}>
                  <input type="radio" name="curso" className="accent-brand-500" checked={c.courseId === principal.courseId}
                    onChange={() => { setPrincipalId(c.courseId); setSegundoId(null) }} />
                  <span className="min-w-0 flex-1">{c.nome}</span>
                  {c.principal && <span className="text-[11px] text-muted-foreground">principal</span>}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <EditalDoCurso curso={principal} />

        {outros.length > 0 && (
          <fieldset>
            <legend className="label">Estudar junto com outro curso (até {MAX_CURSOS_JUNTOS})</legend>
            <p className="text-xs text-muted-foreground -mt-1 mb-2">
              Só cursos parecidos: com pelo menos {fmtNum(SIMILARIDADE_MINIMA * 100)}% do conteúdo em comum. A matéria comum conta uma vez.
            </p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50">
                <input type="radio" name="segundo" className="accent-brand-500" checked={!segundo} onChange={() => setSegundoId(null)} />
                <span>Só {principal.nome}</span>
              </label>
              {outros.map((c) => {
                const s = parecencas.get(c.courseId)!
                return (
                  <label key={c.courseId} title={s.parecidos ? undefined : 'Pouco conteúdo em comum: estudar junto pouparia pouco.'}
                    className={cn('flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm',
                      s.parecidos ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50 cursor-not-allowed')}>
                    <input type="radio" name="segundo" className="accent-brand-500" disabled={!s.parecidos}
                      checked={segundo?.courseId === c.courseId} onChange={() => setSegundoId(c.courseId)} />
                    <span className="min-w-0 flex-1">{c.nome}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{fmtNum(s.percentual * 100)}% em comum</span>
                  </label>
                )
              })}
            </div>
            {segundo && <div className="mt-2"><EditalDoCurso curso={segundo} /></div>}
          </fieldset>
        )}

        {controles}

        <CampoData id="data-principal" rotulo={segundo ? `Data da prova — ${principal.nome}` : 'Data da prova'}
          valor={dataPrincipal} doEdital={futura(principal.edital.dataProva)} onChange={(v) => mudarData(principal.courseId, v)} />
        {segundo && (
          <CampoData id="data-segundo" rotulo={`Data da prova — ${segundo.nome}`} valor={datas[segundo.courseId] ?? ''}
            doEdital={futura(segundo.edital.dataProva)} onChange={(v) => mudarData(segundo.courseId, v)} />
        )}
      </div>

      <div className="hidden lg:block w-px bg-border" />

      <Resultado
        totalMin={estimativa.totalMin}
        etapas={etapas}
        materias={materias}
        disp={disp}
        nota={`O conteúdo do site ainda está sendo escrito: ${fmtNum(estimativa.percentualMedido * 100)}% deste tempo vem do material pronto; o resto é uma suposição pelos tópicos do edital (cada tópico sem material vale a mediana dos que já têm).`}
        cronogramaHref={cronograma}
        rodape={segundo ? `${fmtHoras(principal.estimativa.totalMin + segundo.estimativa.totalMin - estimativa.totalMin)} economizadas estudando a matéria comum uma vez.` : undefined}
      />
    </div>
  )
}

function EditalDoCurso({ curso }: { curso: Curso }) {
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <p>{curso.edital.titulo} · {curso.edital.ano}{curso.edital.banca ? ` · ${curso.edital.banca}` : ''}</p>
      {curso.editalNovoEmRevisao && (
        <p className="flex items-start gap-1.5 text-warning-600 dark:text-warning-400">
          <Info className="w-3.5 h-3.5 mt-px shrink-0" />
          Edital {curso.editalNovoEmRevisao.ano} detectado e em revisão. A conta usa o de {curso.edital.ano} até a equipe conferir as matérias novas.
        </p>
      )}
    </div>
  )
}

// ─── Edital em PDF ───────────────────────────────────────────────────────────

const ROTULO_BASE = { materia: 'tempo real da matéria no site', plataforma: 'média do site', referencia: 'tamanho padrão' } as const

function EditalEmPdf({ modo, disp, data, mudarData, controles }: {
  modo: 'pago' | 'gratuito'
  disp: { horasPorDia: number; diasPorSemana: number }
  data: string
  mudarData: (v: string) => void
  controles: ReactNode
}) {
  const [forma, setForma] = useState<'pdf' | 'texto'>('pdf')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [texto, setTexto] = useState('')
  const [lendo, setLendo] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const [erro, setErro] = useState('')
  const [lido, setLido] = useState<EditalLido | null>(null)
  const [cargoIdx, setCargoIdx] = useState(0)

  useEffect(() => {
    if (!lendo) return
    setSegundos(0)
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [lendo])

  async function ler() {
    setErro('')
    if (forma === 'pdf') {
      if (!arquivo) return setErro('Escolha o PDF do edital.')
      if (arquivo.size > 4 * 1024 * 1024) return setErro('O PDF passa de 4 MB. Use "Colar o texto" com o conteúdo programático.')
    } else if (texto.trim().length < 300) {
      return setErro('Cole o texto do edital: pelo menos o quadro de provas e o conteúdo programático.')
    }
    setLendo(true)
    try {
      let corpo: FormData | { texto: string }
      if (forma === 'pdf') {
        corpo = new FormData()
        corpo.append('pdf', arquivo!)
      } else {
        corpo = { texto }
      }
      const { data: r } = await api.post<EditalLido>('/me/calculadora/edital', corpo, {
        timeout: 310_000,
        ...(forma === 'pdf' ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
      })
      setLido(r)
      setCargoIdx(0)
      const dataDoEdital = futura(r.edital.dataProva)
      if (dataDoEdital) mudarData(dataDoEdital)
    } catch (e: any) {
      setErro(e?.response?.data?.message ?? 'Não foi possível ler o edital agora. Tente de novo.')
    } finally {
      setLendo(false)
    }
  }

  const cargo = lido?.cargos[cargoIdx] ?? null
  const materias: LinhaMateria[] = cargo
    ? cargo.estimativa.materias.map((m, i) => ({
      id: `${i}-${m.nome}`, nome: m.nome, pontos: m.pontos, totalMin: m.totalMin,
      pontosTexto: m.pontosInformados ? `${fmtNum(m.pontos, 1)} pontos na prova` : 'pontuação não informada no edital',
      detalhe: `${m.topicos} ${m.topicos === 1 ? 'tópico' : 'tópicos'}${m.semPrograma ? ' (sem programa no edital)' : ''} × ${fmtHoras(m.minPorTopico)} · ${m.base === 'materia' ? `tempo real de ${m.materiaDoSite} no site` : ROTULO_BASE[m.base]}`,
    }))
    : []

  return (
    <div className="space-y-4">
      <div className="card p-5 sm:p-7 grid lg:grid-cols-[1fr_1px_360px] gap-6">
        <div className="space-y-5 min-w-0">
          <div>
            <div className="flex gap-1 mb-2" role="group" aria-label="Como mandar o edital">
              {(['pdf', 'texto'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setForma(f)} aria-pressed={forma === f}
                  className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold border',
                    forma === f ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {f === 'pdf' ? 'Enviar o PDF' : 'Colar o texto'}
                </button>
              ))}
            </div>
            {forma === 'pdf' ? (
              <>
                <label htmlFor="edital-pdf" className="label">PDF do edital de abertura (até 4 MB)</label>
                <input id="edital-pdf" type="file" accept="application/pdf,.pdf" className="input file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
                  onChange={(ev) => setArquivo(ev.target.files?.[0] ?? null)} />
              </>
            ) : (
              <>
                <label htmlFor="edital-texto" className="label">Texto do edital</label>
                <textarea id="edital-texto" rows={6} className="input min-h-[8rem] py-2" value={texto} onChange={(ev) => setTexto(ev.target.value)}
                  placeholder="Abra o PDF, selecione tudo (Ctrl+A ou ⌘A), copie e cole aqui. Se for grande, cole só o quadro de provas e o conteúdo programático." />
              </>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              A IA lê o órgão, a data da prova, as matérias, quantas questões cada uma tem e o programa. O arquivo não fica guardado.
            </p>
          </div>
          <button type="button" onClick={ler} disabled={lendo} className="btn-primary btn-md w-full sm:w-auto">
            {lendo ? <><Loader2 className="w-4 h-4 animate-spin" /> Lendo o edital… {segundos}s</> : <><FileUp className="w-4 h-4" /> Ler o edital</>}
          </button>
          {lendo && <p className="text-xs text-muted-foreground">Um edital grande leva até 2 minutos. Pode deixar a página aberta.</p>}
          {erro && <p role="alert" className="text-sm rounded-lg bg-warning-50 dark:bg-warning-600/15 p-3">{erro}</p>}

          {lido && cargo && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-0.5">
                <p className="font-semibold">{lido.edital.orgao ?? 'Edital lido'}{lido.edital.ano ? ` · ${lido.edital.ano}` : ''}</p>
                <p className="text-muted-foreground text-xs">
                  {lido.edital.banca ? `Banca: ${lido.edital.banca} · ` : ''}
                  {lido.edital.dataProva ? `Prova: ${fmtData(new Date(`${lido.edital.dataProva}T12:00:00`))}` : 'O edital não traz a data da prova'}
                </p>
              </div>
              {lido.cargos.length > 1 && (
                <div>
                  <label htmlFor="edital-cargo" className="label">Cargo</label>
                  <select id="edital-cargo" className="input" value={cargoIdx} onChange={(ev) => setCargoIdx(Number(ev.target.value))}>
                    {lido.cargos.map((c, i) => <option key={i} value={i}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              {controles}
              <CampoData id="data-pdf" rotulo="Data da prova" valor={data} doEdital={futura(lido.edital.dataProva)} onChange={mudarData} />
            </>
          )}
        </div>

        <div className="hidden lg:block w-px bg-border" />

        {cargo ? (
          <Resultado
            totalMin={cargo.estimativa.totalMin}
            etapas={[{ rotulo: cargo.nome, totalMin: cargo.estimativa.totalMin, dataProva: doInput(data) }]}
            materias={materias}
            disp={disp}
            nota={`Suposição: ${fmtNum(cargo.estimativa.topicos)} tópicos do programa × o tempo de um tópico da mesma matéria no site (${fmtNum(cargo.estimativa.percentualPelaMateria * 100)}% do total veio de matéria que o site tem).`}
            rodape={modo === 'gratuito' ? 'No plano pago, a conta usa o material de cada tópico do seu curso, medido.' : undefined}
          />
        ) : (
          <div className="text-sm text-muted-foreground self-center">
            Mande o edital para ver quanto tempo leva, se cabe até a prova e quantas horas por dia seriam precisas.
          </div>
        )}
      </div>

      {cargo && (
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Programa lido do edital ({cargo.programa.length} matérias)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {cargo.programa.map((m, i) => (
              <div key={i} className="min-w-0">
                <p className="font-semibold">{m.nome}{m.qtdQuestoes ? <span className="font-normal text-muted-foreground"> · {m.qtdQuestoes} questões</span> : null}</p>
                <ol className="mt-1 list-decimal pl-5 text-muted-foreground space-y-0.5">
                  {m.topicos.map((t, j) => (
                    <li key={j}>{t.nome}{t.subtopicos.length ? <span className="text-xs"> ({t.subtopicos.length} subitens)</span> : null}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ─── Resultado (as duas abas) ────────────────────────────────────────────────

function Resultado({ totalMin, etapas, materias, disp, nota, cronogramaHref, rodape }: {
  totalMin: number
  etapas: Etapa[]
  materias: LinhaMateria[]
  disp: { horasPorDia: number; diasPorSemana: number }
  nota: string
  cronogramaHref?: string
  rodape?: string
}) {
  const r = avaliarEtapas(etapas, { ...disp, hoje: doInput(hojeInput())! })
  const fim = r.etapas[r.etapas.length - 1].veredito
  const casas = totalMin >= 100 * 60 ? 0 : 1
  const unica = r.etapas.length === 1 ? r.etapas[0] : null
  const prioridade = unica && unica.veredito.cabe === false && unica.veredito.diasAteProva! > 0
    ? prioridadePorPontos(materias, unica.veredito.disponivelMin!)
    : null

  return (
    <div aria-live="polite" className="flex flex-col min-w-0">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Para percorrer o conteúdo</p>
      <p className="text-5xl font-bold tracking-tight tabular-nums mt-1">{fmtHoras(totalMin, casas)}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {fim.minutosPorDia > 0 && <>{fmtNum(disp.horasPorDia, 1)} h por dia rendem {fmtDuracaoDia(fim.minutosPorDia)} de foco ({fim.pomodorosPorDia} pomodoros). </>}
        {Number.isFinite(fim.diasParaTerminar)
          ? <>No seu ritmo, termina em {fmtData(fim.terminaEm)} ({fmtNum(Math.ceil(fim.diasParaTerminar / 7))} {Math.ceil(fim.diasParaTerminar / 7) === 1 ? 'semana' : 'semanas'}).</>
          : 'Com zero hora por dia, não termina.'}
      </p>

      {r.cabe === undefined && (
        <p className="mt-3 rounded-lg border border-dashed border-brand-500/50 p-3 text-sm">
          <strong>Até quando você vai estudar?</strong> Ponha a data da prova (ou use um prazo rápido) para ver se dá
          para zerar o conteúdo — e quantas vezes.
        </p>
      )}

      {unica && unica.veredito.cabe !== undefined && unica.veredito.diasAteProva! > 0 && (
        <MedidorVoltas voltas={unica.veredito.disponivelMin! / Math.max(1, unica.totalMin)} />
      )}

      {r.etapas.filter((e) => e.veredito.cabe !== undefined).map((e, i) => (
        e.veredito.diasAteProva === 0 ? (
          <p key={i} className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">A prova {r.etapas.length > 1 ? `de ${e.rotulo} ` : ''}é hoje ou já passou. Escolha outra data.</p>
        ) : e.veredito.cabe ? (
          <p key={i} className="mt-3 rounded-lg bg-success-50 dark:bg-success-600/15 p-3 text-sm flex gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success-600 dark:text-success-400" />
            <span>
              <strong className="text-success-600 dark:text-success-400">
                Dá para zerar {r.etapas.length > 1 && i === 0 ? 'o conteúdo dela' : 'o conteúdo'} {fraseVoltas(e.veredito.voltas!)}
                {r.etapas.length > 1 ? ` (${e.rotulo})` : ''}.
              </strong>{' '}
              São {fmtNum(e.veredito.diasAteProva!)} dias até a prova{e.veredito.voltas! < 2 ? <>, com {fmtHoras(e.veredito.disponivelMin! - e.totalMin)} de folga</> : null}.
            </span>
          </p>
        ) : (
          <p key={i} className="mt-3 rounded-lg bg-warning-50 dark:bg-warning-600/15 p-3 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning-600 dark:text-warning-400" />
            <span>
              <strong className="text-warning-600 dark:text-warning-400">Não dá para zerar até a prova{r.etapas.length > 1 ? ` (${e.rotulo})` : ''}.</strong>{' '}
              No seu ritmo, você percorre {fmtNum(percentualCoberto(e.veredito.disponivelMin!, e.totalMin) * 100)}% do conteúdo; faltam {fmtHoras(e.totalMin - e.veredito.disponivelMin!)}.
            </span>
          </p>
        )
      ))}

      {r.cabe === false && r.horasPorDiaNecessarias !== undefined && (
        <p className="mt-3 text-sm font-semibold">
          {r.horasPorDiaNecessarias <= 12
            ? <>Para zerar, estude no mínimo {fmtNum(r.horasPorDiaNecessarias, 1)} h por dia, {disp.diasPorSemana} {disp.diasPorSemana === 1 ? 'dia' : 'dias'} por semana, até a prova.</>
            : 'Nem com 12 h por dia cabe tudo: priorize as matérias abaixo ou mire a próxima prova.'}
        </p>
      )}

      {prioridade && (
        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">Com as suas horas, comece por aqui</p>
          <p className="text-xs text-muted-foreground mb-2">
            Cobre cerca de {fmtNum(prioridade.percentual * 100)}% dos pontos da prova — as matérias que dão mais pontos por hora.
          </p>
          <ol className="space-y-1">
            {prioridade.itens.filter((m) => m.fracao > 0).slice(0, 8).map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{m.nome}</span>
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">{m.fracao >= 1 ? 'inteira' : `${fmtNum(m.fracao * 100)}%`}</span>
              </li>
            ))}
          </ol>
          {prioridade.itens.some((m) => m.fracao === 0) && (
            <p className="text-xs text-muted-foreground mt-2">
              Fica para depois: {prioridade.itens.filter((m) => m.fracao === 0).map((m) => m.nome).join(', ')}.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-3">{nota}</p>
      {rodape && <p className="text-xs text-muted-foreground mt-1">{rodape}</p>}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold">Tempo de cada matéria ({materias.length})</summary>
        <ul className="mt-2 divide-y divide-border">
          {[...materias].sort((a, b) => b.totalMin - a.totalMin).map((m) => (
            <li key={m.id} className="py-1.5">
              <div className="flex justify-between gap-3">
                <span className="min-w-0">{m.nome}</span>
                <span className="tabular-nums font-medium shrink-0">{fmtHoras(m.totalMin)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{m.pontosTexto} · {m.detalhe}</p>
            </li>
          ))}
        </ul>
      </details>

      {cronogramaHref && (
        <Link href={cronogramaHref} className="btn-primary btn-md mt-5 group">
          Montar meu cronograma com estes números
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

/** Quantas vezes o conteúdo cabe até a prova, numa régua de 0 a 3 vezes. */
function MedidorVoltas({ voltas }: { voltas: number }) {
  const v = Math.max(0, voltas)
  const largura = Math.min(v, 3) / 3 * 100
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('absolute inset-y-0 left-0 rounded-full', v >= 1 ? 'bg-success-500' : 'bg-warning-500')} style={{ width: `${largura}%` }} />
        {[1, 2].map((n) => <span key={n} className="absolute inset-y-0 w-px bg-background" style={{ left: `${(n / 3) * 100}%` }} />)}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground mt-1 tabular-nums">
        <span>0</span><span>1×</span><span>2×</span><span>3×{v > 3 ? '+' : ''}</span>
      </div>
    </div>
  )
}

