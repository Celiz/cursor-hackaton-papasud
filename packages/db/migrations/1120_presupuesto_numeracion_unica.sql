-- 1120_presupuesto_numeracion_unica.sql
-- Una sola lista de numeración para TODOS los presupuestos (equipos + insumos/generales),
-- con un único prefijo PRES-AAAA-NNNN. Supersede a la 998 (que numeraba por tabla).
--
-- Ambos generadores toman número de un contador COMPARTIDO por año que escanea las DOS
-- tablas (presupuestos + presupuestos_equipos), así nunca se repite un número entre tipos.
-- generate_presupuesto_equipo_number() ahora delega en generate_presupuesto_number().
--
-- Los números viejos (PRES000005, PE-2026-0005) NO matchean el regex nuevo, así que quedan
-- como están y no interfieren; la secuencia única arranca en PRES-2026-0001. (2026-06-18)

CREATE OR REPLACE FUNCTION public.generate_presupuesto_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(n), 0) + 1 INTO seq_num
  FROM (
    SELECT CAST(SUBSTRING(numero FROM 'PRES-' || year_part || '-([0-9]+)$') AS INTEGER) AS n
      FROM public.presupuestos
      WHERE numero ~ ('^PRES-' || year_part || '-[0-9]+$')
    UNION ALL
    SELECT CAST(SUBSTRING(numero FROM 'PRES-' || year_part || '-([0-9]+)$') AS INTEGER) AS n
      FROM public.presupuestos_equipos
      WHERE numero ~ ('^PRES-' || year_part || '-[0-9]+$')
  ) t;

  RETURN 'PRES-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
END;
$function$;

-- Los presupuestos de equipos usan el mismo contador y prefijo.
CREATE OR REPLACE FUNCTION public.generate_presupuesto_equipo_number()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN public.generate_presupuesto_number();
END;
$function$;
