export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const EstadosPageClient = nextDynamic(() => import('./page.client'))

export default function EstadosPage() {
  return <EstadosPageClient />;
}
