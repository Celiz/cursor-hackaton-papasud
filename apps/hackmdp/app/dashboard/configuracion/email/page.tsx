export const dynamic = "force-dynamic";
import nextDynamic from 'next/dynamic'
const EmailConfigClient = nextDynamic(() => import('./page.client'))

export default function EmailConfigPage() {
  return <EmailConfigClient />;
}
