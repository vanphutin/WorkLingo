---
{
  "schema_version": 1,
  "id": "MND-20261028-001",
  "status": "verified",
  "created": "2026-10-28",
  "updated": "2026-10-28T01:38:34.804Z",
  "title": "Internationalize Beginner pilot names while preserving source versions and shared audio budgets",
  "type": "learning-content",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 3,
  "problem": "Owner requests foreign international people/place names after actually accepting original pilot audio. Seven authored sources and their answers/scripts/inventory need coordinated changes. Current fixed-source cache checks cannot reconcile old audio receipts against new source without an explicitly approved revision registry; blanket An replacement would corrupt article instruction.",
  "value": "Deliver internally consistent international beginner content and audio while preserving real prior QA, source lineage and zero-spend/shared quota boundaries.",
  "scope": [
    "Seven exact authored sources and current inventory/checker expectations; preserve An article and original counts",
    "Exact offline audio tool/tests plus regression/dossier/archive; source-version history and current-only QA eligibility",
    "Original F0/USD0 audio continuation after technical verification and renewed genuine current pilot QA"
  ],
  "dedupe_key": "beginner:r12b:international-fictional-people-places:source-revision-audio-history-20261028",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-review.md",
      "observation": "Direct owner people/place policy change, original human pilot acceptance and production hold; targeted inspection identifies semantic and historical-audio risks."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-preview.json",
      "observation": "Real pure checker dry-run passes projected8/64/32/24, seven changed sources and exact expected hashes; projected cumulative pilot909 and total4324 characters within unchanged caps."
    },
    {
      "kind": "code",
      "reference": "content/beginner/pilot/mg02-l1.lesson.txt:43",
      "observation": "Capitalized An is an English article here; source remains byte-identical, never globally renamed."
    },
    {
      "kind": "code",
      "reference": "content/beginner/pilot/mg01-l2.lesson.txt:165",
      "observation": "Original Bo audio explicitly spells B,O, requiring coordinated Ed/E,D and distractor explanation change."
    }
  ],
  "acceptance": [
    "Exact approved name/place/source/test/inventory hash changes only; MG02-L1 and An article unchanged; Ed spelling/evidence coherent.",
    "Same8 Lessons/64 activities/32 objectives/24 scripts/format1.2/45-minute planner contract and answer/skill/evidence semantics; no teacher/timing readiness inferred.",
    "Exact original-v1 inventory archive retained, old3 WAV/receipt/human-verdict prefixes unchanged, no budget reset or legacy-current confusion.",
    "TDD negative/positive version registry/source-proof/current-eligibility/shared-budget/per-slug take/idempotency/revocation tests and relevant pure regressions/lint/typecheck pass with independent review.",
    "Only after child technical acceptance verified may existing approved F0 audio resume with source after hashes, current real root/private ACL, recent genuine use evidence and no provider/tier/quota fallback. Actual new audio not prerequisite to child verification.",
    "Original Gate A remains implementing until all24 current actual selected hashes and human QA pass, including renewed three-file current-source pilot. B/C/CONTENT_READY/learner/DB remain untouched."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "Stop provider, hold production. Preserve both inventory revisions, all real WAV bytes, original and appended receipts/QA with shared counters. Explicit reviewed source commit revert only; no silent latest fallback, history loss or quota reset. No DB, ACL, account, Azure billing, recursive cleanup or old-file deletion."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-28-beginner-international-names.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct human user)",
    "reference": "mandate/reports/2026-10-28-beginner-international-names-human-approval.md",
    "at": "2026-10-28T01:28:23.279Z",
    "proposal_hash": "da36a4df8ba9a5c41c33327d9758e8be3ec164019b0f30d06db70be7ae714244"
  },
  "verification": [
    {
      "command": "pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/international-content.test.ts test/beginner-pilot/qualify-content.test.ts",
      "result": "passed",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-verification.md"
    },
    {
      "command": "node --test tools/beginner-pilot/audio-qualification.test.mjs",
      "result": "passed",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-verification.md"
    },
    {
      "command": "Foundation format25 and exact-version/projection/rubric11 focused Vitest regressions",
      "result": "passed",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-verification.md"
    },
    {
      "command": "API typecheck; focused ESLint; Node syntax; exact after9/archive/frozen10/protected18/retained history verification",
      "result": "passed",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-verification.md"
    },
    {
      "command": "Independent scoped code/content review and actual content-check media reconciliation with live-production denial while implementing",
      "result": "passed",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-verification.md"
    }
  ],
  "history": [
    {
      "at": "2026-10-28T01:26:14.886Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-28T01:26:15.123Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Evidence-backed exact content mapping and in-memory qualification reviewed; version-aware old/new audio safeguards and unchanged shared limits specified. Matching final human execution approval remains pending.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-review.md"
    },
    {
      "at": "2026-10-28T01:28:23.279Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Actual matching human approval received for exact MND-20261028-001 scope/hash; all frozen/baseline/allowlist/history checks passed before edits.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-human-approval.md"
    },
    {
      "at": "2026-10-28T01:28:23.499Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "approved",
      "to": "implementing",
      "reason": "Actual matching human approval received for exact MND-20261028-001 scope/hash; all frozen/baseline/allowlist/history checks passed before edits.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-international-names-human-approval.md"
    },
    {
      "at": "2026-10-28T01:38:34.804Z",
      "actor": "Codex",
      "from": "implementing",
      "to": "verified",
      "reason": "Approved technical source/history scope actually passes TDD/regression/exact hashes and independent review. Original WAV/receipts/human history preserved. No new human media acceptance inferred.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Authority and dependency

Owner requested foreign international places, then foreign people names. Preparation and exact dry-run complete; matching final hash execution approval still required. Follow-up to original authoring/A/storage mandates; their frozen scope/body/hash and B/C remain unchanged. Original v1 actual pilot QA accepted and retained, new-content production held. No authored edits or new provider calls.

## Frozen scope

mandate/reports/2026-10-28-beginner-international-names-scope.json
Scope SHA-256 LF: `4aba14712e289782438210020f9ff0080cb87cfbc4e9df712160dfb9dbc37a8d`.
Plan hash: `d888c220f0e1a495f0c116790ff790b49c0f713119dbed0bec794eadcb79a800`.
Review hash: `954c07312ee5fab69cd195537ae122fa5b103a62107c8805aa43b68d5e3f1336`.
Preview hash: `b44e4b1809fd395823889203ebcf95592cc2d87a359da290e56daf506636f220`.
Allowlist fingerprint: `86d00084511fa881f71b3eb00dbeecca9ca1dab2680be26b1c321a4489a25213`.
Baseline fingerprint: `a9849f981392ed54fbc44add1eeb9f222f1e0927285331da81214226d8951286`.

## Exact execution boundaries

Seven source files only, preserve MG02-L1/article An. People Linh/Bao/Nam/Mai/An(person)/Bo become Lily/Jack/Noah/Lucy/Adam/Ed; places Ha Noi/Hue/Da Nang/Can Tho become New York/London/Los Angeles/Hong Kong; preserve existing international names/Osaka. Update Ed/E,D and answer evidence. Exact9 old-to-new data hashes, original inventory archive, only scoped tests/offline tool/dossiers. No product logic/schema/config/DB/OS changes. Original v1 receipts/WAV/QA retained and counted; new current-source pilot uses take2 and genuine new human QA. Total forecast27 starts/4324 characters; cumulative pilot909/1000; never raise budget or paid fallback. Child technical verified before media; all24 actual current human selections before original A verified. No B/C, teacher sign-off, rehearsal, CONTENT_READY, publish, learner or merge/push/deploy.

## Rollback/unknowns

Stop/retain and keep production held if any source/version/receipt/approval/quota mismatch. Old human acceptance does not apply to new audio. A rejected new pilot may require separate budget decision because only91 pilot characters remain. Dry-run does not prove teacher adequacy, real pronunciation or timing; those gates remain actual-evidence dependent.
