"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckCircle2, Plus, Users, Bell } from "lucide-react";

const TABS = [
  { href: "/m/inicio", label: "Inicio", icon: Home },
  { href: "/m/aprobar", label: "Aprobar", icon: CheckCircle2, badgeKey: "total" as const },
  { href: "/m/cotizar", label: "Cotizar", icon: Plus, center: true },
  { href: "/m/clientes", label: "Clientes", icon: Users },
  { href: "/m/alertas", label: "Alertas", icon: Bell },
];

export function BottomNav({ pendientes }: { pendientes: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname.startsWith(t.href);
          const Icon = t.icon;
          const showBadge = t.badgeKey === "total" && pendientes > 0;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 min-h-[56px] text-[11px] ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <span className={t.center ? "rounded-full bg-primary text-primary-foreground p-2 -mt-4 shadow" : ""}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>{t.label}</span>
                {showBadge && (
                  <span className="absolute top-1 right-[22%] rounded-full bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5">
                    {pendientes > 99 ? "99+" : pendientes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
