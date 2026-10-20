---
{
  "schema_version": 1,
  "id": "MND-20261019-001",
  "status": "captured",
  "created": "2026-10-19",
  "updated": "2026-10-19T16:12:26.563Z",
  "title": "Unify WorkLingo visual materials and accessibility fallbacks for Liquid Glass migration",
  "type": "ux",
  "owner": null,
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "The current frontend has a teal V2 token system alongside feature-specific literal colors and overrides, isolated backdrop filters, and no reduced-transparency or increased-contrast CSS branch. The feedback topup declares modal semantics without a focus lifecycle in its component. The requested blue Liquid Glass migration therefore needs shared material ownership, accessible semantic colors and behavior-preserving route verification rather than page-local overrides.",
  "value": "Learners retain readable lesson/exam content and keyboard access while learner/Admin controls become consistent across all 34 existing routes. Acceptance is measured by route evidence, composite contrast, state-preservation tests and accessibility fallbacks, not screenshot appearance alone.",
  "scope": [
    "Existing frontend token/theme system and shared navigation/control materials",
    "34 inventoried App Router page routes and global error/not-found states",
    "Presentation-only reduced-transparency preference and feedback overlay accessibility",
    "Frontend behavior-preservation, responsive, visual and accessibility verification",
    "Existing V2 implementation plan addendum, with no backend, business-policy or data changes"
  ],
  "dedupe_key": "frontend:liquid-glass-material-consistency-and-accessibility-fallbacks",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/web/src/styles/tokens.css:1",
      "observation": "On 2026-10-19 at 7a5e383763ccd63c4befa4ab07a5559ba7cabfbe plus preserved dirty working changes, the existing root palette uses warm-paper/teal semantic variables rather than the requested blue/material API. Existing theme infrastructure is reusable."
    },
    {
      "kind": "code",
      "reference": "apps/web/src/features/learning-session/evaluation-feedback.tsx:270",
      "observation": "Current dirty-source topup declares role=dialog and aria-modal=true; full component inspection found no keyboard/focus lifecycle handling. This is a source finding, not authenticated browser reproduction."
    },
    {
      "kind": "code",
      "reference": "apps/web/src/app/(learner)/settings/settings.css:340",
      "observation": "Current untracked settings CSS removes the select focus-visible outline with important and reduces surrounding controls to 34px. Browser focus/contrast reproduction remains pending."
    },
    {
      "kind": "document",
      "reference": "docs/ui-redesign/01-ui-audit.md:1",
      "observation": "Fresh discovery distinguishes measured 369 passing unit tests/typecheck and 18 public Chromium captures from lint/format baseline failures and protected/cross-browser unknowns. Static scan records material/contrast-mode gaps and existing cascade debt."
    },
    {
      "kind": "document",
      "reference": "docs/ui-redesign/02-redesign-plan.md:1",
      "observation": "Approval-pending addendum records the user's Liquid Glass direction, accessible palette adjustment, exact scope, unchanged business boundaries, staged verification and rollback proposal. It is not evidence of implementation approval."
    }
  ],
  "acceptance": [
    "Reuse the existing token/theme source and compatibility aliases; implement regular/clear/tinted/solid material variants with readable solid content and no duplicate theme system.",
    "Verify normal text 4.5:1, large text 3:1 and applicable UI boundaries 3:1 over actual composites; provide solid fallbacks for unsupported blur, reduced transparency and increased contrast.",
    "Verify keyboard focus entry/containment/Escape/restoration for modal feedback without changing evaluation, retry, recording or session business logic.",
    "Verify all 34 inventory routes or explicitly approved exceptions, both themes and required 390x844, 768x1024, 1440x900 viewports, with draft/timer/permission/URL invariants preserved.",
    "Run relevant lint/typecheck/tests/build/E2E and cross-browser checks or report concrete blockers; distinguish initial dirty-source failures and historical reports from new-run results.",
    "Obtain explicit human approval of the Phase 0 plan before UI implementation; do not infer publication, release, backend or data-change authority."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "After explicit implementation approval, isolate reviewed starting working-tree content and make scoped UI commits. Revert only known migration commits while retaining legacy token aliases until all consumers are migrated; keep theme key compatibility and never reset unrelated user changes. No schema or learning-data rollback is needed for the proposed UI-only scope."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-14-ui-redesign-v2.md",
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-19T16:12:26.563Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    }
  ]
}
---

## Analysis

Source baseline and fresh checks are in docs/ui-redesign/01-ui-audit.md; the proposal is an addendum to the existing V2 plan, detailed in docs/ui-redesign/02-redesign-plan.md. Source hashes and public browser observations are preserved as evidence. Counts of CSS literals are maintenance observations, not automatic accessibility/performance failures.

## Value and alternatives

Extend existing semantic tokens and migrate shared owners before feature pages. Reject a separate application and global override dump. Preserve solid lesson/editor/table content, with glass limited to navigation and controls.

## Deduplication

Searched active/archive with liquid-glass/theme/UI-redesign and semantic-token/accessibility terms and read existing item scopes. MND-20261015-001 concerns Intermediate workload, listening/evidence policies and content governance; this proposal explicitly excludes those behavioral/data changes. MND-20261014-001 concerns decision identifiers. No matching visual-material mandate found. Reuse the V2 plan and canonical roadmap rather than create a sprint board.

## Unknowns and dependencies

Protected-route screenshots, composite contrast, full keyboard/zoom, Firefox/WebKit, performance and current full E2E/build are not verified. Baseline lint has an unused curriculum variable; baseline whitespace check reports an existing feedback-test EOF blank line. Preserve their ownership. Browser/runtime prerequisites must be arranged for isolated QA before technical completion.

## Authorization

The human requested Phase 0 and a plan approval gate. Only this audit/proposal/documentation scope is authorized now. No implementation approval is recorded; status remains captured. No external publication, data change or scheduled service is proposed.
