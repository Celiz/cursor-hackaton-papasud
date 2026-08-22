'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, type ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export interface SeccionTab {
  slug: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

/**
 * Shell de sección unificada: una ruta madre con tabs.
 *
 * El tab activo vive en estado LOCAL (no derivado de la URL en cada render).
 * Motivo: las listas embebidas mutan el query string (?id=…) para abrir sus
 * sheets de detalle. Si el tab se derivara de la URL, perder el ?tab= haría que
 * el tab volviera al default y se remontara la lista, cerrando el sheet al toque.
 * El estado local se inicializa desde la URL y se re-sincroniza sólo cuando el
 * param de tab cambia explícitamente (ej. deep-link desde la sidebar).
 */
export function SeccionTabs({
  tabs,
  defaultTab,
  paramName = 'tab',
  title,
  primaryAction,
}: {
  tabs: SeccionTab[]
  defaultTab?: string
  paramName?: string
  title?: ReactNode
  primaryAction?: ReactNode
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const resolveFromUrl = () => {
    const fromUrl = searchParams.get(paramName)
    return tabs.some((t) => t.slug === fromUrl)
      ? (fromUrl as string)
      : defaultTab || tabs[0]?.slug
  }

  const [active, setActive] = useState(resolveFromUrl)

  // Re-sync sólo cuando el param de tab cambia a un valor válido distinto
  // (deep-link externo). No volvemos al default si el param desaparece.
  useEffect(() => {
    const fromUrl = searchParams.get(paramName)
    if (fromUrl && fromUrl !== active && tabs.some((t) => t.slug === fromUrl)) {
      setActive(fromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramName])

  const setTab = (slug: string) => {
    setActive(slug)
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    params.set(paramName, slug)
    params.delete('id') // limpia detalle abierto al cambiar de tab
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={active} onValueChange={setTab} className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {title && (
          <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {title}
          </span>
        )}
        <TabsList className="w-fit max-w-full flex-wrap h-auto">
          {tabs.map((t) => (
            <TabsTrigger key={t.slug} value={t.slug} className="gap-1.5">
              {t.icon}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {primaryAction && <div className="ml-auto">{primaryAction}</div>}
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.slug} value={t.slug} className="mt-0">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
