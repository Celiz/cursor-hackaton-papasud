import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const PresupuestoDetailClient = dynamic(() => import('./page.client'))

export default async function PresupuestoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  const { id } = await params
  return <PresupuestoDetailClient presupuestoId={id} />
}
