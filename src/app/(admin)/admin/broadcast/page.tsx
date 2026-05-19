'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Loader2, Send, Users, BookOpen, Award, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string; cargo: string | null }

const PLANS = [
  { id: 'FREE', label: 'Free / Trial' },
  { id: 'BASIC', label: 'Basic (mensal)' },
  { id: 'PREMIUM', label: 'Premium (anual/combo)' },
  { id: 'LIFETIME', label: 'Vitalício' },
]

export default function BroadcastPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'ALL' | 'COURSE' | 'PLAN'>('ALL')
  const [courseSlug, setCourseSlug] = useState('')
  const [plan, setPlan] = useState('FREE')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    api.get('/courses?all=true').then(({ data }) => setCourses(data.courses ?? []))
  }, [])

  async function preview() {
    if (!title || !body) return toast.error('Preencha título e mensagem')
    setPreviewing(true)
    try {
      const { data } = await api.post('/admin/broadcast', {
        title, body, target,
        courseSlug: target === 'COURSE' ? courseSlug : undefined,
        plan: target === 'PLAN' ? plan : undefined,
        dryRun: true,
      })
      setPreviewCount(data.wouldNotify)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setPreviewing(false)
    }
  }

  async function send() {
    if (previewCount === null) {
      toast.error('Faça preview antes de enviar')
      return
    }
    if (!confirm(`Confirmar envio pra ${previewCount} alunos?`)) return
    setSending(true)
    try {
      const { data } = await api.post('/admin/broadcast', {
        title, body, target,
        courseSlug: target === 'COURSE' ? courseSlug : undefined,
        plan: target === 'PLAN' ? plan : undefined,
      })
      toast.success(`Enviado pra ${data.recipients} alunos`)
      setTitle('')
      setBody('')
      setPreviewCount(null)
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-orange-500" /> Mensagem broadcast
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Envia notificação pra muitos alunos de uma vez (aparece no sino do dashboard deles).
        </p>
      </div>

      <div className="card p-3 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-xs text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        Use com cuidado. Mensagens em massa são auditadas e podem ser interpretadas como spam.
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-bold">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Nova prova disponível!"
            maxLength={100}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          <div className="text-[10px] text-muted-foreground text-right">{title.length}/100</div>
        </div>
        <div>
          <label className="text-xs font-bold">Mensagem</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
            placeholder="Texto da notificação..."
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          <div className="text-[10px] text-muted-foreground text-right">{body.length}/500</div>
        </div>

        <div>
          <label className="text-xs font-bold">Destinatários</label>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <TargetBtn icon={Users} label="Todos alunos" active={target === 'ALL'} onClick={() => setTarget('ALL')} />
            <TargetBtn icon={BookOpen} label="Por curso" active={target === 'COURSE'} onClick={() => setTarget('COURSE')} />
            <TargetBtn icon={Award} label="Por plano" active={target === 'PLAN'} onClick={() => setTarget('PLAN')} />
          </div>
        </div>

        {target === 'COURSE' && (
          <div>
            <label className="text-xs font-bold">Curso</label>
            <select value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">
              <option value="">— escolha —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}{c.cargo ? ` · ${c.cargo}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {target === 'PLAN' && (
          <div>
            <label className="text-xs font-bold">Plano</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">
              {PLANS.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={preview} disabled={previewing || !title || !body}
            className="rounded-xl border border-border bg-card hover:bg-muted px-4 py-2 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2">
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Preview destinatários
          </button>
          {previewCount !== null && (
            <button onClick={send} disabled={sending}
              className="flex-1 rounded-xl bg-orange-500 text-white px-4 py-2 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar pra {previewCount} alunos
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TargetBtn({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn(
        'p-3 rounded-xl border-2 transition flex flex-col items-center gap-1',
        active ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-border bg-card hover:bg-muted',
      )}>
      <Icon className={cn('w-4 h-4', active ? 'text-orange-500' : 'text-muted-foreground')} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  )
}
