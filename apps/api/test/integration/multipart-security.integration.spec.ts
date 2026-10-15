import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SafeExceptionFilter } from '../../src/common/http/safe-exception.filter.js';
import { SafeLoggerService } from '../../src/common/logging/safe-logger.service.js';
import { OrientationAdminService } from '../../src/ielts-orientation/application/orientation-admin.service.js';
import { OrientationMediaService } from '../../src/ielts-orientation/application/orientation-media.service.js';
import { OrientationAdminController } from '../../src/ielts-orientation/orientation-admin.controller.js';
import { RecordingsService } from '../../src/media/application/recordings.service.js';
import { RecordingsController } from '../../src/media/recordings.controller.js';

const id = '11111111-1111-4111-8111-111111111111';
const audio = Buffer.from('multipart-security-audio');
const endpoints = [
  { name: 'recording', path: `/activities/${id}/recordings`, file: 'audio', status: 202,
    fields: { sessionId: id, clientAttemptId: id, consentAccepted: 'true',
      consentPolicyVersion: 'recording-v1', consentScope: 'teacher-ai' } },
  { name: 'orientation', path: '/admin/ielts-orientation/media', file: 'file', status: 201,
    fields: { kind: 'AUDIO' } },
] as const;

describe('upload controller multipart security boundary', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Keep the production controllers, interceptors and multipart parser real.
    // Replace persistence/AI services: this tests rejection BEFORE DTO validation
    // or business logic, without database or worker activity masking parser bugs.
    const module = await Test.createTestingModule({
      controllers: [RecordingsController, OrientationAdminController],
      providers: [
        SafeExceptionFilter,
        SafeLoggerService,
        { provide: RecordingsService, useValue: {
          submit: (input: unknown, upload: { body: Buffer; mimeType: string }) => ({
            input, bytes: upload.body.toString('base64'), mimeType: upload.mimeType,
          }),
        } },
        { provide: OrientationAdminService, useValue: {} },
        { provide: OrientationMediaService, useValue: {
          upload: (_user: string, kind: string, upload: { body: Buffer; mimeType: string }) => ({
            kind, bytes: upload.body.toString('base64'), mimeType: upload.mimeType,
          }),
        } },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalFilters(app.get(SafeExceptionFilter));
    app.use((req: Request & { authUser?: { id: string } }, _res: Response, next: NextFunction) => {
      req.authUser = { id };
      next();
    });
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  for (const endpoint of endpoints) {
    for (const index of [1, 1024]) {
      it(`rejects crafted array index ${index} before expanding ${endpoint.name} multipart fields`, async () => {
        const upload = request(app.getHttpServer()).post(endpoint.path);
        for (const [key, value] of Object.entries(endpoint.fields)) upload.field(key, value);
        // Bounded reproduction of GHSA-535w-7cp7-47q4: the numeric field creates
        // a sparse array, then the named key forces conversion to an object.
        // Do not use the maximum index: the unpatched RED run must remain safe.
        const response = await upload.field(`extra[${index}]`, 'value').field('extra[key]', 'value')
          .attach(endpoint.file, audio, { filename: 'sample.wav', contentType: 'audio/wav' })
          .timeout({ response: 2000, deadline: 4000 });

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ code: 'BAD_REQUEST', statusCode: 400 });
        expect(JSON.stringify(response.body)).not.toContain('extra');
        expect(response.body).not.toHaveProperty('stack');
        expect(response.body).not.toHaveProperty('field');
      });
    }

    it(`preserves scalar fields and file bytes in a legitimate ${endpoint.name} upload after rejection`, async () => {
      const upload = request(app.getHttpServer()).post(endpoint.path);
      for (const [key, value] of Object.entries(endpoint.fields)) upload.field(key, value);
      const response = await upload
        .attach(endpoint.file, audio, { filename: 'sample.wav', contentType: 'audio/wav' })
        .expect(endpoint.status);

      expect(response.body).toMatchObject({ bytes: 'bXVsdGlwYXJ0LXNlY3VyaXR5LWF1ZGlv', mimeType: 'audio/wav' });
      if (endpoint.name === 'recording') {
        expect(response.body.input).toMatchObject({ sessionId: id, clientAttemptId: id,
          consentPolicyVersion: 'recording-v1', consentScope: 'teacher-ai' });
      } else {
        expect(response.body.kind).toBe('AUDIO');
      }
    });
  }
});
