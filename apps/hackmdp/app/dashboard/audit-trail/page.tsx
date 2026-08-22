import { redirect } from 'next/navigation'

// Unificado en /dashboard/configuracion (tabs). Redirect para no romper links viejos.
export default function Page() {
  redirect('/dashboard/configuracion?tab=audit')
}
