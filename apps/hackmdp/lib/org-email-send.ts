/**
 * Helper para mandar mail desde la cuenta SMTP de una org sin requerir
 * sesión del Estudio (que es lo que pide /api/org-email/send).
 *
 * Mismo flow que ese endpoint pero callable directo desde código server-side
 * — sobre todo para flows como portal de cliente y crons.
 *
 * Respeta TESTING_MODE (filtra emails no allowlisteados).
 */

import nodemailer from "nodemailer";
import { getOrgEmailConfig } from "@aeterna/notifications";
import { TESTING_MODE, filterEmails, logBlock } from "@/lib/testing-mode";

export interface SendOrgEmailOpts {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachmentBase64?: string;
  attachmentName?: string;
  orgNombre?: string; // Para el "From" name
}

export async function sendOrgEmail(
  orgId: string,
  opts: SendOrgEmailOpts
): Promise<{ ok: true; messageId: string } | { ok: false; reason: string }> {
  const rawRecipients = Array.isArray(opts.to) ? opts.to : [opts.to];
  const { allowed: recipients, blocked } = filterEmails(rawRecipients);
  if (TESTING_MODE && blocked.length > 0) {
    logBlock("email", blocked, `subject: ${opts.subject}`);
  }
  if (recipients.length === 0) {
    return {
      ok: false,
      reason: "TESTING_MODE: ningún destinatario permitido",
    };
  }

  const orgConfig = await getOrgEmailConfig(orgId);
  const emailHost =
    orgConfig?.smtp_host || process.env.EMAIL_HOST || process.env.OWN_EMAIL_HOST;
  const emailPort =
    orgConfig?.smtp_port || parseInt(process.env.EMAIL_PORT || "465");
  const emailUser =
    orgConfig?.smtp_user || process.env.EMAIL_USER || process.env.OWN_EMAIL_USER;
  const emailPassword =
    orgConfig?.smtp_pass || process.env.EMAIL_PASSWORD || process.env.OWN_EMAIL_PW;
  const emailFrom = orgConfig?.from_email || process.env.EMAIL_FROM || emailUser;
  const emailFromName = orgConfig?.from_name || opts.orgNombre || "Locus";

  if (!emailHost || !emailUser || !emailPassword) {
    return { ok: false, reason: "Configuración SMTP incompleta para la org" };
  }

  const transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: { user: emailUser, pass: emailPassword },
  });

  const html =
    opts.html || opts.text?.replace(/\n/g, "<br>") || "";

  const mailOptions: nodemailer.SendMailOptions = {
    from: `"${emailFromName}" <${emailFrom}>`,
    to: recipients.join(", "),
    subject: opts.subject,
    text: opts.text || "",
    html,
  };

  if (opts.attachmentBase64 && opts.attachmentName) {
    mailOptions.attachments = [
      {
        filename: opts.attachmentName,
        content: opts.attachmentBase64,
        encoding: "base64",
      },
    ];
  }

  const info = await transporter.sendMail(mailOptions);
  return { ok: true, messageId: info.messageId };
}
