import { NextRequest, NextResponse } from 'next/server'
import { origenPublico } from '@/lib/base-url'

// Demo: se entra derecho, sin pantalla de login. El JWT lo firma
// /api/auth/demo con la organización y los permisos reales.
const AUTOLOGIN = process.env.DEMO_AUTOLOGIN === 'true'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const haySesion = Boolean(request.cookies.get('auth_token')?.value)

  if (AUTOLOGIN) {
    // Next exige URL absoluta acá. Se arma desde el origen PÚBLICO (x-forwarded-*),
    // no desde nextUrl: detrás de un túnel, nextUrl es localhost y sacaría al
    // visitante del túnel.
    const base = origenPublico(request)
    const redir = (a: string) => NextResponse.redirect(new URL(a, base))

    // Ya autenticado: la pantalla de login no tiene sentido, va al panel.
    if (haySesion) {
      if (pathname === '/' || pathname.startsWith('/login')) return redir('/dashboard')
      return NextResponse.next()
    }

    // Sin sesión: se emite una y se vuelve a donde el usuario quería ir.
    const destino = pathname.startsWith('/login') || pathname === '/' ? '/dashboard' : pathname
    return redir(`/api/auth/demo?next=${encodeURIComponent(destino + request.nextUrl.search)}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
