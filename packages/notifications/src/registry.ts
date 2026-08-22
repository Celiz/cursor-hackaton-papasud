import type { CatalogEntry } from './types'

const entries = new Map<string, CatalogEntry>()

export function register(entry: CatalogEntry): void {
  entries.set(entry.id, entry)
}

export function get(id: string): CatalogEntry | undefined {
  return entries.get(id)
}

export function getAll(): CatalogEntry[] {
  return Array.from(entries.values())
}

export function getQueries(): CatalogEntry[] {
  return getAll().filter(e => e.type === 'query')
}

export function getActions(): CatalogEntry[] {
  return getAll().filter(e => e.type === 'action')
}

/** Returns a prompt-friendly summary of all entries for the AI */
export function getCatalogPrompt(): string {
  const lines: string[] = ['Catálogo de queries y actions disponibles:\n']

  lines.push('## Queries (suscripciones programadas)')
  for (const e of getQueries()) {
    lines.push(`- **${e.id}**: ${e.description}`)
  }

  lines.push('\n## Actions (ejecución inmediata)')
  for (const e of getActions()) {
    lines.push(`- **${e.id}**: ${e.description}`)
  }

  return lines.join('\n')
}
