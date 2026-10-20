import { z } from 'zod';
import { ApiError } from './api-client';

export async function ieltsRequest<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/+$/u, '');
  let response: Response;
  try {
    const headers = new Headers(options.headers);
    if (typeof options.body === 'string') headers.set('content-type', 'application/json');
    response = await fetch(`${base}${path}`, { ...options, credentials: 'include', headers });
  } catch {
    throw new ApiError({ code: 'NETWORK_ERROR', message: 'Network request failed', status: 0 });
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const fields = z.object({ code: z.string().optional(), message: z.union([z.string(), z.array(z.string())]).optional(), details: z.array(z.unknown()).optional() });
    const parsed = fields.extend({ error: fields.optional() }).safeParse(body);
    const error = parsed.success ? parsed.data.error ?? parsed.data : null;
    throw new ApiError({ code: error?.code ?? 'API_ERROR', message: Array.isArray(error?.message) ? error.message.join('; ') : error?.message ?? `Request failed (${response.status})`, status: response.status, details: error?.details ?? [] });
  }
  return schema.parse(await response.json());
}
