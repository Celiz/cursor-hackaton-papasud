"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Server, Shield, Zap, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
};

export default function EmailConfigClient() {
  const { data, error, isLoading, mutate } = useSWR('/api/email/smtp-config', fetcher);

  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_name: '',
    from_email: '',
    emails_per_hour: 100,
    emails_per_day: 500,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || 587,
        smtp_user: data.smtp_user || '',
        smtp_pass: data.smtp_pass || '',
        from_name: data.from_name || '',
        from_email: data.from_email || '',
        emails_per_hour: data.emails_per_hour || 100,
        emails_per_day: data.emails_per_day || 500,
      });
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/email/smtp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('Configuración SMTP guardada');
      mutate();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email/smtp-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: form.smtp_host,
          smtp_port: form.smtp_port,
          smtp_user: form.smtp_user,
          smtp_pass: form.smtp_pass === '••••••••' ? '' : form.smtp_pass,
        }),
      });
      const result = await res.json();
      setTestResult(result);
      if (result.success) {
        toast.success('Conexión SMTP exitosa');
      } else {
        toast.error(result.error || 'Error de conexión');
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
      toast.error('Error al probar conexión');
    } finally {
      setTesting(false);
    }
  };

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Configuración de Email</h1>
            <p className="text-sm text-muted-foreground">
              Configurá el servidor SMTP para el envío de campañas y emails transaccionales
            </p>
          </div>
        </div>

        {/* SMTP Server */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Servidor SMTP</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host</Label>
              <Input
                placeholder="smtp.hostinger.com"
                value={form.smtp_host}
                onChange={(e) => updateField('smtp_host', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Puerto</Label>
              <Input
                type="number"
                placeholder="587"
                value={form.smtp_port}
                onChange={(e) => updateField('smtp_port', parseInt(e.target.value) || 587)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input
                placeholder="noreply@tuempresa.com"
                value={form.smtp_user}
                onChange={(e) => updateField('smtp_user', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={form.smtp_pass}
                onChange={(e) => updateField('smtp_pass', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Sender Identity */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Identidad del Remitente</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre del remitente</Label>
              <Input
                placeholder="Mi Empresa"
                value={form.from_name}
                onChange={(e) => updateField('from_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email del remitente</Label>
              <Input
                placeholder="noreply@tuempresa.com"
                value={form.from_email}
                onChange={(e) => updateField('from_email', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Rate Limits */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Límites de Envío</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configurá los límites para respetar las políticas de tu proveedor SMTP y evitar bloqueos.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Emails por hora</Label>
              <Input
                type="number"
                value={form.emails_per_hour}
                onChange={(e) => updateField('emails_per_hour', parseInt(e.target.value) || 100)}
              />
            </div>
            <div className="space-y-2">
              <Label>Emails por día</Label>
              <Input
                type="number"
                value={form.emails_per_day}
                onChange={(e) => updateField('emails_per_day', parseInt(e.target.value) || 500)}
              />
            </div>
          </div>
        </Card>

        {/* Test Result */}
        {testResult && (
          <Card className={`p-4 flex items-center gap-3 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {testResult.success ? 'Conexión exitosa' : 'Error de conexión'}
              </p>
              {testResult.error && (
                <p className="text-xs text-red-600 mt-1">{testResult.error}</p>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            onClick={handleSave}
            disabled={saving || !form.smtp_host || !form.smtp_user}
            iconLeft={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
          <Button
            type="secondary"
            onClick={handleTest}
            disabled={testing || !form.smtp_host || !form.smtp_user || !form.smtp_pass || form.smtp_pass === '••••••••'}
            iconLeft={testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
          >
            {testing ? 'Probando...' : 'Probar Conexión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
