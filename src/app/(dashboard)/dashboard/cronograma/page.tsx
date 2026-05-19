'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, Clock, Brain, Play, Calendar, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─── TIPOS ────────────────────────────────────────────────────────────────
type Course = {
  id: string
  slug: string
  name: string
  area: string
  uf?: string | null
  orgao?: string | null
}

type StudyPlan = {
  id: string
  courseId: string
  hoursPerDay: number
  daysPerWeek: number[]
  startDate: string
  endDate: string
  isFeasible: boolean
  deficit: number
  totalHoursAvailable: number
  totalHoursNeeded: number
  course: { id: string; slug: string; name: string; area: string }
  edital?: { id: string; titulo: string; dataProva: string } | null
}

type DaySessions = {
  date: string
  sessions: Array<{
    id: string
    subject: { id: string; name: string; slug: string; area?: string | null } | null
    durationMin: number
    type: 'ESTUDO' | 'REVISAO' | 'QUESTOES' | 'SIMULADO' | 'DESCANSO'
    status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PULADO'
    startTime: string | null
  }>
}

// ─── CONFIG VISUAL ────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  ESTUDO: 'badge-blue',
  REVISAO: 'badge-green',
  QUESTOES: 'badge-purple',
  SIMULADO: 'badge-red',
  DESCANSO: 'badge-yellow',
}

const TYPE_LABEL: Record<string, string> = {
  ESTUDO: 'Estudo',
  REVISAO: 'Revisão',
  QUESTOES: 'Questões',
  SIMULADO: 'Simulado',
  DESCANSO: 'Descanso',
}

const DOW_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const DOW_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// ─── HELPERS ──────────────────────────────────────────────────────────────
function toIsoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildMonthGrid(year: number, month: number): Array<Date | null> {
  // month: 1-12
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const startDow = first.getDay()
  const cells: Array<Date | null> = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month - 1, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────
export default function CronogramaPage() {
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<StudyPlan | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const { data } = await api.get<{ plan: StudyPlan | null }>('/schedule')
      setPlan(data.plan)
    } catch (e: any) {
      // 401 ou erro de rede — só mostra form de criação
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Cronograma</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {plan ? 'Seu plano de estudos personalizado' : 'Crie seu plano para começar'}
          </p>
        </div>
      </div>

      {plan ? (
        <ActivePlanView plan={plan} onChanged={refresh} />
      ) : (
        <CreatePlanForm onCreated={refresh} />
      )}
    </div>
  )
}

// ─── CRIAR PLANO ──────────────────────────────────────────────────────────
function CreatePlanForm({ onCreated }: { onCreated: () => void }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [hoursPerDay, setHoursPerDay] = useState(4)
  const [daysPerWeek, setDaysPerWeek] = useState<number[]>([1, 2, 3, 4, 5])
  const [startDate, setStartDate] = useState(toIsoDay(new Date()))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return toIsoDay(d)
  })
  const [preview, setPreview] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    api.get<{ courses: Course[] }>('/courses').then(({ data }) => {
      setCourses(data.courses)
      if (data.courses.length > 0) setCourseId(data.courses[0].id)
    })
  }, [])

  function toggleDay(d: number) {
    setDaysPerWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function doPreview() {
    if (!courseId) return toast.error('Selecione um curso')
    setPreviewing(true)
    try {
      const { data } = await api.post('/schedule/preview', { courseId, hoursPerDay, daysPerWeek, startDate, endDate })
      setPreview(data)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao calcular')
    } finally {
      setPreviewing(false)
    }
  }

  async function doCreate() {
    if (!courseId) return toast.error('Selecione um curso')
    setCreating(true)
    try {
      await api.post('/schedule', { courseId, hoursPerDay, daysPerWeek, startDate, endDate })
      toast.success('Cronograma criado!')
      onCreated()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="text-sm font-semibold text-foreground">Curso</label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.uf ? `(${c.uf})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-foreground">Horas por dia</label>
          <input
            type="number"
            min={1}
            max={12}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Dias da semana</label>
          <div className="mt-1.5 flex gap-1.5">
            {DOW_NAMES.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                type="button"
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-semibold transition',
                  daysPerWeek.includes(i)
                    ? 'bg-brand-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
                title={DOW_FULL[i]}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-foreground">Data de início</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground">Data da prova / alvo</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
        </div>
      </div>

      {preview && (
        <div
          className={cn(
            'p-4 rounded-xl border',
            preview.isFeasible
              ? 'border-success-200 bg-success-50/50 dark:border-success-800/30 dark:bg-success-900/10'
              : 'border-warning-200 bg-warning-50/50 dark:border-warning-800/30 dark:bg-warning-900/10',
          )}
        >
          <div className="flex items-start gap-3">
            {preview.isFeasible ? (
              <CheckCircle2 className="w-5 h-5 text-success-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {preview.isFeasible
                  ? 'Vai dar tempo!'
                  : `Tempo apertado — déficit de ${preview.deficitHours}h`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {preview.studyDays} dias úteis · {preview.totalHoursAvailable}h disponíveis · {preview.sessionCount} sessões
                {' · '}recomendado: {preview.totalHoursRecommended}h
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={doPreview}
          disabled={previewing}
          className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          {previewing ? 'Calculando…' : 'Calcular preview'}
        </button>
        <button
          type="button"
          onClick={doCreate}
          disabled={creating}
          className="flex-1 rounded-xl bg-brand-500 text-white py-2.5 text-sm font-semibold hover:bg-brand-600 disabled:opacity-50"
        >
          {creating ? 'Criando…' : 'Criar cronograma'}
        </button>
      </div>
    </div>
  )
}

// ─── PLANO ATIVO (calendário + dia) ───────────────────────────────────────
function ActivePlanView({ plan, onChanged }: { plan: StudyPlan; onChanged: () => void }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1) // 1-12
  const [calendar, setCalendar] = useState<DaySessions[]>([])
  const [selectedDay, setSelectedDay] = useState<string>(toIsoDay(today))
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  async function loadMonth(y: number, m: number) {
    setLoading(true)
    try {
      const { data } = await api.get<{ days: DaySessions[] }>(`/schedule/${plan.id}/calendar/${y}/${m}`)
      setCalendar(data.days)
    } catch {
      setCalendar([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonth(viewYear, viewMonth)
  }, [viewYear, viewMonth, plan.id])

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, DaySessions['sessions']>()
    for (const d of calendar) map.set(d.date, d.sessions)
    return map
  }, [calendar])

  const selectedSessions = sessionsByDate.get(selectedDay) ?? []
  const completed = selectedSessions.filter((s) => s.status === 'CONCLUIDO').length

  function prevMonth() {
    let m = viewMonth - 1, y = viewYear
    if (m < 1) { m = 12; y-- }
    setViewMonth(m); setViewYear(y)
  }
  function nextMonth() {
    let m = viewMonth + 1, y = viewYear
    if (m > 12) { m = 1; y++ }
    setViewMonth(m); setViewYear(y)
  }

  async function doRecalculate() {
    if (!confirm('Recalcular o cronograma a partir de hoje? As sessões futuras serão reorganizadas.')) return
    setRecalculating(true)
    try {
      await api.post(`/schedule/${plan.id}/recalculate`)
      toast.success('Cronograma recalculado')
      onChanged()
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao recalcular')
    } finally {
      setRecalculating(false)
    }
  }

  async function completeSession(id: string) {
    try {
      await api.patch(`/schedule/sessions/${id}/complete`)
      toast.success('Sessão concluída!')
      loadMonth(viewYear, viewMonth)
    } catch (e: any) {
      toast.error('Erro ao marcar')
    }
  }

  return (
    <>
      {/* Header do plano */}
      <div
        className={cn(
          'card p-4',
          plan.isFeasible
            ? 'bg-gradient-to-r from-brand-50 to-purple-50 dark:from-brand-900/20 dark:to-purple-900/20 border-brand-200 dark:border-brand-800/40'
            : 'bg-gradient-to-r from-warning-50 to-orange-50 dark:from-warning-900/20 dark:to-orange-900/20 border-warning-200 dark:border-warning-800/40',
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground text-sm">{plan.course.name}</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {plan.hoursPerDay}h/dia · {plan.totalHoursAvailable}h disponíveis · meta: {new Date(plan.endDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {plan.isFeasible ? (
              <span className="badge-green text-sm py-1.5 px-3">No prazo ✓</span>
            ) : (
              <span className="badge-yellow text-sm py-1.5 px-3" title={`Déficit: ${plan.deficit}h`}>
                Tempo apertado
              </span>
            )}
            <button
              onClick={doRecalculate}
              disabled={recalculating}
              className="text-xs font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-border hover:bg-muted"
              title="Recalcular o cronograma a partir de hoje"
            >
              <RefreshCw className={cn('w-3 h-3', recalculating && 'animate-spin')} />
              Recalcular
            </button>
          </div>
        </div>
      </div>

      {/* Calendário */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-bold text-foreground">
            {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DOW_NAMES.map((d, i) => (
            <div key={i} className="text-xs text-muted-foreground text-center font-semibold py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square" />
            const iso = toIsoDay(day)
            const sessions = sessionsByDate.get(iso) ?? []
            const totalDone = sessions.filter((s) => s.status === 'CONCLUIDO').length
            const isToday = iso === toIsoDay(today)
            const isSelected = iso === selectedDay
            const hasMock = sessions.some((s) => s.type === 'SIMULADO')

            return (
              <button
                key={iso}
                onClick={() => setSelectedDay(iso)}
                className={cn(
                  'aspect-square rounded-lg border text-xs flex flex-col items-center justify-center gap-0.5 transition relative',
                  isSelected
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 ring-2 ring-brand-500/30'
                    : isToday
                    ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-900/10'
                    : sessions.length > 0
                    ? 'border-border bg-background hover:border-brand-300'
                    : 'border-transparent text-muted-foreground/50',
                )}
              >
                <span className="font-semibold">{day.getDate()}</span>
                {sessions.length > 0 && (
                  <div className="flex gap-0.5">
                    {sessions.slice(0, 4).map((s, j) => (
                      <div
                        key={j}
                        className={cn(
                          'w-1 h-1 rounded-full',
                          s.status === 'CONCLUIDO'
                            ? 'bg-success-500'
                            : s.type === 'SIMULADO'
                            ? 'bg-red-500'
                            : 'bg-brand-400',
                        )}
                      />
                    ))}
                  </div>
                )}
                {hasMock && <span className="absolute top-0.5 right-0.5 text-[8px]">🎯</span>}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-brand-400" />pendente</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success-500" />concluída</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />simulado</span>
        </div>
      </div>

      {/* Sessões do dia */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-foreground">
              {new Date(selectedDay + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {selectedDay === toIsoDay(today) && <span className="ml-2 badge-blue text-xs">Hoje</span>}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSessions.length === 0
                ? 'Dia de descanso'
                : `${completed}/${selectedSessions.length} sessões · ${selectedSessions.reduce((a, s) => a + s.durationMin, 0)} min total`}
            </p>
          </div>
        </div>

        {selectedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma sessão programada neste dia.</p>
        ) : (
          <div className="space-y-2.5">
            {selectedSessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  s.status === 'CONCLUIDO'
                    ? 'border-success-200 bg-success-50/40 dark:border-success-800/30 dark:bg-success-900/10'
                    : 'border-border bg-background hover:border-brand-200',
                )}
              >
                <button
                  onClick={() => s.status !== 'CONCLUIDO' && completeSession(s.id)}
                  disabled={s.status === 'CONCLUIDO'}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition',
                    s.status === 'CONCLUIDO'
                      ? 'border-success-500 bg-success-500'
                      : 'border-muted-foreground hover:border-brand-500 hover:bg-brand-50',
                  )}
                  title={s.status === 'CONCLUIDO' ? 'Concluída' : 'Marcar como concluída'}
                >
                  {s.status === 'CONCLUIDO' && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(TYPE_BADGE[s.type], 'text-xs')}>{TYPE_LABEL[s.type]}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {s.subject?.name ?? (s.type === 'SIMULADO' ? 'Simulado geral' : 'Sem matéria')}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {s.durationMin}min
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
