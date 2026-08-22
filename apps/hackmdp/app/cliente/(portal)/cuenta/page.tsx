import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const CuentaClient = dynamic(() => import('./page.client'))

export default async function CuentaPage() {
  const session = await getClienteSession()
  if (!session) redirect('/cliente/login')
  if (session.scope === 'limited') redirect('/cliente/inicio')
  // Fetch org pais for RGPD section visibility
  const { query } = await import('@/lib/db')
  const orgResult = await query('SELECT pais FROM organizations WHERE id = $1', [session.org_id])
  const orgPais = orgResult.rows[0]?.pais || 'AR'

  return <CuentaClient orgTheme={session.org_theme} orgPais={orgPais} />
}
