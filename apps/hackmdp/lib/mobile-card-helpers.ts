import { Phone, Mail, MessageCircle } from "lucide-react";
import type { MobileQuickAction } from "./types/mobile-card";

/**
 * Obtiene un valor de un objeto usando una ruta con puntos
 * Ejemplo: getNestedValue(obj, "cliente.nombre") => obj.cliente.nombre
 */
export function getNestedValue<T = unknown>(
  obj: unknown,
  path: string
): T | undefined {
  if (!obj || !path) return undefined;

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

/**
 * Formatea un valor de moneda
 */
export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formatea una fecha
 */
export function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formatea una fecha con hora
 */
export function formatDateTime(value: unknown): string {
  if (!value) return "-";
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Formatea una fecha relativa (hace 2 días, etc.)
 */
export function formatRelativeDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(value as string);
  if (isNaN(date.getTime())) return "-";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}

/**
 * Limpia un número de teléfono para usar en URLs
 */
export function cleanPhoneNumber(phone: unknown): string {
  if (!phone || typeof phone !== "string") return "";
  // Elimina todo excepto números y el signo +
  return phone.replace(/[^\d+]/g, "");
}

/**
 * Generadores de acciones rápidas comunes
 */
export const mobileQuickActions = {
  /**
   * Acción de llamada telefónica
   */
  phone: <T = unknown>(phoneField: string): MobileQuickAction<T> => ({
    type: "phone",
    label: "Llamar",
    icon: Phone,
    valueField: phoneField,
    showIf: (row: T) => {
      const value = getNestedValue(row, phoneField);
      return !!value && typeof value === "string" && value.trim().length > 0;
    },
  }),

  /**
   * Acción de email
   */
  email: <T = unknown>(emailField: string): MobileQuickAction<T> => ({
    type: "email",
    label: "Email",
    icon: Mail,
    valueField: emailField,
    showIf: (row: T) => {
      const value = getNestedValue(row, emailField);
      return !!value && typeof value === "string" && value.includes("@");
    },
  }),

  /**
   * Acción de WhatsApp
   */
  whatsapp: <T = unknown>(phoneField: string): MobileQuickAction<T> => ({
    type: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    valueField: phoneField,
    showIf: (row: T) => {
      const value = getNestedValue(row, phoneField);
      return !!value && typeof value === "string" && value.trim().length > 0;
    },
  }),
};

/**
 * Ejecuta una acción rápida
 */
export function executeQuickAction<T>(
  action: MobileQuickAction<T>,
  row: T
): void {
  if (action.type === "custom" && action.onAction) {
    action.onAction(row);
    return;
  }

  if (!action.valueField) return;
  const value = getNestedValue<string>(row, action.valueField);
  if (!value) return;

  switch (action.type) {
    case "phone": {
      const cleanPhone = cleanPhoneNumber(value);
      if (cleanPhone) {
        window.location.href = `tel:${cleanPhone}`;
      }
      break;
    }
    case "email": {
      if (value.includes("@")) {
        window.location.href = `mailto:${value}`;
      }
      break;
    }
    case "whatsapp": {
      const cleanPhone = cleanPhoneNumber(value);
      if (cleanPhone) {
        // Asegurar formato internacional (Argentina)
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith("+")) {
          formattedPhone = `+54${formattedPhone}`;
        }
        window.open(`https://wa.me/${formattedPhone.replace("+", "")}`, "_blank");
      }
      break;
    }
  }
}

/**
 * Obtiene las iniciales de un nombre
 */
export function getInitials(name: unknown): string {
  if (!name || typeof name !== "string") return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Colores para avatares basados en string
 */
const avatarColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-cyan-500",
];

/**
 * Obtiene un color de avatar basado en un string (consistente)
 */
export function getAvatarColor(str: unknown): string {
  if (!str || typeof str !== "string") return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncateText(text: unknown, maxLength: number): string {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
