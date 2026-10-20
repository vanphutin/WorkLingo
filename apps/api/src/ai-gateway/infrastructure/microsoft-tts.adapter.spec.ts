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
  it('synthesizes ordered dialogue once with distinct gendered voices and audits actual assignments', async () => {
    const bodies: string[] = [];
    const url = await endpoint((_request, response, body) => {
      bodies.push(body);
      response.end(wav());
    });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'test-secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-SaraNeural',
    });

    const result = await adapter.synthesize({ script: [
      'An (nam): Hello, Lan & <team>.',
      'Binh (male): Tell An "yes".',
      'Lan (nữ): It\'s ready.',
      'An: Thank you, Lan.',
    ].join('\n') });

    expect(bodies).toEqual([
      '<speak version="1.0" xml:lang="en-US">'
      + '<voice name="en-US-GuyNeural">Hello, Lan &amp; &lt;team&gt;.</voice>'
      + '<voice name="en-US-DavisNeural">Tell An &quot;yes&quot;.</voice>'
      + '<voice name="en-US-SaraNeural">It&apos;s ready.</voice>'
      + '<voice name="en-US-GuyNeural">Thank you, Lan.</voice></speak>',
    ]);
    expect(result.provider).toMatchObject({
      speakerVoices: [
        { speaker: 'an', name: 'An', gender: 'male', voice: 'en-US-GuyNeural', voiceGender: 'male' },
        { speaker: 'binh', name: 'Binh', gender: 'male', voice: 'en-US-DavisNeural', voiceGender: 'male' },
        { speaker: 'lan', name: 'Lan', gender: 'female', voice: 'en-US-SaraNeural', voiceGender: 'female' },
      ],
    });
  });

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

    expect(adapter.providerName).toBe('azure-speech');
    expect(capturedBody).toContain('Support &lt;team&gt; &amp; customer');
    expect(capturedHeaders['ocp-apim-subscription-key']).toBe('test-secret');
    expect(capturedHeaders['x-microsoft-outputformat']).toBe('riff-24khz-16bit-mono-pcm');
    expect(result).toMatchObject({
      mimeType: 'audio/wav', sampleRate: 24_000,
      provider: { name: 'azure-speech', requestId: 'request-1', voice: 'en-US-JennyNeural' },
    });
  });

  it('preserves ordinary colon narration and escapes the requested narration voice', async () => {
    let body = '';
    const url = await endpoint((_request, response, ssml) => { body = ssml; response.end(wav()); });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-JennyNeural',
    });

    const result = await adapter.synthesize({
      script: 'Reminder: Use <voice> & say "hello".',
      voiceConfig: { voice: 'configured"/><audio src="bad' },
    });

    expect(body).toBe('<speak version="1.0" xml:lang="en-US">'
      + '<voice name="configured&quot;/&gt;&lt;audio src=&quot;bad">'
      + 'Reminder: Use &lt;voice&gt; &amp; say &quot;hello&quot;.</voice></speak>');
    expect(result.provider).toMatchObject({ speakerVoices: [] });
  });

  it('keeps legacy genders unknown and stable while reserving a declared speaker voice first', async () => {
    const bodies: string[] = [];
    const url = await endpoint((_request, response, body) => { bodies.push(body); response.end(wav()); });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-JennyNeural',
    });

    const result = await adapter.synthesize({ script: 'Lan: Hello.\nAn (female): Hi.\nLan: See you.' });

    expect(bodies).toEqual(['<speak version="1.0" xml:lang="en-US">'
      + '<voice name="en-US-GuyNeural">Hello.</voice>'
      + '<voice name="en-US-JennyNeural">Hi.</voice>'
      + '<voice name="en-US-GuyNeural">See you.</voice></speak>']);
    expect(result.provider).toMatchObject({ speakerVoices: [
      { speaker: 'lan', name: 'Lan', gender: null, voice: 'en-US-GuyNeural', voiceGender: 'male' },
      { speaker: 'an', name: 'An', gender: 'female', voice: 'en-US-JennyNeural', voiceGender: 'female' },
    ] });
  });

  it('reads a two-speaker unannotated legacy dialogue without inventing author genders', async () => {
    let body = '';
    const url = await endpoint((_request, response, ssml) => { body = ssml; response.end(wav()); });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-JennyNeural',
    });
    const result = await adapter.synthesize({ script: 'An: Hi, Lan.\nLan: Hi, An.\nAn: Bye.' });

    expect(body).toBe('<speak version="1.0" xml:lang="en-US">'
      + '<voice name="en-US-JennyNeural">Hi, Lan.</voice>'
      + '<voice name="en-US-GuyNeural">Hi, An.</voice>'
      + '<voice name="en-US-JennyNeural">Bye.</voice></speak>');
    expect(result.provider).toMatchObject({ speakerVoices: [
      { speaker: 'an', gender: null, voiceGender: 'female' },
      { speaker: 'lan', gender: null, voiceGender: 'male' },
    ] });
  });

  it('uses the entire documented pool without changing narration or dropping continuation text', async () => {
    let body = '';
    const url = await endpoint((_request, response, ssml) => { body = ssml; response.end(wav()); });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'en-GB-RyanNeural',
    });

    await adapter.synthesize({ script: [
      'At the office & reception.',
      'An (male): First.',
      'Still first.',
      'Binh (male): Second.',
      'Cuong (male): Third.',
      'Lan (female): Fourth.',
      'Mai (female): Fifth.',
      'Nga (female): Sixth.',
    ].join('\n') });

    expect(body).toBe('<speak version="1.0" xml:lang="en-US">'
      + '<voice name="en-GB-RyanNeural">At the office &amp; reception.</voice>'
      + '<voice name="en-US-GuyNeural">First.\nStill first.</voice>'
      + '<voice name="en-US-DavisNeural">Second.</voice>'
      + '<voice name="en-US-TonyNeural">Third.</voice>'
      + '<voice name="en-US-JennyNeural">Fourth.</voice>'
      + '<voice name="en-US-AriaNeural">Fifth.</voice>'
      + '<voice name="en-US-SaraNeural">Sixth.</voice></speak>');
  });

  it.each([
    'An: Hi.\nBinh: Hello.\nLan: Good morning.',
    'An (male): Hi.\nAn (female): Hello.',
    'An (robot): Hi.\nLan: Hello.',
    'An (robot): Hi.',
    'An (): Hi.\nLan: Hello.',
    'An (nam: Hi.\nLan: Hello.',
    'An (nam: Hi.',
    'An (male): Hi.\nBinh (male): Hello.\nLan: Morning.',
    'An (male): Hi.\nBinh (male): Hi.\nCuong (male): Hi.\nDung (male): Hi.',
    'An (female): Hi.\nBinh (female): Hi.\nCuong (female): Hi.\nDung (female): Hi.',
  ])('rejects invalid or unallocatable dialogue before any HTTP request: %s', async (script) => {
    let requests = 0;
    const url = await endpoint((_request, response) => { requests += 1; response.end(wav()); });
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url, key: 'secret', region: 'test', timeoutMs: 1_000, voice: 'en-US-JennyNeural',
    });

    await expect(adapter.synthesize({ script })).rejects.toThrow(/dialogue|distinct Azure/iu);
    expect(requests).toBe(0);
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

  it('maps a timed out request without exposing its key or endpoint', async () => {
    const url = await endpoint(() => undefined);
    const adapter = new MicrosoftTextToSpeechAdapter({
      endpoint: url,
      key: 'timeout-secret',
      region: 'test',
      timeoutMs: 20,
      voice: 'voice',
    });

    const error = await adapter.synthesize({ script: 'Hello' }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'PROVIDER_TIMEOUT', retryable: true });
    expect(String(error)).not.toContain('timeout-secret');
    expect(String(error)).not.toContain(url);
  });
});
