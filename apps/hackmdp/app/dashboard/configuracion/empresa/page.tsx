export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const EmpresaPageClient = nextDynamic(() => import('./page.client'))

export default function EmpresaPage() {
  return <EmpresaPageClient />;
}
