'use client'

import { SeccionTabs } from '@/components/layout/SeccionTabs'
import { LayoutDashboard, Package, Scan, Warehouse, Box, ArrowRightLeft, ListChecks, AlertTriangle } from 'lucide-react'
import InventarioResumen from './ResumenTab'
import StockPageClient from '../deposito/stock/page.client'
import InventarioLotesClientPage from './lotes/page.client'
import InventarioSerialesClientPage from './seriales/page.client'
import InventarioDepositosClientPage from './depositos/page.client'
import InventarioBinsClientPage from './bins/page.client'
import InventarioTransferenciasClientPage from './transferencias/page.client'
import InventarioConteosClientPage from './conteos/page.client'
import ReposicionStockPageClient from '../reposicion-stock/page.client'

export default function InventarioSeccionClient() {
  return (
    <SeccionTabs
      defaultTab="resumen"
      tabs={[
        { slug: 'resumen', label: 'Resumen', icon: <LayoutDashboard className="h-4 w-4" />, content: <InventarioResumen /> },
        { slug: 'stock', label: 'Stock', icon: <Package className="h-4 w-4" />, content: <StockPageClient /> },
        { slug: 'lotes', label: 'Lotes', icon: <Scan className="h-4 w-4" />, content: <InventarioLotesClientPage /> },
        { slug: 'series', label: 'Series', icon: <Scan className="h-4 w-4" />, content: <InventarioSerialesClientPage /> },
        { slug: 'depositos', label: 'Depósitos', icon: <Warehouse className="h-4 w-4" />, content: <InventarioDepositosClientPage /> },
        { slug: 'bins', label: 'Bins', icon: <Box className="h-4 w-4" />, content: <InventarioBinsClientPage /> },
        { slug: 'movimientos', label: 'Movimientos', icon: <ArrowRightLeft className="h-4 w-4" />, content: <InventarioTransferenciasClientPage /> },
        { slug: 'conteos', label: 'Conteos', icon: <ListChecks className="h-4 w-4" />, content: <InventarioConteosClientPage /> },
        { slug: 'reposicion', label: 'Reposición', icon: <AlertTriangle className="h-4 w-4" />, content: <ReposicionStockPageClient /> },
      ]}
    />
  )
}
