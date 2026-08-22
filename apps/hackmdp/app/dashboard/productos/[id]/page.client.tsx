'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useProductoConsumo } from '@/lib/hooks/use-regulatory'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Package, Users, TrendingUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/format-currency'

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('es-AR').format(Number(value))
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function Diasbadge({ dias }: { dias: number | null | undefined }) {
  if (dias === null || dias === undefined) return <span className="text-muted-foreground">-</span>
  const color =
    dias > 90
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : dias > 60
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  return (
    <Badge variant="outline" className={cn('font-medium', color)}>
      {dias}d
    </Badge>
  )
}

function NotasCell({
  productoId,
  clienteId,
  initialNotas,
}: {
  productoId: string
  clienteId: string
  initialNotas: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialNotas ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/productos/${productoId}/consumo/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId, notas: value }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      toast.success('Notas guardadas')
      setEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar notas')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          disabled={saving}
        />
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={() => {
              setValue(initialNotas ?? '')
              setEditing(false)
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      className="text-left text-sm text-muted-foreground hover:text-foreground cursor-pointer min-w-[80px] min-h-[24px]"
      onClick={() => setEditing(true)}
      title="Click para editar"
    >
      {value || <span className="italic text-muted-foreground/50">Agregar nota...</span>}
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-48 bg-muted rounded" />
      <div className="h-32 bg-muted rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-24 bg-muted rounded-xl" />
      </div>
      <div className="h-64 bg-muted rounded-xl" />
    </div>
  )
}

export default function ProductoDetailPageClient() {
  const params = useParams()
  const productoId = params.id as string

  const { consumo, isLoading, error } = useProductoConsumo(productoId)

  if (isLoading) return <LoadingSkeleton />

  if (error || !consumo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">
          {error ? 'Error al cargar datos del producto.' : 'Producto no encontrado.'}
        </p>
        <Link href="/dashboard/productos">
          <Button variant="outline" iconLeft={<ArrowLeft className="h-4 w-4" />}>
            Volver a Productos
          </Button>
        </Link>
      </div>
    )
  }

  const { producto, clientes, resumen } = consumo

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Back button */}
        <Link href="/dashboard/productos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" />
          Volver a Productos
        </Link>

        {/* Product header card */}
        <div className="rounded-xl border bg-card p-6 shadow-[0_4px_24px_rgba(139,92,246,0.15),0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-3">
              <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{producto.nombre}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {producto.codigo && (
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                    {producto.codigo}
                  </span>
                )}
                <span>Precio venta: <strong className="text-foreground">{formatCurrency(producto.precio_venta, producto.moneda || 'ARS')}</strong></span>
                <span>Stock: <strong className="text-foreground">{formatNumber(producto.stock_actual)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 shadow-[0_4px_24px_rgba(139,92,246,0.15),0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clientes que consumen</p>
                <p className="text-2xl font-bold">{resumen.total_clientes ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-[0_4px_24px_rgba(139,92,246,0.15),0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Consumo mensual global</p>
                <p className="text-2xl font-bold">{formatNumber(resumen.consumo_mensual_global)} <span className="text-sm font-normal text-muted-foreground">u/mes</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Clients table */}
        <div className="rounded-xl border bg-card shadow-[0_4px_24px_rgba(139,92,246,0.15),0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="p-5 border-b">
            <h2 className="text-lg font-semibold">Clientes que consumen este producto</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Desglose de consumo por cliente, ordenado por volumen
            </p>
          </div>

          {clientes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay datos de consumo para este producto.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-right px-4 py-3 font-medium">Total unidades</th>
                    <th className="text-right px-4 py-3 font-medium">Compras</th>
                    <th className="text-right px-4 py-3 font-medium">Prom. mensual</th>
                    <th className="text-left px-4 py-3 font-medium">Ultima compra</th>
                    <th className="text-center px-4 py-3 font-medium">Dias sin comprar</th>
                    <th className="text-left px-4 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c: any) => (
                    <tr key={c.cliente_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.cliente_nombre}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.total_unidades)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{c.total_compras}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.promedio_mensual)}</td>
                      <td className="px-4 py-3">{formatDate(c.ultima_compra)}</td>
                      <td className="px-4 py-3 text-center">
                        <Diasbadge dias={c.dias_sin_comprar} />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <NotasCell
                          productoId={productoId}
                          clienteId={c.cliente_id}
                          initialNotas={c.notas}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
