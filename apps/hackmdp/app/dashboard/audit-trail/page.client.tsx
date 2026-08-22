"use client";

import { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Search,
  Loader2,
  User,
  Calendar,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building2,
  Package,
  Receipt,
  Wrench,
  Box,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import useSWR from "swr";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_nombre: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  old_data: any | null;
  new_data: any | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditResponse {
  data: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
};

const ACTION_COLORS: Record<string, string> = {
  crear: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  actualizar: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  eliminar: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  ver: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  crear: <Plus className="h-3 w-3" />,
  actualizar: <Edit className="h-3 w-3" />,
  eliminar: <Trash2 className="h-3 w-3" />,
  ver: <Eye className="h-3 w-3" />,
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  cliente: <Building2 className="h-4 w-4" />,
  producto: <Package className="h-4 w-4" />,
  factura: <Receipt className="h-4 w-4" />,
  servicio: <Wrench className="h-4 w-4" />,
  equipo: <Box className="h-4 w-4" />,
  equipo_unidad: <Box className="h-4 w-4" />,
  proveedor: <Building2 className="h-4 w-4" />,
  presupuesto: <FileText className="h-4 w-4" />,
  pedido: <FileText className="h-4 w-4" />,
  pago: <Receipt className="h-4 w-4" />,
};

export default function AuditTrailPageClient() {
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const limit = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Build query URL
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));

    if (entityType && entityType !== "all") params.set("entity_type", entityType);
    if (action && action !== "all") params.set("action", action);
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);

    return `/api/audit-trail?${params.toString()}`;
  };

  const { data, isLoading, error, mutate: refreshData } = useSWR<AuditResponse>(
    buildUrl(),
    fetcher
  );

  // Get available filters
  const { data: filterOptions } = useSWR("/api/audit-trail", (url) =>
    fetch(url, { method: "OPTIONS" }).then((r) => r.json())
  );

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const formatAction = (action: string) => {
    const labels: Record<string, string> = {
      crear: "Creó",
      actualizar: "Actualizó",
      eliminar: "Eliminó",
      ver: "Vió",
    };
    return labels[action] || action;
  };

  const formatEntityType = (type: string) => {
    const labels: Record<string, string> = {
      cliente: "Cliente",
      producto: "Producto",
      factura: "Factura",
      servicio: "Servicio",
      equipo: "Equipo",
      equipo_unidad: "Equipo Unidad",
      proveedor: "Proveedor",
      presupuesto: "Presupuesto",
      pedido: "Pedido",
      pago: "Pago",
      nota_credito: "Nota de Crédito",
      ivr: "IVR",
      laboratorio: "Laboratorio",
      persona: "Persona",
    };
    return labels[type] || type;
  };

  const renderChanges = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;

    // For create action, show new data
    if (!oldData && newData) {
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Datos creados:
          </p>
          <pre className="text-xs bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded overflow-auto max-h-[200px]">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </div>
      );
    }

    // For delete action, show old data
    if (oldData && !newData) {
      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            Datos eliminados:
          </p>
          <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-[200px]">
            {JSON.stringify(oldData, null, 2)}
          </pre>
        </div>
      );
    }

    // For update action, show diff
    if (oldData && newData) {
      const changes: { field: string; old: any; new: any }[] = [];

      // Find changed fields
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      allKeys.forEach((key) => {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          changes.push({
            field: key,
            old: oldData[key],
            new: newData[key],
          });
        }
      });

      if (changes.length === 0) {
        return (
          <p className="text-xs text-muted-foreground">No se detectaron cambios</p>
        );
      }

      return (
        <div className="space-y-2">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Cambios ({changes.length}):
          </p>
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {changes.map((change, idx) => (
              <div
                key={idx}
                className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
              >
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {change.field}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-1 bg-red-50 dark:bg-red-900/20 rounded">
                    <span className="text-red-600 dark:text-red-400">
                      {JSON.stringify(change.old)}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex-1 p-1 bg-emerald-50 dark:bg-emerald-900/20 rounded">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {JSON.stringify(change.new)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-purple-600" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registro completo de todas las acciones realizadas en el sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => refreshData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de entidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las entidades</SelectItem>
                {filterOptions?.entity_types?.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {formatEntityType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={action}
              onValueChange={(v) => {
                setAction(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {filterOptions?.actions?.map((act: string) => (
                  <SelectItem key={act} value={act}>
                    {formatAction(act)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="w-[160px]"
              placeholder="Desde"
            />

            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="w-[160px]"
              placeholder="Hasta"
            />

            {(entityType !== "all" ||
              action !== "all" ||
              fromDate ||
              toDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEntityType("all");
                  setAction("all");
                  setFromDate("");
                  setToDate("");
                  setPage(0);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Registros de Auditoría</CardTitle>
            {pagination && (
              <p className="text-sm text-muted-foreground">
                Mostrando {page * limit + 1} -{" "}
                {Math.min((page + 1) * limit, pagination.total)} de{" "}
                {pagination.total}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-red-500 mb-3" />
              <h3 className="font-medium">Error al cargar registros</h3>
              <p className="text-sm text-muted-foreground">
                No se pudieron obtener los registros de auditoría
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="font-medium">No hay registros</h3>
              <p className="text-sm text-muted-foreground">
                No se encontraron registros con los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      ACTION_COLORS[log.action] || ACTION_COLORS.ver
                    }`}
                  >
                    {ENTITY_ICONS[log.entity_type] || (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`text-[10px] ${
                          ACTION_COLORS[log.action] || ACTION_COLORS.ver
                        }`}
                      >
                        {ACTION_ICONS[log.action]}
                        <span className="ml-1">{formatAction(log.action)}</span>
                      </Badge>
                      <span className="font-medium text-sm">
                        {formatEntityType(log.entity_type)}
                      </span>
                      {log.entity_name && (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          "{log.entity_name}"
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user_nombre || log.user_email || "Sistema"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {Math.ceil(pagination.total / limit)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasMore}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Detalle de Registro
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Acción</p>
                    <Badge
                      className={`mt-1 ${
                        ACTION_COLORS[selectedLog.action] || ACTION_COLORS.ver
                      }`}
                    >
                      {ACTION_ICONS[selectedLog.action]}
                      <span className="ml-1">
                        {formatAction(selectedLog.action)}
                      </span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entidad</p>
                    <p className="font-medium mt-1">
                      {formatEntityType(selectedLog.entity_type)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="font-medium mt-1">
                      {selectedLog.entity_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ID</p>
                    <p className="font-mono text-xs mt-1">
                      {selectedLog.entity_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Usuario</p>
                    <p className="font-medium mt-1">
                      {selectedLog.user_nombre || selectedLog.user_email || "Sistema"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="font-medium mt-1">
                      {format(
                        new Date(selectedLog.created_at),
                        "dd/MM/yyyy HH:mm:ss",
                        { locale: es }
                      )}
                    </p>
                  </div>
                  {selectedLog.ip_address && (
                    <div>
                      <p className="text-xs text-muted-foreground">IP</p>
                      <p className="font-mono text-xs mt-1">
                        {selectedLog.ip_address}
                      </p>
                    </div>
                  )}
                </div>

                {/* Changes */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Datos</h4>
                  {renderChanges(selectedLog.old_data, selectedLog.new_data)}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
