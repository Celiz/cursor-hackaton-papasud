"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sheetClasses } from "@/lib/design-system";
import { cn } from "@/lib/utils";

interface TabConfig {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface CompactSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  tabs?: TabConfig[];
  defaultTab?: string;
  side?: "left" | "right" | "top" | "bottom";
  className?: string;
}

/**
 * CompactSheet - Sheet component siguiendo el sistema de diseño High Density UI
 *
 * Uso sin tabs:
 * <CompactSheet
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Detalle del Cliente"
 *   description="Información completa del cliente"
 * >
 *   <ContentHere />
 * </CompactSheet>
 *
 * Uso con tabs:
 * <CompactSheet
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Detalle del Cliente"
 *   tabs={[
 *     { value: "info", label: "Información", content: <InfoTab /> },
 *     { value: "historial", label: "Historial", content: <HistorialTab /> },
 *   ]}
 * />
 */
export function CompactSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  tabs,
  defaultTab,
  side = "right",
  className,
}: CompactSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(sheetClasses.content, "w-full sm:max-w-2xl", className)}
      >
        <SheetHeader className={sheetClasses.header}>
          <SheetTitle className={sheetClasses.title}>{title}</SheetTitle>
          {description && (
            <SheetDescription className={sheetClasses.description}>
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        {tabs && tabs.length > 0 ? (
          <Tabs defaultValue={defaultTab || tabs[0].value} className="mt-4">
            <TabsList className={cn(sheetClasses.tabsList, `grid-cols-${tabs.length}`)}>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={sheetClasses.tabsTrigger}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="mt-4 space-y-4"
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="mt-4 space-y-4">{children}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
