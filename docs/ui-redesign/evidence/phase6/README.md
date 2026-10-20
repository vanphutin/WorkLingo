# Phase6 route and performance evidence

Current summary source 69654e4dd6fd3fa7ed62249f69e36f20fd4f402d. Fixture-owner routes 34/34; historical Phase5 audit is separate.

| Route | Result | Owner artifacts |
| --- | --- | --- |
| `/admin/analytics` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/admin/audit` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/admin/content/[importId]` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/content/new` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/content` | PASS: owner fixture rendering | [7 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/curriculum` | PASS: owner fixture rendering | [7 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/ielts-band-curriculum` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/ielts-bridge` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/ielts-integrated` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/ielts-mocks` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/ielts-orientation` | PASS: owner fixture rendering | [8 observations](regression/slice-6/production-phase6-final-tests/authoring-matrix-dark-1440.json) |
| `/admin/operations` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/admin/settings/ai` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/admin/settings/audio` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/login` | PASS: owner fixture rendering | [7 observations](regression/slice-1/production-phase6-final-tests/narrow-Vietnamese-public-auth-reflow-and-visible-keyboard-focus-at-CSS200.json) |
| `/register` | PASS: owner fixture rendering | [7 observations](regression/slice-1/production-phase6-final-tests/narrow-Vietnamese-public-auth-reflow-and-visible-keyboard-focus-at-CSS200.json) |
| `/dashboard` | PASS: owner fixture rendering | [10 observations](regression/slice-2/production-phase6-final-tests/learning-content-reflows-at-narrow-widths-and-CSS200-without-hiding-overflow.json) |
| `/ielts/bridge/[moduleId]` | PASS: owner fixture rendering | [7 observations](regression/slice-4/production-phase6-final-tests/bridge-matrix-dark-1440.json) |
| `/ielts/bridge` | PASS: owner fixture rendering | [6 observations](regression/slice-4/production-phase6-final-tests/bridge-matrix-dark-1440.json) |
| `/ielts/mock-tests/[attemptId]` | PASS: owner fixture rendering | [7 observations](regression/slice-5/production-phase6-final-tests/exam-launcher-pathway-and-player-reflow-at320-CSS200.json) |
| `/ielts/mock-tests` | PASS: owner fixture rendering | [7 observations](regression/slice-5/production-phase6-final-tests/exam-launcher-pathway-and-player-reflow-at320-CSS200.json) |
| `/ielts/orientation` | PASS: owner fixture rendering | [7 observations](regression/slice-4/production-phase6-final-tests/bridge-matrix-dark-1440.json) |
| `/ielts/pathway` | PASS: owner fixture rendering | [7 observations](regression/slice-5/production-phase6-final-tests/exam-launcher-pathway-and-player-reflow-at320-CSS200.json) |
| `/ielts/practice/[sessionId]` | PASS: owner fixture rendering | [7 observations](regression/slice-5/production-phase6-final-tests/exam-launcher-pathway-and-player-reflow-at320-CSS200.json) |
| `/ielts/practice` | PASS: owner fixture rendering | [7 observations](regression/slice-5/production-phase6-final-tests/exam-launcher-pathway-and-player-reflow-at320-CSS200.json) |
| `/mastery` | PASS: owner fixture rendering | [10 observations](regression/slice-2/production-phase6-final-tests/learning-content-reflows-at-narrow-widths-and-CSS200-without-hiding-overflow.json) |
| `/onboarding` | PASS: owner fixture rendering | [6 observations](regression/slice-3/production-phase6-final-tests/session-matrix-dark-1440.json) |
| `/onboarding/placement/[sessionId]` | PASS: owner fixture rendering | [6 observations](regression/slice-3/production-phase6-final-tests/session-matrix-dark-1440.json) |
| `/programs` | PASS: owner fixture rendering | [10 observations](regression/slice-2/production-phase6-final-tests/learning-content-reflows-at-narrow-widths-and-CSS200-without-hiding-overflow.json) |
| `/sessions/[sessionId]` | PASS: owner fixture rendering | [6 observations](regression/slice-3/production-phase6-final-tests/session-matrix-dark-1440.json) |
| `/settings/ai` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/settings/audio` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/settings` | PASS: owner fixture rendering | [7 observations](regression/slice-7/production-phase6-final-tests/all-settings-and-operations-owners-reflow-at320-CSS200.json) |
| `/` | PASS: owner fixture rendering | [7 observations](regression/slice-1/production-phase6-final-tests/narrow-Vietnamese-public-auth-reflow-and-visible-keyboard-focus-at-CSS200.json) |

## Repeated optimized lab measurements

| Route | LCP ms (3) | CLS (3) | Observed interaction max ms (3) | Frame median / p95 / max ms |
| --- | --- | --- | --- | --- |
| /dashboard | 420 / 244 / 196 | 0.00188 / 0.00188 / 0.00000 | 24 / 32 / 24 | 16.70 / 16.70 / 16.80 |
| /settings | 236 / 196 / 144 | 0.00000 / 0.00000 / 0.00000 | 32 / 24 / 24 | 16.70 / 16.80 / 16.80 |
| /sessions/a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d | 228 / 176 / 196 | 0.00000 / 0.00000 / 0.00000 | 16 / 32 / 16 | 16.70 / 16.70 / 16.80 |
| /ielts/mock-tests/11111111-1111-4111-8111-111111111111 | 192 / 172 / 152 | 0.00000 / 0.00000 / 0.00000 | 16 / 16 / 16 | 16.70 / 16.80 / 16.80 |
| /admin/content/11111111-1111-4111-8111-111111111111 | 224 / 176 / 184 | 0.01896 / 0.01896 / 0.01896 | 56 / 24 / 24 | 16.70 / 16.80 / 16.80 |
| /admin/operations | 180 / 172 / 160 | 0.01896 / 0.01896 / 0.01896 | 40 / 48 / 32 | 16.70 / 16.80 / 16.80 |

- Owner105 source18e00fd predates Operations fix; use operations-regression-final for its18 affected cases. Other owners unchanged.
- Asset sums include all chunks, NOT per-route transferred payload or a before/after regression metric.
- Lab18 observations on one headless desktop with loopback fixtures, no CPU/network throttling; EventTiming maxima are not field INP; no physical60FPS or total CWV claim.
- Original CLS baseline is controlled separately in cls-original-baseline; it is not an equivalent full LCP/INP baseline.
