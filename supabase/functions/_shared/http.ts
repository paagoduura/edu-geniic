import { createClient, type User } from 'npm:@supabase/supabase-js@2';

const DEFAULT_ALLOWED_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
].join(', ');

function allowedOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.includes('*')) return '*';
  return origin && configured.includes(origin) ? origin : configured[0] ?? 'null';
}

export function corsHeaders(request: Request, extra: Record<string, string> = {}) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request),
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
    ...extra,
  };
}

export function optionsResponse(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(request: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request, { 'Content-Type': 'application/json; charset=utf-8', ...extra }),
  });
}

export function errorResponse(request: Request, status: number, code: string, message: string) {
  return jsonResponse(request, { error: { code, message } }, status);
}

export async function parseJsonBody<T>(request: Request, maxBytes = 256_000): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) throw new RequestError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RequestError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new RequestError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export class RequestError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export function requirePost(request: Request) {
  if (request.method !== 'POST') throw new RequestError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
}

export function requiredString(value: unknown, field: string, maxLength = 5000): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RequestError(400, 'INVALID_INPUT', `${field} is required.`);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new RequestError(400, 'INVALID_INPUT', `${field} exceeds the maximum length.`);
  }
  return result;
}

export function optionalString(value: unknown, field: string, maxLength = 5000): string | undefined {
  if (value == null || value === '') return undefined;
  return requiredString(value, field, maxLength);
}

export function bearerToken(request: Request): string {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    throw new RequestError(401, 'UNAUTHORIZED', 'A valid bearer token is required.');
  }
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) throw new RequestError(401, 'UNAUTHORIZED', 'A valid bearer token is required.');
  return token;
}

export async function requireUser(request: Request): Promise<User> {
  const token = bearerToken(request);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anonKey) throw new RequestError(500, 'CONFIGURATION_ERROR', 'Authentication service is not configured.');

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new RequestError(401, 'UNAUTHORIZED', 'The session is invalid or expired.');
  return data.user;
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function safeError(error: unknown): { status: number; code: string; message: string } {
  if (error instanceof RequestError) return { status: error.status, code: error.code, message: error.message };
  console.error('Unhandled function error:', error instanceof Error ? error.message : 'unknown error');
  return { status: 500, code: 'INTERNAL_ERROR', message: 'The service could not complete the request.' };
}
