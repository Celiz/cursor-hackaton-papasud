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
    const tecnico = searchParams.get('tecnico');
    const estado = searchParams.get('estado');

    let queryStr = `SELECT * FROM servicios WHERE org_id = $1`;
    const params: any[] = [session.org_id];
    let paramIndex = 2;

    if (fechaInicio) {
      queryStr += ` AND fecha >= $${paramIndex}`;
      params.push(fechaInicio);
      paramIndex++;
    }
    if (fechaFin) {
      queryStr += ` AND fecha <= $${paramIndex}`;
      params.push(fechaFin);
      paramIndex++;
    }
    if (tecnico) {
      queryStr += ` AND tecnico = $${paramIndex}`;
      params.push(tecnico);
      paramIndex++;
    }
    if (estado) {
      queryStr += ` AND estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }

    queryStr += ` ORDER BY fecha DESC`;

    const result = await query(queryStr, params);
    const servicios = result.rows || [];

    // Calcular totales
    const totalServicios = servicios.length;
    const totalFacturado = servicios.reduce((sum: number, s: any) => sum + (Number(s.monto_servicio) || 0) + (Number(s.monto_insumos) || 0), 0);
    const serviciosCompletados = servicios.filter((s: any) => s.estado === 'completado').length;
    const serviciosEnProceso = servicios.filter((s: any) => s.estado === 'en proceso').length;
    const serviciosPendientes = servicios.filter((s: any) => s.estado === 'pendiente').length;
    const serviciosFacturados = servicios.filter((s: any) => s.facturado).length;

    const promedioValorServicio = totalServicios > 0 ? totalFacturado / totalServicios : 0;

    // Agrupar por técnico
    const serviciosPorTecnico = servicios.reduce((acc: any, servicio: any) => {
      const tecnicoNombre = servicio.tecnico || 'Sin asignar';

      if (!acc[tecnicoNombre]) {
        acc[tecnicoNombre] = {
          tecnico: tecnicoNombre,
          cantidad_servicios: 0,
          servicios_completados: 0,
          servicios_en_proceso: 0,
          servicios_pendientes: 0,
          total_facturado: 0,
          servicios_facturados: 0,
        };
      }

      acc[tecnicoNombre].cantidad_servicios += 1;
      if (servicio.estado === 'completado') acc[tecnicoNombre].servicios_completados += 1;
      if (servicio.estado === 'en proceso') acc[tecnicoNombre].servicios_en_proceso += 1;
      if (servicio.estado === 'pendiente') acc[tecnicoNombre].servicios_pendientes += 1;
      acc[tecnicoNombre].total_facturado += (Number(servicio.monto_servicio) || 0) + (Number(servicio.monto_insumos) || 0);
      if (servicio.facturado) acc[tecnicoNombre].servicios_facturados += 1;

      return acc;
    }, {});

    // Agrupar por mes
    const serviciosPorMes = servicios.reduce((acc: any, servicio: any) => {
      const fecha = new Date(servicio.fecha);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[mes]) {
        acc[mes] = {
          mes,
          cantidad_servicios: 0,
          servicios_completados: 0,
          total_facturado: 0,
          servicios_facturados: 0,
        };
      }

      acc[mes].cantidad_servicios += 1;
      if (servicio.estado === 'completado') acc[mes].servicios_completados += 1;
      acc[mes].total_facturado += (Number(servicio.monto_servicio) || 0) + (Number(servicio.monto_insumos) || 0);
      if (servicio.facturado) acc[mes].servicios_facturados += 1;

      return acc;
    }, {});

    // Agrupar por tipo de servicio
    const serviciosPorTipo = servicios.reduce((acc: any, servicio: any) => {
      const tipo = servicio.tipo_servicio || 'No especificado';

      if (!acc[tipo]) {
        acc[tipo] = {
          tipo,
          cantidad_servicios: 0,
          total_facturado: 0,
          servicios_completados: 0,
        };
      }

      acc[tipo].cantidad_servicios += 1;
      acc[tipo].total_facturado += (Number(servicio.monto_servicio) || 0) + (Number(servicio.monto_insumos) || 0);
      if (servicio.estado === 'completado') acc[tipo].servicios_completados += 1;

      return acc;
    }, {});

    // Agrupar por estado
    const serviciosPorEstado = servicios.reduce((acc: any, servicio: any) => {
      const estadoVal = servicio.estado || 'sin estado';

      if (!acc[estadoVal]) {
        acc[estadoVal] = {
          estado: estadoVal,
          cantidad_servicios: 0,
          total_facturado: 0,
        };
      }

      acc[estadoVal].cantidad_servicios += 1;
      acc[estadoVal].total_facturado += (Number(servicio.monto_servicio) || 0) + (Number(servicio.monto_insumos) || 0);

      return acc;
    }, {});

    return NextResponse.json({
      resumen: {
        total_servicios: totalServicios,
        total_facturado: totalFacturado,
        servicios_completados: serviciosCompletados,
        servicios_en_proceso: serviciosEnProceso,
        servicios_pendientes: serviciosPendientes,
        servicios_facturados: serviciosFacturados,
        promedio_valor_servicio: promedioValorServicio,
        tasa_completados: totalServicios > 0 ? (serviciosCompletados / totalServicios) * 100 : 0,
        tasa_facturacion: totalServicios > 0 ? (serviciosFacturados / totalServicios) * 100 : 0,
      },
      servicios_por_tecnico: Object.values(serviciosPorTecnico),
      servicios_por_mes: Object.values(serviciosPorMes).sort((a: any, b: any) => a.mes.localeCompare(b.mes)),
      servicios_por_tipo: Object.values(serviciosPorTipo),
      servicios_por_estado: Object.values(serviciosPorEstado),
      servicios: servicios,
    });
  } catch (error: any) {
    console.error('Error in servicios report:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de servicios', details: error.message },
      { status: 500 }
    );
  }
}
