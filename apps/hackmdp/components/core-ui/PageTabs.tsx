"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface PageTab {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  content: React.ReactNode;
}

interface PageTabsProps {
  tabs: PageTab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  /**
   * Renderiza acciones en el lado derecho del header (ej: botones, filtros, sort)
   */
  headerActions?: React.ReactNode;
}

export function PageTabs({
  tabs,
  defaultTab,
  onTabChange,
  className,
  headerActions,
}: PageTabsProps) {
  return (
    <Tabs
      defaultValue={defaultTab || tabs[0]?.id}
      onValueChange={onTabChange}
      className={cn("flex flex-col h-full", className)}
    >
      {/* Header con Tabs y Acciones */}
      <div className="flex items-center justify-between border-b border-purple-200/40 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-950/20 dark:to-transparent px-6 py-3">
        <TabsList className="bg-transparent h-auto p-0 gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "relative px-4 py-2.5 rounded-xl transition-all duration-200",
                "text-sm font-medium",
                "hover:bg-purple-50/60 dark:hover:bg-purple-950/30",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-100 data-[state=active]:to-purple-50",
                "dark:data-[state=active]:from-purple-900/40 dark:data-[state=active]:to-purple-950/20",
                "data-[state=active]:text-purple-900 dark:data-[state=active]:text-purple-100",
                "data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/20",
                "data-[state=inactive]:text-gray-600 dark:data-[state=inactive]:text-gray-400",
                "flex items-center gap-2"
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold",
                  "bg-gradient-to-r from-purple-500 to-purple-600 text-white",
                  "shadow-sm shadow-purple-500/30"
                )}>
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Header Actions */}
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="h-full m-0 data-[state=inactive]:hidden"
          >
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
