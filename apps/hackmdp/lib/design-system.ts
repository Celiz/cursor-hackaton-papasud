/**
 * Sistema de Diseño Gestie - High Density UI + Material Design 3
 *
 * Combina la eficiencia del High Density UI (Supabase/Linear) con
 * los principios visuales de Material Design 3:
 * - Superficies con tintes de color (tinted surfaces)
 * - Elevación con color en lugar de sombras pesadas
 * - Esquinas redondeadas más prominentes
 * - Paleta de colores vibrante pero equilibrada
 */

/**
 * PALETA DE COLORES
 * Uso: Color solo en íconos (10% opacity), bordes sutiles, y badges
 */
export const colors = {
  // Primario
  primary: {
    DEFAULT: 'purple-600',
    hover: 'purple-700',
    light: 'purple-100',
    dark: 'purple-900',
  },

  // Acentos por categoría
  accents: {
    email: 'pink-600',
    wait: 'blue-600',
    condition: 'amber-600',
    tag: 'emerald-600',
    list: 'orange-600',
    task: 'red-600',
    success: 'emerald-600',
    warning: 'amber-600',
    error: 'red-600',
    info: 'blue-600',
  },

  // Neutrales
  neutral: {
    50: 'gray-50',
    100: 'gray-100',
    200: 'gray-200',
    300: 'gray-300',
    600: 'gray-600',
    900: 'gray-900',
  },
};

/**
 * TYPOGRAPHY SCALE
 */
export const typography = {
  // Dialog/Page titles
  h1: 'text-lg font-semibold text-gray-900 dark:text-gray-100',

  // Section headers
  h2: 'text-sm font-semibold text-gray-900 dark:text-gray-100',

  // Card titles
  h3: 'text-sm font-semibold text-gray-900 dark:text-gray-100',

  // Body text
  body: 'text-sm font-medium text-gray-900 dark:text-gray-100',

  // Labels
  label: 'text-sm font-medium text-gray-900 dark:text-gray-100',

  // Descriptions
  description: 'text-xs text-gray-600 dark:text-gray-400',

  // Small/metadata
  small: 'text-xs text-gray-600 dark:text-gray-400',

  // Code
  code: 'text-xs font-mono text-gray-700 dark:text-gray-300',
};

/**
 * SPACING SYSTEM (múltiplos de 4px)
 */
export const spacing = {
  1: 'gap-1', // 4px
  1.5: 'gap-1.5', // 6px
  2: 'gap-2', // 8px
  3: 'gap-3', // 12px
  4: 'gap-4', // 16px
  6: 'gap-6', // 24px
};

/**
 * COMPONENT SIZES
 */
export const sizes = {
  input: {
    height: 'h-10', // 40px - más grande para mejor UX
    text: 'text-sm',
  },
  button: {
    primary: 'h-9 px-4 text-sm',
    secondary: 'h-9 px-3 text-sm',
    icon: 'h-8 w-8 p-0',
  },
  card: {
    padding: 'p-4', // 16px
  },
  dialog: {
    padding: 'p-6', // 24px - más espacio
    sm: 'sm:max-w-[500px]',   // Quick dialogs
    md: 'sm:max-w-[650px]',   // Standard forms
    lg: 'sm:max-w-[800px]',   // Main forms (default)
    xl: 'sm:max-w-[1000px]',  // Complex forms with tables
  },
  sheet: {
    padding: 'p-4', // 16px
  },
};

/**
 * CLASES REUTILIZABLES - DIALOG (Material Design 3)
 * Estilo limpio y claro para mejor legibilidad
 */
export const dialogClasses = {
  // Dialog container - fondo limpio, sin gradientes oscuros
  content: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl',

  // Dialog header - simple y limpio
  header: 'border-b border-gray-200 dark:border-gray-800 pb-3',
  title: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  description: 'text-sm text-gray-600 dark:text-gray-400 mt-1',

  // Dialog footer
  footer: 'border-t border-gray-200 dark:border-gray-800 pt-3 gap-2',

  // Buttons en footer
  cancelButton: 'h-8 px-3 text-sm border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-lg',
  primaryButton: 'h-8 px-4 text-sm bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 shadow-md rounded-lg transition-all',
};

/**
 * CLASES REUTILIZABLES - SHEET (Material Design 3)
 */
export const sheetClasses = {
  // Sheet content - superficie con gradiente sutil
  content: 'bg-gradient-to-br from-white via-white to-purple-50/20 dark:from-gray-950 dark:via-gray-950 dark:to-purple-950/10',

  // Sheet header - con tinte de color
  header: 'border-b border-purple-200/50 dark:border-purple-800/30 pb-3 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-950/10 dark:to-transparent',
  title: 'text-lg font-semibold bg-gradient-to-r from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300 bg-clip-text text-transparent',
  description: 'text-sm text-gray-600 dark:text-gray-400 mt-1',

  // Tabs dentro de sheet - Material Design 3
  tabsList: 'grid w-full bg-gradient-to-br from-purple-100/50 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-900/20 p-1.5 rounded-2xl h-11 border border-purple-200/30 dark:border-purple-800/20',
  tabsTrigger: 'rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/30 transition-all duration-200 text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:bg-white/50 dark:hover:bg-gray-900/50 h-8',
};

/**
 * CLASES REUTILIZABLES - FORM (Material Design 3)
 */
export const formClasses = {
  // Form container
  container: 'space-y-6 py-4',

  // Field group
  fieldGroup: 'space-y-2',

  // Two column grid
  twoColumns: 'grid grid-cols-1 md:grid-cols-2 gap-4',

  // Label - con color sutil
  label: 'text-sm font-medium text-gray-900 dark:text-gray-100',

  // Input - con bordes de color y transiciones (h-10 para mejor UX)
  input: 'h-10 text-sm border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl transition-all bg-white dark:bg-gray-900',

  // Textarea
  textarea: 'text-sm border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none rounded-xl transition-all bg-white dark:bg-gray-900 min-h-[100px]',

  // Select
  select: 'h-10 text-sm border-gray-200 dark:border-gray-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl transition-all bg-white dark:bg-gray-900',
  selectContent: 'border-gray-200 dark:border-gray-700 rounded-xl',
  selectItem: 'text-sm rounded-lg',

  // Info box - con gradiente y sombra
  infoBox: 'border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 shadow-sm shadow-blue-500/10',
  infoIcon: 'h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0',
  infoText: 'text-sm text-blue-900 dark:text-blue-100 leading-relaxed',

  // Section divider
  section: 'space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800',
  sectionTitle: 'text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide',
};

/**
 * CLASES REUTILIZABLES - CARD (Material Design 3)
 */
export const cardClasses = {
  // Card base - superficie elevada con tinte
  card: 'border border-purple-200/40 dark:border-purple-800/30 bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all rounded-xl',

  // Card content
  content: 'p-4',

  // Card con acento de color
  accentCard: (color: string) =>
    `border border-${color}-200/50 dark:border-${color}-900/40 bg-gradient-to-br from-white to-${color}-50/20 dark:from-gray-900 dark:to-${color}-950/10 shadow-sm hover:shadow-lg hover:shadow-${color}-500/10 transition-all rounded-xl`,
};

/**
 * CLASES REUTILIZABLES - TABLE
 */
export const tableClasses = {
  // Row height compacto
  row: 'h-12 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group',

  // Cell padding
  cell: 'px-3 py-2 text-sm text-gray-900 dark:text-gray-100',

  // Header
  header: 'h-10 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10',

  // Inline icon (16px)
  inlineIcon: 'w-4 h-4 flex-shrink-0',

  // Badge compacto
  badge: 'h-5 text-[11px] px-2',

  // Secondary text (collapsed)
  secondaryText: 'text-[11px] text-gray-600 dark:text-gray-400',

  // Code/ID text
  codeText: 'text-xs font-mono text-gray-700 dark:text-gray-300',

  // Inline actions (visible on hover)
  inlineActions: 'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1',

  // Action button compacto
  actionButton: 'h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800',
};

/**
 * UTILITY: Genera clases para icon background con acento
 */
export function getIconBgClass(color: string): string {
  return `bg-${color}-500/10 dark:bg-${color}-500/20`;
}

/**
 * UTILITY: Genera clases para icon color
 */
export function getIconColorClass(color: string): string {
  return `text-${color}-600 dark:text-${color}-400`;
}

/**
 * UTILITY: Genera clases para border con acento
 */
export function getBorderClass(color: string): string {
  return `border-${color}-200 dark:border-${color}-900/50`;
}

/**
 * UTILITY: Genera clases para hover border
 */
export function getHoverBorderClass(color: string): string {
  return `hover:border-${color}-300 dark:hover:border-${color}-800`;
}

/**
 * MATERIAL DESIGN 3 - SUPERFICIES Y ELEVACIONES
 */
export const md3Surfaces = {
  // Superficie elevada nivel 1 (cards, modales pequeños)
  elevated1: 'bg-gradient-to-br from-white to-purple-50/20 dark:from-gray-900 dark:to-purple-950/10 shadow-md shadow-purple-500/5 rounded-xl',

  // Superficie elevada nivel 2 (diálogos, sheets)
  elevated2: 'bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-950 dark:to-purple-950/10 shadow-xl shadow-purple-500/10 rounded-2xl',

  // Superficie elevada nivel 3 (popovers, tooltips)
  elevated3: 'bg-gradient-to-br from-white to-purple-50/40 dark:from-gray-950 dark:to-purple-950/15 shadow-2xl shadow-purple-500/20 rounded-2xl',

  // Superficie con tinte (para headers, sidebars)
  tinted: 'bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/30 dark:border-purple-800/20',

  // Superficie de contenedor (backgrounds principales)
  container: 'bg-gradient-to-br from-gray-50 to-purple-50/20 dark:from-gray-950 dark:to-purple-950/5',
};

/**
 * MATERIAL DESIGN 3 - ESTADOS INTERACTIVOS
 */
export const md3States = {
  // Hover state
  hover: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20 hover:shadow-md hover:shadow-purple-500/10 transition-all duration-200',

  // Active/Pressed state
  active: 'active:scale-[0.98] active:shadow-sm transition-transform',

  // Focus state
  focus: 'focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all',

  // Disabled state
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale',
};

/**
 * BOTONES DE ACCIÓN SECUNDARIA
 * Estilo preferido del usuario: botones sutiles con bordes zinc
 * Usar iconos con color para diferenciar acciones
 *
 * Ejemplo de uso:
 * <Button
 *   className={buttonStyles.subtle}
 *   icon={<CreditCard className="text-green-600" />}
 * >
 *   Cobro
 * </Button>
 */
export const buttonStyles = {
  // Botón sutil - estilo preferido para acciones secundarias
  // Borde zinc neutro, hover suave, texto zinc
  // Los iconos llevan el color de la acción (ej: text-green-600, text-emerald-600)
  subtle: 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors',

  // Variante expandida (cuando está activo un dropdown)
  subtleExpanded: 'bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-sm text-zinc-700 dark:text-zinc-300',
};
