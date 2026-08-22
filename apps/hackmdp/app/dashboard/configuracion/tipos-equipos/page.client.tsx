"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";

export default function TiposEquiposPageClient() {
  return (
    <CatalogManager
      title="Tipos de Equipos"
      description="Gestiona el catálogo de tipos de equipos disponibles en el sistema"
      apiEndpoint="/api/tipos-equipos"
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        { name: "codigo", label: "Código", type: "text", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "icono", label: "Icono (Lucide)", type: "text" },
        { name: "vida_util_meses", label: "Vida Útil (meses)", type: "number" },
        { name: "orden", label: "Orden", type: "number", required: true },
      ]}
    />
  );
}
