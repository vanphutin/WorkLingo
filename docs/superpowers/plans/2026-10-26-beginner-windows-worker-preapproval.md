# Beginner Windows Worker Preapproval Implementation Plan

> **For agentic workers:** after matching human approval only, use superpowers:executing-plans task-by-task. This document is a proposal, not an execution grant. Steps are unchecked because no worker is configured.

**Goal:** Resolve the R1.2a Windows execution-principal blocker with a narrowly scoped standard-user worker, without granting database execution.

**Architecture:** Recommend B: a new dedicated local standard account; an existing elevated operator controls immutable approval records and a sealed source snapshot. The worker has only the writable run subdirectories required by tests. Docker/bootstrap/migrations remain operator responsibilities under a later matching qualification scope.

**Tech Stack:** Existing Windows local-account/NTFS facilities, installed Node/pnpm and native Windows PowerShell; no software installation, service, scheduled task, UAC or global security-policy change.

**Spec:** The owner's Windows-worker preapproval request, the [existing qualification plan](2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md) and [latest evidence report](../../../mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-verification.md). This is an infrastructure dependency, not a replacement curriculum plan.

## Global constraints and authority

- PREAPPROVAL ONLY. Current task permits documents/CLI capture and necessary read-only checks. No account, ACL, profile, storage, software or DB changes now.
- Link new child to MND-20261025-002 and R1.2a MND-20261024-003. Preserve all existing mandate bodies/approvals; parent001 stays captured/null, R1.1/P1 verified, both qualification mandates implementing.
- Proposed future authority is worker/OS setup and verification ONLY. Product/test source allowlist is EMPTY. It grants no provisioning, migration, fixture, publication, server, provider, Gate B or later-increment action.
- Changed account/profile/temp/source-snapshot identities cannot inherit the old 0293fe... approval. A new matching harness/environment qualification scope is a required follow-up; the old 16-file allowlist and frozen environment are not edited by this proposal.
- Native account/profile bookkeeping is limited to the new named account/profile. No existing account, group policy, UAC, firewall, Docker pipe ACL or parent directory ACL changes. Name/path collision or unexpected membership => STOP.
- No credentials, full connection strings or raw learner data in reports/Git. Account password is set through secure OS input, never command-line literals, shared files, chat or inherited env.

## Evidence and comparison

Observed baseline: clean codex/foundation-basic-readiness at 9d50bc23ff596232c9693bc058d7fb434edda211. The prior token inventory queried 288/290 tokens: current execution/Explorer/Node/Codex elevated; 54 non-elevated application/service tokens, no qualified current-user interactive Medium worker. This is a timestamped observation, not a claim about every possible future session. Run/storage/approval roots were absent; parent ACL metadata alone did not qualify them. No new full process inventory is needed for this analysis.

| Criterion | A: existing standard-user session | B: dedicated standard-user worker | C: separate Windows VM/environment |
| --- | --- | --- | --- |
| DB/storage isolation | Same host; depends on exact DB identity and ACLs; existing account may already have broad access | Same host, fresh principal and bounded roots; separate pinned test container required later | Strongest separation if no host DB/media mounts, shared folders or host credentials; VM networking must be captured |
| Actual token proof | Required; currently no suitable session established | Verify actual logon/child tokens, Medium IL and effective rights; account label is insufficient | Verify guest worker token AND separate host/guest operator boundaries |
| NTFS/repository | Existing identity/ownership may allow approval edits; never assume de-elevation fixes this | Worker reads a secret-free sealed snapshot; no write access to original checkouts or approval ancestors | Guest snapshot/ACL model; host checkout never writable from guest |
| Provision/migration rights | Separate operator needed; do not give session Docker/admin/DB-owner access | Worker gets no Docker/admin/owner credentials; later operator-only setup | Separate guest operator can provision guest-only PG; VM/admin setup separately approved |
| PG concurrency tests | Real independent PG connections feasible after qualification | Same acceptance capability; runtime role allows DML, not DDL/reset | Same tests against guest PG; connectivity/ports need new scope |
| Reproducibility/audit/cleanup | Existing account history and permissions add unknowns | Dedicated SID, source manifest, run marker and bounded ownership; explicit profile/account teardown | Repeatable snapshot/VM lifecycle, but larger image/network/artifact audit |
| Setup/maintenance cost | Lowest if a suitable existing context is supplied; not currently established | Moderate one-time account/profile/ACL setup; no new platform installation proposed | Highest; availability/licensing/resources/software are unverified, not assumed present |
| Existing worklingo DB risk | Depends on the existing account's actual credentials/control-plane access | Low for the worker if denied engine access and main secrets; privileged operator error remains a residual risk | Lowest guest-to-host risk with verified network/mount separation; host administrator still privileged |

Recommendation: B is the least privilege option currently actionable without assuming an available A session or VM. A becomes preferable only if the owner supplies a qualifying existing context. C is the fallback if B cannot demonstrate approval-root/engine/secret isolation without broader host policy or ACL changes. These are engineering recommendations, not owner approvals.

## Proposed exact worker and resource scope

| Resource | Proposed identity / permission |
| --- | --- |
| Worker | Local account wl_beginner_r12a, initially absent; fresh SID recorded after authorized creation; normal Users membership only |
| Operator | Existing ASUS principal, SID resolved/checked against the captured evidence; elevated only for the named account/new-root OS tasks |
| Profile | C:/Users/wl_beginner_r12a; normal Windows first-logon profile initialization; different/suffixed path => STOP |
| Worker TEMP/TMP | C:/Users/wl_beginner_r12a/AppData/Local/Temp, derived from the actual profile and verified in the actual worker |
| Owned test-temp root | C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a |
| New run root | C:/Users/wl_beginner_r12a/AppData/Local/Temp/worklingo-beginner-r12a/202610250002; future harness output must be routed only to storage/registry/runtime/artifacts below this run |
| Approval root | C:/ProgramData/WorkLingo/BeginnerTestApprovals/202610250002; operator-owned, worker read-only, including records and replacement-sensitive ancestors |
| Source snapshot | C:/ProgramData/WorkLingo/BeginnerTestWorkers/202610250002/repository; operator-owned, worker Read/Execute only, no WRITE_DAC/WRITE_OWNER/delete/ancestor replacement |
| Tools | Existing Node binary copied byte-for-byte into snapshot/tools/node.exe, pinned Windows PowerShell/whoami; bundled pnpm/dependencies may be copied as data only. Missing artifacts/accessibility => STOP, no install or broad profile grant |
| Original repository | C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo; operator reads only; worker receives curated copy, no new ACL on either original checkout |
| DB identity (later qualification only) | 127.0.0.1:55432 / worklingo_beginner_r12a_202610250002 / wl_beginner_202610250002; exact Docker image/container/volume/server identity from frozen parent scope; API47771/Web47772 |

The run-root change is necessary with the proposed profile: current preflight compares ownedTempRoot against node:os tmpdir(). Pointing the new worker at ASUS's general TEMP or granting write to that shared parent is not permitted. The new root is proposed here, not silently substituted into the old permission record. Approval root remains outside worker TEMP.

Snapshot rule: COPY ONLY from already existing candidate/dependency/compiled bytes, recording source-to-destination manifests and hashes. Exclude .git, .env and .env.*, private runtime files, production media, source storage and secrets; no download, build, generation, lifecycle or postinstall execution. Resolve dependency links read-only against the locked baseline/dependency inventory, copy their target bytes as ordinary snapshot files/directories and record the mapping; retain no junction/reference to operator locations. Unknown/uninventoried target, missing artifact or any required application/dependency build => STOP, not implicit setup authority. The operator may inspect/copy the approved candidate, never production data. Snapshot preparation does not authorize application execution. Compilation of the pinned native OS access probe below is a diagnostic exception only, not an application build grant.

Read-only tool observation: C:/nvm4w/nodejs/node.exe resolves to C:/Users/ASUS/AppData/Local/nvm/v20.20.1/node.exe, SHA-256 c0e91d79c5541a733999101578f2febbc2c4ca48bb9727cad3c5ed874805d84a. Operator may copy only those verified binary bytes to snapshot/tools/node.exe, without grants on ASUS's profile. Future diagnostic --version uses that copied binary after hash/ACL checks. Pnpm scripts/dependencies are staged data, not executed under this setup grant.

If existing ProgramData ancestors do not exist, create only the new named WorkLingo/BeginnerTestApprovals/BeginnerTestWorkers ancestors needed for these exact roots, after recording absence. Set ACLs only on newly created owned directories/files. Never take ownership or repair ACLs of pre-existing ancestors; any unsafe inherited/replacement rights that cannot be eliminated on those new owned paths => STOP and reconsider C. No global ProgramData/Users/profile-parent ACL edits.

## Minimum rights / allowed and prohibited OS operations

After a matching approval: create only the named ordinary local account; put it in Users only; owner performs interactive logon to initialize the new profile; create only the named absent roots/snapshot; protect ACLs on those newly created objects. Normal Windows bookkeeping for that new account/profile is included, not general SAM/registry editing. Use native secure account/ACL mechanisms; no service, scheduled task, run-as-admin worker or borrowed application token.

Worker may Read/Execute the source snapshot and read operator records; Modify only storage/registry/runtime/artifacts and its otherwise new profile's normal scratch. Worker cannot write the snapshot, approval records/ACLs, original repo/media, operator secrets, Docker engine pipes or setup credentials. Worker does not receive Administrators, docker-users, Backup Operators, Remote Desktop, service/batch-logon grants, SeDebug/SeBackup/SeRestore/SeTakeOwnership/SeImpersonate elevation mechanisms or DB owner credentials. Verify actual group/token privileges and access; absence of a group label alone is not proof. If denying engine or known protected-path access would require changing existing host ACL/policy, STOP.

Boundary distinction: a standard account owns its new profile and can write normal profile/TEMP locations; this proposal does NOT claim OS confinement to four run directories. OS enforcement protects operator records/snapshot, existing checkouts/media/secrets and engine control. Restricting application/test output to the four run children is a separate successor-harness obligation, requiring sanitized paths/cleanup guards and actual tests. Setup diagnostics/native compiler may use normal scratch in this new profile; cleanup must inventory it and remove it only through the new SID-bound profile lifecycle. Neither profile ownership nor an output-path convention proves DB/network isolation.

Only pure boundary probes/native token/AccessCheck/path/environment diagnostics may execute as this worker under this setup grant. No app, pnpm lifecycle/install script, DB client, test-server, integration/E2E or provider invocation. Existing pure unit tests remain available in the approved source workspace with mocks; they do not establish worker or SQL qualification.

### Exact diagnostic launch contract

The owner logs into the new account using the native interactive Windows login; no agent receives/replays its password or impersonates another process. An operator-staged, hashed diagnostic instruction/command manifest contains ONLY the operations below. These are bounded OS diagnostics in this plan, not a new repository script/source allowlist. Worker working directory is the exact run/runtime directory, never either checkout or a user-selected directory.

Launch only canonical/hash-recorded C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe with -NoProfile -NonInteractive, or C:/Windows/System32/whoami.exe with /user, /groups, /priv and CSV output. Optional copied snapshot/tools/node.exe may run --version only. No shell profile, auto-run file, module from user paths, NODE_OPTIONS/NODE_PATH/preload or arbitrary command passthrough. Account/ACL setup commands belong to the operator; worker diagnostics cannot create users or set ACLs. Diagnostic manifests/command data live in the new operator-owned approvalRoot/worker-setup subdirectory, not the worker-writable run root; they do not implement a runtime permission schema.

Construct child environment from an empty map. Allow only SystemRoot/WINDIR=C:/Windows; COMSPEC=C:/Windows/System32/cmd.exe; PATH=C:/Windows/System32; USERPROFILE/HOME/APPDATA/LOCALAPPDATA/USERNAME/USERDOMAIN for this exact worker/profile/host; TEMP/TMP equal the new profile TEMP; PSModulePath=C:/Windows/System32/WindowsPowerShell/v1.0/Modules; and WORKLINGO_APPROVAL_PROBE_PATH set separately to one captured path. Every other variable is absent, including DB/setup/provider/session tokens, NODE_OPTIONS, NODE_PATH, npm/pnpm configuration, DOTENV_CONFIG_* and arbitrary WORKLINGO_* settings. Resolve node/pnpm by canonical absolute path rather than extending PATH. No env dump is logged.

Native effective-file-access code is the existing windowsAccessScript literal at the frozen hash of apps/api/src/beginner/domain/beginner-environment-preflight.ts. Operator extracts the literal as data using a pinned installed TypeScript AST parser, records the literal hash in the diagnostic manifest and copies no caller-provided script text. Execute it with the sanitized env/-NoProfile contract, once per captured target, checking actual JSON proof and process exit. A separate inline token query is limited to OpenProcessToken(TOKEN_QUERY) for GetCurrentProcess, GetTokenInformation(TokenElevation/TokenIntegrityLevel/TokenIsAppContainer/TokenUser), and closing/freeing its handles/buffers; never token assignment, linked-token launch or privilege adjustment. whoami child SID/groups/integrity must agree with this actual worker evidence.

Read-only Get-Item/Get-Acl/native AccessCheck may inspect only the named roots/ancestors, snapshot manifest paths and known excluded credential/media paths without reading their contents. Engine-control denial uses a no-payload CreateFile(OPEN_EXISTING) handle attempt for the captured Docker engine pipe, closing any handle immediately: successful access is FAIL; unavailable/ambiguous access is BLOCKED; no Docker API request is permitted. Controlled create/read/delete probes use one new diagnostic scratch file exclusively below run/runtime. Every staged diagnostic/manifest is operator-owned/read-only to worker; unknown executable/hash, new API, missing native compiler, need for broader paths or manual command substitution => STOP and scoped review, never improvise.

## Review focus

- Elevated token, unknown token data or writable approval ancestors => deny before activation; never substitute a browser/service token.
- Same account name but different SID/profile, or pre-existing named resources => stop; do not reuse/adopt them.
- Shared ASUS TEMP, writable source mirror or inherited operator/Docker/provider secrets => stop.
- Dependency junction, profile ownership, parent DELETE_CHILD or owner-based WRITE_DAC bypass => fail actual effective-access acceptance.
- Setup success mistaken for full Gate A, refreshed old approval timestamps, or data authority inferred from this child => reject handoff.

## Tasks after approval (not executed)

### Task 1: Authority and absence preflight

**Files:** read the linked scope lock/baseline/parent artifacts; write only the future execution evidence report. No source/test files.
**Interface:** consumes matching child proposal/plan/baseline hashes and explicit OS setup approval; produces a run-scoped evidence ledger with account/root absence, operator SID, owned-resource list and rollback authority.

- [ ] Verify current branch, exact baseline/frozen bytes and actual human approval; reject any new code/env/data rights not in this scope.
- [ ] Query the exact account/profile/roots and operator token; record absence/identity without opening production content. If any proposed account/profile/root exists, stop; do not reuse or delete it.
- [ ] Record qualified cleanup ownership conditions before mutation. Approval must explicitly include new-account/profile setup and the named new-root ACL operations.

### Task 2: Dedicated principal and sealed paths

**Files:** new OS-owned profile/roots only; operator stages the curated secret-free snapshot and manifest; no Git product/test source changes.
**Interface:** consumes Task1 absence/authority ledger; produces actual SID/profile and operator-owned snapshot/approval roots plus least-privilege run subdirectories.

- [ ] Create the exact standard account with secure password input and Users-only membership. Owner performs normal interactive first logon; verify the exact profile/TEMP paths and new SID.
- [ ] Create only absent named roots; apply bounded ACLs only there. Snapshot and approval records must be operator-owned, not worker-owned, with no worker ability to replace ancestors. Create only a non-authorizing OS boundary-evidence JSON file for the selected-file access proof; no runtime permission schema/action/expiry record, activation/publication grant or fabricated human approval.
- [ ] Stage existing candidate bytes/dependencies with an explicit hash manifest and no secrets/reparse escapes. Resolve existing tools; inability to run them without broader permissions is a blocker.

### Task 3: Actual worker boundary acceptance

**Interface:** consumes actual worker and operator tokens/ACLs; produces non-secret evidence below. All probes are read-only or controlled scratch operations strictly inside the worker's writable run subdirectories, never a write probe on approval/protected paths.

- [ ] In the actual worker, query elevation=false, integrity Medium8192, non-AppContainer, user SID equal to the newly recorded SID; inspect groups/privileges and spawned pure diagnostic child token. Unknown/high/low/service identity => fail.
- [ ] Native effective-access checks prove repository snapshot read/execute and storage scratch write; prove DENY for approval/snapshot writes, delete/replace, WRITE_DAC/WRITE_OWNER and sensitive ancestors. Check both root and selected existing evidence file, reparse ancestry and handle final identity. Test controlled scratch create/delete only inside run/runtime; verify no out-of-root cleanup effect.
- [ ] Prove no Docker-engine control access, no operator/DB-setup/provider secrets in sanitized env, no readable known protected credential/media paths using metadata/access checks only. Do not connect to or read production DB/storage content. Any failure => stop, no broad ACL repair.
- [ ] Record root SDDL/owner/SID, token proof, snapshot/candidate hashes, permitted writable paths and leftover resources. Actual account/profile/ACL setup can pass this child only; remaining Gate A items below stay blocked.

### Task 4: Handoff or bounded rollback

- [ ] Report actual PASS/FAIL/BLOCKED per worker/setup acceptance. Keep both parent mandates implementing; never mark full R1.2a verified.
- [ ] Capture a separate successor harness/environment qualification proposal binding this actual worker SID, source snapshot, changed TEMP/run root, revised baseline and exact source allowlist. It must explicitly reconcile the old hardcoded environment/authority validators; no editing frozen scope JSON or reusing its hash for a new layout.
- [ ] If setup fails or owner requests rollback, disable only the newly created account, stop only proven run-owned processes, inventory retained evidence and remove only proven owned roots/new profile/account by recorded SID. Restore ACLs only for objects this run changed; no parent/global ACL restore. Pre-existing/unknown files, SID mismatch or live session => quarantine/STOP. Profile removal uses the native SID-bound profile lifecycle, never recursive deletion of C:/Users or ProgramData. Do not remove existing Users accounts or shared ancestors.
- [ ] Keep sanitized audit/ownership evidence until human acceptance, then perform only separately documented exact-target teardown. A new SID on re-creation requires new evidence/approval, not replay of this record.

## Gate A and Gate B dependency matrix

| Requirement | Who must prove it / status in this proposal |
| --- | --- |
| Standard worker token and actual NTFS boundary | This worker child after matching OS approval; currently NOT RUN/BLOCKED |
| No .env/main DATABASE_URL fallback | Successor harness scope: pure negative tests plus sealed/sanitized runtime candidate; current partial tools tests are insufficient |
| Exact PostgreSQL identity/runtime role and inability to reset worklingo | Successor qualification: URL/action denial before sockets, no worker Docker/setup access, actual target-server role/privilege proof; never probe the main DB |
| Exact migration destination /48 locked files | Hashes may be verified without DB; destination/role proof required before applying under separately approved setup authority |
| Backup/restore/cleanup bounded to run | Worker filesystem evidence plus later actual DB/container/volume ownership and restore evidence; not PASS from absent resources |
| Concurrency/rollback/history V1/V2 | Real independent PG connections and existing history service tests later; no completion from mocks or worker setup |

Full Gate A remains BLOCKED until all owner-required conditions are proven. Some SQL/backup conditions require a real test instance, which is absent; an OS-only grant cannot supply that evidence. The owner must approve an explicit bounded setup/proof ordering in the successor qualification scope before any such operation. Do not resolve that dependency by relabeling unperformed checks PASS or autonomously moving them past the Gate B boundary. No Gate B eligibility/execution is granted by this proposal.

## Decisions reserved to the owner

1. Select B with the exact account/profile/new run root/snapshot above, or instead provide a qualifying A context / request a separately specified C environment.
2. Approve only the bounded account/profile/new-object ACL setup, secure credential handling and SID-bound rollback; no broader host security changes.
3. Accept that this child is OS-only, empty code allowlist and no data authority; require successor qualification approval for the changed filesystem/harness and explicit setup/proof ordering. This is not approval of that successor.

## Current status

Design/capture only. OS setup, actual worker/root proof, DB setup/migrations/fixtures/releases/providers/E2E and cleanup NOT RUN. Gate A BLOCKED; Gate B NOT RUN. No approval recorded. No existing frozen scope/allowlist edited.
