import { redirect } from 'next/navigation'

// Unificado en /dashboard/campo: el plano, el GPS, la cámara y los avisos son
// la misma pantalla. Redirect para no romper links viejos.
export default function Page() {
  redirect('/dashboard/campo')
}
