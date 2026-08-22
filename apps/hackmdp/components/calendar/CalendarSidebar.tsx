"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  User,
  ExternalLink,
  Cloud,
  Phone,
  Mail,
  Video,
  FileText,
  Wrench,
  GraduationCap,
  Target,
  Check,
} from "lucide-react";
import { startOfWeek, endOfWeek, addDays, format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCalendarSidebar, type CalendarTurno, type CalendarGoogleEvent, type CalendarCrmActividad, type CalendarMantenimiento, type CalendarEventoInterno } from "./CalendarSidebarProvider";

const SIDEBAR_WIDTH = 380;

type ViewMode = "day" | "week";

const CRM_TIPO_META: Record<string, { icon: typeof Phone; color: string; label: string }> = {
  llamada: { icon: Phone, color: "text-blue-500", label: "Llamada" },
  email: { icon: Mail, color: "text-purple-500", label: "Email" },
  reunion_online: { icon: Video, color: "text-amber-500", label: "Reunión online" },
  visita: { icon: MapPin, color: "text-teal-500", label: "Visita" },
  enviar_presupuesto: { icon: FileText, color: "text-emerald-500", label: "Enviar Presupuesto" },
  instalacion: { icon: Wrench, color: "text-orange-500", label: "Instalación" },
  capacitacion: { icon: GraduationCap, color: "text-indigo-500", label: "Capacitación" },
  seguimiento: { icon: Clock, color: "text-gray-500", label: "Seguimiento" },
};

const PRIORIDAD_BADGE: Record<string, string> = {
  urgente: "bg-red-500/10 text-red-700 border-red-500/20",
  alta: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  normal: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  baja: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const ESTADO_COLORS: Record<string, string> = {
  solicitada: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  confirmada: "bg-green-500/10 text-green-700 border-green-500/20",
  en_curso: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  completada: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);

  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days === -1) return "Ayer";

  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  if (sameMonth) {
    return `${weekStart.getDate()} – ${weekEnd.getDate()} ${format(weekEnd, "MMM", { locale: es })}`;
  }
  return `${weekStart.getDate()} ${format(weekStart, "MMM", { locale: es })} – ${weekEnd.getDate()} ${format(weekEnd, "MMM", { locale: es })}`;
}

function parseGoogleTime(dt: string): string {
  if (!dt.includes("T")) return "Todo el día";
  return new Date(dt).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Extract YYYY-MM-DD from a Google Calendar start string */
function googleEventDate(start: string): string {
  if (!start.includes("T")) return start; // all-day: already YYYY-MM-DD
  return start.slice(0, 10); // dateTime: take date part
}

interface DayEvents {
  date: Date;
  dateStr: string;
  turnos: CalendarTurno[];
  crmActividades: CalendarCrmActividad[];
  googleEvents: CalendarGoogleEvent[];
  mantenimientos: CalendarMantenimiento[];
  eventos: CalendarEventoInterno[];
  total: number;
}

export function CalendarSidebar() {
  const { isOpen, close, open } = useCalendarSidebar();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [turnos, setTurnos] = useState<CalendarTurno[]>([]);
  const [crmActividades, setCrmActividades] = useState<CalendarCrmActividad[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarGoogleEvent[]>([]);
  const [mantenimientos, setMantenimientos] = useState<CalendarMantenimiento[]>([]);
  const [eventos, setEventos] = useState<CalendarEventoInterno[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const dateStr = selectedDate.toISOString().slice(0, 10);

  // Week boundaries (Monday-based)
  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );

  const fetchEvents = useCallback(async (fecha: string, dateTo?: string) => {
    setLoading(true);
    try {
      let url = `/api/calendar/events?fecha=${fecha}`;
      if (dateTo) url += `&dateTo=${dateTo}`;
      const res = await fetch(url);
      const data = await res.json();
      setTurnos(data.turnos || []);
      setCrmActividades(data.crmActividades || []);
      setGoogleEvents(data.googleEvents || []);
      setMantenimientos(data.mantenimientos || []);
      setEventos(data.eventos || []);
      setGoogleConnected(data.googleConnected || false);
    } catch {
      setTurnos([]);
      setCrmActividades([]);
      setGoogleEvents([]);
      setMantenimientos([]);
      setEventos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-open after Google OAuth redirect
  useEffect(() => {
    const gcal = searchParams.get("gcal");
    const gcalError = searchParams.get("gcal_error");
    if (gcal === "connected") {
      open();
      toast.success("Google Calendar conectado");
      router.replace("/dashboard");
    }
    if (gcalError) {
      open();
      toast.error(`Error al conectar Google: ${gcalError}`);
      router.replace("/dashboard");
    }
  }, [searchParams, open, router]);

  useEffect(() => {
    if (!isOpen) return;
    if (viewMode === "week") {
      const from = format(weekStart, "yyyy-MM-dd");
      const to = format(weekEnd, "yyyy-MM-dd");
      fetchEvents(from, to);
    } else {
      fetchEvents(dateStr);
    }
  }, [isOpen, dateStr, viewMode, weekStart, weekEnd, fetchEvents]);

  const navigate = (delta: number) => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (viewMode === "week" ? delta * 7 : delta));
      return d;
    });
  };

  const goToday = () => setSelectedDate(new Date());

  const totalEvents =
    turnos.length +
    crmActividades.length +
    googleEvents.length +
    mantenimientos.length +
    eventos.length;

  // Group events by date for week view
  const weekDays: DayEvents[] = useMemo(() => {
    if (viewMode !== "week") return [];
    const days: DayEvents[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const ds = format(d, "yyyy-MM-dd");
      const dayTurnos = turnos.filter((t) => t.fecha === ds);
      const dayCrm = crmActividades.filter((a) => a.fecha_limite === ds);
      const dayGoogle = googleEvents.filter((e) => googleEventDate(e.start) === ds);
      const dayMant = mantenimientos.filter((m) => {
        const fp = m.fecha_programada;
        return fp && fp.slice(0, 10) === ds;
      });
      const dayEventos = eventos.filter((e) => e.fecha === ds);
      days.push({
        date: d,
        dateStr: ds,
        turnos: dayTurnos,
        crmActividades: dayCrm,
        googleEvents: dayGoogle,
        mantenimientos: dayMant,
        eventos: dayEventos,
        total: dayTurnos.length + dayCrm.length + dayGoogle.length + dayMant.length + dayEventos.length,
      });
    }
    return days;
  }, [viewMode, weekStart, turnos, crmActividades, googleEvents, mantenimientos, eventos]);

  if (!isOpen) return null;

  const dateLabel =
    viewMode === "week"
      ? formatWeekLabel(weekStart, weekEnd)
      : formatDateLabel(selectedDate);

  return (
    <aside
      className="fixed top-0 right-0 h-svh z-20 border-l bg-background shadow-lg flex flex-col overflow-hidden"
      style={{ width: SIDEBAR_WIDTH }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Calendario</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (viewMode === "week") {
                const from = format(weekStart, "yyyy-MM-dd");
                const to = format(weekEnd, "yyyy-MM-dd");
                fetchEvents(from, to);
              } else {
                fetchEvents(dateStr);
              }
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* View toggle + Date navigation */}
      <div className="flex flex-col border-b bg-muted/30">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-1 px-3 pt-2 pb-1">
          <div className="inline-flex rounded-md border bg-background p-0.5">
            <button
              onClick={() => setViewMode("day")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                viewMode === "day"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-sm transition-colors",
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Semana
            </button>
          </div>
        </div>
        {/* Nav */}
        <div className="flex items-center justify-between px-3 py-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={goToday}
            className="text-sm font-medium hover:text-primary transition-colors capitalize"
          >
            {dateLabel}
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {loading && totalEvents === 0 && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Cargando...
            </div>
          )}

          {/* ============ DAY VIEW ============ */}
          {viewMode === "day" && (
            <>
              {!loading && totalEvents === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Calendar className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Sin eventos para este día</p>
                </div>
              )}

              {eventos.length > 0 && (
                <EventSection title="Eventos del calendario" count={eventos.length}>
                  {eventos.map((e) => (
                    <EventoInternoCard key={e.id} evento={e} />
                  ))}
                </EventSection>
              )}

              {turnos.length > 0 && (
                <EventSection title="Turnos" count={turnos.length}>
                  {turnos.map((t) => (
                    <TurnoCard key={t.id} turno={t} />
                  ))}
                </EventSection>
              )}

              {crmActividades.length > 0 && (
                <EventSection title="Actividades CRM" count={crmActividades.length}>
                  {crmActividades.map((act) => (
                    <CrmCard
                      key={act.id}
                      actividad={act}
                      router={router}
                      onClose={close}
                      onCompleted={(id) =>
                        setCrmActividades((prev) => prev.filter((a) => a.id !== id))
                      }
                    />
                  ))}
                </EventSection>
              )}

              {mantenimientos.length > 0 && (
                <EventSection title="Mantenimientos" count={mantenimientos.length}>
                  {mantenimientos.map((m) => (
                    <MantenimientoCard key={m.id} mantenimiento={m} router={router} onClose={close} />
                  ))}
                </EventSection>
              )}

              {googleConnected && googleEvents.length > 0 && (
                <EventSection title="Google Calendar" count={googleEvents.length}>
                  {googleEvents.map((e) => (
                    <GoogleEventCard key={e.id} event={e} />
                  ))}
                </EventSection>
              )}

              {googleConnected && googleEvents.length === 0 && !loading && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Sin eventos en Google Calendar para este día
                </div>
              )}
            </>
          )}

          {/* ============ WEEK VIEW ============ */}
          {viewMode === "week" && !loading && totalEvents === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Sin eventos esta semana</p>
            </div>
          )}

          {viewMode === "week" &&
            weekDays.map((day) => {
              const today = new Date();
              const isToday = isSameDay(day.date, today);
              return (
                <div key={day.dateStr}>
                  {/* Day header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={cn(
                        "flex-1 flex items-center gap-2 py-1",
                        isToday && "text-primary"
                      )}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider capitalize">
                        {format(day.date, "EEEE d", { locale: es })}
                      </span>
                      {isToday && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                          Hoy
                        </Badge>
                      )}
                    </div>
                    {day.total > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {day.total}
                      </Badge>
                    )}
                  </div>

                  {day.total === 0 ? (
                    <p className="text-xs text-muted-foreground mb-3 ml-1">Sin eventos</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {day.turnos.map((t) => (
                        <TurnoCard key={t.id} turno={t} compact />
                      ))}
                      {day.crmActividades.map((act) => (
                        <CrmCard
                          key={act.id}
                          actividad={act}
                          router={router}
                          onClose={close}
                          onCompleted={(id) =>
                            setCrmActividades((prev) => prev.filter((a) => a.id !== id))
                          }
                          compact
                        />
                      ))}
                      {day.mantenimientos.map((m) => (
                        <MantenimientoCard
                          key={m.id}
                          mantenimiento={m}
                          router={router}
                          onClose={close}
                          compact
                        />
                      ))}
                      {day.googleEvents.map((e) => (
                        <GoogleEventCard key={e.id} event={e} compact />
                      ))}
                      {day.eventos.map((e) => (
                        <EventoInternoCard key={e.id} evento={e} compact />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Connect Google Calendar CTA */}
          {!googleConnected && !loading && (
            <div className="border border-dashed rounded-lg p-4 text-center space-y-3">
              <Cloud className="h-8 w-8 mx-auto text-blue-500 opacity-60" />
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conectá tu cuenta de Google para ver tus eventos acá
                </p>
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  window.location.href = `/api/auth/google?state=calendar-sidebar&origin=${encodeURIComponent(window.location.origin)}`;
                }}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer — only show turnos link if there are turnos */}
      {turnos.length > 0 && (
        <div className="border-t p-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            asChild
          >
            <a href="/dashboard/turnos" onClick={close}>
              <ExternalLink className="h-3 w-3" />
              Ver todos los turnos
            </a>
          </Button>
        </div>
      )}
    </aside>
  );
}

/* ─── Shared card components ─── */

function EventSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TurnoCard({ turno: t, compact }: { turno: CalendarTurno; compact?: boolean }) {
  return (
    <div className={cn("border rounded-lg hover:bg-muted/50 transition-colors", compact ? "p-2" : "p-3")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {formatTime(t.hora_inicio)}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.duracion_minutos}min
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className={cn("truncate", compact ? "text-xs" : "text-sm")}>{t.contacto_nombre}</span>
          </div>
          {!compact && t.motivo && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {t.motivo}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] h-5", ESTADO_COLORS[t.estado] || "")}
          >
            {t.estado}
          </Badge>
          {!compact && <span className="text-[10px] text-muted-foreground">{t.tipo}</span>}
        </div>
      </div>
      {!compact && t.profesional_nombre && (
        <div className="text-xs text-muted-foreground mt-1.5">
          Prof: {t.profesional_nombre}
        </div>
      )}
    </div>
  );
}

function CrmCard({
  actividad: act,
  router,
  onClose,
  onCompleted,
  compact,
}: {
  actividad: CalendarCrmActividad;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
  onCompleted: (id: string) => void;
  compact?: boolean;
}) {
  const meta = CRM_TIPO_META[act.tipo] || CRM_TIPO_META.seguimiento;
  const Icon = meta.icon;
  const [completing, setCompleting] = useState(false);

  const handleOpen = () => {
    onClose();
    if (act.oportunidad_id) {
      router.push(`/dashboard/crm?oportunidad=${act.oportunidad_id}`);
    } else {
      router.push("/dashboard/crm");
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/crm/actividades-programadas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: act.id, estado: "completada" }),
      });
      if (!res.ok) throw new Error("Error al completar");
      toast.success("Actividad completada");
      onCompleted(act.id);
    } catch {
      toast.error("No se pudo completar la actividad");
      setCompleting(false);
    }
  };

  return (
    <div
      onClick={handleOpen}
      className={cn(
        "group border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", meta.color)} />
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {act.titulo || meta.label}
            </span>
          </div>
          {!compact && act.oportunidad_titulo && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {act.oportunidad_titulo}
              </span>
            </div>
          )}
          {!compact && act.asignado_nombre && (
            <div className="flex items-center gap-1.5 mt-1">
              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {act.asignado_nombre}
              </span>
            </div>
          )}
          {!compact && act.nota && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {act.nota}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {act.prioridad !== "normal" && (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5", PRIORIDAD_BADGE[act.prioridad] || "")}
            >
              {act.prioridad}
            </Badge>
          )}
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            title="Marcar como completada"
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50",
              compact ? "h-5 w-5" : "h-6 w-6"
            )}
          >
            <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleEventCard({ event: e, compact }: { event: CalendarGoogleEvent; compact?: boolean }) {
  return (
    <div
      className={cn(
        "border rounded-lg hover:bg-muted/50 transition-colors border-blue-200/50 dark:border-blue-800/50",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {e.allDay ? "Todo el día" : parseGoogleTime(e.start)}
            </span>
            {!e.allDay && e.end && (
              <span className="text-xs text-muted-foreground">
                — {parseGoogleTime(e.end)}
              </span>
            )}
          </div>
          <p className={cn("mt-1 truncate", compact ? "text-xs" : "text-sm")}>{e.summary}</p>
          {!compact && e.location && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {e.location}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventoInternoCard({ evento: e, compact }: { evento: CalendarEventoInterno; compact?: boolean }) {
  return (
    <div
      className={cn(
        "border rounded-lg hover:bg-muted/50 transition-colors",
        compact ? "p-2" : "p-3"
      )}
      style={e.color ? { borderColor: e.color + '66' } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" style={e.color ? { color: e.color } : undefined} />
            <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
              {e.todo_el_dia
                ? "Todo el día"
                : e.hora_inicio
                  ? formatTime(e.hora_inicio) + (e.hora_fin ? ` — ${formatTime(e.hora_fin)}` : '')
                  : "Sin hora"}
            </span>
            {e.tipo && !compact && (
              <Badge variant="secondary" className="h-4 text-[9px] capitalize">
                {e.tipo}
              </Badge>
            )}
          </div>
          <p className={cn("mt-1 truncate", compact ? "text-xs" : "text-sm")}>{e.titulo}</p>
          {!compact && e.ubicacion && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{e.ubicacion}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MANT_PRIORIDAD_COLOR: Record<string, string> = {
  baja: "text-slate-500",
  media: "text-blue-500",
  alta: "text-orange-500",
  urgente: "text-red-500",
};

const MANT_TIPO_LABEL: Record<string, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
  predictivo: "Predictivo",
};

function MantenimientoCard({
  mantenimiento: m,
  router,
  onClose,
  compact,
}: {
  mantenimiento: CalendarMantenimiento;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
  compact?: boolean;
}) {
  const equipoNombre =
    [m.marca, m.modelo].filter(Boolean).join(" ") || m.numero_serie || "Equipo";
  const hora = m.fecha_programada
    ? new Date(m.fecha_programada).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const handleClick = () => {
    onClose();
    router.push(`/dashboard/mantenimiento/calendario`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left border rounded-lg hover:bg-muted/50 transition-colors",
        "border-amber-200/50 dark:border-amber-800/50",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-start gap-2">
        <Wrench className={cn("h-3.5 w-3.5 flex-shrink-0 mt-0.5", MANT_PRIORIDAD_COLOR[m.prioridad] || "text-amber-500")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-medium font-mono", compact ? "text-xs" : "text-sm")}>
              {hora}
            </span>
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              {MANT_TIPO_LABEL[m.tipo] || m.tipo}
            </Badge>
            {m.prioridad === "urgente" && (
              <Badge className="h-4 px-1 text-[9px] bg-red-500 text-white">
                Urgente
              </Badge>
            )}
          </div>
          <p className={cn("mt-0.5 truncate font-medium", compact ? "text-xs" : "text-sm")}>
            {equipoNombre}
          </p>
          {!compact && m.cliente_nombre && (
            <div className="flex items-center gap-1 mt-1">
              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {m.cliente_nombre}
              </span>
            </div>
          )}
          {!compact && m.numero && (
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {m.numero}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
