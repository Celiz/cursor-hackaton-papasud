-- 998_presupuesto_numero_formato_anio.sql
-- Alinea el formato de numeración de presupuestos GENERALES (insumos/productos) con el de
-- presupuestos de EQUIPOS, manteniendo prefijos distintos a propósito:
--   general/insumos: PRES-AAAA-NNNN   (antes: PRES000005, sin año, 6 dígitos)
--   equipos:         PE-AAAA-NNNN     (sin cambios)
-- Así ambos leen PREFIJO-AÑO-NNNN y se distinguen de un vistazo (PRES- vs PE-).
-- Secuencia por año (igual que generate_presupuesto_equipo_number). Los números viejos
-- PRES000005 quedan como están (no matchean el regex nuevo, no interfieren). (2026-06-17)

CREATE OR REPLACE FUNCTION public.generate_presupuesto_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CASE
      WHEN numero ~ ('^PRES-' || year_part || '-[0-9]+$')
      THEN CAST(SUBSTRING(numero FROM 'PRES-' || year_part || '-([0-9]+)$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO seq_num
  FROM public.presupuestos;

  RETURN 'PRES-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$function$;
