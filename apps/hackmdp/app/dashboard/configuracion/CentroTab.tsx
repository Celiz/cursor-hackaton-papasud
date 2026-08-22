"use client";

import Link from "next/link";
import {
  Settings,
  Building2,
  Layers,
  Cloud,
  Users,
  ChevronRight,
} from "lucide-react";

const sections = [
  {
    href: "/dashboard/configuracion/empresa",
    icon: Building2,
    title: "Empresa",
    description: "Datos fiscales, direccion, logo y contacto",
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    href: "/dashboard/configuracion/modulos",
    icon: Layers,
    title: "Modulos",
    description: "Activar y configurar modulos del sistema",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    href: "/dashboard/configuracion/integraciones",
    icon: Cloud,
    title: "Integraciones",
    description: "Google, Email, Telegram, WhatsApp, AFIP",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/dashboard/configuracion/equipo",
    icon: Users,
    title: "Equipo",
    description: "Usuarios, roles, permisos y firma personal",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
] as const;

export default function ConfiguracionPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30">
          <Settings className="h-7 w-7 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Configuracion
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gestiona todas las configuraciones del sistema
          </p>
        </div>
      </div>

      {/* Section Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex items-center gap-4 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg hover:shadow-purple-500/10 transition-all"
          >
            <div
              className={`p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${section.iconBg}`}
            >
              <section.icon className={`h-5 w-5 ${section.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {section.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {section.description}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
