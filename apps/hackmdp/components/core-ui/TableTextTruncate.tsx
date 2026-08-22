"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TableTextTruncateProps {
  text: string;
  maxChars?: number;
  className?: string;
  tooltipSide?: "top" | "bottom" | "left" | "right";
}

/**
 * Componente para truncar texto en tablas con tooltip al hacer hover
 * Estilo Supabase: trunca texto largo y muestra tooltip con el contenido completo
 *
 * Uso:
 * ```tsx
 * <TableCell>
 *   <TableTextTruncate
 *     text="Este es un texto muy largo que se va a truncar"
 *     maxChars={30}
 *   />
 * </TableCell>
 * ```
 */
export function TableTextTruncate({
  text,
  maxChars = 50,
  className,
  tooltipSide = "top",
}: TableTextTruncateProps) {
  const shouldTruncate = text && text.length > maxChars;
  const displayText = shouldTruncate ? text.slice(0, maxChars) + "..." : text;

  if (!text) {
    return <span className={cn("text-gray-400 dark:text-gray-600", className)}>-</span>;
  }

  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)}>{displayText}</span>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide} className="max-w-xs">
          <p className="text-xs whitespace-pre-wrap break-words">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge compacto para tablas (20px height, 11px font)
 * Estilo Supabase
 */
export function TableBadge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "purple" | "outline" | "secondary";
  className?: string;
}) {
  const variantClasses = {
    default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    secondary: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    outline: "bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    destructive: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    info: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Texto secundario compacto para tablas (11px, gris)
 * Estilo Supabase
 */
export function TableSecondaryText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-[11px] text-gray-600 dark:text-gray-400", className)}>
      {children}
    </span>
  );
}

/**
 * Código/ID compacto para tablas (12px, monospace)
 * Estilo Supabase
 */
export function TableCodeText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-xs font-mono text-gray-700 dark:text-gray-300", className)}>
      {children}
    </span>
  );
}
