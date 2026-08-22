"use client";

import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Trash2, Loader2, Plus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TIPOS Y CONFIGURACIÓN
// =============================================================================

export type SheetColorTheme =
  | "blue"
  | "purple"
  | "teal"
  | "rose"
  | "amber"
  | "green"
  | "indigo"
  | "cyan"
  | "yellow"
  | "gray"
  | "orange"
  | "emerald"
  | "violet";

const themeClasses: Record<
  SheetColorTheme,
  {
    section: string;
    header: string;
    icon: string;
    iconBg: string;
    text: string;
    border: string;
  }
> = {
  blue: {
    section:
      "border-blue-200/60 dark:border-blue-700/40 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/30 dark:to-gray-900/80",
    header: "border-blue-200/60 dark:border-blue-700/40",
    icon: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-900 dark:text-blue-100",
    border: "hover:border-blue-400 dark:hover:border-blue-600",
  },
  purple: {
    section:
      "border-purple-200/60 dark:border-purple-700/40 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-950/30 dark:to-gray-900/80",
    header: "border-purple-200/60 dark:border-purple-700/40",
    icon: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    text: "text-purple-900 dark:text-purple-100",
    border: "hover:border-purple-400 dark:hover:border-purple-600",
  },
  teal: {
    section:
      "border-teal-200/60 dark:border-teal-700/40 bg-gradient-to-br from-teal-50/80 to-white dark:from-teal-950/30 dark:to-gray-900/80",
    header: "border-teal-200/60 dark:border-teal-700/40",
    icon: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
    text: "text-teal-900 dark:text-teal-100",
    border: "hover:border-teal-400 dark:hover:border-teal-600",
  },
  rose: {
    section:
      "border-rose-200/60 dark:border-rose-700/40 bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/30 dark:to-gray-900/80",
    header: "border-rose-200/60 dark:border-rose-700/40",
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    text: "text-rose-900 dark:text-rose-100",
    border: "hover:border-rose-400 dark:hover:border-rose-600",
  },
  amber: {
    section:
      "border-amber-200/60 dark:border-amber-700/40 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/30 dark:to-gray-900/80",
    header: "border-amber-200/60 dark:border-amber-700/40",
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-100",
    border: "hover:border-amber-400 dark:hover:border-amber-600",
  },
  green: {
    section:
      "border-green-200/60 dark:border-green-700/40 bg-gradient-to-br from-green-50/80 to-white dark:from-green-950/30 dark:to-gray-900/80",
    header: "border-green-200/60 dark:border-green-700/40",
    icon: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    text: "text-green-900 dark:text-green-100",
    border: "hover:border-green-400 dark:hover:border-green-600",
  },
  indigo: {
    section:
      "border-indigo-200/60 dark:border-indigo-700/40 bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-950/30 dark:to-gray-900/80",
    header: "border-indigo-200/60 dark:border-indigo-700/40",
    icon: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    text: "text-indigo-900 dark:text-indigo-100",
    border: "hover:border-indigo-400 dark:hover:border-indigo-600",
  },
  cyan: {
    section:
      "border-cyan-200/60 dark:border-cyan-700/40 bg-gradient-to-br from-cyan-50/80 to-white dark:from-cyan-950/30 dark:to-gray-900/80",
    header: "border-cyan-200/60 dark:border-cyan-700/40",
    icon: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/40",
    text: "text-cyan-900 dark:text-cyan-100",
    border: "hover:border-cyan-400 dark:hover:border-cyan-600",
  },
  yellow: {
    section:
      "border-yellow-200/60 dark:border-yellow-700/40 bg-gradient-to-br from-yellow-50/80 to-white dark:from-yellow-950/30 dark:to-gray-900/80",
    header: "border-yellow-200/60 dark:border-yellow-700/40",
    icon: "text-yellow-600 dark:text-yellow-400",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
    text: "text-yellow-900 dark:text-yellow-100",
    border: "hover:border-yellow-400 dark:hover:border-yellow-600",
  },
  gray: {
    section:
      "border-gray-200/60 dark:border-gray-700/40 bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-850/30 dark:to-gray-900/80",
    header: "border-gray-200/60 dark:border-gray-700/40",
    icon: "text-gray-600 dark:text-gray-400",
    iconBg: "bg-gray-100 dark:bg-gray-800/40",
    text: "text-gray-900 dark:text-gray-100",
    border: "hover:border-gray-400 dark:hover:border-gray-600",
  },
  orange: {
    section:
      "border-orange-200/60 dark:border-orange-700/40 bg-gradient-to-br from-orange-50/80 to-white dark:from-orange-950/30 dark:to-gray-900/80",
    header: "border-orange-200/60 dark:border-orange-700/40",
    icon: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    text: "text-orange-900 dark:text-orange-100",
    border: "hover:border-orange-400 dark:hover:border-orange-600",
  },
  emerald: {
    section:
      "border-emerald-200/60 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-gray-900/80",
    header: "border-emerald-200/60 dark:border-emerald-700/40",
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-900 dark:text-emerald-100",
    border: "hover:border-emerald-400 dark:hover:border-emerald-600",
  },
  violet: {
    section:
      "border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-950/30 dark:to-gray-900/80",
    header: "border-violet-200/60 dark:border-violet-700/40",
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    text: "text-violet-900 dark:text-violet-100",
    border: "hover:border-violet-400 dark:hover:border-violet-600",
  },
};

// =============================================================================
// DETAIL SHEET CONTAINER
// =============================================================================

interface DetailSheetContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: SheetColorTheme;
  children: ReactNode;
}

export function DetailSheetContainer({
  open,
  onOpenChange,
  theme,
  children,
}: DetailSheetContainerProps) {
  const gradientBg = {
    blue: "from-white via-white to-blue-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/40",
    purple:
      "from-white via-white to-purple-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/40",
    teal: "from-white via-white to-teal-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-teal-950/40",
    rose: "from-white via-white to-rose-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-rose-950/40",
    amber:
      "from-white via-white to-amber-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-amber-950/40",
    green:
      "from-white via-white to-green-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-green-950/40",
    indigo:
      "from-white via-white to-indigo-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/40",
    cyan: "from-white via-white to-cyan-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-cyan-950/40",
    yellow:
      "from-white via-white to-yellow-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-yellow-950/40",
    gray: "from-white via-white to-gray-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/40",
    orange:
      "from-white via-white to-orange-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-orange-950/40",
    emerald:
      "from-white via-white to-emerald-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/40",
    violet:
      "from-white via-white to-violet-50/60 dark:from-gray-900 dark:via-gray-900 dark:to-violet-950/40",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "w-full h-[90vh] max-h-[90vh] overflow-y-auto p-0 flex flex-col bg-gradient-to-br",
          gradientBg[theme]
        )}
        side="bottom"
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// DETAIL SHEET HEADER
// =============================================================================

interface DetailSheetHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  theme: SheetColorTheme;
  onEdit?: () => void;
  onDelete?: () => void;
  actions?: ReactNode;
}

export function DetailSheetHeader({
  icon: Icon,
  title,
  subtitle,
  badges,
  theme,
  onEdit,
  onDelete,
  actions,
}: DetailSheetHeaderProps) {
  const colors = themeClasses[theme];

  const headerGradient = {
    blue: "from-white to-blue-50/40 dark:from-gray-900 dark:to-blue-950/20",
    purple: "from-white to-purple-50/40 dark:from-gray-900 dark:to-purple-950/20",
    teal: "from-white to-teal-50/40 dark:from-gray-900 dark:to-teal-950/20",
    rose: "from-white to-rose-50/40 dark:from-gray-900 dark:to-rose-950/20",
    amber: "from-white to-amber-50/40 dark:from-gray-900 dark:to-amber-950/20",
    green: "from-white to-green-50/40 dark:from-gray-900 dark:to-green-950/20",
    indigo: "from-white to-indigo-50/40 dark:from-gray-900 dark:to-indigo-950/20",
    cyan: "from-white to-cyan-50/40 dark:from-gray-900 dark:to-cyan-950/20",
    yellow: "from-white to-yellow-50/40 dark:from-gray-900 dark:to-yellow-950/20",
    gray: "from-white to-gray-50/40 dark:from-gray-900 dark:to-gray-800/20",
    orange: "from-white to-orange-50/40 dark:from-gray-900 dark:to-orange-950/20",
    emerald: "from-white to-emerald-50/40 dark:from-gray-900 dark:to-emerald-950/20",
    violet: "from-white to-violet-50/40 dark:from-gray-900 dark:to-violet-950/20",
  };

  const titleGradient = {
    blue: "from-blue-900 to-blue-700 dark:from-blue-100 dark:to-blue-300",
    purple:
      "from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300",
    teal: "from-teal-900 to-teal-700 dark:from-teal-100 dark:to-teal-300",
    rose: "from-rose-900 to-rose-700 dark:from-rose-100 dark:to-rose-300",
    amber: "from-amber-900 to-amber-700 dark:from-amber-100 dark:to-amber-300",
    green: "from-green-900 to-green-700 dark:from-green-100 dark:to-green-300",
    indigo:
      "from-indigo-900 to-indigo-700 dark:from-indigo-100 dark:to-indigo-300",
    cyan: "from-cyan-900 to-cyan-700 dark:from-cyan-100 dark:to-cyan-300",
    yellow:
      "from-yellow-900 to-yellow-700 dark:from-yellow-100 dark:to-yellow-300",
    gray: "from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300",
    orange:
      "from-orange-900 to-orange-700 dark:from-orange-100 dark:to-orange-300",
    emerald:
      "from-emerald-900 to-emerald-700 dark:from-emerald-100 dark:to-emerald-300",
    violet:
      "from-violet-900 to-violet-700 dark:from-violet-100 dark:to-violet-300",
  };

  const iconShadow = {
    blue: "shadow-blue-500/10",
    purple: "shadow-purple-500/10",
    teal: "shadow-teal-500/10",
    rose: "shadow-rose-500/10",
    amber: "shadow-amber-500/10",
    green: "shadow-green-500/10",
    indigo: "shadow-indigo-500/10",
    cyan: "shadow-cyan-500/10",
    yellow: "shadow-yellow-500/10",
    gray: "shadow-gray-500/10",
    orange: "shadow-orange-500/10",
    emerald: "shadow-emerald-500/10",
    violet: "shadow-violet-500/10",
  };

  return (
    <SheetHeader
      className={cn(
        "px-6 pt-4 pb-3 pr-14 border-b shrink-0 bg-gradient-to-r",
        colors.header,
        headerGradient[theme]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "bg-gradient-to-br p-3 rounded-2xl border shadow-sm",
              colors.iconBg,
              colors.header,
              iconShadow[theme]
            )}
          >
            <Icon className={cn("h-8 w-8", colors.icon)} />
          </div>

          <div className="flex-1 min-w-0">
            <SheetTitle
              className={cn(
                "text-2xl bg-gradient-to-r bg-clip-text text-transparent",
                titleGradient[theme]
              )}
            >
              {title}
            </SheetTitle>
            <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
              {subtitle}
              {badges}
            </SheetDescription>
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {actions}
          {onEdit && (
            <Button size="sm" type="outline" className="h-7 w-7 p-0" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              type="text"
              className="h-7 w-7 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </SheetHeader>
  );
}

// =============================================================================
// DETAIL SHEET CONTENT
// =============================================================================

interface DetailSheetContentProps {
  children: ReactNode;
}

export function DetailSheetContent({ children }: DetailSheetContentProps) {
  return (
    <ScrollArea className="flex-1 h-[calc(90vh-100px)]">
      <div className="space-y-4 px-6 pb-6 pt-4">{children}</div>
    </ScrollArea>
  );
}

// =============================================================================
// DETAIL SHEET SECTION
// =============================================================================

interface DetailSheetSectionProps {
  icon: LucideIcon;
  title: string;
  count?: number;
  theme: SheetColorTheme;
  action?: ReactNode;
  children: ReactNode;
}

export function DetailSheetSection({
  icon: Icon,
  title,
  count,
  theme,
  action,
  children,
}: DetailSheetSectionProps) {
  const colors = themeClasses[theme];

  return (
    <section
      className={cn("space-y-3 p-4 border rounded-xl shadow-sm", colors.section)}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b pb-2",
          colors.header
        )}
      >
        <h3
          className={cn("font-semibold text-sm flex items-center gap-2", colors.text)}
        >
          <Icon className={cn("h-4 w-4", colors.icon)} />
          {title}
          {count !== undefined && ` (${count})`}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// =============================================================================
// DETAIL SHEET ITEM CARD
// =============================================================================

interface DetailSheetItemCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  extra?: ReactNode;
  theme: SheetColorTheme;
  onClick?: () => void;
}

export function DetailSheetItemCard({
  icon: Icon,
  title,
  subtitle,
  badge,
  extra,
  theme,
  onClick,
}: DetailSheetItemCardProps) {
  const colors = themeClasses[theme];

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
        onClick && cn("cursor-pointer", colors.border)
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "p-2 rounded-lg",
          theme === "teal" && "bg-teal-100 dark:bg-teal-900/30",
          theme === "blue" && "bg-blue-100 dark:bg-blue-900/30",
          theme === "purple" && "bg-purple-100 dark:bg-purple-900/30",
          theme === "rose" && "bg-rose-100 dark:bg-rose-900/30",
          theme === "amber" && "bg-amber-100 dark:bg-amber-900/30",
          theme === "green" && "bg-green-100 dark:bg-green-900/30",
          theme === "indigo" && "bg-indigo-100 dark:bg-indigo-900/30",
          theme === "cyan" && "bg-cyan-100 dark:bg-cyan-900/30",
          theme === "yellow" && "bg-yellow-100 dark:bg-yellow-900/30",
          theme === "gray" && "bg-gray-100 dark:bg-gray-900/30",
          theme === "orange" && "bg-orange-100 dark:bg-orange-900/30",
          theme === "emerald" && "bg-emerald-100 dark:bg-emerald-900/30",
          theme === "violet" && "bg-violet-100 dark:bg-violet-900/30",
          colors.icon
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {badge}
      {extra}
    </div>
  );
}

// =============================================================================
// DETAIL SHEET EMPTY STATE
// =============================================================================

interface DetailSheetEmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function DetailSheetEmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}: DetailSheetEmptyStateProps) {
  return (
    <div className="text-center py-6">
      <Icon className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {actionLabel && onAction && (
        <Button type="outline" size="tiny" className="mt-2" onClick={onAction}>
          <Plus className="h-3 w-3 mr-1" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// DETAIL SHEET LOADING
// =============================================================================

export function DetailSheetLoading() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}

// =============================================================================
// DETAIL SHEET STAT CARD
// =============================================================================

export interface DetailSheetStatCardProps {
  value: number | string;
  label: string;
  color?: "teal" | "rose" | "green" | "red" | "blue" | "amber" | "purple";
  /** Alias for color — used by some DetailSheets */
  theme?: "teal" | "rose" | "green" | "red" | "blue" | "amber" | "purple";
  icon?: LucideIcon;
  subtext?: string;
}

export function DetailSheetStatCard({
  value,
  label,
  color,
  theme,
  icon: Icon,
  subtext,
}: DetailSheetStatCardProps) {
  const resolvedColor = color || theme || "blue";
  const colorClasses = {
    teal: "text-teal-600 dark:text-teal-400",
    rose: "text-rose-600 dark:text-rose-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  const iconBgClasses = {
    teal: "bg-teal-100 dark:bg-teal-900/30",
    rose: "bg-rose-100 dark:bg-rose-900/30",
    green: "bg-green-100 dark:bg-green-900/30",
    red: "bg-red-100 dark:bg-red-900/30",
    blue: "bg-blue-100 dark:bg-blue-900/30",
    amber: "bg-amber-100 dark:bg-amber-900/30",
    purple: "bg-purple-100 dark:bg-purple-900/30",
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
      {Icon && (
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", iconBgClasses[resolvedColor])}>
          <Icon className={cn("h-4 w-4", colorClasses[resolvedColor])} />
        </div>
      )}
      <p className={cn("text-2xl font-bold", colorClasses[resolvedColor])}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {subtext && (
        <p className="text-[9px] text-muted-foreground mt-0.5">{subtext}</p>
      )}
    </div>
  );
}

// =============================================================================
// DETAIL SHEET INFO ITEM
// =============================================================================

interface DetailSheetInfoItemProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  theme: SheetColorTheme;
}

export function DetailSheetInfoItem({
  icon: Icon,
  label,
  value,
  theme,
}: DetailSheetInfoItemProps) {
  const colors = themeClasses[theme];

  return (
    <div className="flex items-start gap-2">
      <div className={cn("p-1.5 rounded-md flex-shrink-0", colors.iconBg)}>
        <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{value}</div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORTAR UTILIDADES
// =============================================================================

export { themeClasses };
