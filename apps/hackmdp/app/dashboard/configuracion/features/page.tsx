export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const FeaturesPageClient = nextDynamic(() => import('./page.client'))

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
