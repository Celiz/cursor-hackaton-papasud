"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Hash, Loader2, Package, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"

interface Producto {
  id: string
  nombre: string
  codigo: string
  precio_venta: number
  stock_actual: number
}

interface ProductoComboboxProps {
  value: string // descripción actual
  productoId?: string | null
  onSelect: (producto: Producto | null, descripcion: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

type SearchMode = "all" | "codigo" | "nombre"

export function ProductoCombobox({
  value,
  productoId,
  onSelect,
  placeholder = "Descripción del item...",
  disabled = false,
  className,
}: ProductoComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const [productos, setProductos] = React.useState<Producto[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [searchMode, setSearchMode] = React.useState<SearchMode>("all")
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 })
  const inputRef = React.useRef<HTMLInputElement>(null)
  const debounceRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  // Update dropdown position when open
  React.useEffect(() => {
    if (open && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [open, productos])

  // Sync input value with prop
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Search productos with debounce
  const searchProductos = React.useCallback(async (query: string, mode: SearchMode) => {
    if (!query || query.length < 2) {
      setProductos([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ search: query, pageSize: "10" })
      if (mode !== "all") params.append("search_field", mode)
      const res = await fetch(`/api/productos?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        setProductos(list.slice(0, 10))
      }
    } catch (error) {
      console.error("Error searching productos:", error)
      setProductos([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Update parent with text (no product selected)
    onSelect(null, newValue)

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      searchProductos(newValue, searchMode)
    }, 300)

    // Open popover when typing
    if (newValue.length >= 2 && !open) {
      setOpen(true)
    }
  }

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode)
    if (inputValue.length >= 2) {
      searchProductos(inputValue, mode)
      setOpen(true)
      inputRef.current?.focus()
    }
  }

  // Handle product selection
  const handleSelectProducto = (producto: Producto) => {
    const descripcion = `${producto.codigo} - ${producto.nombre}`
    setInputValue(descripcion)
    onSelect(producto, descripcion)
    setOpen(false)
    setProductos([])
  }

  // Track if mouse is over dropdown to prevent closing on blur
  const isMouseOverDropdownRef = React.useRef(false)

  // Handle blur - close after delay to allow click
  const handleBlur = () => {
    // Don't close if mouse is over dropdown
    if (isMouseOverDropdownRef.current) return
    setTimeout(() => {
      if (!isMouseOverDropdownRef.current) {
        setOpen(false)
      }
    }, 150)
  }

  return (
    <div className={cn("relative space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filtrar:</span>
        <div className="flex rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 p-0.5 gap-0.5">
          {(["all", "codigo", "nombre"] as const).map((m) => {
            const label = m === "all" ? "Todo" : m === "codigo" ? "Código" : "Nombre"
            const Icon = m === "codigo" ? Hash : m === "nombre" ? Search : null
            return (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() => handleModeChange(m)}
                className={cn(
                  "px-2 py-1 text-[11px] font-semibold rounded transition-all flex items-center gap-1 disabled:opacity-50",
                  searchMode === m
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (inputValue.length >= 2) {
              searchProductos(inputValue, searchMode)
              setOpen(true)
            }
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-10 pl-9 pr-10 text-sm rounded-lg border border-gray-300 dark:border-gray-600",
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
            "placeholder:text-gray-500 dark:placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        />
        {productoId && (
          <Package className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500 animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados - renderizado en portal para evitar problemas de overflow */}
      {open && productos.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: Math.max(dropdownPosition.width, 320),
            maxHeight: '320px',
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
          onMouseEnter={() => { isMouseOverDropdownRef.current = true }}
          onMouseLeave={() => { isMouseOverDropdownRef.current = false }}
        >
          <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 rounded-t-lg">
            Productos encontrados ({productos.length})
          </div>
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: '260px',
              overscrollBehavior: 'contain',
            }}
            onWheel={(e) => e.stopPropagation()}
          >
            {productos.map((producto) => (
              <div
                key={producto.id}
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelectProducto(producto)
                }}
                className="w-full text-left px-3 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 cursor-pointer select-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded shrink-0">
                        {producto.codigo}
                      </span>
                      <span className="text-xs text-gray-500">Stock: {producto.stock_actual}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                      {producto.nombre}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    {formatCurrency(producto.precio_venta)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
