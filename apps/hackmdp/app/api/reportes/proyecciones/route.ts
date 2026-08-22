import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const revalidate = 0;

// Motor de proyección de ventas
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesesProyeccion = parseInt(searchParams.get('meses') || '3');

    // 1. Obtener datos históricos de ventas (últimos 24 meses)
    const historicoResult = await query(`
      SELECT
        TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
        COALESCE(SUM(total), 0) as facturado,
        COUNT(*) as cantidad_facturas,
        COUNT(DISTINCT cliente_id) as clientes_activos,
        COALESCE(AVG(total), 0) as ticket_promedio
      FROM facturas
      WHERE fecha_emision >= NOW() - INTERVAL '24 months'
        AND tipo_factura IN ('A', 'B', 'C', 'FA', 'FB', 'FC', 'IVR')
        AND org_id = $1
      GROUP BY TO_CHAR(fecha_emision, 'YYYY-MM')
      ORDER BY mes ASC
    `, [session.org_id]);

    const historico = historicoResult.rows;

    if (historico.length < 3) {
      return NextResponse.json({
        proyecciones: [],
        historico: [],
        mensaje: 'Se necesitan al menos 3 meses de datos para generar proyecciones',
        metricas: null,
      });
    }

    // 2. Calcular tendencia y estacionalidad
    const valores = historico.map((h: any) => parseFloat(h.facturado) || 0);

    // Tendencia lineal usando regresión simple
    const n = valores.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = valores.reduce((a, b) => a + b, 0);
    const sumXY = valores.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercepto = (sumY - pendiente * sumX) / n;

    // Calcular índices de estacionalidad (si hay datos de más de 12 meses)
    const estacionalidad: Record<number, number> = {};
    if (historico.length >= 12) {
      // Agrupar por mes del año
      const porMesDelAño: Record<number, number[]> = {};
      historico.forEach((h: any) => {
        const mesNum = parseInt(h.mes.split('-')[1]);
        if (!porMesDelAño[mesNum]) porMesDelAño[mesNum] = [];
        porMesDelAño[mesNum].push(parseFloat(h.facturado));
      });

      // Calcular promedio general
      const promedioGeneral = sumY / n;

      // Calcular índice de estacionalidad para cada mes
      for (const [mes, valores] of Object.entries(porMesDelAño)) {
        const promedioMes = valores.reduce((a, b) => a + b, 0) / valores.length;
        estacionalidad[parseInt(mes)] = promedioMes / promedioGeneral;
      }
    }

    // 3. Generar proyecciones
    const proyecciones: any[] = [];
    const ultimoMes = historico[historico.length - 1].mes;
    const [ultimoAnio, ultimoMesNum] = ultimoMes.split('-').map(Number);

    for (let i = 1; i <= mesesProyeccion; i++) {
      let mesProyectado = ultimoMesNum + i;
      let anioProyectado = ultimoAnio;

      if (mesProyectado > 12) {
        mesProyectado = mesProyectado - 12;
        anioProyectado += 1;
      }

      // Proyección base (tendencia lineal)
      const x = n + i - 1;
      let valorProyectado = intercepto + pendiente * x;

      // Aplicar factor de estacionalidad si existe
      if (estacionalidad[mesProyectado]) {
        valorProyectado *= estacionalidad[mesProyectado];
      }

      // Calcular intervalo de confianza (usando desviación estándar de los errores)
      const errores = valores.map((v, idx) => v - (intercepto + pendiente * idx));
      const stdError = Math.sqrt(errores.reduce((sum, e) => sum + e * e, 0) / (n - 2));

      // Margen de error crece con la distancia de proyección
      const margenError = stdError * 1.96 * Math.sqrt(1 + (1/n) + Math.pow(i, 2) / sumX2);

      const mesStr = `${anioProyectado}-${String(mesProyectado).padStart(2, '0')}`;

      proyecciones.push({
        mes: mesStr,
        proyeccion: Math.max(0, Math.round(valorProyectado)),
        limite_inferior: Math.max(0, Math.round(valorProyectado - margenError)),
        limite_superior: Math.round(valorProyectado + margenError),
        confianza: Math.max(0.5, 0.95 - (i - 1) * 0.1), // Confianza decrece con la distancia
        estacionalidad: estacionalidad[mesProyectado] || 1,
      });
    }

    // 4. Calcular métricas de precisión (comparando proyecciones pasadas vs reales)
    let maePasado = 0;
    let mapePasado = 0;
    let proyeccionesValidadas = 0;

    if (historico.length >= 6) {
      // Tomar últimos 3 meses como "test" y anteriores como "entrenamiento"
      const testSet = historico.slice(-3);
      const trainSet = historico.slice(0, -3);

      if (trainSet.length >= 3) {
        const valoresTrain = trainSet.map((h: any) => parseFloat(h.facturado) || 0);
        const nTrain = valoresTrain.length;
        const sumXTrain = (nTrain * (nTrain - 1)) / 2;
        const sumYTrain = valoresTrain.reduce((a, b) => a + b, 0);
        const sumXYTrain = valoresTrain.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2Train = (nTrain * (nTrain - 1) * (2 * nTrain - 1)) / 6;

        const pendienteTrain = (nTrain * sumXYTrain - sumXTrain * sumYTrain) / (nTrain * sumX2Train - sumXTrain * sumXTrain);
        const interceptoTrain = (sumYTrain - pendienteTrain * sumXTrain) / nTrain;

        testSet.forEach((test: any, idx: number) => {
          const xTest = nTrain + idx;
          const proyeccionTest = interceptoTrain + pendienteTrain * xTest;
          const real = parseFloat(test.facturado);

          maePasado += Math.abs(proyeccionTest - real);
          if (real > 0) {
            mapePasado += Math.abs(proyeccionTest - real) / real;
          }
          proyeccionesValidadas++;
        });

        if (proyeccionesValidadas > 0) {
          maePasado /= proyeccionesValidadas;
          mapePasado = (mapePasado / proyeccionesValidadas) * 100;
        }
      }
    }

    // 5. Análisis adicional: mejores y peores meses históricos
    const sortedByValue = [...historico].sort((a: any, b: any) =>
      parseFloat(b.facturado) - parseFloat(a.facturado)
    );

    const mejoresMeses = sortedByValue.slice(0, 3);
    const peoresMeses = sortedByValue.slice(-3).reverse();

    // 6. Calcular crecimiento esperado
    const totalProyectado = proyecciones.reduce((sum, p) => sum + p.proyeccion, 0);
    const ultimosTresMeses = historico.slice(-3);
    const totalUltimosTres = ultimosTresMeses.reduce((sum: number, h: any) =>
      sum + parseFloat(h.facturado), 0
    );
    const crecimientoEsperado = totalUltimosTres > 0
      ? ((totalProyectado - totalUltimosTres) / totalUltimosTres) * 100
      : 0;

    // 7. Proyección de clientes (basado en tendencia)
    const clientesPorMes = historico.map((h: any) => parseInt(h.clientes_activos) || 0);
    const avgClientes = clientesPorMes.reduce((a, b) => a + b, 0) / clientesPorMes.length;
    const tendenciaClientes = clientesPorMes.length >= 2
      ? (clientesPorMes[clientesPorMes.length - 1] - clientesPorMes[0]) / clientesPorMes.length
      : 0;

    const clientesProyectados = Math.round(avgClientes + tendenciaClientes * mesesProyeccion);

    return NextResponse.json({
      proyecciones,
      historico: historico.map((h: any) => ({
        mes: h.mes,
        facturado: parseFloat(h.facturado),
        cantidad_facturas: parseInt(h.cantidad_facturas),
        clientes_activos: parseInt(h.clientes_activos),
        ticket_promedio: parseFloat(h.ticket_promedio),
      })),
      metricas: {
        tendencia: {
          direccion: pendiente > 0 ? 'creciente' : pendiente < 0 ? 'decreciente' : 'estable',
          cambio_mensual: Math.round(pendiente),
          intercepto: Math.round(intercepto),
        },
        precision: {
          mae: Math.round(maePasado), // Mean Absolute Error
          mape: Math.round(mapePasado * 10) / 10, // Mean Absolute Percentage Error
          proyecciones_validadas: proyeccionesValidadas,
        },
        estacionalidad: Object.entries(estacionalidad).map(([mes, factor]) => ({
          mes: parseInt(mes),
          nombre_mes: new Date(2000, parseInt(mes) - 1).toLocaleString('es-AR', { month: 'long' }),
          factor: Math.round(factor * 100) / 100,
        })),
        resumen: {
          total_proyectado: totalProyectado,
          total_ultimos_meses: totalUltimosTres,
          crecimiento_esperado: Math.round(crecimientoEsperado * 10) / 10,
          clientes_proyectados: clientesProyectados,
          promedio_historico: Math.round(sumY / n),
        },
        analisis: {
          mejores_meses: mejoresMeses.map((m: any) => ({
            mes: m.mes,
            facturado: parseFloat(m.facturado),
          })),
          peores_meses: peoresMeses.map((m: any) => ({
            mes: m.mes,
            facturado: parseFloat(m.facturado),
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Error en proyecciones:', error);
    return NextResponse.json(
      { error: 'Error al generar proyecciones', details: error.message },
      { status: 500 }
    );
  }
}
