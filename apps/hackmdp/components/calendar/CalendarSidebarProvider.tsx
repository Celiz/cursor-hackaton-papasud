"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface CalendarTurno {
  id: string;
  tipo: string;
  fecha: string;
  hora_inicio: string;
  duracion_minutos: number;
  estado: string;
  motivo: string | null;
  contacto_nombre: string;
  profesional_nombre: string | null;
}

export interface CalendarGoogleEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
}

export interface CalendarCrmActividad {
  id: string;
  tipo: string;
  titulo: string | null;
  nota: string | null;
  fecha_limite: string;
  prioridad: string;
  asignado_nombre: string | null;
  oportunidad_id: string | null;
  oportunidad_titulo: string | null;
}

export interface CalendarMantenimiento {
  id: string;
  numero: string;
  tipo: string;
  prioridad: string;
  estado: string;
  fecha_programada: string;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  cliente_nombre: string | null;
  tecnico_nombre: string | null;
}

export interface CalendarEventoInterno {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: string | null;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  todo_el_dia: boolean | null;
  color: string | null;
  ubicacion: string | null;
  oportunidad_id: string | null;
}

interface CalendarSidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const CalendarSidebarContext = createContext<CalendarSidebarContextValue | null>(null);

export function useCalendarSidebar() {
  const context = useContext(CalendarSidebarContext);
  if (!context) {
    throw new Error("useCalendarSidebar must be used within a CalendarSidebarProvider");
  }
  return context;
}

export function CalendarSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <CalendarSidebarContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </CalendarSidebarContext.Provider>
  );
}
