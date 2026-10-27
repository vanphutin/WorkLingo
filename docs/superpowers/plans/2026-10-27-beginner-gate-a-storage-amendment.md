# Gate A storage correction and bounded audio continuation

**PREAPPROVAL ONLY.** Follow-up to MND-20261027-002; no OS or provider operation is executed by this document. This is an addendum to the [existing A plan](2026-10-27-beginner-r12b-gate-a-resource-alignment.md), not another curriculum or qualification plan. Owner requested preparation, then expressed intent to permit ACL repair and audio/Azure execution after the blocker is solved. That intent is recorded; matching approval for the final captured scope/hash is still required before execution.

**Goal:** give the already reviewed audio qualifier a native private NTFS root, then resume the existing F0 pilot/QA workflow without weakening guards, changing curriculum, resetting request budgets or altering other gates.

**Baseline:** `423bc561a3e1c7f26af2cb3b170bdc16adec559d`, branch `codex/foundation-basic-readiness`, linked worktree `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`, clean before this planning task. [Audit and alternatives](../../../mandate/reports/2026-10-27-beginner-gate-a-storage-review.md). Exact bindings live in the sibling storage scope JSON. Existing [A scope](../../../mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json), master, inventory and old approvals stay immutable.

## Decision and boundaries

Recommend a new root `D:/WorkLingoQualification/r12b-20261027/A`. Read-only inspection confirms D: is healthy NTFS, native realpath is `D:\`, and `D:/WorkLingoQualification` is absent. This supports a candidate location; actual write, native-path and ACL acceptance are NOT_RUN until execution approval. Do not promise this candidate will pass before testing it.

Only new objects under `D:/WorkLingoQualification` may receive ACL/owner changes. Target owner/creator SID is `S-1-5-21-3809754005-2092998575-1059868825-1001` (current ASUS account). Trusted FullControl principals are exactly that SID, SYSTEM `S-1-5-18`, and Administrators `S-1-5-32-544`. No unknown allow ACEs, inherited broad reader/writer grants, capability grants or group-name heuristics. Protect inheritance on the new top-level directory; explicit descendant policy must resolve to the same trusted set. Do not change D: ACL or any existing ancestor/object. This is private per-user development storage; administrators/SYSTEM retain access and it is not protection against local administrators.

No worker/account/UAC/security-policy changes, installation, Docker, DB, production storage, Lesson edits, B/C execution, publication, enrollment, merge/push/deploy. Azure resource/billing remains unchanged. Existing C: virtualized root and four metadata files are retained read-only; no move, rewrite, cleanup or ACL repair there.

## Files and authority contract

Future source modifications, only after matching approval:

- `tools/beginner-pilot/audio-qualification.mjs`: dual-mandate verification, deterministic scope rebinding, private-root setup and native path/ACL preflight.
- `tools/beginner-pilot/audio-qualification.test.mjs`: mock-only negative/positive regression coverage.
- `docs/qualification/beginner-pilot-audio-qa.md`: actual new-root/provider/human evidence, no secrets.

Future governance: this child's CLI item/INDEX and the two exact approval/verification report paths in scope. This plan, review, scope and capture input are frozen after capture. No change to the original A item/body/scope, B/C or authored sources. Child lifecycle is independent; A remains implementing until actual A acceptance is met.

`readAuthority` must validate BOTH original A proposal `0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638` and this follow-up's captured matching hash. Validate original26 protected bytes,4 frozen artifacts, baseline ancestry, scope binding and no revocation. Validate child's frozen plan/review/scope and baseline. Check mutable targets' baseline bytes before the first source edit; runtime intentionally validates immutable protected files rather than expecting edited tool bytes to retain their old hash. No wholesale baseline exemption.

Construct an effective runtime scope by replacing ONLY original storage root and exact external path/directory prefixes with the new root's reviewed mappings. Compare the resulting full object against a deterministic expected clone: provider, budgets, scheduling, source allowlist, readiness, acceptance and other authority fields remain original. New setup authority is explicit in child; no generic environment/path override, arbitrary --scope or process fallback. Update the runner's root/allowlist checks together; passing a modified scope to the existing original-object equality check is not sufficient.

Child implementing + matching approval permits setup and mock tests. Mark child verified only after real root/ACL/fallback checks and source tests pass. Production requests require child verified plus original A implementing with its still-valid approval, recent actual F0/use evidence and the original process-only key rules. This follow-up plus original approval is the combined authority to resume A; no further storage micro-approval is needed if all gates pass. A eventual verified bookkeeping remains under its original lifecycle; neither grant extends B/C.

## Task 1 — Guarded dual authority and setup, TDD

Interfaces: retain `validateRootPolicy(query, marker, root)`, `assertDirectoryChain(target, root, io)`, `FileStore` and `QualificationRunner`; add `preparePrivateRoot()` and exact CLI `prepare --gate A --storage-only`. Pure tests inject OS/filesystem/authority operations; no test touches actual ACL/provider.

1. RED: absent/stale/revoked child approval; changed plan/protected source/branch; changed endpoint/budget during rebinding; nominal/native mismatch; wrong current SID; unrelated existing new-root directory; broad read/delete/write-DACL ACE; child not verified on a produce command. Assert no OS/network side effect. Assert new root/mapped external paths match the exact scope and unchanged original behavior tests still pass.
2. Implement only those responsibilities. Setup consumes frozen exact directory/identity lists, not untrusted arbitrary CLI paths. Confirm the original C: root still contains only the four inventoried metadata files, zero request/manifest/takes, before accepting a fresh zero ledger; unexpected artifacts require reconciliation/stop, never silently reset counters.
3. Setup exact new top-level directory and empty descendants with protected owner/ACL, before any script/evidence/credential-bearing write. Prefer native directory creation with the final security descriptor; if using create-then-set on an empty new directory, verify absent-to-created file identity, emptiness, owner and no reparse before/after, abort on concurrent content/identity changes. Never repair an existing unowned object. Repeated setup may only verify a previously completed same-child setup with matching immutable ownership marker; incomplete setup requires stop/report, not adoption.
4. Create only scoped metadata: marker includes original run ID, child ID/hash, root, creatorSid, ownerSid, createdFromAbsent and setup provenance; empty QA/pronunciation records explicitly pending; recent genuine F0/educational-use evidence only. Old pending records are not human approval. Never copy a key into metadata. Process-only `WL_QUAL_AZURE_KEY` remains the tool's only credential input; operator's separately approved selective .env loading stays private/in-memory.
5. GREEN: `node --test tools/beginner-pilot/audio-qualification.test.mjs`; focused ESLint and both `node --check` commands. Existing pure content checker `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts`. No full app/DB runner. Commit only explicit allowed files after checks/review.

## Task 2 — Actual OS preflight, then pilot

Requires matching child execution approval first. Run exact `node tools/beginner-pilot/audio-qualification.mjs prepare --gate A --storage-only`. Verify actual token SID, native final paths for every ancestor, protected DACL/owner of each new directory and parent D: ACL unchanged. Native root must equal the approved D: root, not LocalCache. A harmless synthetic local file created exclusively at allowlisted `storage-probe.json`, checksum/readback verified and removed by exact path, proves write/read/cleanup only after ACL validation. No recursive probe/cleanup. Record actual evidence; source/static tests are not OS acceptance.

Run safe mock fallback tests and confirm tool never reads .env or DATABASE_URL itself. Verify original history absent as above, no existing production data under new root, and no request has yet started. Setup failure stops without TTS; do not weaken policy or pick another root. Record child's verification through CLI only if every required storage/software criterion passes.

Then original exact pilot command `node tools/beginner-pilot/audio-qualification.mjs produce --gate A --lesson MG01-L1` may run with combined authority. Reconfirm existing video-sub-ai SpeechServices Free/F0/eastasia/Jenny, credential association, educational internal-use basis and USD0 before live dispatch. Refresh stale actual evidence without printing credentials. No Azure resource/billing changes; redirects/429/quota/unknown cost stop without retries/fallback.

## Task 3 — Actual human pilot QA, bounded expansion and A handoff

Keep original limits unchanged: pilot3 selected/≤9 starts/≤1000 full-SSML counted characters; overall24 selected/≤72 starts/≤10000 characters;≤3 takes/script;1 in flight;≥10s between real starts;≤6 starts/rolling60s. Every failed start counts. Original root/history may not create a second budget. Planned first pilot take is451 counted characters, not a balance or actual usage.

Decode WAVs, record actual hashes/metrics, use the frozen FFmpeg/ffprobe binaries and inspect script fidelity. Owner listens to all three actual MG01-L1 files and supplies exact-file pronunciation/pace/warning decisions; no automatic or fabricated human PASS. Pause with usable local audio previews if review is pending. Expand with original `produce --gate A --all` only after genuine matching pilot decisions. This pause is a human QA dependency, not another scope expansion. All24 selections need genuine audio QA; then `verify --gate A --all` must establish exact bindings, no missing/stale/duplicate mappings and actual caps/receipts. If retakes exceed limits, stop with incomplete status; no implicit extra budget.

Report actual calls/characters/cost/candidates/hashes, source integrity, human verdicts and unresolved items. Mark A verified only after all its original acceptance is actually met. A AUDIO_READY for the approved private scope never implies B/C passed, CONTENT_READY, R1.2b verified, import/publish or learner access. No fake resource IDs or Lesson edits.

## Rollback and acceptance

On failure: stop network, preserve request receipts/immutable candidates and all evidence. Do not move/delete old C: metadata or change shared ACLs. No recursive deletion. Immediate rollback may remove only newly created empty directories and the exact synthetic probe after matching run/owner/file identity verification; retain real audio/audit pending explicit owner cleanup decision. Revert source changes by explicit commit under normal Git review, not reset shared history. No DB/Azure/account rollback is necessary because those settings/data are untouched.

Child acceptance: source TDD/regression/lint/syntax pass; exact dual authority/unchanged F0 ceilings; actual SID/native-path/owner/private ACL/probe checks pass; zero unsafe adoption and no production/old-root mutation. Child verifies storage readiness only. Full A acceptance additionally requires all24 real approved audio bindings and human QA. Product build/typecheck/DB/E2E are outside this offline MJS change and are not reported PASS.

## Review focus

Tests in Task1 must explicitly cover: (1) child hash valid but original approval revoked; (2) effective scope changes anything beyond approved roots; (3) concurrent file/reparse insertion during new-directory setup; (4) unexpected old request history resetting allowance; (5) positive automated pilot with missing/revoked genuine human QA. Task2 covers actual MSIX resolution and ACLs that mocks cannot prove. If read-only evidence changes before execution, stop for amended scope rather than guessing.
