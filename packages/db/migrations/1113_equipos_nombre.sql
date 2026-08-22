-- equipos.nombre = "Nombre interno / alias de búsqueda" del form de equipo.
-- La columna faltaba: el GET /api/equipos?search=... referenciaba `nombre` en el
-- WHERE (marca/modelo/nombre ILIKE) -> 500 en TODA búsqueda -> los comboboxes que
-- buscan (nueva oportunidad, presupuesto general) no mostraban equipos.
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS nombre text;
