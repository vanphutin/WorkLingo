import {
  adminAudioSettingsSchema,
  audioSettingsSchema,
  type AdminAudioSettings,
  type AudioSettings,
  type UpdateAdminAudioSettingsInput,
  type UpdateAudioSettingsInput,
} from '@worklingo/contracts';
import type { z } from 'zod';

import { ApiError } from './api-client';

export class AudioSettingsClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1')
      .replace(/\/+$/u, '');
  }

  getLearnerSettings(): Promise<AudioSettings> {
    return this.request('/me/audio-settings', { method: 'GET' }, audioSettingsSchema);
  }

  updateLearnerSettings(input: UpdateAudioSettingsInput): Promise<AudioSettings> {
    return this.request('/me/audio-settings', {
      body: JSON.stringify(input),
      method: 'PATCH',
    }, audioSettingsSchema);
  }

  getAdminSettings(): Promise<AdminAudioSettings> {
    return this.request('/admin/audio-settings', { method: 'GET' }, adminAudioSettingsSchema);
  }

  updateAdminSettings(input: UpdateAdminAudioSettingsInput): Promise<AdminAudioSettings> {
    return this.request('/admin/audio-settings', {
      body: JSON.stringify(input),
      method: 'PATCH',
    }, adminAudioSettingsSchema);
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        credentials: 'include',
        ...(options.body ? { headers: { 'content-type': 'application/json' } } : {}),
      });
    } catch {
      throw new ApiError({
        code: 'NETWORK_ERROR', message: 'Unable to reach the audio settings service.', status: 0,
      });
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null) as {
        code?: string; message?: string | string[];
      } | null;
      throw new ApiError({
        code: body?.code ?? 'AUDIO_SETTINGS_ERROR',
        message: Array.isArray(body?.message)
          ? body.message.join('; ')
          : body?.message ?? 'Unable to update audio settings.',
        status: response.status,
      });
    }
    return schema.parse(await response.json());
  }
}

export const audioSettingsClient = new AudioSettingsClient();
