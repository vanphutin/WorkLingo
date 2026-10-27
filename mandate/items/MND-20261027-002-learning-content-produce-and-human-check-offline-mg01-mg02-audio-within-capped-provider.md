---
{
  "schema_version": 1,
  "id": "MND-20261027-002",
  "status": "implementing",
  "created": "2026-10-27",
  "updated": "2026-10-27T15:46:36.657Z",
  "title": "Produce and human-check offline MG01 MG02 audio within capped provider and storage authority",
  "type": "learning-content",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "Twenty-four listening bindings lack actual audio. Current Portal evidence shows an existing Free/F0 SpeechServices resource in East Asia under owner-reported Azure for Students, conflicting with the initial paid/eastus proposal.",
  "value": "Prepare version-bound educational audio qualification using the existing Free resource with USD0 spend and no resource or subscription changes.",
  "scope": [
    "Separate gate A child under frozen implementing MND-20261027-001; no authority inherited from A/B/C or R1.2a",
    "Exact files, protected baseline, provider/budget/storage/actor limits in mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json",
    "Gate-specific tasks, budget, acceptance and rollback are frozen in the linked plan and scope; no other gate execution rights."
  ],
  "dedupe_key": "beginner:r12b:qualification:gate-a:offline-20261027",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-qualification-preapproval-review.md:1",
      "observation": "Read-only audit verifies missing media/human/timing evidence and applicable product boundaries."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md:1",
      "observation": "Gate-specific tasks, concrete acceptance, limits, dependencies, rollback and owner decisions are proposed."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json:1",
      "observation": "Exact allowlist, protected baseline, environment and budget boundaries captured before approval."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md:1",
      "observation": "Owner-provided screenshot shows Free SpeechServices and eastasia endpoint; owner reports student educational use and requests document alignment only."
    }
  ],
  "acceptance": [
    "Correct new A approval/hash/root/F0 resource/eastasia endpoint/quota/educational-use preflight before requests; no fallback, secrets or DB access.",
    "MG01-L1 three actual candidate files pass automated and real human audio QA before expanding.",
    "All24 selected WAVs valid PCM16 mono24000Hz, actual byte checksums/fingerprints/applicable educational-use basis, listening QA100%, no missing/stale/duplicate mapping.",
    "USD0 spend, frozen request/character/take caps and sequential rate limits hold; quota/429 stops without automatic retry, upgrade or paid student-credit fallback.",
    "Offline educational media does not grant commercial production, redistribution, DB artifact/publication, B/C approval or readiness; Azure subscription/resource unchanged."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": false,
    "external_effect": true,
    "rollback": "Stop provider calls; mark rejected/superseded manifest selections, retain actual audit and prior selected bytes. No app storage/DB/bound version mutation. Cleanup only verified run-owned unselected files, explicit owner cleanup decision after references checked."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct human user)",
    "reference": "mandate/reports/2026-10-27-beginner-r12b-gate-a-human-approval.md",
    "at": "2026-10-27T15:46:36.429Z",
    "proposal_hash": "0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-27T12:08:09.269Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-27T12:08:19.180Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Bounded read-only preapproval reviewed with independent gate rights, protected source hashes and exact allowlists. High-risk external/human-data scope needs matching human approval; no execution authorization recorded.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-qualification-preapproval-review.md"
    },
    {
      "at": "2026-10-27T12:39:07.879Z",
      "actor": "mandate-steward",
      "from": "triaged",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-27T12:39:08.081Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Bounded read-only preapproval reviewed with independent gate rights, protected source hashes and exact allowlists. High-risk external/human-data scope needs matching human approval; no execution authorization recorded.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-qualification-preapproval-review.md"
    },
    {
      "at": "2026-10-27T15:46:36.429Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Matching Gate A F0 approval received in this conversation; direct supplemental private env/account inspection and exact resource-key association confirmed. No paid fallback or B/C/product/database authority.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-gate-a-human-approval.md"
    },
    {
      "at": "2026-10-27T15:46:36.657Z",
      "actor": "WorkLingo product owner (direct human user)",
      "from": "approved",
      "to": "implementing",
      "reason": "Matching Gate A F0 approval received in this conversation; direct supplemental private env/account inspection and exact resource-key association confirmed. No paid fallback or B/C/product/database authority.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-gate-a-human-approval.md"
    }
  ]
}
---

## Gate A resource alignment only

Child of MND-20261027-001. Follow docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md and mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json first. Original shared master remains frozen historical baseline for B/C. Only Gate A paid/eastus/positive-spend assumptions are superseded. No execution or Azure/account/provider operation is authorized by this document revision.

## Frozen approval bindings

Plan SHA-256(LF): dac1a92495150ac1036eeeff5e56452b390ed545230d49f0362ae6f660ea96d2
Original master SHA-256(LF): 9436534b072f0c35eb774ced8cafdbfa52936c494bbe1a10eb8668c8d0457289
Inventory SHA-256(LF): 03631d82ad429819e84a41f123955f49c0edf593a679cf3fd735d2f876defbe1
Review SHA-256(LF): dbe49e58f78c8c33b7195a924a2b46263b8e0fb0a1ee7b111d061a8f4844e594
Scope SHA-256(LF): 5332cc7d5fe2b991842562194c6eb68841be095d8c7d2655222a47fb43c91224
Baseline fingerprint: e7c1b382b302dc73f30ad25766d06e8b9ba6b0bca0b907ddc9c54418cc369909
Exact allowlist fingerprint: de6baff5ca281ee61f07555ca8701542bdd570d1b9a22b9d892f86012bfd62f0

## Authority and remaining evidence

Existing Free/F0 SpeechServices, eastasia real-time endpoint, owner-reported student learning purpose, USD0 only. No Azure tier/subscription change, paid/S0/student-credit fallback, DB/env/live Admin API, import/publication/learner/product/OS/merge/push/deploy. Key association, remaining free quota, East Asia voice availability, applicable educational-use basis and actual pronunciation/audio QA still need preflight/evidence after separate matching execution approval. No commercial-output rights are inferred. Existing 26 protected hashes and future allowlist unchanged; no source correction right. B/C unchanged.

## Rollback

Stop provider calls; mark rejected/superseded manifest selections, retain actual audit and prior selected bytes. No app storage/DB/bound version mutation. Cleanup only verified run-owned unselected files, explicit owner cleanup decision after references checked.
