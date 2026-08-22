'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Calendar, FlaskConical, FileText, User, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { ClienteSession } from '@/lib/client-session'

const THEME_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  purple: { bg: 'bg-purple-600', text: 'text-purple-600', accent: 'border-purple-600' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-600', accent: 'border-amber-600' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', accent: 'border-emerald-600' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', accent: 'border-blue-600' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', accent: 'border-rose-600' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-600', accent: 'border-cyan-600' },
}

const NAV_ITEMS = [
  { href: '/cliente/inicio', label: 'Inicio', icon: Home },
  { href: '/cliente/turnos', label: 'Turnos', icon: Calendar },
  { href: '/cliente/resultados', label: 'Resultados', icon: FlaskConical },
  { href: '/cliente/presupuestos', label: 'Presupuestos', icon: FileText },
  { href: '/cliente/cuenta', label: 'Mi cuenta', icon: User },
]

export default function PortalShell({
  session,
  children,
}: {
  session: ClienteSession
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const theme = THEME_COLORS[session.org_theme] || THEME_COLORS.purple

  const visibleNav = session.scope === 'limited'
    ? NAV_ITEMS.filter(item => {
        if (item.href === '/cliente/inicio') return true
        if (session.recurso_tipo === 'orden' && item.href === '/cliente/resultados') return true
        if (session.recurso_tipo === 'presupuesto' && item.href === '/cliente/presupuestos') return true
        return false
      })
    : NAV_ITEMS

  async function handleLogout() {
    await fetch('/cliente/api/auth/logout', { method: 'POST' })
    router.push('/cliente/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`${theme.bg} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="font-semibold text-lg leading-tight">{session.org_nombre}</h1>
            <p className="text-sm opacity-80">{session.nombre}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Limited scope banner */}
      {session.scope === 'limited' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
          Estás viendo un contenido específico.{' '}
          <a href="/cliente/activar" className="font-medium underline">
            Activá tu cuenta
          </a>{' '}
          para acceder a todo.
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <nav className="hidden md:flex flex-col w-56 border-r bg-white min-h-[calc(100vh-56px)] p-3 gap-1">
          {visibleNav.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                  ${active ? `${theme.text} bg-gray-100 font-medium` : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
            <nav className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-lg p-4 pt-16 space-y-1">
              {visibleNav.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm
                      ${active ? `${theme.text} bg-gray-100 font-medium` : 'text-gray-600'}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </a>
                )
              })}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden flex justify-around py-2 z-30">
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs
                ${active ? theme.text : 'text-gray-400'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
