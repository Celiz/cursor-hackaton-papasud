'use client'

import { SeccionTabs } from '@/components/layout/SeccionTabs'
import { BarChart3 } from 'lucide-react'
import AnalyticsPageClient from '../analytics/page.client'

export default function ReportesSeccionClient() {
  return (
    <SeccionTabs
      title="Reportes"
      defaultTab="analytics"
      tabs={[
        { slug: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, content: <AnalyticsPageClient /> },
      ]}
    />
  )
}
