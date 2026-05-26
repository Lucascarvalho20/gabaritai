import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me/notifications/preferences  → retorna prefs atuais
 * PATCH                                  → atualiza prefs
 *
 * Toggle simples sobre os campos User: notifyEmail, notifyTelegram,
 * notifyWhatsapp + whatsappPhone, studyTimeHour (no futuro).
 */

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const u = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      notifyEmail: true,
      notifyTelegram: true,
      notifyWhatsapp: true,
      whatsappPhone: true,
      telegramChatId: true,
      email: true,
    },
  })

  return NextResponse.json({ preferences: u })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req)
  if (!auth.user) return NextResponse.json({ message: auth.message }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (typeof body.notifyEmail === 'boolean') data.notifyEmail = body.notifyEmail
  if (typeof body.notifyTelegram === 'boolean') data.notifyTelegram = body.notifyTelegram
  if (typeof body.notifyWhatsapp === 'boolean') data.notifyWhatsapp = body.notifyWhatsapp
  if (typeof body.whatsappPhone === 'string') {
    const phone = body.whatsappPhone.replace(/\D/g, '')
    if (phone.length === 0) data.whatsappPhone = null
    else if (phone.length >= 10 && phone.length <= 13) data.whatsappPhone = phone
    else return NextResponse.json({ message: 'Telefone inválido' }, { status: 400 })
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'Nada pra atualizar' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: auth.user.id },
    data,
    select: {
      notifyEmail: true, notifyTelegram: true, notifyWhatsapp: true,
      whatsappPhone: true, telegramChatId: true,
    },
  })

  return NextResponse.json({ ok: true, preferences: updated })
}
