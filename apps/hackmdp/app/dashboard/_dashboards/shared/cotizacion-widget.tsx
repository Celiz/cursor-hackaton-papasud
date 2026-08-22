'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, RefreshCw, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const cotizacionFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function CotizacionWidget() {
  const [updatingCotizacion, setUpdatingCotizacion] = useState(false)

  const { data: cotizacionBlue, mutate: mutateCotizacionBlue } = useSWR(
    '/api/cotizaciones?tipo=blue',
    cotizacionFetcher
  )
  const { data: cotizacionOficial, mutate: mutateCotizacionOficial } = useSWR(
    '/api/cotizaciones?tipo=oficial',
    cotizacionFetcher
  )
  const { data: cotizacionNacion, mutate: mutateCotizacionNacion } = useSWR(
    '/api/cotizaciones?tipo=nacion',
    cotizacionFetcher
  )

  const handleUpdateCotizacion = async () => {
    setUpdatingCotizacion(true)
    try {
      const res = await fetch('/api/cotizaciones/actualizar')
      if (res.ok) {
        await mutateCotizacionBlue()
        await mutateCotizacionOficial()
        await mutateCotizacionNacion()
      }
    } catch (error) {
      console.error('Error actualizando cotización:', error)
    } finally {
      setUpdatingCotizacion(false)
    }
  }

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dólar Blue</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {cotizacionBlue?.valor_venta ? `$${cotizacionBlue.valor_venta.toLocaleString('es-AR')}` : '-'}
                </p>
                <p className="text-[10px] text-muted-foreground/70">Fuente: DolarAPI</p>
              </div>
            </div>
            <div className="h-8 w-px bg-green-200 dark:bg-green-800" />
            <div>
              <p className="text-xs text-muted-foreground">Dólar Oficial</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {cotizacionOficial?.valor_venta ? `$${cotizacionOficial.valor_venta.toLocaleString('es-AR')}` : '-'}
              </p>
              <p className="text-[10px] text-muted-foreground/70">Fuente: BCRA</p>
            </div>
            <div className="h-8 w-px bg-green-200 dark:bg-green-800" />
            <div>
              <p className="text-xs text-muted-foreground">Dólar BNA</p>
              <p className="text-lg font-bold text-teal-700 dark:text-teal-300">
                {cotizacionNacion?.valor_venta ? `$${cotizacionNacion.valor_venta.toLocaleString('es-AR')}` : '-'}
              </p>
              <p className="text-[10px] text-muted-foreground/70">Fuente: Banco Nación</p>
            </div>
            {cotizacionBlue?.fecha && (
              <>
                <div className="h-8 w-px bg-green-200 dark:bg-green-800" />
                <div>
                  <p className="text-xs text-muted-foreground">Última actualización</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(cotizacionBlue.fecha), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              </>
            )}
          </div>
          <Button
            type="outline"
            size="sm"
            onClick={handleUpdateCotizacion}
            disabled={updatingCotizacion}
            className="gap-2"
          >
            {updatingCotizacion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
