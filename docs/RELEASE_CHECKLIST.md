# Increment 5 Release Checklist

Date: 2026-10-12
Repository decision: **TECHNICALLY_QUALIFIED** (controlled-pilot human approvals still pending).

## Deterministic evidence

- [x] Increment 5A2 weekly mission, flexible target/streak and evidence of progress.
- [x] Increment 5B curriculum management and privacy-safe audit browser.
- [x] Increment 5C correlation/log redaction, durable rate limits, Operations and aggregate Analytics.
- [x] `pnpm qualify:performance`.
- [x] `pnpm qualify:security`.
- [x] `pnpm qualify:recovery` against isolated schema/data paths.
- [x] Desktop/mobile accessibility and pilot qualification journeys.
- [x] Full repository `pnpm verify` (recorded in the merge commit handoff).
- [x] No unresolved Critical/Important finding in final five-axis review.

Evidence: [Performance](./PERFORMANCE_REPORT.md), [Accessibility](./ACCESSIBILITY_REVIEW.md), [Security](./SECURITY_REVIEW.md), [Runbook](./PILOT_RUNBOOK.md), [Test strategy](./TEST_STRATEGY.md).

## Required human approvals before `CONTROLLED_PILOT_APPROVED`

- [ ] Named Teacher AI speaking/writing calibration owner approves representative Vietnamese learner samples.
- [ ] Named placement owner approves Foundation recommendations and false-positive/false-negative review.
- [ ] Named content owner approves Foundation workplace lesson quality and audio.
- [ ] Named pilot operator completes a supervised backup/restore and incident drill.

Automation cannot check these boxes. This status does not imply CEFR/B2, TOEIC, IELTS, employment or academic certification.

## Beginner R1.2b mission WL-R12B-AUTONOMOUS-001 (2026-10-30)

Separate release assessment; the historical Increment 5 decision above is unchanged. R1.2b remains NOT_READY. Evidence and exact decision: [mission report](qualification/beginner-r12b-autonomous-final-report.md), [commit audit](qualification/final-commit-audit.md), [inventory](qualification/beginner-r12b-commit-inventory.md).

- [ ] All 8 Lessons qualified on current exact bundles.
- [ ] Real provider calibration and frozen adjudication/thresholds pass within 1.5 InkPoints / USD 0.
- [ ] No unresolved release P1/P2; four known engineering P2s, the new CSS build P1 and the final review's mixed-newline P2 are technically resolved with independent review. External qualification/operational gates remain blocked.
- [ ] Independent audio/vocabulary/IPA/support evidence complete: 82/82.
- [x] Pinned evaluator context/cache/privacy unit and contract regression evidenced in the mission report; this does not prove model scoring.
- [ ] Actual Gate C complete with 3 consented eligible adults and 24 valid first-exposure observations.
- [ ] Full independent release review has no Critical/Important unresolved findings.
- [ ] Reliability contract including required actual power-loss evidence satisfied.
- [ ] Full required regression including approved disposable DB integration/E2E complete.
- [ ] Full commit audit release acceptance complete.
- [ ] Concrete existing deployment target, pipeline/access and health checks verified.
- [ ] Rollback procedure rehearsed against the intended target.

Conditional merge/push/deploy authority is explicit in the current owner mission. Missing evidence, target or any unchecked gate prevents execution; no branch protection or approval is bypassed. No new infrastructure, secrets or production data changes are implied.

Mission outcome: **RESULT B — ENGINEERING COMPLETE / EXTERNAL EVIDENCE BLOCKED**. Available safe engineering: 1807 distinct tests PASS, API/Web/shared package lint and typecheck PASS, API build and sanitized Next webpack/Turbopack builds PASS. Independent integrated AI review has no outstanding Critical/Important/P2 in its bounded scope. External gates remain incomplete: real provider 0 starts, human oracle 0/128, professional QA 0/82, real Gate C 0/24, actual power-loss proof, current DB/browser qualification, target and tested rollback. No merge, push, deploy or readiness promotion.
