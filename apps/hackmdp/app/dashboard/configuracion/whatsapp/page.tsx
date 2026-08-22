export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const WhatsAppPageClient = nextDynamic(() => import('./page.client'))

export default function WhatsAppPage() {
  return <WhatsAppPageClient />;
}
