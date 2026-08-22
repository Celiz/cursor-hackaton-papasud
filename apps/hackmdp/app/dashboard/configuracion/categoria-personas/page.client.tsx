"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";

export default function CategoriaPersonasPageClient() {
  return (
    <CatalogManager
      title="Categorías de Personas"
      description="Gestiona las categorías de contactos para segmentación de campañas de email"
      apiEndpoint="/api/categoria-personas"
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true },
        { name: "descripcion", label: "Descripción", type: "textarea" },
        { name: "color", label: "Color", type: "color" },
        { name: "orden", label: "Orden", type: "number", required: true },
      ]}
    />
  );
}
