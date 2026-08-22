"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, FileText, Eye } from "lucide-react";
import useSWR from "swr";

interface UserProfile {
  id: string;
  email: string;
  nombre_completo: string | null;
  cargo: string | null;
  telefono_directo: string | null;
  firma_activa: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MiFirmaPageClient() {
  const { data: profile, error, mutate } = useSWR<UserProfile>("/api/users/me", fetcher);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: "",
    cargo: "",
    telefono_directo: "",
    firma_activa: true,
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        nombre_completo: profile.nombre_completo || "",
        cargo: profile.cargo || "",
        telefono_directo: profile.telefono_directo || "",
        firma_activa: profile.firma_activa ?? true,
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }

      await mutate();
      toast.success("Firma actualizada correctamente");
    } catch (error: any) {
      toast.error(error.message || "Error al guardar la firma");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error al cargar el perfil</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Firma</h1>
        <p className="text-muted-foreground">
          Configura los datos que aparecerán en el pie de página de los presupuestos y documentos PDF que generes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos de Firma
            </CardTitle>
            <CardDescription>
              Estos datos se mostrarán al pie de los PDFs que generes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre Completo</Label>
              <Input
                id="nombre_completo"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                placeholder="Ej: Bioq. Karen Retta"
              />
              <p className="text-xs text-muted-foreground">
                Incluye título profesional si corresponde (Lic., Ing., Bioq., etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ej: Ejecutiva de Ventas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono_directo">Teléfono Directo</Label>
              <Input
                id="telefono_directo"
                value={formData.telefono_directo}
                onChange={(e) => setFormData({ ...formData, telefono_directo: e.target.value })}
                placeholder="Ej: +549 223-5375144"
              />
              <p className="text-xs text-muted-foreground">
                Número de contacto directo que aparecerá en el PDF
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="firma_activa" className="text-sm font-medium">Mostrar firma en PDFs</Label>
                <p className="text-xs text-muted-foreground">
                  Si está desactivado, los PDFs no mostrarán tu firma
                </p>
              </div>
              <Switch
                id="firma_activa"
                checked={formData.firma_activa}
                onCheckedChange={(checked) => setFormData({ ...formData, firma_activa: checked })}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full mt-4"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Vista Previa
            </CardTitle>
            <CardDescription>
              Así se verá tu firma en los documentos PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white">
              {/* Simulación del pie de página del PDF */}
              <div className="border-t-2 border-red-600 pt-4">
                <div className="flex justify-between items-start">
                  {/* Izquierda - Nombre y cargo */}
                  <div>
                    <p className="text-red-700 font-bold text-lg uppercase tracking-wide">
                      {formData.nombre_completo || "TU NOMBRE"}
                    </p>
                    <p className="text-gray-600 italic text-sm">
                      {formData.cargo || "Tu cargo"}
                    </p>
                  </div>

                  {/* Derecha - Datos de contacto */}
                  <div className="text-right text-sm space-y-1">
                    {formData.telefono_directo && (
                      <div className="flex items-center justify-end gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
                          T
                        </span>
                        <span className="text-gray-700">{formData.telefono_directo}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
                        @
                      </span>
                      <span className="text-gray-700">{profile.email}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
                        L
                      </span>
                      <span className="text-gray-700">Chaco 801, Mar del plata</span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-xs">
                        I
                      </span>
                      <span className="text-gray-700">@papasud</span>
                    </div>
                  </div>
                </div>
              </div>

              {!formData.firma_activa && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    La firma está desactivada. Los PDFs no mostrarán este pie de página.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-purple-800 text-sm">
                <strong>Nota:</strong> El color del borde cambia según la división del cliente
                (rojo para humanos, violeta para veterinaria).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
