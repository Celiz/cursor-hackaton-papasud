"use client";

import useSWR from "swr";
import Link from "next/link";
import type { DecisionesResult } from "@/lib/decisiones";
import { ChevronRight, FileText, Calculator, Wrench, Users, Plus, CheckCircle2 } from "lucide-react";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Financiero = {
  facturacion?: {
    mes_actual?: number;
    saldo_pendiente_real?: number;
    por_cobrar_n?: number;
  };
  aging?: { ">90"?: { monto?: number } };
};

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs text-muted-foreground">{titulo}</div>
      <div className="text-xl font-semibold mt-1">{valor}</div>
    </div>
  );
}

export default function InicioPage() {
  const { data: dec } = useSWR<DecisionesResult>("/api/m/decisiones", fetcher, { refreshInterval: 60000 });
  const { data: fin } = useSWR<Financiero>("/api/dashboard/financiero", fetcher);
  const c = dec?.conteos;
  const money = (n: unknown) => (n == null ? "—" : `$${Number(n).toLocaleString("es-AR")}`);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-semibold">Hola 👋</h1>

      <Link href="/m/aprobar" className="block rounded-xl border bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Necesitan tu decisión</div>
            <div className="text-2xl font-bold">{c?.total ?? 0}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        {c && c.total > 0 && (
          <div className="text-xs text-muted-foreground mt-2">
            {c.pedido} pedidos · {c.cotizacion} a cotizar · {c.aprobacion} aprobaciones
          </div>
        )}
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Tarjeta titulo="Facturado del mes" valor={money(fin?.facturacion?.mes_actual)} />
        <Tarjeta titulo="Por cobrar" valor={money(fin?.facturacion?.saldo_pendiente_real)} />
        <Tarjeta titulo="Facturas por cobrar" valor={String(fin?.facturacion?.por_cobrar_n ?? "—")} />
        <Tarjeta titulo="Vencido +90 días" valor={money(fin?.aging?.[">90"]?.monto)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/m/aprobar", label: "Aprobar", icon: CheckCircle2 },
          { href: "/m/ivr", label: "IVR", icon: FileText },
          { href: "/m/presupuestos", label: "Presupuestos", icon: Calculator },
          { href: "/m/instalaciones", label: "Instalaciones", icon: Wrench },
          { href: "/m/clientes", label: "Clientes", icon: Users },
          { href: "/m/cotizar", label: "Cotizar", icon: Plus },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-background p-4 text-center"
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
