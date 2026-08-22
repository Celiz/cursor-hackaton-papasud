// Client
export { query, getClient, transaction, getPool, closePool } from './client'

// Schema types - Core
export type {
  Persona,
  Organization,
  OrgMember,
  OrgMemberRol,
  OrgContact,
  OrgContactTipo,
  AuthCredential,
  AuthSession,
  PersonaWithOrgs,
  OrgContactWithPersona,
  OrgMemberWithPersona,
} from './schema'


// Schema types - Entidades
export * from './schema-entidades'


// Schema types - Uno
export * from './schema-uno'

// Migrations - import separately from @locus/db/migrate for CLI use only
// export { migrate, rollback } from './migrate'
