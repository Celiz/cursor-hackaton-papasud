import { redirect } from 'next/navigation'

// Unificado en navegación por tabs. Redirect para no romper links viejos.
export default function Page() {
  redirect('/dashboard/inventario?tab=series')
}
