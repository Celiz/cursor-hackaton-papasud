/**
 * Extract a usable contact string from JSONB or string field.
 * Handles: string, array, { numero: string } object formats.
 */
export function extractContact(field: any): string {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return field[0] || ''
  if (typeof field === 'object' && field.numero) return field.numero
  return String(field)
}

/**
 * Extract a valid email address from JSONB or string field.
 * Handles: string, JSON-encoded string, array of strings/objects, { email: string } object.
 */
export function extractEmail(field: any): string | null {
  if (!field) return null
  if (typeof field === 'string') {
    if (field.includes('@')) return field.trim()
    try { field = JSON.parse(field) } catch { return null }
  }
  if (Array.isArray(field)) {
    for (const item of field) {
      if (typeof item === 'string' && item.includes('@')) return item.trim()
      if (typeof item === 'object' && item?.email) return item.email.trim()
    }
    return null
  }
  if (typeof field === 'object' && field?.email) return field.email.trim()
  return null
}
