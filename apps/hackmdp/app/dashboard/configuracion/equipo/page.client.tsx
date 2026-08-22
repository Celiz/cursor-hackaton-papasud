'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Users, ArrowLeft, Shield, PenTool, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  nombre: string
  email: string
  rol: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function EquipoPage() {
  const { data: members, error, isLoading } = useSWR<TeamMember[]>(
    '/api/equipo',
    fetcher,
    { dedupingInterval: 30000 }
  )

  const rolVariant = (rol: string) => {
    if (rol === 'owner') return 'default'
    if (rol === 'admin') return 'secondary'
    return 'outline'
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Users className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            Usuarios, roles y configuracion de firma
          </p>
        </div>
      </div>

      {/* Usuarios */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Usuarios
        </h2>

        {isLoading && (
          <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">Error al cargar el equipo</p>
          </div>
        )}

        {members && members.length === 0 && (
          <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No hay usuarios registrados</p>
          </div>
        )}

        {members && members.length > 0 && (
          <Card>
            <div className="divide-y">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <Badge variant={rolVariant(m.rol)} className="ml-3 shrink-0">
                    {m.rol}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Link cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Roles y Permisos */}
        <Link href="/dashboard/configuracion/roles" className="group">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', 'bg-blue-100 dark:bg-blue-900/30')}>
                    <Shield className={cn('h-5 w-5', 'text-blue-600')} />
                  </div>
                  <div>
                    <CardTitle className="text-base">Roles y Permisos</CardTitle>
                    <CardDescription>Gestiona los roles y permisos de acceso</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        {/* Mi Firma */}
        <Link href="/dashboard/configuracion/mi-firma" className="group">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', 'bg-violet-100 dark:bg-violet-900/30')}>
                    <PenTool className={cn('h-5 w-5', 'text-violet-600')} />
                  </div>
                  <div>
                    <CardTitle className="text-base">Mi Firma</CardTitle>
                    <CardDescription>Configura tu firma personal, cargo y datos de contacto</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
