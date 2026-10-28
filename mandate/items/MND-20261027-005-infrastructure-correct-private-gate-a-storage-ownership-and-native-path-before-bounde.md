---
{
  "schema_version": 1,
  "id": "MND-20261027-005",
  "status": "verified",
  "created": "2026-10-27",
  "updated": "2026-10-28T01:08:40.545Z",
  "title": "Correct private Gate A storage ownership and native path before bounded Azure audio continuation",
  "type": "infrastructure",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 3,
  "problem": "Gate A physical-path preflight rejects the approved logical C: root because MSIX redirects it to LocalCache; inherited capability/read grants also violate the existing private-root policy. Audio remains zero calls/zero files. Original A is frozen implementing and cannot safely be hand-edited.",
  "value": "Unblock bounded original F0 audio qualification using a dedicated native private NTFS root while preserving no-spend, source, budget, human QA and production boundaries.",
  "scope": [
    "Gate A offline storage preflight and fresh private D: directory owner/ACL only",
    "Exact existing audio tool, tests and QA dossier; dual authority and deterministic external-root mappings",
    "Resume original USD0 F0 pilot and full audio QA only after storage verified and human pilot approval"
  ],
  "dedupe_key": "beginner:r12b:gate-a:msix-private-storage-d-root-dual-authority-20261027",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-review.md",
      "observation": "Read-only native path/ACL/SID/NTFS audit confirms current blocker and absent proposed D: root; no existing storage-correction mandate."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-gate-a-verification.md",
      "observation": "Original Gate A software44 pure tests pass; no actual audio/request; native alias and inherited ACL prevent live execution."
    },
    {
      "kind": "code",
      "reference": "tools/beginner-pilot/audio-qualification.mjs:255",
      "observation": "Current assertSafe uses native directory-chain and SID ownership/private ACL policy; frozen scope equality must be adapted through explicit dual authority, not bypassed."
    }
  ],
  "acceptance": [
    "Matching dual approval/hash/frozen/source baseline before edits or OS setup, no scope widening.",
    "TDD negative/positive dual-authority/root/ACL/history/QA tests, original pure regressions, lint and syntax pass.",
    "Real current SID, exact native D: root, trusted owner/protected DACL and synthetic exclusive probe/readback/cleanup verified; parent D: ACL unchanged.",
    "All old C: metadata and existing objects unchanged; no broader ACL/OS/production or key exposure.",
    "Child verified only for setup/software acceptance. Original A may resume with unchanged actual F0/eastasia/Jenny/USD0/limits after child verified and recent genuine evidence.",
    "Software/lifecycle policy preserves original A final acceptance and refuses premature A/B/C/content readiness promotion; real24-file QA is NOT a prerequisite to child storage verification."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "Stop network and preserve receipts/candidates/audit. No recursive cleanup. Remove only exact synthetic probe and newly created empty run-owned directories after owner/file-identity checks. Retain actual media and old C: evidence; no shared ACL, DB, Azure or account changes. Revert source commits explicitly if needed."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-27-beginner-gate-a-storage-amendment.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct human user)",
    "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-human-approval.md",
    "at": "2026-10-27T16:28:42.294Z",
    "proposal_hash": "96a4ca63b69ec052a0bf203b81773d1dc1d6256d2d1fd291deeafb007b1e45a1"
  },
  "verification": [
    {
      "command": "node --test tools/beginner-pilot/audio-qualification.test.mjs",
      "result": "passed",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md"
    },
    {
      "command": "pnpm exec eslint tools/beginner-pilot/audio-qualification.mjs tools/beginner-pilot/audio-qualification.test.mjs; node --check on both files",
      "result": "passed",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts",
      "result": "passed",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md"
    },
    {
      "command": "node tools/beginner-pilot/audio-qualification.mjs prepare --gate A --storage-only; actual full tree/native/SID/ACL/probe/parent-ACL/old-history and read-only resume checks",
      "result": "passed",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-verification.md"
    }
  ],
  "history": [
    {
      "at": "2026-10-27T16:24:39.555Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-27T16:25:16.042Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Read-only evidence and bounded builder review support the dedicated private D: root and exact dual-authority scope. Preparation only; human matching execution approval is pending.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-review.md"
    },
    {
      "at": "2026-10-27T16:28:42.294Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct matching approval received for the exact MND-20261027-005 proposal and storage/audio continuation boundaries. All frozen hashes/baseline/allowlist passed before implementation.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-human-approval.md"
    },
    {
      "at": "2026-10-27T16:28:42.555Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "approved",
      "to": "implementing",
      "reason": "Direct matching approval received for the exact MND-20261027-005 proposal and storage/audio continuation boundaries. All frozen hashes/baseline/allowlist passed before implementation.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-gate-a-storage-human-approval.md"
    },
    {
      "at": "2026-10-28T01:08:40.545Z",
      "actor": "Codex",
      "from": "implementing",
      "to": "verified",
      "reason": "Matching child storage/software acceptance actually passed on the exact D: root after TDD and independent review corrections. No audio or full Gate A readiness inferred.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Authority and dependency

Follow-up to MND-20261027-002 (implementing). Existing A approval and all B/C/source gates remain unchanged. User authorized preapproval preparation and expressed intent to perform ACL/audio/Azure continuation; matching final new-hash approval is still required. No OS/provider action has been executed.

## Frozen scope

Scope: mandate/reports/2026-10-27-beginner-gate-a-storage-scope.json
Scope SHA-256 LF: `2461ff53c3e3a7a905c156cac18d73c4be55764d6f9c5ef68df93cfbcb789813`.
Plan hash: `e31e0d5fd80e700e977870a66bc34284dc8fcff5f1071b5fe97fd75cb6b65233`.
Review hash: `356a86c7be982323093d59624715a7f6c253ad70cca33e79b2bf51285d308990`.
Allowlist fingerprint: `e85aa0f405fecd1a2c71f5cf850b0900fffd94ad1856f5d3ab4d8b401ba45dbe`.
Baseline fingerprint: `8b0a6eebb1b5ef1715032a79dd8766f863b9c111cf5969037dd0f335f9760c4c`.

## Execution boundary

Only new D:/WorkLingoQualification/r12b-20261027/A storage and exact new ancestors/subdirectories; owner ASUS SID S-1-5-21-3809754005-2092998575-1059868825-1001 with SYSTEM/Administrators only. Never alter D: or existing C: objects/ACLs. Modify only exact two tool/test files and QA dossier. Original resource, USD0 and shared request ceilings unchanged. Setup/software requires matching child approval; actual provider continuation requires child verified plus original A implementing and approved. Original A pilot human listening must precede expansion; all selected audio needs genuine QA. No DB, paid/S0 fallback, production publication, learner, B/C, worker/UAC/policy changes or merge/push/deploy.

## Unknowns and rollback

Actual D: packaged-process write/access/native resolution and private ACL acceptance remain untested; stop if they fail. No guessed approval, waiver or numeric remaining Azure quota. Preserve immutable media/audit and old metadata; exact empty-directory/probe rollback only. See linked plan for TDD, OS preflight and continuation commands.
