"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

// Contexto para compartir el ID generado entre Popover y sus hijos
const PopoverIdContext = React.createContext<string | undefined>(undefined)

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  // Usar useId para generar IDs estables entre servidor y cliente
  const generatedId = React.useId()
  return (
    <PopoverIdContext.Provider value={generatedId}>
      <PopoverPrimitive.Root data-slot="popover" {...props} />
    </PopoverIdContext.Provider>
  )
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  const id = React.useContext(PopoverIdContext)
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      id={props.id ?? (id ? `${id}-trigger` : undefined)}
      {...props}
    />
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  portal = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  /** false = render sin Portal. Necesario adentro de un Dialog: el
   *  scroll-lock del Dialog bloquea el scroll del contenido portaleado. */
  portal?: boolean
}) {
  const id = React.useContext(PopoverIdContext)
  const content = (
    <PopoverPrimitive.Content
      data-slot="popover-content"
      id={props.id ?? (id ? `${id}-content` : undefined)}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "bg-white dark:bg-gray-900 text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border border-purple-200 dark:border-purple-700 p-4 shadow-lg outline-hidden",
        className
      )}
      {...props}
    />
  )
  return portal ? <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal> : content
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
