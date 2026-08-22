import type { LucideIcon } from "lucide-react";

/**
 * Configuración de un campo para mostrar en la tarjeta móvil
 */
export interface MobileCardField {
  /** Clave del campo en el objeto de datos (soporta nested paths: "cliente.nombre") */
  key: string;
  /** Etiqueta visible del campo (opcional) */
  label?: string;
  /** Posición del campo en el layout de la tarjeta */
  position: "title" | "subtitle" | "badge" | "detail" | "footer";
  /** Función de renderizado personalizada - usa any para flexibilidad con tipos de datos dinámicos */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: any) => React.ReactNode;
  /** Ícono para campos de tipo detail */
  icon?: LucideIcon;
  /** Clase CSS adicional para el campo */
  className?: string;
}

/**
 * Tipos de acciones rápidas disponibles
 */
export type QuickActionType = "phone" | "email" | "whatsapp" | "custom";

/**
 * Configuración de una acción rápida en la tarjeta
 */
export interface MobileQuickAction<T = unknown> {
  /** Tipo de acción */
  type: QuickActionType;
  /** Etiqueta de la acción */
  label: string;
  /** Ícono de la acción */
  icon: LucideIcon;
  /** Campo del cual obtener el valor (para phone/email/whatsapp) */
  valueField?: string;
  /** Handler personalizado para acciones custom */
  onAction?: (row: T) => void;
  /** Condición para mostrar la acción */
  showIf?: (row: T) => boolean;
}

/**
 * Configuración completa de la vista móvil de tarjetas
 */
export interface MobileCardConfig<T = unknown> {
  /** Campos a mostrar en la tarjeta */
  fields: MobileCardField[];
  /** Acciones rápidas (llamar, email, whatsapp) */
  quickActions?: MobileQuickAction<T>[];
  /** Función para obtener el color del borde izquierdo */
  getBorderColor?: (row: T) => string | null;
  /** Configuración del avatar/ícono principal */
  avatar?: {
    /** Campo para obtener la inicial o imagen */
    field?: string;
    /** Ícono de fallback */
    fallbackIcon?: LucideIcon;
    /** Función para obtener el color de fondo */
    colorFn?: (row: T) => string;
  };
}

/**
 * Configuración de un filtro rápido para la vista móvil
 */
export interface MobileQuickFilter {
  /** ID único del filtro */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** Campo al que aplica el filtro */
  field: string;
  /** Valor del filtro */
  value: string;
  /** Color del chip (opcional) */
  color?: string;
}

/**
 * Props para el componente MobileDataCard
 */
export interface MobileDataCardProps<T = unknown> {
  /** Datos de la fila */
  data: T;
  /** Configuración de la tarjeta */
  config: MobileCardConfig<T>;
  /** Handler de click en la tarjeta */
  onClick?: (data: T) => void;
  /** Si la tarjeta está seleccionada */
  isSelected?: boolean;
  /** Si está cargando */
  isLoading?: boolean;
}

/**
 * Swipe action configuration (left or right reveal)
 */
export interface MobileSwipeAction<T = unknown> {
  icon: LucideIcon;
  label: string;
  /** Tailwind bg class, e.g. "bg-emerald-500" */
  color: string;
  onAction: (row: T) => void;
  /** Conditional — hide the action for some rows */
  showIf?: (row: T) => boolean;
}

/**
 * Props para el componente MobileListView
 */
export interface MobileListViewProps<T = unknown> {
  /** Datos a mostrar */
  data: T[];
  /** Configuración de las tarjetas */
  cardConfig: MobileCardConfig<T>;
  /** Handler de click en una tarjeta */
  onRowClick?: (row: T) => void;
  /** Placeholder del input de búsqueda */
  searchPlaceholder?: string;
  /** Valor de búsqueda (client-side) */
  searchValue?: string;
  /** Handler de cambio de búsqueda (client-side) */
  onSearchChange?: (value: string) => void;
  /** Handler de búsqueda server-side */
  onServerSearch?: (search: string) => void;
  /** Valor de búsqueda server-side */
  serverSearchValue?: string;
  /** Filtros rápidos disponibles */
  quickFilters?: MobileQuickFilter[];
  /** Filtros activos */
  activeFilters?: string[];
  /** Handler de cambio de filtros */
  onFilterChange?: (filters: string[]) => void;
  /** Configuración de paginación server-side */
  serverSidePagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  /** Handler para crear nuevo registro */
  onNew?: () => void;
  /** Handler para refrescar datos */
  onRefresh?: () => void;
  /** Estado de carga */
  isLoading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Título de la lista */
  title?: string;
  /** Swipe action revealed by swiping right (positive action) */
  swipeLeftAction?: MobileSwipeAction<T>;
  /** Swipe action revealed by swiping left (destructive/secondary) */
  swipeRightAction?: MobileSwipeAction<T>;
}
