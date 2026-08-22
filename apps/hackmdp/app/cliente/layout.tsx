import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mi Portal',
  description: 'Portal del cliente',
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>
}
