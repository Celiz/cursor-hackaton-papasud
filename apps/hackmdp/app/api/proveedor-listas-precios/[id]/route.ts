import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/proveedor-listas-precios/[id]
 * Obtiene una lista de precios con todos sus items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Obtener lista
    const listaResult = await query(`
      SELECT
        plp.*,
        prov.nombre as proveedor_nombre,
        prov.cuit as proveedor_cuit,
        prov.email as proveedor_email
      FROM proveedor_listas_precios plp
      JOIN proveedores prov ON prov.id = plp.proveedor_id
      WHERE plp.id = $1 AND plp.org_id = $2
    `, [id, session.org_id]);

    if (listaResult.rowCount === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    const lista = listaResult.rows[0];

    // Obtener items (con precio de la lista anterior del mismo proveedor/tipo, para variación)
    const itemsResult = await query(`
      WITH lista_actual AS (
        SELECT proveedor_id, tipo, created_at
        FROM proveedor_listas_precios WHERE id = $1
      ),
      prev_lista AS (
        SELECT plp.id
        FROM proveedor_listas_precios plp, lista_actual la
        WHERE plp.proveedor_id = la.proveedor_id
          AND plp.tipo = la.tipo
          AND plp.id <> $1
          AND plp.created_at < la.created_at
        ORDER BY plp.created_at DESC
        LIMIT 1
      )
      SELECT
        pli.*,
        p.codigo as producto_codigo,
        p.nombre as producto_nombre,
        p.categoria as producto_categoria,
        p.precio_costo as producto_precio_actual,
        p.stock_actual as producto_stock,
        e.marca as equipo_marca,
        e.modelo as equipo_modelo,
        e.precio_costo as equipo_precio_costo_actual,
        (
          SELECT prev.precio_neto
          FROM proveedor_lista_items prev
          WHERE prev.lista_id = (SELECT id FROM prev_lista)
            AND (
              (pli.equipo_id IS NOT NULL AND prev.equipo_id = pli.equipo_id)
              OR (pli.producto_id IS NOT NULL AND prev.producto_id = pli.producto_id)
              OR (pli.equipo_id IS NULL AND pli.producto_id IS NULL
                  AND prev.equipo_id IS NULL AND prev.producto_id IS NULL
                  AND LOWER(prev.codigo_proveedor) = LOWER(pli.codigo_proveedor))
            )
          LIMIT 1
        ) as precio_anterior_lista
      FROM proveedor_lista_items pli
      LEFT JOIN productos p ON p.id = pli.producto_id
      LEFT JOIN equipos e ON e.id = pli.equipo_id
      WHERE pli.lista_id = $1
      ORDER BY pli.nombre_proveedor, pli.codigo_proveedor
    `, [id]);

    return NextResponse.json({
      ...lista,
      items: itemsResult.rows
    });
  } catch (error: any) {
    console.error('Error fetching proveedor lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/proveedor-listas-precios/[id]
 * Acciones especiales: activar, clonar, aplicar precios
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    // Verify the list belongs to this org
    const ownerCheck = await query(
      'SELECT id FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2',
      [id, session.org_id]
    );
    if (ownerCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 });
    }

    switch (action) {
      case 'activar': {
        // Activar lista y opcionalmente desactivar anteriores
        const desactivarAnteriores = body.desactivar_anteriores !== false;
        await query('SELECT activar_lista_precios($1, $2)', [id, desactivarAnteriores]);
        return NextResponse.json({ success: true, message: 'Lista activada' });
      }

      case 'clonar': {
        // Clonar lista con nuevo nombre
        const nuevoNombre = body.nombre || `Copia - ${new Date().toLocaleDateString('es-AR')}`;

        // Crear nueva lista
        const nuevaLista = await query(`
          INSERT INTO proveedor_listas_precios (
            proveedor_id, nombre, codigo, fecha_inicio, moneda, tipo_cotizacion,
            aplica_descuento_global, descuento_global_porcentaje,
            plazo_entrega_dias, cantidad_minima_pedido, condiciones_pago, notas, estado, tipo
          )
          SELECT
            proveedor_id, $2, NULL, CURRENT_DATE, moneda, tipo_cotizacion,
            aplica_descuento_global, descuento_global_porcentaje,
            plazo_entrega_dias, cantidad_minima_pedido, condiciones_pago, notas, 'borrador', tipo
          FROM proveedor_listas_precios WHERE id = $1
          RETURNING id
        `, [id, nuevoNombre]);

        const nuevaListaId = nuevaLista.rows[0].id;

        // Clonar items
        await query(`
          INSERT INTO proveedor_lista_items (
            lista_id, producto_id, equipo_id, codigo_proveedor, nombre_proveedor,
            precio_costo, cantidad_minima, descuento_porcentaje,
            plazo_entrega_dias, unidad_medida, factor_conversion
          )
          SELECT
            $2, producto_id, equipo_id, codigo_proveedor, nombre_proveedor,
            precio_costo, cantidad_minima, descuento_porcentaje,
            plazo_entrega_dias, unidad_medida, factor_conversion
          FROM proveedor_lista_items WHERE lista_id = $1 AND activo = true
        `, [id, nuevaListaId]);

        return NextResponse.json({ success: true, nueva_lista_id: nuevaListaId });
      }

      case 'aplicar_precios': {
        const margen = body.margen ?? 30;
        // Por defecto aplica a TODOS los productos vinculados (refresca costos al entrar una
        // lista nueva), igual que la rama de equipos. Solo salta los que ya tienen costo si se
        // pide explícito con solo_sin_precio=true.
        const soloSinPrecio = body.solo_sin_precio === true;
        const whereClause = soloSinPrecio
          ? 'AND (p.precio_costo = 0 OR p.precio_costo IS NULL)'
          : '';

        // Tipo de lista: equipos se aplica directo (sin corrida); productos sigue abajo.
        const tipoRes = await query(
          'SELECT tipo FROM proveedor_listas_precios WHERE id = $1 AND org_id = $2',
          [id, session.org_id]
        );
        const tipo = tipoRes.rows[0]?.tipo || 'productos';

        if (tipo === 'equipos') {
          const cot = await query(
            `SELECT valor_venta FROM cotizaciones
             WHERE tipo = 'oficial'
             ORDER BY fecha DESC, created_at DESC
             LIMIT 1`
          );
          const rate = Number(cot.rows[0]?.valor_venta) || 0;
          // Equipos: por defecto aplica a TODOS los matcheados (refresca precios al entrar
          // una lista nueva). Solo salta los que ya tienen costo si se pide explícito.
          const soloSinPrecioEq = body.solo_sin_precio === true;
          const whereEquipos = soloSinPrecioEq
            ? 'AND (e.precio_costo IS NULL OR e.precio_costo = 0)'
            : '';
          const result = await query(`
            UPDATE equipos e SET
              precio_costo  = pli.precio_neto,
              moneda_compra = plp.moneda,
              proveedor_id  = COALESCE(e.proveedor_id, plp.proveedor_id),
              precio_lista  = CASE
                WHEN e.precio_venta_modo = 'fijo' THEN e.precio_lista
                -- monedas distintas sin cotización disponible: no tocar el precio de venta
                WHEN plp.moneda <> COALESCE(e.precio_lista_moneda, 'USD') AND $4::numeric <= 0 THEN e.precio_lista
                ELSE ROUND(
                  (CASE
                    WHEN plp.moneda = COALESCE(e.precio_lista_moneda, 'USD') THEN pli.precio_neto
                    WHEN plp.moneda = 'USD' AND COALESCE(e.precio_lista_moneda, 'USD') = 'ARS' THEN pli.precio_neto * $4::numeric
                    WHEN plp.moneda = 'ARS' AND COALESCE(e.precio_lista_moneda, 'USD') = 'USD' THEN pli.precio_neto / $4::numeric
                    ELSE pli.precio_neto
                   END) * (1 + COALESCE(e.ganancia, $2::numeric) / 100), 2)
              END
            FROM proveedor_lista_items pli
            JOIN proveedor_listas_precios plp ON plp.id = pli.lista_id
            WHERE pli.lista_id = $1
              AND pli.equipo_id = e.id
              AND pli.activo = true
              AND e.org_id = $3
              ${whereEquipos}
          `, [id, margen, session.org_id, rate]);

          return NextResponse.json({
            success: true,
            equipos_actualizados: result.rowCount,
            cotizacion_usada: rate,
            warning: rate <= 0
              ? 'Sin cotización del dólar: equipos con moneda de venta distinta a la de compra no se convirtieron.'
              : undefined,
          });
        }

        // Productos: UPDATE directo (sin "corrida"). La infra de corridas no está completa en
        // este entorno (falta la tabla corridas_precios y el trigger que estampa corrida_id),
        // por eso ejecutarConCorrida tiraba 'relation "corridas_precios" does not exist' y el
        // POST 500eaba. Igual que la rama de equipos: aplicamos directo y contamos por rowCount.
        const result = await query(
          `UPDATE productos p SET
             precio_costo = pli.precio_neto,
             precio_venta = ROUND(pli.precio_neto * (1 + $2 / 100), 2),
             proveedor_habitual_id = plp.proveedor_id,
             ultima_compra_precio = pli.precio_neto,
             ultima_compra_fecha = CURRENT_DATE
           FROM proveedor_lista_items pli
           JOIN proveedor_listas_precios plp ON plp.id = pli.lista_id
           WHERE pli.lista_id = $1
             AND pli.producto_id = p.id
             AND pli.activo = true
             AND p.org_id = $3
             ${whereClause}`,
          [id, margen, session.org_id]
        );

        return NextResponse.json({
          success: true,
          productos_actualizados: result.rowCount,
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error en acción de lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
