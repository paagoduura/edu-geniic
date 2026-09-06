import { supabase } from '@/integrations/supabase/client';

const createIdempotencyKey = (prefix: string, input: string): string => {
  const digest = [...input].reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
  return `${prefix}_${Math.abs(digest).toString(36)}_${Date.now()}`;
};

// These tables are introduced by the readiness migration; regenerate Supabase
// Database types after applying migrations to remove the compatibility cast.
const platformClient = supabase as any;

export const enqueueNotification = async (input: {
  recipientId: string;
  schoolId?: string;
  eventType: string;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}) => {
  const idempotencyKey = input.idempotencyKey ?? createIdempotencyKey('notification', JSON.stringify(input));
  const { data, error } = await platformClient
    .from('platform_notification_deliveries')
    .insert({
      recipient_id: input.recipientId,
      school_id: input.schoolId,
      event_type: input.eventType,
      channel: input.channel,
      payload: input.payload,
      idempotency_key: idempotencyKey,
    })
    .select('id, status, idempotency_key')
    .single();

  if (error && error.code !== '23505') throw error;
  return data;
};

export const createPaymentIntent = async (input: {
  payerId: string;
  schoolId?: string;
  amount: number;
  currencyCode: string;
  purpose: string;
  idempotencyKey?: string;
}) => {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('Payment amount must be positive.');
  if (!/^[A-Z]{3}$/.test(input.currencyCode)) throw new Error('Currency code must be ISO 4217 format.');

  const idempotencyKey = input.idempotencyKey ?? createIdempotencyKey('payment', JSON.stringify(input));
  const { data, error } = await platformClient
    .from('platform_payment_transactions')
    .insert({
      payer_id: input.payerId,
      school_id: input.schoolId,
      amount: input.amount,
      currency_code: input.currencyCode,
      purpose: input.purpose,
      idempotency_key: idempotencyKey,
    })
    .select('id, status, provider, idempotency_key')
    .single();

  if (error && error.code === '23505') {
    const existing = await platformClient
      .from('platform_payment_transactions')
      .select('id, status, provider, idempotency_key')
      .eq('idempotency_key', idempotencyKey)
      .single();
    if (existing.error) throw existing.error;
    return existing.data;
  }
  if (error) throw error;
  return data;
};
