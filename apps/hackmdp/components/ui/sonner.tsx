"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      gap={12}
      visibleToasts={4}
      offset={16}
      className="toaster group"
      style={{ zIndex: 99999 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/95 group-[.toaster]:dark:bg-zinc-900/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:border group-[.toaster]:border-purple-200/70 group-[.toaster]:dark:border-purple-800/60 group-[.toaster]:shadow-xl group-[.toaster]:shadow-purple-900/10 group-[.toaster]:dark:shadow-purple-950/30 group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:pointer-events-auto",
          title: "group-[.toast]:text-zinc-900 group-[.toast]:dark:text-zinc-100 group-[.toast]:font-medium group-[.toast]:text-sm",
          description: "group-[.toast]:text-zinc-500 group-[.toast]:dark:text-zinc-400 group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-purple-600 group-[.toast]:dark:bg-purple-500 group-[.toast]:text-white group-[.toast]:dark:text-white group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:shadow-sm group-[.toast]:shadow-purple-500/25 group-[.toast]:transition-all group-[.toast]:hover:bg-purple-700 group-[.toast]:dark:hover:bg-purple-600",
          cancelButton:
            "group-[.toast]:bg-purple-50 group-[.toast]:dark:bg-purple-950/40 group-[.toast]:text-purple-700 group-[.toast]:dark:text-purple-300 group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:transition-all group-[.toast]:hover:bg-purple-100 group-[.toast]:dark:hover:bg-purple-900/50",
          closeButton:
            "group-[.toast]:bg-white group-[.toast]:dark:bg-zinc-900 group-[.toast]:text-purple-600 group-[.toast]:dark:text-purple-300 group-[.toast]:border-purple-200 group-[.toast]:dark:border-purple-800/60 group-[.toast]:hover:bg-purple-50 group-[.toast]:dark:hover:bg-purple-900/40 group-[.toast]:transition-colors",
          error:
            "group-[.toaster]:!bg-red-50/95 group-[.toaster]:dark:!bg-red-950/95 group-[.toaster]:!border-red-200/80 group-[.toaster]:dark:!border-red-800/80 group-[.toaster]:!text-red-900 group-[.toaster]:dark:!text-red-100",
          success:
            "group-[.toaster]:!bg-purple-50/95 group-[.toaster]:dark:!bg-purple-950/60 group-[.toaster]:!border-purple-200/80 group-[.toaster]:dark:!border-purple-800/70 group-[.toaster]:!text-purple-900 group-[.toaster]:dark:!text-purple-100 [&_[data-icon]]:!text-purple-600 dark:[&_[data-icon]]:!text-purple-300",
          warning:
            "group-[.toaster]:!bg-amber-50/95 group-[.toaster]:dark:!bg-amber-950/95 group-[.toaster]:!border-amber-200/80 group-[.toaster]:dark:!border-amber-800/80 group-[.toaster]:!text-amber-900 group-[.toaster]:dark:!text-amber-100",
          info:
            "group-[.toaster]:!bg-purple-50/90 group-[.toaster]:dark:!bg-purple-950/50 group-[.toaster]:!border-purple-200/80 group-[.toaster]:dark:!border-purple-800/70 group-[.toaster]:!text-purple-900 group-[.toaster]:dark:!text-purple-100 [&_[data-icon]]:!text-purple-600 dark:[&_[data-icon]]:!text-purple-300",
          loading:
            "group-[.toaster]:!bg-white/95 group-[.toaster]:dark:!bg-zinc-900/95 group-[.toaster]:!border-purple-200/70 group-[.toaster]:dark:!border-purple-800/60 group-[.toaster]:!text-zinc-900 group-[.toaster]:dark:!text-zinc-100 [&_[data-title]]:!text-zinc-900 [&_[data-title]]:dark:!text-zinc-100 [&_[data-description]]:!text-zinc-500 [&_[data-description]]:dark:!text-zinc-400 [&_[data-icon]]:!text-purple-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
