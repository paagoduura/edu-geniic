import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MERCHANT_CODE = Deno.env.get('INTERSWITCH_MERCHANT_CODE') ?? '';
const PAY_ITEM_ID = Deno.env.get('INTERSWITCH_PAY_ITEM_ID') ?? '';
const MAC_KEY = Deno.env.get('INTERSWITCH_MAC_KEY') ?? '';
const MODE = (Deno.env.get('INTERSWITCH_MODE') ?? 'LIVE').toUpperCase();

async function sha512Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const SANDBOX_REQUERY = 'https://sandbox.interswitchng.com/collections/api/v1/gettransaction.json';
const LIVE_REQUERY = 'https://webpay.interswitchng.com/collections/api/v1/gettransaction.json';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const anonClient = (authHeader: string) =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await anonClient(authHeader).auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') ?? 'init';

    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'init') {
      const { plan, amount, currency = '566', site_redirect_url = '' } = await req.json();
      if (!plan || typeof amount !== 'number' || amount <= 0) {
        return new Response(JSON.stringify({ error: 'Invalid plan or amount' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const txn_ref = `EDU_${userId.slice(0, 8)}_${Date.now()}`;

      const { error } = await supabase.from('payments').insert({
        user_id: userId, txn_ref, plan, amount, currency, status: 'pending',
      });
      if (error) throw error;

      // Quickteller newwebpay hash: SHA-512(merchant_code + pay_item_id + txn_ref + amount + site_redirect_url + MAC_KEY)
      const hash = MAC_KEY
        ? await sha512Hex(`${MERCHANT_CODE}${PAY_ITEM_ID}${txn_ref}${amount}${site_redirect_url}${MAC_KEY}`)
        : '';

      return new Response(JSON.stringify({
        txn_ref,
        merchant_code: MERCHANT_CODE,
        pay_item_id: PAY_ITEM_ID,
        mode: MODE,
        amount, currency,
        hash,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'verify') {
      const { txn_ref } = await req.json();
      if (!txn_ref) {
        return new Response(JSON.stringify({ error: 'txn_ref required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: payment, error: fetchErr } = await supabase
        .from('payments').select('*').eq('txn_ref', txn_ref).eq('user_id', userId).maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!payment) {
        return new Response(JSON.stringify({ error: 'Payment not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const baseUrl = MODE === 'LIVE' ? LIVE_REQUERY : SANDBOX_REQUERY;
      const requeryUrl = `${baseUrl}?merchantcode=${encodeURIComponent(MERCHANT_CODE)}&transactionreference=${encodeURIComponent(txn_ref)}&amount=${payment.amount}`;

      const requeryRes = await fetch(requeryUrl, { headers: { 'Content-Type': 'application/json' } });
      const result = await requeryRes.json();

      const code = String(result.ResponseCode ?? '');
      const amountMatches = Number(result.Amount) === Number(payment.amount);
      const isSuccess = code === '00' && amountMatches;

      await supabase.from('payments').update({
        status: isSuccess ? 'success' : 'failed',
        response_code: code,
        response_description: result.ResponseDescription ?? null,
        payment_reference: result.PaymentReference ?? null,
        card_number: result.CardNumber ?? null,
        raw_response: result,
      }).eq('txn_ref', txn_ref);

      return new Response(JSON.stringify({
        success: isSuccess, code, description: result.ResponseDescription, amount: result.Amount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('interswitch-payment error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
