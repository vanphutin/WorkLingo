# MND-20261026-002 — worker retirement verification

Date:2026-10-26 Asia/Saigon. Task R only, BASE25d2ee2b2d45945830224f993302e0af22936aef; branch codex/foundation-basic-readiness. No product/test/script source changes.

## Authority

Direct human approval recorded in [decision note](2026-10-26-main-db-worker-retirement-human-approval.md). Matching proposal881f83f394419ba50e3e3194426ab606c235a524f27403ed443371e45313ad73, scope/plan/review/audit,117 source records,20 frozen artifacts and empty source allowlist verified. Mandate CLI approved -> implementing before OS mutation. Frozen proposal/plan/scope/body not edited.

## Actual changes

Removed exactly wl_beginner_r12a / SID S-1-5-21-3809754005-2092998575-1059868825-1014 with Remove-LocalUser -SID. Pre-action native WTS sessions/process SID scan found no worker use; profile unloaded/non-special/exact path; membership only Users545 and different ASUS operatorSID1001. SID matches original setup ledger. All other local account names/SIDs/enabled flags were identical before/after.

Removed14 exact ledger-owned directories, leaf-first, with System.IO.Directory.Delete(path,false), fresh resolved-path/ancestor non-reparse, owner SID, protected exact SDDL and empty-child checks. No recursive delete, ACL change, force unlocking or unknown-process termination. Receipt creation timestamps are operation receipts, not exact NTFS creation times; filesystem creation was verified to precede each receipt within10seconds as an additional sanity check.

| Removed directory | Result |
| --- | --- |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002/artifacts | REMOVED |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002/registry | REMOVED |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002/runtime | REMOVED |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002/storage | REMOVED |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002 | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestWorkers/202610250002/repository/tools | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestApprovals/202610250002/worker-setup | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestWorkers/202610250002/repository | REMOVED |
| C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestApprovals/202610250002 | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestWorkers/202610250002 | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestApprovals | REMOVED |
| C:/ProgramData/WorkLingo/BeginnerTestWorkers | REMOVED |
| C:/ProgramData/WorkLingo | REMOVED |

Retained: C:/Users/wl_beginner_r12a, native Win32_UserProfile SID record, personal/system/AppData contents except the explicitly approved empty run directories, and existing parent C:/Users/wl_beginner_r12a/AppData/Local/Temp. Fresh check confirms profile path exists, Loaded=false/Special=false and profile root SDDL unchanged. No personal files were read/exported to establish disposability. Ownership ledgers and audit files retained.

Removed account1; removed directories14; skipped/retained cleanup candidates0; BLOCKED cleanup candidates0. Account removal cannot be reversed by recreating the original SID; no account recreation/profile removal/rollback attempted.

## Fresh checks and limitations

| Check | Result |
| --- | --- |
| Hash/117 source/20 frozen/allowlist/approval lifecycle | PASS before action; rechecked at handoff |
| Full SID, Users-only, operator distinct, no worker sessions/processes, unloaded profile | PASS immediately before deletion |
| Name or exact SID still in local SAM | 0; PASS after deletion and fresh recheck |
| Approved directory paths remaining | 0/14; PASS |
| Profile, native SID registration, parent TEMP and root ACL | RETAINED / PASS |
| Other account identity/enabled-state comparison | PASS; unchanged |
| Database/container/migration/fixture/publication/provider actions | NONE; not authorized or run |
| Product unit/lint/typecheck/build and DB/E2E | NOT RUN; no product source change and no DB authority |

The first inline group-check predicate failed because of PowerShell -join/comparison precedence, although independently printed actual/expected memberships both equaled Users545. Explicit string keys corrected it. A subsequent timestamp parse failed because ConvertFrom-Json already produced DateTime; explicit UTC conversion corrected it. These failed preflights caused no OS changes and are not reported as PASS.

WTS process SID enumeration/CIM fallback resolves all user-process owners. PID0 is the idle pseudo-process. PID4 had unavailable owner SID, with actual CIM identity System/parent0/session0; it was classified as the protected kernel System process, not assigned a fabricated SID. Microsoft documents System as the kernel construct with fixed PID4: [primary source](https://learn.microsoft.com/en-us/troubleshoot/windows-server/performance/troubleshoot-performance-problems-in-windows). No token privilege, driver, UAC or policy changes were used to obtain this proof. Kernel compromise and a global open-handle census are not claimed; no forced cleanup used.

## Gates and governance

Only retirement MND-20261026-002 is eligible for verified after final review/checks. MND-20261026-001 remains implementing/partial; MND-20261024-003 and MND-20261025-002 remain implementing; parent MND-20261024-001 remains captured/approval=null. Gate A BLOCKED; Gate B NOT RUN. No main-DB testing authority follows from this retirement.

Evidence (ignored approved root): worker-retirement-execution-preflight.json, worker-retirement-execution-receipt.json, worker-retirement-fresh-postverification.json, worker-retirement-execution-authority-checks.json and worker-retirement-execution-progress.md. These contain OS metadata/action receipts only, no passwords or DB row payloads.

SKILL AUDIT: mandate-steward -> matching approval/CLI and frozen boundaries; executing-plans -> Task R execution/ledger/one fresh final review; systematic-debugging -> failed diagnostic predicates/timestamps and kernel-process classification; verification-before-completion -> fresh OS/hash checks; git-workflow-and-versioning -> explicit governance files only. TDD read as required subskill; no production code/TDD suite generated for OS retirement.

## Final independent review

Pauli (agent01a177c6-6bed-7d51-a2f1-bea68acaaf93) completed one fresh read-only review of approved scope, decision, actual command/OS receipts and this report: Critical0, Important0, Minor0; no blocking conformance finding. Reviewer did not independently observe historical OS state or authenticate the human message. Coordinator retains responsibility for hash/CLI/reference checks. No second reviewer or OS mutation by the reviewer.
