'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileSpreadsheet,
  FileText,
  FileDown,
  Calendar,
  Filter,
  Columns,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type ExportFormat = 'excel' | 'csv' | 'pdf'

export interface ExportColumnOption {
  id: string
  label: string
  accessorKey: string
  defaultSelected?: boolean
  cell?: (value: unknown) => string
}

export interface ExportFilterOption {
  id: string
  label: string
  value: string
  icon?: React.ReactNode
}

export interface ExportReportType {
  id: string
  label: string
  description: string
  columns: string[] // IDs de columnas a incluir
}

export interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  entityName: string
  data: unknown[]
  columns: ExportColumnOption[]
  filters?: ExportFilterOption[]
  reportTypes?: ExportReportType[]
  onExport: (options: {
    format: ExportFormat
    columns: ExportColumnOption[]
    dateFrom?: string
    dateTo?: string
    selectedFilters: string[]
    reportType?: string
  }) => Promise<void>
}

export function ExportDialog({
  open,
  onOpenChange,
  title = 'Exportar Datos',
  entityName,
  data,
  columns,
  filters = [],
  reportTypes = [],
  onExport,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns.filter(c => c.defaultSelected !== false).map(c => c.id)
  )
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [selectedReportType, setSelectedReportType] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  const handleColumnToggle = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([])
    } else {
      setSelectedColumns(columns.map(c => c.id))
    }
  }

  const handleReportTypeSelect = (reportId: string) => {
    setSelectedReportType(reportId)
    const report = reportTypes.find(r => r.id === reportId)
    if (report) {
      setSelectedColumns(report.columns)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportSuccess(false)

    try {
      const exportColumns = columns.filter(c => selectedColumns.includes(c.id))
      await onExport({
        format,
        columns: exportColumns,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        selectedFilters,
        reportType: selectedReportType || undefined,
      })
      setExportSuccess(true)
      setTimeout(() => {
        setExportSuccess(false)
        onOpenChange(false)
      }, 1500)
    } catch (error) {
      console.error('Error al exportar:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const formatOptions = [
    {
      id: 'excel' as const,
      label: 'Excel (.xlsx)',
      description: 'Hojas de cálculo con formato',
      icon: FileSpreadsheet,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-500',
    },
    {
      id: 'csv' as const,
      label: 'CSV (.csv)',
      description: 'Valores separados por comas',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-500',
    },
    {
      id: 'pdf' as const,
      label: 'PDF (.pdf)',
      description: 'Documento para impresión',
      icon: FileDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-500',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="h-5 w-5 text-purple-600" />
            {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {data.length} {entityName} disponibles para exportar
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Formato de exportación - Using clickable cards */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              Formato de Exportación
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFormat(option.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    format === option.id
                      ? `${option.borderColor} ${option.bgColor}`
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <option.icon className={`h-8 w-8 ${option.color}`} />
                  <div className="text-center">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tipos de reporte predefinidos */}
          {reportTypes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Tipo de Reporte
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportType('')
                      setSelectedColumns(columns.filter(c => c.defaultSelected !== false).map(c => c.id))
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                      selectedReportType === ''
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-background border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                    )}
                  >
                    Personalizado
                  </button>
                  {reportTypes.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => handleReportTypeSelect(report.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                        selectedReportType === report.id
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-background border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      )}
                      title={report.description}
                    >
                      {report.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Rango de fechas */}
          <Separator />
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Rango de Fechas (opcional)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filtros adicionales */}
          {filters.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  Filtros
                </Label>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => handleFilterToggle(filter.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                        selectedFilters.includes(filter.id)
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-background border-border hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                      )}
                    >
                      {filter.icon && <span className="flex-shrink-0">{filter.icon}</span>}
                      {filter.label}
                      {selectedFilters.includes(filter.id) && (
                        <CheckCircle2 className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Selección de columnas */}
          {!selectedReportType && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Columns className="h-4 w-4 text-muted-foreground" />
                    Columnas a Exportar
                  </Label>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleSelectAllColumns}
                    className="text-xs"
                  >
                    {selectedColumns.length === columns.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={column.id}
                        checked={selectedColumns.includes(column.id)}
                        onCheckedChange={() => handleColumnToggle(column.id)}
                      />
                      <Label
                        htmlFor={column.id}
                        className="text-sm cursor-pointer"
                      >
                        {column.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con resumen y botón de exportar */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedColumns.length} columnas seleccionadas
            </span>
            {(dateFrom || dateTo) && (
              <span className="text-muted-foreground">
                {dateFrom && `Desde: ${new Date(dateFrom).toLocaleDateString('es-AR')}`}
                {dateFrom && dateTo && ' - '}
                {dateTo && `Hasta: ${new Date(dateTo).toLocaleDateString('es-AR')}`}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
            >
              <AnimatePresence mode="wait">
                {isExporting ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </motion.div>
                ) : exportSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Exportado!
                  </motion.div>
                ) : (
                  <motion.div
                    key="export"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar {format.toUpperCase()}
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
