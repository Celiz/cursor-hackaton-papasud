"use client";

import { useState, useEffect, useMemo } from "react";
import { useSWRConfig } from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";
import { CiudadCombobox } from "./CiudadCombobox";
import { toast } from "sonner";

interface CreateContactoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se pasa, el contacto se crea fijo a ese cliente y se oculta el selector. */
  empresaIdFijo?: string;
  /** Callback opcional tras crear (además del refresh automático de la lista). */
  onCreated?: () => void;
}

interface ClienteRow {
  id: string;
  nombre?: string | null;
  nombre_fantasia?: string | null;
  cuit?: string | null;
  localidad?: string | null;
}

export function CreateContactoDialog({
  open,
  onOpenChange,
  empresaIdFijo,
  onCreated,
}: CreateContactoDialogProps) {
  const { mutate } = useSWRConfig();

  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [empresaId, setEmpresaId] = useState<string>(empresaIdFijo || "");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [dni, setDni] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset al abrir/cerrar.
  useEffect(() => {
    if (open) {
      setEmpresaId(empresaIdFijo || "");
      setNombre("");
      setApellido("");
      setCargo("");
      setEmail("");
      setTelefono("");
      setNotas("");
    }
  }, [open, empresaIdFijo]);

  // Cargar clientes principales al abrir (mismo patrón que OportunidadFormDialog).
  useEffect(() => {
    if (!open || empresaIdFijo) return;
    fetch("/api/clientes?view=principal")
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => setClientes([]));
  }, [open, empresaIdFijo]);

  const clientesOptions: ComboboxOption[] = useMemo(
    () =>
      clientes.map((c) => {
        const partes: string[] = [];
        if (c.nombre_fantasia && c.nombre_fantasia !== c.nombre) partes.push(c.nombre_fantasia);
        if (c.cuit) partes.push(`CUIT ${c.cuit}`);
        if (c.localidad) partes.push(c.localidad);
        return {
          value: c.id,
          label: c.nombre || "Sin nombre",
          secondaryLabel: partes.join(" • ") || undefined,
        };
      }),
    [clientes]
  );

  const handleSubmit = async () => {
    if (!empresaId) {
      toast.error("Elegí un cliente");
      return;
    }
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      // Serializa varios emails/teléfonos (separados por coma) al formato TEXT de
      // personas (literal PG `{...}`), que parseContactList sabe leer. Uno solo → string plano.
      const toPersonaText = (s: string): string | null => {
        const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
        if (parts.length === 0) return null;
        if (parts.length === 1) return parts[0];
        return `{${parts.map((p) => `"${p}"`).join(",")}}`;
      };
      const nombreCompleto = `${nombre.trim()} ${apellido.trim()}`.trim();
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim() || null,
          nombre_completo: nombreCompleto,
          cargo: cargo.trim() || null,
          email: toPersonaText(email),
          telefono: toPersonaText(telefono),
          notas: notas.trim() || null,
          direccion: direccion.trim() || null,
          ciudad: ciudad.trim() || null,
          provincia: provincia.trim() || null,
          codigo_postal: codigoPostal.trim() || null,
          dni: dni.trim() || null,
          // Crea el vínculo persona↔empresa (personas_clientes) en el mismo POST.
          cliente_id: empresaId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al crear contacto");

      toast.success("Contacto creado correctamente");
      // Refresca las listas montadas sobre /api/personas (lista unificada de Contactos).
      mutate("/api/personas");
      onCreated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error al crear contacto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
          <DialogDescription>
            Una persona de contacto dentro de un cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!empresaIdFijo && (
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <SearchableCombobox
                value={empresaId}
                onValueChange={(v) => setEmpresaId(v)}
                preloadedOptions={clientesOptions}
                enableLocalSearch
                placeholder="Buscar cliente..."
                emptyMessage="No se encontraron clientes"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido</Label>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej: Compras, Gerencia..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="separar con coma" />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="separar con coma" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, piso..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <CiudadCombobox
                value={ciudad}
                onChange={setCiudad}
                onSelect={(loc, prov) => { setCiudad(loc); setProvincia(prov); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provincia</Label>
              <Input
                value={provincia}
                onChange={(e) => setProvincia(e.target.value.toUpperCase())}
                placeholder="(se completa con la ciudad)"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código postal</Label>
              <Input value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>DNI / CUIT</Label>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creando..." : "Crear contacto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
