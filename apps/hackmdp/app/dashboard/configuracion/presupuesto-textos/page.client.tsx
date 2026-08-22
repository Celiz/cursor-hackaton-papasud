"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";

/**
 * ABM de textos predefinidos de presupuestos.
 *
 * Son frases que el usuario inserta escribiendo "/" en los campos libres de un
 * presupuesto (descripción general, notas al cliente, comentario por equipo).
 * Molde: divisiones (CatalogManager sobre /api/presupuesto-textos).
 */
export default function PresupuestoTextosPageClient() {
  return (
    <CatalogManager
      title="Textos de presupuestos"
      description='Frases predefinidas para insertar con "/" en la descripción, las notas y los comentarios de un presupuesto.'
      apiEndpoint="/api/presupuesto-textos"
      fields={[
        { name: "titulo", label: "Título", type: "text", required: true },
        { name: "contenido", label: "Contenido", type: "textarea", required: true },
        { name: "orden", label: "Orden", type: "number" },
      ]}
    />
  );
}
