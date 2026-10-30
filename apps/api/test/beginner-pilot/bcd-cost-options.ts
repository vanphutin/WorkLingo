/** Offline cost research: no transport, account, credential or environment access. */
const SCALE = 1_000_000n;
function micros(value: string): bigint {
  if (!/^(0|[1-9]\d*)(?:\.\d{1,6})?$/.test(value)) throw new Error('INVALID_DECIMAL');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * SCALE + BigInt(fraction.padEnd(6, '0'));
}
function render(value: bigint, digits: number): string {
  const scale = 10n ** BigInt(digits);
  const fraction = (value % scale).toString().padStart(digits, '0').replace(/0+$/, '');
  return `${value / scale}${fraction ? '.' + fraction : ''}`;
}
export function exactCost(input: number, output: number, inputRate: string, outputRate: string): string {
  if (![input, output].every(v => Number.isSafeInteger(v) && v >= 0)) throw new Error('INVALID_USAGE');
  return render(BigInt(input) * micros(inputRate) + BigInt(output) * micros(outputRate), 12);
}
export interface OptionEvidence {
  local: boolean; syntheticOnly: boolean; quotaVerified: boolean; privacyVerified: boolean;
  tokenizerMatched: boolean; cost: string; currency: 'USD' | 'INKPOINTS';
}
export function optionEligibility(e: OptionEvidence): string[] {
  const errors: string[] = [];
  if (!e.local) errors.push('REMOTE_INFERENCE_DENIED');
  for (const field of ['syntheticOnly', 'quotaVerified', 'privacyVerified', 'tokenizerMatched'] as const) if (e[field] !== true) errors.push(field.toUpperCase() + '_REQUIRED');
  if (!/^(0|[1-9]\d*)(?:\.\d{1,12})?$/.test(e.cost)) throw new Error('INVALID_COST');
  const [whole, fraction = ''] = e.cost.split('.');
  const pico = BigInt(whole!) * 10n ** 12n + BigInt(fraction.padEnd(12, '0'));
  if (!['USD', 'INKPOINTS'].includes(e.currency)) throw new Error('INVALID_CURRENCY');
  if (pico > (e.currency === 'USD' ? 0n : 1_500_000_000_000n)) errors.push('BUDGET_EXCEEDED');
  return errors;
}

export const providerOptions = {
  schemaVersion: 'beginner-r12b-provider-options/1', mandate: 'MND-20261030-005', observedDate: '2026-10-30',
  budget: { additionalUSD: '0', inkPoints: '1.5', noPaidFallback: true, remoteInferenceAuthorized: false },
  original: { provider: 'Discovery', model: 'qwen3.8-27b', status: 'BLOCKED', originalQualificationUnchanged: true,
    pricingConflict: '800/2700 per million versus formula divisor1000 unresolved', tokenizer: 'NOT_MEASURED',
    outputOnlyFullReservationInkPoints: exactCost(0, 327680, '800', '2700'),
    pilotHistoricalReservationInkPoints: exactCost(62144, 40960, '800', '2700'),
    reservationLimitation: 'UTF8 body bytes+512 are assumed units, not authenticated model tokens' },
  local: { provider: 'local-llama.cpp', model: 'Qwen3-0.6B-Q8_0', status: 'ELIGIBLE_SEPARATE_SYNTHETIC_EXPERIMENT', serviceChargeUSD: '0', inkPoints: '0',
    prerequisitesInitially: 'No installed runtime/generative weights found in bounded standard-path scan',
    hardware: { cpu: 'Intel i5-10300H 4cores/8threads', ramBytes: 25598894080, gpu: 'GTX1650Ti4GB; CPU-only selected' },
    privacy: 'Loopback-only offline process; no external inference; raw synthetic evidence retained locally; electricity unmeasured' },
  alternatives: [
    { provider: 'Groq', models: ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'], freePublished: { rpm: 30, rpd: 1000, tpm: 8000, tpd: 200000 },
      accountQuota: 'UNKNOWN_NOT_INSPECTED', status: 'BLOCKED_REMOTE_NOT_AUTHORIZED_AND_ENTITLEMENT_UNKNOWN',
      privacy: 'Usage metadata retained; inference content not retained by default; reliability/abuse exception up to30days with opt-out; batch30days',
      paid20bUSDPerMillion: { input: '0.075', output: '0.30', eligible: false },
      sources: ['https://console.groq.com/docs/rate-limits', 'https://console.groq.com/docs/models', 'https://console.groq.com/docs/your-data'] },
    { provider: 'Google Gemini', model: 'gemini-2.5-flash-lite', freePublished: 'Free input/output; exact quota per project', accountQuota: 'UNKNOWN_NOT_INSPECTED',
      paidUSDPerMillion: { input: '0.10', output: '0.40', eligible: false }, privacy: 'Free-tier content used to improve products',
      tokenizer: 'count_tokens exists; not called because it would transmit data', status: 'BLOCKED_REMOTE_NOT_AUTHORIZED_AND_ENTITLEMENT_UNKNOWN',
      sources: ['https://ai.google.dev/gemini-api/docs/pricing', 'https://ai.google.dev/gemini-api/docs/rate-limits', 'https://ai.google.dev/gemini-api/docs/tokens'] },
    { provider: 'OpenRouter', model: 'UNSELECTED_FIXED_FREE_PROVIDER_REQUIRED', accountQuota: 'UNKNOWN_NOT_INSPECTED', freePublished: 'Free variants; extracted current limits table omitted numeric cells; no historic quota assumed',
      privacy: 'Router and exact upstream policies must both qualify; training opt-out does not establish retention', status: 'BLOCKED_IDENTITY_QUOTA_PRIVACY_AND_REMOTE_SCOPE',
      sources: ['https://openrouter.ai/docs/api-reference/limits', 'https://openrouter.ai/docs/guides/privacy/provider-logging'] },
  ],
  compression: { existing: 'Discovery compaction already drops metadata while retaining prompt, rubric, role cards, response and rubric identity',
    currentExperiment: 'Preserve existing semantic request and schema; model/provider/nonthinking/sampling settings receive separate identity',
    outputCap: 2048, staged: '20pilot retains exact schedule; no remainder after failed/inconclusive pilot; no weakened acceptance or reduced final case/repeat count' },
  liveRemoteStarts: 0, actualRemoteSpendUSD: '0', credentialsRead: false, discoveryPass: false,
} as const;
