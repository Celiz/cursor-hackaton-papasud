import type { NextRequest } from 'next/server'

/** localhost, 127.x, y los rangos privados de la LAN. */
function esHostLocal(host: string): boolean {
  const h = host.split(':')[0]
  return (
    h === 'localhost' ||
    h.endsWith('.local') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  )
}

/**
 * Origen público de la petición, tal como lo ve el navegador del visitante.
 *
 * Next exige URL absoluta en las redirecciones, pero `request.nextUrl.origin` es
 * el origen INTERNO (http://localhost:3100): detrás de un túnel eso sacaría al
 * visitante del túnel.
 *
 * GOTCHA del protocolo: localhost.run (y varios túneles) terminan el TLS pero
 * reenvían `x-forwarded-proto: http`, porque describen el salto interno, no el
 * que hizo el navegador. Confiar en esa cabecera devuelve al visitante a http://
 * y ahí Chrome deja de dar micrófono — que es justo lo que necesita el dictado.
 * Por eso: si el host NO es local, se asume https.
 *
 * `PUBLIC_ORIGIN` pisa todo, para cuando haga falta fijarlo a mano.
 */
export function origenPublico(request: NextRequest): string {
  const fijado = process.env.PUBLIC_ORIGIN
  if (fijado) return fijado.replace(/\/$/, '')

  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0].trim() ||
    request.headers.get('host') ||
    request.nextUrl.host

  if (esHostLocal(host)) {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
      request.nextUrl.protocol.replace(':', '') ||
      'http'
    return `${proto}://${host}`
  }

  return `https://${host}`
}
