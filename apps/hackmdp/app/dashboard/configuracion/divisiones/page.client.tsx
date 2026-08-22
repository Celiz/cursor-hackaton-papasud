"use client";

import { CatalogManager } from "@/components/core-ui/CatalogManager";
import { DIVISION_COLORES, etiquetaDeDivision } from "@/lib/division-colores";

/**
 * ABM de divisiones de cliente.
 *
 * Antes las divisiones eran dos opciones escritas a mano en el código
 * ('humanos' | 'veterinaria') + un CHECK en la base, así que agregar una era
 * imposible sin deployar. Ahora salen de la tabla cliente_divisiones.
 *
 * El color es una CLAVE, no un color libre: las clases de Tailwind tienen que
 * estar escritas literales en el código o el build las borra. Las opciones son
 * las de DIVISION_COLORES.
 */
export default function DivisionesPageClient() {
  return (
    <CatalogManager
      title="Divisiones de clientes"
      description="Las divisiones que se pueden elegir en un cliente. Definen el color del encabezado de presupuestos y PDFs."
      apiEndpoint="/api/divisiones"
      fields={[
        { name: "nombre", label: "Nombre", type: "text", required: true, format: (v: string) => etiquetaDeDivision(v) },
        {
          name: "color",
          label: "Color",
          type: "select",
          options: Object.entries(DIVISION_COLORES).map(([value, c]) => ({
            value,
            label: c.label,
          })),
        },
        { name: "orden", label: "Orden", type: "number" },
      ]}
    />
  );
}
