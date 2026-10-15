# IELTS Phase 6 - Integrated Practice Design

Status: approved for implementation by the user's request to continue Phase 6 on 2026-10-13.

## Outcome

After completing all four required Bridge modules, a learner can start an integrated IELTS practice
session of 60, 90, 120, or 150 minutes. Every session covers Listening, Reading, Writing, and Speaking,
mixes review with new practice, persists progress, and resumes against an immutable plan snapshot.

## Product boundaries

- Integrated practice is learning mode, not an official mock test.
- Duration and difficulty are independent inputs. Phase 6 does not estimate an IELTS band.
- Content is original, licensed, or Admin-owned. No copied official questions are seeded.
- Authenticity is represented by reviewable criteria, never an unsupported percentage claim.
- Phase 7 owns band-oriented curriculum; Phase 8 owns full mock tests and score reports.

## Configurable time profiles

The initial profiles are 60=`15/15/20/10`, 90=`20/25/30/15`, 120=`25/35/40/20`, and
150=`30/45/55/20` for Listening/Reading/Writing/Speaking. These values are seeded data, not planner
constants. Admin can publish a replacement profile version. Validation requires all four skills,
positive whole minutes, one allocation per skill, and an exact sum equal to the session duration.

## Planning and version isolation

- A published profile version and eligible published Bridge module versions are planner inputs.
- New starts require durable Bridge completion. Existing sessions remain resumable after content or
  profile republishing.
- A plan snapshot stores duration, difficulty target, profile version, selected module versions,
  ordered skill blocks, review/new-practice intent, and exact target minutes.
- Selection prefers due review evidence, avoids repeating the most recent question types where an
  alternative exists, and still includes all four skills.
- Start is idempotent by learner/client-session ID. Progress updates use optimistic revisions.

## Feedback and completion

Each skill block delegates task evaluation to the existing server-owned Bridge rules. The learner
never receives answer keys or rubrics. A session completes only after every planned block is complete;
the response then exposes skill evidence and a next-step recommendation without a band score.

## Delivery slices

1. Contracts and pure configurable allocation policy.
2. Immutable profile/session persistence and migration protections.
3. Admin profile API and versioned publishing.
4. Learner planner/start/resume/progress API.
5. Admin and learner responsive web journeys.
6. Desktop/mobile E2E, documentation, review, final verification, push and fast-forward merge.
