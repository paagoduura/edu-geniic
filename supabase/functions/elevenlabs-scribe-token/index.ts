import { errorResponse, jsonResponse, optionsResponse, requirePost, requireUser, safeError, RequestError } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);

  try {
    requirePost(req);
    await requireUser(req);
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) throw new RequestError(503, 'SERVICE_UNAVAILABLE', 'Speech recognition is not configured.');

    const response = await fetchWithTimeout('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
    }, 15_000);
    if (!response.ok) {
      console.error('ElevenLabs scribe request failed:', response.status);
      throw new RequestError(response.status === 429 ? 429 : 502, response.status === 429 ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_ERROR', 'Speech recognition is temporarily unavailable.');
    }
    const data = await response.json();
    if (typeof data?.token !== 'string' || !data.token) throw new RequestError(502, 'UPSTREAM_ERROR', 'Speech recognition returned an invalid token.');
    return jsonResponse(req, { token: data.token }, 200, { 'Cache-Control': 'no-store' });
  } catch (error) {
    const safe = safeError(error);
    return errorResponse(req, safe.status, safe.code, safe.message);
  }
});

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
