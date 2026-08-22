"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserPlus,
  Package,
  FileText,
  Users,
  Wrench,
  Box,
  Building2,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar");
  return data;
};

// Iconos por tipo de acción
const actionIcons: Record<string, React.ElementType> = {
  crear: Plus,
  actualizar: Edit,
  eliminar: Trash2,
  cambiar_estado: RefreshCw,
  comentar: MessageSquare,
  asignar: UserPlus,
  completar: CheckCircle,
  cancelar: XCircle,
  enviar: Send,
  recibir: Package,
  otro: Activity,
};

// Colores por tipo de acción
const actionColors: Record<string, string> = {
  crear: "bg-green-500",
  actualizar: "bg-blue-500",
  eliminar: "bg-red-500",
  cambiar_estado: "bg-yellow-500",
  comentar: "bg-purple-500",
  asignar: "bg-indigo-500",
  completar: "bg-emerald-500",
  cancelar: "bg-orange-500",
  enviar: "bg-cyan-500",
  recibir: "bg-teal-500",
  otro: "bg-gray-500",
};

// Iconos por tipo de entidad
const entityIcons: Record<string, React.ElementType> = {
  cliente: Users,
  producto: Package,
  servicio: Wrench,
  servicio_tecnico: Wrench,
  factura: FileText,
  presupuesto: FileText,
  pedido: Package,
  equipo: Box,
  equipo_unidad: Box,
  laboratorio: Building2,
  persona: Users,
  comodato: FileText,
  movimiento: RefreshCw,
  alerta: AlertTriangle,
  tarea: CheckCircle,
  usuario: Users,
  configuracion: Activity,
  otro: Activity,
};

// Labels en español
const actionLabels: Record<string, string> = {
  crear: "Creación",
  actualizar: "Actualización",
  eliminar: "Eliminación",
  cambiar_estado: "Cambio de estado",
  comentar: "Comentario",
  asignar: "Asignación",
  completar: "Completado",
  cancelar: "Cancelación",
  enviar: "Envío",
  recibir: "Recepción",
  otro: "Otro",
};

const entityLabels: Record<string, string> = {
  cliente: "Clientes",
  producto: "Productos",
  servicio: "Servicios",
  servicio_tecnico: "Servicios Técnicos",
  factura: "Facturas",
  presupuesto: "Presupuestos",
  pedido: "Pedidos",
  equipo: "Equipos",
  equipo_unidad: "Unidades de Equipo",
  laboratorio: "Laboratorios",
  persona: "Personas",
  comodato: "Comodatos",
  movimiento: "Movimientos",
  alerta: "Alertas",
  tarea: "Tareas",
  usuario: "Usuarios",
  configuracion: "Configuración",
  envio: "Envíos",
  orden_compra: "Órdenes de Compra",
  otro: "Otros",
};

interface ActivityItem {
  id: string;
  usuario_id: string | null;
  usuario_nombre: string;
  usuario_email?: string;
  accion: string;
  entidad_tipo: string;
  entidad_id: string;
  entidad_nombre: string | null;
  descripcion: string;
  datos_anteriores: Record<string, any> | null;
  datos_nuevos: Record<string, any> | null;
  metadata: Record<string, any>;
  visible_cliente: boolean;
  importante: boolean;
  created_at: string;
}

interface ActivityResponse {
  data: ActivityItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface StatsResponse {
  total: number;
  byEntity: { entidad_tipo: string; total: string }[];
  byAction: { accion: string; total: string }[];
  byUser: { usuario_nombre: string; usuario_id: string; total: string }[];
  byDay: { fecha: string; total: string }[];
  recentImportant: ActivityItem[];
  period: string;
}

function ActivityItemCard({
  item,
  expanded,
  onToggle,
}: {
  item: ActivityItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ActionIcon = actionIcons[item.accion] || Activity;
  const EntityIcon = entityIcons[item.entidad_tipo] || Activity;
  const actionColor = actionColors[item.accion] || "bg-gray-500";

  const hasDetails = item.datos_anteriores || item.datos_nuevos;

  return (
    <div
      className={cn(
        "border rounded-lg p-4 transition-all",
        item.importante && "border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icono de acción */}
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0",
            actionColor
          )}
        >
          <ActionIcon className="w-5 h-5" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{item.descripcion}</span>
            {item.importante && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                Importante
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <EntityIcon className="w-3.5 h-3.5" />
              <span>{entityLabels[item.entidad_tipo] || item.entidad_tipo}</span>
            </div>
            {item.entidad_nombre && (
              <>
                <span>-</span>
                <span className="truncate max-w-[200px]">{item.entidad_nombre}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{item.usuario_nombre}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span title={format(new Date(item.created_at), "PPpp", { locale: es })}>
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Botón de detalles */}
        {hasDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="shrink-0"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Detalles expandibles */}
      {hasDetails && expanded && (
        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
          {item.datos_anteriores && Object.keys(item.datos_anteriores).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Valores anteriores
              </h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(item.datos_anteriores, null, 2)}
              </pre>
            </div>
          )}
          {item.datos_nuevos && Object.keys(item.datos_nuevos).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Valores nuevos
              </h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(item.datos_nuevos, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActividadPageClient() {
  const [search, setSearch] = useState("");
  const [entidadTipo, setEntidadTipo] = useState<string>("");
  const [accion, setAccion] = useState<string>("");
  const [soloImportantes, setSoloImportantes] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Build query string
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (entidadTipo) params.set("entidad_tipo", entidadTipo);
    if (accion) params.set("accion", accion);
    if (soloImportantes) params.set("importante", "true");
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    return params.toString();
  }, [search, entidadTipo, accion, soloImportantes, limit, offset]);

  const { data, error, isLoading, mutate } = useSWR<ActivityResponse>(
    `/api/actividad?${queryParams}`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: stats } = useSWR<StatsResponse>(
    "/api/actividad/stats?days=30",
    fetcher
  );

  const activities = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registro de Actividad</h1>
          <p className="text-muted-foreground">
            Historial completo de acciones en el sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Últimos {stats.period}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usuarios Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byUser.length}</div>
              <p className="text-xs text-muted-foreground">Con actividad reciente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Entidad más activa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {stats.byEntity[0]?.entidad_tipo || "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byEntity[0]?.total || 0} acciones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Acción más común
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {actionLabels[stats.byAction[0]?.accion] || "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byAction[0]?.total || 0} veces
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-64"
            />

            <Select
              value={entidadTipo}
              onValueChange={(v) => {
                setEntidadTipo(v === "all" ? "" : v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={accion}
              onValueChange={(v) => {
                setAccion(v === "all" ? "" : v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={soloImportantes ? "default" : "outline"}
              onClick={() => {
                setSoloImportantes(!soloImportantes);
                setOffset(0);
              }}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Solo importantes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Timeline de Actividad
          </CardTitle>
          <CardDescription>
            {pagination?.total || 0} actividades encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error al cargar actividades: {error.message}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron actividades
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => (
                <ActivityItemCard
                  key={item.id}
                  item={item}
                  expanded={expandedId === item.id}
                  onToggle={() =>
                    setExpandedId(expandedId === item.id ? null : item.id)
                  }
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {offset + 1} -{" "}
                {Math.min(offset + limit, pagination.total)} de {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => setOffset(offset + limit)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
