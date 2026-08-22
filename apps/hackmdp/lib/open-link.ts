/**
 * Helper para abrir un link de forma consistente entre browser y desktop (Tauri).
 *
 * - En browser: window.open(url, '_blank') → nueva pestaña.
 * - En Tauri desktop: navega in-app vía window.location (no soporta nuevas pestañas).
 *
 * Para usar router de Next.js en lugar de window.location, pasar `router.push`
 * como segundo argumento opcional.
 */

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
}

export function openInternalLink(
  url: string,
  routerPush?: (href: string) => void,
): void {
  if (typeof window === "undefined") return;
  if (isTauri()) {
    if (routerPush) {
      routerPush(url);
    } else {
      window.location.href = url;
    }
    return;
  }
  window.open(url, "_blank");
}
