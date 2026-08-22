import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/inventario/transferencias/[id]/confirmar - Confirmar y ejecutar transferencia
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

    if (!id) {
      return NextResponse.json(
        { error: "ID de transferencia es requerido" },
        { status: 400 }
      );
    }

    // Obtener transferencia con items
    const transfResult = await query(`
      SELECT
        t.*,
        json_build_object('id', do.id, 'codigo', do.codigo, 'nombre', do.nombre) as origen,
        json_build_object('id', dd.id, 'codigo', dd.codigo, 'nombre', dd.nombre) as destino,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ti.id,
            'producto_id', ti.producto_id,
            'cantidad', ti.cantidad,
            'lote_id', ti.lote_id,
            'serial_id', ti.serial_id,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM transferencias_deposito_items ti
          LEFT JOIN productos p ON ti.producto_id = p.id
          WHERE ti.transferencia_id = t.id
        ), '[]'::json) as items
      FROM transferencias_deposito t
      LEFT JOIN depositos do ON t.deposito_origen_id = do.id
      LEFT JOIN depositos dd ON t.deposito_destino_id = dd.id
      WHERE t.id = $1 AND t.org_id = $2
    `, [id, session.org_id]);

    if (transfResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Transferencia no encontrada" },
        { status: 404 }
      );
    }

    const transferencia = transfResult.rows[0];

    // Validar estado
    if (transferencia.estado !== "borrador") {
      return NextResponse.json(
        { error: `La transferencia ya está en estado ${transferencia.estado}` },
        { status: 400 }
      );
    }

    const items = Array.isArray(transferencia.items) ? transferencia.items : [];

    // Verificar stock disponible nuevamente
    for (const item of items) {
      const stockResult = await query(`
        SELECT cantidad_disponible FROM stock_depositos
        WHERE deposito_id = $1 AND producto_id = $2
      `, [transferencia.deposito_origen_id, item.producto_id]);

      const stockOrigen = stockResult.rows[0];
      if (!stockOrigen || stockOrigen.cantidad_disponible < item.cantidad) {
        return NextResponse.json(
          {
            error: `Stock insuficiente para producto ${item.producto?.nombre || item.producto_id}`,
            disponible: stockOrigen?.cantidad_disponible || 0,
            solicitado: item.cantidad,
          },
          { status: 400 }
        );
      }
    }

    // Ejecutar transferencia de stock
    for (const item of items) {
      // Reducir stock en origen
      const stockOrigenResult = await query(`
        SELECT * FROM stock_depositos
        WHERE deposito_id = $1 AND producto_id = $2
      `, [transferencia.deposito_origen_id, item.producto_id]);

      if (stockOrigenResult.rows.length > 0) {
        const stockOrigen = stockOrigenResult.rows[0];
        await query(`
          UPDATE stock_depositos
          SET cantidad_disponible = cantidad_disponible - $1, updated_at = NOW()
          WHERE id = $2
        `, [item.cantidad, stockOrigen.id]);
      }

      // Aumentar stock en destino
      const stockDestinoResult = await query(`
        SELECT * FROM stock_depositos
        WHERE deposito_id = $1 AND producto_id = $2
      `, [transferencia.deposito_destino_id, item.producto_id]);

      if (stockDestinoResult.rows.length > 0) {
        // Ya existe, incrementar
        const stockDestino = stockDestinoResult.rows[0];
        await query(`
          UPDATE stock_depositos
          SET cantidad_disponible = cantidad_disponible + $1, updated_at = NOW()
          WHERE id = $2
        `, [item.cantidad, stockDestino.id]);
      } else {
        // No existe, crear
        await query(`
          INSERT INTO stock_depositos (deposito_id, producto_id, cantidad_disponible, cantidad_reservada)
          VALUES ($1, $2, $3, 0)
        `, [transferencia.deposito_destino_id, item.producto_id, item.cantidad]);
      }

      // Si tiene serial, actualizar ubicación
      if (item.serial_id) {
        await query(`
          UPDATE productos_seriales
          SET deposito_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [transferencia.deposito_destino_id, item.serial_id]);
      }
    }

    // Actualizar estado de transferencia
    await query(`
      UPDATE transferencias_deposito
      SET estado = 'confirmada', fecha_confirmacion = NOW(), updated_at = NOW()
      WHERE id = $1 AND org_id = $2
    `, [id, session.org_id]);

    // Fetch updated transfer
    const updatedResult = await query(`
      SELECT
        t.*,
        json_build_object('id', do.id, 'codigo', do.codigo, 'nombre', do.nombre) as origen,
        json_build_object('id', dd.id, 'codigo', dd.codigo, 'nombre', dd.nombre) as destino,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', ti.id,
            'producto_id', ti.producto_id,
            'cantidad', ti.cantidad,
            'producto', json_build_object('id', p.id, 'codigo', p.codigo, 'nombre', p.nombre)
          ))
          FROM transferencias_deposito_items ti
          LEFT JOIN productos p ON ti.producto_id = p.id
          WHERE ti.transferencia_id = t.id
        ), '[]'::json) as items
      FROM transferencias_deposito t
      LEFT JOIN depositos do ON t.deposito_origen_id = do.id
      LEFT JOIN depositos dd ON t.deposito_destino_id = dd.id
      WHERE t.id = $1
    `, [id]);

    return NextResponse.json({
      success: true,
      transferencia: updatedResult.rows[0],
      mensaje: "Transferencia confirmada exitosamente",
    });
  } catch (error: any) {
    console.error("Error in POST /api/inventario/transferencias/[id]/confirmar:", error);
    return NextResponse.json(
      { error: "Error al confirmar transferencia", details: error.message },
      { status: 500 }
    );
  }
}
