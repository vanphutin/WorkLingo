# Increment 5D: Pilot Qualification and Release Decision Design

**Date:** 2026-10-11

**Status:** Approved on 2026-10-11

**Scope:** Evidence-driven accessibility, performance, security, reliability and operational qualification for a controlled local Foundation pilot

## 1. Outcome

5D does not add a new product subsystem. It defines reproducible qualification gates, fixes defects exposed by those gates, produces operator/recovery documentation and ends with an honest release decision. Automated success may establish “technical qualification complete”; it cannot substitute for human AI/placement calibration or content-quality review.

## 2. Qualification matrix

### Accessibility

Keyboard-only journeys cover registration/onboarding, session, mastery, audio settings, Admin authoring, curriculum, audit and operations. Verify focus visibility/order/restoration, semantic labels/live regions, 200% zoom, reduced motion, contrast, 44px targets, 16px mobile form fonts and mobile writing controls with the keyboard open. Automated checks complement, not replace, a recorded manual checklist.

### Performance

Record OS/CPU/RAM/Node/PostgreSQL/browser and cold/warm conditions. Use seeded deterministic datasets: 1,000+ mastery records, large valid/invalid lesson source, 10,000 audit/job rows and bounded analytics windows. Measure query count and elapsed time separately from provider latency. Budgets are documented before measurement; a failure requires optimization or an explicit release blocker, never deletion of the assertion.

Initial local reference budgets: session availability/creation and engagement summaries p95 under 750 ms after warm-up; Admin cursor pages under 500 ms; 500 KB lesson parse/validate under 1,000 ms; no unbounded table scan in reviewed query plans; core page LCP under 2.5 s on the documented desktop profile. Mobile results are reported separately and must have no interaction-blocking request waterfall.

### Security

Review the complete route/role matrix, learner/Admin IDOR, session/CSRF behavior, request limits, uploads (MIME/signature/size/path traversal), local storage containment, secret/log scans, dependency audit, prompt-injection fixtures, safe errors and production rejection of test-only controls. Findings are severity-ranked; Critical/Important issues block qualification.

### Reliability and recovery

Rehearse clean setup, migration from the previous merged schema, idempotent seed, API/web restart, durable job retry, session/checkpoint recovery, immutable LessonVersion behavior, local database/files backup and restore, and rollback to the previous Git revision with compatible data instructions. Rehearsal uses explicit isolated paths/schemas and checksum verification.

## 3. Required artifacts

- `docs/PILOT_RUNBOOK.md`: setup, startup, smoke checks, Admin/Learner demo, operations checks, backup/restore and shutdown.
- `docs/RELEASE_CHECKLIST.md`: evidence links, owners, pass/fail/blocker and rollback decision.
- `docs/SECURITY_REVIEW.md`: threat surface, tested controls, findings and residual risks without secrets.
- `docs/PERFORMANCE_REPORT.md`: machine profile, dataset, method, raw aggregate results and budgets.
- `docs/ACCESSIBILITY_REVIEW.md`: automated/manual evidence and remaining issues.
- Updated roadmap/test strategy/decisions/local development documents.

Reports never include real credentials, personal learner content or raw recordings.

## 4. Full journey gate

Playwright desktop/mobile covers registration, both onboarding paths, ordinary learning/resume, Teacher AI retry, mastery/Error Bank, engagement, Admin content publish/audio, curriculum/audit, operations/analytics and version isolation. Tests use public product interfaces and isolated PostgreSQL schema/data directories. Test-only failure injection remains guarded by `NODE_ENV=test` plus explicit E2E mode.

`pnpm verify` remains the repository gate. Add focused qualification commands only when they are deterministic and documented; live-provider and human-calibration runs remain opt-in separate reports.

## 5. Release decision

Final status is one of:

- `BLOCKED`: any Critical/Important technical finding, failed recovery rehearsal or missing required artifact.
- `TECHNICALLY_QUALIFIED`: automated/manual technical gates pass, but human calibration or content review remains pending.
- `CONTROLLED_PILOT_APPROVED`: technical gates pass and named human owners have approved Teacher AI/placement calibration, Foundation content quality and pilot operations.

The repository alone cannot assign `CONTROLLED_PILOT_APPROVED`; it requires recorded human approvals. No status implies CEFR, B2, TOEIC, IELTS, employment or academic certification.

## 6. Testing and review process

Every defect is first reproduced by the narrowest automated test where practical, then fixed without weakening the gate. Run five-axis review across correctness, maintainability, architecture, security/privacy and performance. A final independent review inspects the diff and evidence reports. All skipped checks and environmental limitations are explicit.

## 7. Acceptance criteria

5D is complete when all deterministic gates pass, backup/restore and rollback are rehearsed, desktop/mobile core journeys pass, required reports are complete, no unresolved Critical/Important technical finding remains and the release status accurately lists calibration/content blockers.

## 8. Non-goals

Cloud deployment, public launch, payment, native mobile, external certification, live-provider quality guarantees, production SOC/ISO compliance and removal of honest pilot blockers are excluded.
