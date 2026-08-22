import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const fechaInicio = searchParams.get('fecha_inicio');
    const fechaFin = searchParams.get('fecha_fin');
    const clienteId = searchParams.get('cliente_id');
    const tipoFactura = searchParams.get('tipo_factura');

    let queryStr = `
      SELECT
        f.id,
        f.tipo_factura,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.estado,
        f.subtotal,
        f.iva,
        f.total,
        f.total_pagado,
        f.saldo_pendiente,
        f.cliente_id,
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'nombre_fantasia', c.nombre_fantasia,
          'identificador_unico', c.identificador_unico,
          'cuit', c.cuit
        ) as clientes
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE f.org_id = $1
    `;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (fechaInicio) {
      queryStr += ` AND f.fecha_emision >= $${paramIndex}`;
      params.push(fechaInicio);
      paramIndex++;
    }
    if (fechaFin) {
      queryStr += ` AND f.fecha_emision <= $${paramIndex}`;
      params.push(fechaFin);
      paramIndex++;
    }
    if (clienteId) {
      queryStr += ` AND f.cliente_id = $${paramIndex}`;
      params.push(clienteId);
      paramIndex++;
    }
    if (tipoFactura) {
      queryStr += ` AND f.tipo_factura = $${paramIndex}`;
      params.push(tipoFactura);
      paramIndex++;
    }

    queryStr += ` ORDER BY f.fecha_emision DESC`;

    const result = await query(queryStr, params);
    const facturas = result.rows || [];

    // Calcular totales y estadísticas
    const totalFacturado = facturas.reduce((sum: number, f: any) => sum + (Number(f.total) || 0), 0);
    const totalPagado = facturas.reduce((sum: number, f: any) => sum + (Number(f.total_pagado) || 0), 0);
    const totalPendiente = facturas.reduce((sum: number, f: any) => sum + (Number(f.saldo_pendiente) || 0), 0);
    const totalIVA = facturas.reduce((sum: number, f: any) => sum + (Number(f.iva) || 0), 0);

    const facturasVencidas = facturas.filter((f: any) =>
      f.estado === 'vencida' ||
      (Number(f.saldo_pendiente) > 0 && f.fecha_vencimiento && new Date(f.fecha_vencimiento) < new Date())
    ).length;

    const facturasPagadas = facturas.filter((f: any) => f.estado === 'pagada').length;

    // Agrupar por cliente
    const ventasPorCliente = facturas.reduce((acc: any, factura: any) => {
      const clienteNombre = factura.clientes?.nombre_fantasia || factura.clientes?.nombre || 'Sin cliente';
      const clienteIdVal = factura.cliente_id;

      if (!acc[clienteIdVal]) {
        acc[clienteIdVal] = {
          cliente_id: clienteIdVal,
          cliente_nombre: clienteNombre,
          cliente_cuit: factura.clientes?.cuit,
          total_facturado: 0,
          total_pagado: 0,
          total_pendiente: 0,
          cantidad_facturas: 0,
        };
      }

      acc[clienteIdVal].total_facturado += Number(factura.total) || 0;
      acc[clienteIdVal].total_pagado += Number(factura.total_pagado) || 0;
      acc[clienteIdVal].total_pendiente += Number(factura.saldo_pendiente) || 0;
      acc[clienteIdVal].cantidad_facturas += 1;

      return acc;
    }, {});

    // Agrupar por mes
    const ventasPorMes = facturas.reduce((acc: any, factura: any) => {
      const fecha = new Date(factura.fecha_emision);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[mes]) {
        acc[mes] = {
          mes,
          total_facturado: 0,
          total_pagado: 0,
          total_pendiente: 0,
          cantidad_facturas: 0,
        };
      }

      acc[mes].total_facturado += Number(factura.total) || 0;
      acc[mes].total_pagado += Number(factura.total_pagado) || 0;
      acc[mes].total_pendiente += Number(factura.saldo_pendiente) || 0;
      acc[mes].cantidad_facturas += 1;

      return acc;
    }, {});

    // Agrupar por tipo de factura
    const ventasPorTipo = facturas.reduce((acc: any, factura: any) => {
      const tipo = factura.tipo_factura || 'IVR';

      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          total_facturado: 0,
          total_pagado: 0,
          total_pendiente: 0,
          cantidad_facturas: 0,
        };
      }

      acc[tipo].total_facturado += Number(factura.total) || 0;
      acc[tipo].total_pagado += Number(factura.total_pagado) || 0;
      acc[tipo].total_pendiente += Number(factura.saldo_pendiente) || 0;
      acc[tipo].cantidad_facturas += 1;

      return acc;
    }, {});

    return NextResponse.json({
      resumen: {
        total_facturado: totalFacturado,
        total_pagado: totalPagado,
        total_pendiente: totalPendiente,
        total_iva: totalIVA,
        cantidad_facturas: facturas.length,
        facturas_pagadas: facturasPagadas,
        facturas_vencidas: facturasVencidas,
      },
      ventas_por_cliente: Object.values(ventasPorCliente),
      ventas_por_mes: Object.values(ventasPorMes).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      ventas_por_tipo: Object.values(ventasPorTipo),
      facturas: facturas,
    });
  } catch (error: any) {
    console.error('Error in ventas report:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de ventas', details: error.message },
      { status: 500 }
    );
  }
}
