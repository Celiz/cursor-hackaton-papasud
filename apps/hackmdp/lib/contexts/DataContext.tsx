"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Cliente, Equipo } from "@/lib/types";
import { ComboboxOption, ClienteComboboxOption } from "@/components/ui/searchable-combobox";
// Electric SQL deshabilitado temporalmente - usar API routes
// import { useElectricData } from "@/lib/hooks/use-electric-data";

interface EquipoUnidad {
  id: string;
  codigo: string;
  numero_serie: string;
  cliente_id: string;
  laboratorio_id?: string | null;
  equipos?: {
    marca: string;
    modelo: string;
    tipo?: string;
  };
}

interface Laboratorio {
  id: string;
  nombre: string;
  direccion?: string | null;
  localidad?: string | null;
  razon_social_id?: string | null;
  razones_sociales?: Array<{ cliente_id: string; nombre: string; cuit: string | null; es_principal: boolean }>;
}

interface DataContextType {
  // Raw data
  clientes: Cliente[];
  equipos: Equipo[];
  equiposUnidades: EquipoUnidad[];
  laboratorios: Laboratorio[];

  // Combobox-ready data
  clientesOptions: ClienteComboboxOption[];
  equiposOptions: ComboboxOption[];
  equiposUnidadesOptions: ComboboxOption[];

  // Status
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  refresh: () => Promise<void>;
  getEquiposUnidadesByCliente: (clienteId: string) => ComboboxOption[];
  getLaboratoriosByCliente: (clienteId: string) => ComboboxOption[];
  getEquiposUnidadesByLaboratorio: (laboratorioId: string) => ComboboxOption[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // TODO: Electric SQL deshabilitado temporalmente - usar API routes directamente
  // const {
  //   clientes: electricClientes,
  //   equipos: electricEquipos,
  //   equiposUnidades: electricEquiposUnidades,
  //   loading: electricLoading,
  //   errorClientes,
  //   errorEquipos,
  //   errorEquiposUnidades,
  //   refetchClientes,
  //   refetchEquipos,
  //   refetchEquiposUnidades,
  // } = useElectricData();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equiposUnidades, setEquiposUnidades] = useState<EquipoUnidad[]>([]);
  const [laboratorios, setLaboratorios] = useState<Laboratorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cargar datos desde API routes
  useEffect(() => {
    const loadFromAPI = async () => {
      try {
        // Check if we're in Locus personal space (no real org → no business data)
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        if (session?.user?.orgTipo === 'locus') {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const [clientesRes, equiposRes, equiposUnidadesRes, laboratoriosRes] = await Promise.all([
          fetch("/api/clientes?view=principal"),
          fetch("/api/equipos"),
          fetch("/api/equipos-unidades"),
          fetch("/api/laboratorios?completos=true"),
        ]);

        const [clientesData, equiposData, equiposUnidadesData, laboratoriosData] = await Promise.all([
          clientesRes.ok ? clientesRes.json() : [],
          equiposRes.ok ? equiposRes.json() : [],
          equiposUnidadesRes.ok ? equiposUnidadesRes.json() : [],
          laboratoriosRes.ok ? laboratoriosRes.json() : [],
        ]);

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setEquipos(Array.isArray(equiposData) ? equiposData : []);
        setEquiposUnidades(Array.isArray(equiposUnidadesData) ? equiposUnidadesData : []);
        setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
        setLastUpdated(new Date());
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading data from API:", err);
        setError(err instanceof Error ? err.message : "Error loading data");
        setIsLoading(false);
      }
    };

    loadFromAPI();
  }, []);

  // Transform clientes to combobox options
  const transformClientesToOptions = useCallback((clientesData: Cliente[]): ClienteComboboxOption[] => {
    return clientesData.map((cliente) => {
      const nombrePrincipal = cliente.nombre || cliente.nombre_fantasia || "Sin nombre";
      const aliases = (cliente as Cliente & { aliases?: string }).aliases || "";
      const nombreSecundarioBase =
        cliente.nombre_fantasia && cliente.nombre !== cliente.nombre_fantasia
          ? cliente.nombre_fantasia
          : cliente.cuit;
      const partesSecundario: string[] = [];
      if (cliente.identificador_legacy) partesSecundario.push(`CLI-${cliente.identificador_legacy}`);
      if (nombreSecundarioBase) partesSecundario.push(nombreSecundarioBase);
      const nombreSecundario = partesSecundario.join(' • ');
      const badge = cliente.identificador_unico || `#${cliente.id.slice(0, 8)}`;

      return {
        label: nombrePrincipal,
        value: cliente.id,
        badge: badge,
        secondaryLabel: nombreSecundario,
        subtitle: nombreSecundario,
        data: {
          nombre: cliente.nombre,
          // Append aliases al nombre_fantasia para que el combobox lo matchee
          // (SearchableCombobox busca en data.nombre_fantasia)
          nombre_fantasia: [cliente.nombre_fantasia, aliases].filter(Boolean).join(' '),
          identificador_unico: cliente.identificador_unico,
          identificador_legacy: cliente.identificador_legacy,
          cuit: cliente.cuit,
          email: cliente.email,
          telefono: cliente.telefono,
        },
      };
    });
  }, []);

  // Transform equipos to combobox options
  const transformEquiposToOptions = useCallback((equiposData: Equipo[]): ComboboxOption[] => {
    return equiposData.map((equipo) => ({
      label: `${equipo.marca || ""} ${equipo.modelo || ""}`.trim() || "Sin nombre",
      value: equipo.id,
      subtitle: equipo.tipo || equipo.codigo,
    }));
  }, []);

  // Transform equipos unidades to combobox options
  const transformEquiposUnidadesToOptions = useCallback(
    (unidadesData: EquipoUnidad[]): ComboboxOption[] => {
      return unidadesData.map((unidad) => {
        const equipoData = unidad.equipos;
        const marca = equipoData?.marca || "";
        const modelo = equipoData?.modelo || "Sin modelo";
        const numeroSerie = unidad.numero_serie || "";
        const codigo = unidad.codigo || "";

        // Label: marca + modelo (ej: "Wiener CM 250")
        const label = [marca, modelo].filter(Boolean).join(" ") || "Sin nombre";

        // Subtitle: número de serie prominente (lo que distingue unidades del mismo modelo)
        const subtitle = numeroSerie ? `S/N: ${numeroSerie}` : "Sin N° serie";

        return {
          label,
          value: unidad.id,
          subtitle,
          secondaryLabel: subtitle,
          badge: codigo || undefined,
        };
      });
    },
    []
  );

  // Refresh data from API
  const loadData = useCallback(async () => {
    try {
      const [clientesRes, equiposRes, equiposUnidadesRes, laboratoriosRes] = await Promise.all([
        fetch("/api/clientes?view=principal"),
        fetch("/api/equipos"),
        fetch("/api/equipos-unidades"),
        fetch("/api/laboratorios?completos=true"),
      ]);

      const [clientesData, equiposData, equiposUnidadesData, laboratoriosData] = await Promise.all([
        clientesRes.ok ? clientesRes.json() : [],
        equiposRes.ok ? equiposRes.json() : [],
        equiposUnidadesRes.ok ? equiposUnidadesRes.json() : [],
        laboratoriosRes.ok ? laboratoriosRes.json() : [],
      ]);

      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setEquipos(Array.isArray(equiposData) ? equiposData : []);
      setEquiposUnidades(Array.isArray(equiposUnidadesData) ? equiposUnidadesData : []);
      setLaboratorios(Array.isArray(laboratoriosData) ? laboratoriosData : []);
      setLastUpdated(new Date());

      console.log("✅ Datos cargados desde API:", {
        clientes: clientesData.length,
        equipos: equiposData.length,
        equiposUnidades: equiposUnidadesData.length,
        laboratorios: laboratoriosData.length,
      });
    } catch (err) {
      console.error("Error refreshing data from API:", err);
    }
  }, []);

  // Get equipos unidades filtered by cliente
  const getEquiposUnidadesByCliente = useCallback(
    (clienteId: string): ComboboxOption[] => {
      const filtered = equiposUnidades.filter((unidad) => unidad.cliente_id === clienteId);
      return transformEquiposUnidadesToOptions(filtered);
    },
    [equiposUnidades, transformEquiposUnidadesToOptions]
  );

  // Transform laboratorios to combobox options
  const transformLaboratoriosToOptions = useCallback((labs: Laboratorio[]): ComboboxOption[] => {
    return labs.map((lab) => {
      const subtitle = [lab.direccion, lab.localidad].filter(Boolean).join(", ");
      return {
        label: lab.nombre,
        value: lab.id,
        subtitle: subtitle || undefined,
      };
    });
  }, []);

  // Get laboratorios linked to a cliente via M:N
  const getLaboratoriosByCliente = useCallback(
    (clienteId: string): ComboboxOption[] => {
      const filtered = laboratorios.filter((lab) => {
        // Check via razones_sociales array (M:N from view)
        if (Array.isArray(lab.razones_sociales)) {
          return lab.razones_sociales.some((rs) => rs.cliente_id === clienteId);
        }
        // Fallback: legacy razon_social_id (1:1)
        return lab.razon_social_id === clienteId;
      });
      return transformLaboratoriosToOptions(filtered);
    },
    [laboratorios, transformLaboratoriosToOptions]
  );

  // Get equipos unidades filtered by laboratorio
  const getEquiposUnidadesByLaboratorio = useCallback(
    (laboratorioId: string): ComboboxOption[] => {
      const filtered = equiposUnidades.filter((unidad) => unidad.laboratorio_id === laboratorioId);
      return transformEquiposUnidadesToOptions(filtered);
    },
    [equiposUnidades, transformEquiposUnidadesToOptions]
  );

  // Transform data to combobox options whenever data changes
  const clientesOptions = useMemo(
    () => transformClientesToOptions(clientes),
    [clientes, transformClientesToOptions]
  );

  const equiposOptions = useMemo(
    () => transformEquiposToOptions(equipos),
    [equipos, transformEquiposToOptions]
  );

  const equiposUnidadesOptions = useMemo(
    () => transformEquiposUnidadesToOptions(equiposUnidades),
    [equiposUnidades, transformEquiposUnidadesToOptions]
  );

  // Data is loaded in the initial useEffect, no need for this one anymore

  const value: DataContextType = {
    clientes,
    equipos,
    equiposUnidades,
    laboratorios,
    clientesOptions,
    equiposOptions,
    equiposUnidadesOptions,
    isLoading,
    error,
    lastUpdated,
    refresh: loadData,
    getEquiposUnidadesByCliente,
    getLaboratoriosByCliente,
    getEquiposUnidadesByLaboratorio,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function usePreloadedData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("usePreloadedData must be used within a DataProvider");
  }
  return context;
}
