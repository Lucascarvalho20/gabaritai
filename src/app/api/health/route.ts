import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasApiUrl: !!process.env.NEXT_PUBLIC_API_URL,
      nodeEnv: process.env.NODE_ENV,
    }
  })
}
