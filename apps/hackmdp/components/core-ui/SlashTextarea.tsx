"use client"

import * as React from "react"
import useSWR from "swr"
import { cn } from "@/lib/utils"

interface TextoPredefinido {
  id: string
  titulo: string
  contenido: string
}

const fetcher = async (url: string): Promise<TextoPredefinido[]> => {
  const res = await fetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export interface SlashTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
}

/**
 * Textarea que, al escribir "/", ofrece los textos predefinidos del presupuesto
 * (tabla presupuesto_textos, administrados en Configuración). Al elegir uno se
 * inserta su contenido reemplazando el token "/...".
 *
 * El menú se ancla debajo del textarea (no en el caret) a propósito: posicionar
 * en la coordenada del cursor de un textarea es frágil y no vale la pena acá.
 */
export function SlashTextarea({ value, onChange, className, onBlur, ...props }: SlashTextareaProps) {
  const { data: textos = [] } = useSWR<TextoPredefinido[]>("/api/presupuesto-textos", fetcher)
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [slashPos, setSlashPos] = React.useState<number | null>(null)
  const [activeIdx, setActiveIdx] = React.useState(0)

  const filtered = React.useMemo(() => {
    if (!open) return []
    const q = query.toLowerCase()
    return textos
      .filter(
        (t) =>
          !q ||
          t.titulo.toLowerCase().includes(q) ||
          t.contenido.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [open, query, textos])

  // Detecta un token "/..." inmediatamente antes del cursor. El "/" tiene que
  // estar al inicio o precedido por espacio/salto, así no salta con fechas o
  // URLs (07/27/2026).
  const detectSlash = (text: string, caret: number) => {
    let i = caret - 1
    while (i >= 0) {
      const ch = text[i]
      if (ch === "\n") return null
      if (ch === "/") {
        const before = i === 0 ? "" : text[i - 1]
        if (i === 0 || before === " " || before === "\n" || before === "\t") {
          return { pos: i, query: text.slice(i + 1, caret) }
        }
        return null
      }
      i--
    }
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    onChange(text)
    const caret = e.target.selectionStart ?? text.length
    const found = detectSlash(text, caret)
    if (found && textos.length > 0) {
      setOpen(true)
      setSlashPos(found.pos)
      setQuery(found.query)
      setActiveIdx(0)
    } else {
      setOpen(false)
      setSlashPos(null)
    }
  }

  const insertTexto = (t: TextoPredefinido) => {
    if (slashPos == null || !ref.current) return
    const caret = ref.current.selectionStart ?? value.length
    const nuevo = value.slice(0, slashPos) + t.contenido + value.slice(caret)
    onChange(nuevo)
    setOpen(false)
    setSlashPos(null)
    const newCaret = slashPos + t.contenido.length
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus()
        ref.current.setSelectionRange(newCaret, newCaret)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || filtered.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % filtered.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      insertTexto(filtered[activeIdx])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      setSlashPos(null)
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // dejar que el click del menú (onMouseDown) corra antes de cerrar
          setTimeout(() => setOpen(false), 150)
          onBlur?.(e)
        }}
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-gray-800">
            Textos predefinidos
          </div>
          {filtered.map((t, idx) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                insertTexto(t)
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className={cn(
                "w-full text-left px-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0",
                idx === activeIdx
                  ? "bg-purple-50 dark:bg-purple-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {t.titulo}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {t.contenido}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
