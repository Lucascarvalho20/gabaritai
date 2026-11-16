'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft, Eye, FileText, Loader2, Lock, Play } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { fmtDuracao, fmtPct } from '@/components/provas/comum'
import type { DesempenhoMateria } from '@/lib/provas/correcao'

type Prova = {
  id: string; titulo: string; ano: number; cargo: string | null; banca: string | null; itens: number
  duracaoMin: number | null; incluiaDiscursiva: boolean; formato: string | null; emAndamento: string | null
  tentativas: Array<{ id: string; pontos: number; pontosMax: number; entregueEm: string }>
  melhor: number | null
}
type Dados = {
  curso: { slug: string; name: string }
  acesso: boolean
  provas: Prova[]
  desempenho: { tentativas: unknown[]; materias: DesempenhoMateria[]; revisar: DesempenhoMateria[] } | null
}

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export default function ProvasDoCursoPage() {
  const { courseSlug } = useParams<{ courseSlug: string }>()
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api.get(`/me/provas/curso/${courseSlug}`)
      .then(({ data }) => setD(data))
      .catch((e) => setErro(e.response?.data?.message ?? 'Não foi possível carregar as provas.'))
  }, [courseSlug])

  if (erro) return <div className="max-w-xl mx-auto card p-6 text-sm">{erro}</div>
  if (!d) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  const anos = [...new Set(d.provas.map((p) => p.ano))]
  const feitas = d.desempenho?.tentativas.length ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard/provas" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Cursos
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-brand-500" /> Provas anteriores</h1>
        <p className="text-sm text-muted-foreground mt-1">{d.curso.name} — provas oficiais, com o tempo do edital de cada ano e o gabarito definitivo.</p>
      </div>

      {!d.acesso && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm inline-flex items-center gap-2"><Lock className="w-4 h-4 text-muted-foreground" /> As provas anteriores fazem parte do curso. Assine para fazer e ver os gabaritos.</p>
          <Link href="/planos" className="btn-primary btn-sm">Ver planos</Link>
        </div>
      )}

      {d.acesso && feitas > 0 && d.desempenho && (
        <div className="card p-5 space-y-3">
          <div>
            <h2 className="font-bold text-sm">Seu desempenho nas provas</h2>
            <p className="text-xs text-muted-foreground">Somando as {feitas} tentativa{feitas === 1 ? '' : 's'}: onde você vai mal de forma consistente, não num dia ruim.</p>
          </div>
          {d.desempenho.revisar.length > 0 ? (
            <div className="text-sm">
              <p className="font-semibold mb-1.5">Revise primeiro</p>
              <ul className="space-y-1">
                {d.desempenho.revisar.slice(0, 4).map((m) => (
                  <li key={m.materia} className="flex justify-between gap-3">
                    <span>{m.materia}</span>
                    <span className="tabular-nums text-muted-foreground">{fmtPct(m.percentual)} em {m.total} itens</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-success-600">Nenhuma matéria abaixo de 60% nas suas provas.</p>
          )}
        </div>
      )}

      {d.provas.length === 0 && <p className="card p-6 text-sm text-muted-foreground">Ainda não há provas oficiais deste curso.</p>}

      {anos.map((ano) => (
        <section key={ano} className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground">{ano}</h2>
          {d.provas.filter((p) => p.ano === ano).map((p) => (
            <div key={p.id} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{p.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.banca, `${p.itens} itens`, p.duracaoMin ? fmtDuracao(p.duracaoMin) : null, p.formato === 'CE' ? 'certo ou errado' : p.formato ? 'múltipla escolha' : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {p.emAndamento && <span className="text-xs font-semibold text-warning-600">Em andamento</span>}
              </div>

              {p.tentativas.length > 0 && (
                <div className="text-sm space-y-1.5">
                  <p className="text-muted-foreground">
                    {p.tentativas.length} tentativa{p.tentativas.length === 1 ? '' : 's'} · melhor <strong className="text-foreground tabular-nums">{fmtNum(p.melhor ?? 0)}</strong> de {p.tentativas[0].pontosMax}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {p.tentativas.slice(0, 6).map((t, i) => (
                      <li key={t.id}>
                        <Link href={`/dashboard/provas/${courseSlug}/${p.id}/resultado/${t.id}`}
                          className={cn('inline-flex gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-muted tabular-nums', i === 0 && 'border-brand-500/40')}>
                          <span className="text-muted-foreground">{fmtData(t.entregueEm)}</span>
                          <strong>{fmtNum(t.pontos)}</strong>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {d.acesso ? (
                  <>
                    <Link href={`/dashboard/provas/${courseSlug}/${p.id}/fazer`} className="btn-primary btn-sm">
                      <Play className="w-3.5 h-3.5" /> {p.emAndamento ? 'Continuar a prova' : p.tentativas.length ? 'Refazer a prova' : 'Fazer a prova'}
                    </Link>
                    <Link href={`/dashboard/provas/${courseSlug}/${p.id}/gabarito`} className="btn-ghost btn-sm"><Eye className="w-3.5 h-3.5" /> Ver com gabarito</Link>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Disponível no plano do curso</span>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        O cronômetro usa o tempo do edital daquele ano. Na Cebraspe, cada item errado anula um certo, e o item anulado vale ponto para todos.
        Cada tentativa fica guardada, para você ver a evolução. As provas e os gabaritos são os oficiais, publicados pela banca e pelo órgão, com a fonte citada.
      </p>
    </div>
  )
}
