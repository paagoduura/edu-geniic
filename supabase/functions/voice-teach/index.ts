import { corsHeaders, errorResponse, optionsResponse, parseJsonBody, requirePost, requireUser, safeError, requiredString, optionalString, RequestError } from '../_shared/http.ts';

type RequestBody = { text?: unknown; language?: unknown; voice?: unknown };
const VOICES = { default: 'JBFqnCBsd6RMkjVDRZzb', female: 'EXAVITQu4vr4xnSDxMaL' } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);

  try {
    requirePost(req);
    await requireUser(req);
    const body = await parseJsonBody<RequestBody>(req, 24_000);
    const text = requiredString(body.text, 'text', 5000);
    const language = optionalString(body.language, 'language', 40) ?? 'English';
    const voice = body.voice === 'female' ? 'female' : 'default';
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) throw new RequestError(503, 'SERVICE_UNAVAILABLE', 'Voice service is not configured.');

    const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[voice]}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', language_code: language.length === 2 ? language : undefined, voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true, speed: 0.85 } }),
    }, 30_000);
    if (!response.ok) {
      console.error('ElevenLabs voice request failed:', response.status);
      throw new RequestError(response.status === 429 ? 429 : 502, response.status === 429 ? 'UPSTREAM_RATE_LIMIT' : 'UPSTREAM_ERROR', 'Voice generation is temporarily unavailable.');
    }
    const audio = await response.arrayBuffer();
    if (audio.byteLength > 8_000_000) throw new RequestError(502, 'UPSTREAM_ERROR', 'Generated audio exceeded the maximum size.');
    return new Response(audio, { headers: { ...corsHeaders(req), 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store' } });
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
