# Gate A execution ledger and verification

Plan: docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md, master A tasks apply except explicit F0 overrides. BASE cad2d781d7fd3e29aa19ec7b13381c2309742415. Actual human approval recorded via CLI approved→implementing for proposal0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638.

## Preflight / rulings

- Protected26 file hashes,4 frozen artifacts, exact allowlist, ancestor baseline, branch/linked worktree: PASS before source edits. No dependency install or broad API suite (would violate no DB).
- Actual user permission separately allows private env/account inspection, confirmed exact .env credential belongs to video-sub-ai F0, and volunteered for pilot audio listening. Process-only offline tool still never reads.env or accounts.
- Actual Portal: video-sub-ai Active/Free/SpeechServices/East Asia; subscription Azure for Students. Thirty-day Total Calls45 is observed, NOT character balance. No secret in Portal revealed.
- Ruling: use this allowlisted verification document as manual task ledger/CLI-input staging, not create another unlisted persistent plan workspace — scope path boundary; cost: manual audit bookkeeping.
- Ruling: minimal operator env loader is covered only by direct supplemental human message; frozen tools/scope remain process-only — no implicit reusable env fallback; cost: later runs require same explicit operator authority.
- Ruling: F0 enforced allowance and no paid-tiers/redirects/fallback plus owner key association bound zero provider spend; exact remaining monthly characters stay unknown. First bounded real request is an availability attempt, never proof of an invented balance;429/quota immediately stops. Cost: quota exhaustion may block pilot after consuming a request start.
- Limited-use basis: Microsoft Azure for Students documentation permits educational development/testing; confined to internal QA/no publication/commercial-output claim. Human input provenance fictional originals; source/call scope fixed. No broad license certification inferred.
- Ruling: human assessment of Vietnamese proper-name pronunciation happens on real candidates using unchanged plain script (no invented phonemes); candidates unselected and unapproved until actual listening. Cost: owner may reject and require another take/amendment.

## Tasks

Task1 offline tool TDD: implemented and reviewed; final evidence below. Task2 MG01-L1 pilot: BLOCKED before network. Task3 human listening and expansion: NOT_RUN/BLOCKED. Current calls0, counted characters0, audio0, selected0, provider charges0. No skipped check asserted PASS. Gate A implementing / not verified, content NOT_READY.

Task1 progress: Node test module initially missing, then fail-closed stub produced12 behavioral failures/2 negatives; replaced with minimal implementation, positive requests/resume/WAV guards GREEN. An SSML count test literal was138 but full literal is140; corrected the test expectation after measuring the exact literal (no content shortened). Malformed counter regression RED then finite/integer fail-closed validation GREEN. On-disk revocation guard RED then runtime authority/source rechecks GREEN. Current21/21 pass,0 skipped; Node syntax and focused ESLint PASS after declaring/importing Node globals in these mjs files only. No config changes.
One independent read-only review dispatched before real requests (Bernoulli01a17e12-d91a-7951-8706-7f7f9864f212), no nested agent/re-review. No media root or TTS call yet.

Root preflight: exact A root was absent, all existing ancestors non-reparse; created only required private ancestors/root (no ACL changes). Inherited owner BUILTIN/Administrators, ASUS/SYSTEM/Administrators plus one scoped capability SID FullControl, CodexSandboxUsers read/execute; no broad Everyone/Users/AuthenticatedUsers/application-packages writer found. ACL inheritance preserved, no OS policy/account changes. Run-owned metadata only in exact allowlist. Ruling: implicit new ancestors needed to materialize named private root are ordinary root setup; no shared existing ancestor changed. Cost: a few empty parent directories retained.
Actual native CLI negative probe with no WL_QUAL_AZURE_KEY must fail before network; result printed above, not counted as a passing media acceptance. Source checker regression16/16PASS, no skipped. Current provider calls still0.

## Actual environment blocker before provider calls

Native CLI negative probe unexpectedly stopped at UNSAFE_REPARSE_PATH rather than missing credential. Investigation: fs.realpathSync returned the nominal C:/Users/ASUS/AppData/Local/WorkLingo path, while fs.promises.realpath (native Windows final-path lookup) resolved into C:/Users/ASUS/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/WorkLingo/qualification/r12b-20261027/A. Root and ancestors report no symlink, but packaged Windows file virtualization changes physical location. This is not a case-only mismatch. Scope requires exact physical root and no aliases. Keep guard, no path-normalization bypass and no silent expansion to package storage.

Only the four non-secret metadata files (run ownership, rights/use evidence, empty audio QA, pronunciation pending record) were created via the approved logical path before native physical preflight exposed virtualization; they may physically reside in the package cache. No audio/requests/manifest or provider calls created. Do not recursively delete or manipulate outside-scope package cache. Retain evidence; physical root alignment/explicit environment approval is a blocker. Task2 pilot BLOCKED, not RUN/PASS.

## Final review correction pass and checks

The single independent reviewer reported zero Critical, seven Important, zero Minor findings. All seven reproduction tests were run together:21 PASS/7 FAIL/0 skipped before the correction pass. After the one correction pass:28 PASS/0 FAIL/0 skipped. No second reviewer dispatched; dynamic verification of the corrections was performed by the implementer.

1. Final: fixed root owner/marker and ACL policy — review1 RED→GREEN. SID-based current identity, owner and persistent run marker must match; unknown allowed principals including read/delete/WRITE_DAC/WRITE_OWNER are rejected. Actual inherited capability writer and CodexSandboxUsers reader are NOT accepted by the stricter policy; do not modify ACLs or certify privacy from the initial writer-only check.
2. Final: fixed directory preparation — review2 RED→GREEN. Read-only native final-path validation covers existing intermediate components before creating individual directories or starting a request; repeated checks also guard candidate writes. No recursive mkdir follows an unchecked junction.
3. Final: fixed dispatch timing — review3 RED→GREEN. Durable STARTED reservation precedes transport, while actual dispatch timestamps govern10-second/rolling60-second limits; slow metadata writes cannot compress starts. An interrupted STARTED reservation remains ambiguous and blocks automatic resume.
4. Final: fixed history reconciliation — review4 RED→GREEN. Established manifests cannot silently lose the request ledger; every completed request and candidate must reconcile against exact inventory/attempt/character/hash bindings. Invalid or incomplete history blocks; no budget reset.
5. Final: fixed selection inventory and metrics — review5 RED→GREEN. Reject unknown slugs/duplicate paths, re-decode every cached file, verify measured warnings/pace and source/script/request/activity bindings. Completion requires the exact24 inventory bindings, never an arbitrary count.
6. Final: fixed revoked human QA — review6 RED→GREEN. Latest dated disposition controls; REJECTED revokes PASS, ambiguous same-date dispositions fail closed. Reuse, selection and expansion share this policy.
7. Final: fixed pilot pronunciation/pace gate — review7 RED→GREEN. Three exact pilot bindings plus real reviewer/date/reason and explicit pronunciation/pace decisions are mandatory; each accepted metric warning requires a reason. No test-only review becomes an actual human verdict.

| Command/check | Final result |
| --- | --- |
| `node --test tools/beginner-pilot/audio-qualification.test.mjs` |28 PASS,0 FAIL,0 skipped after byte restoration |
| `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts` |16 PASS,0 FAIL,0 skipped |
| `pnpm exec eslint tools/beginner-pilot/audio-qualification.mjs tools/beginner-pilot/audio-qualification.test.mjs` |PASS, exit0 |
| `node --check` on each of the two MJS files |PASS, exit0 |
| `node .agents/skills/mandate-steward/scripts/mandate.mjs validate` |PASS,14 records |
| Protected26 hashes,4 frozen artifacts, scope/baseline fingerprints, proposal/approval and ancestor baseline |PASS; proposal unchanged, A implementing |
| Read-only native storage preflight |Expected denial `UNSAFE_REPARSE_PATH`; real media execution BLOCKED |
| Actual TTS/FFmpeg media QA and human listening |NOT_RUN; no media exists |
| Product typecheck/build/full application/DB/E2E |NOT_RUN, no product/TS/config changes; this isolated MJS tool has no emit/build target. Syntax checking is not reported as a product build. DB/E2E prohibited. |

Runner mistake retained: `pnpm --filter @worklingo/api exec vitest run test/beginner-pilot/qualify-content.test.ts` exited1, `No test suite found`, because this file uses node:test. It is a failed command, not a passing Vitest suite. Corrected to the previously documented tsx --test command above; no checker source or config changed.

Mutation experiment: reversing latest-review sorting made the full28-case suite fail exactly review6 (27 PASS/1 FAIL/0 skipped), then the exact original bytes were restored and all28 passed. An earlier inversion of the early missing-history condition survived because later one-to-one history reconciliation independently rejects the same state; no missing observable authorization case was inferred from that redundant guard. That survived mutation is disclosed, not counted as a detected mutation.

Read-only root recheck after interruption confirmed only audio-qa.json, pronunciation-decisions.json, rights-and-tariff.json, run-ownership.json. Native physical root is `C:/Users/ASUS/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/WorkLingo/qualification/r12b-20261027/A`. No requests.json/asset-manifest.json/takes were generated. No further root creation, cleanup, ACL change, provider request, env fallback or Azure mutation performed.

## Review rulings and stop boundary

- Final: Ruling: accept seven findings at Important — each can defeat an intended safety/qualification boundary — cost if wrong: added fail-closed checks may require explicit operator repair before a future run.
- Final: Ruling: real ACL/ownership acceptance remains unproven — initial actual inherited grants are broader than the corrected policy, and virtualized storage already fails before ACL validation — cost: a separately scoped physical-root/privacy solution is required; no ACL change is authorized here.
- Final: Ruling: independent reviewer did not certify live key association/quota/legal entitlement — use actual Portal observations, direct owner confirmation and the limited educational-use inference above; remaining balance stays unknown — cost: no general license, numeric quota or commercial-readiness assurance.
- Final: Ruling: actual pronunciation, listening fidelity and pedagogy remain human gates — no actual audio exists and synthetic signals do not satisfy them — cost: pilot, expansion and all readiness states remain incomplete.
- Final: Ruling: preserve the native physical-path guard rather than accept the package-cache alias — the frozen approval names a different exact physical root — cost: no pilot production until explicit follow-up environment scope/approval, despite source tests passing.
- Final: Ruling: retain the metadata and task ledger; no outside-scope cleanup/workspace deletion — evidence must survive interruption and package-cache ownership is not authorized for deletion — cost: four small non-secret local records and empty directories remain.
- Final: Ruling: use pure focused verification only — .mjs files do not change the product compilation graph, and DB/application execution is excluded — cost: no new whole-application typecheck/build or runtime regression assurance.
- Final: Ruling: snapshot review fixes verified by implementer tests, not a second independent execution — follows the single-review workflow and avoids repeated quota cost — cost: final dynamic evidence has no second operator.

Deferred minors: none. No merge/push/deploy, DB, Lesson edits, B/C execution, human sign-off or readiness promotion. Parent/R1.2a/offline-authoring lifecycles unchanged. A remains implementing. Next authority needed is a narrowly scoped physical storage/ACL plan; this report requests no automatic permission and changes no frozen hash.

## Handoff snapshot

Local approval-record commit: `0ad2902`. Implementation/verification snapshot is the separate commit containing this section; no self-referential commit hash is invented. Exact7-file change set confirmed against the approved three source files, two future governance reports, CLI item and generated INDEX. All20 local Markdown links resolved. Private exact-key leak scan over those7 files and4 setup metadata files PASS; scanner read only the owner-authorized primary .env in memory and printed no value or credential hash. `git diff --check` PASS.

Raw source SHA-256:

- `tools/beginner-pilot/audio-qualification.mjs`: `5fa01202b00d879b99e922feb1abdecc4c89806d137fbf5e4b484e48985683c5`.
- `tools/beginner-pilot/audio-qualification.test.mjs`: `eff2366e8e70107502f91e09e2ff6443ffcb6fa168c69c452b3535ed634b2703`.

Software snapshot verified by44 pure tests (28 tool +16 content), zero failures/skipped in the final correct-runner runs. Real media readiness remains BLOCKED/NOT_RUN. Actual calls0, sent characters0, candidates0, selected hashes none, incremental provider charges USD0; no Azure usage/billing total is fabricated.
