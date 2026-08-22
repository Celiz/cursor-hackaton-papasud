"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, MousePointer, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface EmailTrackingStatus {
  id: string;
  estado: "enviado" | "click" | "bounce" | "error";
  enviado_at: string;
  clicks_count: number;
  ultimo_click?: string;
  destinatarios: string[];
  asunto?: string;
}

interface EmailTrackingBadgeProps {
  tracking?: EmailTrackingStatus[];
  className?: string;
  showLabel?: boolean;
}

// Parsear destinatarios si viene como string de PostgreSQL
function parseDestinatarios(dest: string[] | string | null | undefined): string[] {
  if (!dest) return [];
  if (Array.isArray(dest)) return dest;
  // PostgreSQL puede devolver formato {email1,email2}
  if (typeof dest === 'string' && dest.startsWith('{') && dest.endsWith('}')) {
    return dest.slice(1, -1).split(',').map(e => e.trim().replace(/"/g, ''));
  }
  return [dest];
}

// Agrupa tracking records por destinatario para mostrar estado individual
interface RecipientStatus {
  email: string;
  estado: "enviado" | "click" | "bounce" | "error";
  clicks_count: number;
  enviado_at: string;
  ultimo_click?: string;
}

function getRecipientStatuses(tracking: EmailTrackingStatus[]): RecipientStatus[] {
  const statusMap = new Map<string, RecipientStatus>();

  for (const t of tracking) {
    const emails = parseDestinatarios(t.destinatarios);
    for (const email of emails) {
      const existing = statusMap.get(email);
      // Si ya existe, mantener el más reciente o el que tiene clicks
      if (!existing || t.clicks_count > existing.clicks_count ||
          (t.estado === 'click' && existing.estado !== 'click')) {
        statusMap.set(email, {
          email,
          estado: t.estado,
          clicks_count: t.clicks_count,
          enviado_at: t.enviado_at,
          ultimo_click: t.ultimo_click,
        });
      }
    }
  }

  return Array.from(statusMap.values());
}

export function EmailTrackingBadge({
  tracking,
  className,
  showLabel = true,
}: EmailTrackingBadgeProps) {
  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM, HH:mm", { locale: es });
    } catch {
      return date;
    }
  };

  // No hay emails enviados
  if (!tracking || tracking.length === 0) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 text-muted-foreground", className)}
      >
        <Mail className="h-3 w-3" />
        {showLabel && "No enviado"}
      </Badge>
    );
  }

  // Obtener estado por cada destinatario
  const recipientStatuses = getRecipientStatuses(tracking);
  const totalRecipients = recipientStatuses.length;
  const clickedRecipients = recipientStatuses.filter(r => r.estado === 'click' || r.clicks_count > 0);
  const errorRecipients = recipientStatuses.filter(r => r.estado === 'error' || r.estado === 'bounce');
  const sentRecipients = recipientStatuses.filter(r => r.estado === 'enviado' && r.clicks_count === 0);

  const hasAnyClicks = clickedRecipients.length > 0;
  const hasAnyErrors = errorRecipients.length > 0;
  const allClicked = clickedRecipients.length === totalRecipients;
  const allErrors = errorRecipients.length === totalRecipients;

  // Determinar el estado general del badge
  let badgeVariant: 'click' | 'error' | 'sent' = 'sent';
  if (allErrors) {
    badgeVariant = 'error';
  } else if (hasAnyClicks) {
    badgeVariant = 'click';
  }

  // Badge de error (todos fallaron)
  if (badgeVariant === 'error') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
                className
              )}
            >
              <AlertCircle className="h-3 w-3" />
              {showLabel && "Error"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-xs space-y-2">
              <p className="font-medium text-red-600">Error de envío</p>
              {recipientStatuses.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  <span className="truncate">{r.email}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge con clicks (al menos uno hizo click)
  if (badgeVariant === 'click') {
    const totalClicks = clickedRecipients.reduce((sum, r) => sum + r.clicks_count, 0);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
                className
              )}
            >
              <MousePointer className="h-3 w-3" />
              {showLabel && (
                totalRecipients > 1
                  ? `Click (${clickedRecipients.length}/${totalRecipients})`
                  : `Click${totalClicks > 1 ? ` (${totalClicks})` : ""}`
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-xs space-y-2">
              <p className="font-medium">Estado por destinatario:</p>
              {recipientStatuses.map((r, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {r.clicks_count > 0 || r.estado === 'click' ? (
                    <MousePointer className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : r.estado === 'error' || r.estado === 'bounce' ? (
                    <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1">{r.email}</span>
                  {r.clicks_count > 0 && (
                    <span className="text-green-600 font-medium">
                      {r.clicks_count} click{r.clicks_count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ))}
              {clickedRecipients.length > 0 && clickedRecipients[0].ultimo_click && (
                <p className="text-muted-foreground pt-1 border-t">
                  Último click: {formatDate(clickedRecipients[0].ultimo_click)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge enviado (sin clicks)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
              className
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            {showLabel && (totalRecipients > 1 ? `Enviado (${totalRecipients})` : "Enviado")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-xs space-y-2">
            <p className="font-medium">Email enviado</p>
            <p className="text-muted-foreground">
              Enviado: {formatDate(tracking[0].enviado_at)}
            </p>
            {totalRecipients > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="font-medium">Destinatarios:</p>
                {recipientStatuses.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{r.email}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-muted-foreground italic pt-1">
              Sin clicks registrados
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Componente compacto para usar en tablas
 */
export function EmailTrackingIcon({
  tracking,
  className,
}: Omit<EmailTrackingBadgeProps, "showLabel">) {
  return (
    <EmailTrackingBadge
      tracking={tracking}
      className={className}
      showLabel={false}
    />
  );
}
