import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey

// ─── Tipos do banco ───────────────────────────────────────────────────────────

export interface DBUser {
  id: string
  email: string
  name: string
  plan: 'FREE' | 'BASIC' | 'PREMIUM' | 'LIFETIME'
  courses: string[]
  concurso_alvo: string
  nivel: string
  horas_dia: string
  meta: string
  role: 'ADMIN' | 'STUDENT'
  created_at: string
  updated_at: string
}

export interface DBQuestaoRespondida {
  id: string
  user_id: string
  curso_id: string
  materia_id: string
  correta: boolean
  tempo_segundos: number
  created_at: string
}

export interface DBFlashcardRevisado {
  id: string
  user_id: string
  curso_id: string
  frente: string
  rating: number // 1-5
  created_at: string
}

export interface DBSimuladoFeito {
  id: string
  user_id: string
  curso_id: string
  tipo: 'mini' | 'real'
  total_questoes: number
  corretas: number
  acerto_pct: number
  duracao_segundos: number
  resultados_json: string
  created_at: string
}

export interface DBCronograma {
  id: string
  user_id: string
  configuracao_json: string
  horas_dia: number
  dias_semana: number[]
  data_prova?: string
  updated_at: string
}

// ─── Funções utilitárias ──────────────────────────────────────────────────────

export async function salvarQuestaoRespondida(data: Omit<DBQuestaoRespondida, 'id' | 'created_at'>) {
  if (!supabase) return null
  return supabase.from('questoes_respondidas').insert(data)
}

export async function salvarSimulado(data: Omit<DBSimuladoFeito, 'id' | 'created_at'>) {
  if (!supabase) return null
  return supabase.from('simulados_feitos').insert(data)
}

export async function getHistoricoSimulados(userId: string, cursoId?: string) {
  if (!supabase) return []
  let query = supabase
    .from('simulados_feitos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (cursoId) query = query.eq('curso_id', cursoId)
  const { data } = await query
  return data ?? []
}

export async function getDesempenhoPorMateria(userId: string, cursoId: string) {
  if (!supabase) return []
  const { data } = await supabase
    .from('questoes_respondidas')
    .select('materia_id, correta')
    .eq('user_id', userId)
    .eq('curso_id', cursoId)
  if (!data) return []

  const grouped: Record<string, { total: number; corretas: number }> = {}
  for (const q of data) {
    if (!grouped[q.materia_id]) grouped[q.materia_id] = { total: 0, corretas: 0 }
    grouped[q.materia_id].total++
    if (q.correta) grouped[q.materia_id].corretas++
  }
  return Object.entries(grouped).map(([materia, s]) => ({
    materia,
    total: s.total,
    corretas: s.corretas,
    acerto: Math.round((s.corretas / s.total) * 100),
  }))
}

export async function getProgressoSemanal(userId: string) {
  if (!supabase) return []
  const umaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('questoes_respondidas')
    .select('created_at, correta')
    .eq('user_id', userId)
    .gte('created_at', umaSemanaAtras)
  if (!data) return []

  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const grouped: Record<string, { total: number; corretas: number }> = {}
  for (const q of data) {
    const dia = dias[new Date(q.created_at).getDay()]
    if (!grouped[dia]) grouped[dia] = { total: 0, corretas: 0 }
    grouped[dia].total++
    if (q.correta) grouped[dia].corretas++
  }
  return Object.entries(grouped).map(([dia, s]) => ({
    dia,
    acertos: s.total > 0 ? Math.round((s.corretas / s.total) * 100) : 0,
    questoes: s.total,
  }))
}
