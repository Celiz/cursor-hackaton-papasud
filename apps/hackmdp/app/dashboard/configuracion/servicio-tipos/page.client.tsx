"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";

export default function ServicioTiposPageClient() {
  return (
    <CatalogManager
      title="Tipos de Servicios"
      description="Gestiona los tipos de servicios técnicos disponibles"
      apiEndpoint="/api/servicio-tipos"
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        { name: "codigo", label: "Código", type: "text", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "color", label: "Color", type: "color" },
        { name: "duracion_estimada_horas", label: "Duración Est. (horas)", type: "number" },
        { name: "orden", label: "Orden", type: "number", required: true },
      ]}
    />
  );
}
