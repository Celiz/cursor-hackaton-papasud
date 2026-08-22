"use client";

import { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatShortcut } from "@/lib/hooks/use-keyboard-shortcuts";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[];
  triggerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({
  shortcuts,
  triggerClassName,
  open: controlledOpen,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  // Sync internal state with controlled state
  useEffect(() => {
    if (isControlled && controlledOpen !== internalOpen) {
      setInternalOpen(controlledOpen);
    }
  }, [controlledOpen, isControlled, internalOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="default"
          size="tiny"
          icon={<Keyboard className="h-4 w-4" />}
          className={triggerClassName}
        >
          <span className="sr-only">Atajos de teclado</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Atajos de Teclado
          </DialogTitle>
          <DialogDescription>
            Usa estos atajos para navegar más rápido
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {shortcut.description}
              </span>
              <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                {formatShortcut(shortcut as any)}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Presiona <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">?</kbd> en cualquier momento para ver esta ayuda
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
