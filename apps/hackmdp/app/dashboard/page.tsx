'use client'

import dynamic from 'next/dynamic'

// Papasud es de un solo rubro: no hace falta el switch por tipo de organización
// que tenía el ERP base.
const AgroDashboard = dynamic(() => import('./_dashboards/agro'), { ssr: false })

export default function DashboardPage() {
  return <AgroDashboard />
}
