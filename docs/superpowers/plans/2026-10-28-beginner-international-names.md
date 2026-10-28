# Beginner international people/place revision — scoped follow-up

**PREAPPROVAL ONLY.** Continue [R1.2b authoring](2026-10-27-beginner-r12b-content-authoring.md) and [Gate A](2026-10-27-beginner-r12b-gate-a-resource-alignment.md), using verified [private storage](2026-10-27-beginner-gate-a-storage-amendment.md). This addendum changes fictional names/places and their technical bindings, not curriculum, grammar targets, Lesson format, runtime product code or approval of other gates. New matching scope/hash approval is required before authored-file edits or new calls. [Audit](../../../mandate/reports/2026-10-28-beginner-international-names-review.md), [dry-run](../../../mandate/reports/2026-10-28-beginner-international-names-preview.json).

Baseline: `180fbc71862f38f98322e9f2bfd35ed21d00ca4b`, `codex/foundation-basic-readiness`, linked worktree `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`. User requested foreign/international place names, then people names. The three actual original-v1 pilot files were heard/accepted; their audio/receipts/verdicts remain history. Production is held with pronunciation decision REVIEW_REQUIRED before remaining21. Calls3/characters451/selected0; no authored source changed by this preapproval.

## Exact content decisions

| Original | Proposed |
| --- | --- |
| Linh / Bao / Nam | Lily / Jack / Noah |
| Mai / personal-name An / Bo | Lucy / Adam / Ed |
| Ha Noi / Hue | New York / London |
| Da Nang / Can Tho | Los Angeles / Hong Kong |

Retain Osaka and existing international fictional names (Anna, Alex, Ben, Emma, Eva, Jo, Joe, Kim, Leo, May, Mia, Sam, Tim). These are authoring choices proposed by the agent, not a teacher's sign-off. Treat proper nouns as fictional card values, not new assessed vocabulary or inferred CEFR. Preserve roles, distinct names/places, answer indices, prerequisite order, four skills,64 activities/32 objectives/24 scripts and45-minute planner contract. No claim that observed duration or CEFR is validated.

Seven sources change; `mg02-l1.lesson.txt` stays byte-identical. Its three capitalized **An** occurrences describe the article (including “An eraser”), and must NOT become a person's name. Use the preview's exact before/after source hashes, not a blanket replace of all files. `Bo / B, O` becomes `Ed / E, D`; change the Jo/Ed distractor explanation from “đổi chữ đầu” to “đổi cả hai chữ”. All cards, scripts, questions, distractors, samples, glossaries, rubrics and evidence references stay internally consistent. One-word people and equal-word-count city substitutions preserve existing min_words semantics. Actual teacher review remains open.

## Exact source surface

Modify only seven authored TXT paths listed in preview; existing `apps/api/test/beginner-pilot/qualify-content.test.ts` with the exact mechanical expected-data changes; `docs/qualification/beginner-pilot-audio-inventory.json`; the two existing `tools/beginner-pilot/audio-qualification{,.test}.mjs`; and `docs/qualification/beginner-pilot-audio-qa.md`.

Create only `apps/api/test/beginner-pilot/international-content.test.ts`, `docs/qualification/beginner-pilot-audio-inventory-v1.json` (exact original inventory bytes) and `docs/qualification/beginner-pilot-international-content-review.md` (current source/provenance/qualification dossier). Original content-review and all mandate/plan/scope/B/C artifacts remain immutable; retain them as original-v1 history. Future governance only this child's CLI item/INDEX and its two exact human-approval/verification report paths. Scope JSON contains every exact path, hash and fingerprint.

No DB reads/writes/migration, product/API/parser/planner/evaluator/rubric/config edits, OS/ACL changes, AI/STT/TTS outside existing Azure F0 scope, publication, enrollment, B/C execution, merge/push/deploy. No deletion/move/overwrite of any of the three WAVs or old receipts/human verdicts. Do not manufacture resource IDs or DB LessonVersion records; v1/v2 here are offline source/hash labels.

Normal atomic metadata replacement and cleanup of the six exact owned JSON .tmp/lock paths remain permitted for the existing tool. “Preserve receipts/verdicts” means their immutable historical record prefix is unchanged while new records append; it does not prohibit safe whole-JSON atomic persistence. No other deletion, actual WAV deletion or broad cleanup is authorized.

## Authority and revision contract

Original authoring MND-20261027-001 and A MND-20261027-002 remain implementing; storage MND-20261027-005 stays verified. Require the existing original A/storage approvals plus this child's exact matching approval. Do not edit their frozen scope/body/hash to accommodate the content change.

The new scope binds exact old→new hashes for seven TXT files, the current inventory and the existing checker expectation file. Archive the original inventory byte-for-byte with its known raw/LF hashes before replacing current inventory. At runtime, allow ONLY these explicit approved content-hash transitions; all other original26 protected source/four frozen artifact checks and both original proposal bindings stay exact. The current inventory's old frozen hash is represented by the immutable archive and the child's exact replacement hash. No generic exemption, “latest” inventory fallback or unlimited source bypass.

During approved implementing tests, source-check mode may accept exact before/after pairs while the atomic change is prepared. Production requires this child verified and ALL specified after hashes, original A implementing and storage verified. Child verification is technical content/revision safety only; real media/human QA is subsequent A work, avoiding a circular gate. Original B/C baselines will need separate review before their future approval; do not silently rebase or execute them here.

Keep a two-entry approved inventory registry (original-v1 archive plus international-v2 current). Match historical receipts/candidates by sourceSha256 + scriptSha256 + requestSha256 + slug/take against the correct inventory. Cached original-v1 audio must continue to validate without being eligible for current selection or pilot unlock. Current eligibility requires the current lesson and script/request hashes. Retain historical human PASS exactly as received; new source requires new matching audio QA. Do not relabel accepted audio as rejected merely because names change.

Count ALL original and new starts/characters against the same ledger and per-slug take limits. MG01-L1 new files use take-2 paths, not another take-1 or a fresh ledger. Preserve original three receipts, hashes and waveform bytes. Manifest selection fields may mark old candidates historical/current-ineligible; records remain auditable. Pending/revoked/stale QA cannot unlock new pilot/expansion.

## Task 1 — Content revision TDD and exact data changes

1. Add `international-content.test.ts` first; RED on current authored data. Tests cover the exact mapping, no local names/places in roles/scripts, An article preserved with MG02-L1 byte-identical, Ed/E,D spelling/distractors, distinct roles, answer evidence, original count/format/planner/rubric/redaction integrity and inventory/source matching. Tests may use the existing pure checker/parser only; no live API/DB or provider.
2. Create exact inventory-v1 archive; apply only preview's deterministic replacements to the seven sources/checker expectations; regenerate current inventory from actual parsed scripts, source bytes, word/character/script hashes, retaining activity bindings and planned asset status. Set offline revision international-v2. Verify exact expected output hashes match preview, not just text counts.
3. Run the new test and original pure checker, source qualification `--all`, existing format/planner/projection/rubric pure tests from original R1.2b scope. Focused lint/typecheck where applicable. No full app/DB suite. Correct only in allowlist; unexpected product defects block/report.
4. Write current international content dossier with actual source hashes, assumptions/proper-noun provenance and teacher/audio/timing NOT_READY. Do not rewrite original-v1 content-review as though it described the new sources. Commit only after relevant checks pass.

## Task 2 — Revision-aware audio guard TDD

Modify only the two audio tool/test files. Retain existing CLI commands/root/credential rules. Tests first RED: approved original-v1 receipt/cache coexisting with new inventory; legacy PASS cannot unlock/select v2; missing original archive, wrong source/script/request, duplicate/swapped binding and unknown revision fail closed; shared budget includes3 calls/451 chars; pilot new paths take-2; idempotency across both revisions; source override outside exact nine files denied; original/child approval revocation or partial transition blocks production.

Implement a bounded inventory registry and current-eligibility helper in the existing tool. Reconcile every candidate/receipt with its exact registered version and preserve all immutable historical data. `verifySource` checks current authored bytes, while archived inventory verifies old script provenance; do not compare old candidate source hash to the new lesson blindly. Require current-source exact three-file pilot QA before all-mode expansion, using the same latest-verdict/warning-reason rules. Add source proof for this child, including exact data hash overrides and retained original archive, to dual authority checks rather than bypass original checks.

Run all audio-tool tests, original content tests, new content tests, lint/syntax/targeted typecheck. Perform one independent scoped code/content review; resolve Important findings by RED→GREEN and reverify. Record actual acceptance in this child's verification; transition child to verified through CLI only when technical scope acceptance passes. Do not mark Gate A or R1.2b verified at this step.

## Task 3 — Existing F0 audio continuation and real human QA

After exact authority/source/registry/root preflight PASS, run the original pilot command against new current inventory. Only3 new pilot starts proposed,458 counted SSML characters; cumulative pilot6 starts/909 characters. A rejected next take would exceed the remaining91-character pilot allowance; stop for a separate decision if needed, never silently raise the ceiling. No quota balance is invented. Preserve original3 calls/451 chars.

Keep original video-sub-ai SpeechServices/F0/eastasia/Jenny, process-only key,USD0,≥10s actual starts,1 in flight,≤6/rolling60s,≤3 takes/slug,≤9 pilot starts/1000 pilot chars,≤72 total starts/10000 total chars;429/quota/cost uncertainty stops without automatic retry/paid fallback. Reconfirm recent genuine F0/use evidence; no Azure resource/billing or storage ACL changes.

Present three actual new takes for owner to hear and bind their verdicts to new file/source/script/request hashes; old acceptance does not transfer. Only after genuine new-pilot PASS may the remaining21 be generated. Proposed overall27 starts/4324 characters includes old3 plus new24 first takes; this is a forecast, not an actual usage claim. All24 current selections need genuine human listening QA; no AI self-review as human. Mark A verified only when all original acceptance plus this revision safety is actually met. B/C/CONTENT_READY/public access remain separate.

## Acceptance, rollback and review focus

Technical child acceptance: exact after hashes, unchanged MG02-L1/grammar/assessment contracts, pure tests/lint/typecheck as scoped, preserved old inventory/audio/receipts/QA, strict current selection and no budget reset, real authority guards and independent review. Actual new media/teacher/rehearsal are NOT prerequisites to child technical verification and are NOT implied by it.

Rollback: stop provider, retain both source inventories, all paid-for/free-quota attempts, immutable WAVs and audit. No counter reset or rollback-to-old source with silent current selection. Revert only explicit source commits under review; production stays held until source/approval bindings match. No DB, old-file deletion, recursive cleanup, OS or billing rollback.

Review focus/tests: (1) “An eraser” becoming a person; (2) Ed hearing E,D with Jo/B-O stale evidence; (3) previously accepted old pilot qualifying new source; (4) old receipts disappearing from budget or wrong next take; (5) protected-source/frozen inventory checks becoming broad exemptions. Dry-run structural PASS is not semantic teacher approval or proof of source edits; real runtime locks/provider/history regression remains subject to execution evidence.
