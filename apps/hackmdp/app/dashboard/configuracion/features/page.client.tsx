"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Truck,
  Mail,
  Save,
  Loader2,
  Check,
  Layers,
  Plus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrgFeatures } from "@/lib/hooks/use-org-features";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import type { OrgFeatures } from "@studio/erp-core/organizations";

export default function FeaturesPageClient() {
  const { features, isLoading, mutate } = useOrgFeatures();
  const { isAdmin } = useUserPermissions();
  const [formData, setFormData] = useState<OrgFeatures | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // New transportista input
  const [newTransportista, setNewTransportista] = useState("");
  // New footer link inputs
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  useEffect(() => {
    if (features && !formData) {
      setFormData(features);
    }
  }, [features, formData]);

  useEffect(() => {
    if (features && formData) {
      setHasChanges(JSON.stringify(features) !== JSON.stringify(formData));
    }
  }, [formData, features]);

  const updateEntregas = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, entregas: { ...prev.entregas, [field]: value } };
    });
  };

  const updateEmail = (field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, email: { ...prev.email, [field]: value } };
    });
  };

  const addTransportista = () => {
    const val = newTransportista.trim().toLowerCase().replace(/\s+/g, "_");
    if (!val || !formData) return;
    if (formData.entregas.transportistas.includes(val)) {
      toast.error("Ya existe ese transportista");
      return;
    }
    updateEntregas("transportistas", [...formData.entregas.transportistas, val]);
    setNewTransportista("");
  };

  const removeTransportista = (t: string) => {
    if (!formData) return;
    updateEntregas(
      "transportistas",
      formData.entregas.transportistas.filter((x) => x !== t)
    );
  };

  const addFooterLink = () => {
    const label = newLinkLabel.trim();
    const url = newLinkUrl.trim();
    if (!label || !url || !formData) return;
    updateEmail("footerLinks", [...formData.email.footerLinks, { label, url }]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const removeFooterLink = (index: number) => {
    if (!formData) return;
    updateEmail(
      "footerLinks",
      formData.email.footerLinks.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    if (!formData) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/org-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entregas: formData.entregas,
          email: formData.email,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      setSaved(true);
      setHasChanges(false);
      toast.success("Features guardadas");
      mutate();

      setTimeout(() => setSaved(false), 2000);
    } catch (error: any) {
      toast.error(error.message || "Error al guardar features");
    } finally {
      setSaving(false);
    }
  };

  // Admin guard
  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Sin Permisos</h2>
          <p className="text-muted-foreground">
            Solo administradores pueden configurar features.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const transportistaLabel = (t: string) => {
    const labels: Record<string, string> = {
      andreani: "Andreani",
      correo_argentino: "Correo Argentino",
      otro: "Otro",
    };
    return labels[t] || t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Layers className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Features de Organización
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configura el comportamiento de entregas, tracking y emails
            </p>
          </div>
        </div>

        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg",
              saved
                ? "bg-green-500 text-white shadow-green-500/25"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Guardado
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Entregas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Entregas</CardTitle>
              <CardDescription>Tracking, despacho y transportistas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* trackingEnabled */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Tracking de envíos</Label>
              <p className="text-xs text-muted-foreground">
                Muestra UI de tracking al despachar pedidos
              </p>
            </div>
            <Switch
              checked={formData.entregas.trackingEnabled}
              onCheckedChange={(v) => updateEntregas("trackingEnabled", v)}
            />
          </div>

          {/* autoEmailOnDespacho */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Email automático al despachar</Label>
              <p className="text-xs text-muted-foreground">
                Envía email de tracking al cliente cuando se despacha
              </p>
            </div>
            <Switch
              checked={formData.entregas.autoEmailOnDespacho}
              onCheckedChange={(v) => updateEntregas("autoEmailOnDespacho", v)}
            />
          </div>

          {/* transportistaSelector */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Selector de transportista</Label>
              <p className="text-xs text-muted-foreground">
                Muestra dropdown para elegir transportista al despachar
              </p>
            </div>
            <Switch
              checked={formData.entregas.transportistaSelector}
              onCheckedChange={(v) => updateEntregas("transportistaSelector", v)}
            />
          </div>

          {/* transportistas */}
          <div className="space-y-2">
            <Label className="font-medium">Transportistas disponibles</Label>
            <div className="flex flex-wrap gap-2">
              {formData.entregas.transportistas.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="gap-1 pr-1 text-sm"
                >
                  {transportistaLabel(t)}
                  <button
                    onClick={() => removeTransportista(t)}
                    className="ml-1 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nuevo transportista..."
                value={newTransportista}
                onChange={(e) => setNewTransportista(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTransportista())}
                className="max-w-xs"
              />
              <Button
                type="outline"
                size="small"
                onClick={addTransportista}
                disabled={!newTransportista.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email / Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/30">
              <Mail className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <CardTitle>Email & Branding</CardTitle>
              <CardDescription>
                Personalización de emails de tracking enviados a clientes
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* enabled */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Emails habilitados</Label>
              <p className="text-xs text-muted-foreground">
                Permite enviar emails de tracking a clientes
              </p>
            </div>
            <Switch
              checked={formData.email.enabled}
              onCheckedChange={(v) => updateEmail("enabled", v)}
            />
          </div>

          {/* brandName */}
          <div className="space-y-1">
            <Label className="font-medium">Nombre de marca</Label>
            <p className="text-xs text-muted-foreground">
              Aparece en el header del email y como remitente
            </p>
            <Input
              value={formData.email.brandName}
              onChange={(e) => updateEmail("brandName", e.target.value)}
              placeholder="Ej: Papasud"
              className="max-w-sm"
            />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="space-y-1">
              <Label className="font-medium">Color principal</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0"
                  style={{ backgroundColor: formData.email.brandColor }}
                />
                <Input
                  value={formData.email.brandColor}
                  onChange={(e) => updateEmail("brandColor", e.target.value)}
                  placeholder="#dc2626"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-medium">Fondo email</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0"
                  style={{ backgroundColor: formData.email.brandBgColor }}
                />
                <Input
                  value={formData.email.brandBgColor}
                  onChange={(e) => updateEmail("brandBgColor", e.target.value)}
                  placeholder="#0a0a0a"
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* footerText */}
          <div className="space-y-1">
            <Label className="font-medium">Texto del footer</Label>
            <Input
              value={formData.email.footerText}
              onChange={(e) => updateEmail("footerText", e.target.value)}
              placeholder="Ej: Genética de calidad desde la costa argentina"
              className="max-w-lg"
            />
          </div>

          {/* footerLinks */}
          <div className="space-y-2">
            <Label className="font-medium">Links del footer</Label>
            {formData.email.footerLinks.length > 0 && (
              <div className="space-y-2">
                {formData.email.footerLinks.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium min-w-[80px]">{link.label}</span>
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {link.url}
                    </span>
                    <button
                      onClick={() => removeFooterLink(i)}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Label"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
                className="max-w-[120px]"
              />
              <Input
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFooterLink())}
                className="flex-1"
              />
              <Button
                type="outline"
                size="small"
                onClick={addFooterLink}
                disabled={!newLinkLabel.trim() || !newLinkUrl.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
