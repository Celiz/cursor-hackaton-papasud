"use client";

import * as React from "react";
import useSWR from "swr";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Mail, Phone, MapPin } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al cargar datos");
  return res.json();
};

interface Laboratorio {
  id: string;
  nombre: string;
  codigo?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  razon_social_id?: string;
  razon_social_nombre?: string;
  razon_social_cuit?: string;
  contacto_principal?: {
    id: string;
    nombre_completo: string;
    email: string[];
    telefono: string[];
    cargo: string;
  };
}

interface Contacto {
  id: string;
  nombre_completo: string;
  email: string[];
  telefono: string[];
  cargo?: string;
  rol?: string;
  es_principal?: boolean;
}

interface LaboratorioContactoSelectProps {
  // Laboratorio
  laboratorioId?: string;
  onLaboratorioChange: (id: string, laboratorio?: Laboratorio) => void;

  // Contacto (opcional)
  contactoId?: string;
  onContactoChange?: (id: string, contacto?: Contacto) => void;

  // Filtros
  razonSocialId?: string; // Filtrar laboratorios por razón social

  // UI
  showContactoSelect?: boolean;
  showLaboratorioDetails?: boolean;
  laboratorioLabel?: string;
  contactoLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Componente combinado para seleccionar Laboratorio y opcionalmente un Contacto
 *
 * Uso:
 * <LaboratorioContactoSelect
 *   laboratorioId={laboratorioId}
 *   onLaboratorioChange={(id, lab) => setLaboratorioId(id)}
 *   showContactoSelect
 *   contactoId={contactoId}
 *   onContactoChange={(id, contacto) => setContactoId(id)}
 * />
 */
export function LaboratorioContactoSelect({
  laboratorioId,
  onLaboratorioChange,
  contactoId,
  onContactoChange,
  razonSocialId,
  showContactoSelect = false,
  showLaboratorioDetails = true,
  laboratorioLabel = "Laboratorio",
  contactoLabel = "Contacto",
  disabled = false,
  className,
}: LaboratorioContactoSelectProps) {
  // Cargar laboratorios
  const labUrl = razonSocialId
    ? `/api/laboratorios?razon_social_id=${razonSocialId}`
    : "/api/laboratorios";

  const { data: laboratorios = [] } = useSWR<Laboratorio[]>(labUrl, fetcher);

  // Cargar contactos del laboratorio seleccionado
  const { data: contactos = [] } = useSWR<Contacto[]>(
    laboratorioId ? `/api/laboratorios/${laboratorioId}/contactos` : null,
    fetcher
  );

  // Laboratorio seleccionado
  const selectedLab = React.useMemo(
    () => laboratorios.find((l) => l.id === laboratorioId),
    [laboratorios, laboratorioId]
  );

  // Contacto seleccionado
  const selectedContacto = React.useMemo(
    () => contactos.find((c) => c.id === contactoId),
    [contactos, contactoId]
  );

  // Opciones para el combobox de laboratorios
  const laboratorioOptions: ComboboxOption[] = React.useMemo(
    () =>
      laboratorios.map((lab) => ({
        value: lab.id,
        label: lab.nombre,
        badge: lab.codigo || undefined,
        secondaryLabel: lab.razon_social_nombre
          ? `${lab.razon_social_nombre}${lab.localidad ? ` • ${lab.localidad}` : ""}`
          : lab.localidad || undefined,
        data: lab,
      })),
    [laboratorios]
  );

  // Opciones para el combobox de contactos
  const contactoOptions: ComboboxOption[] = React.useMemo(
    () =>
      contactos.map((c) => ({
        value: c.id,
        label: c.nombre_completo,
        badge: c.es_principal ? "Principal" : undefined,
        secondaryLabel: c.rol || c.cargo || undefined,
        data: c,
      })),
    [contactos]
  );

  // Handler para cambio de laboratorio
  const handleLaboratorioChange = (id: string) => {
    const lab = laboratorios.find((l) => l.id === id);
    onLaboratorioChange(id, lab);

    // Limpiar contacto si cambia el laboratorio
    if (onContactoChange && contactoId) {
      onContactoChange("", undefined);
    }
  };

  // Handler para cambio de contacto
  const handleContactoChange = (id: string) => {
    const contacto = contactos.find((c) => c.id === id);
    onContactoChange?.(id, contacto);
  };

  return (
    <div className={className}>
      {/* Selector de Laboratorio */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          {laboratorioLabel}
        </Label>
        <SearchableCombobox
          value={laboratorioId || ""}
          onValueChange={handleLaboratorioChange}
          preloadedOptions={laboratorioOptions}
          placeholder="Seleccionar laboratorio..."
          emptyMessage="No se encontraron laboratorios"
          disabled={disabled}
        />
      </div>

      {/* Detalles del laboratorio seleccionado */}
      {showLaboratorioDetails && selectedLab && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
          {selectedLab.razon_social_nombre && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                Razón Social
              </Badge>
              <span className="font-medium">{selectedLab.razon_social_nombre}</span>
              {selectedLab.razon_social_cuit && (
                <span className="text-muted-foreground">
                  CUIT: {selectedLab.razon_social_cuit}
                </span>
              )}
            </div>
          )}

          {(selectedLab.direccion || selectedLab.localidad) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>
                {[selectedLab.direccion, selectedLab.localidad, selectedLab.provincia]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}

          {selectedLab.contacto_principal && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {selectedLab.contacto_principal.nombre_completo}
              </span>
              {selectedLab.contacto_principal.cargo && (
                <Badge variant="secondary" className="text-xs">
                  {selectedLab.contacto_principal.cargo}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Selector de Contacto */}
      {showContactoSelect && laboratorioId && (
        <div className="mt-4 space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {contactoLabel}
          </Label>
          <SearchableCombobox
            value={contactoId || ""}
            onValueChange={handleContactoChange}
            preloadedOptions={contactoOptions}
            placeholder="Seleccionar contacto..."
            emptyMessage={
              contactos.length === 0
                ? "Este laboratorio no tiene contactos registrados"
                : "No se encontraron contactos"
            }
            disabled={disabled || !laboratorioId}
          />
        </div>
      )}

      {/* Detalles del contacto seleccionado */}
      {showContactoSelect && selectedContacto && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{selectedContacto.nombre_completo}</span>
            {selectedContacto.es_principal && (
              <Badge className="text-xs">Principal</Badge>
            )}
          </div>

          {selectedContacto.email && selectedContacto.email.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{selectedContacto.email.join(", ")}</span>
            </div>
          )}

          {selectedContacto.telefono && selectedContacto.telefono.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{selectedContacto.telefono.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { Laboratorio, Contacto };
