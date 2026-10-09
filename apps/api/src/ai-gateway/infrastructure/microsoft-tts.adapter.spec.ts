import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import { MicrosoftTextToSpeechAdapter } from './microsoft-tts.adapter.js';

const servers: Array<ReturnType<typeof createServer>> = [];

const wav = (): Buffer => {
  const buffer = Buffer.alloc(48);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(40, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(24_000, 24); buffer.writeUInt32LE(48_000, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(4, 40);
  return buffer;
};

async function endpoint(
  handler: (request: IncomingMessage, response: ServerResponse, body: string) => void,
): Promise<string> {
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => handler(request, response, Buffer.concat(chunks).toString('utf8')));
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => Promise.all(servers.splice(0).map((server) =>
  new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))));

describe('MicrosoftTextToSpeechAdapter', () => {
  it('sends escaped reviewed text and returns normalized WAV metadata', async () => {
    let capturedBody = '';
    let capturedHeaders: IncomingMessage['headers'] = {};
    const url = await endpoint((request, response, body) => {
      capturedBody = body;
      capturedHeaders = request.headers;
      response.setHeader('x-requestid', 'request-1');
      response.end(wav());
    });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'test-secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-JennyNeural',
    });

    const result = await adapter.synthesize({ script: 'Support <team> & customer' });

    expect(capturedBody).toContain('Support &lt;team&gt; &amp; customer');
    expect(capturedHeaders['ocp-apim-subscription-key']).toBe('test-secret');
    expect(capturedHeaders['x-microsoft-outputformat']).toBe('riff-24khz-16bit-mono-pcm');
    expect(result).toMatchObject({
      mimeType: 'audio/wav', sampleRate: 24_000,
      provider: { name: 'microsoft-tts', requestId: 'request-1', voice: 'en-US-JennyNeural' },
    });
  });

  it.each([
    [401, 'PROVIDER_AUTH_FAILED', false],
    [429, 'PROVIDER_RATE_LIMITED', true],
    [500, 'PROVIDER_UPSTREAM', true],
  ] as const)('maps HTTP %s without exposing credentials', async (status, code, retryable) => {
    const url = await endpoint((_request, response) => {
      response.statusCode = status; response.end('test-secret');
    });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'test-secret', region: 'test', timeoutMs: 1_000, voice: 'voice',
    });
    const error = await adapter.synthesize({ script: 'Hello' }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ code, retryable });
    expect(String(error)).not.toContain('test-secret');
  });

  it('rejects malformed audio', async () => {
    const url = await endpoint((_request, response) => response.end('not-wav'));
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'voice',
    });
    await expect(adapter.synthesize({ script: 'Hello' })).rejects.toMatchObject({
      code: 'PROVIDER_RESPONSE_INVALID', retryable: true,
    });
  });
});
