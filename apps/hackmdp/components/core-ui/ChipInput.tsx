"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  type?: "email" | "tel" | "text";
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValid(type: ChipInputProps["type"], raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  if (type === "email") return EMAIL_RE.test(v);
  return true;
}

function normalize(type: ChipInputProps["type"], raw: string): string {
  const v = raw.trim();
  return type === "email" ? v.toLowerCase() : v;
}

export function ChipInput({
  value,
  onChange,
  placeholder,
  type = "text",
  ariaLabel,
  id,
  disabled,
  className,
}: ChipInputProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string): boolean => {
    const parts = raw
      .split(/[,;\n]/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return false;

    const existing = new Set(value.map((v) => normalize(type, v)));
    const next = [...value];
    let added = false;

    for (const p of parts) {
      const norm = normalize(type, p);
      if (existing.has(norm)) continue;
      existing.add(norm);
      next.push(norm);
      added = true;
    }

    if (added) onChange(next);
    return added;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) {
        commit(draft);
        setDraft("");
      }
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      e.preventDefault();
      onChange(value.slice(0, -1));
    }
  };

  const handleBlur = () => {
    setFocused(false);
    if (draft.trim()) {
      commit(draft);
      setDraft("");
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (/[,;\n]/.test(pasted)) {
      e.preventDefault();
      commit(pasted);
      setDraft("");
    }
  };

  const remove = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div
      id={id}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 text-sm shadow-sm transition-[color,box-shadow] dark:bg-gray-800",
        "border-gray-300 dark:border-gray-600",
        focused && "border-purple-500 ring-purple-500/20 ring-[3px]",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {value.map((chip, idx) => {
        const valid = isValid(type, chip);
        return (
          <span
            key={`${chip}-${idx}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
              valid
                ? "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                : "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
            )}
            title={valid ? chip : `${chip} (formato inválido)`}
          >
            <span className="max-w-[240px] truncate">{chip}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(idx);
              }}
              className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
              aria-label={`Quitar ${chip}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      <input
        ref={inputRef}
        type={type === "email" ? "email" : type === "tel" ? "tel" : "text"}
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => setFocused(true)}
        onPaste={handlePaste}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={disabled}
        className="flex-1 min-w-[140px] bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>
  );
}
