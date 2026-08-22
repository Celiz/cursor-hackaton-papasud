"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getSidebarLinks, type OrgTipo } from "@/lib/sidebar-links";
import type { Item, SubItem, Section } from "@/lib/sidebar-links";
import { useSession } from "@/lib/hooks/use-session";
import { useOrgFeatures } from "@/lib/hooks/use-org-features";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import type { Modulo } from "@/lib/types/roles";
import {
  FileText,
  Search,
  Users,
  Package,
  Wrench,
  Calculator,
  ShoppingBag,
  FileSignature,
  Target,
  Workflow,
  Box,
  Send,
  Clock,
  ArrowRight,
  Sparkles,
  Command as CommandIcon,
  Hash,
  X,
  UserCircle,
  CheckSquare,
  Building2,
  Wallet,
  Receipt,
  Truck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialogStore, type DialogType } from "@/lib/stores/dialog-store";

// ===== Búsqueda en datos (clientes, productos, facturas, remitos, cheques) =====
// Debounce hook para no spamear el servidor mientras el usuario tipea.
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SearchResult {
  type: "cliente" | "producto" | "factura" | "remito" | "cheque";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

const SEARCH_TYPE_ICONS: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  cliente: Building2,
  producto: Package,
  factura: Receipt,
  remito: Truck,
  cheque: Wallet,
};

const SEARCH_TYPE_LABELS: Record<SearchResult["type"], string> = {
  cliente: "Clientes",
  producto: "Productos",
  factura: "Facturas",
  remito: "Remitos",
  cheque: "Cheques",
};

const searchFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return { results: [] };
  return res.json() as Promise<{ results: SearchResult[] }>;
};

type CommandAction = {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
  category: "actions" | "navigation" | "create" | "recent";
  shortcut?: string;
  badge?: string;
  permission?: Modulo;
};

interface CommandPaletteProps {
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}

// Hook para manejar búsquedas recientes con localStorage
function useRecentSearches() {
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  React.useEffect(() => {
    const stored = localStorage.getItem("command-palette-recent");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  const addRecentSearch = React.useCallback((search: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== search);
      const updated = [search, ...filtered].slice(0, 5);
      localStorage.setItem("command-palette-recent", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = React.useCallback(() => {
    localStorage.removeItem("command-palette-recent");
    setRecentSearches([]);
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

export function CommandPalette({ onOpenChange, open: controlledOpen }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { recentSearches, addRecentSearch, clearRecentSearches } = useRecentSearches();
  const setOpenDialog = useDialogStore((state) => state.setOpenDialog);
  const { data: session } = useSession();
  const { features } = useOrgFeatures();
  const { canAccess, loading: permsLoading } = useUserPermissions();
  const orgTipo = session?.user?.orgTipo as OrgTipo | undefined;
  const userEmail = session?.user?.email;

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Reset search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  // Auto-focus input when command palette opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const { sections } = getSidebarLinks(orgTipo, features, userEmail);

  const visibleSections = React.useMemo(() => {
    return sections
      .map(section => {
        const filteredItems = section.items
          .filter(item => !item.permission || canAccess(item.permission))
          .map(item => ({
            ...item,
            subItems: item.subItems?.filter(sub => !sub.permission || canAccess(sub.permission)),
          }))
          .filter(item => {
            // If the item had subItems but they all got filtered out, hide the item
            const original = sections
              .find(s => s.title === section.title)?.items
              .find(i => i.title === item.title);
            const hadSubItems = (original?.subItems?.length ?? 0) > 0;
            if (hadSubItems && (!item.subItems || item.subItems.length === 0)) return false;
            return true;
          });
        return { ...section, items: filteredItems };
      })
      .filter(section => section.items.length > 0);
  }, [sections, canAccess]);

  // ===== Búsqueda en datos via /api/search (debounced) =====
  // Solo se activa cuando hay 2+ caracteres escritos. useSWR con key
  // dinámico: null cuando no hay que buscar (no fetchea). El debounce
  // de 300ms evita queries por cada keystroke.
  const debouncedSearch = useDebounce(searchValue, 300);
  const searchUrl =
    open && debouncedSearch.length >= 2
      ? `/api/search?q=${encodeURIComponent(debouncedSearch)}`
      : null;
  const { data: searchData, isLoading: searchLoading } = useSWR(
    searchUrl,
    searchFetcher,
    { keepPreviousData: true, revalidateOnFocus: false }
  );
  const searchResults: SearchResult[] = searchData?.results || [];
  // Agrupar por type para mostrar en secciones separadas
  const groupedResults = React.useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of searchResults) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [searchResults]);

  // Acciones rápidas para crear (abre dialogs globalmente sin navegar)
  const quickActions: CommandAction[] = [
    {
      id: "new-cliente",
      title: "Nueva Empresa",
      description: "Crear un nuevo cliente",
      icon: Users,
      action: () => {
        addRecentSearch("Nueva Empresa");
        setOpenDialog("cliente");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "cliente", "empresa", "customer"],
      category: "create",
      shortcut: "C",
    },
    {
      id: "new-factura",
      title: "Nueva Factura",
      description: "Crear una nueva factura",
      icon: FileText,
      action: () => {
        addRecentSearch("Nueva Factura");
        setOpenDialog("factura");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "factura", "invoice"],
      category: "create",
      shortcut: "F",
      permission: "facturas",
    },
    {
      id: "new-producto",
      title: "Nuevo Producto",
      description: "Agregar al inventario",
      icon: Package,
      action: () => {
        addRecentSearch("Nuevo Producto");
        router.push("/dashboard/productos?action=new");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "producto", "inventario"],
      category: "create",
      shortcut: "P",
    },
    {
      id: "new-servicio",
      title: "Nuevo Servicio Técnico",
      description: "Registrar servicio",
      icon: Wrench,
      action: () => {
        addRecentSearch("Nuevo Servicio");
        setOpenDialog("servicio");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "servicio", "tecnico", "reparacion"],
      category: "create",
      shortcut: "S",
      permission: "servicios_tecnicos",
    },
    {
      id: "new-presupuesto",
      title: "Nuevo Presupuesto",
      description: "Crear cotización",
      icon: Calculator,
      action: () => {
        addRecentSearch("Nuevo Presupuesto");
        setOpenDialog("presupuesto");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "presupuesto", "cotizacion"],
      category: "create",
      shortcut: "Q",
      permission: "presupuestos",
    },
    {
      id: "new-pedido",
      title: "Nuevo Pedido",
      description: "Registrar pedido",
      icon: ShoppingBag,
      action: () => {
        addRecentSearch("Nuevo Pedido");
        router.push("/dashboard/pedidos?action=new");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "pedido", "orden"],
      category: "create",
      shortcut: "O",
      permission: "pedidos",
    },
    {
      id: "new-ivr",
      title: "Nuevo IVR",
      description: "Remito de venta",
      icon: Truck,
      action: () => {
        addRecentSearch("Nuevo IVR");
        setOpenDialog("ivr");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "ivr", "remito", "venta", "cuenta corriente"],
      category: "create",
      shortcut: "I",
      permission: "facturas",
    },
    {
      id: "new-comodato",
      title: "Nuevo Contrato",
      description: "Comodato o alquiler",
      icon: FileSignature,
      action: () => {
        addRecentSearch("Nuevo Contrato");
        setOpenDialog("comodato");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "contrato", "comodato", "alquiler"],
      category: "create",
      shortcut: "K",
      permission: "comodatos",
    },
    {
      id: "new-oportunidad",
      title: "Nueva Oportunidad",
      description: "Pipeline de ventas",
      icon: Target,
      action: () => {
        addRecentSearch("Nueva Oportunidad");
        setOpenDialog("oportunidad");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "oportunidad", "venta", "pipeline", "crm"],
      category: "create",
      shortcut: "V",
      permission: "oportunidades",
    },
    {
      id: "new-persona",
      title: "Nueva Persona",
      description: "Contacto o persona",
      icon: UserCircle,
      action: () => {
        addRecentSearch("Nueva Persona");
        router.push("/dashboard/personas?action=new");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "persona", "contacto"],
      category: "create",
      shortcut: "N",
    },
    {
      id: "new-tarea",
      title: "Nueva Tarea",
      description: "Crear tarea pendiente",
      icon: CheckSquare,
      action: () => {
        addRecentSearch("Nueva Tarea");
        setOpenDialog("tarea");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "tarea", "todo", "pendiente"],
      category: "create",
      shortcut: "T",
    },
    {
      id: "new-equipo",
      title: "Nuevo Equipo",
      description: "Modelo de equipo",
      icon: Box,
      action: () => {
        addRecentSearch("Nuevo Equipo");
        setOpenDialog("equipo");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "equipo", "modelo", "maquina"],
      category: "create",
    },
    {
      id: "new-equipo-unidad",
      title: "Nueva Unidad de Equipo",
      description: "Unidad física de equipo",
      icon: Box,
      action: () => {
        addRecentSearch("Nueva Unidad de Equipo");
        setOpenDialog("equipo-unidad");
        setOpen(false);
      },
      keywords: ["nuevo", "crear", "unidad", "equipo", "serie", "numero"],
      category: "create",
    },
  ];

  const visibleQuickActions = React.useMemo(
    () => quickActions.filter(a => !a.permission || canAccess(a.permission)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAccess]
  );

  // Acciones destacadas
  const featuredActions: CommandAction[] = [
    {
      id: "go-pipeline",
      title: "Pipeline de Ventas",
      description: "Kanban de oportunidades",
      icon: Workflow,
      action: () => {
        addRecentSearch("Pipeline");
        router.push("/dashboard/pipeline-ventas");
        setOpen(false);
      },
      keywords: ["pipeline", "ventas", "kanban", "oportunidades"],
      category: "actions",
    },
    {
      id: "go-equipos",
      title: "Centro de Equipos",
      description: "Gestionar equipos y comodatos",
      icon: Box,
      action: () => {
        addRecentSearch("Equipos");
        router.push("/dashboard/equipos-unidades");
        setOpen(false);
      },
      keywords: ["equipos", "unidades", "comodatos"],
      category: "actions",
    },
  ];

  // Navegación desde sidebar
  const navigationCommands: CommandAction[] = [];
  visibleSections.forEach((section: Section) => {
    section.items.forEach((item: Item) => {
      if (item.url && !item.disabled) {
        navigationCommands.push({
          id: item.url,
          title: item.title,
          description: section.title,
          icon: item.icon as React.ComponentType<{ className?: string }>,
          action: () => {
            addRecentSearch(item.title);
            router.push(item.url!);
            setOpen(false);
          },
          keywords: [section.title.toLowerCase(), item.title.toLowerCase()],
          category: "navigation",
        });
      }

      if (item.subItems) {
        item.subItems.forEach((subItem: SubItem) => {
          navigationCommands.push({
            id: subItem.url,
            title: subItem.title,
            description: item.title,
            icon: subItem.icon as React.ComponentType<{ className?: string }>,
            action: () => {
              addRecentSearch(subItem.title);
              router.push(subItem.url);
              setOpen(false);
            },
            keywords: [item.title.toLowerCase(), subItem.title.toLowerCase()],
            category: "navigation",
          });
        });
      }
    });
  });

  // Filtrar navegación para no mostrar la página actual
  const filteredNavigation = navigationCommands.filter(
    (cmd) => cmd.id !== pathname
  );

  const hasSearch = searchValue.length > 0;
  const showRecent = !hasSearch && recentSearches.length > 0;

  if (permsLoading) return null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop + Command Palette container */}
      <div
        className="fixed inset-0 z-50 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] animate-in fade-in-0 duration-150 flex items-start justify-center pt-[15vh] px-4"
        onClick={() => setOpen(false)}
      >
        <div
          className="w-full max-w-[560px] animate-in fade-in-0 slide-in-from-top-4 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <Command
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/20 dark:shadow-black/50 overflow-hidden bg-white dark:bg-zinc-900"
            shouldFilter={true}
          >
            {/* Header con input */}
            <CommandInput
              ref={inputRef}
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Buscar o escribir un comando..."
              className="h-14 text-base placeholder:text-zinc-400"
            />

            <CommandList className="max-h-[400px] overflow-y-auto overscroll-contain p-2">
              <CommandEmpty>
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-4">
                    <Search className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      No se encontraron resultados
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Prueba con otros términos
                    </p>
                  </div>
                </div>
              </CommandEmpty>

              {/* Búsquedas recientes */}
              {showRecent && (
                <>
                  <CommandGroup>
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Recientes
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentSearches();
                        }}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                    {recentSearches.map((search, index) => (
                      <CommandItem
                        key={`recent-${index}`}
                        value={search}
                        onSelect={() => setSearchValue(search)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                      >
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-zinc-600 dark:text-zinc-300">{search}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator className="my-2 bg-zinc-100 dark:bg-zinc-800" />
                </>
              )}

              {/* Resultados de búsqueda en datos (clientes, productos, facturas...) */}
              {hasSearch && searchResults.length > 0 && (
                <>
                  {Object.entries(groupedResults).map(([type, items]) => {
                    const Icon = SEARCH_TYPE_ICONS[type as SearchResult["type"]] || Search;
                    const label = SEARCH_TYPE_LABELS[type as SearchResult["type"]] || type;
                    return (
                      <CommandGroup key={`search-${type}`}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <Icon className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {label}
                          </span>
                        </div>
                        {items.map((result) => {
                          const RIcon = SEARCH_TYPE_ICONS[result.type] || Search;
                          return (
                            <CommandItem
                              key={`${result.type}-${result.id}`}
                              value={`${result.title} ${result.subtitle}`}
                              onSelect={() => {
                                addRecentSearch(searchValue);
                                router.push(result.url);
                                setOpen(false);
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800"
                            >
                              <RIcon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{result.title}</p>
                                <p className="text-[11px] text-zinc-400 truncate">{result.subtitle}</p>
                              </div>
                              <ArrowRight className="h-3 w-3 text-zinc-300 flex-shrink-0" />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  })}
                  <CommandSeparator className="my-2 bg-zinc-100 dark:bg-zinc-800" />
                </>
              )}

              {/* Loading indicator para búsqueda en datos */}
              {hasSearch && searchLoading && searchResults.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-6 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Buscando...</span>
                </div>
              )}

              {/* Acciones rápidas - Solo cuando no hay búsqueda */}
              {!hasSearch && (
                <>
                  <CommandGroup>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        Crear Nuevo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {visibleQuickActions.slice(0, 6).map((cmd) => {
                        const Icon = cmd.icon;
                        return (
                          <CommandItem
                            key={cmd.id}
                            value={`${cmd.title} ${cmd.description} ${cmd.keywords.join(" ")}`}
                            onSelect={cmd.action}
                            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 group-data-[selected=true]:from-blue-500 group-data-[selected=true]:to-blue-600 transition-all">
                              <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-data-[selected=true]:text-white transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                {cmd.title}
                              </span>
                              {cmd.description && (
                                <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                                  {cmd.description}
                                </span>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <kbd className="hidden sm:flex h-5 items-center rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 text-[10px] font-mono text-zinc-400">
                                {cmd.shortcut}
                              </kbd>
                            )}
                          </CommandItem>
                        );
                      })}
                    </div>
                  </CommandGroup>
                  <CommandSeparator className="my-2 bg-zinc-100 dark:bg-zinc-800" />
                </>
              )}

              {/* Navegación cuando hay búsqueda o acciones destacadas cuando no */}
              <CommandGroup>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Hash className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {hasSearch ? "Resultados" : "Ir a"}
                  </span>
                </div>
                {(hasSearch ? [...featuredActions, ...filteredNavigation] : [...featuredActions, ...filteredNavigation.slice(0, 6)]).map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <CommandItem
                      key={cmd.id}
                      value={`${cmd.title} ${cmd.description} ${cmd.keywords.join(" ")}`}
                      onSelect={cmd.action}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-zinc-400 group-data-[selected=true]:text-zinc-600 dark:group-data-[selected=true]:text-zinc-300 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-600 dark:text-zinc-300">
                          {cmd.title}
                        </span>
                        {cmd.description && (
                          <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                            {cmd.description}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {/* Todas las acciones de crear cuando hay búsqueda */}
              {hasSearch && (
                <CommandGroup>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Crear
                    </span>
                  </div>
                  {visibleQuickActions.map((cmd) => {
                    const Icon = cmd.icon;
                    return (
                      <CommandItem
                        key={cmd.id}
                        value={`${cmd.title} ${cmd.description} ${cmd.keywords.join(" ")}`}
                        onSelect={cmd.action}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-800 transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 group-data-[selected=true]:from-blue-500 group-data-[selected=true]:to-blue-600 transition-all">
                          <Icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-data-[selected=true]:text-white transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {cmd.title}
                          </span>
                          {cmd.description && (
                            <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500">
                              {cmd.description}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>

            {/* Footer con tips */}
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-4 py-2.5 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex h-5 items-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 font-mono">
                    <ArrowRight className="h-2.5 w-2.5 rotate-[-90deg]" />
                  </kbd>
                  <kbd className="inline-flex h-5 items-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 font-mono">
                    <ArrowRight className="h-2.5 w-2.5 rotate-90" />
                  </kbd>
                  <span>navegar</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="inline-flex h-5 items-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-1.5 font-mono text-[10px]">
                    enter
                  </kbd>
                  <span>seleccionar</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <CommandIcon className="h-3 w-3" />
                <span>K</span>
              </div>
            </div>
          </Command>
        </div>
      </div>
    </>
  );
}
