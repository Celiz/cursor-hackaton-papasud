import { redirect } from 'next/navigation'
import { getClienteSession } from '@/lib/client-session'
import dynamic from 'next/dynamic'

const LoginClient = dynamic(() => import('./page.client'))

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await getClienteSession()
  if (session) redirect('/cliente/inicio')

  const sp = await searchParams
  return <LoginClient error={sp.error} />
}
