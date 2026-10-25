# R1.2a P1 amendment review

2026-10-25. Capture/review only; no execution approval or product edits.
Baseline 47dab4efb54d33b207455762446185a3f516f1e5; branch codex/foundation-basic-readiness; worktree clean before capture.

## Evidence and origin

- [Recorded P1](2026-10-24-beginner-r12a-verification.md#review-and-remaining-limits): previous independent in-memory reproduction, NOT rerun this turn.
- [Generic service](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts): lines32-58 role/receipt/audit; lines116-139 target reread, draft deletion, current version archive and pointer clearing. Static inspection confirms missing Beginner guard.
- [Controller](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.controller.ts): POST admin/content-lifecycle/:kind/:id/remove forwards to that service; Admin role alone does not authorize Beginner.
- Git origin:6eed8a0 (history-safe content removal), predating R1.2a; no R1.2a commit modified this service. It is an uncovered existing route, not the new supersession branch.
- Current R1.2a slices:5fec919,0b09975,b6f479b,0646bec,959573d,fd09292; report47dab4e. [Original scope](2026-10-24-beginner-r12a-scope.json) excludes BOTH proposed product paths. Original plan55 requires generic format1.2/ownership/archive denial.
- Frozen original plan/review/allowlist/baseline and approval hashes were recomputed before capture. Original pre-R1.2a source baseline must not be reused as current post-implementation baseline.

## Reachable mutation inventory

| Path | Boundary / disposition |
| --- | --- |
| remove(kind=lesson), receipt replay | Active role/requestHash only; check existing Beginner target before returning receipt. |
| removeImport, no history | contentImport.deleteMany; deny bound/disguised Beginner or format1.2 before delete. |
| removeImport, current history | LessonVersion ARCHIVED, Lesson pointer=null, import ARCHIVED; recheck all actual ownership/format after locks before DML. |
| removeImport, older/non-current/archived import | Still mutates import/audit/receipt; guard even when no pointer/version write occurs. |
| remove success audit/receipt | Unreachable on denial; advisory/row locks and reads are not content DML. |
| removeVersioned topic/bridge/mock | Separate IELTS models; retain authorized legacy behavior unchanged. |
| ContentPublisherService.archive | Existing1.2 and actual Lesson ownership checks before/inside transaction; read-only dependency. |
| ContentPublisherService.publish prior archive | Scoped authorization/exclusive Beginner policy keeps V1; legacy replacement archives prior; unchanged. |
| AdminCurriculumCommandService path/level/mission archive | Existing checkBeginnerCommand before receipt and transaction; curriculum node archival, not this LessonVersion writer; unchanged. |
| CurriculumService draft update; offline seeds | Draft editing is not archive. Offline seed writers prohibited to execute and not newly safety-certified. |

Bounded runtime source search checked LessonVersion archive/current pointer writers and relevant curriculum archive callers. This is not an exhaustive repository audit or live concurrency proof.
Generic Beginner denial applies to all environments/both Admin roles; author/publish grants are not archive grants. No new authorized Beginner withdrawal route is proposed.

## Self-review and scope decisions

The [addendum](../../docs/superpowers/plans/2026-10-25-beginner-r12a-p1-lifecycle-amendment.md) reuses canonical architecture and keeps publisher/supersession/IELTS code read-only.
Previous report suggested dedicated config collection edits. Current user scope allows only service+spec, so use an ignored temporary runner; tracked config edits require new approval.
Both actual Lesson relationships must be checked, including disguised legacy source. Preserve unbound legacy draft deletion for unrelated same-slug publication and existing receipt/conflict semantics.
No dynamic request, DB connection or fresh runtime reproduction was performed. Independent implementation review is required AFTER future code change; none is claimed now.

## Governance and hash binding

[Scope lock](2026-10-25-beginner-r12a-p1-amendment-scope.json) records algorithms, exact two-file allowlist, current raw-byte source/dependency baseline, frozen artifacts and plan/review hashes.
The fifth lock is proposalHash from Mandate CLI model.proposalHash; bookkeeping lifecycle fields do not change it.
Governance states: "Implementing/verified/archived scope is frozen; capture a distinct approved follow-up if needed." New linked CLI item therefore has approval=null;003 remains implementing unchanged,001 captured/null,002 verified.
User requested preparing an amendment, explicitly not matching execution approval. No old approval is transferred.

## Status and remaining gates

P0: none newly observed in bounded review, not proof of absence. P1: lifecycle bypass remains OPEN pending approval/implementation/tests. P2: no new confirmed finding.
Unit/lint/typecheck/build/independent implementation review: NOT RUN, pending matching approval. Previous1379 passing checks are historical, not fresh evidence.
Full R1.2a DB integration/E2E, actual fixture publication/registry IDs/hashes and manual environment qualification remain BLOCKED by missing separate permissions even if this P1 later passes unit checks.
No rollback performed. Proposed commit-only revert restores P1 and cannot be described as release-safe.
