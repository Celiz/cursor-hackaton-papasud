export type PeriodoFiltro = "mes" | "trimestre" | "anio" | "12m" | "custom";

export type RangoFecha = { desde: string; hasta: string };

export type CategoriaGasto =
  | "publicidad"
  | "salarios_ventas"
  | "marketing"
  | "comisiones"
  | "ferias"
  | "otros";

export const CATEGORIAS_GASTO: { value: CategoriaGasto; label: string }[] = [
  { value: "publicidad", label: "Publicidad" },
  { value: "salarios_ventas", label: "Salarios de ventas" },
  { value: "marketing", label: "Marketing" },
  { value: "comisiones", label: "Comisiones" },
  { value: "ferias", label: "Ferias y eventos" },
  { value: "otros", label: "Otros" },
];

export type GastoComercial = {
  id: string;
  org_id: string;
  periodo: string; // YYYY-MM-DD (primer día del mes)
  categoria: CategoriaGasto;
  descripcion: string | null;
  monto: number;
  moneda: string;
  orden_compra_id: string | null;
  cc_proveedor_movimiento_id: string | null;
  es_espontaneo: boolean;
  created_at: string;
  updated_at: string;
};

export type GastoConOrigen = GastoComercial & {
  orden_compra_numero: string | null;
  proveedor_nombre: string | null;
};

export type GastoVinculable = {
  tipo: "orden_compra";
  id: string;
  fecha: string;
  numero: string | null;
  proveedor_nombre: string | null;
  total: number;
};

export type CrearGastoInput = {
  periodo: string;
  categoria: CategoriaGasto;
  descripcion?: string;
  monto: number;
  moneda?: string;
  orden_compra_id?: string | null;
};

export type KpiValor = {
  valor: number;
  variacionPct: number | null;
  ventanaNatural?: string;
};

export type KpisGastosCacResponse = {
  cacMes: KpiValor;
  cacTrimestre: KpiValor;
  clvCacRatio: KpiValor;
  paybackMeses: KpiValor;
  gastoMesPorCategoria: { categoria: CategoriaGasto; monto: number }[];
  evolucionCacMensual: { periodo: string; cac: number; clientesNuevos: number; gasto: number }[];
};

export type CarteraMensual = {
  periodo: string;
  nuevos: number;
  retenidos: number;
  churned: number;
  activos: number;
};

export type KpisResumenResponse = {
  cacTrimestre: KpiValor;
  clvPromedio: KpiValor;
  totalFacturado: KpiValor;
  cantidadVentas: KpiValor;
  ticketPromedio: KpiValor;
  clientesActivos: KpiValor;
  clientesNuevos: KpiValor;
  clvCacRatio: KpiValor;
  margenBrutoPct: KpiValor;
  cartera: CarteraMensual[];
};

export type KpisClientesResponse = {
  clvPromedio: number;
  clvMediana: number;
  clvP25: number;
  clvP75: number;
  clvP90: number;
  totalClientes: number;
  clientesRecurrentes: number;
  pctRecurrentes: number;
  top10: { cliente_id: string; cliente_nombre: string; facturacion_total: number }[];
  bottom10: { cliente_id: string; cliente_nombre: string; facturacion_total: number }[];
  histograma: { bucket: string; count: number }[];
  pareto: { pct_clientes: number; pct_facturacion: number }[];
  retencionMensual: { periodo: string; retencion: number; churn: number }[];
};

export type KpisRentabilidadResponse = {
  margenBruto: KpiValor;
  margenNeto: KpiValor;
  margenBrutoPct: KpiValor;
  topProductosROI: { producto_id: string; nombre: string; margen: number; roi_pct: number }[];
  bottomProductosROI: { producto_id: string; nombre: string; margen: number; roi_pct: number }[];
  margenPorCategoria: { categoria: string; margen: number; margen_pct: number; facturacion: number }[];
  margenPorProveedor: { proveedor: string; margen: number; margen_pct: number; facturacion: number }[];
  productosSinCosto: number;
};

export type KpisProductosResponse = {
  topVendidos: { producto_id: string; nombre: string; cantidad: number; facturacion: number }[];
  topRentables: { producto_id: string; nombre: string; margen: number }[];
  pareto: { idx: number; nombre: string; facturacion: number; pct_acum: number }[];
  pct80_20: number;
  ticketPorCategoria: { categoria: string; ticket_promedio: number; cantidad_ventas: number }[];
};

export type KpisEficienciaResponse = {
  conversionPresupuestoVenta: KpiValor;
  winRate: KpiValor;
  cicloVentaDias: KpiValor;
  pipeline: { etapa: string; cantidad: number; valor: number }[];
  crecimientoMoM: KpiValor;
  crecimientoYoY: KpiValor;
  mrr: KpiValor | null;
  arr: KpiValor | null;
  tieneRecurrencia: boolean;
};
