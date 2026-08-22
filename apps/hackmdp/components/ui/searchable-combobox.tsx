"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDebounce } from "@/hooks/use-debounce"

// Límite de items a mostrar para mejor rendimiento
const MAX_VISIBLE_ITEMS = 50

export interface ComboboxOption {
  label: string
  value: string
  subtitle?: string
  badge?: string // Identificador como badge/chip
  secondaryLabel?: string // Texto secundario debajo del label
  data?: any // Additional data for extended options (like ClienteComboboxOption)
}

export interface ClienteComboboxOption extends ComboboxOption {
  data?: {
    nombre: string
    nombre_fantasia?: string
    identificador_unico?: string
    cuit: string
    email?: string[]
    telefono?: string[]
  }
}

interface SearchableComboboxProps {
  value?: string
  onValueChange: (value: string, option?: ComboboxOption | null) => void
  searchFn?: (query: string) => Promise<ComboboxOption[]>
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  // New: Preloaded data support
  preloadedOptions?: ComboboxOption[]
  enableLocalSearch?: boolean // Enable client-side filtering when using preloaded data
  // Custom option renderer
  renderOption?: (option: ComboboxOption, isSelected: boolean) => React.ReactNode
  // Pre-resolved selected option (bypass search resolution)
  defaultSelectedOption?: ComboboxOption | null
}

export function SearchableCombobox({
  value,
  onValueChange,
  searchFn,
  placeholder = "Buscar...",
  emptyMessage = "No se encontraron resultados",
  disabled = false,
  className,
  triggerClassName,
  preloadedOptions,
  enableLocalSearch = true,
  renderOption,
  defaultSelectedOption,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedOption, setSelectedOption] = React.useState<ComboboxOption | null>(null)
  const [asyncOptions, setAsyncOptions] = React.useState<ComboboxOption[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const debouncedSearchQuery = useDebounce(searchQuery, 150)

  // Local search function for preloaded options - memoizado
  const filterPreloadedOptions = React.useCallback((query: string, options: ComboboxOption[]) => {
    if (!query) return options.slice(0, MAX_VISIBLE_ITEMS)

    const lowerQuery = query.toLowerCase()
    const filtered = options.filter(opt => {
      // Search in label
      if (opt.label?.toLowerCase().includes(lowerQuery)) return true
      // Search in subtitle
      if (opt.subtitle?.toLowerCase().includes(lowerQuery)) return true
      // Search in secondaryLabel
      if (opt.secondaryLabel?.toLowerCase().includes(lowerQuery)) return true
      // Search in badge (ensure it's a string)
      if (typeof opt.badge === 'string' && opt.badge.toLowerCase().includes(lowerQuery)) return true
      // Search in data fields (for ClienteComboboxOption)
      if (opt.data) {
        const data = opt.data as any
        // Search in identificador_unico
        if (data.identificador_unico && String(data.identificador_unico).toLowerCase().includes(lowerQuery)) return true
        // Search in identificador_legacy (CLI-XXX del sistema viejo)
        if (data.identificador_legacy && String(data.identificador_legacy).toLowerCase().includes(lowerQuery)) return true
        // Search in CUIT
        if (data.cuit && String(data.cuit).toLowerCase().includes(lowerQuery)) return true
        // Search in nombre
        if (data.nombre && String(data.nombre).toLowerCase().includes(lowerQuery)) return true
        // Search in nombre_fantasia
        if (data.nombre_fantasia && String(data.nombre_fantasia).toLowerCase().includes(lowerQuery)) return true
      }
      return false
    })
    return filtered.slice(0, MAX_VISIBLE_ITEMS)
  }, [])

  // Opciones filtradas - memoizado para evitar recálculos
  const displayOptions = React.useMemo(() => {
    if (preloadedOptions && enableLocalSearch) {
      return filterPreloadedOptions(debouncedSearchQuery, preloadedOptions)
    }
    return asyncOptions
  }, [preloadedOptions, enableLocalSearch, debouncedSearchQuery, filterPreloadedOptions, asyncOptions])

  // Total de opciones (para mostrar mensaje)
  const totalOptions = preloadedOptions?.length || asyncOptions.length
  const hasMoreItems = totalOptions > MAX_VISIBLE_ITEMS && !debouncedSearchQuery

  // Cargar opciones async cuando se usa searchFn
  React.useEffect(() => {
    if (!open || !searchFn || (preloadedOptions && enableLocalSearch)) return

    const loadOptions = async () => {
      setIsLoading(true)
      try {
        const results = await searchFn(debouncedSearchQuery)
        setAsyncOptions(results.slice(0, MAX_VISIBLE_ITEMS))
      } catch (error) {
        console.error("Error fetching options:", error)
        setAsyncOptions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadOptions()
  }, [debouncedSearchQuery, open, searchFn, preloadedOptions, enableLocalSearch])

  // Apply defaultSelectedOption when provided
  React.useEffect(() => {
    if (defaultSelectedOption && defaultSelectedOption.value === value && selectedOption?.value !== value) {
      setSelectedOption(defaultSelectedOption)
    }
  }, [defaultSelectedOption, value, selectedOption?.value])

  // Cargar selected option inicial - solo cuando cambia el value
  React.useEffect(() => {
    if (!value) {
      setSelectedOption(null)
      return
    }

    // Si ya tenemos la opción seleccionada correcta, no hacer nada
    if (selectedOption?.value === value) return

    // Buscar en preloaded options
    if (preloadedOptions) {
      const selected = preloadedOptions.find(opt => opt.value === value)
      if (selected) {
        setSelectedOption(selected)
        return
      }
    }

    // Buscar en async options
    if (asyncOptions.length > 0) {
      const selected = asyncOptions.find(opt => opt.value === value)
      if (selected) {
        setSelectedOption(selected)
        return
      }
    }

    // Si tiene searchFn y no encontramos, buscar
    if (searchFn && !preloadedOptions) {
      searchFn("").then(results => {
        const selected = results.find(opt => opt.value === value)
        if (selected) {
          setSelectedOption(selected)
        }
      })
    }
  }, [value, preloadedOptions, asyncOptions, searchFn, selectedOption?.value])

  const handleSelect = (currentValue: string) => {
    // cmdk convierte el value a lowercase, buscamos case-insensitive
    const selected = displayOptions.find((opt: ComboboxOption) =>
      opt.value.toLowerCase() === currentValue.toLowerCase()
    )
    if (selected) {
      setSelectedOption(selected)
      // Pasamos el value original, no el lowercase de cmdk
      onValueChange(selected.value, selected)
    }
    setOpen(false)
  }

  const handleClear = () => {
    setSelectedOption(null)
    onValueChange("", null)
    setSearchQuery("")
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex items-center justify-between w-full min-h-10 py-1.5 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
              !selectedOption && "text-gray-400 dark:text-gray-500",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              {selectedOption ? (
                <>
                  {selectedOption.badge && (
                    <span className="flex-shrink-0 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                      {selectedOption.badge}
                    </span>
                  )}
                  <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
                    <span className="truncate text-sm font-medium text-left leading-tight">
                      {selectedOption.label}
                    </span>
                    {selectedOption.secondaryLabel && (
                      <span className="truncate text-xs text-muted-foreground text-left leading-tight">
                        {selectedOption.secondaryLabel}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span className="truncate text-sm">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 max-h-[400px] border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-900 rounded-lg"
          align="start"
          sideOffset={4}
        >
          <Command shouldFilter={false} className="bg-transparent">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <CommandInput
                placeholder={`Buscar ${placeholder.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="h-10"
              />
            </div>
            <CommandList
              className="max-h-[300px] overflow-y-auto overscroll-contain"
              onWheel={(e) => {
                // cmdk can intercept wheel events — manually scroll
                const el = e.currentTarget
                if (el.scrollHeight > el.clientHeight) {
                  e.stopPropagation()
                  el.scrollTop += e.deltaY
                }
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                </div>
              ) : displayOptions.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
                </div>
              ) : (
                <CommandGroup className="p-1">
                  {displayOptions.map((option: ComboboxOption) => {
                    const isSelected = value === option.value
                    return (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={handleSelect}
                        className="cursor-pointer py-2.5 px-3 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 data-[selected=true]:bg-purple-50 dark:data-[selected=true]:bg-purple-900/20"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 flex-shrink-0 text-purple-600",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {renderOption ? (
                          renderOption(option, isSelected)
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {option.badge && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded">
                                {option.badge}
                              </span>
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="truncate font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
                              {option.secondaryLabel && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {option.secondaryLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CommandItem>
                    )
                  })}
                  {hasMoreItems && (
                    <div className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 mt-1">
                      Escribí para buscar entre {totalOptions} opciones
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
