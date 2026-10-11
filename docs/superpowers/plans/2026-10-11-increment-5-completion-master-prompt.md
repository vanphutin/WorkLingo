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

## Mandatory skill routing matrix

Skills are execution requirements, not labels for the final report. Before each phase, discover the actual installed names and paths, select the smallest sufficient set, read each selected `SKILL.md` completely and follow its required order/checks. If an exact skill below is unavailable, report it as missing and use one installed equivalent for the same responsibility; never claim the missing skill was used. Do not load every skill at once.

| Trigger or phase | Required primary skill | Responsibility |
|---|---|---|
| Start of the assignment | `superpowers:using-superpowers` | Discover skills before questions, exploration or edits and enforce skill-first routing. |
| Execute any approved Increment 5 plan | `superpowers:executing-plans` | Track plan tasks in order, preserve interfaces between tasks and continue through all four increments. |
| Every feature or defect repair | `superpowers:test-driven-development` | Enforce RED → GREEN → REFACTOR; prove the test fails for the intended missing behavior before implementation. |
| Unexpected test/build/runtime behavior | `superpowers:systematic-debugging` | Reproduce, collect evidence, identify root cause and test the fix. If this exact skill is absent, use `debugging-and-error-recovery`; never use both for the same failure. |
| Any Git inspection or workspace change | `git-workflow-and-versioning` | Preserve unrelated work, inspect status/diff and maintain a reviewable uncommitted handoff. The assignment-specific no-commit/no-push rule overrides commit suggestions in this skill. |
| NestJS controllers, modules, DTOs, guards and services | `nestjs-expert` | Keep dependency injection, validation, authorization, error contracts and NestJS test structure correct. |
| Prisma schema, PostgreSQL transactions, locks, indexes and query plans | `supabase-postgres-best-practices` | Review integrity, concurrency, bounded queries, indexes, migration compatibility and explain plans. |
| Cross-cutting Node/Express request context, logging and rate limiting in 5C | `nodejs-backend-patterns` | Review middleware ordering, safe errors, request boundaries and abuse-control behavior. Use it only for this distinct cross-cutting responsibility. |
| React/Next.js implementation in 5A2, 5B and 5C | `vercel-react-best-practices` | Control data fetching, rendering, state, bundle impact and request waterfalls. |
| New Admin/Learner interface composition | `design-taste-frontend` | Preserve the WorkLingo design system, responsive hierarchy and intentional product UI. Do not redesign unrelated screens. |
| Accessibility/UX review in every UI task and 5D | `web-design-guidelines` | Audit semantics, keyboard/focus, zoom, motion, contrast, target size and responsive behavior. |
| End of each increment and whole-diff gate | `code-review-and-quality` | Perform five-axis review: correctness, readability, architecture, security and performance; fix every Critical/Important finding. |
| Before any pass/fixed/complete statement | `superpowers:verification-before-completion` | Run fresh proving commands, read exit codes/counts and base every claim on current evidence. |

Do not invoke `superpowers:brainstorming` merely to reopen approved product decisions. Invoke it only if implementation reveals a truly new subsystem or an irreversible architecture choice outside the approved specs; record the exact conflict and continue every independent in-scope task first.

At the start of each major phase, the required report must name the skills actually selected for that phase:

```text
SKILL ROUTING
Task: <5A2, 5B, 5C, 5D or final review>
Selected: <exact installed skill names>
Reason: <one responsibility per selected skill>
Execution order: <process skill → domain skill → review/verification skill>
```

At final handoff, map every claimed skill to the concrete files/actions/checks it governed. A skill listed without evidence counts as not used.

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
