"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dialogClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface CompactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onCancel?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  maxWidth?: string;
  className?: string;
}

/**
 * CompactDialog - Dialog component siguiendo el sistema de diseño High Density UI
 *
 * Uso:
 * <CompactDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Nuevo Cliente"
 *   description="Completa los datos del cliente"
 *   onCancel={() => setOpen(false)}
 *   onSubmit={handleSubmit}
 *   submitText="Crear Cliente"
 *   loading={loading}
 * >
 *   <FormContent />
 * </CompactDialog>
 */
export function CompactDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onCancel,
  onSubmit,
  submitText = "Guardar",
  cancelText = "Cancelar",
  loading = false,
  maxWidth = "sm:max-w-[800px]",
  className,
}: CompactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(dialogClasses.content, maxWidth, "max-h-[90vh] flex flex-col p-0", className)}
      >
        <DialogHeader className={cn(dialogClasses.header, "px-6 pt-6 pb-4 border-b flex-shrink-0")}>
          <DialogTitle className={dialogClasses.title}>{title}</DialogTitle>
          {description && (
            <DialogDescription className={dialogClasses.description}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {(footer || onCancel || onSubmit) && (
          <DialogFooter className={cn(dialogClasses.footer, "px-6 py-4 border-t flex-shrink-0")}>
            {footer ? (
              footer
            ) : (
              <>
                {onCancel && (
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className={dialogClasses.cancelButton}
                  >
                    {cancelText}
                  </Button>
                )}
                {onSubmit && (
                  <Button
                    onClick={onSubmit}
                    disabled={loading}
                    className={dialogClasses.primaryButton}
                  >
                    {loading ? "Guardando..." : submitText}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
