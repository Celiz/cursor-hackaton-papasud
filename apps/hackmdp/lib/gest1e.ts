export const GEST1E_USER_ID = '9e571eb0-7000-4000-8000-000000000001';
export const GEST1E_EMAIL = 'gest1e@aeterna.local';
export const GEST1E_NOMBRE = 'Gest1e';
export const GEST1E_CARGO = 'Asistente IA';

const UNO_ELECTROMEDICINA_ORG_ID = '48b2a35a-0cb8-4643-a1d6-045918f9704c';

export const GEST1E_ENABLED_ORG_IDS = new Set<string>([
  UNO_ELECTROMEDICINA_ORG_ID,
]);

export function isGest1eEnabledFor(orgId: string | null | undefined): boolean {
  return !!orgId && GEST1E_ENABLED_ORG_IDS.has(orgId);
}

export type Gest1eMessageKind = 'text' | 'status' | 'proposal' | 'action_result';

export interface Gest1eProposalMetadata {
  kind: 'proposal';
  proposal_id: string;
  proposal_type: string;
  payload: Record<string, unknown>;
  actions: Array<{
    id: string;
    label: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface Gest1eStatusMetadata {
  kind: 'status';
  label: string;
  tool_name?: string;
}
