"use client";

import * as React from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Combobox editable inline con capacidad de agregar valores nuevos.
 *
 * Renderiza un trigger minimalista (parece texto plano hasta que se hace
 * hover) que al abrirse muestra:
 *   - input de búsqueda
 *   - lista filtrada de opciones existentes
 *   - acción "+ Agregar 'X'" si lo escrito no está en la lista
 *
 * Pensado para campos TEXT libres donde la lista de opciones se construye
 * dinámicamente a partir de los valores ya usados (ej. técnico, estado
 * contable, tipo de servicio).
 */
export function QuickEditableCombobox({
  value,
  options,
  placeholder,
  onChange,
  emptyLabel = "Sin valor",
  searchPlaceholder,
  triggerClassName,
  onCreateNew,
  disabled = false,
}: {
  value: string | null | undefined;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  searchPlaceholder: string;
  triggerClassName?: string;
  disabled?: boolean;
  /**
   * Si se provee, se llama cuando el usuario hace click en "+ Agregar X".
   * Debe persistir el nuevo valor (p.ej. POST a la API) y retornar el valor
   * final guardado. Si falla, debe throw y el popover permanece abierto.
   */
  onCreateNew?: (nuevoValor: string) => Promise<string>;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const displayValue = value && value.trim() ? value : emptyLabel;
  const trimmedSearch = search.trim();
  const showCreateOption =
    trimmedSearch.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase());

  return (
    <Popover
      modal
      open={disabled ? false : open}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (!o) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between gap-2 text-left text-sm font-medium outline-none group",
            "hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5 -mx-1 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
            triggerClassName
          )}
        >
          <span
            className={cn(
              "truncate flex-1",
              (!value || !value.trim()) && "text-gray-400 dark:text-gray-500 italic"
            )}
          >
            {displayValue}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[260px] overflow-y-auto overscroll-contain">
            <CommandEmpty>{placeholder}</CommandEmpty>
            <CommandGroup>
              {options
                .filter((o) =>
                  trimmedSearch
                    ? o.toLowerCase().includes(trimmedSearch.toLowerCase())
                    : true
                )
                .slice(0, 50)
                .map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              {showCreateOption && (
                <CommandItem
                  value={`__create_${trimmedSearch}`}
                  disabled={creating}
                  onSelect={async () => {
                    if (creating) return;
                    if (!onCreateNew) {
                      onChange(trimmedSearch);
                      setOpen(false);
                      setSearch("");
                      return;
                    }
                    try {
                      setCreating(true);
                      const finalValue = await onCreateNew(trimmedSearch);
                      onChange(finalValue || trimmedSearch);
                      setOpen(false);
                      setSearch("");
                    } catch (e) {
                      // el caller ya mostró el error — dejamos el popover abierto
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="text-purple-700 dark:text-purple-300"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {creating ? "Agregando..." : `Agregar "${trimmedSearch}"`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
