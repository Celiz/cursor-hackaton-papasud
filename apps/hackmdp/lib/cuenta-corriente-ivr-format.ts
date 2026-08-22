// Tipos y render de la cuenta corriente IVR agrupada por pago. PURO: sin pg.
export interface DetalleAplicacion {
  remito: string | null // nº de remito, o null = "Saldo a favor" (sobrante no aplicado)
  monto: number
}

export interface MovimientoAgrupado {
  movimiento_id: string
  tipo: 'ivr' | 'cobro' | 'nota_credito'
  fecha: string
  descripcion: string // "IVR-000917" | "Cobro N°1042" | "NC-0001"
  debito: number
  credito: number
  saldo_acumulado: number
  detalle: DetalleAplicacion[]
}

export interface FilaCC {
  fecha: string
  descripcion: string
  debe: number | null
  haber: number | null
  saldo: number | null
  sub: boolean // true = sub-línea de detalle (informativa)
}

function fmtMonto(n: number): string {
  return '$' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

// Texto de una sub-línea de detalle de un cobro.
export function subLineaTexto(d: DetalleAplicacion): string {
  return d.remito
    ? `    ↳ aplicado a ${d.remito} · ${fmtMonto(d.monto)}`
    : `    ↳ Saldo a favor · ${fmtMonto(d.monto)}`
}

// Aplana los movimientos agrupados a filas de planilla: cada cobro con detalle
// genera una fila cabecera (con debe/haber/saldo) + N sub-líneas informativas
// (debe/haber/saldo en null → no se suman ni participan del saldo).
export function construirFilasCuentaCorriente(movs: MovimientoAgrupado[]): FilaCC[] {
  const filas: FilaCC[] = []
  for (const m of movs) {
    filas.push({
      fecha: m.fecha,
      descripcion: m.descripcion,
      debe: m.debito > 0 ? m.debito : null,
      haber: m.credito > 0 ? m.credito : null,
      saldo: m.saldo_acumulado,
      sub: false,
    })
    for (const d of m.detalle) {
      filas.push({ fecha: '', descripcion: subLineaTexto(d), debe: null, haber: null, saldo: null, sub: true })
    }
  }
  return filas
}
