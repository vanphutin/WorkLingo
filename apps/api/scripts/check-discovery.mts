import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseAppConfig } from '../src/common/config/app-config.schema.js';
import { DiscoveryLanguageEvaluationAdapter } from '../src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.js';
import { ProviderError } from '../src/ai-gateway/domain/provider-errors.js';

if (!process.argv.includes('--live')) throw new Error('Pass --live to make one synthetic external Discovery request.');
const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const config = parseAppConfig(process.env);
const discovery = config.ai.routing.discovery;
if (!discovery.apiKey) throw new Error('DISCOVERY_API_KEY is not configured.');
const started = Date.now();
try {
  const result = await new DiscoveryLanguageEvaluationAdapter({ ...discovery, apiKey: discovery.apiKey, timeoutMs: config.ai.providerTimeoutMs, maxOutputTokens: config.ai.routing.maxOutputTokens }).evaluate({
    activityType: 'writing', learnerResponse: 'Hello Linh. I will follow up with the customer before Friday. Please confirm the meeting time. Thank you.',
    levelCode: 'FOUNDATION_1', prompt: 'Write a short workplace follow-up and ask to confirm the meeting time.',
    requiredPhrases: ['follow up', 'confirm'], rubricId: 'foundation-writing', rubricVersion: '1',
  });
  console.log(JSON.stringify({ provider: 'discovery', model: discovery.model, schemaValid: true, elapsedMs: Date.now() - started, scoreDimensions: Object.keys(result.scores), feedbackPresent: Boolean(result.feedback.summary), syntheticOnly: true }));
} catch (error) {
  const code = error instanceof ProviderError ? error.code : (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^PROVIDER_[A-Z_]+$/u.test(error.code) ? error.code : 'CHECK_FAILED');
  console.error(JSON.stringify({ provider: 'discovery', model: discovery.model, schemaValid: false, code, elapsedMs: Date.now() - started, syntheticOnly: true }));
  process.exitCode = 1;
}
