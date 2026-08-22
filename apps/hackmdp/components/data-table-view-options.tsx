"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { MixerHorizontalIcon } from "@radix-ui/react-icons"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          size="tiny"
          icon={<MixerHorizontalIcon />}
          type="outline"
          className="h-8"
        >
          <span className="font-semibold">Columnas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <div className="p-1 text-xs font-medium">Mostrar/Ocultar</div>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => (
            <DropdownMenuItem
              key={column.id}
              className="cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <div
                className="flex w-full items-center justify-between"
                onClick={column.getToggleVisibilityHandler()}
              >
                <span className="capitalize">
                  {column.id.replace(/_/g, ' ')}
                </span>
                <input
                  type="checkbox"
                  className="ml-2 h-4 w-4 accent-primary"
                  checked={column.getIsVisible()}
                  readOnly
                />
              </div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}