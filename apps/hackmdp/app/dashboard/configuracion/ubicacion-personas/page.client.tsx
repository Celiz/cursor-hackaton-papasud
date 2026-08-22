"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";

export default function UbicacionPersonasPageClient() {
  return (
    <CatalogManager
      title="Ubicaciones de Personas"
      description="Gestiona los tipos de edificio o ubicación donde se encuentran los contactos"
      apiEndpoint="/api/ubicacion-personas"
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "icono", label: "Icono (Lucide)", type: "text" },
        { name: "orden", label: "Orden", type: "number", required: true },
      ]}
    />
  );
}
