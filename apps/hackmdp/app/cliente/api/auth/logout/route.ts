import { NextResponse } from 'next/server'
import { clearClienteSession } from '@/lib/client-session'

export async function POST() {
  await clearClienteSession()
  return NextResponse.json({ ok: true })
}
