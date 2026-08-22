import { headers } from 'next/headers'
import { PublicSignClient } from './page.client'

export default async function PublicSignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const baseUrl = `${protocol}://${host}`

  const response = await fetch(`${baseUrl}/api/firma-publica/${token}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <div className="text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Documento no encontrado</h1>
        <p className="text-muted-foreground">El enlace es invalido o ha expirado.</p>
      </div>
    )
  }

  const data = await response.json()
  return <PublicSignClient token={token} data={data} />
}
