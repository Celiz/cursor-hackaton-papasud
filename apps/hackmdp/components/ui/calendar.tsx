"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Calendar wrapper sobre react-day-picker v9.
 *
 * IMPORTANTE: react-day-picker v9 cambió los nombres de las clases respecto
 * a v8. Las claves correctas ahora son `weekdays`, `weekday`, `week`, `day`,
 * `day_button`, `button_previous`, `button_next`, `month_caption`, etc.
 * Si volvés a v8 hay que renombrar todo.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-white dark:bg-gray-900 rounded-md", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 pb-2 relative items-center h-8",
        caption_label: "text-sm font-medium capitalize",
        // z-20: el <Nav> se renderiza ANTES que el contenedor de meses en el DOM
        // (rdp v9 con navLayout default), así que ese contenedor —en flujo
        // normal y transparente— pintaba encima e interceptaba los clicks de las
        // flechas (se veían pero "no se apretaban"). El z-index lo sube arriba.
        nav: "flex items-center justify-between absolute inset-x-1 top-1 z-20",
        button_previous: cn(
          buttonVariants({ type: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        ),
        button_next: cn(
          buttonVariants({ type: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-purple-50 dark:hover:bg-purple-900/30"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-9 h-8 flex items-center justify-center font-normal text-[0.75rem] uppercase",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button: cn(
          "h-9 w-9 p-0 font-normal text-sm rounded-md inline-flex items-center justify-center",
          "hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors",
          "aria-selected:bg-purple-600 aria-selected:text-white aria-selected:hover:bg-purple-700"
        ),
        selected:
          "[&>button]:bg-purple-600 [&>button]:text-white [&>button]:hover:bg-purple-700",
        today:
          "[&>button]:bg-purple-100 [&>button]:text-purple-900 dark:[&>button]:bg-purple-900/30 dark:[&>button]:text-purple-100 [&>button]:font-semibold",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-40",
        disabled: "[&>button]:text-muted-foreground [&>button]:opacity-40 [&>button]:cursor-not-allowed",
        range_start: "[&>button]:rounded-l-md",
        range_end: "[&>button]:rounded-r-md",
        range_middle:
          "[&>button]:bg-purple-100 dark:[&>button]:bg-purple-900/30 [&>button]:text-purple-900 dark:[&>button]:text-purple-100 [&>button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...(props as any)} />
          ) : (
            <ChevronRight className="h-4 w-4" {...(props as any)} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
