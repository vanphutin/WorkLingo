# Correct bounded Beginner pilot tasks while preserving historical source and audio evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for later approved execution. This capture does not start execution.

**Goal:** Improve seven real Lessons without adding tasks,changing audio or fabricating review/provenance.

**Architecture:** Independent successor; exact scope and baseline JSON below govern writes. Existing qualified-human Gate B remains frozen. Offline evidence only.

**Tech Stack:** Existing TypeScript/tsx/Vitest; JSON/Markdown qualification artifacts;no schema/DB/provider changes.

**Spec:** mandate/reports/2026-10-28-beginner-successors-capture-authorization.md; mandate/reports/2026-10-28-beginner-successor-content-corrections-scope.json; existing docs/superpowers/plans/2026-10-24-beginner-implementation.md and docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md.

## Global Constraints
- CAPTURE_ONLY now; execution requires future matching proposal approval and CLI lifecycle.
- No DB/.env/provider/network/OS/publication/enrollment/Gate C/merge/push/deploy. No product or schema writes.
- Do not modify any existing mandate, old human claims or A evidence; no old verdict transfer.
- All existing B/authoring/R1.2a lifecycle states unchanged. Runtime/provider tests NOT_RUN in capture.

## Exact files
{
  "modify": [
    "content/beginner/pilot/mg01-l1.lesson.txt",
    "content/beginner/pilot/mg01-l2.lesson.txt",
    "content/beginner/pilot/mg01-l3.lesson.txt",
    "content/beginner/pilot/mg01-l4.lesson.txt",
    "content/beginner/pilot/mg02-l1.lesson.txt",
    "content/beginner/pilot/mg02-l3.lesson.txt",
    "content/beginner/pilot/mg02-l4.lesson.txt",
    "apps/api/test/beginner-pilot/qualify-content.test.ts",
    "apps/api/test/beginner-pilot/international-content.test.ts",
    "apps/web/src/features/learning-session/activity-renderers/writing-activity.test.tsx"
  ],
  "create": [
    "docs/qualification/beginner-pilot-ai-correction-bindings.json",
    "docs/qualification/beginner-pilot-ai-correction-review.md"
  ],
  "fingerprint": "0a91b1c41574e7bc6f869891baddd736f2dcffc540ee859d9b0f98c979b145b1"
}

## Dependencies
- P1 engineering investigation must complete first; if unresolved,offline authoring can proceed only after owner acknowledges finding,real learner evaluation remains blocked.
- New-bundle analysis may be prepared after source correction; AI-led sign-off requires policy matching approval; do not depend on old verdicts.

## Review Focus
- Hash drift: fail closed; legitimate approved dependency outputs require exact successor binding,not latest fallback.
- Characterization PASS is not desired-contract PASS.
- Old audio reuse needs exact unchanged script/WAV and explicit new-source binding.
- AI decision is not teacher signature or measured learner performance.
- Missing model/phonetic/learning evidence blocks final qualification.

## Tasks after matching approval only

### Task 1
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Write red tests for exact variants,wrong facts,counter and bounded transfer/copy edits.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Write red tests for exact variants,wrong facts,counter and bounded transfer/copy edits.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

### Task 2
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Apply only exactFieldEdits from scope using slug+field and baseline guards;no global replacement;prompt and QUESTION separate.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Apply only exactFieldEdits from scope using slug+field and baseline guards;no global replacement;prompt and QUESTION separate.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

### Task 3
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Run green checks,recompute task/source/bundles and audio reuse binding;report Pre-A1 load uncertainty and preserve histories.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Run green checks,recompute task/source/bundles and audio reuse binding;report Pre-A1 load uncertainty and preserve histories.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

## Acceptance
- Only exact25 field edits in seven sources; MG02-L2 unchanged;64 Activities32 Objectives41 lexical blocks24 scripts/WAV retained.
- MG02-L4 aligns objective/card/prompt/QUESTION/model/task rubric, retrieves I/you/from; assess instruction load for Pre-A1 without asserting measured suitability or45-minute timing. Overload evidence requires follow-up,not filler or extra Activities.
- Ten short variants preserve all task facts; complete versus missing/wrong name/letters/item/quantity negative tests. Contractions/Unicode apostrophe/whitespace/punctuation tested in actual writing component. No blanket minimum lowering.
- Replace only C.Minh distractor; correct answer/transcript unchanged. Four pending learner-facing fields only; eraser assessed-support,please pragmatic-support,instruction labels distinct; no fabricated master mapping/CEFR/teacher approval.
- Recompute raw source,task-rubric,bundle hashes with canonical rule; task text versioned in new bundle. Aggregation registry/code stays v1 unless separately authorized engineering policy requires otherwise.
- Recheck all24 script/WAV hashes and record explicit successor source-to-script-to-WAV reuse binding in new report; preserve old A inventory/receipts/history.
- TDD red/green, parser/planner/rubric/DTO/count/content tests and component tests plus relevant lint/typecheck; no skipped tests labeled PASS. Old historical hash test remains meaningful rather than deleted.
- Fresh exact-bundle AI analysis after corrections; do not reuse prior PASS. Formal sign-off only under effective approved policy or original qualified-human criteria; content technical PASS alone is not qualification.

## Commands after approval
- `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts test/beginner-pilot/international-content.test.ts`
- `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --all`
- `pnpm --filter @worklingo/web exec vitest run src/features/learning-session/activity-renderers/writing-activity.test.tsx`

## Rollback
Revert only successor content/test changes by explicit inverse commit;append report withdrawal and restore prior current projection;preserve all historical sources in Git,A artifacts and human/AI claims. No reset/deletion.

## Capture review
Plan self-reviewed against owner capture authorization. Exact changes/tests/dependencies are in frozen scope. No runtime acceptance has run. Cost USD0;effort m is an estimate,not actual duration.
