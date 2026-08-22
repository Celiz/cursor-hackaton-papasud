'use client'

import { SeccionTabs } from '@/components/layout/SeccionTabs'
import { Settings, Activity, CheckSquare, ShieldCheck, Bell, PenLine } from 'lucide-react'
import ConfiguracionCentro from './CentroTab'
import ActividadPageClient from '../actividad/page.client'
import AprobacionesConfigPageClient from './aprobaciones/page.client'
import AuditTrailPageClient from '../audit-trail/page.client'
import AlertasConfigPageClient from './alertas/page.client'
import MiFirmaPageClient from './mi-firma/page.client'

export default function ConfiguracionSeccionClient() {
  return (
    <SeccionTabs
      title="Configuración"
      defaultTab="centro"
      tabs={[
        { slug: 'centro', label: 'Centro', icon: <Settings className="h-4 w-4" />, content: <ConfiguracionCentro /> },
        { slug: 'actividad', label: 'Actividad', icon: <Activity className="h-4 w-4" />, content: <ActividadPageClient /> },
        { slug: 'aprobaciones', label: 'Aprobaciones', icon: <CheckSquare className="h-4 w-4" />, content: <AprobacionesConfigPageClient /> },
        { slug: 'audit', label: 'Auditoría', icon: <ShieldCheck className="h-4 w-4" />, content: <AuditTrailPageClient /> },
        { slug: 'alertas', label: 'Alertas', icon: <Bell className="h-4 w-4" />, content: <AlertasConfigPageClient /> },
        { slug: 'mi-firma', label: 'Mi firma', icon: <PenLine className="h-4 w-4" />, content: <MiFirmaPageClient /> },
      ]}
    />
  )
}
