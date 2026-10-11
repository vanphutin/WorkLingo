# Master Prompt — Complete WorkLingo Increment 5

Copy the prompt below into Antigravity after this planning branch is merged into `main`.

---

You are the implementation owner for the remaining WorkLingo Increment 5. Execute the complete approved scope in one continuous assignment:

1. Increment 5A2 — Weekly Mission, flexible consistency streak and Evidence of Progress.
2. Increment 5B — Admin curriculum operations and privacy-safe audit browser.
3. Increment 5C — request safety, durable rate limiting, observability and privacy-safe pilot analytics.
4. Increment 5D — accessibility, performance, security, recovery and pilot qualification.

The user has approved this order and all linked architecture specs. Do not pause for product approval between 5A2, 5B, 5C and 5D. Continue until the full deterministic verification gate passes or a real external blocker remains after exhausting safe in-scope alternatives.

## Repository authority and required reading

Work from the latest `origin/main` of WorkLingo. Before substantive work:

1. Read root `AGENTS.md` completely and obey its skill routing, Git safety, testing and reporting requirements.
2. Dynamically inspect global and repository skills. Read every selected `SKILL.md` fully before using it. Never claim a skill that is missing or unread.
3. Emit the exact `SKILL ROUTING` block required by `AGENTS.md` at the beginning of each major phase and a final `SKILL AUDIT` at handoff.
4. Read these approved sources of truth completely:
   - `docs/superpowers/specs/2026-10-09-increment-5a-onboarding-placement-engagement-design.md`
   - `docs/superpowers/plans/2026-10-09-increment-5a2-engagement-progress.md`
   - `docs/superpowers/specs/2026-10-11-increment-5b-admin-curriculum-audit-design.md`
   - `docs/superpowers/plans/2026-10-11-increment-5b-admin-curriculum-audit.md`
   - `docs/superpowers/specs/2026-10-11-increment-5c-security-observability-analytics-design.md`
   - `docs/superpowers/plans/2026-10-11-increment-5c-security-observability-analytics.md`
   - `docs/superpowers/specs/2026-10-11-increment-5d-pilot-qualification-design.md`
   - `docs/superpowers/plans/2026-10-11-increment-5d-pilot-qualification.md`
5. Read current architecture, data, API, test, decision and local-operation docs relevant to each phase. Inspect implementation before deciding exact edits.

Use `superpowers:executing-plans` as the primary execution workflow. Use `superpowers:test-driven-development` for every behavior change and bug fix. Use `superpowers:systematic-debugging` or the installed equivalent before changing code in response to an unexpected failure. Route NestJS, PostgreSQL, React/Next.js, UI accessibility and code-review responsibilities to exact installed domain skills when applicable. Use `superpowers:verification-before-completion` before any completion claim.

## Git and workspace rules

- Inspect `git status`, current branch and recent commits before edits.
- Preserve every unrelated existing change. Do not reset, discard, overwrite or blanket-stage user work.
- Do not run `git commit`, `git push`, open/merge a PR, tag or deploy. Codex will review the complete diff, fix findings and perform final Git integration once.
- The commit steps inside individual plans become review checkpoints for this assignment: run `git diff --check`, inspect `git diff --stat` and record the completed task, then continue without committing.
- Never use destructive database reset commands. All migrations are additive, idempotent where required and tested from the previous merged schema with representative data.

## Scope boundaries

- Implement the approved Increment 5 only. The new IELTS 0→9.0 master roadmap is deferred until Increment 5 is reviewed and integrated.
- Do not add TOEIC/IELTS curriculum, payments, cloud deployment, native mobile, microservices, external certification or live-provider guarantees.
- Do not create a second learning engine, job system, audit source, analytics identity or curriculum source of truth.
- Reuse current `CurriculumService`, session planner, immutable `LessonVersion`, jobs, storage, auth, mastery and content-authoring boundaries.
- Keep local-first behavior. New production configuration must fail safely; tests and local setup must remain reproducible without paid providers.
- Do not weaken existing assertions, delete failing tests, add fake production data, expose test-only controls in production or claim manual/live checks were run when they were not.

## Execution protocol

### Phase 0 — Baseline

1. Verify the checked-out revision contains all eight approved spec/plan files above.
2. Inspect status and preserve unrelated changes.
3. Install exact locked dependencies only if needed, generate Prisma client and run the narrow baseline checks needed to distinguish environment setup from a regression.
4. Record baseline test counts and any pre-existing failure. Repair only environment setup at this point; diagnose actual baseline failures before proceeding.

### Phase 1 — Increment 5A2

Execute every task in `2026-10-09-increment-5a2-engagement-progress.md` in order with strict RED → GREEN → REFACTOR.

Non-negotiable outcomes:

- weekly target 2–5, default 3;
- Monday week in the learner's stored timezone;
- distinct completed `LEARNING` dates only;
- duplicate/concurrent completion counted exactly once;
- current incomplete week does not break consistency;
- target changes current week only before its first study day, otherwise next week;
- evidence uses two 28-day windows and needs at least two evaluated samples in each window per skill;
- aggregate-only responses and neutral learner language.

After Task 6, run the complete 5A2 focused gate and inspect the diff. Fix all 5A2 regressions before starting 5B. Do not stop for external review.

### Phase 2 — Increment 5B

Execute every task in `2026-10-11-increment-5b-admin-curriculum-audit.md` in order.

Protect optimistic revisions, idempotency, atomic audit, immutable historical identity, canonical playability, complete transactional reorder, non-cascading archive, version-bound learner sessions, Admin authorization and audit redaction. Run the 5B focused gate and the existing authoring/session/version-isolation regressions before 5C.

### Phase 3 — Increment 5C

Execute every task in `2026-10-11-increment-5c-security-observability-analytics.md` in order.

Protect correlation propagation, recursive redaction, production rate-limit key requirements, trusted-proxy default, HMAC address keys, atomic concurrent limits, safe operations views and server-owned aggregate-only analytics. Capture forbidden-value fixtures and assert they never appear in logs/API output. Run the 5C focused gate and all cross-feature instrumentation regressions before 5D.

### Phase 4 — Increment 5D

Execute every task in `2026-10-11-increment-5d-pilot-qualification.md` in order.

Qualification must use isolated schemas/data paths and public product interfaces. A failed budget/security/recovery/accessibility assertion remains failed until the product is fixed or the release is honestly marked `BLOCKED`. Automated evidence may set `TECHNICALLY_QUALIFIED`; never set `CONTROLLED_PILOT_APPROVED` without the named human approvals required by the spec.

### Phase 5 — Whole-diff review and final verification

1. Review the entire uncommitted Increment 5 diff across correctness, maintainability, architecture, security/privacy and performance.
2. Classify findings Critical, Important or Minor. Fix every Critical and Important issue test-first. Record accepted Minor findings with a concrete reason.
3. Re-run the narrow tests affected by each fix.
4. Run all deterministic qualification commands from 5D and then run `pnpm verify` from the repository root.
5. If a gate fails, use systematic debugging, repair the root cause and rerun the narrow failing command before the full gate.
6. Run `git diff --check`, inspect migration safety, inspect `git status --short`, and verify no secret/generated runtime data is included.

## Required handoff to Codex

Leave the tree uncommitted and provide one precise final report containing:

- completed tasks, grouped by 5A2/5B/5C/5D;
- exact files created/modified and migration names;
- tests and qualification commands run, with pass/fail counts and duration when available;
- final `pnpm verify` result;
- release status (`BLOCKED` or `TECHNICALLY_QUALIFIED`) and the evidence behind it;
- unresolved Minor findings, environmental limitations and human-only approvals still pending;
- `git status --short` and a concise diff summary;
- explicit confirmation that no commit, push, PR, merge or deployment occurred.

Do not report completion while any deterministic required gate is failing, any required artifact is missing, or any Critical/Important finding remains unresolved. If an external blocker remains, continue every independent task first, then report the exact blocked command, error, evidence collected and smallest required human action.

---

End of master prompt.
