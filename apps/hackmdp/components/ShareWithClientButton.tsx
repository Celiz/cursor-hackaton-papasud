'use client'

import { useState } from 'react'
import { Share2, Copy, Check, Link, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface ShareWithClientButtonProps {
  personaId: string
  personaNombre?: string
  scope?: 'full' | 'limited'
  recursoTipo?: string
  recursoId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
}

export function ShareWithClientButton({
  personaId,
  personaNombre,
  scope: defaultScope,
  recursoTipo,
  recursoId,
  variant = 'outline',
  size = 'sm',
}: ShareWithClientButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedScope, setSelectedScope] = useState<'full' | 'limited'>(defaultScope || 'full')

  async function generateToken() {
    setLoading(true)
    try {
      const res = await fetch('/api/client-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: personaId,
          scope: selectedScope,
          recurso_tipo: selectedScope === 'limited' ? recursoTipo : undefined,
          recurso_id: selectedScope === 'limited' ? recursoId : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setLink(data.link)
      }
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function sendWhatsApp() {
    if (!link) return
    const text = encodeURIComponent(`Hola${personaNombre ? ` ${personaNombre}` : ''}! Accede a tu portal desde este link: ${link}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setLink(null); setCopied(false) } }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className="w-4 h-4 mr-2" />
          Compartir con cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir con cliente</DialogTitle>
          <DialogDescription>
            Genera un link para que {personaNombre || 'el cliente'} acceda al portal.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de acceso</Label>
              <div className="flex gap-2">
                <Button
                  variant={selectedScope === 'full' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedScope('full')}
                >
                  Acceso completo
                </Button>
                {recursoTipo && (
                  <Button
                    variant={selectedScope === 'limited' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedScope('limited')}
                  >
                    Solo este {recursoTipo}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedScope === 'full'
                  ? 'El cliente vera todos sus datos: turnos, resultados, presupuestos.'
                  : `El cliente solo vera este ${recursoTipo} especifico.`}
              </p>
            </div>
            <Button onClick={generateToken} disabled={loading} className="w-full">
              <Link className="w-4 h-4 mr-2" />
              {loading ? 'Generando...' : 'Generar link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
              <input
                readOnly
                value={link}
                className="flex-1 text-sm bg-transparent outline-none truncate"
              />
              <Button size="sm" variant="ghost" onClick={copyLink}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyLink} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copiado!' : 'Copiar link'}
              </Button>
              <Button onClick={sendWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
