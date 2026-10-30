import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from './bcd-cost-options.js';
test('fixed point cost preserves sub-micro charges and rejects malformed rates', () => {
  assert.equal(typeof api.exactCost, 'function');
  assert.equal(api.exactCost(1, 1, '0.1', '0.4'), '0.0000005');
  assert.equal(api.exactCost(62144, 40960, '800', '2700'), '160.3072');
  assert.throws(() => api.exactCost(1, 0, '1e3', '0'));
  assert.throws(() => api.exactCost(-1, 0, '1', '0'));
});
test('zero dollar budget rejects even tiny paid charges and unverified free entitlement', () => {
  assert.equal(typeof api.optionEligibility, 'function');
  const good = { local: true, syntheticOnly: true, quotaVerified: true, privacyVerified: true, tokenizerMatched: true, cost: '0', currency: 'USD' as const };
  assert.deepEqual(api.optionEligibility(good), []);
  assert.ok(api.optionEligibility({ ...good, cost: '0.0000001' }).includes('BUDGET_EXCEEDED'));
  for (const field of ['syntheticOnly', 'quotaVerified', 'privacyVerified', 'tokenizerMatched'] as const) assert.ok(api.optionEligibility({ ...good, [field]: false }).length);
  assert.ok(api.optionEligibility({ ...good, local: false }).includes('REMOTE_INFERENCE_DENIED'));
  assert.deepEqual(api.optionEligibility({ ...good, currency: 'INKPOINTS', cost: '1.5' }), []);
  assert.ok(api.optionEligibility({ ...good, currency: 'INKPOINTS', cost: '1.5000001' }).includes('BUDGET_EXCEEDED'));
});
