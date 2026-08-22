import * as React from "react"
import { Column } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { PiPlusCircleDuotone } from "react-icons/pi"
import { CheckCheckIcon, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface DataTableFacetedFilterProps<TData, TValue> {
    column?: Column<TData, TValue>
    title?: string
    options: {
        label: string
        value: string
        icon?: React.ComponentType<{ className?: string }>
    }[]
    // Modo controlado (server-side): si se pasa `onChange`, el filtro deja de
    // operar sobre el column state de TanStack y reporta la selección hacia
    // arriba. El padre construye la query con esos valores.
    selectedValues?: string[]
    onChange?: (values: string[]) => void
    // Modo ícono: el trigger es un embudo compacto (para usar en el header de
    // una columna, al lado del título), en vez del botón "título + opciones".
    iconOnly?: boolean
}

export function DataTableFacetedFilter<TData, TValue>({
    column,
    title,
    options,
    selectedValues: controlledValues,
    onChange,
    iconOnly = false,
}: DataTableFacetedFilterProps<TData, TValue>) {
    const controlled = onChange !== undefined
    const facets = controlled ? undefined : column?.getFacetedUniqueValues()
    const selectedValues = new Set(
        controlled
            ? controlledValues ?? []
            : (column?.getFilterValue() as string[]) ?? []
    )

    const applyValues = (values: string[]) => {
        if (controlled) {
            onChange(values)
        } else {
            column?.setFilterValue(values.length ? values : undefined)
        }
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                {iconOnly ? (
                    <button
                        type="button"
                        title={title ? `Filtrar ${title}` : "Filtrar"}
                        className={cn(
                            "inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent/40 focus-visible:outline-none",
                            selectedValues.size > 0 ? "text-primary" : "text-muted-foreground/70"
                        )}
                    >
                        <Filter className={cn("h-3.5 w-3.5", selectedValues.size > 0 && "fill-current")} />
                    </button>
                ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-dashed"
                    iconLeft={<PiPlusCircleDuotone className="h-4 w-4" />}
                >
                    {title}
                    {selectedValues?.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge
                                variant="secondary"
                                className="rounded-sm px-1 font-normal lg:hidden"
                            >
                                {selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.size > 2 ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-sm px-1 font-normal"
                                    >
                                        {selectedValues.size} seleccionados
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selectedValues.has(option.value))
                                        .map((option) => (
                                            <Badge
                                                variant="secondary"
                                                key={option.value}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Buscar ${title?.toLowerCase()}...`} />
                    <CommandList>
                        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValues.has(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                selectedValues.delete(option.value)
                                            } else {
                                                selectedValues.add(option.value)
                                            }
                                            applyValues(Array.from(selectedValues))
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <CheckCheckIcon className={cn("h-4 w-4")} />
                                        </div>
                                        {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{option.label}</span>
                                        {facets?.get(option.value) && (
                                            <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                                {facets.get(option.value)}
                                            </span>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selectedValues.size > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => applyValues([])}
                                        className="justify-center text-center"
                                    >
                                        Limpiar filtros
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}