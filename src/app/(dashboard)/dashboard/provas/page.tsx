'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

type Course = { id: string; slug: string; name: string; cargo: string | null; orgao: string | null }

export default function ProvasIndexPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/me/cursos')
      .then(({ data }) => {
        const ativos = (data.enrollments ?? []).filter((e: any) => e.isActive).map((e: any) => e.course)
        setCourses(ativos)
        // Se só tem 1 curso ativo, redireciona direto
        if (ativos.length === 1) {
          router.replace(`/dashboard/provas/${ativos[0].slug}`)
        }
      })
      .catch(() => {
        // Fallback: lista todos cursos
        api.get('/courses?all=true').then(({ data }) => setCourses(data.courses ?? []))
          .catch((err) => toast.error(err.response?.data?.message ?? 'Erro ao carregar cursos'))
      })
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

      {courses.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          Você ainda não tem cursos ativos. <Link href="/dashboard/meus-cursos" className="text-brand-500 hover:underline">Escolher um agora</Link>.
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/provas/${c.slug}`}
              className="card p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.cargo}{c.orgao ? ` · ${c.orgao}` : ''}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
