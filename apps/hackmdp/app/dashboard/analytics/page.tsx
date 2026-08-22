import { redirect } from 'next/navigation'

// Unificado en /dashboard/reportes (tabs). Redirect para no romper links viejos.
export default function Page() {
  redirect('/dashboard/reportes?tab=analytics')
}
