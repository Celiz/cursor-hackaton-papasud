'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Cloud,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
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
} from '@/components/ui/alert-dialog';

interface GoogleIntegration {
  id: number;
  tipo: 'calendar' | 'drive' | 'both';
  estado: 'active' | 'expired' | 'revoked' | 'error';
  calendar_id?: string | null;
  sync_enabled?: boolean;
  last_sync?: string | null;
  drive_folder_id?: string | null;
  token_expiry?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

interface GoogleIntegrationCardProps {
  integration?: GoogleIntegration;
  onConnect: () => void;
  onDisconnect: (id: number) => void;
  onToggleSync: (id: number, enabled: boolean) => void;
}

export default function GoogleIntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onToggleSync,
}: GoogleIntegrationCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(integration?.sync_enabled || false);

  const hasCalendar = integration?.tipo === 'calendar' || integration?.tipo === 'both';
  const hasDrive = integration?.tipo === 'drive' || integration?.tipo === 'both';

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'active':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            <Check className="w-3 h-3 mr-1" />
            Activo
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
        );
      case 'revoked':
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
            <X className="w-3 h-3 mr-1" />
            {estado === 'revoked' ? 'Revocado' : 'Error'}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    setIsDeleting(true);
    try {
      await onDisconnect(integration.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    if (!integration) return;

    setSyncEnabled(enabled);
    try {
      await onToggleSync(integration.id, enabled);
      toast.success(
        enabled
          ? 'Sincronización automática activada'
          : 'Sincronización automática desactivada'
      );
    } catch (error) {
      setSyncEnabled(!enabled);
      toast.error('Error al cambiar configuración');
    }
  };

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" />
                Google Calendar & Drive
              </CardTitle>
              <CardDescription className="mt-2">
                Conecta tu cuenta de Google para sincronizar eventos de calendar y subir archivos a
                Drive
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Google Calendar</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sincroniza servicios técnicos, alertas y mantenimientos con tu calendario
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Google Drive</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Almacena fotos, documentos y archivos de servicios de forma segura
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={onConnect} className="w-full">
              <Cloud className="w-4 h-4 mr-2" />
              Conectar con Google
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">Google Calendar & Drive</CardTitle>
              <CardDescription className="text-xs">Conectado el {new Date(integration.created_at).toLocaleDateString('es-AR')}</CardDescription>
            </div>
          </div>
          {getEstadoBadge(integration.estado)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Services Connected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {hasCalendar && (
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50/50">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">Google Calendar</h4>
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {integration.calendar_id || 'Calendario principal'}
                </p>
                {integration.last_sync && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Última sync:{' '}
                    {new Date(integration.last_sync).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
          {hasDrive && (
            <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50/50">
              <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-sm">Google Drive</h4>
                <p className="text-xs text-muted-foreground mt-1">Carpeta: Gestie - Documentos</p>
                {integration.drive_folder_id && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs mt-1"
                    onClick={() =>
                      window.open(
                        `https://drive.google.com/drive/folders/${integration.drive_folder_id}`,
                        '_blank'
                      )
                    }
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir en Drive
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sync Toggle */}
        {hasCalendar && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="sync-toggle" className="text-sm font-medium">
                Sincronización automática
              </Label>
              <p className="text-xs text-muted-foreground">
                Sincronizar eventos automáticamente al crear o modificar
              </p>
            </div>
            <Switch
              id="sync-toggle"
              checked={syncEnabled}
              onCheckedChange={handleToggleSync}
              disabled={integration.estado !== 'active'}
            />
          </div>
        )}

        {/* Error Message */}
        {integration.error_message && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-red-900">Error de sincronización</p>
              <p className="text-xs text-red-700 mt-1 break-words">
                {integration.error_message}
              </p>
            </div>
          </div>
        )}

        {/* Token Expiry Warning */}
        {integration.token_expiry &&
          new Date(integration.token_expiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium text-yellow-900">Token próximo a expirar</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Expira el {new Date(integration.token_expiry).toLocaleDateString('es-AR')}. Reconecta
                  para renovar.
                </p>
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {integration.estado !== 'active' && (
            <Button onClick={onConnect} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconectar
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1" disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desconectar Google?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todas las sincronizaciones y no podrás subir archivos a Drive hasta que
                  vuelvas a conectar.
                  {hasCalendar &&
                    ' Los eventos ya creados en Google Calendar NO se eliminarán.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>Desconectar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
