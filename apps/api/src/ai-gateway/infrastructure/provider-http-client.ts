import { ProviderError } from '../domain/provider-errors.js';

const DEFAULT_MAX_RESPONSE_BYTES = 1_048_576;

export interface ProviderHttpRequest {
  readonly body: ArrayBuffer | string;
  readonly headers: Readonly<Record<string, string>>;
  readonly maxResponseBytes?: number;
  readonly timeoutMs: number;
  readonly url: string;
}

const retryAfterMilliseconds = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
};

const statusError = (response: Response): ProviderError => {
  if (response.status === 401 || response.status === 403) {
    return new ProviderError('The provider rejected its configured credentials.', {
      code: 'PROVIDER_AUTH_FAILED', retryable: false,
    });
  }
  if (response.status === 429) {
    const retryAfterMs = retryAfterMilliseconds(response.headers.get('retry-after'));
    return new ProviderError('The provider rate limit was reached.', {
      code: 'PROVIDER_RATE_LIMITED',
      retryable: true,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    });
  }
  if (response.status === 415) {
    return new ProviderError('The provider does not support this audio format.', {
      code: 'INVALID_AUDIO', retryable: false,
    });
  }
  return new ProviderError('The provider request failed.', {
    code: 'PROVIDER_UPSTREAM',
    retryable: response.status >= 500,
  });
};

const readBoundedBody = async (response: Response, maxBytes: number): Promise<Buffer> => {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ProviderError('The provider response exceeded the allowed size.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
      });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
};

export async function requestProviderJson(request: ProviderHttpRequest): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal: controller.signal,
    });
    if (!response.ok) throw statusError(response);

    const maxBytes = request.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new ProviderError('The provider response exceeded the allowed size.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
      });
    }
    const bytes = await readBoundedBody(response, maxBytes);

    try {
      return JSON.parse(bytes.toString('utf8')) as unknown;
    } catch (cause) {
      throw new ProviderError('The provider returned malformed JSON.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true, cause,
      });
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (controller.signal.aborted) {
      throw new ProviderError('The provider request timed out.', {
        code: 'PROVIDER_TIMEOUT', retryable: true, cause: error,
      });
    }
    throw new ProviderError('The provider could not be reached.', {
      code: 'PROVIDER_UPSTREAM', retryable: true, cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export interface ProviderBytesResponse {
  readonly body: Buffer;
  readonly headers: Headers;
}

export async function requestProviderBytes(
  request: ProviderHttpRequest,
): Promise<ProviderBytesResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
  try {
    const response = await fetch(request.url, {
      method: 'POST', headers: request.headers, body: request.body, signal: controller.signal,
    });
    if (!response.ok) throw statusError(response);
    const maxBytes = request.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new ProviderError('The provider response exceeded the allowed size.', {
        code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
      });
    }
    return { body: await readBoundedBody(response, maxBytes), headers: response.headers };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (controller.signal.aborted) {
      throw new ProviderError('The provider request timed out.', {
        code: 'PROVIDER_TIMEOUT', retryable: true, cause: error,
      });
    }
    throw new ProviderError('The provider could not be reached.', {
      code: 'PROVIDER_UPSTREAM', retryable: true, cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}
