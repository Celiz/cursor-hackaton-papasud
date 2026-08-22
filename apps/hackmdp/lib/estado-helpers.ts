export type EstadoPreset = "En Orden" | "Potencial" | "Inactivo";

export interface EstadoStyle {
  label: string;
  dotClass: string;
  badgeClass: string;
  borderColor: string;
  isPreset: boolean;
  isWarning: boolean;
}

export const ESTADO_PRESETS: EstadoPreset[] = ["En Orden", "Potencial", "Inactivo"];

const PRESET_STYLES: Record<EstadoPreset, Omit<EstadoStyle, "label" | "isPreset" | "isWarning">> = {
  "En Orden": {
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    borderColor: "#10b981",
  },
  "Potencial": {
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    borderColor: "#3b82f6",
  },
  "Inactivo": {
    dotClass: "bg-gray-400",
    badgeClass: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-500/15 dark:text-gray-400 dark:border-gray-500/30",
    borderColor: "#9ca3af",
  },
};

const WARNING_STYLE = {
  dotClass: "bg-amber-500",
  badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  borderColor: "#f59e0b",
};

const EMPTY_STYLE = {
  dotClass: "bg-gray-300",
  badgeClass: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20",
  borderColor: "#d1d5db",
};

export function matchPreset(raw: string | null | undefined): EstadoPreset | null {
  if (!raw) return null;
  const norm = raw.trim().toLowerCase();
  for (const preset of ESTADO_PRESETS) {
    if (preset.toLowerCase() === norm) return preset;
  }
  return null;
}

export function getEstadoStyle(raw: string | null | undefined): EstadoStyle {
  const value = raw?.trim() || "";

  if (!value) {
    return { label: "Sin estado", ...EMPTY_STYLE, isPreset: false, isWarning: false };
  }

  const preset = matchPreset(value);
  if (preset) {
    return { label: preset, ...PRESET_STYLES[preset], isPreset: true, isWarning: false };
  }

  return { label: value, ...WARNING_STYLE, isPreset: false, isWarning: true };
}
