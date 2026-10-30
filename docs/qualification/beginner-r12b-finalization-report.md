# WorkLingo R1.2b finalization report

**Local engineering verified; release NOT_READY.** Actual Next/Nest/PostgreSQL journeys now retain all eight Beginner activities and persist writing evaluations. The reviewer workflow and strict local JSON contract are implemented. Provider grading quality and mandatory independent evidence remain open.

Starting HEAD `36bab100a4b6a15afd28e5329fc65af08d34f392` (clean,109commits above main); tested code/evidence HEAD `494e83d599b3aa6aa616826116a69c3e5fa262a7`; branch `codex/foundation-basic-readiness`; merge base `752c19c38e86ae72072cab9f5355c5a50dfba2e7`. There are120 exact commits before the final closure commit,11 created this mission. The ending documentation/lifecycle commit is self-relative: run `git log -1 --format=%H -- docs/qualification/beginner-r12b-finalization-report.md`; the final user handoff supplies its actual SHA. This avoids a false self-hash.

## Result and changes

- 007 fixes real learner creation dispatch: generic planning dropped four authored activities; exact1.2 planning now preserves3reading/3listening/1speaking/1writing at45minutes and rejects invalid duration/content before persistence. Legacy/placement remain covered.
- 008 fixes fake-provider empty feedback that caused JOB_HANDLER_FAILED on Beginner writing. Strict schema is unchanged.009 restores an incomplete historical publication transaction fixture and adds explicit Beginner denial; all original assertions remain.
- C uses pinned llama.cpp nested JSON-schema constrained output. New experiment `WL-R12B-LOCAL-QWEN06-CONSTRAINED-002`:20starts/20strict-valid/0retries,11,398input+4,088output tokens,USD0/InkPoints0; electricity unmeasured. Original20fenced failures remain rejected unchanged. GradingREVISE: false acceptance2/10, false rejection8/8, factualbounds10/20, only4/32anchor pairs; no more starts after failed pilot. Discovery0calls.
- B supplies82one-item strict reviewer forms, exact source/audio hashes and local verified WAV playback.17combined importer/workbench tests pass. Genuine expert0/82 and phonetic0/24; master vocabulary snapshot/actualIDs unavailable. No signature was invented.
- D completed24synthetic actual-app journeys,192submissions,24persisted writing evaluations,72activity-specific WAV starts/plays and24distinctasset hashes.47migrations and24READYWAVs verified in the disposable DB. Speaking uses unscored typed fallback. Reviewer24WAV checks, mobile390x844 and3pause/resume cycles pass.

All8lessons,64activities,32objectives,41lexicalblocks,24scripts/WAVs,297historical decisions,82QAitems,128oraclecases and32repeat slots are reconciled. Each lesson has3current synthetic journeys and technicalPASS; every overall lesson qualification remainsBLOCKED pending external gates. MG02-L2 official control bundle differs from its expanded later descriptor; both identities are explicitly preserved and current rubric pinned separately. No old judgment was transferred to changed content.

## Verification

Fresh broad safe API1160/1160; Webcomponents936/936; shared294/294; existingNode179/179; root37/37; PowerShell9/9; reviewer17/17; newrunner4/4; runtime/collector5/5; governance2/2; actualIELTSintegration1/1; finalPlaywright5/5. Focused and historical reruns overlap these groups and are not added to an inflated total. API/Web/shared lint/typecheck and API+isolated frontend production builds pass. Full commands, initial failures, historical supersession and skipped target checks are in final-test-results.md.

Independent cross-review reconciled actual local raw responses, chain receipts, source snapshots, metric recomputation and final browser/profile/screenshot digests. No unresolved confirmed Critical/Important defect remains in the bounded current engineering delta. Full history inventory through120shows no graph gap, merge or stable-patch duplicate; `git fsck --full` exits0 with dangling objects retained. Five frozen whitespace diagnostics are disclosed. This is not blanket semantic certification of every historical line.

## Commits created before final closure

- `4ce191e4d607f3a9165c784f61b75f3ec66dcc9e` chore: authorize finite R1.2b finalization and local browser qualification
- `141d98003f33e76940958075cae5abca146e78cf` fix: constrain local evaluator JSON and preserve grading pilot failure
- `96e76ea02f2b861fed3fbdd8efc0d9d095779dc5` chore: authorize exact Beginner session planner correction
- `72a7e5d73d5d4726e1b2f5fc03cd17a8a31ffe28` feat: add source-bound expert review workbench with strict evidence export
- `46960c10d889c777606ce1a16d99e72506bfccdf` fix: preserve all eight Beginner activities in learner sessions
- `c52059817a01cddb03180903773d459c76ae2f7c` chore: authorize feedback and publication regression corrections
- `6c2143dc28d6b28f964ffe75bf4e9f73d4ae3f00` fix: keep fake Beginner feedback valid for blank references
- `50e7d4e11f6643fbbb6079f95d02da405af2b2b5` test: restore publication ownership fixture and guard coverage
- `123bd00323f0f07866407e6cca2a65c3b3efa27a` test: omit absent reference in strict optional feedback fixture
- `e6ffdba73f51e8e667f43b227ecdfda6bc59f7b3` test: qualify 24 real local Beginner application journeys
- `494e83d599b3aa6aa616826116a69c3e5fa262a7` test: reconcile final evidence and exact successor governance

Per-commit changed paths are retained in the appended final-commit-audit and matrix `commits`; derive the exact mission delta with `git diff --name-status 36bab100a4b6a15afd28e5329fc65af08d34f392 HEAD`. Final closure adds the six requested reports, current plan ledger and verified lifecycle bookkeeping; it does not change application behavior.

## Operations and remaining evidence

Owned model/API/Web/database processes stopped, ports33441/33442/33443/55434have zero listeners, and label-verified Docker container/volume are removed. Private failed runs, receipts and screenshots remain under `C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-finalization-20261030`; no credentials or real participant data were placed in Git. The original D-drive checkout and its unrelated changes were untouched.

No fetch/merge/push/deploy was executed because required gates have not passed. Deployment URL, production health and target rollback are unverified. Final-blockers.md provides exact next evidence packets for model qualification, expert/phonetic review, vocabulary provenance, genuine3x8 learner rehearsal, durability and intended deployment/recovery target.

Computer Use ended because it could not determine the current Windows browser URL reliably enough to enforce policy. No extension/security settings were changed or live Edge control retried. The separately authorized isolated headless Playwright results are technical software evidence; they do not replace actual participants or authenticated experts.

SKILL AUDIT
Used: mandate-steward -> exact006..009scope/approval/lifecycle; systematic-debugging and TDD -> observed failures before fixes; executing-plans -> canonical ledger; git-workflow-and-versioning -> explicit atomic staging and history preservation; code-review-and-quality/requesting-code-review -> independent five-axis review; verification-before-completion -> actual logs/hash/cleanup checks; computer-use/UI skills -> bounded local browser/reviewer checks.
Verification: Results and limits above;33validmandates.
Not used: newworktree because existing isolated checkout is suitable; deployment/merge workflow because mandatory gates remain incomplete; no unrelated framework redesign, scheduled service or paid-provider fallback.
