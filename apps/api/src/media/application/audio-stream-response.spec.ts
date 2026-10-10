import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { sendAudioStream } from './audio-stream-response.js';

function createResponse() {
  const headers = new Map<string, number | string>();
  const response = {
    end: vi.fn(),
    setHeader: vi.fn((name: string, value: number | string) => {
      headers.set(name, value);
    }),
    status: vi.fn(),
  };
  response.status.mockReturnValue(response);

  return { headers, response: response as unknown as Response };
}

describe('sendAudioStream', () => {
  const body = Buffer.from('0123456789');

  it('sends a private complete response', () => {
    const { headers, response } = createResponse();

    sendAudioStream(response, { body, mimeType: 'audio/mpeg' });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(headers).toEqual(new Map<string, number | string>([
      ['Accept-Ranges', 'bytes'],
      ['Cache-Control', 'private, no-store'],
      ['Content-Type', 'audio/mpeg'],
      ['X-Content-Type-Options', 'nosniff'],
      ['Content-Length', 10],
    ]));
    expect(response.end).toHaveBeenCalledWith(body);
  });

  it('sends only the requested bytes with 206 headers', () => {
    const { headers, response } = createResponse();

    sendAudioStream(response, { body, mimeType: 'audio/mpeg' }, 'bytes=2-5');

    expect(response.status).toHaveBeenCalledWith(206);
    expect(headers.get('Content-Range')).toBe('bytes 2-5/10');
    expect(headers.get('Content-Length')).toBe(4);
    expect(response.end).toHaveBeenCalledWith(Buffer.from('2345'));
  });

  it('sends a bodyless 416 response for an invalid range', () => {
    const { headers, response } = createResponse();

    sendAudioStream(response, { body, mimeType: 'audio/mpeg' }, 'bytes=99-');

    expect(response.status).toHaveBeenCalledWith(416);
    expect(headers.get('Content-Range')).toBe('bytes */10');
    expect(headers.get('Content-Length')).toBe(0);
    expect(response.end).toHaveBeenCalledWith();
  });
});
