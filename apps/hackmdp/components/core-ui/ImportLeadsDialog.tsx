'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ImportLeadsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ImportResult {
  success: boolean
  imported: number
  deleted: number
  skipped: number
  por_etapa: Record<string, number>
  columnas_detectadas: Record<string, string>
}

export function ImportLeadsDialog({ open, onOpenChange, onSuccess }: ImportLeadsDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [vendedorId, setVendedorId] = useState('')
  const [reemplazar, setReemplazar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch vendedores (team members)
  const { data: vendedores } = useSWR<Array<{ id: string; nombre: string; email: string }>>(
    open ? '/api/equipo?vendedores=true' : null,
    fetcher
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setResult(null)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (vendedorId) formData.append('vendedor_id', vendedorId)
      if (reemplazar) formData.append('reemplazar', 'true')

      const res = await fetch('/api/crm/importar-leads', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al importar')
        return
      }

      setResult(data)
      toast.success(`${data.imported} oportunidades importadas`)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!loading) {
      onOpenChange(open)
      if (!open) {
        setFile(null)
        setResult(null)
        setError(null)
        setVendedorId('')
        setReemplazar(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            Importar Leads
          </DialogTitle>
          <DialogDescription>
            Sube un archivo Excel (.xlsx) con formato Odoo CRM para importar oportunidades.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Archivo Excel</Label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-all text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400"
            >
              {file ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span className="text-sm font-medium text-foreground">{file.name}</span>
                  <span className="text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Click para seleccionar archivo</span>
                  <span className="text-xs">.xlsx o .xls</span>
                </>
              )}
            </button>
          </div>

          {/* Vendedor selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Vendedor asignado</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {(vendedores || []).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reemplazar toggle */}
          {vendedorId && vendedorId !== 'none' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Reemplazar existentes</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Borra las oportunidades actuales de este vendedor antes de importar</p>
              </div>
              <Switch checked={reemplazar} onCheckedChange={setReemplazar} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  {result.imported} oportunidades importadas
                </span>
              </div>
              {result.deleted > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{result.deleted} anteriores eliminadas</p>
              )}
              {result.skipped > 0 && (
                <p className="text-xs text-muted-foreground">{result.skipped} filas omitidas</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(result.por_etapa).map(([etapa, count]) => (
                  <Badge key={etapa} variant="secondary" className="text-xs capitalize">
                    {etapa}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
