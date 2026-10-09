import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { ProviderError } from '../domain/provider-errors.js';
import { MicrosoftSpeechAdapter } from './microsoft-speech.adapter.js';

interface CapturedRequest {
  readonly body: Buffer;
  readonly headers: IncomingMessage['headers'];
  readonly url: string;
}

const servers: Array<ReturnType<typeof createServer>> = [];

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse, captured: CapturedRequest) => void,
): Promise<string> {
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => handler(request, response, {
      body: Buffer.concat(chunks),
      headers: request.headers,
      url: request.url ?? '',
    }));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

const input = {
  audio: Uint8Array.from([1, 2, 3, 4]),
  locale: 'en-US',
  mimeType: 'audio/webm;codecs=opus',
  referenceText: 'Hello, I am Lan from the support team.',
};

describe('MicrosoftSpeechAdapter', () => {
  it('sends pronunciation context and normalizes a detailed recognition result', async () => {
    let captured: CapturedRequest | undefined;
    const endpoint = await startServer((_request, response, requestCapture) => {
      captured = requestCapture;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({
        RecognitionStatus: 'Success',
        DisplayText: 'Hello, I am Lan from the support team.',
        NBest: [{
          Confidence: 0.93,
          PronunciationAssessment: {
            AccuracyScore: 91,
            CompletenessScore: 96,
            FluencyScore: 84,
            ProsodyScore: 79,
          },
          Words: [{
            Word: 'Hello', Offset: 10_000, Duration: 4_000,
            PronunciationAssessment: { AccuracyScore: 90 },
          }],
        }],
      }));
    });
    const adapter = new MicrosoftSpeechAdapter({
      endpoint,
      key: 'test-secret-key',
      region: 'test-region',
      timeoutMs: 1_000,
    });

    const result = await adapter.transcribe(input);

    expect(captured?.url).toContain('language=en-US');
    expect(captured?.headers['content-type']).toBe(input.mimeType);
    expect(captured?.headers['ocp-apim-subscription-key']).toBe('test-secret-key');
    const pronunciationHeader = captured?.headers['pronunciation-assessment'];
    expect(typeof pronunciationHeader).toBe('string');
    expect(JSON.parse(Buffer.from(pronunciationHeader as string, 'base64').toString('utf8'))).toMatchObject({
      Dimension: 'Comprehensive',
      ReferenceText: input.referenceText,
    });
    expect(captured?.body).toEqual(Buffer.from(input.audio));
    expect(result).toMatchObject({
      locale: 'en-US',
      pronunciation: { accuracy: 0.91, completeness: 0.96, fluency: 0.84, prosody: 0.79 },
      provider: { name: 'microsoft-speech' },
      providerConfidence: 0.93,
      transcript: input.referenceText,
      words: [{ accuracy: 0.9, durationMs: 0.4, offsetMs: 1, word: 'Hello' }],
    });
  });

  it.each([
    [401, 'PROVIDER_AUTH_FAILED', false],
    [429, 'PROVIDER_RATE_LIMITED', true],
    [500, 'PROVIDER_UPSTREAM', true],
    [415, 'INVALID_AUDIO', false],
  ] as const)('maps HTTP %s to %s without exposing credentials', async (status, code, retryable) => {
    const endpoint = await startServer((_request, response) => {
      response.statusCode = status;
      if (status === 429) response.setHeader('retry-after', '2');
      response.end('upstream diagnostic test-secret-key');
    });
    const adapter = new MicrosoftSpeechAdapter({
      endpoint, key: 'test-secret-key', region: 'test-region', timeoutMs: 1_000,
    });

    const error = await adapter.transcribe(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code, retryable });
    if (status === 429) expect(error).toMatchObject({ retryAfterMs: 2_000 });
    expect(String(error)).not.toContain('test-secret-key');
  });

  it('maps timeout to a retryable normalized error', async () => {
    const endpoint = await startServer(() => undefined);
    const adapter = new MicrosoftSpeechAdapter({
      endpoint, key: 'test-secret-key', region: 'test-region', timeoutMs: 20,
    });

    await expect(adapter.transcribe(input)).rejects.toMatchObject({
      code: 'PROVIDER_TIMEOUT', retryable: true,
    });
  });

  it.each([
    ['not-json', 'PROVIDER_RESPONSE_INVALID', true],
    [JSON.stringify({ RecognitionStatus: 'NoMatch' }), 'INVALID_AUDIO', false],
    [JSON.stringify({ RecognitionStatus: 'InitialSilenceTimeout' }), 'INVALID_AUDIO', false],
  ] as const)('normalizes invalid recognition response %#', async (body, code, retryable) => {
    const endpoint = await startServer((_request, response) => {
      response.setHeader('content-type', 'application/json');
      response.end(body);
    });
    const adapter = new MicrosoftSpeechAdapter({
      endpoint, key: 'test-secret-key', region: 'test-region', timeoutMs: 1_000,
    });

    await expect(adapter.transcribe(input)).rejects.toMatchObject({ code, retryable });
  });
});
