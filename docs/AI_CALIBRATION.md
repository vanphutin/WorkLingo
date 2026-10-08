# Teacher AI Calibration

## Baseline 2026-10-08

Command: `pnpm --filter @worklingo/api ai:calibrate`

- Fixture set: `foundation-golden-v1`
- Provider mode: deterministic fake adapters
- Rubrics: `foundation-speaking-shadowing@1`, `foundation-workplace-writing@1`
- Human calibration: **pending**
- Live Microsoft/OpenAI-compatible run: **not run**; no approved live audio fixtures or provider credentials were supplied

| Fixture | Skill | Score | Expected | Result |
|---|---|---:|---:|---|
| `writing-clear-update` | Writing | 0.8125 | 0.81–0.82 | Pass |
| `writing-incomplete-update` | Writing | 0.2200 | 0.21–0.23 | Pass |
| `speaking-clear-shadowing` | Speaking | 0.8285 | 0.82–0.84 | Pass |

These results prove deterministic contract and rubric wiring, not real-world AI quality. Before a pilot, an English teacher must score an anonymized, representative sample by dimension. Product thresholds and false-pass/false-fail tolerances remain unapproved until that comparison is complete.

## Operating the harness

- Fake gate: `pnpm --filter @worklingo/api ai:calibrate`
- Live opt-in: `pnpm --filter @worklingo/api ai:calibrate -- --live`
- A live request without all Microsoft Speech and OpenAI-compatible credentials returns an explicit `skipped` result.
- Even with credentials, the current harness skips live scoring until approved, licensed fixture audio exists. It never silently substitutes generated scores.
- Any fake score outside its committed expected range exits non-zero.

Raw learner recordings, transcripts, credentials and provider responses must not be added to this document or committed as calibration fixtures.
