"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";

const ESCAPE_KEY = "m:prefer-desktop";

export function MobileRedirect() {
  const isMobile = useIsMobile();
  const { role, loading } = useUserPermissions();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isMobile) return;
    if (role?.nombre !== "owner") return;
    if (typeof window !== "undefined" && sessionStorage.getItem(ESCAPE_KEY) === "1") return;
    router.replace("/m/inicio");
  }, [isMobile, role, loading, router]);

  return null;
}
