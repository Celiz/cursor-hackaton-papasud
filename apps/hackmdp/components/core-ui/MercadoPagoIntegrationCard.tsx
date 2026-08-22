'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Check,
  X,
  Eye,
  EyeOff,
  CreditCard,
  Loader2,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
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

interface MpCredentials {
  mp_access_token?: string;
  mp_public_key?: string;
  mp_client_id?: string;
  mp_client_secret?: string;
  mp_webhook_secret?: string;
}

interface MercadoPagoIntegrationCardProps {
  credentials: Record<string, string> | null;
  onSave: (credentials: Record<string, string | undefined>) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onTest: () => Promise<boolean>;
}

const MP_FIELDS = [
  { key: 'mp_access_token', label: 'Access Token', required: true, sensitive: true },
  { key: 'mp_public_key', label: 'Public Key', required: true, sensitive: false },
  { key: 'mp_client_id', label: 'Client ID', required: false, sensitive: false },
  { key: 'mp_client_secret', label: 'Client Secret', required: false, sensitive: true },
  { key: 'mp_webhook_secret', label: 'Webhook Secret', required: false, sensitive: true },
] as const;

export default function MercadoPagoIntegrationCard({
  credentials,
  onSave,
  onDisconnect,
  onTest,
}: MercadoPagoIntegrationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<MpCredentials>({
    mp_access_token: '',
    mp_public_key: '',
    mp_client_id: '',
    mp_client_secret: '',
    mp_webhook_secret: '',
  });

  const isConnected = !!credentials?.mp_access_token;

  const handleEdit = () => {
    setForm({
      mp_access_token: '',
      mp_public_key: '',
      mp_client_id: '',
      mp_client_secret: '',
      mp_webhook_secret: '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!form.mp_access_token?.trim()) {
      toast.error('Access Token es obligatorio');
      return;
    }
    if (!form.mp_public_key?.trim()) {
      toast.error('Public Key es obligatoria');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(form as Record<string, string | undefined>);
      setIsEditing(false);
      toast.success('Credenciales de Mercado Pago guardadas');
    } catch {
      toast.error('Error al guardar credenciales');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const ok = await onTest();
      if (ok) {
        toast.success('Conexión exitosa con Mercado Pago');
      } else {
        toast.error('No se pudo conectar. Verificá las credenciales.');
      }
    } catch {
      toast.error('Error al probar la conexión');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect();
      setIsEditing(false);
      toast.success('Mercado Pago desconectado');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Not connected — show setup card
  if (!isConnected && !isEditing) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-500" />
              Mercado Pago
            </CardTitle>
            <CardDescription className="mt-2">
              Recibí pagos online en tu tienda con Mercado Pago
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <CreditCard className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Pagos online</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Aceptá tarjetas de crédito, débito, transferencias y más a través de Mercado Pago
                </p>
              </div>
            </div>

            <Button onClick={handleEdit} className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Configurar Mercado Pago
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Editing form
  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">Mercado Pago</CardTitle>
                <CardDescription className="text-xs">
                  Ingresá tus credenciales de la{' '}
                  <a
                    href="https://www.mercadopago.com.ar/developers/panel/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    aplicación de MP
                  </a>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {MP_FIELDS.filter(f => f.required).map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-sm">
                {field.label} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id={field.key}
                  type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                  placeholder={field.label}
                  value={form[field.key as keyof MpCredentials] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="pr-10"
                />
                {field.sensitive && (
                  <button
                    type="button"
                    onClick={() => toggleSensitive(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSensitive[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Campos opcionales
          </button>

          {showAdvanced && MP_FIELDS.filter(f => !f.required).map(field => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-sm text-muted-foreground">
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  id={field.key}
                  type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                  placeholder={field.label}
                  value={form[field.key as keyof MpCredentials] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="pr-10"
                />
                {field.sensitive && (
                  <button
                    type="button"
                    onClick={() => toggleSensitive(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSensitive[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

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
    );
  }

  // Connected state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Mercado Pago</CardTitle>
              <CardDescription className="text-xs">Pagos online configurados</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            <Check className="w-3 h-3 mr-1" />
            Activo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {credentials?.mp_access_token && (
            <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
              <span className="text-muted-foreground">Access Token</span>
              <code className="text-xs font-mono">{credentials.mp_access_token}</code>
            </div>
          )}
          {credentials?.mp_public_key && (
            <div className="flex items-center justify-between p-3 border rounded-lg text-sm">
              <span className="text-muted-foreground">Public Key</span>
              <code className="text-xs font-mono">{credentials.mp_public_key}</code>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleTest} disabled={isTesting} className="flex-1">
            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Probar conexión
          </Button>

          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" disabled={isDisconnecting}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Desconectar Mercado Pago?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán las credenciales guardadas. Los pagos dejarán de funcionar hasta que
                  vuelvas a configurar la integración.
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
