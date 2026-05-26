'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, MessageCircle, ExternalLink, Loader2, Lock } from 'lucide-react'
import { api } from '@/lib/api'
import { getAllCommunities, type CommunityLink } from '@/lib/community-links'

type Enrollment = {
  courseId: string
  courseName: string
  parentSlug: string | null
  orgao: string | null
  cargo: string | null
  isActive: boolean
}

export default function ComunidadePage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/me/enrollments')
      .then(({ data }) => setEnrollments(data.enrollments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>
  }

  const allCommunities = getAllCommunities()
  const activeEnrollments = enrollments.filter((e) => e.isActive)
  const enrolledParentSlugs = new Set(
    activeEnrollments.map((e) => e.parentSlug).filter(Boolean) as string[],
  )

  // Comunidades que o aluno pode acessar (parentSlug bate com algum curso ativo)
  const accessibleCommunities = allCommunities.filter((c) =>
    enrolledParentSlugs.has(c.parentSlug),
  )

  // Outras comunidades disponíveis (alunos curiosos)
  const otherCommunities = allCommunities.filter((c) =>
    !enrolledParentSlugs.has(c.parentSlug) && c.ativo,
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-black inline-flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-500" />
          Comunidade
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Grupos no WhatsApp por concurso pra estudo coletivo, troca de provas e dicas dos aprovados.
          Acesso liberado pra alunos matriculados.
        </p>
      </div>

      {/* Tuas comunidades */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Suas comunidades
        </h2>
        {accessibleCommunities.length === 0 ? (
          <div className="card p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {activeEnrollments.length === 0
                ? 'Você ainda não tem nenhum curso ativo.'
                : 'Sem comunidade pros seus cursos ainda — estamos formando os grupos.'}
            </p>
            {activeEnrollments.length === 0 && (
              <Link href="/dashboard/meus-cursos" className="rounded-xl bg-brand-500 text-white px-4 py-2 text-sm font-bold inline-block">
                Ativar curso
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {accessibleCommunities.map((c) => (
              <CommunityCard key={c.parentSlug} c={c} accessible />
            ))}
          </div>
        )}
      </section>

      {/* Outras comunidades — só preview, não entra */}
      {otherCommunities.length > 0 && (
        <section className="pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Outras comunidades · ative o curso pra entrar
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {otherCommunities.map((c) => (
              <CommunityCard key={c.parentSlug} c={c} accessible={false} />
            ))}
          </div>
        </section>
      )}

      {/* Caso TODAS estejam inativas */}
      {allCommunities.every((c) => !c.ativo) && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
          <MessageCircle className="w-7 h-7 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-semibold">Grupos sendo montados</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Estamos formando as primeiras comunidades por concurso. Volta aqui em breve — alunos do trial
            que entrarem agora viram fundadores dos grupos.
          </p>
        </div>
      )}
    </div>
  )
}

function CommunityCard({ c, accessible }: { c: CommunityLink; accessible: boolean }) {
  const hasLink = Boolean(c.whatsappUrl && c.ativo)
  return (
    <div className={`card p-4 ${!accessible ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            {c.nome}
          </div>
          {c.membros != null && c.membros > 0 && (
            <div className="text-[11px] text-muted-foreground">{c.membros}+ membros</div>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{c.descricao}</p>
      {accessible ? (
        hasLink ? (
          <a
            href={c.whatsappUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Entrar no WhatsApp <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground text-center italic">
            Grupo sendo montado · aguarde o convite
          </div>
        )
      ) : (
        <Link
          href="/dashboard/meus-cursos"
          className="w-full rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3 h-3" /> Ative o curso pra entrar
        </Link>
      )}
    </div>
  )
}
