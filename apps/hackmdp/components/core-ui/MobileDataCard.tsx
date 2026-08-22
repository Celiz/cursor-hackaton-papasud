"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MobileDataCardProps, MobileCardField, MobileQuickAction } from "@/lib/types/mobile-card";
import {
  getNestedValue,
  getInitials,
  getAvatarColor,
  executeQuickAction,
} from "@/lib/mobile-card-helpers";
import { ChevronRight } from "lucide-react";
import { haptics } from "@/lib/haptics";

/**
 * Componente de tarjeta para vista móvil
 * Muestra información resumida de un registro con acciones rápidas
 */
export function MobileDataCard<T extends Record<string, unknown>>({
  data,
  config,
  onClick,
  isSelected = false,
}: MobileDataCardProps<T>) {
  const { fields, quickActions, getBorderColor, avatar } = config;

  // Agrupar campos por posición
  const titleField = fields.find((f) => f.position === "title");
  const subtitleField = fields.find((f) => f.position === "subtitle");
  const badgeFields = fields.filter((f) => f.position === "badge");
  const detailFields = fields.filter((f) => f.position === "detail");
  const footerFields = fields.filter((f) => f.position === "footer");

  // Obtener color del borde
  const borderColor = getBorderColor?.(data);

  // Obtener valor de un campo
  const getValue = (field: MobileCardField): React.ReactNode => {
    const value = getNestedValue(data, field.key);
    if (field.render) {
      return field.render(value, data);
    }
    if (value === null || value === undefined) return "-";
    return String(value);
  };

  // Obtener iniciales para el avatar
  const avatarValue = avatar?.field
    ? getNestedValue<string>(data, avatar.field)
    : titleField
      ? getNestedValue<string>(data, titleField.key)
      : null;

  const avatarColorClass = avatar?.colorFn
    ? avatar.colorFn(data)
    : getAvatarColor(avatarValue);

  // Filtrar acciones visibles
  const visibleActions = quickActions?.filter(
    (action) => !action.showIf || action.showIf(data)
  );

  const handleCardClick = (e: React.MouseEvent) => {
    // No hacer nada si se hizo click en un botón de acción
    if ((e.target as HTMLElement).closest("button")) return;
    haptics.light();
    onClick?.(data);
  };

  const handleQuickAction = (
    e: React.MouseEvent,
    action: MobileQuickAction<T>
  ) => {
    e.stopPropagation();
    executeQuickAction(action, data);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "relative bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800",
        "active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors",
        "cursor-pointer select-none",
        isSelected && "bg-primary/5 dark:bg-primary/10"
      )}
    >
      {/* Borde de color indicador de estado */}
      {borderColor && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: borderColor }}
        />
      )}

      <div className={cn("p-4", borderColor && "pl-5")}>
        {/* Header: Avatar + Título + Badges */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
              avatarColorClass
            )}
          >
            {avatar?.fallbackIcon ? (
              <avatar.fallbackIcon className="w-5 h-5" />
            ) : (
              getInitials(avatarValue)
            )}
          </div>

          {/* Título y Subtítulo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {titleField ? getValue(titleField) : "-"}
              </h3>
            </div>
            {subtitleField && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {getValue(subtitleField)}
              </p>
            )}
          </div>

          {/* Badges */}
          {badgeFields.length > 0 && (
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {badgeFields.map((field) => {
                const value = getValue(field);
                if (!value || value === "-") return null;
                return (
                  <Badge
                    key={field.key}
                    variant="secondary"
                    className="text-xs"
                  >
                    {value}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalles */}
        {detailFields.length > 0 && (
          <div className="mt-3 space-y-1.5 pl-13">
            {detailFields.map((field) => {
              const Icon = field.icon;
              const value = getValue(field);
              return (
                <div
                  key={field.key}
                  className="flex items-center gap-2 text-sm"
                >
                  {Icon && (
                    <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  )}
                  {field.label && (
                    <span className="text-gray-500 dark:text-gray-400">
                      {field.label}:
                    </span>
                  )}
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: Metadatos + Acciones rápidas */}
        <div className="mt-3 flex items-center justify-between pl-13">
          {/* Footer fields */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {footerFields.map((field, index) => (
              <span key={field.key} className="flex items-center gap-1">
                {index > 0 && <span className="text-gray-300 dark:text-gray-600">•</span>}
                {field.label && <span>{field.label}:</span>}
                <span>{getValue(field)}</span>
              </span>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1">
            {visibleActions?.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-primary"
                  onClick={(e) => handleQuickAction(e, action)}
                  title={action.label}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              );
            })}
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton de carga para MobileDataCard
 */
export function MobileDataCardSkeleton() {
  return (
    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 pl-13 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="mt-3 pl-13 flex justify-between">
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export default MobileDataCard;
