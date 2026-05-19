import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncConcursosFromApi, PRIORITY_UFS, isRelevantOrgao } from '@/lib/concursos-api'
import { telegramNewEditalDraft } from '@/lib/telegram'
import { EditalStatus } from '@prisma/client'

export const maxDuration = 300

// Cron diário às 09h UTC (06h BRT). Detecta editais novos e cria RASCUNHOS pro admin revisar.
//
// Fluxo:
//   1. Sincroniza ConcursoAlerta da concursos-api (UFs prioritárias)
//   2. Pega alertas RELEVANTES (PMs, PCs, PFs, etc) que ainda não têm Edital vinculado
//   3. Pra cada um, tenta match com Course existente (orgão/uf)
//   4. Se match: cria Edital RASCUNHO (status=PREVISTO, isActive=false, ano atual)
//   5. Notifica admin via Telegram com link pra revisar
//
// Admin então abre /admin/editais → tab "Rascunhos" → completa com texto do edital + IA extract.
async function handler(req: NextRequest) {
  const token = req.headers.get('x-cron-token') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  const expected = process.env.CRON_TOKEN ?? 'gabaritai-dev-cron-token'
  if (token !== expected) {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 })
  }

  // 1. Sincroniza concursos-api primeiro (atualiza alertas)
  const syncResult = await syncConcursosFromApi(PRIORITY_UFS)

  // 2. Pega alertas relevantes pendentes (sem Edital criado, não dismissed)
  const pending = await prisma.concursoAlerta.findMany({
    where: {
      isRelevant: true,
      dismissed: false,
      linkedEdital: null,
      status: 'ABERTO',
    },
    orderBy: { firstSeenAt: 'desc' },
    take: 50,
  })

  const draftsCreated: Array<{ courseSlug: string; editalId: string; orgao: string }> = []
  const cursosNotificar: string[] = []

  for (const alerta of pending) {
    if (!isRelevantOrgao(alerta.orgao)) continue

    // Tenta match com curso existente por orgão+uf
    const orgaoNorm = alerta.orgao.toLowerCase()
    const candidates = await prisma.course.findMany({
      where: {
        active: true,
        OR: [
          { orgao: { contains: alerta.orgao, mode: 'insensitive' } },
          { uf: alerta.uf },
        ],
      },
      take: 5,
    })

    // Filtra candidatos por similaridade simples (contém token comum)
    const matched = candidates.find((c) => {
      if (!c.orgao && !c.uf) return false
      const courseOrgao = (c.orgao ?? '').toLowerCase()
      const courseUf = (c.uf ?? '').toLowerCase()
      const alertaUf = alerta.uf.toLowerCase()
      return (
        (courseOrgao && orgaoNorm.includes(courseOrgao)) ||
        (courseOrgao && courseOrgao.includes(orgaoNorm)) ||
        (courseUf && courseUf === alertaUf && orgaoNorm.includes(courseOrgao.slice(0, 3)))
      )
    })

    if (!matched) continue

    // Verifica se já existe um Edital deste ano pra esse curso
    const existing = await prisma.edital.findFirst({
      where: { courseId: matched.id, ano: new Date().getFullYear() },
    })
    if (existing) continue // já tem — não duplica

    const edital = await prisma.edital.create({
      data: {
        courseId: matched.id,
        ano: new Date().getFullYear(),
        titulo: `${alerta.orgao} ${new Date().getFullYear()} (rascunho automático)`,
        status: EditalStatus.PREVISTO,
        isActive: false,
        vagas: alerta.vagas ? parseInt(alerta.vagas.replace(/[^0-9]/g, '')) || null : null,
        sourceApi: 'concursos-api.deno.dev',
        rawData: alerta.rawData as any,
      },
    })

    await prisma.concursoAlerta.update({
      where: { id: alerta.id },
      data: { linkedEdital: edital.id },
    })

    draftsCreated.push({ courseSlug: matched.slug, editalId: edital.id, orgao: alerta.orgao })
    cursosNotificar.push(`${matched.name}${matched.cargo ? ` (${matched.cargo})` : ''}`)
  }

  if (draftsCreated.length > 0) {
    await telegramNewEditalDraft({ count: draftsCreated.length, cursos: cursosNotificar })
  }

  return NextResponse.json({
    sync: syncResult,
    draftsCreated: draftsCreated.length,
    drafts: draftsCreated,
    timestamp: new Date().toISOString(),
  })
}

export const GET = handler
export const POST = handler
