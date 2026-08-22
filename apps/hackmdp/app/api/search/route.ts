import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const revalidate = 0;

/**
 * GET /api/search?q=term
 *
 * Búsqueda unificada rápida a través de múltiples tablas para el command
 * palette (⌘K). Ejecuta queries en paralelo contra clientes, productos,
 * facturas, remitos y cheques. Max 5 resultados por categoría (25 total).
 *
 * Cada resultado tiene: { type, id, title, subtitle, url }
 * El frontend navega a `url` cuando el usuario selecciona un resultado.
 *
 * La búsqueda usa ILIKE con comodines, que es eficiente para searches
 * cortos (3-20 chars) con los índices trigram que tenemos. Para searches
 * vacíos o de 1-2 chars, devuelve vacío.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const modulosOcultos = new Set(session.modulos_ocultos ?? []);
    const canClientes = !modulosOcultos.has('clientes');
    const canProductos = !modulosOcultos.has('productos');
    const canFacturas = !modulosOcultos.has('facturas');
    const canPagos = !modulosOcultos.has('pagos');

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const orgId = session.org_id;
    const pattern = `%${q}%`;

    // 5 queries en paralelo, 5 resultados cada una.
    // Cada query está envuelta con un gate de permisos. Si el módulo está oculto,
    // devuelve { rows: [] } en lugar de ejecutar la query.
    const [clientes, productos, facturas, remitos, cheques] = await Promise.all([
      canClientes
        ? query(
            `SELECT id, nombre, cuit, nombre_fantasia
             FROM clientes
             WHERE org_id = $1
               AND es_legacy = false
               AND (nombre ILIKE $2 OR cuit ILIKE $2 OR nombre_fantasia ILIKE $2)
             ORDER BY nombre ASC
             LIMIT 5`,
            [orgId, pattern]
          )
        : Promise.resolve({ rows: [] } as any),

      canProductos
        ? query(
            `SELECT id, nombre, codigo, precio_venta
             FROM productos
             WHERE org_id = $1 AND deleted_at IS NULL
               AND (nombre ILIKE $2 OR codigo ILIKE $2)
             ORDER BY nombre ASC
             LIMIT 5`,
            [orgId, pattern]
          )
        : Promise.resolve({ rows: [] } as any),

      canFacturas
        ? query(
            `SELECT f.id, f.nro_factura, f.tipo_factura, f.total, f.estado,
                    c.nombre AS cliente_nombre
             FROM facturas f
             LEFT JOIN clientes c ON c.id = f.cliente_id
             WHERE f.org_id = $1
               AND (f.nro_factura ILIKE $2 OR c.nombre ILIKE $2)
             ORDER BY f.fecha_emision DESC
             LIMIT 5`,
            [orgId, pattern]
          )
        : Promise.resolve({ rows: [] } as any),

      canFacturas
        ? query(
            `SELECT r.id, r.numero, r.fecha, r.estado,
                    c.nombre AS cliente_nombre
             FROM remitos r
             LEFT JOIN clientes c ON c.id = r.cliente_id
             WHERE r.org_id = $1
               AND (r.numero ILIKE $2 OR c.nombre ILIKE $2)
             ORDER BY r.fecha DESC
             LIMIT 5`,
            [orgId, pattern]
          )
        : Promise.resolve({ rows: [] } as any),

      canPagos
        ? query(
            `SELECT id, numero, monto, banco, nombre_librador, estado
             FROM cheques
             WHERE org_id = $1
               AND (numero ILIKE $2 OR nombre_librador ILIKE $2 OR banco ILIKE $2)
             ORDER BY created_at DESC
             LIMIT 5`,
            [orgId, pattern]
          )
        : Promise.resolve({ rows: [] } as any),
    ]);

    const fmt = (n: number) =>
      new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

    const results = [
      ...(clientes.rows || []).map((r: any) => ({
        type: "cliente" as const,
        id: r.id,
        title: r.nombre_fantasia || r.nombre,
        subtitle: r.cuit ? `CUIT: ${r.cuit}` : "Sin CUIT",
        url: `/dashboard/empresas?id=${r.id}`,
      })),
      ...(productos.rows || []).map((r: any) => ({
        type: "producto" as const,
        id: r.id,
        title: r.nombre,
        subtitle: `${r.codigo || "Sin código"} · ${r.precio_venta ? fmt(Number(r.precio_venta)) : "Sin precio"}`,
        url: `/dashboard/productos?id=${r.id}`,
      })),
      ...(facturas.rows || []).map((r: any) => ({
        type: "factura" as const,
        id: r.id,
        title: `Factura ${r.tipo_factura} ${r.nro_factura}`,
        subtitle: `${r.cliente_nombre || "Sin cliente"} · ${fmt(Number(r.total))} · ${r.estado}`,
        url: `/dashboard/facturas?id=${r.id}`,
      })),
      ...(remitos.rows || []).map((r: any) => ({
        type: "remito" as const,
        id: r.id,
        title: `Remito ${r.numero}`,
        subtitle: `${r.cliente_nombre || "Sin cliente"} · ${r.estado}`,
        url: `/dashboard/remitos?id=${r.id}`,
      })),
      ...(cheques.rows || []).map((r: any) => ({
        type: "cheque" as const,
        id: r.id,
        title: `Cheque #${r.numero}`,
        subtitle: `${r.banco || ""} · ${r.nombre_librador || ""} · ${fmt(Number(r.monto))} · ${r.estado}`,
        url: `/dashboard/cheques?id=${r.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error in GET /api/search:", error);
    return NextResponse.json(
      { error: "Error al buscar", details: errorMessage },
      { status: 500 }
    );
  }
}
