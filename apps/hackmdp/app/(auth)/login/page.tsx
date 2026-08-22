'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, hostname: window.location.hostname }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión')
      }

      setTransitioning(true)
      await new Promise((resolve) => setTimeout(resolve, 600))

      if (data.requiresOrgSelection) {
        sessionStorage.setItem('temp_persona_id', data.user.persona_id)
        router.push('/select-org')
      } else {
        // Recarga completa (no router.push) al entrar al dashboard: una navegación
        // soft reutiliza el cache cliente (SWR de useSession/useUserPermissions,
        // router cache) del estado deslogueado, y la sidebar queda vacía hasta
        // apretar F5. window.location.href fuerza un load limpio con la cookie ya
        // seteada — igual que hace select-org. Ver: sidebar vacía al iniciar sesión.
        window.location.href = data.redirectTo || '/dashboard'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#f5f7fa] overflow-hidden flex items-center justify-center">
      {/* Colorful gradient background */}
      <div className="absolute inset-0">
        <div
          className="absolute"
          style={{
            width: '150%', height: '150%', top: '-25%', left: '-25%',
            background: 'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(168,85,247,0.12) 0%, transparent 70%)',
            animation: 'aurora1 14s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '150%', height: '150%', top: '-25%', left: '-25%',
            background: 'radial-gradient(ellipse 50% 40% at 75% 25%, rgba(236,72,153,0.09) 0%, transparent 65%)',
            animation: 'aurora2 17s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '150%', height: '150%', top: '-25%', left: '-25%',
            background: 'radial-gradient(ellipse 55% 45% at 60% 75%, rgba(59,130,246,0.10) 0%, transparent 65%)',
            animation: 'aurora3 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            width: '150%', height: '150%', top: '-25%', left: '-25%',
            background: 'radial-gradient(ellipse 40% 35% at 10% 70%, rgba(52,211,153,0.07) 0%, transparent 60%)',
            animation: 'aurora2 15s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-[380px] px-6"
        style={{
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: mounted ? 1 : 0,
          transform: `translateY(${mounted ? 0 : 12}px)`,
        }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-[1.6rem] font-light tracking-[0.25em] text-neutral-700 mb-1"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            UNO
          </h1>
          <p className="text-[13px] font-light tracking-[0.15em] text-neutral-400">
            ELECTROMEDICINA
          </p>
          <div className="w-8 h-px bg-neutral-200 mx-auto mt-4" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email o usuario"
                className="w-full px-4 py-3 rounded-xl bg-white/80 border border-neutral-200/60 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                autoComplete="email"
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3 rounded-xl bg-white/80 border border-neutral-200/60 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-neutral-800 text-white text-sm font-normal hover:bg-neutral-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Ingresar'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* White fade overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'white',
          opacity: transitioning ? 1 : 0,
          transition: 'opacity 0.6s ease-in-out',
          pointerEvents: transitioning ? 'all' : 'none',
          zIndex: 50,
        }}
      />

      <style jsx>{`
        @keyframes aurora1 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
          33% { transform: translate(5%, -3%) rotate(2deg); }
          66% { transform: translate(-3%, 4%) rotate(-1deg); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
          33% { transform: translate(-4%, 5%) rotate(-2deg); }
          66% { transform: translate(6%, -2%) rotate(1deg); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0%, 0%) rotate(0deg); }
          25% { transform: translate(3%, -4%) rotate(1.5deg); }
          50% { transform: translate(-5%, 2%) rotate(-1deg); }
          75% { transform: translate(2%, 5%) rotate(0.5deg); }
        }
      `}</style>
    </div>
  )
}
