/**
 * Helpers para armar y enviar un presupuesto de equipos (PDF + folletos), por
 * email o por WhatsApp. Los dos primeros son puros y testeables sin DB.
 */

/**
 * Normaliza un teléfono al formato que espera el bridge de WhatsApp: sólo
 * dígitos, con 549 para celulares argentinos. Devuelve null si no hay un número
 * usable. Acepta un array (toma el primero no vacío) porque personas.telefono a
 * veces viene como arreglo.
 */
export function normalizarTelefonoWa(
  raw: string | string[] | null | undefined
): string | null {
  const valor = Array.isArray(raw) ? raw.find((v) => v && v.trim()) : raw;
  if (!valor) return null;

  let d = String(valor).replace(/\D/g, '');
  if (!d) return null;

  // Sacar 0 inicial de área (0223...) y prefijo internacional 00.
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);

  // Ya viene con país.
  if (d.startsWith('54')) {
    let resto = d.slice(2);
    if (resto.startsWith('9')) resto = resto.slice(1);
    resto = quitarQuinceArea(resto);
    if (resto.length !== 10) return null;
    return '549' + resto;
  }

  // Número local (área + abonado), con posible 15.
  const local = quitarQuinceArea(d);
  if (local.length !== 10) return null;
  return '549' + local;
}

/**
 * Quita el "15" de celular que se marca localmente entre el código de área y el
 * abonado. Un número local con "15" tiene 12 dígitos (área 2-4 + 15 + abonado,
 * donde área+abonado suman 10). Probamos las longitudes de área posibles y
 * sacamos el primer "15" que deje exactamente 10 dígitos.
 *
 * Limitación conocida: un código de área cuyo 1er/2do dígito sean "15" es
 * ambiguo; es rarísimo y el diálogo de envío muestra el número para confirmar.
 */
function quitarQuinceArea(local: string): string {
  if (local.length !== 12) return local; // sin 15, o formato que no reconocemos
  for (const areaLen of [2, 3, 4]) {
    if (local.slice(areaLen, areaLen + 2) === '15') {
      return local.slice(0, areaLen) + local.slice(areaLen + 2);
    }
  }
  return local;
}

const MIME_POR_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Adivina el mimeType por la extensión del nombre de archivo. */
export function mimeTypePorExtension(nombre: string): string {
  const ext = nombre.toLowerCase().split('.').pop() || '';
  return MIME_POR_EXT[ext] || 'application/octet-stream';
}

import { query } from '@/lib/db';
import { generatePresupuestoEquipoPDF, type PresupuestoEquipoData } from '@/lib/pdf-presupuesto-equipo';
import { resolverEspecificaciones } from '@/lib/especificaciones-diff';
import { agruparTotalesPorMoneda, normalizarMoneda } from '@/lib/presupuesto-equipo-totales';
import { fetchDocumentosPresupuestoEquipo } from '@/lib/presupuesto-equipo-documentos';
import { readFile } from 'fs/promises';
import path from 'path';

const MEDIA_ROOT = process.env.MEDIA_ROOT || '/data/media';

/**
 * Fetch an image URL and return a data-URI base64 string (or null on failure).
 * Used to embed product images into the PDF.
 */
async function fetchImageAsBase64(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

// El archivo_url de biblioteca apunta al dominio media (viejo o nuevo), pero el
// archivo físico vive en el volumen MEDIA_ROOT. Mapea la URL al path local.
function resolveLocalMediaPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    let p = new URL(url).pathname; // /uno-electromedicina/biblioteca/... o /media/uno-...
    if (p.startsWith('/media/')) p = p.slice('/media'.length);
    const resolved = path.normalize(path.join(MEDIA_ROOT, decodeURIComponent(p)));
    if (!resolved.startsWith(MEDIA_ROOT)) return null; // anti path-traversal
    return resolved;
  } catch {
    return null;
  }
}

export async function armarDataPresupuestoEquipo(
  presupuestoId: string,
  orgId: string,
  userId: string | null
): Promise<{ data: PresupuestoEquipoData; row: any } | null> {
    // Presupuesto + cliente + persona (contacto) + header equipo + items
    const result = await query(
      `SELECT
        pe.*,
        CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
          'id', c.id,
          'nombre', c.nombre,
          'nombre_fantasia', c.nombre_fantasia,
          'cuit', c.cuit,
          'email', c.email,
          'telefono', c.telefono,
          'direccion', c.direccion
        ) END as cliente,
        CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object(
          'id', p.id,
          'nombre', COALESCE(p.nombre_completo, TRIM(CONCAT(p.nombre, ' ', COALESCE(p.apellido,'')))),
          'cuit', p.documento_nro,
          'email', p.email,
          'telefono', p.telefono,
          'direccion', p.direccion
        ) END as persona,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pei.id,
              'producto_id', pei.producto_id,
              'equipo_id', pei.equipo_id,
              'tipo', pei.tipo,
              'descripcion', pei.descripcion,
              'cantidad', pei.cantidad,
              'precio_unitario', pei.precio_unitario,
              'subtotal', pei.subtotal,
              'moneda', pei.moneda,
              'condicion', pei.condicion,
              'iva_porcentaje', pei.iva_porcentaje,
              'es_opcional', pei.es_opcional,
              'incluido_en_precio', pei.incluido_en_precio,
              'imagen_url', pei.imagen_url,
              'especificaciones', pei.especificaciones,
              'especificaciones_personalizada', pei.especificaciones_personalizada,
              'comentario', pei.comentario,
              'forma_pago', pei.forma_pago,
              'tiempo_entrega', pei.tiempo_entrega,
              'garantia', pei.garantia,
              'incluye_instalacion', pei.incluye_instalacion,
              'incluye_capacitacion', pei.incluye_capacitacion,
              'incluye_flete', pei.incluye_flete
            ) ORDER BY pei.created_at
          ) FILTER (WHERE pei.id IS NOT NULL),
          '[]'
        ) as items
      FROM presupuestos_equipos pe
      LEFT JOIN clientes c ON pe.cliente_id = c.id
      LEFT JOIN personas p ON pe.persona_id = p.id
      LEFT JOIN presupuestos_equipos_items pei ON pei.presupuesto_equipo_id = pe.id
      WHERE pe.id = $1 AND pe.org_id = $2
      GROUP BY pe.id, c.id, p.id`,
      [presupuestoId, orgId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const items: Array<{
      equipo_id: string | null;
      producto_id: string | null;
      tipo: string | null;
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
      moneda: string | null;
      condicion: string | null;
      iva_porcentaje: number | null;
      es_opcional: boolean;
      incluido_en_precio: boolean;
      imagen_url: string | null;
      especificaciones: Record<string, unknown> | unknown[] | null;
      especificaciones_personalizada: boolean | null;
      comentario: string | null;
      forma_pago: string | null;
      tiempo_entrega: string | null;
      garantia: string | null;
      incluye_instalacion: boolean | null;
      incluye_capacitacion: boolean | null;
      incluye_flete: boolean | null;
    }> = row.items || [];

    // Collect unique equipo ids: header + items (tipo='equipo' or equipo_id present)
    const equipoIds = new Set<string>();
    if (row.equipo_id) equipoIds.add(row.equipo_id);
    for (const it of items) {
      if (it.equipo_id) equipoIds.add(it.equipo_id);
    }

    // Fetch catalog data for all equipos
    let equiposCatalog: Array<{
      id: string;
      marca: string | null;
      modelo: string | null;
      tipo: string | null;
      condicion: string | null;
      descripcion_comercial: string | null;
      especificaciones: Record<string, unknown> | unknown[] | null;
      imagen_url: string | null;
      precio_lista: number | null;
      precio_lista_moneda: string | null;
    }> = [];
    if (equipoIds.size > 0) {
      const eqRes = await query(
        `SELECT id, marca, modelo, tipo, condicion, descripcion_comercial,
                especificaciones, imagen_url, precio_lista, precio_lista_moneda
         FROM equipos
         WHERE org_id = $1 AND id = ANY($2::uuid[])`,
        [orgId, Array.from(equipoIds)]
      );
      equiposCatalog = eqRes.rows;
    }

    // Count equipo cantidades from items (header equipo defaults to 1)
    const equipoCantidades: Record<string, number> = {};
    for (const it of items) {
      if (it.equipo_id) {
        equipoCantidades[it.equipo_id] =
          (equipoCantidades[it.equipo_id] || 0) + Number(it.cantidad || 1);
      }
    }
    // El equipo del header (modo single) suele venir TAMBIÉN como item; solo lo
    // contamos (1) si no está ya en items, para no duplicar la cantidad.
    if (row.equipo_id && !(row.equipo_id in equipoCantidades)) {
      equipoCantidades[row.equipo_id] = 1;
    }

    // Alicuota de IVA cotizada por equipo (para la columna IVA del resumen de portada).
    // Si el mismo equipo aparece en varios items, gana el primero con alicuota definida.
    const equipoIvas: Record<string, number> = {};
    for (const it of items) {
      if (!it.equipo_id || it.equipo_id in equipoIvas) continue;
      if (it.iva_porcentaje == null) continue;
      equipoIvas[it.equipo_id] = Number(it.iva_porcentaje);
    }

    // Precio COTIZADO por equipo = la foto del presupuesto: el precio guardado en
    // el item (precio_unitario) y su moneda, NO el precio_lista vivo del catálogo.
    // Un presupuesto no debe cambiar si después se edita el catálogo; por eso el
    // PDF (cover + hoja de producto) muestra lo que se cotizó, no la lista actual.
    // Si el mismo equipo aparece como varios items, gana el primero.
    const headerMonedaFallback = normalizarMoneda(row.moneda, 'ARS');
    const cotizadoPorEquipo: Record<string, { precio: number; moneda: 'ARS' | 'USD' }> = {};
    for (const it of items) {
      if (!it.equipo_id || it.equipo_id in cotizadoPorEquipo) continue;
      const catalogMoneda = equiposCatalog.find((e) => e.id === it.equipo_id)?.precio_lista_moneda;
      cotizadoPorEquipo[it.equipo_id] = {
        precio: Number(it.precio_unitario) || 0,
        moneda: it.moneda
          ? normalizarMoneda(it.moneda)
          : normalizarMoneda(catalogMoneda, headerMonedaFallback),
      };
    }

    // Condición COTIZADA por equipo (foto del presupuesto): la del item guardado, y
    // si no hay item (modo single = equipo en el header) la del header. Cae a la
    // condición del catálogo solo si no se cotizó nada. Así el PDF muestra
    // "Reacondicionado" cuando se cotizó reacondicionado, aunque el catálogo diga nuevo.
    const condicionPorEquipo: Record<string, string> = {};
    for (const it of items) {
      if (!it.equipo_id || it.equipo_id in condicionPorEquipo || !it.condicion) continue;
      condicionPorEquipo[it.equipo_id] = it.condicion;
    }
    if (row.equipo_id && row.condicion && !(row.equipo_id in condicionPorEquipo)) {
      condicionPorEquipo[row.equipo_id] = row.condicion;
    }

    // Comentario visible por equipo (primer item con comentario para ese equipo).
    const comentarioPorEquipo: Record<string, string> = {};
    for (const it of items) {
      if (!it.equipo_id || it.equipo_id in comentarioPorEquipo) continue;
      if (it.comentario) comentarioPorEquipo[it.equipo_id] = String(it.comentario);
    }

    // Condiciones por equipo: SOLO cuando el item override algún campo (así el PDF
    // no repite las generales). Valor efectivo = override del item ?? general del header.
    const condicionesPorEquipo: Record<string, {
      forma_pago: string | null;
      tiempo_entrega: string | null;
      garantia: string | null;
      incluye_instalacion: boolean;
      incluye_capacitacion: boolean;
      incluye_flete: boolean;
    }> = {};
    for (const it of items) {
      if (!it.equipo_id || it.equipo_id in condicionesPorEquipo) continue;
      const overridea =
        it.forma_pago != null || it.tiempo_entrega != null || it.garantia != null ||
        it.incluye_instalacion != null || it.incluye_capacitacion != null || it.incluye_flete != null;
      if (!overridea) continue;
      condicionesPorEquipo[it.equipo_id] = {
        forma_pago: it.forma_pago ?? row.forma_pago ?? null,
        tiempo_entrega: it.tiempo_entrega ?? row.tiempo_entrega ?? null,
        garantia: it.garantia ?? row.garantia ?? null,
        incluye_instalacion: it.incluye_instalacion ?? row.incluye_instalacion ?? false,
        incluye_capacitacion: it.incluye_capacitacion ?? row.incluye_capacitacion ?? false,
        incluye_flete: it.incluye_flete ?? row.incluye_flete ?? false,
      };
    }

    // Fetch images in parallel and attach
    const equiposWithImages = await Promise.all(
      equiposCatalog.map(async (eq) => {
        const cotizado = cotizadoPorEquipo[eq.id];
        return {
          ...eq,
          condicion: condicionPorEquipo[eq.id] ?? eq.condicion,
          // Precio cotizado del presupuesto (foto). Fallback al precio de lista del
          // catálogo solo si el equipo no figura como item (caso raro header-only).
          precio_lista: cotizado
            ? cotizado.precio
            : eq.precio_lista !== null
            ? Number(eq.precio_lista)
            : null,
          precio_lista_moneda: cotizado ? cotizado.moneda : eq.precio_lista_moneda,
          imagen_base64: await fetchImageAsBase64(eq.imagen_url),
        };
      })
    );

    // Preserve render order: header equipo first, then item equipos
    const orderedIds: string[] = [];
    if (row.equipo_id) orderedIds.push(row.equipo_id);
    for (const it of items) {
      if (it.equipo_id && !orderedIds.includes(it.equipo_id)) orderedIds.push(it.equipo_id);
    }
    const orderedEquipos = orderedIds
      .map((eid) => equiposWithImages.find((e) => e.id === eid))
      .filter(Boolean) as typeof equiposWithImages;

    // El equipo header muestra las specs del presupuesto (su copia o el catálogo,
    // según resolverEspecificaciones). Los equipos que vienen como items con
    // equipo_id (modo multi) usan sus propias specs guardadas si las tienen,
    // si no caen al catálogo.
    const headerEquipoIndex = row.equipo_id
      ? orderedEquipos.findIndex((e) => e.id === row.equipo_id)
      : -1;
    if (headerEquipoIndex >= 0) {
      const headerEquipo = orderedEquipos[headerEquipoIndex];
      orderedEquipos[headerEquipoIndex] = {
        ...headerEquipo,
        especificaciones: (resolverEspecificaciones(
          {
            especificaciones: row.especificaciones,
            especificaciones_personalizada: row.especificaciones_personalizada,
            estado: row.estado,
          },
          headerEquipo.especificaciones,
        ) ?? null) as Record<string, unknown> | unknown[] | null,
      };
    }
    // Items con equipo_id: aplicar sus specs propias por encima del catálogo.
    // Indexamos por equipo_id usando el primer item que matchea (si el mismo
    // equipo aparece varias veces como item, ganan las specs del primero).
    const specsPorItemEquipo = new Map<
      string,
      { especificaciones: any; especificaciones_personalizada: boolean }
    >();
    for (const it of items) {
      if (!it.equipo_id) continue;
      if (specsPorItemEquipo.has(it.equipo_id)) continue;
      if (row.equipo_id === it.equipo_id) continue; // header ya resuelto arriba
      specsPorItemEquipo.set(it.equipo_id, {
        especificaciones: it.especificaciones,
        especificaciones_personalizada: !!it.especificaciones_personalizada,
      });
    }
    for (let i = 0; i < orderedEquipos.length; i++) {
      const eq = orderedEquipos[i];
      const override = specsPorItemEquipo.get(eq.id);
      if (!override) continue;
      orderedEquipos[i] = {
        ...eq,
        especificaciones: (resolverEspecificaciones(
          {
            especificaciones: override.especificaciones,
            especificaciones_personalizada: override.especificaciones_personalizada,
            estado: row.estado,
          },
          eq.especificaciones,
        ) ?? null) as Record<string, unknown> | unknown[] | null,
      };
    }

    // Accesorios = items que NO son equipos
    const accesorios = items
      .filter((it) => !it.equipo_id)
      .map((it) => ({
        tipo: it.tipo,
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        subtotal: Number(it.subtotal),
        es_opcional: it.es_opcional,
        incluido_en_precio: it.incluido_en_precio,
        equipo_id: it.equipo_id,
        producto_id: it.producto_id,
        imagen_url: it.imagen_url,
      }));

    // Firma del usuario actual
    let usuario = undefined;
    if (userId) {
      const uRes = await query(
        `SELECT nombre_completo, cargo, email, telefono_directo, firma_activa
         FROM users WHERE id = $1`,
        [userId]
      );
      if (uRes.rows.length > 0) usuario = uRes.rows[0];
    }

    // Documentos de biblioteca: folletos/fichas/manuales de los equipos + docs
    // agregados al presupuesto. Misma fuente que el email, para que el PDF adjunto
    // y el descargable coincidan (se renderizan como botones "Ver ...").
    const docRows = await fetchDocumentosPresupuestoEquipo(presupuestoId, orgId);
    const documentos = docRows
      .map((d) => ({
        titulo: (d.titulo || '').trim(),
        link: String(d.archivo_url || d.link_externo || '').trim(),
        descripcion: d.descripcion,
        tipo: d.tipo,
      }))
      .filter((d) => d.titulo && d.link);

    // Totales por moneda: cada ítem se agrupa por SU moneda guardada (pei.moneda). Para
    // ítems viejos (sin moneda) se cae a la del catálogo del equipo y, por último, a la
    // del header. Con monedas mezcladas el PDF muestra un total por moneda en lugar de
    // uno solo que no representaría a las dos.
    const monedaPorEquipo: Record<string, 'ARS' | 'USD'> = {};
    for (const eq of equiposCatalog) {
      monedaPorEquipo[eq.id] = normalizarMoneda(eq.precio_lista_moneda);
    }
    const headerMoneda = normalizarMoneda(row.moneda, 'ARS');
    const monedaDeItem = (it: { moneda: string | null; equipo_id: string | null }): 'ARS' | 'USD' =>
      it.moneda
        ? normalizarMoneda(it.moneda)
        : ((it.equipo_id && monedaPorEquipo[it.equipo_id]) || headerMoneda);
    const totalesPorMoneda = agruparTotalesPorMoneda(
      items.map((it) => ({
        subtotal: Number(it.subtotal) || 0,
        ivaPorcentaje: Number(it.iva_porcentaje ?? 0),
        moneda: monedaDeItem(it),
      })),
    );

    const data: PresupuestoEquipoData = {
      numero: row.numero,
      titulo: row.titulo,
      fecha_emision: row.fecha_emision,
      fecha_vencimiento: row.fecha_vencimiento,
      validez_dias: row.validez_dias,
      validez_texto: row.validez_texto || null,
      mostrar_iva_desglosado: row.mostrar_iva_desglosado ?? true,
      usar_label_precio_final: row.usar_label_precio_final ?? false,
      estado: row.estado,
      moneda: row.moneda,
      cotizacion_usd: row.cotizacion_usd !== null ? Number(row.cotizacion_usd) : null,
      tipo_cotizacion: row.tipo_cotizacion,
      forma_pago: row.forma_pago,
      tiempo_entrega: row.tiempo_entrega,
      garantia: row.garantia,
      incluye_instalacion: row.incluye_instalacion,
      incluye_capacitacion: row.incluye_capacitacion,
      incluye_flete: row.incluye_flete,
      descripcion_comercial: row.descripcion_comercial,
      especificaciones_tecnicas: row.especificaciones_tecnicas,
      beneficios: row.beneficios,
      observaciones: row.observaciones,
      terminos_condiciones: row.terminos_condiciones,
      subtotal: Number(row.subtotal || 0),
      descuento_porcentaje: Number(row.descuento_porcentaje || 0),
      descuento_monto: Number(row.descuento_monto || 0),
      iva: Number(row.iva || 0),
      total: Number(row.total || 0),
      totalesPorMoneda,
      cliente: row.cliente || row.persona || null,
      equipos: orderedEquipos,
      accesorios,
      equipoCantidades,
      equipoIvas,
      comentarioPorEquipo,
      condicionesPorEquipo,
      documentos,
      usuario,
    };

    return { data, row };
}

export async function juntarFolletos(
  presupuestoId: string,
  orgId: string
): Promise<{ filename: string; mimeType: string; contentBase64: string }[]> {
  // Documentos de biblioteca vinculados al presupuesto (folletos, manuales, fichas)
  // -> se adjuntan al email junto al PDF. Se leen del volumen MEDIA_ROOT.
  const extraAttachments: { filename: string; mimeType: string; contentBase64: string }[] = [];
  try {
    const docsRes = await query(
      `SELECT DISTINCT r.id, r.archivo_nombre, r.archivo_url
         FROM biblioteca_vinculos v
         JOIN biblioteca_recursos r ON r.id = v.recurso_id AND r.org_id = $2 AND r.archivo_url IS NOT NULL
        WHERE
          -- Documentos adicionales agregados al presupuesto
          (v.entidad_tipo = 'presupuesto_equipo' AND v.entidad_id = $1)
          -- Ficha técnica / folleto / manual de los equipos del presupuesto
          OR (v.entidad_tipo = 'equipo'
              AND r.tipo IN ('folleto', 'ficha_tecnica', 'manual')
              AND v.entidad_id IN (
                SELECT equipo_id FROM presupuestos_equipos_items
                 WHERE presupuesto_equipo_id = $1 AND equipo_id IS NOT NULL
              ))`,
      [presupuestoId, orgId]
    );
    for (const d of docsRes.rows) {
      const localPath = resolveLocalMediaPath(d.archivo_url);
      if (!localPath) continue;
      try {
        const buf = await readFile(localPath);
        if (buf.length > 15 * 1024 * 1024) continue; // skip > 15MB
        const filename = d.archivo_nombre || path.basename(localPath);
        extraAttachments.push({
          filename,
          mimeType: mimeTypePorExtension(filename),
          contentBase64: buf.toString('base64'),
        });
      } catch {
        // archivo no encontrado en disco — se saltea sin romper el envío
      }
    }
  } catch (e) {
    console.error('No se pudieron cargar documentos de biblioteca:', e);
  }
  return extraAttachments;
}
