# IELTS Academic Full Mock — local operation

Phase 8 adds a complete, version-bound IELTS Academic mock workflow. It is a learning and
assessment aid; every result is labelled as a mock estimate and is not an official IELTS result.

## Learner journey

1. Start the IELTS Band Pathway. A pathway journey is the prerequisite for the mock catalog.
2. Open `/ielts/mock-tests`, select Learning, Practice, or Exam simulation, and start a published
   mock.
3. Complete Listening (30 minutes), Reading (60), Writing (60), and Speaking (up to 14) in order.
   Responses and the optimistic revision are saved between page loads.
4. Listening and Reading are scored from the answer policy embedded in the pinned test version.
   Answer policies and explanations are never returned to learner clients.
5. After Speaking is submitted, the report remains `EVALUATION_PENDING` until a Content or System
   Admin reviews Writing and Speaking. Only then is the overall mock band calculated.

## Admin journey

Open `/admin/ielts-mocks`. The workspace supports JSON authoring, structural validation, immutable
publication, and a bounded teacher-review queue. Publishing archives the prior current version;
existing attempts continue to use the version they pinned when started.

The local seed contains synthetic, copyright-safe content only. Replace it with owned/licensed
content before any production release. Reviewer rubric entries use four whole/half-band criteria;
Writing Task 2 receives twice the weight of Task 1.

## Safety and scoring invariants

- Academic format only in Phase 8: Listening 40 questions, Reading 40, Writing 2 tasks, Speaking 3
  parts.
- Objective raw-to-band conversion belongs to each immutable published version.
- An overall band requires four section bands and teacher-reviewed Writing and Speaking.
- Attempts are owner-scoped, client-start idempotent, revision-protected, and server-timed.
- Admin mutations use authorization, audit records, idempotency receipts, and transactional locks.

## Focused verification

```powershell
pnpm --filter @worklingo/contracts test --run src/ielts-mock.contracts.spec.ts
pnpm --filter @worklingo/api test --run src/ielts-mock
pnpm --filter @worklingo/web test --run src/features/ielts-mock/ielts-mock.test.tsx
pnpm --filter @worklingo/api typecheck
pnpm --filter @worklingo/web typecheck
```

Run `pnpm verify` once at the final repository gate.
