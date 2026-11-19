'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, ChevronRight, ChevronLeft, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// GET /api/me/provas: os cursos com prova oficial que a conta vê (admin e plano completo: todos).
type Curso = { slug: string; nome: string; provas: number; acesso: boolean }

export default function ProvasIndexPage() {
  const router = useRouter()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/me/provas')
      .then(({ data }) => {
        const lista: Curso[] = data.cursos ?? []
        setCursos(lista)
        // Um curso só: vai direto para as provas dele
        if (lista.length === 1) router.replace(`/dashboard/provas/${lista[0].slug}`)
      })
      .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar as provas'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ChevronLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-black inline-flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Provas anteriores
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Escolhe o curso pra ver as provas oficiais disponíveis.
        </p>
      </div>

      {cursos.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          Nenhum curso seu tem prova oficial ainda. <Link href="/dashboard/meus-cursos" className="text-brand-500 hover:underline">Ver meus cursos</Link>.
        </div>
      ) : (
        <div className="space-y-2">
          {cursos.map((c) => (
            <Link
              key={c.slug}
              href={`/dashboard/provas/${c.slug}`}
              className="card p-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-bold text-sm">{c.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {c.provas} {c.provas === 1 ? 'prova oficial' : 'provas oficiais'}
                  {!c.acesso && ' · disponível no plano do curso'}
                </div>
              </div>
              {c.acesso ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /> : <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
