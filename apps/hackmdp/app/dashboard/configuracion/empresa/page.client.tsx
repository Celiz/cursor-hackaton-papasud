'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Building2, ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface OrgData {
  id: string;
  nombre: string;
  nombre_fantasia: string | null;
  tipo: string;
  empresa: {
    razon_social: string;
    cuit: string;
    direccion: string;
    telefono: string;
    email_contacto: string;
    sitio_web: string;
  };
}

interface FormData {
  nombre: string;
  nombre_fantasia: string;
  razon_social: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email_contacto: string;
  sitio_web: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al cargar');
  return res.json();
};

function orgToForm(org: OrgData): FormData {
  return {
    nombre: org.nombre || '',
    nombre_fantasia: org.nombre_fantasia || '',
    razon_social: org.empresa.razon_social || '',
    cuit: org.empresa.cuit || '',
    direccion: org.empresa.direccion || '',
    telefono: org.empresa.telefono || '',
    email_contacto: org.empresa.email_contacto || '',
    sitio_web: org.empresa.sitio_web || '',
  };
}

export default function EmpresaPageClient() {
  const { data: org, error, mutate } = useSWR<OrgData>('/api/organizacion', fetcher);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (org) {
      setFormData(orgToForm(org));
      setHasChanges(false);
    }
  }, [org]);

  useEffect(() => {
    if (org && formData) {
      const original = orgToForm(org);
      setHasChanges(JSON.stringify(original) !== JSON.stringify(formData));
    }
  }, [formData, org]);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!formData || !org) return;
    setSaving(true);

    try {
      const original = orgToForm(org);
      const payload: Record<string, unknown> = {};

      if (formData.nombre !== original.nombre) {
        payload.nombre = formData.nombre;
      }
      if (formData.nombre_fantasia !== original.nombre_fantasia) {
        payload.nombre_fantasia = formData.nombre_fantasia;
      }

      const empresaChanges: Record<string, string> = {};
      const empresaFields = ['razon_social', 'cuit', 'direccion', 'telefono', 'email_contacto', 'sitio_web'] as const;
      for (const field of empresaFields) {
        if (formData[field] !== original[field]) {
          empresaChanges[field] = formData[field];
        }
      }
      if (Object.keys(empresaChanges).length > 0) {
        payload.empresa = empresaChanges;
      }

      const res = await fetch('/api/organizacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }

      await mutate();
      toast.success('Datos de la empresa actualizados');
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-2xl font-semibold text-foreground">Datos de la Empresa</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar los datos de la empresa</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!org || !formData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Datos de la Empresa</h1>
          <p className="text-sm text-muted-foreground">
            Información que aparece en facturas, presupuestos y documentos
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>
            Nombre comercial y datos de identificación de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la empresa</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => updateField('nombre', e.target.value)}
              placeholder="Mi Empresa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nombre_fantasia">Nombre fantasía</Label>
            <Input
              id="nombre_fantasia"
              value={formData.nombre_fantasia}
              onChange={(e) => updateField('nombre_fantasia', e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razon_social">Razón Social</Label>
            <Input
              id="razon_social"
              value={formData.razon_social}
              onChange={(e) => updateField('razon_social', e.target.value)}
              placeholder="Mi Empresa S.A."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT/CUIL</Label>
            <Input
              id="cuit"
              value={formData.cuit}
              onChange={(e) => updateField('cuit', e.target.value)}
              placeholder="20-12345678-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto y Ubicación</CardTitle>
          <CardDescription>
            Datos de contacto y dirección fiscal
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={formData.direccion}
              onChange={(e) => updateField('direccion', e.target.value)}
              placeholder="Calle 123, Ciudad, Provincia"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => updateField('telefono', e.target.value)}
              placeholder="+54 11 1234-5678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_contacto">Email de contacto</Label>
            <Input
              id="email_contacto"
              type="email"
              value={formData.email_contacto}
              onChange={(e) => updateField('email_contacto', e.target.value)}
              placeholder="contacto@miempresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sitio_web">Sitio web</Label>
            <Input
              id="sitio_web"
              value={formData.sitio_web}
              onChange={(e) => updateField('sitio_web', e.target.value)}
              placeholder="https://www.miempresa.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
