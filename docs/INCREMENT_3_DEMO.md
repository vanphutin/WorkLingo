# Increment 3 — Local adaptive-learning demo

## Run

Use Node 20 and the repository pnpm version. Keep credentials in the ignored `.env` file. From the repository root:

```powershell
docker compose -f infra/docker-compose.yml up -d
pnpm install
pnpm --filter @worklingo/api exec prisma generate
pnpm --filter @worklingo/api exec prisma migrate deploy
pnpm --filter @worklingo/api db:seed
pnpm dev
```

Open `http://localhost:3000/register`. Existing accounts can use `/login`.

## Learner journey

1. Register a learner and open the dashboard. The server advertises five duration modes; only 45/60 are enabled by the development lessons. Unsupported workloads stay disabled, not padded with duplicate questions.
2. Select 45 minutes, start, and answer the reading questions incorrectly. Submit and continue so the server records evaluated evidence. Reload to check the persisted checkpoint.
3. Open **Mastery & Review** (`/mastery`). Reading has weak evidence; speaking/writing remain unassessed until evaluated. Inspect the Mastery Map, Review queue, Memory Health and skill-filtered Error Bank.
4. Return to the dashboard. A matching review should select **Welcome a customer to your workplace**, practicing the same stable Language Blocks through a different visitor email/conversation. Previously opened sessions retain their original version and plan.
5. Complete a session and open **Checkpoint assessment**. Request an assessment. Real text-only speaking/writing submissions remain **Evaluation pending**; the UI must not offer level confirmation for them. Reload preserves the immutable assessment.

The seed contains two Foundation 1 missions, not a published next level. Therefore even a genuinely passed assessment cannot advance until the immediate successor has published playable content. Tests supply isolated server-side evaluated fixtures and successor content to verify confirmation, concurrency and no-skip rules; this is not a production bypass.

## Verification coverage

- Domain: deterministic review priority, context identity, same-context fallback, five-duration plans and independent four-skill checkpoint thresholds.
- HTTP/database: time-travel recurrence, learner isolation, version isolation, seed idempotency, immutable assessments, UUID replay/conflicts and serialized confirmation.
- Browser: adaptive desktop/mobile journey plus the existing Foundation and Admin journeys.
- Required repository gate: `pnpm verify` (format, lint, typecheck, tests, integration, build and Playwright).

## Deliberate limits

These lesson workloads and the initial 0.7 checkpoint threshold require pilot calibration; completion is not a CEFR/B2 claim. Live audio, recording and genuine Teacher AI speaking/writing evaluation belong to Increment 4. Longer sessions require authored independent activities. Placement, full TOEIC/IELTS content and pilot readiness remain later roadmap work.
