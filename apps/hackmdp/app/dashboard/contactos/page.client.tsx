'use client'

import { SeccionTabs } from '@/components/layout/SeccionTabs'
import { Building2, UserCircle } from 'lucide-react'
import ClientesPageClient from '../empresas/page.client'
import PersonasPageClient from '../personas/page.client'

export default function ContactosSeccionClient() {
  return (
    <SeccionTabs
      title="Contactos"
      defaultTab="clientes"
      tabs={[
        { slug: 'clientes', label: 'Clientes', icon: <Building2 className="h-4 w-4" />, content: <ClientesPageClient /> },
        { slug: 'contactos', label: 'Contactos', icon: <UserCircle className="h-4 w-4" />, content: <PersonasPageClient /> },
      ]}
    />
  )
}
