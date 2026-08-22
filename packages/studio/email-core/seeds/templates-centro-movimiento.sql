-- ============================================================================
-- Templates de email por defecto para centros de yoga / pilates / movimiento
-- ============================================================================
-- Set base para Mood, pensado como punto de partida para cualquier futuro
-- centro de la red. Los templates son genéricos: usan {{org_nombre}} en
-- lugar de hard-codear "Mood".
--
-- Uso:
--   1. Editar :org_id arriba con la org destino.
--   2. Ejecutar:
--        docker compose exec -T pg-aeterna psql -U aeterna -d aeterna \
--          -v org_id="'<UUID-de-la-org>'" \
--          -f templates-centro-movimiento.sql
--
-- Idempotente: borra primero los templates predefinidos de esa org antes de
-- insertar la versión actual.
--
-- Variables disponibles para reemplazo en el cuerpo y el asunto:
--   {{nombre}}        nombre del alumno
--   {{org_nombre}}    nombre del centro (ej: "Mood Espacio")
--   {{whatsapp_url}}  URL completa de WhatsApp del centro
--   {{clase}}         nombre de la clase
--   {{dia}} / {{fecha}}
--   {{hora}}
--   {{salon}}
--   {{profe}}
--   {{plan}}
--   {{monto}}
--   {{vigencia}}
--   {{dias}}          días restantes (plan_por_vencer)
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Idempotencia: quitamos el set previo antes de re-insertar.
DELETE FROM email_templates
 WHERE org_id = :org_id
   AND es_predefinido = true;

INSERT INTO email_templates
  (org_id, nombre, slug, descripcion, asunto, cuerpo_html, html_content, cuerpo_text, variables, categoria, es_predefinido, activo)
VALUES

-- ┌─ 1. Bienvenida (cliente_creado) ─────────────────────────────────────────
(:org_id, 'Bienvenida nuevo alumno', 'bienvenida',
 'Se envía cuando se carga un alumno nuevo en el sistema.',
 'Te damos la bienvenida a {{org_nombre}} 🌿',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 32px;">
<h1 style="font-size:26px;margin:0 0 12px;color:#2B2522;line-height:1.15;">Hola {{nombre}}, bienvenida/o a casa.</h1>
<p style="font-size:15px;margin:0 0 16px;">Nos alegra que llegues a <strong>{{org_nombre}}</strong>. Acá adentro vas a encontrar un espacio para bajar un cambio, moverte y volver al cuerpo.</p>
<p style="font-size:15px;margin:0 0 20px;">Algunos tips para arrancar:</p>
<ul style="font-size:15px;margin:0 0 24px;padding-left:20px;">
<li style="margin-bottom:6px;">Llegá 10 minutos antes de tu primera clase.</li>
<li style="margin-bottom:6px;">Ropa cómoda — el mat lo ponemos nosotros.</li>
<li style="margin-bottom:6px;">Si tenés alguna lesión o consulta, decínoslo antes de empezar.</li>
</ul>
<div style="text-align:center;margin-top:8px;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#2B2522;color:#F5EFE0;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Escribinos para reservar</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}} · ¿Dudas? <a href="{{whatsapp_url}}" style="color:#C25B3F;text-decoration:none;font-weight:600;">WhatsApp →</a></td></tr>
</table></td></tr></table></body></html>$html$,
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">[Idéntico al cuerpo_html]</body></html>$html$,
 'Hola {{nombre}},

Nos alegra que llegues a {{org_nombre}}. Acá adentro vas a encontrar un espacio para bajar un cambio, moverte y volver al cuerpo.

Tips para arrancar:
- Llegá 10 minutos antes de tu primera clase.
- Ropa cómoda — el mat lo ponemos nosotros.
- Si tenés alguna lesión o consulta, decínoslo antes de empezar.

Escribinos por WhatsApp: {{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','org_nombre','whatsapp_url'], 'bienvenida', true, true),

-- ┌─ 2. Pago confirmado (cobro_registrado) ─────────────────────────────────
(:org_id, 'Pago confirmado', 'pago-confirmado',
 'Comprobante amable cuando se registra un cobro de un plan.',
 'Recibimos tu pago — {{plan}} ✓',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<h1 style="font-size:24px;margin:0 0 8px;color:#2B2522;line-height:1.2;">¡Pago recibido, {{nombre}}!</h1>
<p style="font-size:15px;margin:0 0 20px;color:#6B6360;">Gracias por confiar en {{org_nombre}}. Tu plan ya está activo.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6E7;border:1px solid #EDE5CC;border-radius:12px;margin:8px 0 20px;"><tr><td style="padding:18px 22px;font-size:14px;">
<div style="margin-bottom:10px;"><span style="color:#8C8578;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Plan</span><br><strong style="font-size:16px;">{{plan}}</strong></div>
<div style="margin-bottom:10px;"><span style="color:#8C8578;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Monto</span><br><strong style="font-size:16px;">{{monto}}</strong></div>
<div><span style="color:#8C8578;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Vigencia hasta</span><br><strong style="font-size:16px;">{{vigencia}}</strong></div>
</td></tr></table>
<p style="font-size:14px;margin:0 0 14px;color:#6B6360;">Cualquier consulta sobre tu plan o reservas, escribinos.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#C25B3F;color:#FFFFFF;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Reservar mi próxima clase</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 '¡Pago recibido, {{nombre}}!

Gracias por confiar en {{org_nombre}}. Tu plan ya está activo.

Plan: {{plan}}
Monto: {{monto}}
Vigencia hasta: {{vigencia}}

Reservá tu próxima clase: {{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','plan','monto','vigencia','org_nombre','whatsapp_url'], 'pago', true, true),

-- ┌─ 3. Recordatorio de clase (turno_recordatorio) ─────────────────────────
(:org_id, 'Recordatorio de clase', 'recordatorio-clase',
 'Recordatorio el día previo (o el mismo día) de la clase.',
 'Mañana te esperamos — {{clase}} a las {{hora}}',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5E7E71;margin-bottom:6px;">Recordatorio</div>
<h1 style="font-size:24px;margin:0 0 16px;color:#2B2522;line-height:1.2;">{{nombre}}, mañana te esperamos en clase.</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6E7;border:1px solid #EDE5CC;border-radius:12px;margin:8px 0 18px;"><tr><td style="padding:20px 22px;">
<div style="font-size:22px;font-weight:700;color:#2B2522;line-height:1.15;">{{clase}}</div>
<div style="font-size:14px;color:#6B6360;margin-top:6px;"><strong style="color:#2B2522;">{{dia}}</strong> · {{hora}} hs · Salón {{salon}}</div>
<div style="font-size:13px;color:#8C8578;margin-top:8px;">Con {{profe}}</div>
</td></tr></table>
<p style="font-size:14px;margin:0 0 6px;color:#6B6360;">Te recordamos:</p>
<ul style="font-size:14px;margin:0 0 18px;padding-left:20px;color:#2B2522;">
<li style="margin-bottom:4px;">Llegá 5-10 minutos antes para acomodarte.</li>
<li style="margin-bottom:4px;">Ropa cómoda y, si querés, una toalla.</li>
</ul>
<p style="font-size:13px;color:#8C8578;margin:0;">Si no podés venir, avisanos con tiempo así liberamos el cupo: <a href="{{whatsapp_url}}" style="color:#C25B3F;text-decoration:none;">WhatsApp</a></p>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 'Recordatorio — {{org_nombre}}

{{nombre}}, mañana te esperamos en clase.

{{clase}}
{{dia}} · {{hora}} hs · Salón {{salon}}
Con {{profe}}

Llegá 5-10 minutos antes. Ropa cómoda.

Si no podés venir, avisanos: {{whatsapp_url}}',
 ARRAY['nombre','clase','dia','hora','salon','profe','org_nombre','whatsapp_url'], 'recordatorio', true, true),

-- ┌─ 4. Inscripción confirmada (turno_creado) ──────────────────────────────
(:org_id, 'Inscripción confirmada', 'inscripcion-confirmada',
 'Se envía cuando un alumno se anota a una clase puntual.',
 'Confirmamos tu lugar en {{clase}}',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#5E7E71;margin-bottom:6px;">✓ Lugar reservado</div>
<h1 style="font-size:24px;margin:0 0 16px;color:#2B2522;line-height:1.2;">¡Listo, {{nombre}}! Te esperamos.</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF6E7;border:1px solid #EDE5CC;border-radius:12px;margin:8px 0 18px;"><tr><td style="padding:20px 22px;">
<div style="font-size:22px;font-weight:700;color:#2B2522;line-height:1.15;">{{clase}}</div>
<div style="font-size:14px;color:#6B6360;margin-top:6px;"><strong style="color:#2B2522;">{{fecha}}</strong> · {{hora}} hs · Salón {{salon}}</div>
<div style="font-size:13px;color:#8C8578;margin-top:8px;">Con {{profe}}</div>
</td></tr></table>
<p style="font-size:14px;margin:0 0 18px;color:#6B6360;">Llegá unos minutos antes para acomodarte. Si surge cualquier cosa y no podés venir, avisanos con tiempo.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;border:2px solid #2B2522;color:#2B2522;padding:10px 22px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Hablar con el centro</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 '¡Listo, {{nombre}}! Te esperamos.

{{clase}}
{{fecha}} · {{hora}} hs · Salón {{salon}}
Con {{profe}}

Llegá unos minutos antes. Si no podés venir, avisanos.

WhatsApp: {{whatsapp_url}}',
 ARRAY['nombre','clase','fecha','hora','salon','profe','org_nombre','whatsapp_url'], 'confirmacion', true, true),

-- ┌─ 5. Cancelación (turno_cancelado) ──────────────────────────────────────
(:org_id, 'Cancelación de turno', 'cancelacion-turno',
 'Confirma la cancelación de una clase reservada.',
 'Cancelamos tu turno de {{clase}}',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<h1 style="font-size:22px;margin:0 0 12px;color:#2B2522;line-height:1.25;">{{nombre}}, cancelamos tu turno.</h1>
<p style="font-size:15px;margin:0 0 16px;color:#6B6360;">Tu clase de <strong style="color:#2B2522;">{{clase}}</strong> del <strong>{{fecha}}</strong> a las {{hora}} hs quedó cancelada. Liberamos el cupo.</p>
<p style="font-size:15px;margin:0 0 20px;">Cuando quieras volver a reservar, estamos a un mensaje de distancia.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#2B2522;color:#F5EFE0;padding:12px 26px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Reservar otra clase</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 '{{nombre}}, cancelamos tu turno.

Clase: {{clase}}
Fecha: {{fecha}}
Hora: {{hora}}

Cuando quieras volver a reservar, escribinos: {{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','clase','fecha','hora','org_nombre','whatsapp_url'], 'cancelacion', true, true),

-- ┌─ 6. Post-clase (sesion_completada) ─────────────────────────────────────
(:org_id, 'Post-clase', 'post-clase',
 'Agradecimiento corto después de tomar una clase. Funciona muy bien para retener.',
 '¿Cómo te sentiste hoy en {{clase}}?',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<h1 style="font-size:24px;margin:0 0 12px;color:#2B2522;line-height:1.2;">Gracias por venir, {{nombre}} 🙏</h1>
<p style="font-size:15px;margin:0 0 14px;">Esperamos que la clase de <strong>{{clase}}</strong> con {{profe}} te haya hecho bien al cuerpo.</p>
<p style="font-size:15px;margin:0 0 14px;color:#6B6360;font-style:italic;">«Vení, respirá, quedate un rato».</p>
<p style="font-size:14px;margin:0 0 18px;">Si tenés algo para compartir — cómo te sentiste, una sugerencia, una duda — escribinos. Nos sirve un montón.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;border:2px solid #C25B3F;color:#C25B3F;padding:10px 22px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Contanos cómo estuvo</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 'Gracias por venir, {{nombre}}.

Esperamos que la clase de {{clase}} con {{profe}} te haya hecho bien.

«Vení, respirá, quedate un rato».

Si tenés algo para compartir, escribinos: {{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','clase','profe','org_nombre','whatsapp_url'], 'post-clase', true, true),

-- ┌─ 7. Cumpleaños (cumpleanos) ────────────────────────────────────────────
(:org_id, 'Saludo de cumpleaños', 'cumpleanos',
 'Saludo automático el día del cumpleaños del alumno.',
 '¡Feliz cumple, {{nombre}}! 🎂',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:36px 32px 32px;text-align:center;">
<div style="font-size:48px;line-height:1;margin-bottom:16px;">🎂</div>
<h1 style="font-size:30px;margin:0 0 14px;color:#2B2522;line-height:1.1;font-family:Georgia,serif;">¡Feliz cumple,<br>{{nombre}}!</h1>
<p style="font-size:16px;margin:0 0 22px;color:#6B6360;font-style:italic;line-height:1.5;">Que sea un año de moverte rico,<br>respirar profundo y cuidarte mucho.</p>
<div style="height:1px;width:80px;background:#E8E0C8;margin:0 auto 22px;"></div>
<p style="font-size:14px;margin:0 0 22px;">Como regalo nuestro: la próxima clase invita la casa. Avisanos cuándo querés venir.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#C25B3F;color:#FFFFFF;padding:14px 30px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Reservar mi regalo</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">Con cariño, todo el equipo de {{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 '¡Feliz cumple, {{nombre}}!

Que sea un año de moverte rico, respirar profundo y cuidarte mucho.

Como regalo nuestro: la próxima clase invita la casa. Avisanos cuándo querés venir: {{whatsapp_url}}

Con cariño, todo el equipo de {{org_nombre}}',
 ARRAY['nombre','org_nombre','whatsapp_url'], 'cumpleanos', true, true),

-- ┌─ 8. Plan por vencer (plan_por_vencer) ──────────────────────────────────
(:org_id, 'Plan por vencer', 'plan-por-vencer',
 'Aviso cuando el plan está por terminar (típicamente 5 días antes).',
 'Tu plan vence en {{dias}} días',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#D4A82B;margin-bottom:6px;">⏳ Plan por vencer</div>
<h1 style="font-size:24px;margin:0 0 14px;color:#2B2522;line-height:1.2;">Hola {{nombre}}, te avisamos.</h1>
<p style="font-size:15px;margin:0 0 14px;">Tu plan <strong>{{plan}}</strong> vence el <strong>{{vigencia}}</strong>. Te quedan <strong style="color:#C25B3F;">{{dias}} días</strong>.</p>
<p style="font-size:15px;margin:0 0 20px;">Si querés seguir, te ayudamos a renovar antes para que no se te corte el ritmo.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#2B2522;color:#F5EFE0;padding:12px 26px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Renovar mi plan</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 'Hola {{nombre}}, te avisamos.

Tu plan {{plan}} vence el {{vigencia}}. Te quedan {{dias}} días.

Si querés renovar antes para que no se te corte el ritmo, escribinos: {{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','plan','vigencia','dias','org_nombre','whatsapp_url'], 'plan', true, true),

-- ┌─ 9. Reactivación (sin evento — envío manual o cron custom) ─────────────
(:org_id, 'Reactivación (te extrañamos)', 'reactivacion',
 'Para alumnos que hace tiempo no vienen — envío manual o por automatización custom.',
 'Hace un tiempito que no te vemos, {{nombre}}',
 $html$<!DOCTYPE html><html lang="es"><body style="margin:0;padding:0;background:#F2EBD5;font-family:Georgia,'Times New Roman',serif;color:#2B2522;line-height:1.55;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F2EBD5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E8E0C8;">
<tr><td style="padding:32px 32px 8px;text-align:center;"><div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#C25B3F;">{{org_nombre}}</div><div style="height:1px;width:48px;background:#E8E0C8;margin:14px auto 0;"></div></td></tr>
<tr><td style="padding:24px 32px 28px;">
<h1 style="font-size:24px;margin:0 0 14px;color:#2B2522;line-height:1.2;">{{nombre}}, te extrañamos.</h1>
<p style="font-size:15px;margin:0 0 14px;">Hace un rato que no te vemos por <strong>{{org_nombre}}</strong>. No queríamos dejar pasar más tiempo sin saludarte.</p>
<p style="font-size:15px;margin:0 0 18px;color:#6B6360;">Si la vida te llevó por otros caminos, todo bien. Y si querés volver, te dejamos el lugar abierto. Quizás una clase suelta, sin compromiso, para reencontrarte con el cuerpo.</p>
<div style="text-align:center;"><a href="{{whatsapp_url}}" style="display:inline-block;background:#C25B3F;color:#FFFFFF;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Volver a entrenar</a></div>
</td></tr>
<tr><td style="background:#F8F3E1;padding:18px 32px;border-top:1px solid #EDE5CC;text-align:center;font-size:12px;color:#6B6360;">{{org_nombre}}</td></tr>
</table></td></tr></table></body></html>$html$,
 $html$placeholder$html$,
 '{{nombre}}, te extrañamos.

Hace un rato que no te vemos por {{org_nombre}}. No queríamos dejar pasar más tiempo sin saludarte.

Si querés volver, te dejamos el lugar abierto. Quizás una clase suelta, sin compromiso, para reencontrarte con el cuerpo.

{{whatsapp_url}}

— {{org_nombre}}',
 ARRAY['nombre','org_nombre','whatsapp_url'], 'reactivacion', true, true);

-- Sincronizar html_content con cuerpo_html (la columna vieja sigue NOT NULL).
UPDATE email_templates
   SET html_content = cuerpo_html
 WHERE org_id = :org_id
   AND es_predefinido = true;

COMMIT;

-- Resumen
SELECT slug, nombre, asunto FROM email_templates
 WHERE org_id = :org_id AND es_predefinido = true
 ORDER BY nombre;
