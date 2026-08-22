import type { NextRequest } from 'next/server';

/**
 * Construye la URL base publica del request, respetando los headers de
 * proxy (traefik setea x-forwarded-host/proto). request.nextUrl.origin
 * devuelve el origin interno del container (127.0.0.1:3001), por eso
 * lo usamos solo como ultimo fallback antes de NEXT_PUBLIC_APP_URL.
 */
export function getPublicBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedHost) {
    const proto = forwardedProto || 'https';
    return `${proto}://${forwardedHost}`;
  }
  const host = request.headers.get('host');
  if (host && !host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
    const proto = request.nextUrl.protocol.replace(':', '') || 'https';
    return `${proto}://${host}`;
  }
  return (
    request.nextUrl?.origin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}
