import 'reflect-metadata';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import type { RecordingsService } from './application/recordings.service.js';
import { RecordingControlsController } from './recordings.controller.js';
import { RATE_LIMIT_METADATA_KEY } from '../common/rate-limit/rate-limit.decorator.js';

describe('RecordingControlsController audio',()=>{
 it('streams owner audio with private range response',async()=>{
  const body=Buffer.from('0123456789');const getOwnedAudio=vi.fn().mockResolvedValue({body,byteSize:10,mimeType:'audio/webm'});
  const controller=new RecordingControlsController({getOwnedAudio} as unknown as RecordingsService);
  const headers=new Map();const response={setHeader:vi.fn((key,value)=>headers.set(key,value)),status:vi.fn(),end:vi.fn()};
  await controller.audio({authUser:{id:'owner'},headers:{range:'bytes=2-5'}} as AuthenticatedRequest,'recording',response as unknown as Response);
  expect(getOwnedAudio).toHaveBeenCalledWith('owner','recording');expect(response.status).toHaveBeenCalledWith(206);
  expect(headers.get('Cache-Control')).toBe('private, no-store');expect(headers.get('Content-Range')).toBe('bytes 2-5/10');
  expect(response.end).toHaveBeenCalledWith(Buffer.from('2345'));
 });
 it('propagates unavailable audio without sending bytes',async()=>{
  const controller=new RecordingControlsController({getOwnedAudio:vi.fn().mockRejectedValue(new Error('unavailable'))} as unknown as RecordingsService);
  const response={end:vi.fn()};await expect(controller.audio({authUser:{id:'owner'},headers:{}} as AuthenticatedRequest,'recording',response as unknown as Response)).rejects.toThrow('unavailable');
  expect(response.end).not.toHaveBeenCalled();
 });
 it('limits owner playback requests',()=>expect(Reflect.getMetadata(RATE_LIMIT_METADATA_KEY,RecordingControlsController.prototype.audio)).toMatchObject({keyType:'USER_AND_OPERATION',scope:'recordings:audio',limit:60,windowSeconds:60}));
});
