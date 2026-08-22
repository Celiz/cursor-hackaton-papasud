"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface ServicioFilters {
  estado?: string;
  tecnico?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  garantia?: boolean;
  facturado?: boolean;
}

interface ServiciosAdvancedFiltersProps {
  filters: ServicioFilters;
  onFiltersChange: (filters: ServicioFilters) => void;
  tecnicos?: string[];
}

export function ServiciosAdvancedFilters({
  filters,
  onFiltersChange,
  tecnicos = [],
}: ServiciosAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof ServicioFilters] !== undefined && filters[key as keyof ServicioFilters] !== ""
  ).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const removeFilter = (key: keyof ServicioFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const estados = [
    "Ingresado",
    "En Diagnóstico",
    "En Reparación",
    "Listo/Reparado",
    "Entregar/Enviar",
    "Completado",
    "Cancelado",
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avanzados
              {activeFiltersCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Filtros Avanzados</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto p-1 text-xs"
                  >
                    Limpiar todo
                  </Button>
                )}
              </div>

              <Separator />

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={filters.estado || ""}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, estado: value || undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {estados.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Técnico */}
              {tecnicos.length > 0 && (
                <div className="space-y-2">
                  <Label>Técnico</Label>
                  <Select
                    value={filters.tecnico || ""}
                    onValueChange={(value) =>
                      onFiltersChange({ ...filters, tecnico: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los técnicos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {tecnicos.map((tecnico) => (
                        <SelectItem key={tecnico} value={tecnico}>
                          {tecnico}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Rango de Fechas */}
              <div className="space-y-2">
                <Label>Rango de Fechas</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <Input
                      type="date"
                      value={filters.fechaDesde || ""}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          fechaDesde: e.target.value || undefined,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <Input
                      type="date"
                      value={filters.fechaHasta || ""}
                      onChange={(e) =>
                        onFiltersChange({
                          ...filters,
                          fechaHasta: e.target.value || undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Garantía */}
              <div className="space-y-2">
                <Label>Garantía</Label>
                <Select
                  value={
                    filters.garantia === undefined
                      ? ""
                      : filters.garantia
                      ? "si"
                      : "no"
                  }
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      garantia:
                        value === "" ? undefined : value === "si" ? true : false,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="si">Con garantía</SelectItem>
                    <SelectItem value="no">Sin garantía</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Facturado */}
              <div className="space-y-2">
                <Label>Estado de Facturación</Label>
                <Select
                  value={
                    filters.facturado === undefined
                      ? ""
                      : filters.facturado
                      ? "si"
                      : "no"
                  }
                  onValueChange={(value) =>
                    onFiltersChange({
                      ...filters,
                      facturado:
                        value === "" ? undefined : value === "si" ? true : false,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="si">Facturado</SelectItem>
                    <SelectItem value="no">No facturado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filters Pills */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {filters.estado && (
              <Badge variant="secondary" className="gap-1">
                Estado: {filters.estado}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("estado")}
                />
              </Badge>
            )}
            {filters.tecnico && (
              <Badge variant="secondary" className="gap-1">
                Técnico: {filters.tecnico}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("tecnico")}
                />
              </Badge>
            )}
            {filters.fechaDesde && (
              <Badge variant="secondary" className="gap-1">
                Desde: {filters.fechaDesde}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("fechaDesde")}
                />
              </Badge>
            )}
            {filters.fechaHasta && (
              <Badge variant="secondary" className="gap-1">
                Hasta: {filters.fechaHasta}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("fechaHasta")}
                />
              </Badge>
            )}
            {filters.garantia !== undefined && (
              <Badge variant="secondary" className="gap-1">
                {filters.garantia ? "Con garantía" : "Sin garantía"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("garantia")}
                />
              </Badge>
            )}
            {filters.facturado !== undefined && (
              <Badge variant="secondary" className="gap-1">
                {filters.facturado ? "Facturado" : "No facturado"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => removeFilter("facturado")}
                />
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
