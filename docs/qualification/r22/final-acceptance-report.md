# R2.2 engineering acceptance

Decision date: 2026-11-07. **ENGINEERING COMPLETE / EXTERNAL AI QUALIFICATION BLOCKED.** This accepts the bounded implementation and synthetic engineering verification. It does not certify language proficiency, activate external assessment or authorize production deployment. HUMAN_VALIDATED: NOT_RUN.

The unified engine covers Reading, Listening, Writing and Speaking within the existing TeacherAiModule, attempt identity, LanguageEvaluationPort, recording/storage/transcription jobs and learner/admin application. Versioned EvaluationRun extends immutable history while legacy EvaluationResult uniqueness, 0–1 scores, participation and progression rules remain intact. New totals use 0–100 with required 0–3 criteria; missing mandatory evidence never receives a total.

| Skill | Implementation and engineering evidence | Actual AI qualification |
|---|---|---|
| Reading | Objective formats and semantic text authoring/publication/submission; exact source context; separate primary/verifier/adjudicator/feedback; persisted history and responsive feedback | BLOCKED: no actual-model benchmark meeting unchanged targets |
| Listening | Same comprehension formats; shared exact published audio/script/hash binding between playback and assessment; private transcript boundaries; published semantic learner integration | BLOCKED: real benchmark speech assets and actual-model accuracy not established |
| Writing | Eight task/meaning/language criteria, acceptable alternatives through semantic evaluation, bounded submitted-text evidence/corrections, immutable re-evaluation and learner feedback | BLOCKED: actual semantic accuracy, factual error rates and bias calibration not measured |
| Speaking | Actual multipart recording/consent/storage/owner playback; PCM/checksum/energy validation; existing STT jobs and actual Microsoft response decoder preserve words/phonemes/timing; linguistic/acoustic evidence separated | BLOCKED: representative acoustic/accents benchmark unavailable; unsupported dimensions explicitly unscored |

Speaking never awards pronunciation from a transcript. A recording without recognized text returns all eight dimensions NEEDS_EVIDENCE, providers=[] and null total. Missing intelligibility or other mandatory acoustic evidence also prevents a total even when supported pronunciation/timing exists. These are implemented abstention paths, not placeholders presented as scores. Compressed browser media uses the existing transcription/provider support or fails explicitly; the local PCM validator is deliberately narrow.

## Acceptance evidence

- API full source suites: 187 files / 1,272 PASS, plus strict network-denied Beginner context 60 PASS.
- Actual R22 Nest/PostgreSQL/local HTTP integration: six files / 15 PASS. Covers all skills, source publication, exact pins, authorization/privacy, immutable results, idempotency, linked re-evaluation, recovered cancellation, audio retention/deletion races and migrations.
- Existing R2/R21 regression: 16 files / 74 PASS, plus five extra legacy seam files / 17 PASS. The unchanged restored Beginner journey verifies 24 published audio and 64 attempts across eight lessons.
- Web: 164 files / 1,007 PASS; contracts 182 PASS; content formats 158 PASS.
- Production Next/API/shared builds, workspace typecheck/lint, i18n, mandate consistency and staged whitespace/secret hygiene pass.
- Actual synthetic browser workflows: desktop, mobile and tablet PASS; 30 screenshots, five selected captures retained in evidence/.
- Independent whole-branch code review found no Critical issues and six Important categories; all accepted findings have regression fixes and passing final suites. Documentation discrepancies were reconciled. No independent human review is claimed.

Commands, exact counts, prior failures and scope are in test-execution-report.md, browser-verification.md and independent-review-report.md. The 50-case benchmark and CLI are synthetic, provenance-aware engineering tools; they do not satisfy actual-model or human calibration gates. Counts overlap and are not a distinct-test total.

## Git and release boundary

Baseline origin/main was fetched and verified as 66af136c9227482dd72c1d17490afdcd19bfe72f. Implementation uses codex/r22-assessment-engine in the existing isolated worktree. Explicit file staging and logical commits preserve the user's primary checkout changes to apps/web/next-env.d.ts and untracked backups/. Complete implementation inventory is in commit-inventory.md.

At this acceptance checkpoint, normal fast-forward integration and push are authorized by the user's mission after all engineering gates. The final delivery will record actual local/remote readback; this paragraph does not pre-claim a completed push. No force push, shared-history rewrite, production data migration or deployment is authorized by this engineering receipt.

Provider/privacy flags remain disabled by default and qualified mastery policy sets empty. Existing runtime opt-ins are not modified. No credits were purchased, accounts topped up, limits increased or production learner data transmitted. Public provider policy research cannot establish current account quota, retention approval, endpoint operator, region or live model identity.

## Explicit limitations and decisions

1. Extend TeacherAiModule with AssessmentHistoryService while retaining legacy EvaluationService/results: separate score scales and persistence semantics avoid breaking existing progression. Cost if wrong: future ownership consolidation may be needed; current boundaries and regressions are documented.
2. Recovery uses same-key replay after lease expiry rather than a new scheduled worker; POST awaits providers despite HTTP 202. Cost: operators/clients must retry an interrupted request; no automatic background SLA is promised.
3. History (50) and mastery (500) are bounded recent views; no complete archive export is claimed. Cost: older evidence can fall outside the projection; do not use it as an exhaustive transcript or calibrated mastery certificate.
4. Immutable/restrictive history requires a production erasure/retention decision before activation. Cost: ordinary cascade deletion is blocked; this mission did not destructively erase records to bypass it.
5. Actual AI accuracy, fairness, cross-family independence, measured cost/latency and statistical calibration remain BLOCKED. Same-family role calls do not prove independent-model evidence. Cost: external assessment and qualified progression cannot be promoted on these fixtures.
6. Human validation is NOT_RUN and no official CEFR, TOEIC, IELTS or examination certification is asserted. Listening tone and browser fake microphone establish engineering media behavior only.
7. Production deployment is NOT_DEPLOYED. Target, configuration, backup/restore, health, rollback and operational/privacy gates must be verified separately. No new infrastructure was purchased or provisioned.
8. The original initial scoring RED was not observed; later regression RED→GREEN evidence is retained. Full verification used explicit guarded gates rather than one default `pnpm verify` invocation. Neither procedural limit is hidden as a PASS.

No deferred Minor code finding remains from the independent review. Required future external/operational work above is a qualification boundary, not a deferred scoring fix. The canonical roadmap/spec/plan remain authoritative; no competing sprint board or mandate approval was fabricated.
