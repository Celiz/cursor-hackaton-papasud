"use client";

import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PushNotificationsToggle } from "@/components/core-ui/PushNotificationsToggle";
import { NotificationBell } from "@/components/core-ui/NotificationBell";
import { Button } from "@/components/ui/button";
import { Search, Mail, MessageCircle, Calendar, PartyPopper, Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { CommandPalette } from "@/components/core-ui/CommandPalette";
import { useCalendarSidebar } from "@/components/calendar/CalendarSidebarProvider";
import { useSession } from "@/lib/hooks/use-session";
import { useAppMode } from "@/lib/hooks/use-app-mode";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export function AppHeader() {
  const [commandOpen, setCommandOpen] = useState(false);
  const { isOpen: calendarOpen, toggle: toggleCalendar, close: closeCalendar } = useCalendarSidebar();

  const handleToggleCalendar = () => {
    toggleCalendar();
  };
  const { data: session, status } = useSession();
  const appMode = useAppMode();
  const privacyHidden = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);

  const sessionReady = status === 'authenticated';
  const orgName = appMode === 'persona'
    ? (session?.user?.nombre || 'Locus')
    : (session?.user?.orgName || "");

  // Easter egg: botón sólo para Franco (Uno Electromedicina).
  // Normalizamos acentos para que "Joaquín" matchee también.
  const userName = (session?.user?.name || (session?.user as { nombre?: string })?.nombre || '').trim();
  const userNameNormalized = userName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const firstName = userNameNormalized.split(/\s+/)[0];
  const isFranco = firstName === 'franco';
  const isJoaquin = firstName === 'joaquin' || firstName === 'joaco' || userNameNormalized.includes('joaqu');
  const [dinoRunning, setDinoRunning] = useState(false);

  const fireFelicitaciones = () => {
    const count = 200;
    const defaults = { origin: { y: 0.2 }, zIndex: 9999 };
    const fire = (particleRatio: number, opts: confetti.Options) =>
      confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
    toast.success('¡Felicitaciones Franquito! 🎉', { duration: 2500 });
  };

  const lanzarDino = () => {
    if (dinoRunning) return;
    setDinoRunning(true);
    setTimeout(() => setDinoRunning(false), 1800);
  };
  return (
    <>
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between gap-2 bg-background/80 backdrop-blur-md px-3 md:px-4 shadow-[0_1px_12px_rgba(59,130,246,0.06)] dark:shadow-[0_1px_12px_rgba(59,130,246,0.1)]">
        <div className="flex items-center gap-3">
          {/* Hamburger menu - mobile only */}
          <SidebarTrigger className="md:hidden h-9 w-9" />
          {sessionReady && orgName && (
            <span className="font-medium text-sm text-foreground/90 truncate">{orgName}</span>
          )}
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Search - full on desktop, icon on mobile */}
          <Button
            variant="outline"
            size="small"
            onClick={() => setCommandOpen(!commandOpen)}
            icon={<Search className="h-4 w-4 text-blue-400 dark:text-blue-400" />}
            className={cn(
              "relative h-9 transition-all shadow-sm hover:shadow-md",
              "border-blue-200/40 dark:border-blue-700/30 hover:border-blue-300 dark:hover:border-blue-600",
              "hover:bg-blue-50/50 dark:hover:bg-blue-950/30",
              "w-9 !p-0 md:w-auto md:!p-2 md:min-w-[200px] lg:min-w-[260px] md:justify-start",
              "text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
            )}
          >
            <span className="hidden md:inline">Buscar o crear...</span>
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-0.5 rounded border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/40 px-1.5 font-mono text-[10px] font-medium text-blue-500/70 dark:text-blue-400/50 lg:flex">
              <span>Ctrl</span>
              <span>K</span>
            </kbd>
          </Button>

          {/* Calendar Sidebar Toggle - hidden on mobile */}
          <Button
            variant="outline"
            size="small"
            onClick={handleToggleCalendar}
            className={cn(
              "h-9 w-9 !p-0 transition-all relative hidden md:flex",
              calendarOpen
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5"
            )}
            title="Calendario"
          >
            <Calendar className="h-4 w-4" />
          </Button>

          {/* Easter egg para Franco */}
          {isFranco && (
            <Button
              variant="outline"
              size="small"
              onClick={fireFelicitaciones}
              className={cn(
                "h-9 w-9 !p-0 transition-all relative hidden md:flex",
                "border-pink-200 dark:border-pink-700/40 text-pink-500 dark:text-pink-400",
                "hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50/60 dark:hover:bg-pink-950/30"
              )}
              title="🎉"
            >
              <PartyPopper className="h-4 w-4" />
            </Button>
          )}

          {/* Easter egg para Joaquin */}
          {isJoaquin && (
            <Button
              variant="outline"
              size="small"
              onClick={lanzarDino}
              className={cn(
                "h-9 w-9 !p-0 transition-all relative hidden md:flex items-center justify-center",
                "border-emerald-200 dark:border-emerald-700/40",
                "hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30"
              )}
              title="🦖"
            >
              <span className="text-base leading-none">🦖</span>
            </Button>
          )}

          {/* Calendar Sidebar Toggle - hidden on mobile */}
          <Button
            variant="outline"
            size="small"
            onClick={handleToggleCalendar}
            className={cn(
              "h-9 w-9 !p-0 transition-all relative hidden md:flex",
              calendarOpen
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5"
            )}
            title="Calendario"
          >
            <Calendar className="h-4 w-4" />
          </Button>

          {/* Easter egg para Franco */}
          {isFranco && (
            <Button
              variant="outline"
              size="small"
              onClick={fireFelicitaciones}
              className={cn(
                "h-9 w-9 !p-0 transition-all relative hidden md:flex",
                "border-pink-200 dark:border-pink-700/40 text-pink-500 dark:text-pink-400",
                "hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50/60 dark:hover:bg-pink-950/30"
              )}
              title="🎉"
            >
              <PartyPopper className="h-4 w-4" />
            </Button>
          )}

          {/* Easter egg para Joaquin */}
          {isJoaquin && (
            <Button
              variant="outline"
              size="small"
              onClick={lanzarDino}
              className={cn(
                "h-9 w-9 !p-0 transition-all relative hidden md:flex items-center justify-center",
                "border-emerald-200 dark:border-emerald-700/40",
                "hover:border-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30"
              )}
              title="🦖"
            >
              <span className="text-base leading-none">🦖</span>
            </Button>
          )}

          {/* Modo privacidad - oculta todos los montos (visible siempre) */}
          <Button
            variant="outline"
            size="small"
            onClick={togglePrivacy}
            className={cn(
              "h-9 w-9 !p-0 transition-all relative flex",
              privacyHidden
                ? "bg-amber-500/10 border-amber-400/50 text-amber-600 dark:text-amber-400"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5"
            )}
            title={privacyHidden ? "Mostrar montos" : "Ocultar montos"}
          >
            {privacyHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>

          <NotificationBell />
          <PushNotificationsToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Command Palette positioned below header */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Dino easter egg para Joaquin: estilo "Toasty!" de Mortal Kombat — aparece
          del costado derecho, mira un toque y se vuelve. */}
      {dinoRunning && (
        <div
          className="fixed right-0 pointer-events-none select-none z-[9999] text-6xl"
          style={{
            bottom: '40px',
            animation: 'dino-peek 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            transformOrigin: 'right center',
          }}
          aria-hidden="true"
        >
          🦖
        </div>
      )}
      {isJoaquin && (
        <style>{`
          @keyframes dino-peek {
            0%   { transform: translateX(120%) rotate(0deg); }
            20%  { transform: translateX(0)    rotate(-8deg); }
            35%  { transform: translateX(0)    rotate(4deg); }
            50%  { transform: translateX(0)    rotate(-4deg); }
            70%  { transform: translateX(0)    rotate(0deg); }
            100% { transform: translateX(120%) rotate(0deg); }
          }
        `}</style>
      )}
    </>
  );
}
