export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const InsumosPageClient = nextDynamic(() => import('./page.client'))

export default function InsumosPage() {
  return <InsumosPageClient />;
}
