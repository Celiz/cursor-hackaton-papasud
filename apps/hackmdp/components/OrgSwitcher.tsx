"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronDown, Check, Plus, Loader2, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useOrganizations, useOrgSwitcher, type Organization } from "@/lib/hooks/use-organizations"
import { CreateOrgDialog } from "./org/CreateOrgDialog"
import { useIsMobile } from "@/hooks/use-mobile"

const ORG_COLORS: Record<string, string> = {
  purple: '#a855f7',
  emerald: '#10b981',
  amber: '#f59e0b',
  blue: '#3b82f6',
  rose: '#f43f5e',
  cyan: '#06b6d4',
  orange: '#f97316',
  indigo: '#6366f1',
}

function getOrgAccent(name: string): string {
  const keys = Object.keys(ORG_COLORS)
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % keys.length
  return ORG_COLORS[keys[index]]
}

function OrgLogo({ size = "md" }: { org?: unknown; size?: "sm" | "md" | "lg" }) {
  // Dimensiones explícitas y no `fill`: con `fill` Next exige `sizes` y sin eso
  // tira error en el sidebar.
  const px = { sm: 28, md: 44, lg: 60 }[size]
  // Acá va la MARCA, no la mascota: el logotipo de Papasud S.A. Tubi aparece
  // en el copiloto y como ícono de la app, que es donde tiene sentido.
  return (
    <Image
      src="/papasud-icono.png"
      alt="Papasud S.A."
      width={px}
      height={px}
      className="object-contain shrink-0"
    />
  )
}

interface OrgSwitcherProps {
  currentOrgId?: string
  currentOrgName?: string
}

export function OrgSwitcher({ currentOrgId, currentOrgName }: OrgSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { organizations, isLoading, refresh } = useOrganizations()
  const { switchOrg, isSwitching } = useOrgSwitcher()
  const isMobile = useIsMobile()

  const regularOrgs = organizations.filter(o => o.tipo !== 'locus')

  const currentOrg = organizations.find(o => o.id === currentOrgId) || {
    id: currentOrgId || '',
    nombre: currentOrgName || 'Locus',
    slug: '',
    rol: '',
  }

  const handleSwitch = async (org: Organization) => {
    if (org.id === currentOrgId) {
      setIsOpen(false)
      return
    }
    await switchOrg(org.id)
    setIsOpen(false)
  }

  const handleOrgCreated = (org: { id: string; nombre: string; slug: string }) => {
    setShowCreateDialog(false)
    setIsOpen(false)
    refresh()
    router.refresh()
    window.location.reload()
  }

  const noOrgs = !isLoading && organizations.length === 0 && !currentOrgId
  // Papasud es de una sola organización: no se ofrece cambio de empresa.
  const isDemoVet = true
  // Single-tenant (p.ej. Uno Electromedicina): con una sola organización no hay
  // nada entre qué cambiar ni se crea otra — el logo es sólo branding, no un
  // switcher. El dropdown ("Espacio de trabajo" + "Crear nueva organización")
  // sólo se habilita con 2+ organizaciones reales.
  const canOpen = !isDemoVet && regularOrgs.length > 1

  return (
    <>
      <div className="relative">
        <button
          onClick={() => canOpen && setIsOpen(!isOpen)}
          className={cn("w-full group", canOpen && "cursor-pointer")}
          disabled={isSwitching}
        >
          <div className="relative">
            <div className={cn(
              "relative transition-all duration-300",
              isOpen ? "scale-105" : "group-hover:scale-105",
              isSwitching && "animate-pulse"
            )}>
              {isSwitching ? (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ background: getOrgAccent(currentOrg.nombre) }}
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : noOrgs ? (
                <div className="w-12 h-12 rounded-xl bg-neutral-200 flex items-center justify-center text-neutral-400">
                  <Building2 className="w-5 h-5" />
                </div>
              ) : (
                <OrgLogo org={currentOrg} size="md" />
              )}
            </div>

            {canOpen && (
              <div className={cn(
                "absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center transition-all",
                isOpen ? "scale-100" : "scale-0 group-hover:scale-100"
              )}>
                <ChevronDown className={cn(
                  "w-3 h-3 text-neutral-400 transition-transform",
                  isOpen && "rotate-180"
                )} />
              </div>
            )}
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <div
              className={cn(
                "fixed rounded-2xl overflow-hidden z-[100] animate-in fade-in duration-200",
                isMobile
                  ? "left-3 right-3 top-3 slide-in-from-top-2"
                  : "left-[76px] top-[16px] w-[320px] slide-in-from-left-2"
              )}
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(0,0,0,0.06)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
              }}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3">
                <p
                  className="text-[11px] uppercase tracking-[0.15em] text-neutral-500"
                >
                  Espacio de trabajo
                </p>
              </div>

              {/* Organizations list */}
              <div className="px-2 pb-2 max-h-[50vh] md:max-h-[360px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                  </div>
                ) : regularOrgs.length > 0 ? (
                  <div className="space-y-0.5">
                    {regularOrgs.map((org) => {
                      const isActive = currentOrgId === org.id
                      return (
                        <button
                          key={org.id}
                          onClick={() => handleSwitch(org)}
                          disabled={isSwitching}
                          className="w-full text-left group/item"
                          style={{
                            opacity: isSwitching ? 0.5 : 1,
                            transition: 'opacity 0.2s ease',
                          }}
                        >
                          <div
                            className="flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200"
                            style={{
                              background: isActive ? 'rgba(0,0,0,0.03)' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.02)'
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            <OrgLogo org={org} size="md" />

                            <div className="flex-1 min-w-0">
                              <p className="text-neutral-700 font-normal text-[14px] truncate">
                                {org.nombre}
                              </p>
                              <p className="text-neutral-400 text-[11px] capitalize tracking-wide">
                                {org.rol}
                              </p>
                            </div>

                            {isActive ? (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: getOrgAccent(org.nombre),
                                }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <svg
                                className="w-4 h-4 text-neutral-200 shrink-0 transition-all duration-200 group-hover/item:text-neutral-400 group-hover/item:translate-x-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-[13px] text-neutral-400">Sin organizaciones</p>
                  </div>
                )}
              </div>

              {/* Create new org */}
              <div
                className="px-2 pb-2"
                style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
              >
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowCreateDialog(true)
                  }}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 mt-1"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      border: '1.5px dashed rgba(0,0,0,0.12)',
                    }}
                  >
                    <Plus className="w-4 h-4 text-neutral-300" />
                  </div>
                  <span className="text-[13px] text-neutral-400">
                    Crear nueva organización
                  </span>
                </button>
              </div>

            </div>
          </>
        )}
      </div>

      <CreateOrgDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={handleOrgCreated}
      />
    </>
  )
}
