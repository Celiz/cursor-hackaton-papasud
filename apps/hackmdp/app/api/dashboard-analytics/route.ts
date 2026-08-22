import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET - Obtener métricas agregadas para dashboards avanzados
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get("metric");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const groupBy = searchParams.get("groupBy") || "month"; // day, week, month, quarter, year
    const compareWithPrevious = searchParams.get("compare") === "true";

    // Calcular fechas por defecto (últimos 12 meses)
    const fechaHasta = hasta ? new Date(hasta) : new Date();
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(fechaHasta.getFullYear() - 1, fechaHasta.getMonth(), 1);

    // Si se pide una métrica específica
    if (metric) {
      const data = await getMetricData(
        metric,
        fechaDesde,
        fechaHasta,
        groupBy,
        compareWithPrevious,
        session.org_id
      );
      return NextResponse.json(data);
    }

    // Obtener todas las métricas principales en paralelo
    const [
      ventasData,
      serviciosData,
      clientesData,
      productosData,
      cobranzasData,
      kpisGenerales,
    ] = await Promise.all([
      getVentasAnalytics(fechaDesde, fechaHasta, groupBy, session.org_id),
      getServiciosAnalytics(fechaDesde, fechaHasta, groupBy, session.org_id),
      getClientesAnalytics(fechaDesde, fechaHasta, session.org_id),
      getProductosAnalytics(session.org_id),
      getCobranzasAnalytics(fechaDesde, fechaHasta, groupBy, session.org_id),
      getKPIsGenerales(session.org_id),
    ]);

    return NextResponse.json({
      periodo: {
        desde: fechaDesde.toISOString(),
        hasta: fechaHasta.toISOString(),
        groupBy,
      },
      ventas: ventasData,
      servicios: serviciosData,
      clientes: clientesData,
      productos: productosData,
      cobranzas: cobranzasData,
      kpis: kpisGenerales,
    });
  } catch (error: any) {
    console.error("Error fetching dashboard analytics:", error);
    return NextResponse.json(
      { error: "Error al obtener analíticas", details: error?.message },
      { status: 500 }
    );
  }
}

async function getMetricData(
  metric: string,
  desde: Date,
  hasta: Date,
  groupBy: string,
  compare: boolean,
  org_id: string
) {
  const dateFormat = getDateFormat(groupBy);

  switch (metric) {
    case "ventas_por_cliente":
      return query(
        `SELECT
          c.id, c.nombre_fantasia, c.nombre,
          COUNT(f.id) as total_facturas,
          COALESCE(SUM(f.total), 0) as total_facturado,
          COALESCE(AVG(f.total), 0) as ticket_promedio
        FROM clientes c
        LEFT JOIN facturas f ON f.cliente_id = c.id
          AND f.fecha_emision BETWEEN $1 AND $2
        WHERE c.org_id = $3
          AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
          AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
          AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
        GROUP BY c.id, c.nombre_fantasia, c.nombre
        ORDER BY total_facturado DESC
        LIMIT 20`,
        [desde.toISOString(), hasta.toISOString(), org_id]
      ).then((r) => r.rows);

    case "ventas_por_producto":
      return query(
        `SELECT
          p.id, p.nombre, p.codigo,
          COUNT(DISTINCT fi.factura_id) as facturas,
          COALESCE(SUM(fi.cantidad), 0) as unidades,
          COALESCE(SUM(fi.subtotal), 0) as total
        FROM productos p
        LEFT JOIN factura_items fi ON fi.producto_id = p.id
        LEFT JOIN facturas f ON f.id = fi.factura_id
          AND f.fecha_emision BETWEEN $1 AND $2
        WHERE p.org_id = $3
        GROUP BY p.id, p.nombre, p.codigo
        ORDER BY total DESC
        LIMIT 20`,
        [desde.toISOString(), hasta.toISOString(), org_id]
      ).then((r) => r.rows);

    case "servicios_por_tecnico":
      return query(
        `SELECT
          u.id, u.nombre as tecnico,
          COUNT(s.id) as total_servicios,
          COUNT(CASE WHEN s.estado = 'Entregado' THEN 1 END) as completados,
          COALESCE(AVG(
            EXTRACT(EPOCH FROM (s.fecha_entrega - s.fecha_ingreso)) / 86400
          ), 0) as dias_promedio
        FROM users u
        LEFT JOIN equipos_servicios_tecnicos s ON s.tecnico_id = u.id
          AND s.created_at BETWEEN $1 AND $2
          AND s.org_id = $3
        WHERE u.rol IN ('tecnico', 'admin')
        GROUP BY u.id, u.nombre
        ORDER BY total_servicios DESC`,
        [desde.toISOString(), hasta.toISOString(), org_id]
      ).then((r) => r.rows);

    case "rentabilidad":
      return query(
        `SELECT
          TO_CHAR(f.fecha_emision, '${dateFormat}') as periodo,
          COALESCE(SUM(f.total), 0) as ingresos,
          COALESCE(SUM(f.total * 0.3), 0) as costos_estimados,
          COALESCE(SUM(f.total * 0.7), 0) as margen_bruto
        FROM facturas f
        WHERE f.fecha_emision BETWEEN $1 AND $2
          AND f.org_id = $3
        GROUP BY TO_CHAR(f.fecha_emision, '${dateFormat}')
        ORDER BY MIN(f.fecha_emision)`,
        [desde.toISOString(), hasta.toISOString(), org_id]
      ).then((r) => r.rows);

    default:
      return [];
  }
}

async function getVentasAnalytics(desde: Date, hasta: Date, groupBy: string, org_id: string) {
  const dateFormat = getDateFormat(groupBy);

  // Ventas por período
  const ventasPorPeriodo = await query(
    `SELECT
      TO_CHAR(fecha_emision, '${dateFormat}') as periodo,
      COUNT(*) as cantidad,
      COALESCE(SUM(total), 0) as total,
      COALESCE(AVG(total), 0) as promedio
    FROM facturas
    WHERE fecha_emision BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY TO_CHAR(fecha_emision, '${dateFormat}')
    ORDER BY MIN(fecha_emision)`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Ventas por tipo de factura
  const ventasPorTipo = await query(
    `SELECT
      tipo_factura,
      COUNT(*) as cantidad,
      COALESCE(SUM(total), 0) as total
    FROM facturas
    WHERE fecha_emision BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY tipo_factura
    ORDER BY total DESC`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Top clientes
  const topClientes = await query(
    `SELECT
      c.nombre_fantasia, c.nombre,
      COUNT(f.id) as facturas,
      COALESCE(SUM(f.total), 0) as total
    FROM facturas f
    JOIN clientes c ON c.id = f.cliente_id
    WHERE f.fecha_emision BETWEEN $1 AND $2
      AND f.org_id = $3
      AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
      AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
      AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
    GROUP BY c.id, c.nombre_fantasia, c.nombre
    ORDER BY total DESC
    LIMIT 10`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Calcular variación vs período anterior
  const duracionDias = Math.ceil(
    (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24)
  );
  const desdeAnterior = new Date(desde.getTime() - duracionDias * 24 * 60 * 60 * 1000);
  const hastaAnterior = desde;

  const periodoAnterior = await query(
    `SELECT COALESCE(SUM(total), 0) as total
    FROM facturas
    WHERE fecha_emision BETWEEN $1 AND $2
      AND org_id = $3`,
    [desdeAnterior.toISOString(), hastaAnterior.toISOString(), org_id]
  );

  const totalActual = ventasPorPeriodo.rows.reduce(
    (sum, r) => sum + parseFloat(r.total || 0),
    0
  );
  const totalAnterior = parseFloat(periodoAnterior.rows[0]?.total || 0);
  const variacion =
    totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : 0;

  return {
    porPeriodo: ventasPorPeriodo.rows,
    porTipo: ventasPorTipo.rows,
    topClientes: topClientes.rows,
    totales: {
      actual: totalActual,
      anterior: totalAnterior,
      variacion: variacion.toFixed(2),
    },
  };
}

async function getServiciosAnalytics(desde: Date, hasta: Date, groupBy: string, org_id: string) {
  const dateFormat = getDateFormat(groupBy);

  // Servicios por período
  const serviciosPorPeriodo = await query(
    `SELECT
      TO_CHAR(created_at, '${dateFormat}') as periodo,
      COUNT(*) as total,
      COUNT(CASE WHEN estado = 'Entregado' THEN 1 END) as completados,
      COUNT(CASE WHEN estado IN ('Pendiente', 'Recibido') THEN 1 END) as pendientes
    FROM equipos_servicios_tecnicos
    WHERE created_at BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY TO_CHAR(created_at, '${dateFormat}')
    ORDER BY MIN(created_at)`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Servicios por estado
  const serviciosPorEstado = await query(
    `SELECT
      estado,
      COUNT(*) as cantidad
    FROM equipos_servicios_tecnicos
    WHERE created_at BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY estado
    ORDER BY cantidad DESC`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Tiempo promedio de resolución
  const tiempoResolucion = await query(
    `SELECT
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (fecha_entrega - fecha_ingreso)) / 86400
      ), 0) as dias_promedio,
      COALESCE(MIN(
        EXTRACT(EPOCH FROM (fecha_entrega - fecha_ingreso)) / 86400
      ), 0) as dias_minimo,
      COALESCE(MAX(
        EXTRACT(EPOCH FROM (fecha_entrega - fecha_ingreso)) / 86400
      ), 0) as dias_maximo
    FROM equipos_servicios_tecnicos
    WHERE estado = 'Entregado'
      AND fecha_entrega IS NOT NULL
      AND fecha_ingreso IS NOT NULL
      AND created_at BETWEEN $1 AND $2
      AND org_id = $3`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Servicios por tipo de equipo
  const serviciosPorEquipo = await query(
    `SELECT
      e.marca, e.modelo,
      COUNT(s.id) as cantidad
    FROM equipos_servicios_tecnicos s
    LEFT JOIN equipos_unidades eu ON eu.id = s.equipo_unidad_id
    LEFT JOIN equipos e ON e.id = eu.equipo_id
    WHERE s.created_at BETWEEN $1 AND $2
      AND s.org_id = $3
    GROUP BY e.marca, e.modelo
    ORDER BY cantidad DESC
    LIMIT 10`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  return {
    porPeriodo: serviciosPorPeriodo.rows,
    porEstado: serviciosPorEstado.rows,
    tiempoResolucion: tiempoResolucion.rows[0],
    porEquipo: serviciosPorEquipo.rows,
  };
}

async function getClientesAnalytics(desde: Date, hasta: Date, org_id: string) {
  // Nuevos clientes por mes
  const nuevosClientes = await query(
    `SELECT
      TO_CHAR(created_at, 'YYYY-MM') as mes,
      COUNT(*) as cantidad
    FROM clientes
    WHERE created_at BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY mes`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Distribución por categoría
  const porCategoria = await query(
    `SELECT
      COALESCE(cp.nombre, 'Sin categoría') as categoria,
      COUNT(c.id) as cantidad
    FROM clientes c
    LEFT JOIN categorias_personas cp ON cp.id = c.categoria_persona_id
    WHERE c.org_id = $1
      AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
      AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
      AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
    GROUP BY cp.nombre
    ORDER BY cantidad DESC`,
    [org_id]
  );

  // Clientes activos (con actividad en el período)
  const clientesActivos = await query(
    `SELECT COUNT(DISTINCT cliente_id) as activos
    FROM facturas
    WHERE fecha_emision BETWEEN $1 AND $2
      AND org_id = $3`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Total clientes
  const totalClientes = await query(
    `SELECT COUNT(*) as total FROM clientes
     WHERE org_id = $1
       AND COALESCE(tipo_entidad, 'cliente') <> 'proveedor'
       AND UPPER(COALESCE(nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
       AND UPPER(COALESCE(nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'`,
    [org_id]
  );

  return {
    nuevos: nuevosClientes.rows,
    porCategoria: porCategoria.rows,
    activos: parseInt(clientesActivos.rows[0]?.activos || 0),
    total: parseInt(totalClientes.rows[0]?.total || 0),
    tasaActividad:
      totalClientes.rows[0]?.total > 0
        ? (
            (clientesActivos.rows[0]?.activos / totalClientes.rows[0]?.total) *
            100
          ).toFixed(1)
        : 0,
  };
}

async function getProductosAnalytics(org_id: string) {
  // Productos más vendidos
  const masVendidos = await query(
    `SELECT
      p.id, p.nombre, p.codigo,
      COALESCE(SUM(fi.cantidad), 0) as unidades,
      COALESCE(SUM(fi.subtotal), 0) as total
    FROM productos p
    LEFT JOIN factura_items fi ON fi.producto_id = p.id
    WHERE p.org_id = $1
    GROUP BY p.id, p.nombre, p.codigo
    ORDER BY unidades DESC
    LIMIT 10`,
    [org_id]
  );

  // Stock bajo
  const stockBajo = await query(
    `SELECT
      p.id, p.nombre, p.codigo,
      p.stock_actual, p.stock_minimo
    FROM productos p
    WHERE p.stock_actual < p.stock_minimo
      AND p.stock_minimo > 0
      AND p.org_id = $1
    ORDER BY (p.stock_actual::float / NULLIF(p.stock_minimo, 0))
    LIMIT 10`,
    [org_id]
  );

  // Valor del inventario
  const valorInventario = await query(
    `SELECT
      COALESCE(SUM(stock_actual * COALESCE(precio_costo, 0)), 0) as costo,
      COALESCE(SUM(stock_actual * COALESCE(precio_venta, 0)), 0) as venta
    FROM productos
    WHERE org_id = $1`,
    [org_id]
  );

  return {
    masVendidos: masVendidos.rows,
    stockBajo: stockBajo.rows,
    valorInventario: valorInventario.rows[0],
  };
}

async function getCobranzasAnalytics(desde: Date, hasta: Date, groupBy: string, org_id: string) {
  const dateFormat = getDateFormat(groupBy);

  // Cobranzas por período
  const cobranzasPorPeriodo = await query(
    `SELECT
      TO_CHAR(fecha, '${dateFormat}') as periodo,
      COUNT(*) as cantidad,
      COALESCE(SUM(monto), 0) as total
    FROM pagos
    WHERE fecha BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY TO_CHAR(fecha, '${dateFormat}')
    ORDER BY MIN(fecha)`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Por método de pago
  const porMetodo = await query(
    `SELECT
      COALESCE(metodo_pago, 'No especificado') as metodo,
      COUNT(*) as cantidad,
      COALESCE(SUM(monto), 0) as total
    FROM pagos
    WHERE fecha BETWEEN $1 AND $2
      AND org_id = $3
    GROUP BY metodo_pago
    ORDER BY total DESC`,
    [desde.toISOString(), hasta.toISOString(), org_id]
  );

  // Deuda total
  const deudaTotal = await query(
    `SELECT
      COALESCE(SUM(saldo_pendiente), 0) as total,
      COUNT(CASE WHEN estado = 'vencida' THEN 1 END) as facturas_vencidas,
      COALESCE(SUM(CASE WHEN estado = 'vencida' THEN saldo_pendiente END), 0) as deuda_vencida
    FROM facturas
    WHERE saldo_pendiente > 0
      AND org_id = $1`,
    [org_id]
  );

  // Antigüedad de deuda
  const antiguedadDeuda = await query(
    `SELECT
      CASE
        WHEN fecha_vencimiento >= CURRENT_DATE THEN 'vigente'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 días'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 días'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 días'
        ELSE 'más de 90 días'
      END as rango,
      COUNT(*) as facturas,
      COALESCE(SUM(saldo_pendiente), 0) as monto
    FROM facturas
    WHERE saldo_pendiente > 0
      AND org_id = $1
    GROUP BY
      CASE
        WHEN fecha_vencimiento >= CURRENT_DATE THEN 'vigente'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 días'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 días'
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 días'
        ELSE 'más de 90 días'
      END
    ORDER BY
      CASE
        WHEN fecha_vencimiento >= CURRENT_DATE THEN 1
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '30 days' THEN 2
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '60 days' THEN 3
        WHEN fecha_vencimiento >= CURRENT_DATE - INTERVAL '90 days' THEN 4
        ELSE 5
      END`,
    [org_id]
  );

  return {
    porPeriodo: cobranzasPorPeriodo.rows,
    porMetodo: porMetodo.rows,
    deuda: deudaTotal.rows[0],
    antiguedad: antiguedadDeuda.rows,
  };
}

async function getKPIsGenerales(org_id: string) {
  // KPIs en tiempo real
  const [facturasHoy, serviciosActivos, alertasPendientes, clientesNuevosMes] =
    await Promise.all([
      query(
        `SELECT COUNT(*) as cantidad, COALESCE(SUM(total), 0) as total
        FROM facturas
        WHERE DATE(fecha_emision) = CURRENT_DATE
          AND org_id = $1`,
        [org_id]
      ),
      query(
        `SELECT COUNT(*) as cantidad
        FROM equipos_servicios_tecnicos
        WHERE estado NOT IN ('Entregado', 'Cancelado')
          AND org_id = $1`,
        [org_id]
      ),
      query(
        `SELECT COUNT(*) as cantidad
        FROM equipos_alertas
        WHERE estado = 'pendiente'
          AND org_id = $1`,
        [org_id]
      ),
      query(
        `SELECT COUNT(*) as cantidad
        FROM clientes
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
          AND org_id = $1`,
        [org_id]
      ),
    ]);

  return {
    facturasHoy: {
      cantidad: parseInt(facturasHoy.rows[0]?.cantidad || 0),
      total: parseFloat(facturasHoy.rows[0]?.total || 0),
    },
    serviciosActivos: parseInt(serviciosActivos.rows[0]?.cantidad || 0),
    alertasPendientes: parseInt(alertasPendientes.rows[0]?.cantidad || 0),
    clientesNuevosMes: parseInt(clientesNuevosMes.rows[0]?.cantidad || 0),
  };
}

function getDateFormat(groupBy: string): string {
  switch (groupBy) {
    case "day":
      return "YYYY-MM-DD";
    case "week":
      return "IYYY-IW";
    case "quarter":
      return "YYYY-Q";
    case "year":
      return "YYYY";
    case "month":
    default:
      return "YYYY-MM";
  }
}
