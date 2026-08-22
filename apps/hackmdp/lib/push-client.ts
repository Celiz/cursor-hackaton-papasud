"use client";

/**
 * Client-side helpers for push notifications.
 * Handles service worker registration, permission, and subscription lifecycle.
 */

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

export async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await ensureServiceWorker();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Tu navegador no soporta notificaciones push" };
  }

  // Ask permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { success: false, error: "Permiso denegado" };
  }

  // Get VAPID public key
  const keyRes = await fetch("/api/push/subscribe", { method: "GET" });
  if (!keyRes.ok) {
    return { success: false, error: "No se pudo obtener la clave VAPID" };
  }
  const { publicKey } = await keyRes.json();

  // Register SW and subscribe
  const reg = await ensureServiceWorker();
  if (!reg) {
    return { success: false, error: "Service worker no disponible" };
  }

  // Remove any stale subscription
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await existing.unsubscribe();
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Send to server
  const json = sub.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    return { success: false, error: "Error al registrar en el servidor" };
  }

  return { success: true };
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const sub = await getSubscription();
  if (!sub) return true;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  return sub.unsubscribe();
}
