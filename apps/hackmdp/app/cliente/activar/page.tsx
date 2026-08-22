import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const ActivarClient = dynamic(() => import('./page.client'))

export default async function ActivarPage() {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  return <ActivarClient nombre={session.nombre} email={session.email} />
}
