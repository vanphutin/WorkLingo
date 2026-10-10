import type { Response } from 'express';

import { parseSingleByteRange } from '../domain/audio-byte-range.js';

export interface AudioStreamContent {
  body: Buffer;
  mimeType: string;
}

export function sendAudioStream(
  response: Response,
  content: AudioStreamContent,
  rangeHeader?: string,
): void {
  const size = content.body.length;
  const range = parseSingleByteRange(rangeHeader, size);

  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', content.mimeType);
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (range.kind === 'unsatisfiable') {
    response.status(416);
    response.setHeader('Content-Range', `bytes */${size}`);
    response.setHeader('Content-Length', 0);
    response.end();
    return;
  }

  if (range.kind === 'partial') {
    const body = content.body.subarray(range.start, range.end + 1);
    response.status(206);
    response.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    response.setHeader('Content-Length', body.length);
    response.end(body);
    return;
  }

  response.status(200);
  response.setHeader('Content-Length', size);
  response.end(content.body);
}
