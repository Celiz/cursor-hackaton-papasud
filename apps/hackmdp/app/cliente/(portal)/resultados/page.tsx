import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const ResultadosClient = dynamic(() => import('./page.client'))

export default async function ResultadosPage() {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  return <ResultadosClient />
}
