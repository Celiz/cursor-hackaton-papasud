/**
 * Spanish tax ID validation: NIF, NIE, and CIF.
 *
 * - NIF: 8 digits + letter (mod 23 lookup)
 * - NIE: X/Y/Z + 7 digits + letter (replace prefix, then mod 23)
 * - CIF: letter + 7 digits + check (digit or letter depending on first char)
 */

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'

// CIF first-letter groups
const CIF_LETTER_CHECK = 'JABCDEFGHI' // for check-letter CIFs
const CIF_FIRST_LETTERS = 'ABCDEFGHJNPQRSUVW'

function stripSpaces(value: string): string {
  return value.replace(/[\s\-]/g, '').toUpperCase()
}

export function validateNif(value: string): boolean {
  const clean = stripSpaces(value)

  // Try NIF (DNI): 8 digits + letter
  if (/^\d{8}[A-Z]$/.test(clean)) {
    const num = parseInt(clean.slice(0, 8), 10)
    const letter = clean[8]
    return NIF_LETTERS[num % 23] === letter
  }

  // Try NIE: X/Y/Z + 7 digits + letter
  if (/^[XYZ]\d{7}[A-Z]$/.test(clean)) {
    const prefix = clean[0] === 'X' ? '0' : clean[0] === 'Y' ? '1' : '2'
    const num = parseInt(prefix + clean.slice(1, 8), 10)
    const letter = clean[8]
    return NIF_LETTERS[num % 23] === letter
  }

  // Try CIF: letter + 7 digits + (digit or letter)
  if (/^[A-Z]\d{7}[A-Z0-9]$/.test(clean)) {
    return validateCif(clean)
  }

  return false
}

function validateCif(cif: string): boolean {
  const firstLetter = cif[0]
  if (!CIF_FIRST_LETTERS.includes(firstLetter)) return false

  const digits = cif.slice(1, 8).split('').map(Number)
  let sumEven = 0
  let sumOdd = 0

  for (let i = 0; i < 7; i++) {
    if (i % 2 === 0) {
      // Odd positions (1-indexed): multiply by 2, sum digits
      const doubled = digits[i] * 2
      sumOdd += doubled >= 10 ? doubled - 9 : doubled
    } else {
      sumEven += digits[i]
    }
  }

  const total = sumEven + sumOdd
  const controlDigit = (10 - (total % 10)) % 10
  const lastChar = cif[8]

  // Some CIF types use letter check, others digit
  const usesLetter = 'NPQRSW'.includes(firstLetter)
  const usesDigit = 'ABEH'.includes(firstLetter)

  if (usesLetter) {
    return lastChar === CIF_LETTER_CHECK[controlDigit]
  } else if (usesDigit) {
    return lastChar === String(controlDigit)
  } else {
    // Accept either
    return lastChar === String(controlDigit) || lastChar === CIF_LETTER_CHECK[controlDigit]
  }
}

export function formatNif(value: string): string {
  return stripSpaces(value)
}
