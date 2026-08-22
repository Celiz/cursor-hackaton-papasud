export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const RolesPageClient = nextDynamic(() => import('./page.client'))

export default function RolesPage() {
  return <RolesPageClient />;
}
