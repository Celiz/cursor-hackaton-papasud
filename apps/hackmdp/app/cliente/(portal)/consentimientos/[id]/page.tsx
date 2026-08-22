import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const ConsentimientoDetailClient = dynamic(() => import('./page.client'))

export default async function ConsentimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  const { id } = await params
  return <ConsentimientoDetailClient consentimientoId={id} />
}
