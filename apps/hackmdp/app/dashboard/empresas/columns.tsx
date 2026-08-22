"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/data-table-column-header"
import { Cliente, Tag } from "@/lib/types"
import { TagBadges } from "@/components/core-ui/TagSelector"
import { Building2, Wrench, FileText } from "lucide-react"
import { getEstadoStyle } from "@/lib/estado-helpers"
import { cn } from "@/lib/utils"

// Extended type with stats from API
interface ClienteWithStats extends Cliente {
    equipos_count?: number;
    servicios_count?: number;
    facturas_count?: number;
    tags?: Tag[];
}

export const columnsClientes: ColumnDef<ClienteWithStats>[] = [
    {
        accessorKey: "identificador_unico",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Nº" />
        ),
        cell: ({ row }) => {
            const legacy = row.original.identificador_legacy;
            return (
                <div className="flex flex-col gap-0.5 font-mono text-xs">
                    <span className="text-muted-foreground">
                        {row.original.identificador_unico || "-"}
                    </span>
                    {legacy && (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                            CLI-{legacy}
                        </span>
                    )}
                </div>
            );
        },
        size: 70,
    },
    {
        accessorKey: "nombre",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => {
            const razonSocial = row.original.nombre;
            const nombreFantasia = row.original.nombre_fantasia || row.original.datos_contacto?.second;
            return (
                <div className="flex flex-col">
                    <p className="font-medium">{razonSocial || nombreFantasia || "-"}</p>
                    {nombreFantasia && razonSocial && (
                        <p className="text-xs text-muted-foreground">{nombreFantasia}</p>
                    )}
                </div>
            );
        },
        // La búsqueda (searchColumnId="nombre") debe matchear también el nombre
        // de fantasía y el CUIT, no solo la razón social. Ej: buscar "zacca"
        // encuentra al cliente cuyo nombre_fantasia es "ZACCAGNI".
        filterFn: (row, _id, value) => {
            const q = String(value ?? "").toLowerCase().trim();
            if (!q) return true;
            const haystack = [
                row.original.nombre,
                row.original.nombre_fantasia,
                row.original.datos_contacto?.second,
                row.original.cuit,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(q);
        },
    },
    {
        accessorKey: "cuit",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="CUIT" />
        ),
        cell: ({ row }) => (
            <div className="font-mono text-sm">{row.original.cuit || "-"}</div>
        ),
    },
    {
        accessorKey: "email",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ row }) => {
            const emails = row.original.email || row.original.datos_contacto?.email;
            if (Array.isArray(emails) && emails.length > 0) {
                return (
                    <div className="text-sm">
                        {emails[0]}
                        {emails.length > 1 && (
                            <span className="text-muted-foreground ml-1">+{emails.length - 1}</span>
                        )}
                    </div>
                );
            }
            return <div className="text-sm text-muted-foreground">-</div>;
        },
    },
    {
        accessorKey: "telefono",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Teléfono" />
        ),
        cell: ({ row }) => {
            const telefono = row.original.telefono || row.original.datos_contacto?.telefono;
            if (Array.isArray(telefono) && telefono.length > 0) {
                return (
                    <div className="text-sm">
                        {telefono[0]}
                        {telefono.length > 1 && (
                            <span className="text-muted-foreground ml-1">+{telefono.length - 1}</span>
                        )}
                    </div>
                );
            }
            return <div className="text-sm text-muted-foreground">-</div>;
        },
    },
    {
        accessorKey: "localidad",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Localidad" />
        ),
        cell: ({ row }) => {
            const loc = row.original.localidad;
            const prov = row.original.provincia;
            if (!loc && !prov) return <span className="text-muted-foreground text-sm">-</span>;
            return (
                <div className="flex flex-col">
                    <span className="text-sm">{loc || "-"}</span>
                    {prov && <span className="text-xs text-muted-foreground">{prov}</span>}
                </div>
            );
        },
        filterFn: (row, id, value) => {
            if (!Array.isArray(value) || value.length === 0) return true;
            return value.includes(row.getValue(id));
        },
    },
    // Columnas solo-filtro (ocultas por defecto vía initialColumnVisibility en la page).
    {
        accessorKey: "provincia",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Provincia" />
        ),
        cell: ({ row }) => <span className="text-sm">{row.original.provincia || "-"}</span>,
        filterFn: (row, id, value) => {
            if (!Array.isArray(value) || value.length === 0) return true;
            return value.includes(row.getValue(id));
        },
    },
    {
        accessorKey: "tipo",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tipo" />
        ),
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.tipo || "-"}</span>,
        filterFn: (row, id, value) => {
            if (!Array.isArray(value) || value.length === 0) return true;
            return value.includes(row.getValue(id));
        },
    },
    {
        id: "actividad",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Actividad" />
        ),
        cell: ({ row }) => {
            const equipos = row.original.equipos_count || 0;
            const servicios = row.original.servicios_count || 0;
            const facturas = row.original.facturas_count || 0;

            return (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1" title="Equipos">
                        <Building2 className="h-3.5 w-3.5" />
                        {equipos}
                    </span>
                    <span className="flex items-center gap-1" title="Servicios">
                        <Wrench className="h-3.5 w-3.5" />
                        {servicios}
                    </span>
                    <span className="flex items-center gap-1" title="Facturas">
                        <FileText className="h-3.5 w-3.5" />
                        {facturas}
                    </span>
                </div>
            );
        },
    },
    {
        id: "tags",
        accessorKey: "tags",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Tags" />
        ),
        cell: ({ row }) => {
            const tags = row.original.tags;
            if (!tags || tags.length === 0) {
                return <span className="text-muted-foreground text-sm">-</span>;
            }
            return <TagBadges tags={tags} />;
        },
        filterFn: (row, id, value) => {
            const tags = row.original.tags || [];
            return tags.some((t: Tag) => value.includes(t.nombre));
        },
    },
    {
        accessorKey: "estado",
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ row }) => {
            const s = getEstadoStyle(row.original.estado);
            return (
                <span
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        s.badgeClass,
                    )}
                    title={s.isWarning ? `Warning: ${s.label}` : s.label}
                >
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dotClass)} />
                    <span className="max-w-[180px] truncate">{s.label}</span>
                </span>
            );
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id));
        },
    },
]

// --- MOBILE CARD CONFIGURATION ---
import type { MobileCardConfig } from "@/lib/types/mobile-card";
import { mobileQuickActions } from "@/lib/mobile-card-helpers";
import { Hash, Mail, Phone } from "lucide-react";

export const empresasMobileConfig: MobileCardConfig<ClienteWithStats> = {
  fields: [
    {
      key: "nombre",
      position: "title",
      render: (_, row: ClienteWithStats) => row.nombre || row.nombre_fantasia || "-",
    },
    {
      key: "nombre_fantasia",
      position: "subtitle",
      render: (_, row: ClienteWithStats) => {
        if (row.nombre_fantasia && row.nombre) {
          return row.nombre_fantasia;
        }
        return row.cuit || "-";
      },
    },
    {
      key: "estado",
      position: "badge",
    },
    {
      key: "identificador_unico",
      position: "detail",
      label: "ID",
      icon: Hash,
    },
    {
      key: "email",
      position: "detail",
      label: "Email",
      icon: Mail,
      render: (_, row: ClienteWithStats) => {
        const emails = row.email || row.datos_contacto?.email;
        if (Array.isArray(emails) && emails.length > 0) {
          return emails[0];
        }
        return "-";
      },
    },
    {
      key: "telefono",
      position: "detail",
      label: "Tel",
      icon: Phone,
      render: (_, row: ClienteWithStats) => {
        const tel = row.telefono || row.datos_contacto?.telefono;
        if (Array.isArray(tel) && tel.length > 0) {
          return tel[0];
        }
        return "-";
      },
    },
    {
      key: "actividad",
      position: "footer",
      render: (_, row: ClienteWithStats) => {
        const equipos = row.equipos_count || 0;
        const servicios = row.servicios_count || 0;
        return `${equipos} equipos • ${servicios} servicios`;
      },
    },
  ],
  quickActions: [
    {
      type: "phone",
      label: "Llamar",
      icon: Phone,
      valueField: "telefono",
      showIf: (row) => {
        const tel = row.telefono || row.datos_contacto?.telefono;
        return Array.isArray(tel) && tel.length > 0;
      },
    },
    mobileQuickActions.whatsapp<ClienteWithStats>("telefono"),
    {
      type: "email",
      label: "Email",
      icon: Mail,
      valueField: "email",
      showIf: (row) => {
        const emails = row.email || row.datos_contacto?.email;
        return Array.isArray(emails) && emails.length > 0;
      },
    },
  ],
  getBorderColor: (row) => getEstadoStyle(row.estado).borderColor,
  avatar: {
    fallbackIcon: Building2,
  },
};
