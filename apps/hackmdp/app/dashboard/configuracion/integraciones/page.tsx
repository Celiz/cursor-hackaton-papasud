export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const IntegracionesPageClient = nextDynamic(() => import('./page.client'))

export default function IntegracionesPage() {
  return <IntegracionesPageClient />;
}
