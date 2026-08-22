'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, Send, Loader2, Check, Users, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFormatCurrency } from '@/lib/hooks/use-format-currency';

export type EntityType =
  | 'presupuesto'
  | 'pedido'
  | 'factura'
  | 'servicio'
  | 'equipo'
  | 'cliente'
  | 'producto'
  | 'cuenta_corriente'
  | 'ivr'
  | 'pago'
  | 'remito';

interface EntityInfo {
  type: EntityType;
  id: string;
  label: string;
  number?: string;
  amount?: number;
  link: string;
}

interface ShareToInternalChatButtonProps {
  entity: EntityInfo;
  className?: string;
  variant?: 'default' | 'icon' | 'inline';
}

interface SystemUser {
  id: string;
  nombre: string | null;
  email: string;
}

const ENTITY_LABELS: Record<EntityType, string> = {
  presupuesto: 'Presupuesto',
  pedido: 'Pedido',
  factura: 'Factura',
  servicio: 'Servicio Técnico',
  equipo: 'Equipo',
  cliente: 'Cliente',
  producto: 'Producto',
  cuenta_corriente: 'Cuenta Corriente',
  ivr: 'IVR',
  pago: 'Pago',
  remito: 'Remito',
};

export function ShareToInternalChatButton({
  entity,
  className,
  variant = 'default',
}: ShareToInternalChatButtonProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [botName, setBotName] = useState<string | null>(null);
  const [sendingToAgent, setSendingToAgent] = useState(false);
  const [sentToAgent, setSentToAgent] = useState(false);
  const formatCurrency = useFormatCurrency();

  useEffect(() => {
    if (open && users.length === 0) {
      loadUsers();
      loadBotInfo();
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const loadBotInfo = async () => {
    try {
      const res = await fetch('/api/agent/chat');
      const data = await res.json();
      if (data.bot?.name) setBotName(data.bot.name);
    } catch {
      // Agent not available
    }
  };

  const getInitials = (nombre: string | null, email: string) => {
    if (nombre) {
      return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleShareToAgent = async () => {
    setSendingToAgent(true);
    try {
      const entityLabel = ENTITY_LABELS[entity.type];
      const displayText = entity.number
        ? `${entityLabel} #${entity.number}`
        : `${entityLabel}: ${entity.label}`;

      const messageContent = entity.amount
        ? `Me comparten un ${displayText} ($${entity.amount.toLocaleString('es-AR')}). Mostrame un resumen de este registro.`
        : `Me comparten un ${displayText}. Mostrame un resumen de este registro.`;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageContent }),
      });

      if (!res.ok) throw new Error('Error al enviar al agente');

      toast.success(`Compartido con ${botName || 'Asistente'}`);
      setSentToAgent(true);
      setTimeout(() => setOpen(false), 500);
    } catch (error) {
      toast.error('Error al compartir con el agente');
    } finally {
      setSendingToAgent(false);
    }
  };

  const handleShare = async (userId: string) => {
    setSending(userId);

    try {
      const entityLabel = ENTITY_LABELS[entity.type];
      const displayText = entity.number
        ? `${entityLabel} #${entity.number}`
        : `${entityLabel}: ${entity.label}`;

      const messageContent = entity.amount
        ? `📎 ${displayText} - ${formatCurrency(entity.amount)}`
        : `📎 ${displayText}`;

      const response = await fetch('/api/mensajes-internos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: userId,
          content: messageContent,
          metadata: {
            entity_type: entity.type,
            entity_id: entity.id,
            entity_label: entity.label,
            entity_number: entity.number,
            entity_amount: entity.amount,
            link: entity.link,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar mensaje');
      }

      const targetUser = users.find(u => u.id === userId);
      toast.success(`Enviado a ${targetUser?.nombre || targetUser?.email}`);

      setSentTo(prev => new Set(prev).add(userId));

      // Auto-close after sending
      setTimeout(() => setOpen(false), 500);
    } catch (error) {
      toast.error('Error al compartir');
    } finally {
      setSending(null);
    }
  };

  const buttonContent = (
    <>
      <MessageCircle className="h-4 w-4" />
      <span>Chat</span>
    </>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
            "bg-transparent border-zinc-200 dark:border-zinc-700",
            "hover:bg-purple-100 dark:hover:bg-purple-900/40",
            "text-zinc-700 dark:text-zinc-300 hover:text-purple-700 dark:hover:text-purple-300",
            className
          )}
          title="Compartir por chat interno"
        >
          {buttonContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="p-3 border-b border-purple-200/60 dark:border-purple-800/40 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                Compartir por chat
              </p>
              <p className="text-xs text-muted-foreground">
                {ENTITY_LABELS[entity.type]} {entity.number ? `#${entity.number}` : ''}
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-64">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="p-1">
              {/* Agent option — always first */}
              {botName && (
                <>
                  <button
                    onClick={() => !sentToAgent && handleShareToAgent()}
                    disabled={sendingToAgent || sentToAgent}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      "hover:bg-primary/10",
                      sentToAgent && "bg-green-50 dark:bg-green-950/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                      {sentToAgent ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{botName}</p>
                      <p className="text-xs text-muted-foreground">Agente</p>
                    </div>
                    <div className="shrink-0">
                      {sendingToAgent ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : sentToAgent ? (
                        <span className="text-xs text-green-600 font-medium">Enviado</span>
                      ) : null}
                    </div>
                  </button>
                  <div className="mx-2.5 my-1 border-t border-border" />
                </>
              )}

              {/* Human users */}
              {users.length === 0 && !botName ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No hay usuarios disponibles
                </div>
              ) : (
                users.map((user) => {
                  const isSending = sending === user.id;
                  const wasSent = sentTo.has(user.id);

                  return (
                    <button
                      key={user.id}
                      onClick={() => !wasSent && handleShare(user.id)}
                      disabled={isSending || wasSent}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all",
                        "hover:bg-purple-100/80 dark:hover:bg-purple-900/40",
                        wasSent && "bg-green-50 dark:bg-green-950/30",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs font-medium",
                            wasSent
                              ? "bg-green-500 text-white"
                              : "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                          )}
                        >
                          {wasSent ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            getInitials(user.nombre, user.email)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">
                          {user.nombre || user.email.split('@')[0]}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                        ) : wasSent ? (
                          <span className="text-xs text-green-600 font-medium">Enviado</span>
                        ) : (
                          <Send className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
