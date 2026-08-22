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
    const tipoFactura = searchParams.get('tipo_factura');

    let queryStr = `
      SELECT
        f.id,
        f.tipo_factura,
        f.fecha_emision,
        f.estado,
        f.subtotal,
        f.iva,
        f.total,
        f.cliente_id,
        json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'nombre_fantasia', c.nombre_fantasia,
          'cuit', c.cuit,
          'condicion_iva', c.condicion_iva
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
    if (tipoFactura) {
      queryStr += ` AND f.tipo_factura = $${paramIndex}`;
      params.push(tipoFactura);
      paramIndex++;
    }

    queryStr += ` ORDER BY f.fecha_emision DESC`;

    const result = await query(queryStr, params);
    const facturas = result.rows || [];

    // Calcular totales de IVA
    const totalIVA = facturas.reduce((sum: number, f: any) => sum + (Number(f.iva) || 0), 0);
    const totalSubtotal = facturas.reduce((sum: number, f: any) => sum + (Number(f.subtotal) || 0), 0);
    const totalFacturado = facturas.reduce((sum: number, f: any) => sum + (Number(f.total) || 0), 0);

    // Agrupar por mes
    const ivaPorMes = facturas.reduce((acc: any, factura: any) => {
      const fecha = new Date(factura.fecha_emision);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[mes]) {
        acc[mes] = {
          mes,
          subtotal: 0,
          iva_21: 0,
          iva_105: 0,
          iva_27: 0,
          total_iva: 0,
          total: 0,
          cantidad_facturas: 0,
        };
      }

      acc[mes].subtotal += Number(factura.subtotal) || 0;
      acc[mes].iva_21 += Number(factura.iva) || 0;
      acc[mes].total_iva += Number(factura.iva) || 0;
      acc[mes].total += Number(factura.total) || 0;
      acc[mes].cantidad_facturas += 1;

      return acc;
    }, {});

    // Agrupar por tipo de factura
    const ivaPorTipo = facturas.reduce((acc: any, factura: any) => {
      const tipo = factura.tipo_factura || 'IVR';

      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          subtotal: 0,
          total_iva: 0,
          total: 0,
          cantidad_facturas: 0,
        };
      }

      acc[tipo].subtotal += Number(factura.subtotal) || 0;
      acc[tipo].total_iva += Number(factura.iva) || 0;
      acc[tipo].total += Number(factura.total) || 0;
      acc[tipo].cantidad_facturas += 1;

      return acc;
    }, {});

    // Agrupar por condición IVA del cliente
    const ivaPorCondicion = facturas.reduce((acc: any, factura: any) => {
      const condicion = factura.clientes?.condicion_iva || 'No especificado';

      if (!acc[condicion]) {
        acc[condicion] = {
          condicion,
          subtotal: 0,
          total_iva: 0,
          total: 0,
          cantidad_facturas: 0,
          cantidad_clientes: new Set(),
        };
      }

      acc[condicion].subtotal += Number(factura.subtotal) || 0;
      acc[condicion].total_iva += Number(factura.iva) || 0;
      acc[condicion].total += Number(factura.total) || 0;
      acc[condicion].cantidad_facturas += 1;
      acc[condicion].cantidad_clientes.add(factura.cliente_id);

      return acc;
    }, {});

    // Convertir Set a tamaño para cantidad_clientes
    const ivaPorCondicionArray = Object.values(ivaPorCondicion).map((item: any) => ({
      ...item,
      cantidad_clientes: item.cantidad_clientes.size,
    }));

    // Calcular libro IVA ventas (últimos 12 meses)
    const libroIVAVentas = Object.values(ivaPorMes)
      .sort((a: any, b: any) => b.mes.localeCompare(a.mes))
      .slice(0, 12)
      .reverse();

    return NextResponse.json({
      resumen: {
        total_subtotal: totalSubtotal,
        total_iva: totalIVA,
        total_facturado: totalFacturado,
        cantidad_facturas: facturas.length,
        promedio_iva_factura: facturas.length ? totalIVA / facturas.length : 0,
      },
      iva_por_mes: Object.values(ivaPorMes).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      iva_por_tipo: Object.values(ivaPorTipo),
      iva_por_condicion: ivaPorCondicionArray,
      libro_iva_ventas: libroIVAVentas,
      facturas: facturas,
    });
  } catch (error: any) {
    console.error('Error in impuestos report:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de impuestos', details: error.message },
      { status: 500 }
    );
  }
}
