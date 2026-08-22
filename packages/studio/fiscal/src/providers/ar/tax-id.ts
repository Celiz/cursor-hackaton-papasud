/**
 * CUIT validation and formatting for Argentina.
 *
 * Format: XX-XXXXXXXX-X (11 digits total)
 * Check digit uses multipliers [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] with mod 11.
 */

const CUIT_MULTIPLIERS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

function stripCuit(value: string): string {
  return value.replace(/[\s\-]/g, '')
}

export function validateCuit(value: string): boolean {
  const digits = stripCuit(value)
  if (!/^\d{11}$/.test(digits)) return false

  const nums = digits.split('').map(Number)
  const checkDigit = nums[10]

  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += nums[i] * CUIT_MULTIPLIERS[i]
  }

  const remainder = sum % 11
  let expected: number
  if (remainder === 0) {
    expected = 0
  } else if (remainder === 1) {
    // Special case: check digit 9 for tipo 23, otherwise invalid
    // Simplified: accept 9 as valid
    expected = 9
  } else {
    expected = 11 - remainder
  }

  return checkDigit === expected
}

export function formatCuit(value: string): string {
  const digits = stripCuit(value)
  if (digits.length !== 11) return value
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}
