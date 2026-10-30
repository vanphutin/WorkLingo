---
{
  "schema_version": 1,
  "id": "MND-20261030-002",
  "status": "implementing",
  "created": "2026-10-30",
  "updated": "2026-10-30T01:42:01.706Z",
  "title": "Repair authentication CSS module pure selectors blocking the R12b production build",
  "type": "bug",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "s",
  "impact": 3,
  "problem": "Sanitized Next webpack production build fails at auth.module.css:28 because three global-only introduction selectors have no local class or id;the same bytes exist at main752c19c.",
  "value": "Restore safe frontend build verification without changing auth behavior,layout,provider,privacy or content policy.",
  "scope": [
    "Modify only apps/web/src/features/auth/auth.module.css and additive apps/api/test/beginner-pilot/autonomous-governance.test.ts for exact successor bookkeeping.",
    "Create mandate/reports/2026-10-30-r12b-auth-css-proposal.json and CLI-managed new item/INDEX;document results in existing001finalreport.",
    "No other product/content/provider/DB/env/secrets/infrastructure/release actions;production build remains a gate."
  ],
  "dedupe_key": "r12b:auth-css-modules-global-only-build:752c19c",
  "evidence": [
    {
      "kind": "document",
      "reference": "apps/web/src/features/auth/auth.module.css:28",
      "observation": "Global-only h1,p,eyebrow selectors rejected by Next16.3.8webpack CSS Modules pure mode;baseline752c19c reproduces identical source."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-30-r12b-mission-authorization.md:3",
      "observation": "Direct owner mission authorizes scoped newly found ordinary technical bug fixes and regression/build checks;no micro approval needed."
    }
  ],
  "acceptance": [
    "Three introduction selectors include the existing local content anchor through auth-panel:has(.content),preserving intended descendants and declarations.",
    "Sanitized no-env Next production build no longer reports pure-selector errors;frontend unit suite/typecheck/lint stay green;other build blockers reported honestly.",
    "Additive governance validates exact new001plus002paths,proposal approval and baseline CSS hash;old frozen scope/history preserved.",
    "Independent AI review verifies scope/selector semantics;record exact commands/results and localcommit with mandateID."
  ],
  "risk": {
    "level": "low",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Reviewed local revert of this one CSS source change;preserve reports and history;no production action."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r12b-autonomous-completion.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner",
    "reference": "mandate/reports/2026-10-30-r12b-mission-authorization.md",
    "at": "2026-10-30T01:42:01.404Z",
    "proposal_hash": "a7b6d5e55bab6aba854823074891eafd85dbf72da19bb99a8b6527511427653d"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-30T01:41:49.448Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T01:42:01.097Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Confirmed preexisting production build failure;finite technical successor under direct autonomous mission.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r12b-mission-authorization.md"
    },
    {
      "at": "2026-10-30T01:42:01.404Z",
      "actor": "WorkLingo product owner",
      "from": "triaged",
      "to": "approved",
      "reason": "Matching current direct human authority WL-R12B-AUTONOMOUS-001 sections0,8,11 covers this bounded ordinary build bugfix;no policy/budget/privacy or release waiver.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r12b-mission-authorization.md"
    },
    {
      "at": "2026-10-30T01:42:01.706Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Implement exact successor CSS and additive governance only,using existing plan Task4 new defect handling.",
      "event": "transition",
      "reference": "docs/superpowers/plans/2026-10-30-r12b-autonomous-completion.md"
    }
  ]
}
---

## Authority and exact baseline

WL-R12B-AUTONOMOUS-001 sections0,8,11 explicitly authorize ordinary technical bugfixes,new successors and full build verification. Current human instruction is recorded in mandate/reports/2026-10-30-r12b-mission-authorization.md.001 remains frozen;this separate successor covers a newly observed baseline build defect.

Baseline CSS raw SHA256 81a3c7cd819da788a3a2945dabf7b377c7e9f92f8bb1bcc981b5271dad2e1591 at main752c19c and current88d6379. Scope exact4source/governance paths listed above plus this CLIitem/INDEX;no wildcard.

## Implementation and verification

Scope existing three global introduction rules under :global(.auth-panel):has(.content) > :global(.auth-introduction);declarations unchanged. Existing production compilation is RED acceptance;no redundant CSS-text unit test. Rebuild sanitized source snapshot with no env files or provider/DB;run auth/fullWeb regressions as warranted and independent review.

## Unknowns

Default Turbopack sanitized snapshot initially rejects node_modules junction outside root;this harness limitation is distinct from confirmed webpackCSSfailure. No target/deploy or rollback evidence invented.
