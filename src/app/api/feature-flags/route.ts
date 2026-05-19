import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-server'
import { getActiveFlags } from '@/lib/feature-flags'

// GET /api/feature-flags
// Retorna flags ativas pro user (determinístico por hash userId)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req).catch(() => null)
  const flags = getActiveFlags(user?.id)
  return NextResponse.json({ flags })
}
