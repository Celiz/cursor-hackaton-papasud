'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cloud, ArrowLeft, ChevronRight, Smartphone, Mail, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import useSWR, { mutate } from 'swr';
import GoogleIntegrationCard from '@/components/core-ui/GoogleIntegrationCard';
import MercadoPagoIntegrationCard from '@/components/core-ui/MercadoPagoIntegrationCard';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

interface OrgSetting {
  clave: string;
  valor: string;
  categoria: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error al cargar datos');
  return Array.isArray(data) ? data : [];
};

export default function IntegracionesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch Google integrations
  const { data: integrations, error } = useSWR<GoogleIntegration[]>(
    '/api/google/integrations',
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch MP credentials
  const { data: mpSettings, mutate: mutateMp } = useSWR<OrgSetting[]>(
    '/api/org-settings?categoria=pagos',
    fetcher,
    { dedupingInterval: 60000 }
  );

  // Handle OAuth callback success/error
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Cuenta de Google conectada exitosamente');
      mutate('/api/google/integrations');
      router.replace('/dashboard/configuracion/integraciones');
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        no_code: 'No se recibió código de autorización',
        invalid_tokens: 'Tokens inválidos recibidos de Google',
        not_authenticated: 'No estás autenticado en el sistema',
        database_error: 'Error al guardar la integración',
      };
      toast.error(errorMessages[error] || `Error: ${error}`);
      router.replace('/dashboard/configuracion/integraciones');
    }
  }, [searchParams, router]);

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = `/api/auth/google?origin=${encodeURIComponent(window.location.origin)}`;
  };

  const handleDisconnect = async (id: number) => {
    try {
      const res = await fetch(`/api/google/integrations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al desconectar');

      toast.success('Integración desconectada correctamente');
      mutate('/api/google/integrations', (current: any) =>
        Array.isArray(current) ? current.filter((item: any) => item.id !== id) : current,
        { revalidate: true }
      );
    } catch (error: any) {
      toast.error(error.message || 'Error al desconectar');
    }
  };

  const handleToggleSync = async (id: number, enabled: boolean) => {
    try {
      const res = await fetch('/api/google/integrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId: id, sync_enabled: enabled }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al cambiar configuración');
      mutate('/api/google/integrations');
    } catch (error: any) {
      toast.error(error.message || 'Error al cambiar configuración');
      throw error;
    }
  };

  // MP handlers
  const mpCredentials = mpSettings
    ? Object.fromEntries(mpSettings.map(s => [s.clave, s.valor]))
    : null;

  const handleMpSave = async (creds: Record<string, string | undefined>) => {
    const items = Object.entries(creds)
      .filter(([, v]) => v && v.trim())
      .map(([clave, valor]) => ({ clave, valor: valor!, categoria: 'pagos' }));

    if (items.length === 0) return;

    const res = await fetch('/api/org-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar');
    }

    mutateMp();
  };

  const handleMpDisconnect = async () => {
    const res = await fetch('/api/org-settings?categoria=pagos', { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al desconectar');
    }
    mutateMp();
  };

  const handleMpTest = async () => {
    const res = await fetch('/api/org-settings/test-mp', { method: 'POST' });
    const data = await res.json();
    return data.ok === true;
  };

  if (error) {
    return (
      <div className="flex-1 w-full flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Integraciones</h1>
            <p className="text-sm text-muted-foreground">
              Google, Email, MercadoPago, ARCA
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Error al cargar integraciones
            </p>
            <p className="text-xs text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const googleIntegration = integrations?.find((i) => i.tipo === 'both' || i.tipo === 'calendar' || i.tipo === 'drive');

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Integraciones</h1>
          <p className="text-sm text-muted-foreground">
            Google, Email, MercadoPago, ARCA
          </p>
        </div>
      </div>

      {/* Integrations List */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <MercadoPagoIntegrationCard
          credentials={mpCredentials}
          onSave={handleMpSave}
          onDisconnect={handleMpDisconnect}
          onTest={handleMpTest}
        />

        <GoogleIntegrationCard
          integration={googleIntegration}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onToggleSync={handleToggleSync}
        />

        {/* Email link card */}
        <Link href="/dashboard/configuracion/email" className="group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", "bg-rose-100 dark:bg-rose-900/30")}>
                    <Mail className={cn("h-5 w-5", "text-rose-600")} />
                  </div>
                  <div>
                    <CardTitle className="text-base">Email</CardTitle>
                    <CardDescription>Cuentas de email, Gmail OAuth e IMAP/SMTP</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>

        {/* AFIP/ARCA link card */}
        <Link href="/dashboard/afip" className="group">
          <Card className="h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", "bg-emerald-100 dark:bg-emerald-900/30")}>
                    <Receipt className={cn("h-5 w-5", "text-emerald-600")} />
                  </div>
                  <div>
                    <CardTitle className="text-base">AFIP / ARCA</CardTitle>
                    <CardDescription>Facturación electrónica y certificados digitales</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
