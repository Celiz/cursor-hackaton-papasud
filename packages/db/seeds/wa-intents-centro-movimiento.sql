-- ============================================================================
-- Set base de wa_intents para centros de yoga / pilates / movimiento.
-- Genérico — usa {{org_nombre}} y placeholders neutros.
--
-- Uso:
--   docker compose exec -T pg-aeterna psql -U aeterna -d aeterna \
--     -v org_id="'<UUID-de-la-org>'" \
--     -f wa-intents-centro-movimiento.sql
--
-- Idempotente: borra el set predefinido previo antes de re-insertar.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Brand voice por defecto para centros de movimiento. Si la org ya tiene una
-- definida, NO la sobreescribimos.
UPDATE organizations
   SET config = jsonb_set(
         coalesce(config, '{}'::jsonb),
         '{brand_voice}',
         to_jsonb('Tono cálido y cuidado, argentino informal (vos, viste, querés). Frases cortas y directas. Inspirado en "vení, respirá, quedate un rato". Sin sobreactuar emojis: máximo uno por mensaje, y solo si suma. Mensajes que se sientan escritos por una persona real, no por una empresa.'::text),
         true
       )
 WHERE id = :org_id
   AND (config->>'brand_voice') IS NULL;

DELETE FROM wa_intents WHERE org_id = :org_id AND es_predefinido = true;

INSERT INTO wa_intents
  (org_id, slug, nombre, descripcion, prompt_brief, variables, evento, auto_send, es_predefinido)
VALUES

-- 1. Bienvenida
(:org_id, 'bienvenida', 'Bienvenida al centro',
 'Primer mensaje al alumno nuevo. Cálido, sin agobiar con info.',
 'Dale la bienvenida al alumno por su nombre. Una línea de qué encuentra en el centro (espacio para moverse, bajar un cambio). Cerralo con una invitación abierta a escribir cualquier duda. NO mencionés la voz del centro ni cliches. NO listes tips ni reglas — eso queda para otro momento. Máximo 3 líneas.',
 ARRAY['nombre'], 'cliente_creado', false, true),

-- 2. Inscripción confirmada
(:org_id, 'inscripcion', 'Inscripción confirmada',
 'Confirma que el lugar está reservado para una clase puntual.',
 'Confirmá la inscripción del alumno a una clase específica. Mencioná clase, día/fecha, hora, salón y profe. Cerrá con un "te esperamos" cálido. Máximo 3 líneas. Sin saludo formal.',
 ARRAY['nombre','clase','fecha','hora','salon','profe'], 'turno_creado', true, true),

-- 3. Recordatorio de clase
(:org_id, 'recordatorio', 'Recordatorio de clase',
 'El día anterior. Recordá la clase y pedí que avise si no puede ir.',
 'Recordale al alumno que mañana tiene su clase. Mencioná clase, hora y profe. Pedile que avise si no puede ir, así liberás el cupo. Tono relajado, no alarmista. Máximo 3 líneas.',
 ARRAY['nombre','clase','hora','profe'], 'turno_recordatorio', true, true),

-- 4. Cancelación de turno
(:org_id, 'cancelacion', 'Cancelación de turno',
 'Confirma la cancelación de la clase reservada.',
 'Confirmá que cancelaste la clase del alumno (mencioná clase, fecha, hora). Decile que liberaste el cupo. Cerrá con que cuando quiera volver a reservar está a un mensaje. Máximo 3 líneas.',
 ARRAY['nombre','clase','fecha','hora'], 'turno_cancelado', true, true),

-- 5. Pago confirmado
(:org_id, 'pago-confirmado', 'Pago confirmado',
 'Comprobante amable cuando se registra un cobro.',
 'Avisale al alumno que recibimos su pago. Mencioná qué plan compró y hasta cuándo le queda vigente. Sumá una invitación corta a reservar la próxima clase. Sin tilde formalista. Máximo 3 líneas.',
 ARRAY['nombre','plan','vigencia'], 'cobro_registrado', false, true),

-- 6. Post-clase
(:org_id, 'post-clase', 'Post-clase / agradecimiento',
 'Después de la clase, un mensaje corto que abra la conversación.',
 'Agradecé al alumno por venir hoy. Mencioná la clase y el profe. Pediles que te cuente cómo se sintió, o si tiene algo para sugerir. Cálido, breve, sin sobreactuar. Máximo 3 líneas.',
 ARRAY['nombre','clase','profe'], 'sesion_completada', false, true),

-- 7. Cumpleaños
(:org_id, 'cumpleanos', 'Saludo de cumpleaños',
 'El día del cumple. Cariñoso, con un detalle simbólico.',
 'Saludá al alumno por su cumpleaños. Deseale algo cuidado, no genérico ("que sea un año de moverte rico" o similar). Mencioná que tiene una clase de regalo: la próxima invita la casa. Máximo 3 líneas.',
 ARRAY['nombre'], 'cumpleanos', false, true),

-- 8. Plan por vencer
(:org_id, 'plan-vencer', 'Plan por vencer',
 'Aviso amable unos días antes de que el plan termine.',
 'Avisale al alumno que su plan vence pronto (mencioná plan, fecha de vencimiento y días restantes). Ofrecé ayudarlo a renovar antes para no cortar el ritmo. Sin presión. Máximo 3 líneas.',
 ARRAY['nombre','plan','vigencia','dias'], 'plan_por_vencer', false, true),

-- 9. Reactivación
(:org_id, 'reactivacion', 'Reactivación (te extrañamos)',
 'Para alumnos que hace tiempo no vienen. Envío manual.',
 'Escribile al alumno que hace tiempo no lo vemos. Sin culparlo, sin presionar. Dejale la puerta abierta: si quiere volver, ofrecele una clase suelta sin compromiso. Tono honesto, casi de amigo. Máximo 4 líneas.',
 ARRAY['nombre'], NULL, false, true);

COMMIT;

-- Resumen
SELECT slug, nombre, evento, auto_send, activo
  FROM wa_intents
 WHERE org_id = :org_id AND es_predefinido = true
 ORDER BY nombre;
