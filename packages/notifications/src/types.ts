import { z } from 'zod'

export interface QueryResult {
  type: 'text'
  message: string
}

export interface ActionResult {
  type: 'text' | 'document'
  message?: string
  document?: Buffer
  filename?: string
  caption?: string
}

export interface CatalogEntry {
  id: string
  type: 'query' | 'action'
  description: string
  params: z.ZodType<any>
  execute: (orgId: string, params: Record<string, any>) => Promise<QueryResult | ActionResult>
}

export interface Subscription {
  id: string
  org_id: string
  persona_id: string
  telegram_user_id: string
  catalog_id: string
  params: Record<string, any>
  trigger_type: 'cron' | 'once' | 'event'
  cron_schedule: string | null
  event_name: string | null
  once_at: string | null
  enabled: boolean
  last_run: string | null
  last_result: any
  original_request: string | null
  created_at: string
  updated_at: string
}

export type TriggerType = 'cron' | 'once' | 'event'
