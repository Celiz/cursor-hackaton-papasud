"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Pencil, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ESTADO_PRESETS,
  getEstadoStyle,
  matchPreset,
} from "@/lib/estado-helpers";

export interface EstadoComboboxProps {
  value: string;
  onChange: (next: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function EstadoCombobox({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Seleccionar estado",
}: EstadoComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const style = getEstadoStyle(value);
  const current = value?.trim() || "";
  const currentIsPreset = !!matchPreset(current);

  useEffect(() => {
    if (customMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [customMode]);

  const handleSelectPreset = (preset: string) => {
    onChange(preset);
    setOpen(false);
    setCustomMode(false);
    setDraft("");
  };

  const handleOpenCustom = () => {
    setDraft(currentIsPreset ? "" : current);
    setCustomMode(true);
  };

  const commitCustom = () => {
    const v = draft.trim();
    if (v) {
      onChange(v);
      setOpen(false);
      setCustomMode(false);
      setDraft("");
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setCustomMode(false);
      setDraft("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm shadow-sm transition-[color,box-shadow] dark:bg-gray-800",
            "border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100",
            "hover:border-gray-400 dark:hover:border-gray-500",
            "focus-visible:outline-none focus-visible:border-purple-500 focus-visible:ring-purple-500/20 focus-visible:ring-[3px]",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", style.dotClass)} />
            <span className={cn("truncate", !current && "text-gray-400 dark:text-gray-500")}>
              {current ? style.label : placeholder}
            </span>
            {style.isWarning && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                warning
              </span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
        sideOffset={4}
      >
        {customMode ? (
          <div className="flex flex-col gap-2 p-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Motivo / estado personalizado
            </label>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setCustomMode(false);
                  setDraft("");
                }
              }}
              placeholder="Ej: Pago pendiente, En revisión..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Se mostrará como warning amarillo
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setDraft("");
                }}
                className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={commitCustom}
                disabled={!draft.trim()}
                className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {ESTADO_PRESETS.map((preset) => {
              const s = getEstadoStyle(preset);
              const selected = matchPreset(current) === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", s.dotClass)} />
                  <span className="flex-1">{preset}</span>
                  {selected && <Check className="h-4 w-4 text-purple-600" />}
                </button>
              );
            })}
            <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
            <button
              type="button"
              onClick={handleOpenCustom}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="h-3.5 w-3.5 text-amber-600" />
              <span className="flex-1">
                {style.isWarning ? (
                  <>
                    Editar motivo:{" "}
                    <span className="text-amber-700 dark:text-amber-400">{current}</span>
                  </>
                ) : (
                  "Otro (escribir motivo)..."
                )}
              </span>
              {style.isWarning && <Check className="h-4 w-4 text-purple-600" />}
            </button>
            {style.isWarning && (
              <button
                type="button"
                onClick={() => handleSelectPreset("En Orden")}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-3 w-3" />
                Limpiar warning (volver a En Orden)
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
