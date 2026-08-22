export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const InventarioPageClient = nextDynamic(() => import('./page.client'))

export default function InventarioPage() {
  return <InventarioPageClient />
}
