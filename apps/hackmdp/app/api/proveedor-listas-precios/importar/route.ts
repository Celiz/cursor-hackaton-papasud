import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { pdftotextLayout, esFormatoGematec, parseGematec } from '@/lib/import-parsers/gematec';
import { esFormatoGelec, parseGelec } from '@/lib/import-parsers/gelec';

interface ImportRow {
  codigo?: string;
  codigo_proveedor?: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  precio_costo?: number;
  costo?: number;
  cantidad_minima?: number;
  descuento?: number;
  unidad?: string;
}

/**
 * Matchea una línea de lista (código de proveedor) contra los equipos del catálogo.
 *
 * Normaliza TODO el whitespace (así "G-142 D" matchea "G-142D") y, cuando hay varios
 * candidatos para el mismo modelo, elige de forma DETERMINÍSTICA en vez de un LIMIT 1
 * arbitrario:
 *   1) match exacto de modelo / marca+modelo antes que el LIKE laxo por proveedor
 *   2) equipos "reales" (con marca) antes que shells sueltos sin marca
 *   3) el registro más antiguo (el original) como desempate
 *
 * Sin esto, un duplicado/shell sin marca puede robarle la vinculación al equipo real
 * y dejar el precio de la lista colgado de un equipo fantasma.
 */
async function matchEquipoId(
  orgId: string,
  codigo: string,
  proveedorId: string | null,
): Promise<string | null> {
  const needle = codigo.toString().trim().replace(/\s+/g, '').toLowerCase();
  if (!needle) return null;
  const r = await query(
    `
    SELECT id FROM equipos
    WHERE org_id = $1
      AND (LOWER(REGEXP_REPLACE(modelo, '\\s+', '', 'g')) = $2
        OR LOWER(REGEXP_REPLACE(CONCAT(marca, modelo), '\\s+', '', 'g')) = $2
        OR (proveedor_id = $4 AND LOWER(REGEXP_REPLACE(modelo, '\\s+', '', 'g')) LIKE $3))
    ORDER BY
      (CASE WHEN LOWER(REGEXP_REPLACE(modelo, '\\s+', '', 'g')) = $2
              OR LOWER(REGEXP_REPLACE(CONCAT(marca, modelo), '\\s+', '', 'g')) = $2
            THEN 0 ELSE 1 END),
      (CASE WHEN marca IS NOT NULL AND TRIM(marca) <> '' THEN 0 ELSE 1 END),
      created_at ASC
    LIMIT 1
    `,
    [orgId, needle, `%${needle}%`, proveedorId],
  );
  return r.rowCount && r.rowCount > 0 ? r.rows[0].id : null;
}

/**
 * POST /api/proveedor-listas-precios/importar
 * Importa una lista de precios desde un archivo Excel o CSV
 *
 * FormData:
 *   - file: Archivo Excel (.xlsx, .xls) o CSV
 *   - proveedor_id: ID del proveedor
 *   - nombre: Nombre de la lista
 *   - moneda: Moneda (ARS, USD)
 *   - mapeo: JSON con mapeo de columnas (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.org_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const proveedorId = formData.get('proveedor_id') as string;
    const nombre = formData.get('nombre') as string;
    const moneda = (formData.get('moneda') as string) || 'ARS';
    const mapeoStr = formData.get('mapeo') as string;
    const tipo = (formData.get('tipo') as string) === 'equipos' ? 'equipos' : 'productos';

    if (!file || !proveedorId || !nombre) {
      return NextResponse.json(
        { error: 'file, proveedor_id y nombre son requeridos' },
        { status: 400 }
      );
    }

    // --- Camino PDF: enrutar a un parser por proveedor (GEMATEC, etc.) ---
    // El camino Excel/CSV (debajo) queda intacto.
    const ext = (file.name?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
      const pdfBuffer = Buffer.from(await file.arrayBuffer());
      const text = await pdftotextLayout(pdfBuffer);
      // Override por proveedor (resiliente si la columna no existe) + auto-detección.
      const provCfg = await query(
        `SELECT to_jsonb(p) ->> 'import_parser' AS import_parser FROM proveedores p WHERE p.id = $1`,
        [proveedorId]
      );
      const override = provCfg.rows[0]?.import_parser as string | undefined;
      // Selección de parser: override explícito del proveedor o auto-detección por formato.
      let parserName: 'gematec' | 'gelec' | null = null;
      if (override === 'gematec' || override === 'gelec') {
        parserName = override;
      } else if (!override) {
        if (esFormatoGematec(text)) parserName = 'gematec';
        else if (esFormatoGelec(text)) parserName = 'gelec';
      }
      if (!parserName) {
        return NextResponse.json({
          error: 'No tengo un parser para este PDF todavía. Configurá el formato del proveedor o avisá para sumarlo.',
        }, { status: 400 });
      }

      const filas = parserName === 'gelec' ? parseGelec(text) : parseGematec(text);
      if (filas.length === 0) {
        return NextResponse.json({ error: 'No pude extraer equipos del PDF.' }, { status: 400 });
      }

      // Si el parser clasifica las filas (multi-categoría, ej. Gelec) se crea una lista por
      // categoría: equipo→equipos, insumo→productos. Si no hay categoría (GEMATEC) → una sola
      // lista con el tipo elegido en el form.
      type Grupo = { tipoLista: 'equipos' | 'productos'; nombre: string; filas: typeof filas };
      const tieneCategoria = filas.some((f) => f.categoria);
      let grupos: Grupo[];
      if (tieneCategoria) {
        const equipos = filas.filter((f) => f.categoria === 'equipo');
        const insumos = filas.filter((f) => f.categoria !== 'equipo'); // insumo / sin categoría → productos
        grupos = [];
        if (equipos.length) grupos.push({ tipoLista: 'equipos', nombre: `${nombre} (Equipos)`, filas: equipos });
        if (insumos.length) grupos.push({ tipoLista: 'productos', nombre: `${nombre} (Insumos)`, filas: insumos });
      } else {
        grupos = [{ tipoLista: tipo, nombre, filas }];
      }

      const resultados = {
        total: filas.length, procesados: 0, vinculados: 0, sin_vincular: 0,
        errores: [] as { fila: number; error: string }[],
      };
      const listas: { id: string; nombre: string; tipo: string; items: number }[] = [];

      for (const grupo of grupos) {
        const listaResult = await query(`
          INSERT INTO proveedor_listas_precios (
            org_id, proveedor_id, nombre, moneda, archivo_origen, estado, tipo
          ) VALUES ($1, $2, $3, $4, $5, 'borrador', $6)
          RETURNING *
        `, [session.org_id, proveedorId, grupo.nombre, moneda, file.name, grupo.tipoLista]);
        const lista = listaResult.rows[0];

        for (let i = 0; i < grupo.filas.length; i++) {
          const { codigo, nombre: nombreProd, precio, descuento } = grupo.filas[i];
          try {
            let productoId: string | null = null;
            let equipoId: string | null = null;
            let matched = false;

            if (grupo.tipoLista === 'productos') {
              // 1) Memoria: si este código de proveedor ya se vinculó antes, reusar ese producto.
              const mem = await query(`
                SELECT pp.producto_id FROM producto_proveedores pp
                JOIN productos p ON p.id = pp.producto_id AND p.org_id = $2
                WHERE pp.proveedor_id = $3 AND LOWER(TRIM(pp.codigo_proveedor)) = LOWER(TRIM($1))
                  AND pp.producto_id IS NOT NULL
                ORDER BY pp.ultima_actualizacion DESC NULLS LAST
                LIMIT 1
              `, [codigo, session.org_id, proveedorId]);
              if (mem.rowCount && mem.rowCount > 0) {
                productoId = mem.rows[0].producto_id; matched = true;
              } else {
                // 2) Fallback: match por código del producto (exacto o LIKE).
                const r = await query(`
                  SELECT id FROM productos
                  WHERE org_id = $3 AND (LOWER(codigo) = LOWER($1) OR LOWER(codigo) LIKE LOWER($2))
                  LIMIT 1
                `, [codigo, `%${codigo}%`, session.org_id]);
                if (r.rowCount && r.rowCount > 0) { productoId = r.rows[0].id; matched = true; }
              }
            } else {
              equipoId = await matchEquipoId(session.org_id, codigo, proveedorId);
              if (equipoId) matched = true;
            }

            if (matched) resultados.vinculados++; else resultados.sin_vincular++;

            await query(`
              INSERT INTO proveedor_lista_items (
                lista_id, producto_id, equipo_id, codigo_proveedor, nombre_proveedor,
                precio_costo, cantidad_minima, descuento_porcentaje, unidad_medida, fila_origen
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [lista.id, productoId, equipoId, codigo || null, nombreProd || null, precio, 1, descuento, null, i + 1]);

            resultados.procesados++;
          } catch (rowError: any) {
            resultados.errores.push({ fila: i + 1, error: rowError.message });
          }
        }

        listas.push({ id: lista.id, nombre: lista.nombre, tipo: grupo.tipoLista, items: grupo.filas.length });
      }

      return NextResponse.json({
        lista_id: listas[0]?.id,
        lista_nombre: listas.map((l) => l.nombre).join(' + '),
        listas,
        resultados,
        parser: parserName,
        formato: `PDF · ${parserName.toUpperCase()}`,
      }, { status: 201 });
    }

    // Parsear mapeo de columnas si se proporcionó
    let mapeo: Record<string, string> = {};
    if (mapeoStr) {
      try {
        mapeo = JSON.parse(mapeoStr);
      } catch {
        // Usar mapeo por defecto
      }
    }

    // Leer archivo
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Permitir override manual vía form fields (para reintentos)
    const sheetOverride = formData.get('sheet') as string | null;
    const headerRowOverride = formData.get('header_row') as string | null;

    // Patrones para detectar columnas
    const patrones = {
      codigo: /^(codigo|code|sku|art|articulo|item|ref|referencia|modelo|model)$/i,
      codigo_proveedor: /^(cod.*prov|prov.*cod|supplier.*code|vendor.*code)$/i,
      nombre: /^(nombre|name|descripcion|description|producto|product|detalle)$/i,
      precio: /^(precio|price|costo|cost|valor|value|importe|amount|p\.?\s*unit|precio.*costo|costo.*unit|pvp|lista)$/i,
      cantidad_minima: /^(cant.*min|min.*cant|moq|minimum|minimo)$/i,
      descuento: /^(desc|discount|dto|bonif)$/i,
      unidad: /^(unidad|unit|um|u\.m\.)$/i,
    };

    // Auto-detectar hoja y fila de headers.
    // Estrategia: para cada hoja, probar todas las filas como "header"; contar matches
    // con los patrones y filas de datos debajo. Elegir la combinación con mejor score.
    function scoreSheet(sheet: XLSX.WorkSheet): { score: number; headerRow: number; data: any[] } {
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
      let best = { score: -1, headerRow: 0, data: [] as any[] };
      const maxProbe = Math.min(rows.length, 15);
      for (let h = 0; h < maxProbe; h++) {
        const headerRow = rows[h];
        if (!Array.isArray(headerRow)) continue;
        const headerStrs = headerRow.map((c) => (c == null ? '' : String(c).trim()));
        // Contar cuántas columnas matchean patrones conocidos
        let matches = 0;
        for (const h of headerStrs) {
          if (!h) continue;
          for (const patron of Object.values(patrones)) {
            if (patron.test(h)) { matches++; break; }
          }
        }
        if (matches < 2) continue; // necesita al menos 2 columnas conocidas
        // Construir datos con ese header
        const headers = headerStrs.map((h, i) => h || `col_${i}`);
        const dataRows = rows.slice(h + 1).map((r) => {
          const obj: any = {};
          for (let i = 0; i < headers.length; i++) obj[headers[i]] = r?.[i] ?? '';
          return obj;
        });
        // Bonus: filas que tienen valor en alguna columna numérica (precio)
        const numericRows = dataRows.filter((r) =>
          Object.values(r).some((v) => typeof v === 'number' && v > 0)
        ).length;
        const score = matches * 10 + numericRows;
        if (score > best.score) best = { score, headerRow: h, data: dataRows };
      }
      return best;
    }

    let sheetName: string;
    let sheet: XLSX.WorkSheet;
    let data: any[];
    let detectedHeaderRow = 0;

    if (sheetOverride && workbook.Sheets[sheetOverride]) {
      // Usuario especificó hoja
      sheetName = sheetOverride;
      sheet = workbook.Sheets[sheetName];
      const hr = headerRowOverride ? parseInt(headerRowOverride, 10) : 0;
      detectedHeaderRow = isNaN(hr) ? 0 : hr;
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
      const headers = (rows[detectedHeaderRow] || []).map((c, i) => (c == null ? `col_${i}` : String(c).trim()));
      data = rows.slice(detectedHeaderRow + 1).map((r) => {
        const obj: any = {};
        for (let i = 0; i < headers.length; i++) obj[headers[i]] = r?.[i] ?? '';
        return obj;
      });
    } else {
      // Auto-detectar: buscar mejor hoja + fila de headers
      let best = { score: -1, sheetName: '', headerRow: 0, data: [] as any[] };
      for (const name of workbook.SheetNames) {
        const r = scoreSheet(workbook.Sheets[name]);
        if (r.score > best.score) best = { ...r, sheetName: name };
      }
      if (best.score < 0) {
        return NextResponse.json({
          error: 'No pude detectar la estructura del archivo. Probá especificar hoja y fila de headers manualmente.',
          sheets: workbook.SheetNames,
        }, { status: 400 });
      }
      sheetName = best.sheetName;
      sheet = workbook.Sheets[sheetName];
      data = best.data;
      detectedHeaderRow = best.headerRow;
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas de datos' }, { status: 400 });
    }

    // Detectar columnas automáticamente si no hay mapeo
    const primeraFila = data[0];
    const columnas = Object.keys(primeraFila);

    const deteccion: Record<string, string> = {};
    for (const col of columnas) {
      for (const [campo, patron] of Object.entries(patrones)) {
        if (patron.test(col) && !deteccion[campo]) {
          deteccion[campo] = col;
          break;
        }
      }
    }

    // Combinar detección automática con mapeo manual
    const mapeoFinal = { ...deteccion, ...mapeo };

    // Crear la lista de precios
    const listaResult = await query(`
      INSERT INTO proveedor_listas_precios (
        org_id, proveedor_id, nombre, moneda, archivo_origen, estado, tipo
      ) VALUES ($1, $2, $3, $4, $5, 'borrador', $6)
      RETURNING *
    `, [session.org_id, proveedorId, nombre, moneda, file.name, tipo]);

    const lista = listaResult.rows[0];

    // Procesar filas
    const resultados = {
      total: data.length,
      procesados: 0,
      vinculados: 0,
      sin_vincular: 0,
      errores: [] as { fila: number; error: string }[]
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const filaNum = i + 2; // +2 porque Excel empieza en 1 y hay header

      try {
        // Extraer valores según mapeo
        const codigo = row[mapeoFinal.codigo] || row[mapeoFinal.codigo_proveedor] || '';
        const nombreProd = row[mapeoFinal.nombre] || '';
        let precio = row[mapeoFinal.precio] || row[mapeoFinal.precio_costo] || row[mapeoFinal.costo] || 0;
        const cantMin = row[mapeoFinal.cantidad_minima] || 1;
        const descuento = row[mapeoFinal.descuento] || 0;
        const unidad = row[mapeoFinal.unidad] || '';

        // Limpiar y parsear precio
        if (typeof precio === 'string') {
          precio = parseFloat(precio.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        }

        if (!codigo && !nombreProd) {
          continue; // Saltar filas vacías
        }

        if (precio <= 0) {
          resultados.errores.push({ fila: filaNum, error: 'Precio inválido o vacío' });
          continue;
        }

        // Vincular con producto o equipo, según el tipo de la lista
        let productoId: string | null = null;
        let equipoId: string | null = null;
        let matched = false;

        if (tipo === 'productos') {
          if (codigo) {
            const matchResult = await query(`
              SELECT id FROM productos
              WHERE org_id = $3
                AND (LOWER(codigo) = LOWER($1) OR LOWER(codigo) LIKE LOWER($2))
              LIMIT 1
            `, [codigo, `%${codigo}%`, session.org_id]);
            if (matchResult.rowCount && matchResult.rowCount > 0) {
              productoId = matchResult.rows[0].id;
              matched = true;
            }
          }
        } else {
          // tipo === 'equipos': matchear por modelo / marca+modelo / LIKE y persistir equipo_id
          if (codigo) {
            equipoId = await matchEquipoId(session.org_id, codigo, proveedorId);
            if (equipoId) matched = true;
          }
        }

        if (matched) resultados.vinculados++; else resultados.sin_vincular++;

        // Insertar item
        await query(`
          INSERT INTO proveedor_lista_items (
            lista_id, producto_id, equipo_id, codigo_proveedor, nombre_proveedor,
            precio_costo, cantidad_minima, descuento_porcentaje,
            unidad_medida, fila_origen
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          lista.id,
          productoId,
          equipoId,
          codigo || null,
          nombreProd || null,
          precio,
          cantMin,
          descuento,
          unidad || null,
          filaNum
        ]);

        resultados.procesados++;
      } catch (rowError: any) {
        resultados.errores.push({ fila: filaNum, error: rowError.message });
      }
    }

    return NextResponse.json({
      lista_id: lista.id,
      lista_nombre: lista.nombre,
      resultados,
      columnas_detectadas: mapeoFinal,
      hoja_detectada: sheetName,
      fila_header: detectedHeaderRow,
      hojas_disponibles: workbook.SheetNames,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error importing lista precios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/proveedor-listas-precios/importar
 * Obtiene información sobre el formato esperado
 */
export async function GET() {
  return NextResponse.json({
    formatos_soportados: ['.xlsx', '.xls', '.csv'],
    columnas_reconocidas: {
      codigo: 'Código del producto (para vinculación automática)',
      codigo_proveedor: 'Código del producto en el sistema del proveedor',
      nombre: 'Nombre o descripción del producto',
      precio: 'Precio de costo/compra',
      cantidad_minima: 'Cantidad mínima de compra (MOQ)',
      descuento: 'Porcentaje de descuento',
      unidad: 'Unidad de medida'
    },
    ejemplo_mapeo: {
      codigo: 'SKU',
      nombre: 'DESCRIPCION',
      precio: 'PRECIO_LISTA'
    },
    notas: [
      'La primera fila debe contener los nombres de las columnas',
      'Los códigos se usan para vincular automáticamente con productos existentes',
      'Los productos no encontrados se guardan sin vinculación para revisión manual'
    ]
  });
}
