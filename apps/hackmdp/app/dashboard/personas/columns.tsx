"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Persona } from "@/lib/types/personas";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { TagBadges } from "@/components/core-ui/TagSelector"
import { Tag } from "@/lib/types"

const tipoPersonaLabels: Record<string, string> = {
  contacto_ventas: "Contacto Ventas",
  bioquimico: "Bioquímico",
  veterinario: "Veterinario",
  tecnico: "Técnico",
  administrativo: "Administrativo",
  responsable_tecnico: "Responsable Técnico",
  otro: "Otro",
};

const tipoPersonaColors: Record<string, string> = {
  contacto_ventas: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  bioquimico: "bg-green-500/10 text-green-700 dark:text-green-400",
  veterinario: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  tecnico: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  administrativo: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  responsable_tecnico: "bg-red-500/10 text-red-700 dark:text-red-400",
  otro: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export const columns: ColumnDef<Persona>[] = [
  {
    accessorKey: "nombre_completo",
    header: "Nombre Completo",
    cell: ({ row }) => {
      const nombreCompleto =
        row.original.nombre_completo?.trim() ||
        [row.original.nombre, row.original.apellido]
          .filter(Boolean)
          .join(" ");
      return (
        <div className="flex flex-col">
          <span className="font-medium">{nombreCompleto}</span>
          {row.original.dni && (
            <span className="text-xs text-muted-foreground">
              DNI: {row.original.dni}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "cliente_nombre",
    header: "Empresa",
    cell: ({ row }) => {
      const empresa = row.original.cliente_nombre;
      return empresa
        ? <span className="text-sm">{empresa}</span>
        : <span className="text-sm text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "tipo_persona",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.getValue("tipo_persona") as string;
      return (
        <Badge
          variant="secondary"
          className={tipoPersonaColors[tipo] || tipoPersonaColors.otro}
        >
          {tipoPersonaLabels[tipo] || tipo}
        </Badge>
      );
    },
  },
  {
    accessorKey: "profesion",
    header: "Profesión",
    cell: ({ row }) => {
      const profesion = row.getValue("profesion") as string | undefined;
      const matricula = row.original.matricula_profesional;

      if (!profesion) return <span className="text-muted-foreground">—</span>;

      return (
        <div className="flex flex-col">
          <span>{profesion}</span>
          {matricula && (
            <span className="text-xs text-muted-foreground">
              Mat. {matricula}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const emails = row.getValue("email") as string[] | undefined;
      if (!emails || emails.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{emails[0]}</span>
          {emails.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              +{emails.length - 1}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => {
      const telefonos = row.getValue("telefono") as string[] | undefined;
      if (!telefonos || telefonos.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{telefonos[0]}</span>
          {telefonos.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              +{telefonos.length - 1}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "categoria",
    header: "Categoría",
    cell: ({ row }) => {
      const categoria = row.original.categoria;
      if (!categoria) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <Badge
          variant="outline"
          style={{
            borderColor: categoria.color || undefined,
            color: categoria.color || undefined,
          }}
        >
          {categoria.nombre}
        </Badge>
      );
    },
  },
  {
    accessorKey: "ubicacion",
    header: "Ubicación",
    cell: ({ row }) => {
      const ubicacion = row.original.ubicacion;
      if (!ubicacion) {
        return <span className="text-muted-foreground">—</span>;
      }
      return <span className="text-sm">{ubicacion.nombre}</span>;
    },
  },
  {
    id: "tags",
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = (row.original as any).tags;
      if (!tags || tags.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return <TagBadges tags={tags} />;
    },
    filterFn: (row, id, value) => {
      const tags = (row.original as any).tags || [];
      return tags.some((t: any) => value.includes(t.nombre));
    },
  },
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const activo = row.getValue("activo") as boolean;
      return (
        <Badge variant={activo ? "default" : "secondary"}>
          {activo ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  },
];
