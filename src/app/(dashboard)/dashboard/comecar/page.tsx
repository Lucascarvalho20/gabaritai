'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ChevronRight, ChevronLeft, Sparkles, Target, Calendar, Clock, BookOpen, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null; area: string }
type Group = { parentSlug: string; orgao: string | null; uf: string | null; label: string; cargos: Course[] }

const STEPS = [
  { num: 1, label: 'Curso', icon: BookOpen },
  { num: 2, label: 'Horários', icon: Clock },
  { num: 3, label: 'Meta', icon: Target },
  { num: 4, label: 'Pronto', icon: Sparkles },
]

const DAYS = [
  { num: 1, label: 'Seg' },
  { num: 2, label: 'Ter' },
  { num: 3, label: 'Qua' },
  { num: 4, label: 'Qui' },
  { num: 5, label: 'Sex' },
  { num: 6, label: 'Sáb' },
  { num: 0, label: 'Dom' },
]

export default function ComecarWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<Group[]>([])

  // Step 1: Curso
  const [parentSlug, setParentSlug] = useState('')
  const [courseId, setCourseId] = useState('')

  // Step 2: Horários
  const [hoursPerDay, setHoursPerDay] = useState(3)
  const [daysPerWeek, setDaysPerWeek] = useState<number[]>([1, 2, 3, 4, 5])

  // Step 3: Meta
  const [examDate, setExamDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 6)
    return d.toISOString().slice(0, 10)
  })

  // Step 4: feedback
  const [preview, setPreview] = useState<any>(null)
  const [creating, setCreating] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    api.get('/courses').then(({ data }) => {
      setGroups(data.groups ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const selectedGroup = groups.find((g) => g.parentSlug === parentSlug)

  function toggleDay(d: number) {
    setDaysPerWeek((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort())
  }

  async function gerarPreview() {
    if (!courseId) return toast.error('Selecione um curso')
    setPreviewing(true)
    try {
      const { data } = await api.post('/schedule/preview', {
        courseId,
        hoursPerDay,
        daysPerWeek,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: examDate,
      })
      setPreview(data)
      setStep(4)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setPreviewing(false) }
  }

  async function criar() {
    if (!courseId) return
    setCreating(true)
    try {
      await api.post('/schedule', {
        courseId, hoursPerDay, daysPerWeek,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: examDate,
      })
      toast.success('Plano criado! 🎉')
      router.push('/dashboard/cronograma')
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally { setCreating(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-black">Vamos montar seu plano</h1>
        <p className="text-sm text-muted-foreground mt-1">Em 4 passos rápidos</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex-1 flex items-center">
            <div className={cn(
              'flex flex-col items-center gap-1',
            )}>
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center border-2 transition',
                step >= s.num ? 'bg-brand-500 text-white border-brand-500' : 'border-border bg-card text-muted-foreground',
              )}>
                {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <span className="text-[10px] font-bold">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2', step > s.num ? 'bg-brand-500' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo do step */}
      <div className="card p-5 sm:p-6 space-y-5">
        {step === 1 && (
          <>
            <h2 className="font-bold text-lg">Qual concurso você está estudando?</h2>
            <div>
              <label className="text-xs font-bold">Concurso</label>
              <select value={parentSlug} onChange={(e) => { setParentSlug(e.target.value); setCourseId('') }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
                <option value="">— escolha —</option>
                {groups.map((g) => (
                  <option key={g.parentSlug} value={g.parentSlug}>
                    {g.label} {g.uf ? `(${g.uf})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedGroup && selectedGroup.cargos.length > 1 && (
              <div>
                <label className="text-xs font-bold">Cargo</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {selectedGroup.cargos.map((c) => (
                    <button key={c.id} onClick={() => setCourseId(c.id)}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left text-sm font-semibold transition',
                        courseId === c.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-border hover:bg-muted',
                      )}>
                      {c.cargo ?? c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedGroup && selectedGroup.cargos.length === 1 && courseId !== selectedGroup.cargos[0].id && (() => { setCourseId(selectedGroup.cargos[0].id); return null })()}
            <div className="flex justify-end pt-2">
              <button onClick={() => setStep(2)} disabled={!courseId}
                className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50">
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-bold text-lg">Quanto tempo você pode dedicar?</h2>
            <div>
              <label className="text-xs font-bold">Horas por dia: {hoursPerDay}h</label>
              <input type="range" min={1} max={12} step={0.5} value={hoursPerDay}
                onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
                className="mt-2 w-full" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>1h</span><span>4h (recomendado)</span><span>12h</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold">Dias que você consegue estudar</label>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {DAYS.map((d) => (
                  <button key={d.num} onClick={() => toggleDay(d.num)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-bold transition',
                      daysPerWeek.includes(d.num) ? 'bg-brand-500 text-white' : 'bg-muted hover:bg-muted/70',
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{daysPerWeek.length} dias/semana</p>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button onClick={() => setStep(3)} disabled={daysPerWeek.length === 0}
                className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50">
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-bold text-lg">Quando é sua prova?</h2>
            <div>
              <label className="text-xs font-bold">Data prevista (ou meta)</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-1">
                Se não tem data certa, escolhe 6 meses pra frente. Você pode mudar depois.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 text-xs text-blue-700 dark:text-blue-200">
              💡 Seu plano vai distribuir: <strong>{hoursPerDay}h/dia × {daysPerWeek.length} dias/semana</strong>
              <br />Total semanal: <strong>{(hoursPerDay * daysPerWeek.length).toFixed(1)}h</strong>
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
              <button onClick={gerarPreview} disabled={previewing}
                className="rounded-xl bg-brand-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50">
                {previewing ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando…</> : <><Sparkles className="w-4 h-4" /> Gerar plano</>}
              </button>
            </div>
          </>
        )}

        {step === 4 && preview && (
          <>
            <h2 className="font-bold text-lg">🎉 Seu plano está pronto</h2>
            <div className="space-y-2">
              <Stat label="Horas necessárias" value={`${preview.totalHoursNeeded ?? '?'}h`} />
              <Stat label="Horas disponíveis" value={`${preview.totalHoursAvailable ?? '?'}h`} />
              <Stat label="Cabe no prazo?" value={preview.isFeasible ? '✅ SIM' : '⚠️ Apertado'} />
              {!preview.isFeasible && (
                <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-xs">
                  💡 Aumente {Math.ceil((preview.deficit ?? 0) / daysPerWeek.length / 4)}h por semana ou adianta a data alvo pra caber.
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(3)}
                className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Ajustar
              </button>
              <button onClick={criar} disabled={creating}
                className="rounded-xl bg-green-500 text-white px-5 py-2.5 text-sm font-bold inline-flex items-center gap-1 disabled:opacity-50">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</> : <><Check className="w-4 h-4" /> Criar plano</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-2 rounded border border-border">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}
