'use client'

import { useEffect, useState } from 'react'
import { Trophy, Loader2, Medal, Award, Users, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

type RankRow = {
  position: number
  userId: string
  userName: string
  avatar: string | null
  score: number
  acertos: number
  erros: number
  brancos: number
  timeMs: number | null
  isMe: boolean
}

type Ranking = {
  mockExam: { id: string; title: string; scheduledDay: string; weekStart: string } | null
  ranking: RankRow[]
  myPosition: number | null
  totalParticipants: number
  myShowInRanking: boolean
}

type Course = { id: string; slug: string; name: string; cargo: string | null }

const DAYS = [
  { id: 'SUN', label: 'Simulado real (domingo)' },
  { id: 'THU', label: 'Mini-simulado (quinta)' },
  { id: 'TUE', label: 'Mini-simulado (terça)' },
]

export default function RankingPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [courseSlug, setCourseSlug] = useState('')
  const [day, setDay] = useState('SUN')
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/courses').then(({ data }) => {
      setCourses(data.courses ?? [])
      if (data.courses?.[0]) setCourseSlug(data.courses[0].slug)
    })
  }, [])

  useEffect(() => {
    if (!courseSlug) return
    setLoading(true)
    api.get(`/ranking?courseSlug=${courseSlug}&day=${day}`)
      .then(({ data }) => setRanking(data))
      .finally(() => setLoading(false))
  }, [courseSlug, day])

  async function toggleOptIn() {
    if (!ranking?.mockExam) return
    try {
      await api.patch('/ranking', { mockExamId: ranking.mockExam.id, showInRanking: !ranking.myShowInRanking })
      toast.success(ranking.myShowInRanking ? 'Removido do ranking' : 'Você está no ranking!')
      // Recarrega
      const { data } = await api.get(`/ranking?courseSlug=${courseSlug}&day=${day}`)
      setRanking(data)
    } catch {
      toast.error('Erro')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" /> Ranking semanal
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Veja como você se sai contra outros alunos do mesmo curso no simulado da semana.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {courses.length > 1 && (
          <select value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold">
            {courses.map((c) => (<option key={c.slug} value={c.slug}>{c.name}{c.cargo ? ` · ${c.cargo}` : ''}</option>))}
          </select>
        )}
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button key={d.id} onClick={() => setDay(d.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border', day === d.id ? 'bg-brand-500 text-white border-brand-500' : 'border-border bg-card hover:bg-muted')}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
      ) : !ranking?.mockExam ? (
        <div className="card p-10 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Simulado dessa janela ainda não foi gerado pra esse curso.</p>
        </div>
      ) : (
        <>
          <div className="card p-4 bg-gradient-to-br from-yellow-50/50 to-orange-50/30 dark:from-yellow-900/10 dark:to-orange-900/5 border-yellow-500/30">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-bold text-base">{ranking.mockExam.title}</h2>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> {ranking.totalParticipants} participantes
                </div>
              </div>
              {ranking.myPosition && (
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Sua posição</div>
                  <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400">{ranking.myPosition}º</div>
                </div>
              )}
            </div>
            {ranking.myPosition && (
              <button onClick={toggleOptIn} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline">
                {ranking.myShowInRanking ? <><Eye className="w-3 h-3" /> Aparecer no ranking público</> : <><EyeOff className="w-3 h-3" /> Oculto — clica pra entrar</>}
              </button>
            )}
          </div>

          {ranking.ranking.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted-foreground">
              Ninguém optou por aparecer no ranking ainda. Seja o primeiro!
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-xs text-muted-foreground text-left">
                    <th className="py-2 px-3">#</th>
                    <th>Aluno</th>
                    <th className="text-right">Nota</th>
                    <th className="text-right hidden sm:table-cell">✓ / ✗ / —</th>
                    <th className="text-right hidden md:table-cell">Tempo</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.ranking.map((r) => (
                    <tr key={r.userId}
                      className={cn(
                        'border-t border-border',
                        r.isMe && 'bg-yellow-50 dark:bg-yellow-900/20 font-bold',
                      )}>
                      <td className="py-2 px-3">
                        <PosBadge pos={r.position} />
                      </td>
                      <td className="py-2 flex items-center gap-2">
                        {r.avatar ? (
                          <img src={r.avatar} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {r.userName.charAt(0)}
                          </div>
                        )}
                        <span>{r.userName}{r.isMe && ' (você)'}</span>
                      </td>
                      <td className="text-right font-bold">{r.score}/10</td>
                      <td className="text-right hidden sm:table-cell text-xs">{r.acertos}/{r.erros}/{r.brancos}</td>
                      <td className="text-right hidden md:table-cell text-xs text-muted-foreground">
                        {r.timeMs ? `${Math.round(r.timeMs / 60000)}min` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PosBadge({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-xl">🥇</span>
  if (pos === 2) return <span className="text-xl">🥈</span>
  if (pos === 3) return <span className="text-xl">🥉</span>
  return <span className="text-xs font-bold text-muted-foreground">{pos}º</span>
}
