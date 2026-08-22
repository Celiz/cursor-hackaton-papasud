import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const InicioClient = dynamic(() => import('./page.client'))

export default async function InicioPage() {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')

  return <InicioClient session={JSON.parse(JSON.stringify(session))} />
}
