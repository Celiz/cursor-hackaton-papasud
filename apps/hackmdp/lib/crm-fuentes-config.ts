import {
  UserCheck, Globe, Phone, Mail, Users, Megaphone, Share2,
  CalendarDays, MapPin, HelpCircle, Gavel, Building2, FileText, Tag,
} from "lucide-react";
import { slugifyId } from "./crm-listas";

export interface FuenteConfig {
  id: string;
  label: string;
  icon: typeof Phone;
}

export interface FuenteLeadCustom {
  id: string;
  label: string;
  icon: string; // nombre dentro de FUENTE_ICON_MAP
}

// Predeterminados (mismos ids que ya se usan + "licitaciones").
export const CRM_FUENTES: FuenteConfig[] = [
  { id: "cliente_existente", label: "Cliente existente", icon: UserCheck },
  { id: "web", label: "Sitio Web", icon: Globe },
  { id: "telefono", label: "Llamada", icon: Phone },
  { id: "email", label: "Email", icon: Mail },
  { id: "referido", label: "Referido", icon: Users },
  { id: "marketing", label: "Marketing", icon: Megaphone },
  { id: "redes_sociales", label: "Redes Sociales", icon: Share2 },
  { id: "evento", label: "Evento/Feria", icon: CalendarDays },
  { id: "visita_domicilio", label: "Visita en domicilio", icon: MapPin },
  { id: "licitaciones", label: "Licitaciones", icon: Gavel },
  { id: "otro", label: "Otro", icon: HelpCircle },
];

export const CRM_FUENTES_IDS = CRM_FUENTES.map((f) => f.id);

// Íconos disponibles para fuentes propias.
export const FUENTE_ICON_MAP: Record<string, typeof Phone> = {
  UserCheck, Globe, Phone, Mail, Users, Megaphone, Share2,
  CalendarDays, MapPin, Gavel, Building2, FileText, HelpCircle, Tag,
};
export const FUENTE_ICON_NAMES = Object.keys(FUENTE_ICON_MAP);

export function buildFuenteConfig(c: FuenteLeadCustom): FuenteConfig {
  return { id: c.id, label: c.label, icon: FUENTE_ICON_MAP[c.icon] || Tag };
}

export function slugifyFuente(label: string): string {
  return slugifyId(label, "custom_");
}

/**
 * Resuelve una fuente por id contra el mapa COMPLETO (predeterminados + propios),
 * IGNORANDO ocultas. Para DISPLAY de oportunidades existentes (no romper historial).
 */
export function resolveFuente(
  id: string | null | undefined,
  custom: FuenteLeadCustom[],
): FuenteConfig | null {
  if (!id) return null;
  const builtin = CRM_FUENTES.find((f) => f.id === id);
  if (builtin) return builtin;
  const c = custom.find((x) => x.id === id);
  return c ? buildFuenteConfig(c) : null;
}
