export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const PageClient = nextDynamic(() => import('./page.client'))

export default function Page() {
  return <PageClient />
}
