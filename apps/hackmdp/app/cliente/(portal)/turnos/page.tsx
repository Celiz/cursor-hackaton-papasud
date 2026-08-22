import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const TurnosClient = dynamic(() => import('./page.client'))

export default async function TurnosPage() {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  if (session.scope === 'limited') redirect('/cliente/inicio')

  return <TurnosClient orgTheme={session.org_theme} />
}
