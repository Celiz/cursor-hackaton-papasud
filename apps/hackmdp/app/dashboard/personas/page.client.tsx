"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { GenericDataTable } from "@/components/core-ui/GenericDataTable";
import { columns } from "./columns";
import { Persona, PersonaFormData } from "@/lib/types/personas";
import { PersonaDetailSheet } from "@/components/core-ui/PersonaDetailSheet";
import { CreatePersonaDialog } from "@/components/core-ui/CreatePersonaDialog";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import { FiltrosSidebar, useFiltros } from '@/components/core-ui/filtros/FiltrosSidebar';
import type { FiltroDef } from '@/lib/filtros';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Error al cargar datos");
  }
  return Array.isArray(data) ? data : [];
};

export default function PersonasPageClient() {
  const { hasPermission } = useUserPermissions();
  const canEditContactos = hasPermission('personas', 'editar');
  const searchParams = useSearchParams();
  const router = useRouter();
  const previousIdRef = useRef<string | null>(null);

  // Si venimos del detalle de un cliente ("Ver todos"), filtramos la lista a
  // los contactos de ese cliente en vez de mostrar TODOS los de la org.
  const razonSocialId = searchParams.get("razon_social_id");
  const { data, error, isLoading, mutate } = useSWR<Persona[]>(
    razonSocialId ? `/api/personas?razon_social_id=${razonSocialId}` : "/api/personas",
    fetcher
  );
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isNewSheetOpen, setIsNewSheetOpen] = useState(false);
  const [defaultLaboratorioId, setDefaultLaboratorioId] = useState<string | undefined>(undefined);
  const [defaultClienteId, setDefaultClienteId] = useState<string | undefined>(undefined);

  // Handle URL params for action=new or id=xxx
  useEffect(() => {
    const action = searchParams.get("action");
    const laboratorioId = searchParams.get("laboratorio_id");
    const personaId = searchParams.get("id");

    if (action === "new") {
      setDefaultLaboratorioId(laboratorioId || undefined);
      // "Agregar contacto" desde un cliente: pre-vincula el nuevo contacto a ese cliente.
      setDefaultClienteId(searchParams.get("razon_social_id") || undefined);
      setIsNewSheetOpen(true);
      // Clean URL params after opening dialog
      router.replace("?", { scroll: false });
    } else if (personaId && personaId !== previousIdRef.current && data && data.length > 0) {
      // Open detail sheet from URL
      const persona = data.find(p => p.id === personaId);
      if (persona) {
        setSelectedPersona(persona);
        setIsSheetOpen(true);
        previousIdRef.current = personaId;
      }
    } else if (!personaId && previousIdRef.current) {
      previousIdRef.current = null;
    }
  }, [searchParams, router, data]);

  const contactoDefs = useMemo<FiltroDef<any>[]>(() => [
    { id: 'tipo', label: 'Tipo', tipo: 'multi', get: (p) => p.tipo_persona },
    { id: 'categoria', label: 'Categoría', tipo: 'multi', get: (p) => p.categoria?.nombre },
    { id: 'provincia', label: 'Provincia', tipo: 'multi', buscable: true, get: (p) => p.provincia },
    { id: 'localidad', label: 'Localidad', tipo: 'multi', buscable: true, get: (p) => p.ciudad },
    { id: 'empresa', label: 'Empresa', tipo: 'multi', buscable: true, get: (p) => p.cliente_nombre },
    { id: 'activo', label: 'Activo', tipo: 'bool', get: (p) => p.activo },
    { id: 'tags', label: 'Tags', tipo: 'multi', getLista: (p) => (Array.isArray(p.tags) ? p.tags.map((t: any) => t?.nombre) : []) },
  ], []);
  const f = useFiltros<any>(data || [], contactoDefs);

  // Preservamos el filtro por cliente al abrir/cerrar el detalle para no perderlo.
  const filtroQS = razonSocialId ? `razon_social_id=${razonSocialId}` : "";

  const handleRowClick = (persona: Persona) => {
    setSelectedPersona(persona);
    setIsSheetOpen(true);
    // Update URL when opening detail
    router.push(`?${filtroQS ? `${filtroQS}&` : ""}id=${persona.id}`, { scroll: false });
  };

  const handleCloseSheet = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setSelectedPersona(null);
      // Clear URL when closing (manteniendo el filtro por cliente si venía)
      router.replace(`?${filtroQS}`, { scroll: false });
      previousIdRef.current = null;
    }
  };

  const handlePersonaUpdated = () => {
    mutate();
  };

  const handleNew = () => {
    setDefaultLaboratorioId(undefined); // Clear any previous default
    setDefaultClienteId(undefined);
    setIsNewSheetOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsNewSheetOpen(open);
    if (!open) {
      setDefaultLaboratorioId(undefined); // Clear default when closing
      setDefaultClienteId(undefined);
    }
  };

  const handleSaveNew = async (formData: PersonaFormData) => {
    // El laboratorio_id (virtual) viaja dentro de formData y lo gestiona el API.
    const res = await fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Error al crear contacto");
    }
    mutate();
  };

  const handleExportExcel = () => {
    console.log("Exportar a Excel");
  };

  const handleExportPDF = () => {
    console.log("Exportar a PDF");
  };

  const handleExportCSV = () => {
    console.log("Exportar a CSV");
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Error al cargar contactos
          </h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 w-full flex gap-3 p-6 min-h-0">
        <FiltrosSidebar data={data || []} defs={contactoDefs} estado={f.estado} setFiltro={f.setFiltro} limpiar={f.limpiar} activos={f.activos} />
        <div className="flex-1 min-w-0 flex flex-col gap-4">
        <GenericDataTable
          columns={columns}
          data={f.filtered}
          isLoading={isLoading}
          pageTitle="Contactos"
          pageDescription="Gestiona los contactos de empresas y laboratorios"
          onRowClick={handleRowClick}
          enableGlobalSearch={true}
          searchPlaceholder="Buscar por nombre, DNI, email, cargo..."
          enableAutoFilters={false}
          onNew={canEditContactos ? handleNew : undefined}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
        />
        </div>
      </div>

      {selectedPersona && (
        <PersonaDetailSheet
          open={isSheetOpen}
          onOpenChange={handleCloseSheet}
          persona={selectedPersona}
          onPersonaUpdated={handlePersonaUpdated}
        />
      )}

      <CreatePersonaDialog
        open={isNewSheetOpen}
        onOpenChange={handleDialogClose}
        onSave={handleSaveNew}
        defaultLaboratorioId={defaultLaboratorioId}
        defaultClienteId={defaultClienteId}
      />
    </>
  );
}
