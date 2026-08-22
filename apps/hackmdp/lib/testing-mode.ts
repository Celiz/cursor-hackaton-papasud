/**
 * Testing mode — prevents external messages from reaching real clients.
 *
 * When TESTING_MODE=true, all outgoing emails, WhatsApp messages, SMS, and IVR calls
 * are filtered through an allowlist. If a recipient is not in the allowlist, the send
 * is silently blocked (the DB record may still be created, but no external delivery).
 *
 * Env vars:
 *   TESTING_MODE=true
 *   TESTING_ALLOWED_EMAILS=nahuel.sigismondi@gmail.com,other@test.com
 *   TESTING_ALLOWED_PHONES=5492235633653,5492230000000
 */

export const TESTING_MODE = process.env.TESTING_MODE === "true";

const allowedEmailsRaw = process.env.TESTING_ALLOWED_EMAILS || "";
const allowedPhonesRaw = process.env.TESTING_ALLOWED_PHONES || "";

const ALLOWED_EMAILS = new Set(
  allowedEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

const ALLOWED_PHONES = new Set(
  allowedPhonesRaw
    .split(",")
    .map((p) => p.replace(/\D/g, ""))
    .filter(Boolean)
);

/** Normalize a phone to digits-only, last 10 digits for matching */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normalize an email for matching */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Check if an email is allowed to receive a message.
 * - In normal mode: always true.
 * - In testing mode: only if it's in the allowlist.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!TESTING_MODE) return true;
  if (!email) return false;
  return ALLOWED_EMAILS.has(normalizeEmail(email));
}

/**
 * Check if a phone number is allowed to receive a message.
 * Matches by digit sequence (ignores formatting).
 */
export function isPhoneAllowed(phone: string | null | undefined): boolean {
  if (!TESTING_MODE) return true;
  if (!phone) return false;
  const norm = normalizePhone(phone);
  if (ALLOWED_PHONES.has(norm)) return true;
  // Also match if allowlist contains a suffix/prefix
  for (const allowed of ALLOWED_PHONES) {
    if (norm.endsWith(allowed) || allowed.endsWith(norm)) return true;
  }
  return false;
}

/**
 * Filter an array of emails down to the allowed ones. In normal mode, returns as-is.
 * Returns { allowed, blocked } for logging.
 */
export function filterEmails(emails: string[]): { allowed: string[]; blocked: string[] } {
  if (!TESTING_MODE) return { allowed: emails, blocked: [] };
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const email of emails) {
    if (isEmailAllowed(email)) allowed.push(email);
    else blocked.push(email);
  }
  return { allowed, blocked };
}

/**
 * Filter an array of phones. Same semantics as filterEmails.
 */
export function filterPhones(phones: string[]): { allowed: string[]; blocked: string[] } {
  if (!TESTING_MODE) return { allowed: phones, blocked: [] };
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const phone of phones) {
    if (isPhoneAllowed(phone)) allowed.push(phone);
    else blocked.push(phone);
  }
  return { allowed, blocked };
}

/** Error class thrown when an external send is blocked in testing mode. */
export class TestingModeBlockedError extends Error {
  constructor(
    public readonly channel: "email" | "whatsapp" | "sms" | "ivr",
    public readonly blockedRecipients: string[]
  ) {
    super(
      `[TESTING MODE] ${channel} send blocked — no allowed recipients. Blocked: ${blockedRecipients.join(", ")}`
    );
    this.name = "TestingModeBlockedError";
  }
}

/** Log a testing-mode block for observability */
export function logBlock(channel: string, blocked: string[], reason?: string): void {
  if (blocked.length === 0) return;
  console.warn(
    `[TESTING MODE] Blocked ${channel} to ${blocked.length} recipient(s): ${blocked.join(", ")}${reason ? " — " + reason : ""}`
  );
}
