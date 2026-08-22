"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface QuickFilterTag {
  label: string;
  value: string;
  color?: string;
  count?: number;
}

interface QuickFilterTagsProps {
  tags: QuickFilterTag[];
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  className?: string;
}

const colorClasses = {
  default: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 data-[active=true]:bg-gray-700 data-[active=true]:text-white dark:data-[active=true]:bg-gray-300 dark:data-[active=true]:text-gray-900",
  success: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950/60 data-[active=true]:bg-emerald-600 data-[active=true]:text-white dark:data-[active=true]:bg-emerald-500 dark:data-[active=true]:text-white",
  warning: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60 data-[active=true]:bg-amber-600 data-[active=true]:text-white dark:data-[active=true]:bg-amber-500 dark:data-[active=true]:text-white",
  destructive: "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 data-[active=true]:bg-red-600 data-[active=true]:text-white dark:data-[active=true]:bg-red-500 dark:data-[active=true]:text-white",
  info: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-950/60 data-[active=true]:bg-blue-600 data-[active=true]:text-white dark:data-[active=true]:bg-blue-500 dark:data-[active=true]:text-white",
  purple: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:hover:bg-purple-950/60 data-[active=true]:bg-purple-600 data-[active=true]:text-white dark:data-[active=true]:bg-purple-500 dark:data-[active=true]:text-white",
};

export function QuickFilterTags({
  tags,
  activeFilters,
  onFilterChange,
  className,
}: QuickFilterTagsProps) {
  const toggleFilter = (value: string) => {
    if (activeFilters.includes(value)) {
      // Deselect if already active
      onFilterChange(activeFilters.filter((f) => f !== value));
    } else {
      // Select only this one (exclusive)
      onFilterChange([value]);
    }
  };

  const clearAll = () => {
    onFilterChange([]);
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {tags.map((tag) => {
        const isActive = activeFilters.includes(tag.value);
        return (
          <button
            key={tag.value}
            onClick={() => toggleFilter(tag.value)}
            data-active={isActive}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-1",
              colorClasses[tag.color || "default"]
            )}
          >
            <span>{tag.label}</span>
            {tag.count !== undefined && (
              <span className={cn(
                "inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold",
                isActive
                  ? "bg-white/30 text-inherit"
                  : "bg-current/10"
              )}>
                {tag.count}
              </span>
            )}
          </button>
        );
      })}
      {activeFilters.length > 0 && (
        <button
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-3 w-3" />
          <span>Limpiar</span>
        </button>
      )}
    </div>
  );
}
