"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Mini sparkline component
function MiniSparkline({ data, color = "primary" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Generate SVG path
  const width = 80;
  const height = 24;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Color mapping — "primary" uses CSS variable for org-theme-aware color
  const colorMap: Record<string, { stroke: string; fill: string }> = {
    primary: { stroke: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.2)" },
    purple: { stroke: "rgb(139, 92, 246)", fill: "rgba(139, 92, 246, 0.2)" },
    green: { stroke: "rgb(34, 197, 94)", fill: "rgba(34, 197, 94, 0.2)" },
    blue: { stroke: "rgb(59, 130, 246)", fill: "rgba(59, 130, 246, 0.2)" },
    yellow: { stroke: "rgb(234, 179, 8)", fill: "rgba(234, 179, 8, 0.2)" },
    red: { stroke: "rgb(239, 68, 68)", fill: "rgba(239, 68, 68, 0.2)" },
    rose: { stroke: "rgb(225, 29, 72)", fill: "rgba(225, 29, 72, 0.2)" },
    orange: { stroke: "rgb(249, 115, 22)", fill: "rgba(249, 115, 22, 0.2)" },
  };

  const colors = colorMap[color] || colorMap.primary;

  // Create area fill path
  const areaPath = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <path d={areaPath} style={{ fill: colors.fill }} />
      {/* Line */}
      <path
        d={pathD}
        style={{ fill: 'none', stroke: colors.stroke, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        style={{ fill: colors.stroke }}
      />
    </svg>
  );
}

interface WidgetCardProps {
  title: string;
  count: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  statusClassName?: string;
  className?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparklineData?: number[];
  sparklineColor?: "primary" | "purple" | "green" | "blue" | "yellow" | "red" | "orange" | "rose";
  comparison?: {
    label: string;
    value: number | string;
    change?: number;
  };
}

export function WidgetCard({
  title,
  count,
  subtitle,
  icon,
  onClick,
  statusClassName,
  className,
  trend,
  sparklineData,
  sparklineColor = "primary",
  comparison,
}: WidgetCardProps) {
  return (
    <div
      className={cn("cursor-pointer", className)}
      onClick={onClick}
    >
      <div className={cn(
        "relative overflow-hidden group rounded-2xl transition-all duration-300",
        // Fondo sólido blanco para que se destaque
        "bg-white dark:bg-gray-900",
        // Borde sutil con color de org
        "border border-primary/20 dark:border-primary/30",
        // Sombra con tinte del color de org
        "shadow-[0_4px_24px_hsl(var(--primary)_/_0.15),0_1px_3px_rgba(0,0,0,0.08)]",
        "dark:shadow-[0_8px_32px_hsl(var(--primary)_/_0.25),0_2px_16px_rgba(0,0,0,0.4)]",
        "hover:shadow-[0_8px_40px_hsl(var(--primary)_/_0.22),0_2px_8px_rgba(0,0,0,0.1)]",
        "dark:hover:shadow-[0_12px_48px_hsl(var(--primary)_/_0.35),0_4px_24px_hsl(var(--primary)_/_0.2)]",
        "hover:border-primary/30 dark:hover:border-primary/40"
      )}>
        <div className="p-6">
          {/* Glassmorphism background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-primary/10 via-accent/5 to-transparent rounded-full -mr-20 -mt-20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "p-3 rounded-xl backdrop-blur-sm bg-gradient-to-br transition-all duration-300",
                "from-background/40 to-background/20",
                "shadow-[inset_2px_2px_4px_rgba(255,255,255,0.3),inset_-2px_-2px_4px_rgba(0,0,0,0.1)]",
                "dark:shadow-[inset_2px_2px_4px_rgba(255,255,255,0.05),inset_-2px_-2px_4px_rgba(0,0,0,0.3)]",
                "group-hover:scale-110 group-hover:rotate-3",
                statusClassName
              )}>
                {icon}
              </div>
              {trend && (
                <div className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md",
                  "border border-primary/20 dark:border-primary/30",
                  "shadow-[2px_2px_6px_rgba(0,0,0,0.1),-2px_-2px_6px_rgba(255,255,255,0.5)]",
                  "dark:shadow-[2px_2px_6px_rgba(0,0,0,0.3),-1px_-1px_3px_rgba(255,255,255,0.05)]",
                  trend.isPositive
                    ? "bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                    : "bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                )}>
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-end justify-between gap-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={String(count)}
                    className="text-3xl font-bold text-foreground"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.25 }}
                  >
                    {count}
                  </motion.div>
                </AnimatePresence>
                {sparklineData && sparklineData.length > 1 && (
                  <div className="pb-1">
                    <MiniSparkline data={sparklineData} color={sparklineColor} />
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground/90">{title}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground/80">{subtitle}</p>
              )}
              {comparison && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">{comparison.label}:</span>
                  <span className="text-xs font-medium text-foreground/80">{comparison.value}</span>
                  {comparison.change !== undefined && (
                    <span className={cn(
                      "text-xs font-medium",
                      comparison.change >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {comparison.change >= 0 ? "+" : ""}{comparison.change}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Glassmorphic shine effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// Skeleton version for loading states
export function WidgetCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 animate-pulse",
      "bg-white dark:bg-gray-900",
      "border border-primary/20 dark:border-primary/30",
      "shadow-[0_4px_24px_hsl(var(--primary)_/_0.15),0_1px_3px_rgba(0,0,0,0.08)]",
      "dark:shadow-[0_8px_32px_hsl(var(--primary)_/_0.25),0_2px_16px_rgba(0,0,0,0.4)]",
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted/60 to-muted/40 shadow-inner" />
      </div>
      <div className="space-y-3">
        <div className="h-9 w-24 bg-gradient-to-r from-muted/60 to-muted/40 rounded-lg" />
        <div className="h-4 w-36 bg-gradient-to-r from-muted/50 to-muted/30 rounded" />
        <div className="h-3 w-28 bg-gradient-to-r from-muted/40 to-muted/20 rounded" />
      </div>
    </div>
  );
}