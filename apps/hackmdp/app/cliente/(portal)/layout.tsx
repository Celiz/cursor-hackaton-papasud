import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const PortalShell = dynamic(() => import('./portal-shell'))

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')

  return <PortalShell session={JSON.parse(JSON.stringify(session))}>{children}</PortalShell>
}
