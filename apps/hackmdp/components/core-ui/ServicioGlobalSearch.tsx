"use client";

import * as React from "react";
import { Search, User, FlaskConical, Box } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePreloadedData } from "@/lib/contexts/DataContext";

export interface ServicioGlobalSelection {
  cliente_id: string;
  laboratorio_id?: string;
  equipo_id?: string;
}

type Resultado = {
  tipo: "cliente" | "laboratorio" | "equipo";
  id: string;
  titulo: string;
  subtitulo: string;
  seleccion: ServicioGlobalSelection;
};

const norm = (s: string | null | undefined) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MAX_POR_GRUPO = 8;

/**
 * Buscador global del diálogo de Nueva Orden de Servicio.
 * Permite encontrar el objetivo de la orden buscando por cliente,
 * laboratorio o equipo (n° de serie / marca / modelo), y autocompleta
 * toda la cascada Cliente → Laboratorio → Equipo al elegir un resultado.
 */
export function ServicioGlobalSearch({
  onSelect,
}: {
  onSelect: (sel: ServicioGlobalSelection) => void;
}) {
  const { clientes, laboratorios, equiposUnidades } = usePreloadedData();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");

  const clienteNombre = React.useCallback(
    (id: string | null | undefined) => {
      const c = (clientes as any[]).find((x) => x.id === id);
      return c?.nombre || c?.nombre_fantasia || "";
    },
    [clientes]
  );
  const labNombre = React.useCallback(
    (id: string | null | undefined) =>
      (laboratorios as any[]).find((l) => l.id === id)?.nombre || "",
    [laboratorios]
  );

  const resultados = React.useMemo(() => {
    const term = norm(q).trim();
    if (term.length < 2)
      return { clientes: [] as Resultado[], laboratorios: [] as Resultado[], equipos: [] as Resultado[] };

    const cli: Resultado[] = [];
    for (const c of clientes as any[]) {
      if (cli.length >= MAX_POR_GRUPO) break;
      const match = [c.nombre, c.nombre_fantasia, c.cuit, c.dni].some((f) =>
        norm(f).includes(term)
      );
      if (match) {
        cli.push({
          tipo: "cliente",
          id: c.id,
          titulo: c.nombre || c.nombre_fantasia || "Sin nombre",
          subtitulo: [
            c.nombre_fantasia && c.nombre_fantasia !== c.nombre ? c.nombre_fantasia : null,
            c.cuit,
          ]
            .filter(Boolean)
            .join(" · "),
          seleccion: { cliente_id: c.id },
        });
      }
    }

    const labs: Resultado[] = [];
    for (const l of laboratorios as any[]) {
      if (labs.length >= MAX_POR_GRUPO) break;
      const match = [l.nombre, l.codigo, l.localidad].some((f) => norm(f).includes(term));
      if (!match) continue;
      const rs: any[] = l.razones_sociales || [];
      const principal = rs.find((r) => r.es_principal) || rs[0];
      if (!principal) continue;
      labs.push({
        tipo: "laboratorio",
        id: l.id,
        titulo: l.nombre,
        subtitulo: [principal.nombre, l.localidad].filter(Boolean).join(" · "),
        seleccion: { cliente_id: principal.cliente_id || "", laboratorio_id: l.id },
      });
    }

    const eqs: Resultado[] = [];
    for (const u of equiposUnidades as any[]) {
      if (eqs.length >= MAX_POR_GRUPO) break;
      const e = u.equipos || {};
      const match = [u.numero_serie, u.codigo, e.marca, e.modelo, e.tipo].some((f) =>
        norm(f).includes(term)
      );
      if (!match) continue;
      const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
      eqs.push({
        tipo: "equipo",
        id: u.id,
        titulo: marcaModelo || e.tipo || u.numero_serie || "Equipo",
        subtitulo: [
          u.numero_serie ? `N/S ${u.numero_serie}` : null,
          labNombre(u.laboratorio_id),
          clienteNombre(u.cliente_id),
        ]
          .filter(Boolean)
          .join(" · "),
        seleccion: {
          // Equipos en stock/duplicados pueden no tener cliente — string vacío
          // (no null) para que el form lo trate como "falta elegir cliente".
          cliente_id: u.cliente_id || "",
          laboratorio_id: u.laboratorio_id || undefined,
          equipo_id: u.id,
        },
      });
    }

    return { clientes: cli, laboratorios: labs, equipos: eqs };
  }, [q, clientes, laboratorios, equiposUnidades, clienteNombre, labNombre]);

  const total =
    resultados.clientes.length + resultados.laboratorios.length + resultados.equipos.length;

  const elegir = (r: Resultado) => {
    onSelect(r.seleccion);
    setOpen(false);
    setQ("");
  };

  const grupos: Array<{
    heading: string;
    icon: React.ReactNode;
    items: Resultado[];
    prefix: string;
  }> = [
    {
      heading: "Equipos",
      icon: <Box className="h-4 w-4 mr-2 text-emerald-500 shrink-0" />,
      items: resultados.equipos,
      prefix: "e",
    },
    {
      heading: "Laboratorios",
      icon: <FlaskConical className="h-4 w-4 mr-2 text-purple-500 shrink-0" />,
      items: resultados.laboratorios,
      prefix: "l",
    },
    {
      heading: "Clientes",
      icon: <User className="h-4 w-4 mr-2 text-blue-500 shrink-0" />,
      items: resultados.clientes,
      prefix: "c",
    },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="default"
          variant="outline"
          className="w-full justify-start gap-2 font-normal text-muted-foreground"
        >
          <Search className="h-4 w-4 shrink-0" />
          Buscar por cliente, laboratorio o equipo...
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        portal={false}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nombre, razón social, n° de serie, marca..."
            value={q}
            onValueChange={setQ}
          />
          <CommandList>
            {norm(q).trim().length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Escribí al menos 2 caracteres
              </div>
            ) : total === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Sin resultados
              </div>
            ) : (
              grupos
                .filter((g) => g.items.length > 0)
                .map((g) => (
                  <CommandGroup key={g.prefix} heading={g.heading}>
                    {g.items.map((r) => (
                      <CommandItem
                        key={`${g.prefix}-${r.id}`}
                        value={`${g.prefix}-${r.id}`}
                        onSelect={() => elegir(r)}
                        className="cursor-pointer data-[selected=true]:bg-accent/15 data-[selected=true]:text-foreground"
                      >
                        {g.icon}
                        <div className="min-w-0">
                          <div className="truncate">{r.titulo}</div>
                          {r.subtitulo && (
                            <div className="text-xs text-muted-foreground truncate">
                              {r.subtitulo}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
