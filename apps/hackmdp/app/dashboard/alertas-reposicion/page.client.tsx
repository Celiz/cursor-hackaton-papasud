"use client"

import { useMemo, useCallback } from "react"
import useSWR from "swr"
import { GenericDataTable } from "@/components/core-ui/GenericDataTable"
import { WidgetCard, WidgetCardSkeleton } from "@/components/core-ui/WidgetCard"
import { getColumns, AlertaReposicion } from "./columns"
import { AlertTriangle, AlertOctagon, Bell, Phone } from "lucide-react"
import { toast } from "sonner"

interface ReposicionStats {
  total: number
  criticas: number
  altas: number
  medias: number
  contactadosHoy: number
  clientesAfectados: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar datos")
  return Array.isArray(data) ? data : []
}

const statsFetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar stats")
  return data
}

export default function AlertasReposicionClientPage() {
  const { data, error, isLoading, mutate } = useSWR<AlertaReposicion[]>(
    "/api/alertas-reposicion",
    fetcher
  )

  const { data: stats, isLoading: statsLoading } = useSWR<ReposicionStats>(
    "/api/alertas-reposicion/stats",
    statsFetcher
  )

  const statsData = stats || {
    total: 0,
    criticas: 0,
    altas: 0,
    medias: 0,
    contactadosHoy: 0,
    clientesAfectados: 0,
  }

  const alertas = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    return data
  }, [data])

  const handleSnooze = useCallback(async (alerta: AlertaReposicion, dias: number) => {
    try {
      const res = await fetch("/api/alertas-reposicion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alerta.id, accion: "snooze", dias_snooze: dias }),
      })
      if (!res.ok) throw new Error("Error al posponer")
      toast.success(`Alerta pospuesta ${dias} días`)
      mutate()
    } catch {
      toast.error("Error al posponer la alerta")
    }
  }, [mutate])

  const handleContactar = useCallback(async (alerta: AlertaReposicion) => {
    try {
      const res = await fetch("/api/alertas-reposicion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alerta.id, accion: "contactado" }),
      })
      if (!res.ok) throw new Error("Error al marcar")
      toast.success(`Marcado como contactado: ${alerta.cliente_fantasia || alerta.cliente_nombre}`)
      mutate()
    } catch {
      toast.error("Error al marcar como contactado")
    }
  }, [mutate])

  const handleNota = useCallback(async (alerta: AlertaReposicion) => {
    const nota = prompt("Agregar nota de seguimiento:", alerta.reposicion_notas || "")
    if (nota === null) return
    try {
      const res = await fetch("/api/alertas-reposicion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alerta.id, accion: "nota", nota }),
      })
      if (!res.ok) throw new Error("Error al guardar nota")
      toast.success("Nota guardada")
      mutate()
    } catch {
      toast.error("Error al guardar la nota")
    }
  }, [mutate])

  const columns = useMemo(
    () => getColumns({
      onSnooze: handleSnooze,
      onContactar: handleContactar,
      onNota: handleNota,
    }),
    [handleSnooze, handleContactar, handleNota]
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Alertas de Reposición
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Clientes con compras atrasadas respecto a su frecuencia habitual
        </p>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <WidgetCardSkeleton />
            <WidgetCardSkeleton />
            <WidgetCardSkeleton />
            <WidgetCardSkeleton />
          </>
        ) : (
          <>
            <WidgetCard
              title="Total Alertas"
              count={statsData.total}
              subtitle={`${statsData.clientesAfectados} clientes`}
              icon={<Bell className="h-8 w-8 text-blue-600" />}
              statusClassName="text-blue-600"
              sparklineColor="blue"
            />
            <WidgetCard
              title="Críticas"
              count={statsData.criticas}
              subtitle="+50% atrasadas"
              icon={<AlertOctagon className="h-8 w-8 text-red-600" />}
              statusClassName="text-red-600"
              sparklineColor="red"
            />
            <WidgetCard
              title="Altas"
              count={statsData.altas}
              subtitle="+20% atrasadas"
              icon={<AlertTriangle className="h-8 w-8 text-orange-600" />}
              statusClassName="text-orange-600"
              sparklineColor="orange"
            />
            <WidgetCard
              title="Contactados hoy"
              count={statsData.contactadosHoy}
              icon={<Phone className="h-8 w-8 text-green-600" />}
              statusClassName="text-green-600"
              sparklineColor="green"
            />
          </>
        )}
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <GenericDataTable
          columns={columns}
          data={alertas}
          isLoading={isLoading}
          pageTitle=""
          pageDescription=""
          enableGlobalSearch={true}
          searchPlaceholder="Buscar por cliente, producto, categoría..."
          onRefresh={() => mutate()}
          enableRowSelection={false}
          facetedFilters={[
            {
              columnId: "urgencia",
              title: "Urgencia",
              options: [
                { label: "Crítica", value: "critica" },
                { label: "Alta", value: "alta" },
                { label: "Media", value: "media" },
              ],
            },
          ]}
        />
      </div>
    </div>
  )
}
