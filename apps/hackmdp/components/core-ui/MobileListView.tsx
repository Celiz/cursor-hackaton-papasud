"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileDataCard, MobileDataCardSkeleton } from "./MobileDataCard";
import { SwipeableListItem } from "@/components/ui/swipeable-list-item";
import type { MobileListViewProps } from "@/lib/types/mobile-card";
import {
  Search,
  X,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Componente de lista para vista móvil
 * Incluye búsqueda, filtros y paginación optimizados para móvil
 */
export function MobileListView<T extends Record<string, unknown>>({
  data,
  cardConfig,
  onRowClick,
  searchPlaceholder = "Buscar...",
  searchValue: externalSearchValue,
  onSearchChange: externalOnSearchChange,
  onServerSearch,
  serverSearchValue,
  quickFilters,
  activeFilters = [],
  onFilterChange,
  serverSidePagination,
  onNew,
  onRefresh,
  isLoading = false,
  emptyMessage = "No se encontraron resultados",
  title,
  swipeLeftAction,
  swipeRightAction,
}: MobileListViewProps<T>) {
  // Estado local de búsqueda (si no se proporciona externamente)
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const searchValue = externalSearchValue ?? internalSearchValue;
  const setSearchValue = externalOnSearchChange ?? setInternalSearchValue;

  // Debounce para server search
  const debouncedSearch = useDebounce(searchValue, 300);

  // Efecto para búsqueda en servidor
  useMemo(() => {
    if (onServerSearch && debouncedSearch !== serverSearchValue) {
      onServerSearch(debouncedSearch);
    }
  }, [debouncedSearch, onServerSearch, serverSearchValue]);

  // Filtrado local (si no hay server-side)
  const filteredData = useMemo(() => {
    if (onServerSearch) return data; // Server-side filtering

    let result = data;

    // Filtro por búsqueda local
    if (searchValue && !onServerSearch) {
      const search = searchValue.toLowerCase();
      result = result.filter((item) => {
        return Object.values(item).some((value) => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(search);
        });
      });
    }

    // Filtros rápidos
    if (activeFilters.length > 0 && quickFilters) {
      result = result.filter((item) => {
        return activeFilters.some((filterId) => {
          const filter = quickFilters.find((f) => f.id === filterId);
          if (!filter) return true;
          const value = item[filter.field];
          return String(value).toLowerCase() === filter.value.toLowerCase();
        });
      });
    }

    return result;
  }, [data, searchValue, onServerSearch, activeFilters, quickFilters]);

  // Toggle de filtro
  const toggleFilter = useCallback(
    (filterId: string) => {
      if (!onFilterChange) return;
      if (activeFilters.includes(filterId)) {
        onFilterChange(activeFilters.filter((f) => f !== filterId));
      } else {
        onFilterChange([...activeFilters, filterId]);
      }
    },
    [activeFilters, onFilterChange]
  );

  // Limpiar búsqueda
  const clearSearch = useCallback(() => {
    setSearchValue("");
    if (onServerSearch) {
      onServerSearch("");
    }
  }, [setSearchValue, onServerSearch]);

  // Paginación
  const { page, pageSize, totalCount, totalPages, onPageChange } =
    serverSidePagination || {};

  const showPagination = serverSidePagination && totalPages && totalPages > 1;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* Header con búsqueda */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 space-y-3">
        {/* Título y acciones */}
        {(title || onNew || onRefresh) && (
          <div className="flex items-center justify-between">
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h1>
            )}
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="h-9 w-9"
                >
                  <RefreshCw
                    className={cn("w-4 h-4", isLoading && "animate-spin")}
                  />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Input de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-9 h-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Filtros rápidos */}
        {quickFilters && quickFilters.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {quickFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant={activeFilters.includes(filter.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer whitespace-nowrap transition-colors",
                  activeFilters.includes(filter.id)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={() => toggleFilter(filter.id)}
              >
                {filter.label}
              </Badge>
            ))}
            {activeFilters.length > 0 && (
              <Badge
                variant="outline"
                className="cursor-pointer text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => onFilterChange?.([])}
              >
                Limpiar
              </Badge>
            )}
          </div>
        )}

        {/* Contador de resultados */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isLoading ? (
            "Cargando..."
          ) : serverSidePagination ? (
            `${totalCount} resultado${totalCount !== 1 ? "s" : ""}`
          ) : (
            `${filteredData.length} resultado${filteredData.length !== 1 ? "s" : ""}`
          )}
        </div>
      </div>

      {/* Lista de cards */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          // Loading skeletons
          <div>
            {Array.from({ length: 5 }).map((_, i) => (
              <MobileDataCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
            {searchValue && (
              <Button
                variant="link"
                onClick={clearSearch}
                className="mt-2 text-primary"
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          // Cards
          <div>
            {filteredData.map((item, index) => {
              const LeftIcon = swipeLeftAction?.icon;
              const RightIcon = swipeRightAction?.icon;
              const showLeft = swipeLeftAction && (!swipeLeftAction.showIf || swipeLeftAction.showIf(item));
              const showRight = swipeRightAction && (!swipeRightAction.showIf || swipeRightAction.showIf(item));
              const leftAction = showLeft && LeftIcon ? {
                icon: <LeftIcon className="h-5 w-5" />,
                label: swipeLeftAction!.label,
                color: swipeLeftAction!.color,
                onAction: () => swipeLeftAction!.onAction(item),
              } : undefined;
              const rightAction = showRight && RightIcon ? {
                icon: <RightIcon className="h-5 w-5" />,
                label: swipeRightAction!.label,
                color: swipeRightAction!.color,
                onAction: () => swipeRightAction!.onAction(item),
              } : undefined;

              return (
                <SwipeableListItem
                  key={(item.id as string) || index}
                  leftAction={leftAction}
                  rightAction={rightAction}
                  disabled={!leftAction && !rightAction}
                >
                  <MobileDataCard
                    data={item}
                    config={cardConfig}
                    onClick={onRowClick}
                  />
                </SwipeableListItem>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Paginación */}
      {showPagination && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page! - 1)}
              disabled={page === 1 || isLoading}
              className="h-9"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page! + 1)}
              disabled={page === totalPages || isLoading}
              className="h-9"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* FAB para nuevo registro */}
      {onNew && (
        <Button
          onClick={onNew}
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-20"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}

export default MobileListView;
