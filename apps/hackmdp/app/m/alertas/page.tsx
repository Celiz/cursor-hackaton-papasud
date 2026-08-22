"use client";

import useSWR from "swr";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Noti = { id: string; titulo: string; mensaje: string; leida: boolean; created_at: string; metadata?: any };

export default function AlertasPage() {
  const { data, mutate } = useSWR<{ notificaciones?: Noti[]; unread_count?: number }>(
    "/api/notificaciones",
    fetcher,
  );
  const lista: Noti[] = data?.notificaciones ?? [];

  async function abrir(n: Noti) {
    if (!n.leida) {
      await fetch("/api/notificaciones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {});
      mutate();
    }
    const url = n.metadata?.url;
    if (url) window.location.href = url;
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">Alertas</h1>
      {lista.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">Sin novedades.</p>}
      {lista.map((n) => (
        <button
          key={n.id}
          onClick={() => abrir(n)}
          className={`w-full text-left rounded-lg border p-3 ${n.leida ? "opacity-60" : "bg-primary/5"}`}
        >
          <div className="font-medium">{n.titulo}</div>
          <div className="text-sm text-muted-foreground">{n.mensaje}</div>
        </button>
      ))}
    </div>
  );
}
