import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const sameMonthLastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 7);

    // 1. RESUMEN GENERAL Y COMPARATIVAS
    const resumenQuery = await query(`
      WITH current_month AS (
        SELECT
          COALESCE(SUM(total), 0) as facturado,
          COALESCE(SUM(total_pagado), 0) as cobrado,
          COALESCE(SUM(total - COALESCE(total_pagado, 0)), 0) as pendiente,
          COUNT(*) as cantidad_facturas,
          COUNT(DISTINCT cliente_id) as clientes_activos
        FROM facturas
        WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $1 AND org_id = $4
      ),
      last_month AS (
        SELECT
          COALESCE(SUM(total), 0) as facturado,
          COALESCE(SUM(total_pagado), 0) as cobrado,
          COUNT(*) as cantidad_facturas
        FROM facturas
        WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $2 AND org_id = $4
      ),
      same_month_last_year AS (
        SELECT
          COALESCE(SUM(total), 0) as facturado,
          COALESCE(SUM(total_pagado), 0) as cobrado
        FROM facturas
        WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $3 AND org_id = $4
      ),
      totals AS (
        SELECT
          COALESCE(SUM(total), 0) as total_historico,
          COALESCE(SUM(total_pagado), 0) as total_cobrado_historico,
          COALESCE(SUM(total - COALESCE(total_pagado, 0)), 0) as total_pendiente_global,
          COUNT(*) as total_facturas,
          COUNT(DISTINCT cliente_id) as total_clientes
        FROM facturas
        WHERE org_id = $4
      )
      SELECT
        cm.facturado as mes_actual_facturado,
        cm.cobrado as mes_actual_cobrado,
        cm.pendiente as mes_actual_pendiente,
        cm.cantidad_facturas as mes_actual_facturas,
        cm.clientes_activos as mes_actual_clientes,
        lm.facturado as mes_anterior_facturado,
        lm.cobrado as mes_anterior_cobrado,
        lm.cantidad_facturas as mes_anterior_facturas,
        smly.facturado as mismo_mes_ano_anterior_facturado,
        smly.cobrado as mismo_mes_ano_anterior_cobrado,
        t.total_historico,
        t.total_cobrado_historico,
        t.total_pendiente_global,
        t.total_facturas,
        t.total_clientes
      FROM current_month cm, last_month lm, same_month_last_year smly, totals t
    `, [currentMonth, lastMonth, sameMonthLastYear, session.org_id]);

    // 2. SCORE DE SALUD DEL NEGOCIO
    const saludQuery = await query(`
      WITH metricas AS (
        SELECT
          -- Tasa de cobranza (últimos 90 días)
          CASE
            WHEN SUM(total) > 0 THEN (SUM(total_pagado) / SUM(total)) * 100
            ELSE 0
          END as tasa_cobranza,
          -- Facturas vencidas
          COUNT(*) FILTER (WHERE fecha_vencimiento < CURRENT_DATE AND estado != 'pagada') as facturas_vencidas,
          COUNT(*) as total_facturas,
          -- Concentración (top cliente vs total)
          (
            SELECT COALESCE(MAX(cliente_total) / NULLIF(SUM(cliente_total), 0) * 100, 0)
            FROM (
              SELECT SUM(total) as cliente_total
              FROM facturas
              WHERE fecha_emision >= CURRENT_DATE - INTERVAL '90 days' AND org_id = $3
              GROUP BY cliente_id
            ) sub
          ) as concentracion_max_cliente
        FROM facturas
        WHERE fecha_emision >= CURRENT_DATE - INTERVAL '90 days' AND org_id = $3
      ),
      tendencia AS (
        SELECT
          COALESCE(
            (SELECT SUM(total) FROM facturas WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $1 AND org_id = $3) /
            NULLIF((SELECT SUM(total) FROM facturas WHERE TO_CHAR(fecha_emision, 'YYYY-MM') = $2 AND org_id = $3), 0) * 100 - 100,
            0
          ) as crecimiento_vs_mes_anterior
      )
      SELECT
        m.tasa_cobranza,
        m.facturas_vencidas,
        m.total_facturas,
        m.concentracion_max_cliente,
        t.crecimiento_vs_mes_anterior
      FROM metricas m, tendencia t
    `, [currentMonth, lastMonth, session.org_id]);

    // 3. ALERTAS ACCIONABLES
    // Facturas vencidas (más de 30 días)
    const facturasVencidasQuery = await query(`
      SELECT
        f.id,
        f.total,
        f.total_pagado,
        f.total - COALESCE(f.total_pagado, 0) as saldo_pendiente,
        f.fecha_emision,
        f.fecha_vencimiento,
        CURRENT_DATE - f.fecha_vencimiento as dias_vencida,
        c.nombre as cliente_nombre,
        c.id as cliente_id,
        c.telefono,
        c.email
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      WHERE f.org_id = $1
        AND f.fecha_vencimiento < CURRENT_DATE
        AND f.estado != 'pagada'
        AND f.total - COALESCE(f.total_pagado, 0) > 0
      ORDER BY dias_vencida DESC
      LIMIT 20
    `, [session.org_id]);

    // Facturas por vencer en 7 días (para llamar)
    const facturasPorVencerQuery = await query(`
      SELECT
        f.id,
        f.total,
        f.total - COALESCE(f.total_pagado, 0) as saldo_pendiente,
        f.fecha_vencimiento,
        f.fecha_vencimiento - CURRENT_DATE as dias_para_vencer,
        c.nombre as cliente_nombre,
        c.id as cliente_id,
        c.telefono,
        c.email
      FROM facturas f
      JOIN clientes c ON f.cliente_id = c.id
      WHERE f.org_id = $1
        AND f.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
        AND f.estado != 'pagada'
        AND f.total - COALESCE(f.total_pagado, 0) > 0
      ORDER BY f.fecha_vencimiento ASC
      LIMIT 15
    `, [session.org_id]);

    // Clientes con saldo a favor sin usar
    const clientesSaldoFavorQuery = await query(`
      SELECT
        c.id,
        c.nombre,
        c.saldo_a_favor,
        c.telefono,
        c.email,
        (SELECT MAX(fecha_emision) FROM facturas WHERE cliente_id = c.id AND org_id = $1) as ultima_factura
      FROM clientes c
      WHERE c.org_id = $1
        AND c.saldo_a_favor > 0
        AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
        AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
        AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
      ORDER BY c.saldo_a_favor DESC
      LIMIT 10
    `, [session.org_id]);

    // 4. CLIENTES DORMIDOS (compraban regularmente pero no en últimos 60 días)
    const clientesDormidosQuery = await query(`
      WITH cliente_actividad AS (
        SELECT
          cliente_id,
          COUNT(*) as total_facturas,
          SUM(total) as total_facturado,
          MAX(fecha_emision) as ultima_compra,
          MIN(fecha_emision) as primera_compra,
          AVG(total) as ticket_promedio
        FROM facturas
        WHERE org_id = $1
        GROUP BY cliente_id
        HAVING COUNT(*) >= 2
      )
      SELECT
        c.id,
        c.nombre,
        c.telefono,
        c.email,
        ca.total_facturas,
        ca.total_facturado,
        ca.ticket_promedio,
        ca.ultima_compra,
        ca.primera_compra,
        CURRENT_DATE - ca.ultima_compra as dias_sin_comprar
      FROM cliente_actividad ca
      JOIN clientes c ON ca.cliente_id = c.id
      WHERE ca.ultima_compra < CURRENT_DATE - INTERVAL '60 days'
        AND ca.ultima_compra > CURRENT_DATE - INTERVAL '365 days'
        AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
        AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
        AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
      ORDER BY ca.total_facturado DESC
      LIMIT 15
    `, [session.org_id]);

    // 5. ANÁLISIS DE CONCENTRACIÓN (Pareto)
    const concentracionQuery = await query(`
      WITH cliente_totales AS (
        SELECT
          c.id,
          c.nombre,
          COALESCE(SUM(f.total), 0) as total_facturado,
          COUNT(f.id) as cantidad_facturas
        FROM clientes c
        LEFT JOIN facturas f ON f.cliente_id = c.id AND f.org_id = $1
        WHERE c.org_id = $1
          AND COALESCE(c.tipo_entidad, 'cliente') <> 'proveedor'
          AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CONSUMIDOR FINAL%'
          AND UPPER(COALESCE(c.nombre, '')) NOT LIKE '%CLIENTE OCASIONAL%'
        GROUP BY c.id, c.nombre
        HAVING SUM(f.total) > 0
        ORDER BY total_facturado DESC
      ),
      totales AS (
        SELECT SUM(total_facturado) as gran_total FROM cliente_totales
      ),
      con_porcentaje AS (
        SELECT
          ct.*,
          ct.total_facturado / t.gran_total * 100 as porcentaje,
          SUM(ct.total_facturado) OVER (ORDER BY ct.total_facturado DESC) / t.gran_total * 100 as porcentaje_acumulado,
          ROW_NUMBER() OVER (ORDER BY ct.total_facturado DESC) as ranking
        FROM cliente_totales ct, totales t
      )
      SELECT * FROM con_porcentaje
      LIMIT 20
    `, [session.org_id]);

    // Calcular cuántos clientes hacen el 80%
    const pareto80 = concentracionQuery.rows.find((r: any) => r.porcentaje_acumulado >= 80);
    const clientesPara80 = pareto80 ? pareto80.ranking : concentracionQuery.rows.length;
    const totalClientes = await query(`SELECT COUNT(DISTINCT cliente_id) as total FROM facturas WHERE org_id = $1`, [session.org_id]);

    // 6. DSO (Days Sales Outstanding)
    const dsoQuery = await query(`
      WITH pagos_por_factura AS (
        SELECT
          f.id,
          f.fecha_emision,
          f.total,
          MIN(p.fecha_pago) as primera_fecha_pago,
          MIN(p.fecha_pago) - f.fecha_emision as dias_para_cobrar
        FROM facturas f
        JOIN pagos p ON p.factura_id = f.id
        WHERE f.fecha_emision >= CURRENT_DATE - INTERVAL '180 days' AND f.org_id = $1
        GROUP BY f.id, f.fecha_emision, f.total
      )
      SELECT
        ROUND(AVG(dias_para_cobrar)) as dso_promedio,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dias_para_cobrar)) as dso_mediana,
        MIN(dias_para_cobrar) as dso_minimo,
        MAX(dias_para_cobrar) as dso_maximo,
        COUNT(*) as facturas_analizadas
      FROM pagos_por_factura
      WHERE dias_para_cobrar >= 0
    `, [session.org_id]);

    // DSO por mes (tendencia)
    const dsoTendenciaQuery = await query(`
      WITH pagos_por_factura AS (
        SELECT
          TO_CHAR(f.fecha_emision, 'YYYY-MM') as mes,
          MIN(p.fecha_pago) - f.fecha_emision as dias_para_cobrar
        FROM facturas f
        JOIN pagos p ON p.factura_id = f.id
        WHERE f.fecha_emision >= CURRENT_DATE - INTERVAL '12 months' AND f.org_id = $1
        GROUP BY f.id, f.fecha_emision
      )
      SELECT
        mes,
        ROUND(AVG(dias_para_cobrar)) as dso_promedio,
        COUNT(*) as facturas
      FROM pagos_por_factura
      WHERE dias_para_cobrar >= 0
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `, [session.org_id]);

    // 7. TOP PRODUCTOS/SERVICIOS
    const topProductosQuery = await query(`
      SELECT
        fi.descripcion,
        fi.producto_id,
        COUNT(*) as veces_vendido,
        SUM(fi.cantidad) as cantidad_total,
        SUM(fi.subtotal) as total_facturado,
        AVG(fi.precio_unitario) as precio_promedio
      FROM facturas_items fi
      JOIN facturas f ON fi.factura_id = f.id
      WHERE f.fecha_emision >= CURRENT_DATE - INTERVAL '90 days' AND f.org_id = $1
      GROUP BY fi.descripcion, fi.producto_id
      ORDER BY total_facturado DESC
      LIMIT 10
    `, [session.org_id]);

    // 8. TENDENCIA MENSUAL (últimos 12 meses) con variaciones
    const tendenciaMensualQuery = await query(`
      WITH monthly_data AS (
        SELECT
          TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
          SUM(total) as facturado,
          SUM(total_pagado) as cobrado,
          SUM(total - COALESCE(total_pagado, 0)) as pendiente,
          COUNT(*) as cantidad_facturas,
          COUNT(DISTINCT cliente_id) as clientes_activos,
          AVG(total) as ticket_promedio
        FROM facturas
        WHERE fecha_emision >= CURRENT_DATE - INTERVAL '13 months' AND org_id = $1
        GROUP BY TO_CHAR(fecha_emision, 'YYYY-MM')
      )
      SELECT
        m.*,
        LAG(m.facturado) OVER (ORDER BY m.mes) as facturado_mes_anterior,
        LAG(m.cobrado) OVER (ORDER BY m.mes) as cobrado_mes_anterior,
        LAG(m.cantidad_facturas) OVER (ORDER BY m.mes) as facturas_mes_anterior,
        LAG(m.clientes_activos) OVER (ORDER BY m.mes) as clientes_mes_anterior,
        CASE
          WHEN LAG(m.facturado) OVER (ORDER BY m.mes) > 0
          THEN ((m.facturado - LAG(m.facturado) OVER (ORDER BY m.mes)) / LAG(m.facturado) OVER (ORDER BY m.mes) * 100)
          ELSE 0
        END as variacion_facturado,
        CASE
          WHEN LAG(m.cobrado) OVER (ORDER BY m.mes) > 0
          THEN ((m.cobrado - LAG(m.cobrado) OVER (ORDER BY m.mes)) / LAG(m.cobrado) OVER (ORDER BY m.mes) * 100)
          ELSE 0
        END as variacion_cobrado
      FROM monthly_data m
      ORDER BY mes DESC
      LIMIT 12
    `, [session.org_id]);

    // 8.1 COMPARATIVA AÑO A AÑO
    const comparativaAnualQuery = await query(`
      WITH year_data AS (
        SELECT
          EXTRACT(YEAR FROM fecha_emision) as ano,
          SUM(total) as facturado,
          SUM(total_pagado) as cobrado,
          COUNT(*) as cantidad_facturas,
          COUNT(DISTINCT cliente_id) as clientes_activos,
          AVG(total) as ticket_promedio
        FROM facturas
        WHERE fecha_emision >= CURRENT_DATE - INTERVAL '3 years' AND org_id = $1
        GROUP BY EXTRACT(YEAR FROM fecha_emision)
      )
      SELECT
        y.*,
        LAG(y.facturado) OVER (ORDER BY y.ano) as facturado_ano_anterior,
        CASE
          WHEN LAG(y.facturado) OVER (ORDER BY y.ano) > 0
          THEN ((y.facturado - LAG(y.facturado) OVER (ORDER BY y.ano)) / LAG(y.facturado) OVER (ORDER BY y.ano) * 100)
          ELSE 0
        END as variacion_anual
      FROM year_data y
      ORDER BY ano DESC
    `, [session.org_id]);

    // 8.2 COMPARATIVA TRIMESTRAL
    const comparativaTrimestralQuery = await query(`
      WITH quarter_data AS (
        SELECT
          EXTRACT(YEAR FROM fecha_emision) || '-Q' || EXTRACT(QUARTER FROM fecha_emision) as trimestre,
          EXTRACT(YEAR FROM fecha_emision) as ano,
          EXTRACT(QUARTER FROM fecha_emision) as quarter,
          SUM(total) as facturado,
          SUM(total_pagado) as cobrado,
          COUNT(*) as cantidad_facturas,
          COUNT(DISTINCT cliente_id) as clientes_activos
        FROM facturas
        WHERE fecha_emision >= CURRENT_DATE - INTERVAL '2 years' AND org_id = $1
        GROUP BY EXTRACT(YEAR FROM fecha_emision), EXTRACT(QUARTER FROM fecha_emision)
      )
      SELECT
        q.*,
        LAG(q.facturado) OVER (ORDER BY q.ano, q.quarter) as facturado_trim_anterior,
        CASE
          WHEN LAG(q.facturado) OVER (ORDER BY q.ano, q.quarter) > 0
          THEN ((q.facturado - LAG(q.facturado) OVER (ORDER BY q.ano, q.quarter)) / LAG(q.facturado) OVER (ORDER BY q.ano, q.quarter) * 100)
          ELSE 0
        END as variacion_trimestral
      FROM quarter_data q
      ORDER BY ano DESC, quarter DESC
      LIMIT 8
    `, [session.org_id]);

    // 9. PREDICCIÓN DE COBRANZA (basado en comportamiento histórico)
    const prediccionCobranzaQuery = await query(`
      WITH historial_pagos AS (
        SELECT
          f.cliente_id,
          AVG(CASE WHEN p.id IS NOT NULL THEN 1.0 ELSE 0.0 END) as tasa_pago_historica,
          AVG(
            CASE WHEN p.fecha_pago IS NOT NULL
            THEN (p.fecha_pago - f.fecha_emision)::numeric
            ELSE NULL END
          ) as dias_promedio_pago
        FROM facturas f
        LEFT JOIN pagos p ON p.factura_id = f.id
        WHERE f.fecha_emision >= CURRENT_DATE - INTERVAL '365 days' AND f.org_id = $1
        GROUP BY f.cliente_id
      ),
      facturas_pendientes AS (
        SELECT
          f.id,
          f.cliente_id,
          f.total - COALESCE(f.total_pagado, 0) as saldo,
          f.fecha_vencimiento,
          c.nombre as cliente_nombre
        FROM facturas f
        JOIN clientes c ON f.cliente_id = c.id
        WHERE f.org_id = $1
          AND f.estado != 'pagada'
          AND f.total - COALESCE(f.total_pagado, 0) > 0
      )
      SELECT
        fp.id,
        fp.cliente_nombre,
        fp.saldo,
        fp.fecha_vencimiento,
        COALESCE(hp.tasa_pago_historica, 0.5) as probabilidad_pago,
        fp.saldo * COALESCE(hp.tasa_pago_historica, 0.5) as cobranza_esperada,
        COALESCE(hp.dias_promedio_pago, 30) as dias_estimados_cobro
      FROM facturas_pendientes fp
      LEFT JOIN historial_pagos hp ON fp.cliente_id = hp.cliente_id
      ORDER BY cobranza_esperada DESC
      LIMIT 20
    `, [session.org_id]);

    // Calcular totales de predicción
    const totalPrediccion = prediccionCobranzaQuery.rows.reduce((sum: number, r: any) =>
      sum + parseFloat(r.cobranza_esperada || 0), 0
    );
    const totalPendienteReal = prediccionCobranzaQuery.rows.reduce((sum: number, r: any) =>
      sum + parseFloat(r.saldo || 0), 0
    );

    // CALCULAR SCORE DE SALUD (0-100)
    const salud = saludQuery.rows[0] || {};
    const tasaCobranza = parseFloat(salud.tasa_cobranza) || 0;
    const crecimiento = parseFloat(salud.crecimiento_vs_mes_anterior) || 0;
    const concentracion = parseFloat(salud.concentracion_max_cliente) || 0;
    const factVencidas = parseInt(salud.facturas_vencidas) || 0;
    const totalFact = parseInt(salud.total_facturas) || 1;

    // Componentes del score
    const scoreCobranza = Math.min(tasaCobranza, 100) * 0.35; // 35% del score
    const scoreCrecimiento = Math.min(Math.max(crecimiento + 50, 0), 100) * 0.25; // 25% (normalizado -50 a +50)
    const scoreConcentracion = Math.max(100 - concentracion, 0) * 0.20; // 20% (menos concentración = mejor)
    const scoreVencidas = Math.max(100 - (factVencidas / totalFact * 100), 0) * 0.20; // 20%

    const scoreTotal = Math.round(scoreCobranza + scoreCrecimiento + scoreConcentracion + scoreVencidas);

    return NextResponse.json({
      resumen: resumenQuery.rows[0] || {},
      salud: {
        score: scoreTotal,
        componentes: {
          cobranza: { valor: tasaCobranza, peso: 35, aporte: Math.round(scoreCobranza) },
          crecimiento: { valor: crecimiento, peso: 25, aporte: Math.round(scoreCrecimiento) },
          concentracion: { valor: concentracion, peso: 20, aporte: Math.round(scoreConcentracion) },
          vencidas: { valor: factVencidas, total: totalFact, peso: 20, aporte: Math.round(scoreVencidas) }
        }
      },
      alertas: {
        facturas_vencidas: facturasVencidasQuery.rows,
        facturas_por_vencer: facturasPorVencerQuery.rows,
        clientes_saldo_favor: clientesSaldoFavorQuery.rows,
        clientes_dormidos: clientesDormidosQuery.rows
      },
      concentracion: {
        clientes: concentracionQuery.rows,
        pareto: {
          clientes_para_80_porciento: clientesPara80,
          total_clientes: totalClientes.rows[0]?.total || 0,
          porcentaje_clientes: Math.round((clientesPara80 / (totalClientes.rows[0]?.total || 1)) * 100)
        }
      },
      dso: {
        actual: dsoQuery.rows[0] || {},
        tendencia: dsoTendenciaQuery.rows
      },
      top_productos: topProductosQuery.rows,
      tendencia_mensual: tendenciaMensualQuery.rows,
      comparativa_anual: comparativaAnualQuery.rows,
      comparativa_trimestral: comparativaTrimestralQuery.rows,
      prediccion_cobranza: {
        detalle: prediccionCobranzaQuery.rows,
        total_esperado: totalPrediccion,
        total_pendiente: totalPendienteReal,
        tasa_esperada: totalPendienteReal > 0 ? (totalPrediccion / totalPendienteReal * 100) : 0
      }
    });

  } catch (error: any) {
    console.error('Error en inteligencia comercial:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte', details: error.message },
      { status: 500 }
    );
  }
}
