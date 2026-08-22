import { Toaster as Sonner, toast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-white group-[.toaster]:to-blue-50/50 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-blue-100/60 group-[.toaster]:shadow-[0_4px_24px_rgba(99,102,241,0.12)] dark:group-[.toaster]:from-gray-900 dark:group-[.toaster]:to-indigo-950/30 dark:group-[.toaster]:border-indigo-500/20 dark:group-[.toaster]:shadow-[0_4px_24px_rgba(99,102,241,0.15)]",
          success:
            "group-[.toaster]:!from-white group-[.toaster]:!to-emerald-50/50 group-[.toaster]:!border-emerald-200/60 group-[.toaster]:!shadow-[0_4px_24px_rgba(16,185,129,0.12)] dark:group-[.toaster]:!from-gray-900 dark:group-[.toaster]:!to-emerald-950/30 dark:group-[.toaster]:!border-emerald-500/20 dark:group-[.toaster]:!shadow-[0_4px_24px_rgba(16,185,129,0.15)]",
          error:
            "group-[.toaster]:!from-white group-[.toaster]:!to-red-50/50 group-[.toaster]:!border-red-200/60 group-[.toaster]:!shadow-[0_4px_24px_rgba(239,68,68,0.12)] dark:group-[.toaster]:!from-gray-900 dark:group-[.toaster]:!to-red-950/30 dark:group-[.toaster]:!border-red-500/20 dark:group-[.toaster]:!shadow-[0_4px_24px_rgba(239,68,68,0.15)]",
          info:
            "group-[.toaster]:!from-white group-[.toaster]:!to-blue-50/50 group-[.toaster]:!border-blue-200/60 group-[.toaster]:!shadow-[0_4px_24px_rgba(59,130,246,0.12)] dark:group-[.toaster]:!from-gray-900 dark:group-[.toaster]:!to-blue-950/30 dark:group-[.toaster]:!border-blue-500/20 dark:group-[.toaster]:!shadow-[0_4px_24px_rgba(59,130,246,0.15)]",
          warning:
            "group-[.toaster]:!from-white group-[.toaster]:!to-amber-50/50 group-[.toaster]:!border-amber-200/60 group-[.toaster]:!shadow-[0_4px_24px_rgba(245,158,11,0.12)] dark:group-[.toaster]:!from-gray-900 dark:group-[.toaster]:!to-amber-950/30 dark:group-[.toaster]:!border-amber-500/20 dark:group-[.toaster]:!shadow-[0_4px_24px_rgba(245,158,11,0.15)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
