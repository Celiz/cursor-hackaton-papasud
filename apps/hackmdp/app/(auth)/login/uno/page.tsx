'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Loader2, Lock, ArrowLeft, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Login personalizado para Uno Electromedicina.
 *
 * URL destino: papasud.local (rewrite via middleware/DNS).
 * Fallback local: /login/uno
 *
 * UX flow:
 *   1. Se cargan los miembros del equipo via /api/auth/team?org=uno-electromedicina
 *   2. Se muestran como cards con iniciales + nombre
 *   3. El usuario clickea su card → se expande y muestra campo de contraseña
 *   4. Enter → POST /api/auth/login con email pre-llenado + password
 *   5. Redirect al dashboard (o select-org si tiene múltiples)
 *
 * Sin email manual. Sin username. Solo elegir y tipear contraseña.
 */

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar')
  return res.json()
}

interface TeamMember {
  nombre: string
  email: string
  rol: string
  cargo: string | null
  foto_url: string | null
  initials: string
}

interface TeamData {
  org: { nombre: string; slug: string; theme: string | null; logo_url: string | null } | null
  members: TeamMember[]
}

// Colores para los avatares — cicla por index para variedad visual
const AVATAR_COLORS = [
  'from-purple-500 to-purple-700',
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',
]

const ROL_LABELS: Record<string, string> = {
  owner: 'Director',
  admin: 'Administrador',
  employee: 'Equipo',
}

export default function LoginUnoPage() {
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { data, isLoading: loadingTeam } = useSWR<TeamData>(
    '/api/auth/team?org=uno-electromedicina',
    fetcher
  )

  useEffect(() => { setMounted(true) }, [])

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMember(member)
    setPassword('')
    setError('')
  }

  const handleBack = () => {
    setSelectedMember(null)
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember || !password) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedMember.email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Contraseña incorrecta')
      }

      setTransitioning(true)
      await new Promise(r => setTimeout(r, 600))

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

  const members = data?.members || []

  return (
    <div className="fixed inset-0 bg-[#f5f7fa] overflow-hidden flex items-center justify-center">
      {/* Background gradients — purple theme for Uno */}
      <div className="absolute inset-0">
        <div className="absolute" style={{
          width: '150%', height: '150%', top: '-25%', left: '-25%',
          background: 'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,58,237,0.12) 0%, transparent 70%)',
          animation: 'aurora1 14s ease-in-out infinite',
        }} />
        <div className="absolute" style={{
          width: '150%', height: '150%', top: '-25%', left: '-25%',
          background: 'radial-gradient(ellipse 50% 40% at 75% 25%, rgba(168,85,247,0.09) 0%, transparent 65%)',
          animation: 'aurora2 17s ease-in-out infinite',
        }} />
        <div className="absolute" style={{
          width: '150%', height: '150%', top: '-25%', left: '-25%',
          background: 'radial-gradient(ellipse 55% 45% at 60% 75%, rgba(99,102,241,0.10) 0%, transparent 65%)',
          animation: 'aurora3 20s ease-in-out infinite',
        }} />
      </div>

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-[520px] px-6"
        style={{
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: mounted ? 1 : 0,
          transform: `translateY(${mounted ? 0 : 12}px)`,
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h1
              className="text-xl font-semibold tracking-wide text-neutral-700"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {data?.org?.nombre || 'Uno Electromedicina'}
            </h1>
          </div>
          <p className="text-[13px] font-light tracking-wide text-neutral-400">
            {selectedMember ? 'Ingresá tu contraseña' : 'Seleccioná tu usuario'}
          </p>
          <div className="w-8 h-px bg-purple-300/50 mx-auto mt-3" />
        </div>

        <AnimatePresence mode="wait">
          {/* Estado 1: Grid de usuarios */}
          {!selectedMember && (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {loadingTeam ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-neutral-500">No se encontraron usuarios</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="mt-4 text-sm text-purple-600 hover:underline"
                  >
                    Ir al login general
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {members.map((member, i) => (
                    <button
                      key={member.email}
                      onClick={() => handleSelectMember(member)}
                      className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(0,0,0,0.06)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-14 h-14 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:shadow-purple-500/25 transition-shadow`}
                      >
                        {member.foto_url ? (
                          <img src={member.foto_url} alt={member.nombre} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-white text-lg font-semibold tracking-wide">
                            {member.initials}
                          </span>
                        )}
                      </div>
                      {/* Name + role */}
                      <div className="text-center min-w-0 w-full">
                        <p className="text-sm font-medium text-neutral-700 truncate">
                          {member.nombre.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                          {member.cargo || ROL_LABELS[member.rol] || member.rol}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Estado 2: Contraseña para el usuario seleccionado */}
          {selectedMember && (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="rounded-2xl p-6"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Selected user card */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition"
                    title="Volver"
                  >
                    <ArrowLeft className="w-4 h-4 text-neutral-500" />
                  </button>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${AVATAR_COLORS[members.indexOf(selectedMember) % AVATAR_COLORS.length]} flex items-center justify-center shadow-lg`}>
                    {selectedMember.foto_url ? (
                      <img src={selectedMember.foto_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold">{selectedMember.initials}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-700">{selectedMember.nombre}</p>
                    <p className="text-xs text-neutral-400">{selectedMember.email}</p>
                  </div>
                </div>

                {/* Password form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      placeholder="Contraseña"
                      autoFocus
                      autoComplete="current-password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 border border-neutral-200/60 text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 transition-all"
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full py-3 rounded-xl bg-purple-700 text-white text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Ingresar'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer link */}
        <p className="text-center mt-6 text-xs text-neutral-400">
          <button onClick={() => router.push('/login')} className="hover:text-purple-600 transition">
            Usar email y contraseña
          </button>
        </p>
      </div>

      {/* Transition overlay */}
      <div style={{
        position: 'fixed', inset: 0, background: 'white',
        opacity: transitioning ? 1 : 0,
        transition: 'opacity 0.6s ease-in-out',
        pointerEvents: transitioning ? 'all' : 'none',
        zIndex: 50,
      }} />

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
