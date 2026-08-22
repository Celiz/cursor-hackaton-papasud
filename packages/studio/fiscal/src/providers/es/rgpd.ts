/**
 * RGPD (GDPR) compliance helpers for Spain.
 */

export const RGPD_CONSENT_TEXT =
  'De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), ' +
  'le informamos que sus datos personales serán tratados con la finalidad de gestionar la relación ' +
  'comercial. Puede ejercer sus derechos de acceso, rectificación, supresión, limitación, ' +
  'portabilidad y oposición dirigiéndose a la dirección indicada.'

export const RGPD_EMAIL_FOOTER =
  'Este mensaje y sus archivos adjuntos están dirigidos exclusivamente a su destinatario. ' +
  'Si ha recibido este correo por error, le rogamos nos lo comunique y proceda a eliminarlo. ' +
  'De acuerdo con el RGPD (UE) 2016/679, puede ejercer sus derechos de protección de datos ' +
  'contactando con nosotros.'

export function getRgpdConsentText(orgNombre: string): string {
  return (
    `De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), ` +
    `${orgNombre} le informa que sus datos personales serán tratados con la finalidad de gestionar ` +
    `la relación comercial. Puede ejercer sus derechos de acceso, rectificación, supresión, ` +
    `limitación, portabilidad y oposición dirigiéndose a ${orgNombre}.`
  )
}
