'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Organization {
  id: string
  nombre: string
  slug: string
  logo_url?: string
  theme?: string
  tipo?: string
  rol: string
}

const ORG_COLORS: Record<string, string> = {
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
}

function getOrgAccent(theme?: string, name?: string): string {
  if (theme && ORG_COLORS[theme]) return ORG_COLORS[theme]
  const keys = Object.keys(ORG_COLORS)
  const index = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % keys.length
  return ORG_COLORS[keys[index]]
}

export default function SelectOrgPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Auto-select org if hostname matches a known domain
    autoSelectFromDomain().then((autoSelected) => {
      if (!autoSelected) fetchOrganizations()
    })
  }, [])

  const autoSelectFromDomain = async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/auth/resolve-domain?hostname=${window.location.hostname}`)
      if (res.ok) {
        const { org_id } = await res.json()
        if (org_id) {
          await handleSelect(org_id)
          return true
        }
      }
    } catch {}
    return false
  }

  const fetchOrganizations = async () => {
    try {
      const res = await fetch('/api/auth/organizations')
      if (res.ok) {
        const orgs = await res.json()
        setOrganizations(orgs.filter((o: any) => o.tipo !== 'locus'))
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (orgId: string) => {
    setSelectedOrg(orgId)
    setIsSelecting(true)

    try {
      const res = await fetch('/api/auth/select-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({} as { redirectTo?: string }))
        setTransitioning(true)
        await new Promise((resolve) => setTimeout(resolve, 600))
        window.location.href = data.redirectTo || '/dashboard'
      }
    } catch (error) {
      console.error('Error selecting org:', error)
      setSelectedOrg(null)
    } finally {
      setIsSelecting(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 bg-[#fafbfc] overflow-hidden flex items-center justify-center">
      {/* Subtle gradient */}
      <div className="absolute inset-0">
        <div className="absolute" style={{ width: '150%', height: '150%', top: '-25%', left: '-25%', background: 'radial-gradient(ellipse 50% 40% at 30% 30%, rgba(37,99,235,0.08) 0%, transparent 70%)', animation: 'aurora1 14s ease-in-out infinite' }} />
        <div className="absolute" style={{ width: '150%', height: '150%', top: '-25%', left: '-25%', background: 'radial-gradient(ellipse 45% 35% at 70% 65%, rgba(99,102,241,0.06) 0%, transparent 65%)', animation: 'aurora2 17s ease-in-out infinite' }} />
      </div>

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-[420px] px-6"
        style={{
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: mounted ? 1 : 0,
          transform: `translateY(${mounted ? 0 : 12}px)`,
        }}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[1.6rem] font-light tracking-[0.25em] text-neutral-700 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            UNO
          </h1>
          <p className="text-[13px] font-light tracking-[0.15em] text-neutral-400">ELECTROMEDICINA</p>
          <div className="w-8 h-px bg-neutral-200 mx-auto mt-4 mb-3" />
          <p className="text-[11px] uppercase tracking-[0.15em] text-neutral-400">
            Elegí tu organización
          </p>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
          </div>
        ) : (
          <>
            {/* Org cards */}
            <div
              className="rounded-2xl p-2 max-h-[60vh] overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(20px)' }}
            >
              {organizations.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                  No tenés organizaciones asignadas
                </div>
              ) : (
                <div className="space-y-1">
                  {organizations.map((org) => {
                    const accent = getOrgAccent(org.theme, org.nombre)
                    const isSelected = selectedOrg === org.id

                    return (
                      <button
                        key={org.id}
                        onClick={() => handleSelect(org.id)}
                        disabled={isSelecting}
                        className="w-full text-left group"
                        style={{ transition: 'all 0.25s ease', opacity: isSelecting && !isSelected ? 0.35 : 1 }}
                      >
                        <div
                          className="flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200"
                          style={{ background: isSelected ? 'rgba(0,0,0,0.03)' : 'transparent' }}
                          onMouseEnter={(e) => { if (!isSelecting) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.nombre} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium text-base shrink-0"
                              style={{ background: accent, boxShadow: `0 2px 10px ${accent}25` }}
                            >
                              {org.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-neutral-700 font-normal text-[14px] truncate">{org.nombre}</p>
                            <p className="text-neutral-400 text-[11px] capitalize tracking-wide">{org.rol}</p>
                          </div>
                          {isSelected && isSelecting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-400 shrink-0" />
                          ) : (
                            <svg className="w-4 h-4 text-neutral-200 shrink-0 transition-all duration-200 group-hover:text-neutral-400 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Logout */}
            <div className="text-center mt-8">
              <button onClick={handleLogout} className="text-[11px] text-neutral-300 hover:text-neutral-500 transition-colors duration-300 tracking-[0.1em] uppercase">
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>

      {/* White fade overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'white', opacity: transitioning ? 1 : 0, transition: 'opacity 0.6s ease-in-out', pointerEvents: transitioning ? 'all' : 'none', zIndex: 50 }} />

      <style jsx>{`
        @keyframes aurora1 { 0%, 100% { transform: translate(0%, 0%) rotate(0deg); } 33% { transform: translate(5%, -3%) rotate(2deg); } 66% { transform: translate(-3%, 4%) rotate(-1deg); } }
        @keyframes aurora2 { 0%, 100% { transform: translate(0%, 0%) rotate(0deg); } 33% { transform: translate(-4%, 5%) rotate(-2deg); } 66% { transform: translate(6%, -2%) rotate(1deg); } }
      `}</style>
    </div>
  )
}
