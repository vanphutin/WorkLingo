import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { parseAppConfig } from '../common/config/app-config.schema.js';
import { LanguageEvaluationPort } from './domain/language-evaluation.port.js';
import { OpenAiLanguageEvaluationAdapter } from './infrastructure/openai-language-evaluation.adapter.js';
import { AiGatewayModule } from './ai-gateway.module.js';

describe('gateway rollback', () => {
  it('bypasses persisted routing preferences when routing is explicitly disabled', () => {
    const ai = parseAppConfig({ DATABASE_URL: 'postgresql://example.test/db', WORKLINGO_DATA_DIR: './data', SESSION_SECRET: 'synthetic-secret-at-least-32-characters', WORKLINGO_LANGUAGE_EVALUATION_PROVIDER: 'openai-compatible', OPENAI_API_KEY: 'synthetic-only', OPENAI_BASE_URL: 'https://openai.example.test/v1', OPENAI_MODEL: 'gpt-test', DISCOVERY_API_KEY: 'synthetic-only', AI_ROUTING_ENABLED: 'false' }).ai;
    const providers = Reflect.getMetadata('providers', AiGatewayModule) as { provide?: unknown; useFactory?: (...args: unknown[]) => unknown }[];
    const factory = providers.find(provider => provider.provide === LanguageEvaluationPort)!.useFactory!;
    const adapter = factory({ get: () => ai }, { resolve: async () => ({ preferredProvider: 'discovery', fallbackEnabled: true }) });
    expect(adapter).toBeInstanceOf(OpenAiLanguageEvaluationAdapter);
  });
});
