# Safe WorkLingo integration implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans, inline implementation and one independent final review.

**Goal:** Preserve outstanding approved functionality and Liquid Glass in a separately verified candidate; never update main.
**Architecture:** Integration branch from main7a5e383. Preserve full source histories by ordinary merges; semantic frontend reconciliation keeps selected new behavior and verified presentation. Private original backup is reference only, never tracked.
**Tech Stack:** Existing pnpm/TypeScript/Next/React/Nest/Prisma/PostgreSQL/Playwright.
**Spec:** Human attachment aaaa2463-40f8-435a-8521-b3c8301bb672, plus direct human answers2026-10-20: integrate all audio-dashboard-v2; migrations only disposable test DB; keep inline feedback; defer Intermediate/Luminary; include IELTS beta docs.

## Global constraints

- Only D:/Projects/WorkLingo-Integration writable; original and Liquid Glass source/index/status/HEAD preserved.
- Branch integration/worklingo-release-candidate; main7a5e383 and LGcc09a75 fixed. No fetch/push/deploy/main merge/rewrite/cleanup.
- Backup D:/Projects/WorkLingo-Integration-Backup private, ACL user/SYSTEM only; hashes verified before transplant. No credentials/private data in evidence.
- No blanket ours/theirs or original dirty patch overwrite. Relevant business changes retain provenance; UI remains Liquid Glass. Explicit human decision keeps feedback inline instead of dirty topup.
- Audio branch committed history approved; its own dirty worktree is inventoried, NOT silently imported. New business behavior or non-test migration requires human decision.

## Review Focus

1. API/schema/topic-first lifecycle mismatch: test selected contracts and real disposable migrations/flows.
2. Shared shell/CSS/learning workspace merges must not reset drafts or hide new navigation: owner tests and browser interaction.
3. Dirty original UI vs Liquid Glass: each file disposition and hash, no unaccounted work loss; feedback inline explicitly retained.
4. Test-only material/backup/credentials must not ship: import/secret/scope checks.
5. Protected indexes/refs/ignored originals may change externally: final fresh manifest comparison, report change rather than overwrite.

### Task 1: Inventory and verified preservation

Files: docs/integration/commit-inventory.md,dirty-source-inventory.md,evidence/inventory.json; private preservation helper outside Git.
Produces: exact refs/commit lists/patch-equivalence, source snapshot manifest, selected/deferral decisions.
- [ ] Record every local/remote-tracking ref and worktree status; no fetch.
- [ ] Verify private binary patches/raw files/ignored data/modes/index/status/hashes and restricted ACL.
- [ ] Save redacted metadata and dependency order; expected52 dirty/1295 protected only if actual observed values match.
- [ ] Gate: read-only preservation verifier PASS and branch inventory complete; commit metadata/plan only.

### Task 2: Approved branch history integration

Consumes Task1 exact refs/snapshot. Files: selected branch paths and docs/integration/conflict-resolution.md.
Order: main→audio-dashboard-v2→IELTS beta docs→Liquid Glass; latest feature/API semantics established before presentation merge. May adjust only with logged actual-history reason.
- [ ] Merge approved audio41 commits, inspect conflict hunks/stages and preserve meaningful main polish.
- [ ] Merge beta3 doc commits; retain governance compatibility.
- [ ] Merge LG41 commits; reconcile overlapping handlers/JSX/CSS with both feature tests and LG owner tests.
- [ ] Existing test failures identify mismatches before fixes; add focused tests for semantic decisions before code where new behavior is needed.
- [ ] Gate: no conflict markers, shared packages build/types and targeted affected tests; atomic history-preserving merge commits.

### Task 3: Original dirty reconciliation

Consumes Task1 private raw snapshot plus Task2 integrated owners.
Files: all actual52 original paths mapped in docs/integration/dirty-source-inventory.md; only valid missing hunks imported.
- [ ] Compare base/dirty/current each owner; classify no-overlap/already-present/complementary/textual/semantic/add-add/binary.
- [ ] Preserve legitimate curriculum/duration/localization functionality; feedback inline by explicit human decision. Preserve replaced UI/archive evidence privately; don't resurrect competing CSS/DS.
- [ ] Source-dependent test changes RED→GREEN; targeted component/API/browser tests.
- [ ] Gate: every dirty path has backup hash, exact disposition, relevant test or explicit deferral; no secret/backup source tracked.

### Task 4: Candidate qualification and handoff

Files: docs/integration/integration-qa.md,candidate-readiness.md,merge-handoff.md,evidence/; checkpoint status in docs/integration/README.md.
- [ ] Fresh candidate web tests/lint/types/i18n/productionbuild, scoped backend/contracts tests, relevant owner/browser/Cross3/reflow/a11y and actual disposable API E2E. Never reuse old PASS as new evidence.
- [ ] One independent full integration review; remediate Critical/Important or explicitly report blocked decisions.
- [ ] Fresh original/LG hashes/index/status/refs and candidate scope/provenance/secret/conflict checks.
- [ ] Gate: exact source/run manifests, atomic commits, clean candidate; classify GREEN/YELLOW/RED honestly, unresolved risks retained. Human-only merge via safe workflow, new revert rollback boundary, no main/ref update.

Self-review: tasks cover original master stagesA–K; Task1 snapshot feeds both integration and dirty transplant, Task2 feature contract feeds UI adaptation, Task3 determines final QA scope. No new design or business feature proposed. Latest human autonomous execution overrides skill's redundant plan-confirmation/menu; private backup and exact integration path are explicitly authorized. Preserve all historical plan/evidence workspaces.
