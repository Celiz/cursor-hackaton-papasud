'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Building2, LogIn } from 'lucide-react'

interface Org {
  org_id: string
  nombre: string
  theme: string
  logo: string | null
}

const ERROR_MESSAGES: Record<string, string> = {
  token_invalido: 'El link que usaste ya no es válido. Pedí uno nuevo a tu negocio.',
  datos_incompletos: 'Hubo un problema con tus datos. Contactá al negocio.',
}

const THEME_COLORS: Record<string, string> = {
  purple: 'bg-purple-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
}

export default function LoginClient({ error }: { error?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [orgs, setOrgs] = useState<Org[] | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setApiError('')

    try {
      const res = await fetch('/cliente/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Error al iniciar sesión')
        return
      }

      if (data.requiresOrgSelection) {
        setOrgs(data.organizations)
        setPersonaId(data.persona_id)
        return
      }

      router.push(data.redirect)
    } catch {
      setApiError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectOrg(org_id: string) {
    setLoading(true)
    try {
      const res = await fetch('/cliente/api/auth/select-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_id: personaId, org_id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error || 'Error al seleccionar')
        return
      }
      router.push(data.redirect)
    } catch {
      setApiError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const errorMsg = error ? ERROR_MESSAGES[error] : apiError

  if (orgs) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Elegí tu negocio</h1>
            <p className="text-muted-foreground mt-1">Sos cliente de varios negocios</p>
          </div>
          {orgs.map((org) => (
            <Card
              key={org.org_id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleSelectOrg(org.org_id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`w-10 h-10 rounded-full ${THEME_COLORS[org.theme] || 'bg-gray-500'} flex items-center justify-center`}>
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium">{org.nombre}</span>
              </CardContent>
            </Card>
          ))}
          <Button variant="ghost" className="w-full" onClick={() => setOrgs(null)}>
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mi Portal</CardTitle>
          <CardDescription>Accedé a tus turnos, resultados y más</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>¿Recibiste un link por WhatsApp o email?</p>
            <p>Usalo directamente para acceder sin cuenta.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
