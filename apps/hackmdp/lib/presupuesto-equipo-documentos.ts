import { query } from '@/lib/db';

export interface DocumentoBibliotecaRow {
  titulo: string;
  descripcion: string | null;
  tipo: string | null;
  archivo_url: string | null;
  link_externo: string | null;
}

/**
 * Documentos de biblioteca relevantes a un presupuesto de equipo:
 *  - los vinculados directamente al presupuesto (cualquier tipo), y
 *  - los folletos / fichas técnicas / manuales de los equipos que incluye.
 *
 * Es la fuente única que usan el PDF (botones "Ver ...") y el email (adjuntos +
 * enlaces en el cuerpo), para que el PDF adjunto y el descargable coincidan.
 */
export async function fetchDocumentosPresupuestoEquipo(
  presupuesto_id: string,
  org_id: string,
): Promise<DocumentoBibliotecaRow[]> {
  const res = await query(
    `SELECT DISTINCT r.titulo, r.descripcion, r.tipo, r.archivo_url, r.link_externo
       FROM biblioteca_vinculos v
       JOIN biblioteca_recursos r
         ON r.id = v.recurso_id AND r.org_id = $2 AND r.activo = true
      WHERE
        -- Documentos agregados directamente al presupuesto (cualquier tipo)
        (v.entidad_tipo = 'presupuesto_equipo' AND v.entidad_id = $1)
        -- Folleto / ficha técnica / manual de los equipos del presupuesto
        OR (v.entidad_tipo = 'equipo'
            AND r.tipo IN ('folleto', 'ficha_tecnica', 'manual')
            AND v.entidad_id IN (
              SELECT equipo_id FROM presupuestos_equipos_items
               WHERE presupuesto_equipo_id = $1 AND equipo_id IS NOT NULL
            ))
      ORDER BY r.titulo`,
    [presupuesto_id, org_id],
  );
  return res.rows as DocumentoBibliotecaRow[];
}

/** Etiqueta corta del tipo para el botón del PDF ("Ver folleto", "Ver ficha", ...). */
export function etiquetaTipoDocumento(tipo: string | null | undefined): string {
  switch (tipo) {
    case 'folleto': return 'folleto';
    case 'ficha_tecnica': return 'ficha';
    case 'manual': return 'manual';
    case 'software': return 'software';
    default: return 'documento';
  }
}
