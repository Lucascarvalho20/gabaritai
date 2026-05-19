'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'

type Course = { id: string; slug: string; name: string; cargo: string | null }

export default function EditalVerticalizadoIndexPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data.courses ?? [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <FileText className="w-6 h-6 text-brand-500" /> Edital verticalizado
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Veja matérias, peso, assuntos mais cobrados e seu desempenho em cada um.
        </p>
      </div>
      <div className="space-y-2">
        {courses.map((c) => (
          <Link key={c.id} href={`/dashboard/edital-verticalizado/${c.slug}`}
            className="card p-4 hover:border-brand-500/40 transition flex items-center justify-between">
            <div>
              <div className="font-bold text-sm">{c.name}</div>
              {c.cargo && <div className="text-xs text-muted-foreground">{c.cargo}</div>}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
