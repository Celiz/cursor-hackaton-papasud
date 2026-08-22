import { query } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const revalidate = 0;

// GET /api/clientes/[id]/productos - Obtener productos relacionados con el cliente
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

    // Verificar que el cliente pertenece a la org
    const clienteCheck = await query(
      `SELECT id FROM clientes WHERE id = $1 AND org_id = $2`,
      [id, session.org_id]
    );
    if (clienteCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const busqueda = searchParams.get("busqueda") || "";
    const limite = searchParams.get("limite") || "50";
    const incluirTodos = searchParams.get("incluir_todos") === "true";
    const equipoUnidadId = searchParams.get("equipo_unidad_id");

    // Lista de marcas conocidas para detección automática
    const marcasConocidas = [
      'MINDRAY', 'ROCHE', 'SIEMENS', 'ABBOTT', 'BECKMAN', 'SYSMEX',
      'BIOMERIEUX', 'ORTHO', 'STAGO', 'HORIBA', 'WERFEN', 'WIENER',
      'HUMAN', 'SPINREACT', 'BIOSYSTEMS', 'RANDOX', 'ERBA', 'DIRUI',
      'SNIBE', 'EDAN', 'CORMAY', 'AGAPPE', 'ELITECH', 'RAYTO'
    ];

    // Función para detectar marca en el nombre del producto
    const detectarMarca = (nombre: string): string | null => {
      const nombreUpper = nombre.toUpperCase();
      for (const marca of marcasConocidas) {
        if (nombreUpper.includes(marca) || nombreUpper.includes(`P/${marca}`) || nombreUpper.includes(`/${marca}`)) {
          return marca.charAt(0) + marca.slice(1).toLowerCase(); // Capitalizar
        }
      }
      return null;
    };

    // Si hay búsqueda, buscar directamente en productos (más simple y confiable)
    if (busqueda && busqueda.length >= 2) {
      const searchSql = `
        SELECT
          p.id,
          p.codigo,
          p.nombre,
          p.categoria,
          p.precio_venta,
          p.unidad_medida,
          p.stock_actual,
          p.fabricante,
          0 as veces_comprado,
          NULL as ultima_compra,
          NULL::numeric as cantidad_habitual,
          NULL as marca_preferida,
          NULL::jsonb as marcas_alternativas,
          false as es_favorito,
          NULL::uuid as equipo_unidad_id,
          NULL as equipo_codigo,
          NULL as equipo_descripcion,
          0 as relevancia
        FROM productos p
        WHERE (
            p.nombre ILIKE $1
            OR p.codigo ILIKE $1
            OR p.categoria ILIKE $1
          )
        ORDER BY
          CASE WHEN p.codigo ILIKE $2 THEN 0 ELSE 1 END,
          -- Priorizar categorías: Reactivos > Consumibles > Equipos > Repuestos
          CASE
            WHEN p.categoria ILIKE '%Diagnostico In Vitro%' THEN 0
            WHEN p.categoria ILIKE '%Consumible%' THEN 1
            WHEN p.categoria ILIKE '%Descartable%' THEN 2
            WHEN p.categoria ILIKE '%Equipo%' THEN 3
            WHEN p.categoria ILIKE '%Repuesto%' THEN 4
            ELSE 5
          END,
          p.nombre ASC
        LIMIT $3
      `;

      const searchResult = await query(searchSql, [
        `%${busqueda}%`,
        `${busqueda}%`,
        parseInt(limite)
      ]);

      // Agregar marca detectada a cada producto
      // Prioridad: detectar marca del nombre (ej: "MINDRAY BC-5000") > fabricante como fallback
      const productosConMarca = (searchResult.rows || []).map((p: any) => ({
        ...p,
        marca_detectada: detectarMarca(p.nombre) || p.fabricante || null
      }));

      return NextResponse.json({
        productos: productosConMarca,
        equipos_cliente: [],
        total: productosConMarca.length,
      });
    }

    // Sin búsqueda: intentar obtener productos preferidos/frecuentes del cliente
    // Primero verificar si existen las tablas necesarias
    let productos: any[] = [];

    try {
      // Query mejorada: combina insumos preferidos + historial de compras
      let sql = `
        WITH insumos_preferidos AS (
          -- Insumos configurados como preferidos para este cliente/equipo
          SELECT DISTINCT
            p.id,
            p.codigo,
            p.nombre,
            p.categoria,
            p.precio_venta,
            p.unidad_medida,
            p.stock_actual,
            COALESCE(cip.total_compras, 0) as veces_comprado,
            cip.ultima_compra,
            cip.cantidad_habitual,
            cip.marca_preferida,
            cip.marcas_alternativas,
            cip.es_favorito,
            cip.equipo_unidad_id,
            eu.codigo as equipo_codigo,
            eq.marca || ' ' || eq.modelo as equipo_descripcion,
            -- Prioridad: favoritos del equipo = 3, favoritos general = 2, preferidos = 1, historial = 0
            CASE
              WHEN cip.es_favorito AND cip.equipo_unidad_id IS NOT NULL THEN 3
              WHEN cip.es_favorito THEN 2
              WHEN cip.id IS NOT NULL THEN 1
              ELSE 0
            END as relevancia
          FROM cliente_insumos_preferidos cip
          JOIN productos p ON cip.producto_id = p.id
          LEFT JOIN equipos_unidades eu ON cip.equipo_unidad_id = eu.id
          LEFT JOIN equipos eq ON eu.equipo_id = eq.id
          WHERE cip.cliente_id = $1
            AND cip.activo = true
      `;

      const queryParams: any[] = [id];
      let paramIndex = 2;

      // Filtrar por equipo si se especifica
      if (equipoUnidadId) {
        sql += ` AND (cip.equipo_unidad_id = $${paramIndex} OR cip.equipo_unidad_id IS NULL)`;
        queryParams.push(equipoUnidadId);
        paramIndex++;
      }

      sql += `
        )
        SELECT * FROM insumos_preferidos
        ORDER BY relevancia DESC, es_favorito DESC, veces_comprado DESC, nombre ASC
        LIMIT $${paramIndex}
      `;

      queryParams.push(parseInt(limite));

      const result = await query(sql, queryParams);
      productos = result.rows || [];
    } catch (err) {
      // Si falla (tabla no existe), devolver lista vacía
      console.log("Tabla cliente_insumos_preferidos no existe o error:", err);
      productos = [];
    }

    // Obtener equipos del cliente para el selector (si existe la tabla)
    let equiposCliente: any[] = [];
    try {
      const equiposResult = await query(
        `
        SELECT DISTINCT
          eu.id as equipo_unidad_id,
          eu.codigo,
          eu.numero_serie,
          e.id as equipo_id,
          e.marca,
          e.modelo,
          e.tipo,
          e.marca || ' ' || e.modelo || COALESCE(' (' || eu.numero_serie || ')', '') as descripcion,
          0 as insumos_configurados
        FROM equipos_unidades eu
        JOIN equipos e ON eu.equipo_id = e.id
        WHERE eu.cliente_id = $1
          AND eu.estado_general IN ('instalado', 'en_servicio', 'activo', 'operativo')
        ORDER BY e.marca, e.modelo
        LIMIT 20
      `,
        [id]
      );
      equiposCliente = equiposResult.rows || [];
    } catch (err) {
      console.log("Error obteniendo equipos:", err);
      equiposCliente = [];
    }

    return NextResponse.json({
      productos,
      equipos_cliente: equiposCliente,
      total: productos.length,
    });
  } catch (error: any) {
    console.error("Error in GET /api/clientes/[id]/productos:", error);
    return NextResponse.json(
      { error: "Error al obtener productos del cliente", details: error.message },
      { status: 500 }
    );
  }
}
