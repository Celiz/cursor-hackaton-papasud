import { Column } from "@tanstack/react-table"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDownIcon, ArrowUpIcon, EyeClosedIcon, ListRestart } from "lucide-react"
import { LiaCaretUpSolid } from "react-icons/lia"
import { cn } from "@/lib/utils"
import { DataTableFacetedFilter } from "@/components/data-table-faceted-filter"

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
}

// Config opcional del filtro de columna, inyectado en column.columnDef.meta por
// GenericDataTable (prop columnHeaderFilters). Si está presente, el header
// muestra un embudo que abre el filtro (estilo Proveedor), server-side.
interface ColumnFacetedFilter {
    title?: string
    options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[]
    selectedValues: string[]
    onChange: (values: string[]) => void
}

// Resaltado legible para los items del menú: tinte claro del accent + texto
// foreground (en vez de depender de accent-foreground, que el tema de la org
// pisa y deja con contraste pobre el item resaltado).
const ITEM_CLS =
    "cursor-pointer focus:bg-accent/10 focus:text-foreground data-[highlighted]:bg-accent/10 data-[highlighted]:text-foreground"

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    const filterCfg = (column.columnDef.meta as { facetedFilter?: ColumnFacetedFilter } | undefined)?.facetedFilter

    const filterEl = filterCfg ? (
        <DataTableFacetedFilter
            iconOnly
            title={filterCfg.title ?? title}
            options={filterCfg.options}
            selectedValues={filterCfg.selectedValues}
            onChange={filterCfg.onChange}
        />
    ) : null

    if (!column.getCanSort()) {
        return (
            <div className={cn("flex items-center gap-1", className)}>
                <span>{title}</span>
                {filterEl}
            </div>
        )
    }

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className={cn(
                            "-ml-3 h-8 inline-flex items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold",
                            "hover:bg-accent/10 hover:text-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "data-[state=open]:bg-accent/10"
                        )}
                    >
                        <span>{title}</span>
                        {column.getIsSorted() === "desc" ? (
                            <ArrowDownIcon className="h-4 w-4" />
                        ) : column.getIsSorted() === "asc" ? (
                            <ArrowUpIcon className="h-4 w-4" />
                        ) : (
                            <LiaCaretUpSolid className="h-4 w-4 opacity-50" />
                        )}
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => column.toggleSorting(false)}>
                        <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        Asc
                    </DropdownMenuItem>
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => column.toggleSorting(true)}>
                        <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        Desc
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => column.clearSorting()}>
                        <ListRestart className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        Reset
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className={ITEM_CLS} onClick={() => column.toggleVisibility(false)}>
                        <EyeClosedIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                        Ocultar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            {filterEl}
        </div>
    )
}
