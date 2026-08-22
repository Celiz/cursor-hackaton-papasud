'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Pencil,
  Send,
  Users,
  Bot,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface TelegramBot {
  id: string
  bot_username: string | null
  bot_name: string | null
  webhook_set: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

interface TelegramUser {
  id: string
  telegram_username: string | null
  telegram_first_name: string | null
  authorized: boolean
  default_domain: string | null
  last_interaction: string | null
}

interface TelegramIntegrationCardProps {
  bot: TelegramBot | null
  users: TelegramUser[]
  onRefresh: () => void
}

export default function TelegramIntegrationCard({
  bot,
  users,
  onRefresh,
}: TelegramIntegrationCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [form, setForm] = useState({
    bot_token: '',
    bot_name: '',
  })

  const isConnected = bot?.enabled && bot?.webhook_set

  const handleSave = async () => {
    if (!form.bot_token.trim()) {
      toast.error('El token del bot es obligatorio')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_token: form.bot_token,
          bot_name: form.bot_name || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al configurar bot')

      toast.success(`Bot @${data.bot?.username} configurado correctamente`)
      setIsEditing(false)
      setForm({ bot_token: '', bot_name: '' })
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisable = async () => {
    setIsDisabling(true)
    try {
      const res = await fetch('/api/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      })

      if (!res.ok) throw new Error('Error al desactivar')

      toast.success('Bot de Telegram desactivado')
      onRefresh()
    } catch {
      toast.error('Error al desactivar bot')
    } finally {
      setIsDisabling(false)
    }
  }

  // Not configured
  if (!bot && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#2AABEE]" />
            Telegram Bot
          </CardTitle>
          <CardDescription className="mt-2">
            Configurá un bot de Telegram para recibir y procesar fotos automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Bot className="w-5 h-5 text-[#2AABEE] mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Un empleado más en tu equipo</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu equipo le manda fotos de remitos, equipos o pacientes
                  y recibe los datos extraídos al instante
                </p>
              </div>
            </div>

            <Button onClick={() => setIsEditing(true)} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Configurar Bot de Telegram
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Editing form
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-[#2AABEE]" />
            <div>
              <CardTitle className="text-base">Telegram Bot</CardTitle>
              <CardDescription className="text-xs">
                Creá un bot en{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  @BotFather
                </a>{' '}
                y pegá el token acá
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">
              Token del bot <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxYZ"
                value={form.bot_token}
                onChange={e => setForm(prev => ({ ...prev, bot_token: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">
              Nombre del bot (opcional)
            </Label>
            <Input
              placeholder="Ej: Lía, Carlos, Asistente..."
              value={form.bot_name}
              onChange={e => setForm(prev => ({ ...prev, bot_name: e.target.value }))}
            />
            <p className="text-[11px] text-muted-foreground">
              El nombre con el que se presenta al saludar
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Connected state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-[#2AABEE]" />
            <div>
              <CardTitle className="text-base">Telegram Bot</CardTitle>
              <CardDescription className="text-xs">
                {bot?.bot_username ? `@${bot.bot_username}` : 'Bot configurado'}
                {bot?.bot_name ? ` · ${bot.bot_name}` : ''}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={
            isConnected
              ? "bg-green-500/10 text-green-700 border-green-500/20"
              : "bg-yellow-500/10 text-yellow-700 border-yellow-500/20"
          }>
            {isConnected ? (
              <><Check className="w-3 h-3 mr-1" /> Activo</>
            ) : (
              'Inactivo'
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Users summary */}
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-muted-foreground">
              {users.filter(u => u.last_interaction).length} activo{users.filter(u => u.last_interaction).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Recent users */}
        {users.length > 0 && (
          <div className="space-y-1">
            {users.slice(0, 5).map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm px-2 py-1.5">
                <span className="text-muted-foreground">
                  {u.telegram_first_name || u.telegram_username || 'Sin nombre'}
                  {u.telegram_username && <span className="text-xs ml-1">@{u.telegram_username}</span>}
                </span>
                <span className="text-xs text-muted-foreground">
                  {u.default_domain || '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" disabled={isDisabling}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desactivar bot de Telegram?</AlertDialogTitle>
                <AlertDialogDescription>
                  El bot dejará de recibir mensajes. Los usuarios vinculados se mantienen
                  y podés reactivarlo en cualquier momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisable}>Desactivar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
