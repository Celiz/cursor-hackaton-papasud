"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import { BottomNav } from "@/components/m/BottomNav";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useUserPermissions();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!role || role.nombre !== "owner") {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [loading, role, router]);

  const { data } = useSWR<{ conteos?: { total: number } }>(
    checked ? "/api/m/decisiones" : null,
    fetcher,
    { refreshInterval: 60000 },
  );
  const pendientes = data?.conteos?.total ?? 0;

  function irADesktop() {
    sessionStorage.setItem("m:prefer-desktop", "1");
    window.location.href = "/dashboard";
  }

  if (!checked) {
    return <div className="min-h-svh grid place-items-center text-muted-foreground">Cargando…</div>;
  }

  return (
    <div className="min-h-svh bg-muted/30" style={{ zoom: 1 }}>
      <div className="flex justify-end px-4 pt-2">
        <button onClick={irADesktop} className="text-xs text-muted-foreground underline">
          Ver versión completa
        </button>
      </div>
      <main className="mx-auto max-w-screen-sm pb-24 min-h-svh">{children}</main>
      <BottomNav pendientes={pendientes} />
    </div>
  );
}
