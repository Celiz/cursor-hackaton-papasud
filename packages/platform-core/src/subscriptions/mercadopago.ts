import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { getMPAccessToken } from './queries'

async function getMPClient(orgId: string): Promise<MercadoPagoConfig> {
  const accessToken = await getMPAccessToken(orgId)
  if (!accessToken) {
    throw new Error('MercadoPago access token not configured for this organization')
  }
  return new MercadoPagoConfig({ accessToken })
}

export interface CreateSubscriptionParams {
  orgId: string
  reason: string
  payerEmail: string
  transactionAmount: number
  currencyId: string
  frequency: number
  frequencyType: string
  backUrl: string
  externalReference: string
  notificationUrl?: string
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const client = await getMPClient(params.orgId)
  const preApproval = new PreApproval(client)

  const body: Record<string, unknown> = {
    reason: params.reason,
    payer_email: params.payerEmail,
    auto_recurring: {
      frequency: params.frequency,
      frequency_type: params.frequencyType as 'days' | 'months',
      transaction_amount: params.transactionAmount,
      currency_id: params.currencyId,
    },
    back_url: params.backUrl,
    external_reference: params.externalReference,
    status: 'pending',
  }
  if (params.notificationUrl) {
    body.notification_url = params.notificationUrl
  }

  const result = await preApproval.create({ body: body as any })

  return {
    id: result.id!,
    init_point: result.init_point!,
    status: result.status,
    payer_id: result.payer_id,
  }
}

export async function getSubscription(orgId: string, subscriptionId: string) {
  const client = await getMPClient(orgId)
  const preApproval = new PreApproval(client)

  const result = await preApproval.get({ id: subscriptionId })

  return {
    id: result.id,
    status: result.status,
    payer_id: result.payer_id,
    payer_email: result.payer_email,
    reason: result.reason,
    next_payment_date: result.next_payment_date,
    auto_recurring: result.auto_recurring,
    external_reference: result.external_reference,
    date_created: result.date_created,
    last_modified: result.last_modified,
  }
}

export async function cancelSubscription(orgId: string, subscriptionId: string) {
  const client = await getMPClient(orgId)
  const preApproval = new PreApproval(client)

  const result = await preApproval.update({
    id: subscriptionId,
    body: { status: 'cancelled' },
  })

  return { id: result.id, status: result.status }
}

export async function pauseSubscription(orgId: string, subscriptionId: string) {
  const client = await getMPClient(orgId)
  const preApproval = new PreApproval(client)

  const result = await preApproval.update({
    id: subscriptionId,
    body: { status: 'paused' },
  })

  return { id: result.id, status: result.status }
}
