"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { QuickCreateDialog } from "./QuickCreateDialog";

interface QuickCreateContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const QuickCreateContext = createContext<QuickCreateContextValue | null>(null);

export function useQuickCreate() {
  const ctx = useContext(QuickCreateContext);
  if (!ctx) {
    throw new Error("useQuickCreate must be used inside <QuickCreateProvider>");
  }
  return ctx;
}

export function QuickCreateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut: Ctrl/Cmd + K (but Ctrl+K is often search, so use Ctrl+Shift+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <QuickCreateContext.Provider value={{ open, close, isOpen }}>
      {children}
      <QuickCreateDialog open={isOpen} onOpenChange={setIsOpen} />
    </QuickCreateContext.Provider>
  );
}
