
"use client"

import { DotsHorizontalIcon } from "@radix-ui/react-icons"
import { Row } from "@tanstack/react-table"
import React from "react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// --- INTERFAZ DE PROPS ACTUALIZADA ---
interface DataTableRowActionsProps<TData> {
    row: Row<TData>
    onEdit?: (row: TData) => void
    onDelete?: (row: TData) => void
    customActions?: {
        label: string
        action: (row: TData) => void
        icon?: React.ReactNode
        className?: string
        separator?: boolean
    }[]
}

// --- COMPONENTE REFACTORIZADO ---
export function DataTableRowActions<TData>({
    row,
    onEdit,
    onDelete,
    customActions = [],
}: DataTableRowActionsProps<TData>) {

    const originalData = row.original

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="flex h-8 w-8 p-0 items-center justify-center rounded-md hover:bg-muted data-[state=open]:bg-muted transition-colors"
                    aria-label="Abrir menú"
                >
                    <DotsHorizontalIcon className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[180px] font-light [font-family:inherit]"
            >
                {/* Acción de Editar (condicional) */}
                {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(originalData)}>
                        Editar
                    </DropdownMenuItem>
                )}

                {/* Acciones personalizadas */}
                {customActions.map((customAction, index) => (
                    <React.Fragment key={index}>
                        {customAction.separator && index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                            onClick={() => customAction.action(originalData)}
                            className={customAction.className}
                        >
                            {customAction.icon && <span className="mr-2 flex-shrink-0">{customAction.icon}</span>}
                            {customAction.label}
                        </DropdownMenuItem>
                    </React.Fragment>
                ))}

                {/* Separador si hay acciones y también onDelete */}
                {(onEdit || customActions.length > 0) && onDelete && <DropdownMenuSeparator />}

                {/* Acción de Eliminar (condicional) */}
                {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(originalData)} className="text-red-500">
                        Eliminar
                        <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
