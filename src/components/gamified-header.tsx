'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Flame, Clock, CheckCircle2, Award, ChevronRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type Stats = {
  nivel: number
  xp: number
  xpNoNivel: number
  xpProxNivel: number
  pctNivel: number
  streakDays: number
  studiedDays: boolean[]
  diasEstudando: number
  totalHoras: number
  taxaAcerto: number
  totalAttempts: number
  simuladosFeitos: number
  achievements: Array<{ id: string; label: string; icon: string; unlocked: boolean }>
  unlockedAchievements: number
}

const DIAS_LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function GamifiedHeader() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAchievements, setShowAchievements] = useState(false)

  useEffect(() => {
    api.get('/me/stats').then((r) => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="card p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
  }
  if (!stats) return null

  return (
    <>
      <div className="card p-4 sm:p-5 bg-gradient-to-br from-yellow-400/10 via-orange-400/5 to-transparent border-yellow-500/30">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Lado nível/XP */}
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 border-2 border-card text-white text-xs font-black flex items-center justify-center">
                {stats.nivel}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">NÍVEL {stats.nivel} · {stats.xp.toLocaleString('pt-BR')} XP</div>
              <div className="text-base sm:text-lg font-black truncate">
                {stats.nivel < 5 ? 'Concurseiro iniciante' :
                 stats.nivel < 10 ? 'Concurseiro dedicado' :
                 stats.nivel < 20 ? 'Concurseiro veterano' :
                 stats.nivel < 35 ? 'Concurseiro avançado' :
                 'Concurseiro lendário'}
              </div>
              <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${stats.pctNivel}%` }}
                />
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {stats.xpNoNivel}/{stats.xpProxNivel} XP pro nível {stats.nivel + 1}
              </div>
            </div>
          </div>

          {/* Streak central */}
          <div className="flex items-center gap-3 lg:border-l lg:border-border lg:pl-6">
            <Flame className={cn('w-8 h-8', stats.streakDays > 0 ? 'text-orange-500' : 'text-muted-foreground/40')} />
            <div>
              <div className="text-2xl font-black leading-none">{stats.streakDays}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">dias seguidos</div>
              <div className="flex gap-0.5 mt-1.5">
                {stats.studiedDays.map((s, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-5 h-5 rounded text-[9px] flex items-center justify-center font-bold',
                      s ? 'bg-orange-500 text-white' : 'bg-muted text-muted-foreground',
                    )}
                    title={s ? 'Estudou' : 'Não estudou'}
                  >
                    {DIAS_LETRAS[i]}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats lateral */}
          <div className="grid grid-cols-3 gap-3 lg:gap-4 lg:border-l lg:border-border lg:pl-6">
            <Stat icon={Clock} label="horas" value={`${stats.totalHoras}h`} color="text-blue-500" />
            <Stat icon={CheckCircle2} label="acertos" value={`${stats.taxaAcerto}%`} color="text-green-500" />
            <button
              onClick={() => setShowAchievements(true)}
              className="text-left hover:opacity-80 transition"
            >
              <div className="flex items-center gap-1.5 text-purple-500">
                <Award className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">conquistas</span>
              </div>
              <div className="text-lg font-black mt-0.5 flex items-center gap-1">
                {stats.unlockedAchievements}/{stats.achievements.length}
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {showAchievements && (
        <div onClick={() => setShowAchievements(false)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="card max-w-md w-full p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="font-black text-lg flex items-center gap-2"><Award className="w-5 h-5 text-purple-500" /> Suas conquistas</h2>
            <p className="text-xs text-muted-foreground">{stats.unlockedAchievements} de {stats.achievements.length} desbloqueadas</p>
            <div className="grid grid-cols-2 gap-2">
              {stats.achievements.map((a) => (
                <div key={a.id} className={cn(
                  'p-3 rounded-xl border-2 flex flex-col items-center text-center gap-1',
                  a.unlocked ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-border bg-muted/30 opacity-40 grayscale',
                )}>
                  <div className="text-3xl">{a.icon}</div>
                  <div className="text-xs font-bold leading-tight">{a.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-4 h-4', color)} />
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-black mt-0.5">{value}</div>
    </div>
  )
}
