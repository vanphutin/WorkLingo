# IELTS Phase 7 — Band-Oriented Curriculum Review

## Delivered

- Seven authored stages: Foundation→3.0, then every whole-band transition through 9.0.
- Per-stage outcomes, prerequisites, lesson categories, four-skill competencies, activities,
  assessment criteria, remediation, practice formats and measurable exit criteria.
- Admin draft/validate/publish workflow with immutable versions, audit events, idempotency and
  optimistic concurrency.
- Bridge-gated learner journey with target selection, durable resume, version isolation and
  evidence-backed progression from completed Integrated Practice.
- Responsive Admin and Learner interfaces plus dashboard entry point.

## Product boundary

The UI deliberately separates target band, curriculum stage, proficiency descriptor and practice
performance. Phase 7 does not estimate a band, record an official result or implement mock tests.

## Verification evidence

- Contract, progression-policy, service and migration tests.
- Focused React component tests and TypeScript checks.
- Desktop/mobile Playwright journey verifies Admin publishing, learner start, no score claim,
  insufficient-evidence guidance and preservation of the pinned curriculum version.

The repository-wide `pnpm verify` is the final merge gate; human IELTS content calibration remains
a release requirement rather than an automated code claim.
