'use client'

import { SeccionTabs } from '@/components/layout/SeccionTabs'
import { PackageSearch, DollarSign } from 'lucide-react'
import ProductosCatalogo from './ProductosTab'
import PreciosHubClient from '../precios/page.client'

export default function ProductosSeccionClient() {
  return (
    <SeccionTabs
      defaultTab="productos"
      tabs={[
        { slug: 'productos', label: 'Productos', icon: <PackageSearch className="h-4 w-4" />, content: <ProductosCatalogo /> },
        { slug: 'precios', label: 'Precios', icon: <DollarSign className="h-4 w-4" />, content: <PreciosHubClient /> },
      ]}
    />
  )
}
