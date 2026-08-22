'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { StaggeredContainer, StaggeredItem } from "@/components/core-ui/StaggeredAnimations"
import { ContactosTable } from "@/components/core-ui/ContactosTable"

export default function ContactosPageClient() {
  return (
    <div className="flex-1 flex flex-col min-w-0 p-6">
      <StaggeredContainer id="contactos" className="space-y-6">
        <StaggeredItem>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Contactos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personas de contacto de tus clientes
            </p>
          </div>
        </StaggeredItem>

        <StaggeredItem>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listado de contactos</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactosTable enableCreate />
            </CardContent>
          </Card>
        </StaggeredItem>
      </StaggeredContainer>
    </div>
  )
}
