"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Layers,
  ArrowLeft,
  Loader2,
  Target,
  CalendarClock,
  FlaskConical,
  Leaf,
  Wrench,
  FileText,
  Receipt,
  Truck,
  Mail,
  Megaphone,
  ExternalLink,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOrgFeatures } from "@/lib/hooks/use-org-features"
import { useUserPermissions } from "@/lib/hooks/use-user-permissions"
import { useSession } from "@/lib/hooks/use-session"
import type { OrgFeatures } from "@studio/erp-core/organizations"

// ── Module definitions ──────────────────────────────────────────

interface ModuloDef {
  key: keyof OrgFeatures
  label: string
  description: string
  icon: LucideIcon
  color: string
  orgTipos: string[] | null // null = all org types
  detailedConfigHref?: string
}

const MODULOS: ModuloDef[] = [
  { key: "crm", label: "CRM", description: "Pipeline de ventas, leads y oportunidades", icon: Target, color: "blue", orgTipos: ["electromedicina", "growshop"], detailedConfigHref: "/dashboard/configuracion/crm" },
  { key: "turnos", label: "Turnos", description: "Gestion de citas y agenda", icon: CalendarClock, color: "emerald", orgTipos: ["veterinaria", "petshop"] },
  { key: "vetlab", label: "VetLab", description: "Laboratorio veterinario", icon: FlaskConical, color: "emerald", orgTipos: ["veterinaria"] },
  { key: "cannabis", label: "Cannabis", description: "Trazabilidad y gestion de cultivos", icon: Leaf, color: "green", orgTipos: ["growshop"] },
  { key: "servicios_tecnicos", label: "Servicios Tecnicos", description: "Gestion de servicios y reparaciones", icon: Wrench, color: "purple", orgTipos: ["electromedicina"] },
  { key: "presupuestos", label: "Presupuestos", description: "Creacion y seguimiento de presupuestos", icon: FileText, color: "indigo", orgTipos: null },
  { key: "facturacion", label: "Facturacion AFIP", description: "Facturacion electronica ARCA/AFIP", icon: Receipt, color: "green", orgTipos: null },
  { key: "entregas", label: "Entregas", description: "Tracking de envios y despachos", icon: Truck, color: "blue", orgTipos: ["electromedicina", "growshop"], detailedConfigHref: "/dashboard/configuracion/features" },
  { key: "email", label: "Email Branding", description: "Personalizacion de emails", icon: Mail, color: "rose", orgTipos: null, detailedConfigHref: "/dashboard/configuracion/features" },
  { key: "agencias", label: "Agencias", description: "Marketing y presencia digital", icon: Megaphone, color: "amber", orgTipos: ["electromedicina", "growshop"] },
]

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400" },
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
}

// ── Component ───────────────────────────────────────────────────

export default function ModulosPageClient() {
  const { features, isLoading, mutate } = useOrgFeatures()
  const { isAdmin } = useUserPermissions()
  const { data: session } = useSession()
  const orgTipo = session?.user?.orgTipo ?? "other"

  const [toggling, setToggling] = useState<string | null>(null)

  const visibleModulos = MODULOS.filter(
    (m) => m.orgTipos === null || m.orgTipos.includes(orgTipo)
  )

  const isEnabled = useCallback(
    (key: keyof OrgFeatures): boolean => {
      if (!features) return false
      const section = features[key]
      if (!section || typeof section !== "object") return false
      return (section as { enabled?: boolean }).enabled ?? false
    },
    [features]
  )

  const getSubField = useCallback(
    <T,>(key: keyof OrgFeatures, field: string): T | undefined => {
      if (!features) return undefined
      const section = features[key]
      if (!section || typeof section !== "object") return undefined
      return (section as Record<string, unknown>)[field] as T | undefined
    },
    [features]
  )

  const patchFeature = useCallback(
    async (key: string, patch: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/org-features", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: patch }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Error al guardar")
        }
        await mutate()
      } catch (err: any) {
        toast.error(err.message || "Error al guardar")
        await mutate() // revert optimistic
      }
    },
    [mutate]
  )

  const handleToggle = useCallback(
    async (key: keyof OrgFeatures, newValue: boolean) => {
      if (!features) return
      setToggling(key)

      // Optimistic update
      const prev = features[key]
      mutate(
        { features: { ...features, [key]: { ...(prev as object), enabled: newValue } } },
        false
      )

      await patchFeature(key, { enabled: newValue })
      setToggling(null)
    },
    [features, mutate, patchFeature]
  )

  const handleSubField = useCallback(
    async (key: string, field: string, value: unknown) => {
      await patchFeature(key, { [field]: value })
    },
    [patchFeature]
  )

  // ── Guards ──

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sin Permisos</h2>
          <p className="text-muted-foreground">
            Solo administradores pueden configurar modulos.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !features) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/configuracion"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
          <Layers className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Modulos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Activar y configurar modulos del sistema
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleModulos.map((mod) => {
          const enabled = isEnabled(mod.key)
          const colors = COLOR_MAP[mod.color] ?? COLOR_MAP.blue
          const Icon = mod.icon

          return (
            <div
              key={mod.key}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-5 flex flex-col gap-4 transition-all"
            >
              {/* Top row: icon + info + switch */}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${colors.bg}`}>
                  <Icon className={`h-5 w-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {mod.label}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {mod.description}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => handleToggle(mod.key, v)}
                  disabled={toggling === mod.key}
                />
              </div>

              {/* Expanded config when enabled */}
              {enabled && mod.key === "turnos" && (
                <div className="pl-12 space-y-2">
                  <Label className="text-sm font-medium">
                    Duracion por defecto (minutos)
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    value={getSubField<number>("turnos", "duracion_default") ?? 30}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val >= 5 && val <= 480) {
                        handleSubField("turnos", "duracion_default", val)
                      }
                    }}
                    className="max-w-[160px]"
                  />
                </div>
              )}

              {enabled && mod.key === "presupuestos" && (
                <div className="pl-12 flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Requiere aprobacion
                  </Label>
                  <Switch
                    checked={getSubField<boolean>("presupuestos", "requiere_aprobacion") ?? false}
                    onCheckedChange={(v) =>
                      handleSubField("presupuestos", "requiere_aprobacion", v)
                    }
                  />
                </div>
              )}

              {enabled && mod.key === "facturacion" && (
                <div className="pl-12 space-y-2">
                  <Label className="text-sm font-medium">Ambiente</Label>
                  <Select
                    value={getSubField<string>("facturacion", "ambiente") ?? "homologacion"}
                    onValueChange={(v) =>
                      handleSubField("facturacion", "ambiente", v)
                    }
                  >
                    <SelectTrigger className="max-w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacion">Homologacion</SelectItem>
                      <SelectItem value="produccion">Produccion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Detailed config link */}
              {enabled && mod.detailedConfigHref && (
                <div className="pl-12">
                  <Link
                    href={mod.detailedConfigHref}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Configuracion detallada
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
