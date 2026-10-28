# Gate A storage amendment execution ledger

MND-20261027-005, matching proposal `96a4ca63b69ec052a0bf203b81773d1dc1d6256d2d1fd291deeafb007b1e45a1`, BASE `c3c41e6e15d12e19deb6261a743b5d8cbd1f5771`. Matching human approval recorded through CLI approved→implementing. All7 frozen artifacts,26 protected bytes,3 initial mutable source hashes and both scope fingerprints passed before edits; new D: root absent. Original A approval/lifecycle unchanged. No credentials in artifacts.

Task1 dual authority/setup TDD: in progress. Task2 actual OS preflight: NOT_RUN. Task3 original pilot/human QA: NOT_RUN. Actual calls0/audio0/USD0.

Ruling: this allowlisted report is the task ledger and temporary mandate-decision input staging; no unlisted execution workspace — exact scope wins — cost: manual audit bookkeeping.
Ruling: full application/DB tests are not run; pure MJS/tool/content checks only — approved plan explicitly excludes DB/application runs — cost: no new whole-app build/typecheck/runtime assurance.

Task1 TDD: eight new storage-boundary tests RED (28 existing PASS/8 FAIL), then GREEN36/36. Two runtime authority/source tests RED (36 PASS/2 FAIL), then GREEN38/38. Added two characterizations of concurrent setup-content/revocation and process-only credential boundaries; current40/40 PASS,0 skipped. Existing content checker16/16 PASS,0 skipped. Initial ESLint found missing URL import in the test only; corrected to explicit node:url imports/fileURLToPath, focused lint and both node --check PASS. No product/config/Lesson edit.

Ruling: atomic native CreateDirectoryW with final protected security descriptor instead of create-then-repair — closes the broad-inheritance/adoption window — cost: a small in-memory PowerShell interop definition, no installed service or persistent helper file.
Ruling: effective allowlist retains the original fingerprint as provenance; validate both immutable source scopes and deterministic full effective object rather than claim a new runtime approval fingerprint — keeps every non-storage authority field exact — cost: two validation layers, no arbitrary scope override.

Mutation: invert the new verified-child predicate →37 PASS/3 FAIL/0 skipped; exact original bytes restored →40 PASS/0 FAIL/0 skipped. Actual dual on-disk authority check in prepare mode PASS before any OS side effect. CLI validate15 records PASS. diff --check PASS.

Live-resource evidence: attempted read-only browser recheck was unavailable because local browser use is disabled in Work settings; no setting was changed and no alternate browser/control path used. Existing actual Portal/owner evidence is dated2026-10-27T15:57:40.422Z and was0.63 hours old at this check, within the approved24-hour freshness policy: video-sub-ai/F0/eastasia, credential association confirmed,USD0/internal educational use. No new observation or remaining quota is fabricated. The original source record remains unchanged; setup copies only required non-secret fields preserving the actual checkedAt, never refreshes a timestamp without observation.

## Single independent review and correction pass

Poincare (`01a17e37-2d03-7af0-a847-8cc55ea4c230`) reviewed the scoped diff/tests/plan before any OS or TTS operation and independently ran40/40 pure tests. No Critical or Minor; three Important findings reproduced RED (40 PASS/3 FAIL), then fixed in one pass →43 PASS/0 FAIL/0 skipped. Existing content checker16/16 PASS; focused lint and both syntax checks PASS after the pass. No re-review.

- Final: fixed storage1 — later creation could hide content/replacement in an earlier directory. Complete tree identities, exact allowed contents and ACLs are revalidated before every setup artifact and before READY. `review storage1` RED→GREEN.
- Final: fixed storage2 — production checked only root identity. Runtime verifies the full recorded directory set/identities/ACLs; candidate destination is rechecked immediately before dispatch and write. Injected I/O/ACL boundary enables actual FileStore regression without touching OS. `review storage2` RED→GREEN.
- Final: fixed storage3 — resume read marker through unchecked path. Bounded regular-file/native-path/hardlink/identity/content snapshots are checked before and after validation. The replacement test triggers after marker capture, during later directory validation, to reproduce a real race. `review storage3` RED→GREEN.
- Ruling: classify all three as Important and fix before live operations — they can falsely yield storage READY or adopt replaced objects — cost: complete tree validation overhead. Batch native ACL reads in one PowerShell process per full-tree check mitigates overhead without weakening checks.
- Ruling: reviewer static P/Invoke/SID/SDDL/quoting inspection is not actual OS acceptance — actual token/native API/ACL/MSIX/probe/parent preservation checks remain Task2 — cost: setup may still stop despite source tests.
- Ruling: reviewer did not certify private old history, provider account/quota or genuine listening — coordinator validates permitted real evidence and actual results; unknown balance/human decisions remain unknown — cost: provider/human readiness may still be blocked.
- Ruling: final correction tests are executed by implementer; no second independent dynamic pass — follow the single-review workflow — cost: no second operator confirmation.

No deferred minors. No OS mutations or provider request before this review correction pass. Original pilot request hashes remain unchanged, exactly451 proposed counted characters/3 starts.

## Actual execution (2026-10-28 Asia/Saigon)

Approval record commit `0c82547`; reviewed source/ledger commit `0613bd6`. One post-client-refresh command initially defaulted to primary D: checkout because the JS session store had reset; its exact-path git add failed without staging or committing. Read-only status confirmed primary unrelated next-env.d.ts/backups work remained untouched. All subsequent commands explicitly name the linked worktree, with no implicit cwd/session-store dependency.

First actual prepare command exited ROOT_ACL_UNVERIFIED before creating even the top-level D: directory. Root cause reproduced read-only: Windows PowerShell5.1 inherited Core7 PSModulePath, so Microsoft.PowerShell.Security type data collided and Get-Acl failed to autoload. A child-only native module path fixed the exact read-only query. No execution-policy/UAC/OS configuration change. Regression RED43 PASS/1 FAIL →GREEN44/44; focused lint and syntax PASS. This is a Task2 native-host compatibility correction, not a policy waiver or an additional review round. Actual provider calls still0.

Task2 actual command `node tools/beginner-pilot/audio-qualification.mjs prepare --gate A --storage-only` PASS after the native module fix. Exactly28 new directories created atomically with protected ACL at creation under D:/WorkLingoQualification; native root `D:\WorkLingoQualification\r12b-20261027\A`. Current/creator/owner SID exactly `S-1-5-21-3809754005-2092998575-1059868825-1001`; each directory has exactly ASUS/SYSTEM/Administrators FullControl and no other allow ACE. Actual token may be elevated; no standard-user claim. Synthetic exclusive probe checksum/readback/exact-path cleanup PASS. Four new pending/evidence metadata files created without credentials; no receipt/manifest/WAV yet.

Actual full FileStore.assertSafe/native-path/SID/ACL/28 recorded directory identities PASS. Separate parent D: SDDL hash comparison against setup proof PASS (unchanged). Original C: four metadata names/hashes/native paths unchanged. Re-running prepare yielded READY/reused=true with marker bytes unchanged and no rewrite/ACL modification; probe absent. These are actual OS results, not mock inference. No shared ACL, account/UAC/policy, production, DB or Azure setting mutation.

Task1 software acceptance complete; Task2 actual environment acceptance complete. Child eligible for verified (storage/software only). Task3 actual pilot and human listening still NOT_RUN; original A implementing, readiness NOT_READY. The following execution may resume original A under the combined matching approvals after CLI records child verified; caps and human gate unchanged.

Child MND-20261027-005 transitioned through CLI to verified after the actual acceptance above; validate15 records PASS. Original A remains implementing. No child verification claims full A or R1.2b readiness.

## Actual MG01-L1 pilot — human QA pending

Actual approved pilot command completed3 real Azure requests, all COMPLETE/HTTP200. Counted full SSML152+148+151=451; provider spend USD0 under the confirmed F0 resource, not a fabricated account billing total. Actual start intervals12224ms and12155ms; one in flight,3 starts only, no retry/error/redirect or paid fallback. All3 immutable take-1 candidates are unselected. No remaining21 scripts requested.

| Candidate | SHA-256 | Duration seconds | RMS / peak dB | WPM incl. silence | Warnings |
| --- | --- | ---: | --- | ---: | --- |
| mg01-l1-audio-a/take-1.wav | `d94c3ac2ffa925b37d93cdcb63fdb1303c19d14fa0793f6eaad4a07567bf84fa` |5.884625| -21.317 / -2.664 |91.76|EDGE_SILENCE|
| mg01-l1-audio-b/take-1.wav | `967626e5257e01a4b291854cfaecc5069e20a9702a28ba5d0903e24d652a0b3f` |5.794375| -20.740 / -2.678 |82.84|EDGE_SILENCE,PACE_REVIEW|
| mg01-l1-audio-c/take-1.wav | `157d08d2d9069cb4500eef232b0cc8b776aae922a140bcc8683622f78ef25b02` |6.443500| -21.786 / -2.912 |74.49|EDGE_SILENCE,PACE_REVIEW|

Paths are under `D:/WorkLingoQualification/r12b-20261027/A/takes/`. Actual FFprobe and FFmpeg null-output decode PASS for each: PCM16 mono24000Hz, lengths/sizes match source manifest and SHA checks. WAV signal/clipping/format checks PASS. Measured leading silence0.187–0.201s, trailing0.994–1.018s at the qualifier's -40dB sample threshold explains EDGE_SILENCE warnings. WPM includes silence; B/C remain explicit human pace review warnings, not automated rejection or approval. Human must assess whole-script fidelity and proper-name pronunciation; no AI audition or teacher verdict invented.

Actual pilot rerun reused the three candidates without another request. Actual `verify --gate A --all` verified current three bindings and reported HUMAN_QA_REQUIRED, not24 complete. Request ledger hash unchanged across both operations: calls3,characters451,selected0. Actual private-artifact exact-key leak scan PASS across six metadata files; process-only key loaded selectively from owner-authorized .env, no regular DB env forwarded. No key value/hash printed or stored. No environment secret file written.

Current Gate A is INCOMPLETE / HUMAN_QA_REQUIRED. Three actual WAVs ready for owner listening; zero selected hashes until human decisions. Remaining21 NOT_RUN. Original A implementing; R1.2b NOT_READY. Gate B/C, publication, enrollment and DB untouched. No AUDIO_READY/CONTENT_READY/HUMAN_REVIEW_PASSED/TIMING_VERIFIED promotion. The next dependency is the appointed owner's real listening verdict on these exact hashes and the silence/pace warnings, not another storage approval.

Final source checks after actual setup/pilot:44 tool +16 pure content tests PASS,0 FAIL/0 skipped; focused ESLint, both Node syntax checks and mandate validate15 PASS. No newly known P0/P1 software/environment blocker. Human audio-quality warnings remain open, not a defect waived by the tests. Product typecheck/build/full-app/DB/E2E NOT_RUN under the explicit offline scope; no skipped-as-PASS claim. Local commits so far0c82547,0613bd6,af2574a; this final evidence snapshot is saved in its own commit. No merge/push/deploy or DB access.

Subsequent owner response on2026-10-28: actually heard all3 original-v1 pilot files and accepted them, explicitly considering pace/pauses suitable for beginners. Each verdict is recorded against the exact file/source/script/request hashes and actual warnings in private audio-qa.json. Exact audition clock time was not supplied; review response capture time is recorded instead. This is audio QA only, not a teacher's pedagogy verdict.

Owner then requested international foreign people/place names before expansion. No further provider call was made. Original audio/receipts/QA preserved; pronunciation decision now REVIEW_REQUIRED for content revision, with original-v1 pronunciation/pace acceptance retained as history. Source files remain untouched, budget still3 starts/451 characters. No superseded waveform or human verdict silently deleted, no budget reset. Storage child remains verified; A remains implementing/incomplete pending scoped content revision and renewed matching-file pilot QA.
