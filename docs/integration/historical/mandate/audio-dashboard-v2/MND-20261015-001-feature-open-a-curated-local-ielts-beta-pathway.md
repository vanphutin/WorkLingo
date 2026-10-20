---
{
  "schema_version": 1,
  "id": "MND-20261015-001",
  "status": "verified",
  "created": "2026-10-15",
  "updated": "2026-10-15T07:12:42.498Z",
  "title": "Open a curated local IELTS Beta pathway",
  "type": "feature",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "IELTS phases exist but the local catalog remains locked; Orientation, Band Curriculum and Mock lack current publications and generic activation cannot initialize this separate pathway.",
  "value": "Local learners can enter a coherent IELTS practice pathway with real content/audio and honest prerequisite feedback.",
  "scope": [
    "learning-programs IELTS catalog entry",
    "web IELTS guided hub",
    "curated local IELTS publications and real offline audio"
  ],
  "dedupe_key": "feature:ielts-local-beta-entry-and-reviewed-publications",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-15-ielts-readiness.md",
      "observation": "Read-only audit recorded missing publications and unsupported activation."
    }
  ],
  "acceptance": [
    "IELTS Beta catalog opens /ielts without replacing Intermediate context.",
    "Current published Orientation, four-skill Bridge, four practice profiles, seven-stage Band Curriculum and a genuine-audio Academic Mock are verified.",
    "Prerequisite and teacher-review gates remain enforced; missing current publication/audio relocks entry.",
    "Local release has private snapshot, audit, revision checks and documented compensating rollback."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": false,
    "rollback": "Restore prior catalog metadata and disable/archive new current releases while retaining immutable versions and learner pins; use the private pre-release snapshot and audit record."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-15-ielts-local-beta.md",
  "sprint_reference": null,
  "approval": {
    "actor": "Human user via current chat",
    "reference": "docs/superpowers/specs/2026-10-15-ielts-local-beta-design.md:5",
    "at": "2026-10-15T06:35:21.788Z",
    "proposal_hash": "c05bf36bb3318e73ce237cfe3d99f693c3dc94e4fd9abf3273b1397626686f66"
  },
  "verification": [
    {
      "command": "pnpm --filter @worklingo/api test; final focused release/scorer tests",
      "result": "passed",
      "reference": "mandate/reports/2026-10-15-ielts-local-beta-release.md"
    },
    {
      "command": "pnpm --filter @worklingo/web test; contracts test; typecheck/lint/build; i18n check",
      "result": "passed",
      "reference": "mandate/reports/2026-10-15-ielts-local-beta-release.md"
    },
    {
      "command": "playwright test --project=ielts-beta-desktop --project=ielts-beta-mobile",
      "result": "passed",
      "reference": "mandate/reports/2026-10-15-ielts-local-beta-release.md"
    },
    {
      "command": "Reviewed local release execute; read-only post-release verification; reviewed idempotent execute",
      "result": "passed",
      "reference": "mandate/reports/2026-10-15-ielts-local-beta-release.md"
    }
  ],
  "history": [
    {
      "at": "2026-10-15T06:35:01.931Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-15T06:35:21.069Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Verified local publication and catalog blockers; reuse existing IELTS engines and scoped implementation plan.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-15T06:35:21.788Z",
      "actor": "Human user via current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "User explicitly delegated content selection and execution of the proposed local IELTS Beta release, including reviewing/publishing missing content and catalog integration.",
      "event": "transition",
      "reference": "docs/superpowers/specs/2026-10-15-ielts-local-beta-design.md:5"
    },
    {
      "at": "2026-10-15T06:35:22.567Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute the authorized linked local Beta plan; retain existing live worktree and learner evidence.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-15T07:12:42.498Z",
      "actor": "Codex",
      "from": "implementing",
      "to": "verified",
      "reason": "Authorized local Beta published after independent review; current content, real stored audio, catalog navigation, prerequisite/context protection and idempotence verified. Public release and calibration remain outside scope.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-15-ielts-local-beta-release.md"
    }
  ]
}
---

## Scope and authority

The user's direct request authorizes choosing content and completing the previously proposed local Beta release. The exact quote and scope are recorded in the linked design. Preserve Intermediate evidence and all historical version pins. No public release or paid service calls.

## Verification

Use deterministic catalog/activation tests, content validation and offline real-audio checks, an isolated desktop/mobile browser journey and post-release aggregate verification. Human calibration is not claimed.
