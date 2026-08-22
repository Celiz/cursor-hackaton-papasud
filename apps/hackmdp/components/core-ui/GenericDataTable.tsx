"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTablePagination } from "@/components/data-table-pagination"
import { DataTableViewOptions } from "@/components/data-table-view-options"
import { DataTableFacetedFilter } from "@/components/data-table-faceted-filter"
import { DataTableRowActions } from "@/components/data-table-row-actions" // Asumimos una versión genérica o adaptada
import { RefreshButton } from "../RefreshButton"
import { TableActionsMenu } from "../TableActionsMenu"
import { Cross2Icon } from "@radix-ui/react-icons"
import { Loader2, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { PageHelpButton } from "./PageHelpButton"
import { WelcomeBanner } from "./WelcomeBanner"
import { getPageHelp } from "@/lib/page-help-content"
import { useIsMobile } from "@/hooks/use-mobile"
import { MobileListView } from "./MobileListView"
import type { MobileCardConfig, MobileCardField, MobileQuickFilter, MobileSwipeAction } from "@/lib/types/mobile-card"

// --- AUTO-GENERATE MOBILE CARD CONFIG FROM COLUMNS ---
function autoGenerateMobileCardConfig<TData>(
  columns: ColumnDef<TData, any>[]
): MobileCardConfig<TData> {
  const fields: MobileCardField[] = []

  // Extract columns with accessorKey (skip id-only, select, actions)
  const dataColumns = columns.filter(col => {
    const key = (col as { accessorKey?: string }).accessorKey
    if (!key || typeof key !== 'string') return false
    if (key === 'id' || key === 'actions' || key === 'select') return false
    return true
  })

  // Categorize columns
  const statusKeys = ['estado', 'status', 'tipo', 'type', 'estado_pago', 'estado_envio', 'estado_servicio', 'categoria', 'prioridad', 'activo', 'publicado']
  const dateKeys = ['fecha', 'date', 'created_at', 'updated_at', 'vencimiento', 'fecha_emision', 'fecha_vencimiento', 'fecha_inicio', 'fecha_fin']
  const amountKeys = ['total', 'monto', 'importe', 'precio', 'subtotal', 'saldo', 'debe', 'haber']
  const skipKeys = ['id', 'org_id', 'persona_id', 'created_by', 'updated_by', 'deleted_at']

  let titleAssigned = false
  let subtitleAssigned = false

  for (const col of dataColumns) {
    const key = (col as { accessorKey: string }).accessorKey
    const lowerKey = key.toLowerCase()

    // Skip internal keys
    if (skipKeys.some(sk => lowerKey === sk || lowerKey.endsWith('_id'))) continue

    // Get header label
    let label = key
    const header = col.header
    if (typeof header === 'string') {
      label = header
    } else if (typeof header === 'function') {
      try {
        const result = header({ column: { id: key } } as any)
        if (result?.props?.title) label = result.props.title
      } catch { /* fallback to key */ }
    }

    // Status/type columns → badge
    if (statusKeys.some(sk => lowerKey === sk || lowerKey.includes(sk))) {
      fields.push({ key, label, position: "badge" })
      continue
    }

    // Date columns → footer
    if (dateKeys.some(dk => lowerKey === dk || lowerKey.includes(dk))) {
      fields.push({
        key,
        label,
        position: "footer",
        render: (value: any) => {
          if (!value) return "-"
          try {
            const d = new Date(value)
            if (isNaN(d.getTime())) return String(value)
            return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
          } catch { return String(value) }
        }
      })
      continue
    }

    // Amount columns → detail with currency format
    if (amountKeys.some(ak => lowerKey === ak || lowerKey.includes(ak))) {
      fields.push({
        key,
        label,
        position: "detail",
        render: (value: any) => {
          if (value === null || value === undefined) return "-"
          const num = typeof value === 'string' ? parseFloat(value) : Number(value)
          if (isNaN(num)) return "-"
          return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num)
        }
      })
      continue
    }

    // First text column → title
    if (!titleAssigned) {
      fields.push({ key, position: "title" })
      titleAssigned = true
      continue
    }

    // Second text column → subtitle
    if (!subtitleAssigned) {
      fields.push({ key, position: "subtitle" })
      subtitleAssigned = true
      continue
    }

    // Rest → detail (max 3 detail fields to keep cards compact)
    const detailCount = fields.filter(f => f.position === "detail").length
    if (detailCount < 3) {
      fields.push({ key, label, position: "detail" })
    }
  }

  return { fields }
}

// --- SERVER-SIDE PAGINATION COMPONENT ---
interface ServerSidePaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

function ServerSidePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: ServerSidePaginationProps) {
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between px-2">
      <div className="flex-1 text-sm text-muted-foreground">
        Mostrando {startItem}-{endItem} de {totalCount.toLocaleString()} registros
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        {onPageSizeChange && (
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas</p>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value))
                onPageChange(1)
              }}
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Button
            type="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
          >
            <span className="sr-only">Primera página</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
          <Button
            type="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <span className="sr-only">Página anterior</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Página {page} de {totalPages}
          </div>
          <Button
            type="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">Página siguiente</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
          <Button
            type="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
          >
            <span className="sr-only">Última página</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- INTERFAZ DE PROPS ---
interface GenericDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchColumnId?: string
  searchPlaceholder?: string
  enableGlobalSearch?: boolean // Enable search across all columns
  extraToolbarStart?: React.ReactNode // Slot opcional al lado del search (ej: filtro extra)
  pageTitle?: string
  pageDescription?: string
  // Cuando es false, no renderiza el bloque de título (lo provee la banda de SeccionTabs).
  // Default true para no romper páginas no migradas.
  showTitle?: boolean
  error?: any
  facetedFilters?: {
    columnId: string
    title: string
    options: { label: string; value: string; icon?: React.ComponentType }[]
  }[]
  // Filtros facetados server-side (controlados): a diferencia de `facetedFilters`
  // (client-side sobre la página cargada), estos reportan la selección al padre
  // para que filtre vía API. Necesario cuando la tabla usa paginación server-side.
  serverFacetedFilters?: {
    title: string
    options: { label: string; value: string; icon?: React.ComponentType }[]
    selectedValues: string[]
    onChange: (values: string[]) => void
  }[]
  enableAutoFilters?: boolean // Nueva prop para habilitar filtros automáticos
  // Visibilidad inicial de columnas (ej: ocultar columnas que solo existen para
  // poder filtrar por ellas). Mapea columnId → visible (false = oculta).
  initialColumnVisibility?: VisibilityState
  // Filtros controlados (server-side) que se muestran como embudo en el HEADER
  // de la columna `columnId` (ver DataTableColumnHeader). El padre maneja el
  // estado y la query.
  columnHeaderFilters?: {
    columnId: string
    title?: string
    options: { label: string; value: string; icon?: React.ComponentType }[]
    selectedValues: string[]
    onChange: (values: string[]) => void
  }[]
  onEdit?: (row: TData) => void
  onDelete?: (row: TData) => void
  onRefresh?: () => void
  refreshLoading?: boolean // Loading state for refresh button
  customRowActions?: {
    label: string
    action: (row: TData) => void
    icon?: React.ReactNode
    className?: string
    separator?: boolean
  }[]
  onRowClick?: (row: TData) => void; // New prop
  isLoading?: boolean
  // Table actions menu
  onNew?: () => void
  onExportExcel?: (selectedRows: TData[], allRows: TData[]) => void
  onExportPDF?: (selectedRows: TData[], allRows: TData[]) => void
  onExportCSV?: (selectedRows: TData[], allRows: TData[]) => void
  newLabel?: string
  hideTableActions?: boolean
  enableRowSelection?: boolean // Enable checkbox selection
  onSelectionChange?: (selectedRows: TData[]) => void // Callback when row selection changes
  additionalActions?: React.ReactNode // Extra buttons before main actions
  // Help system
  pageKey?: string // Key to identify the page for help content and first visit tracking
  showWelcomeBanner?: boolean // Show welcome banner on first visit
  // Custom meta for columns to access
  meta?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  // Row styling
  getRowBorderColor?: (row: TData) => string | null // Returns border color class or null
  // Server-side pagination
  serverSidePagination?: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (pageSize: number) => void
  }
  // Server-side search
  onServerSearch?: (search: string) => void
  serverSearchValue?: string
  // Mobile card configuration
  mobileCardConfig?: MobileCardConfig<TData>
  // Disable mobile view (for gradual rollout)
  disableMobileView?: boolean
  // Default page size (default: 10)
  defaultPageSize?: number
  // Quick filters for mobile view
  mobileQuickFilters?: MobileQuickFilter[]
  // Mobile swipe actions
  swipeLeftAction?: MobileSwipeAction<TData>
  swipeRightAction?: MobileSwipeAction<TData>
}

// --- COMPONENTE ---
export function GenericDataTable<TData, TValue>({
  columns,
  data,
  searchColumnId,
  searchPlaceholder = "Buscar...",
  enableGlobalSearch = false,
  extraToolbarStart,
  pageTitle,
  pageDescription,
  showTitle = true,
  facetedFilters = [],
  serverFacetedFilters = [],
  enableAutoFilters = false,
  initialColumnVisibility = {},
  columnHeaderFilters = [],
  onEdit,
  onDelete,
  onRefresh,
  refreshLoading,
  customRowActions = [],
  onRowClick,
  isLoading,
  onNew,
  onExportExcel,
  onExportPDF,
  onExportCSV,
  newLabel,
  hideTableActions = false,
  enableRowSelection = false,
  onSelectionChange,
  additionalActions,
  pageKey,
  showWelcomeBanner = true,
  meta,
  getRowBorderColor,
  serverSidePagination,
  onServerSearch,
  serverSearchValue,
  mobileCardConfig,
  disableMobileView = false,
  defaultPageSize = 10,
  mobileQuickFilters,
  swipeLeftAction,
  swipeRightAction,
}: GenericDataTableProps<TData, TValue>) {
  // Mobile detection
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility)
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")

  // Adaptación para las acciones de fila
  const tableColumns = React.useMemo(() => {
    const allColumns: ColumnDef<TData, TValue>[] = [];

    // Add checkbox column if row selection is enabled
    if (enableRowSelection) {
      allColumns.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      } as ColumnDef<TData, TValue>);
    }

    // Add regular columns, inyectando el config de filtro de header en meta
    // según columnId (para que DataTableColumnHeader muestre el embudo).
    allColumns.push(...columns.map((col) => {
      const colId = (col as { id?: string; accessorKey?: string }).id
        ?? (col as { accessorKey?: string }).accessorKey;
      const cfg = columnHeaderFilters.find((f) => f.columnId === colId);
      if (!cfg) return col;
      return {
        ...col,
        meta: {
          ...((col as { meta?: Record<string, unknown> }).meta ?? {}),
          facetedFilter: {
            title: cfg.title,
            options: cfg.options,
            selectedValues: cfg.selectedValues,
            onChange: cfg.onChange,
          },
        },
      } as ColumnDef<TData, TValue>;
    }));

    // Add actions column only if columns don't already include one
    const hasActionsColumn = columns.some(col => (col as { id?: string }).id === "actions");
    if (!hasActionsColumn) {
      const actionColumn: ColumnDef<TData, TValue> = {
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions
            row={row}
            onEdit={onEdit}
            onDelete={onDelete}
            customActions={customRowActions}
          />
        ),
      };
      allColumns.push(actionColumn);
    }

    return allColumns;
  }, [columns, onEdit, onDelete, customRowActions, enableRowSelection, columnHeaderFilters]);

  // Generar filtros automáticos basados en los datos
  const autoGeneratedFilters = React.useMemo(() => {
    if (!enableAutoFilters || !data.length) return []

    return columns
      .filter(col => {
        // Get accessorKey - columns with only `id` (no accessorKey) should be excluded
        const accessorKey = (col as { accessorKey?: string }).accessorKey
        if (!accessorKey || typeof accessorKey !== 'string') return false

        // Excluir columnas específicas
        if (accessorKey === searchColumnId || accessorKey === 'id' || accessorKey === 'actions') return false

        // Excluir columnas que terminan en _id (foreign keys)
        if (accessorKey.endsWith('_id')) return false

        // Excluir columnas de fecha
        if (accessorKey.includes('fecha') || accessorKey.includes('date') || accessorKey.includes('created_at') || accessorKey.includes('updated_at')) return false

        return true
      })
      .map(col => {
        const columnId = (col as { accessorKey: string }).accessorKey
        const header = col.header

        // Get title from column header if it's a function that returns a component with title
        let title = columnId
        if (typeof header === 'function') {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const headerResult = header({ column: { id: columnId } } as any)
            if (headerResult?.props?.title) {
              title = headerResult.props.title
            }
          } catch {
            // Fallback to columnId
          }
        } else if (typeof header === 'string') {
          title = header
        }

        const uniqueValues = Array.from(new Set(
          data.map(item => (item as Record<string, unknown>)[columnId])
            .filter(value => value != null && value !== '' && typeof value !== 'object')
        )).slice(0, 50) // Limitar opciones para performance

        return {
          columnId,
          title,
          options: uniqueValues.map(value => ({
            label: String(value),
            value: String(value),
          }))
        }
      })
      .filter(filter => filter.options.length > 1 && filter.options.length <= 20) // Solo mostrar columnas con opciones razonables
  }, [columns, data, enableAutoFilters, searchColumnId])

  // Combinar filtros manuales con automáticos (filtrando cualquier filter con columnId undefined)
  const allFilters = React.useMemo(() => {
    return [...facetedFilters, ...autoGeneratedFilters].filter(f => f.columnId)
  }, [facetedFilters, autoGeneratedFilters])

  // Custom global filter function that searches in nested objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalFilterFn = React.useCallback((row: any, _columnId: string, filterValue: string) => {
    const searchValue = filterValue.toLowerCase();

    // Helper function to recursively search in objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchInObject = (obj: any): boolean => {
      if (obj === null || obj === undefined) return false;

      if (typeof obj === 'string' || typeof obj === 'number') {
        return String(obj).toLowerCase().includes(searchValue);
      }

      if (typeof obj === 'object') {
        return Object.values(obj).some(val => searchInObject(val));
      }

      return false;
    };

    // Search in all row values
    return Object.values(row.original).some(value => searchInObject(value));
  }, []);

  const table = useReactTable({
    data,
    columns: tableColumns,
    initialState: {
      pagination: {
        // When server-side: show all rows the server sent (no client pagination)
        pageSize: serverSidePagination ? 999 : defaultPageSize,
        pageIndex: 0,
      },
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter: enableGlobalSearch ? globalFilter : undefined,
    },
    enableRowSelection: enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: enableGlobalSearch ? setGlobalFilter : undefined,
    globalFilterFn: enableGlobalSearch ? globalFilterFn : "includesString",
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(!serverSidePagination && { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: meta, // Pass custom meta to columns
  })

  // Helper functions to get selected rows
  const getSelectedRows = React.useCallback((): TData[] => {
    return table.getFilteredSelectedRowModel().rows.map(row => row.original);
  }, [table]);

  // Notify parent when selection changes
  React.useEffect(() => {
    if (onSelectionChange && enableRowSelection) {
      onSelectionChange(getSelectedRows());
    }
  }, [rowSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAllRows = React.useCallback((): TData[] => {
    return table.getFilteredRowModel().rows.map(row => row.original);
  }, [table]);

  // Wrap export callbacks to pass selected and all rows
  const handleExportExcel = React.useCallback(() => {
    if (onExportExcel) {
      onExportExcel(getSelectedRows(), getAllRows());
    }
  }, [onExportExcel, getSelectedRows, getAllRows]);

  const handleExportPDF = React.useCallback(() => {
    if (onExportPDF) {
      onExportPDF(getSelectedRows(), getAllRows());
    }
  }, [onExportPDF, getSelectedRows, getAllRows]);

  const handleExportCSV = React.useCallback(() => {
    if (onExportCSV) {
      onExportCSV(getSelectedRows(), getAllRows());
    }
  }, [onExportCSV, getSelectedRows, getAllRows]);

  // 🚀 Skeleton rows para loading inicial

  const SkeletonRows = ({ count, colSpan }: { count: number; colSpan: number }) => (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: colSpan }).map((_, j) => (
            <TableCell key={`skeleton-cell-${i}-${j}`}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )

  // Auto-generate mobile card config if not provided
  const effectiveMobileCardConfig = React.useMemo(() => {
    if (mobileCardConfig) return mobileCardConfig
    if (disableMobileView) return null
    return autoGenerateMobileCardConfig(columns)
  }, [mobileCardConfig, disableMobileView, columns])

  if (!mounted) {
    // On mobile, show a simple loading skeleton
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 p-4 space-y-3">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-white dark:bg-gray-900 rounded-lg space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full animate-pulse bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className="h-full flex-1 flex-col space-y-3 p-4 hidden md:flex">
        {/* --- ENCABEZADO --- */}
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">{pageTitle}</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">{pageDescription}</p>
        </div>

        {/* --- CARD CON SKELETON --- */}
        <Card>
          <CardContent className="p-0">
            {/* Toolbar skeleton */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="h-9 w-[200px] animate-pulse rounded bg-muted" />
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 animate-pulse rounded bg-muted" />
                <div className="h-9 w-9 animate-pulse rounded bg-muted" />
                <div className="h-9 w-9 animate-pulse rounded bg-muted" />
              </div>
            </div>

            {/* Table skeleton */}
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col, i) => (
                      <TableHead key={i}>
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </TableHead>
                    ))}
                    <TableHead>
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SkeletonRows count={5} colSpan={columns.length + 1} />
                </TableBody>
              </Table>
            </div>

            {/* Pagination skeleton */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="h-9 w-32 animate-pulse rounded bg-muted" />
                <div className="h-9 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get help content if pageKey is provided
  const helpContent = pageKey ? getPageHelp(pageKey) : null;

  // Mobile view - render card-based layout on small screens
  if (isMobile && effectiveMobileCardConfig && !disableMobileView) {
    return (
      <MobileListView<any>
        data={data}
        cardConfig={effectiveMobileCardConfig as any}
        onRowClick={onRowClick}
        searchPlaceholder={searchPlaceholder}
        onServerSearch={onServerSearch}
        serverSearchValue={serverSearchValue}
        quickFilters={mobileQuickFilters}
        serverSidePagination={serverSidePagination}
        onNew={onNew}
        onRefresh={onRefresh}
        isLoading={isLoading}
        title={pageTitle}
        emptyMessage="No se encontraron resultados"
        swipeLeftAction={swipeLeftAction as any}
        swipeRightAction={swipeRightAction as any}
      />
    );
  }

  return (
    <div className="flex-1 flex-col space-y-2 p-3 hidden md:flex">
      {/* --- WELCOME BANNER --- */}
      {showWelcomeBanner && pageKey && helpContent && (
        <WelcomeBanner pageKey={pageKey} content={helpContent} />
      )}

      {/* --- ENCABEZADO COMPACTO --- */}
      {showTitle && (
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">{pageTitle}</h2>
          {helpContent && <PageHelpButton content={helpContent} />}
        </div>
      )}

      {/* --- CARD CON TOOLBAR Y TABLA --- */}
      <Card>
        <CardContent className="p-0">
          {/* --- TOOLBAR --- */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {extraToolbarStart}
              {/* Server-side search */}
              {onServerSearch ? (
                <Input
                  placeholder={searchPlaceholder}
                  value={serverSearchValue ?? ""}
                  onChange={event => onServerSearch(event.target.value)}
                  className="h-9 w-[200px] lg:w-[280px] text-sm"
                />
              ) : enableGlobalSearch ? (
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter ?? ""}
                  onChange={event => setGlobalFilter(event.target.value)}
                  className="h-9 w-[200px] lg:w-[280px] text-sm"
                />
              ) : searchColumnId ? (
                <Input
                  placeholder={searchPlaceholder}
                  value={
                    (table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ""
                  }
                  onChange={event =>
                    table.getColumn(searchColumnId)?.setFilterValue(event.target.value)
                  }
                  className="h-9 w-[200px] lg:w-[280px] text-sm"
                />
              ) : null}
              {allFilters.map(
                (filter) =>
                  table.getColumn(filter.columnId) && (
                    <DataTableFacetedFilter
                      key={filter.columnId}
                      column={table.getColumn(filter.columnId)}
                      title={filter.title}
                      options={filter.options}
                    />
                  )
              )}
              {serverFacetedFilters.map((filter) => (
                <DataTableFacetedFilter
                  key={`server-${filter.title}`}
                  title={filter.title}
                  options={filter.options}
                  selectedValues={filter.selectedValues}
                  onChange={filter.onChange}
                />
              ))}
              {(table.getState().columnFilters.length > 0 || (enableGlobalSearch && globalFilter)) && (
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    table.resetColumnFilters()
                    if (enableGlobalSearch) setGlobalFilter("")
                  }}
                  iconLeft={<Cross2Icon className="h-3 w-3" />}
                  className="h-8 text-sm"
                >
                  Limpiar
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {additionalActions}
              {onRefresh && <RefreshButton onClick={onRefresh} loading={refreshLoading} />}
              <DataTableViewOptions table={table} />
              {!hideTableActions && (
                <TableActionsMenu
                  onExportExcel={onExportExcel ? handleExportExcel : undefined}
                  onExportPDF={onExportPDF ? handleExportPDF : undefined}
                  onExportCSV={onExportCSV ? handleExportCSV : undefined}
                  hideExport={!onExportExcel && !onExportPDF && !onExportCSV}
                  selectedCount={enableRowSelection ? getSelectedRows().length : undefined}
                />
              )}
              {onNew && (
                <Button
                  onClick={onNew}
                  size="small"
                  type="primary"
                  icon={<Plus />}
                >
                  {newLabel || "Nuevo"}
                </Button>
              )}
            </div>
          </div>

          {/* --- TABLA --- */}
          <div>
            {isLoading && data.length > 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-gray-200 dark:border-gray-800">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan} className="h-10 text-xs font-medium text-gray-600 dark:text-gray-400">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {/* Primera carga sin datos → skeletons */}
                {isLoading && data.length === 0 ? (
                  <SkeletonRows count={5} colSpan={tableColumns.length} />
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const borderColor = getRowBorderColor?.(row.original);
                    return (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={(e) => {
                          // Don't trigger row click if clicking on buttons or interactive elements
                          const target = e.target as HTMLElement;
                          if (
                            target.closest('button') ||
                            target.closest('[role="menuitem"]') ||
                            target.closest('a')
                          ) {
                            return;
                          }
                          onRowClick?.(row.original);
                        }}
                        className={`${onRowClick ? "cursor-pointer" : ""} h-12 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group ${borderColor ? `border-l-4 ${borderColor}` : ""}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={tableColumns.length} className="h-24 text-center text-sm text-gray-600 dark:text-gray-400">
                      No se encontraron resultados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* --- PAGINACIÓN --- */}
          <div className="p-3 border-t">
            {serverSidePagination ? (
              <ServerSidePagination
                page={serverSidePagination.page}
                pageSize={serverSidePagination.pageSize}
                totalCount={serverSidePagination.totalCount}
                totalPages={serverSidePagination.totalPages}
                onPageChange={serverSidePagination.onPageChange}
                onPageSizeChange={serverSidePagination.onPageSizeChange}
              />
            ) : (
              <DataTablePagination table={table} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}