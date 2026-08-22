/**
 * Estados en los que una orden de servicio se considera TERMINADA.
 *
 * OJO: esta lista está duplicada en la base, en la función
 * `servicio_estado_es_terminal()` y en el trigger de sync
 * `trg_servicio_sync_instalacion` (migración 1144 y 1000). Si se agrega o
 * saca un estado hay que tocar las dos: la base es la que estampa
 * `servicios.fecha_fin`, y esta constante sólo decide si el campo se MUESTRA.
 * Si divergen, una orden podría quedar fechada sin que el campo aparezca (o al
 * revés, un campo vacío que nunca se va a llenar solo).
 *
 * Los estados de servicio son configurables por el usuario (tabla
 * `configuracion_estados`), pero estos seis son los que la lógica de cierre
 * trata como fin del trabajo.
 */
export const ESTADOS_SERVICIO_TERMINALES = [
  'Instalado',
  'Listo/Reparado',
  'Finalizado',
  'Facturado',
  'Reacondicionado/Listo',
  'Reparado/garantía de reparación',
] as const;

export function esEstadoServicioTerminal(estado: string | null | undefined): boolean {
  if (!estado) return false;
  return (ESTADOS_SERVICIO_TERMINALES as readonly string[]).includes(estado);
}
