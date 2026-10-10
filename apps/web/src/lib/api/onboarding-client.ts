import {
  confirmPlacementInputSchema,
  createPlacementAttemptInputSchema,
  onboardingStateSchema,
  placementAttemptSchema,
  selfPlacementInputSchema,
  type ConfirmPlacementInput,
  type CreatePlacementAttemptInput,
  type OnboardingStateDto,
  type PlacementAttemptDto,
  type SelfPlacementInput,
} from '@worklingo/contracts';
import { z } from 'zod';

import { ApiError } from './api-client';

const errorSchema = z.object({
  code: z.string().optional(),
  message: z.union([z.string(), z.array(z.string())]).optional(),
  statusCode: z.number().optional(),
});

class OnboardingClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1')
      .replace(/\/+$/u, '');
  }

  async getState(): Promise<OnboardingStateDto> {
    return this.request('/me/onboarding', { method: 'GET' }, onboardingStateSchema);
  }

  async confirmSelfPlacement(input: SelfPlacementInput): Promise<OnboardingStateDto> {
    return this.request(
      '/me/onboarding/self-placement',
      { method: 'POST', body: JSON.stringify(selfPlacementInputSchema.parse(input)) },
      onboardingStateSchema,
    );
  }

  async createPlacementAttempt(
    input: CreatePlacementAttemptInput,
  ): Promise<PlacementAttemptDto> {
    return this.request(
      '/me/onboarding/placement-attempts',
      { method: 'POST', body: JSON.stringify(createPlacementAttemptInputSchema.parse(input)) },
      placementAttemptSchema,
    );
  }

  async getPlacementAttempt(id: string): Promise<PlacementAttemptDto> {
    return this.request(
      `/me/onboarding/placement-attempts/${z.uuid().parse(id)}`,
      { method: 'GET' },
      placementAttemptSchema,
    );
  }

  async confirmPlacement(
    id: string,
    input: ConfirmPlacementInput,
  ): Promise<OnboardingStateDto> {
    return this.request(
      `/me/onboarding/placement-attempts/${z.uuid().parse(id)}/confirm`,
      { method: 'POST', body: JSON.stringify(confirmPlacementInputSchema.parse(input)) },
      onboardingStateSchema,
    );
  }

  private async request<T>(
    path: string,
    options: RequestInit,
    schema: z.ZodType<T>,
  ): Promise<T> {
    let response: Response;
    try {
      const requestOptions: RequestInit = {
        ...options,
        credentials: 'include',
      };
      if (options.body) requestOptions.headers = { 'content-type': 'application/json' };
      response = await fetch(`${this.baseUrl}${path}`, requestOptions);
    } catch (error) {
      throw new ApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      });
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as unknown;
      const parsed = errorSchema.safeParse(payload);
      const message = parsed.success && parsed.data.message
        ? Array.isArray(parsed.data.message)
          ? parsed.data.message.join('; ')
          : parsed.data.message
        : `Request failed with status ${response.status}`;
      throw new ApiError({
        code: parsed.success ? parsed.data.code ?? 'API_ERROR' : 'API_ERROR',
        message,
        status: response.status,
      });
    }
    return schema.parse(await response.json());
  }
}

export const onboardingClient = new OnboardingClient();
