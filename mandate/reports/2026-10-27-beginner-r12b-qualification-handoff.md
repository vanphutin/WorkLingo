# R1.2b qualification — preapproval handoff

Prepared2026-10-27, original baseline `1673f2ca28266f001e7d1d14514976df8b91d628`. Gate A resource alignment uses baseline `a168d487066e7681a8c64dce1480a05a595c87af`; B/C keep the original baseline. [Master plan](../../docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md), [24-script inventory](../../docs/qualification/beginner-pilot-audio-inventory.json), [read-only audit](2026-10-27-beginner-r12b-qualification-preapproval-review.md). **For current Gate A use the [Free resource addendum](../../docs/superpowers/plans/2026-10-27-beginner-r12b-gate-a-resource-alignment.md) first.**

All three new children are **triaged / approval=null**. No execution approval recorded. Existing parent captured/null, R1.2a implementing and MND-20261027-001 implementing preserved. OFFLINE_AUTHORING_COMPLETE does not become CONTENT_READY.

| Gate | Mandate | Proposal hash |
|---|---|---|
| A — offline educational audio on existing F0 resource | MND-20261027-002 | `0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638` |
| B — human pedagogy | MND-20261027-003 | `829432974b2e32d6f9d7d87fdb0d7b8464a0a06ce3d6ae919af8719cfad715bc` |
| C — observed rehearsal | MND-20261027-004 | `0c4fc75adf79a7d95aec6c6c39a0074cf335e584ef9825839ada5dc83bba8676` |

Exact scopes: [A](2026-10-27-beginner-r12b-gate-a-scope.json), [B](2026-10-27-beginner-r12b-gate-b-scope.json), [C](2026-10-27-beginner-r12b-gate-c-scope.json). Each separately locks plan, review, inventory,26 protected baseline files, its new paths and environment/authority/budget. A additionally freezes the resource addendum. No wildcard file allowlist, no source-modify permission. Future scope changes need a new matching hash.

Original shared master SHA-256(LF), unchanged: `9436534b072f0c35eb774ced8cafdbfa52936c494bbe1a10eb8668c8d0457289`.
Current Gate A addendum/plan SHA-256(LF): `dac1a92495150ac1036eeeff5e56452b390ed545230d49f0362ae6f660ea96d2`.
Inventory SHA-256(LF): `03631d82ad429819e84a41f123955f49c0edf593a679cf3fd735d2f876defbe1`.

| Gate | Scope SHA-256(LF) | Exact allowlist fingerprint | Baseline fingerprint |
|---|---|---|---|
| A | `5332cc7d5fe2b991842562194c6eb68841be095d8c7d2655222a47fb43c91224` | `de6baff5ca281ee61f07555ca8701542bdd570d1b9a22b9d892f86012bfd62f0` | `e7c1b382b302dc73f30ad25766d06e8b9ba6b0bca0b907ddc9c54418cc369909` |
| B | `d6eaf2f8fdc57ce200f921527d5991bd609e14d8d5e3a287bb40719884ab6ee7` | `d8e88cacba28bd69fe3ec87dab0456950c1cfc877bed58dac3abe6b58029b9f8` | `bb06fa047f2b7a2ff45cde1104610f274ac74e9104c0931057b9bae999389829` |
| C | `77150cf402b43c02bb77caccc6d9e099744fcf7ce335366b773d48569d4a4234` | `d10bf79d40210c9ca949784c1a510473d5cedc7e3c67fa783086bb7c885c626f` | `c94ac48bfa38a775d62b0921053a01eaa78bbad333f2e1995cf856048f0f77df` |

Fingerprint algorithm: SHA-256 of canonical recursively key-sorted JSON (array order preserved), excluding the fingerprint property itself. Baseline includes exact branch/head/worktree/policy/protected hashes plus null hashes for future create paths. Artifact hashes use UTF-8/LF; source/media hashes use actual bytes. Mandate proposal hash uses the repository CLI model over proposal fields plus trimmed body, not a hash of its Markdown file.

## Scope and approval decisions

- A:3 future repository paths (offline tool/test/audio-QA dossier),24 selected WAVs across at most72 takes and explicit temporary/metadata paths under private A root. Existing SpeechServices Free/F0, East Asia; owner reports Azure for Students learning use. Proposed Jenny/eastasia real-time TTS, USD0 pilot/total,72 calls/10000 counted-character maximum, one in flight/max6 starts per60 seconds; stop on429/quota exhaustion. No paid/S0/student-credit fallback or Azure resource/subscription change. Actual free-resource credential association, remaining quota, applicable educational-use basis and names need preflight evidence before calls. Source/media allowlist unchanged. Human narrator remains an amendment-only alternative.
- B:2 future review/correction-request documents plus2 private evidence files (and listed temporary paths). Actual owner-appointed educator required. Checklist covers each Lesson/skill, all64 tasks/32 objectives, correctness/provenance/pronunciation/load/key/distractor/rubric/evidence/redaction. B text review and bounded practice-demo outline before A, final B review after actual A audio. No source edit permission: exact correction diff requires amendment.
- C:3 future repository paths (offline pack builder/test and aggregate summary),8 private pages and4 private evidence JSONs plus listed temporary paths. Proposal is3 adults ×8 first-exposure lessons, not live Admin API or actual progress. Owner must explicitly accept offline-method deviation and proposed35–50min qualifying-active policy (median and2/3 in-range each Lesson) before sessions. Teacher time excluded, no forced replay, support limits fixed. All individual data stays private; withdrawal/retention rules are finite. No learner recording or raw-answer persistence.
- Existing main-DB willingness is not used by these gates. Canonical live preview/media binding requires separately bounded identity/cleanup authority before any API/DB action; no.env or DATABASE_URL fallback.
- Staff/teacher/volunteer appointments, applicable limited-purpose use, pronunciation, actual free quota and compensation quotes remain open. A has no paid tariff requirement or allowance to consume S0 student credits; B/C paid expenditure stays USD0 (owner-appointed staff/volunteers only). No contact/hiring/payment is performed by the agent.

## Actual planning verification

- Inventory:8/24 unique scripts,1019 characters/223 words, all24 exact activity bindings and script hashes verified;8 source hashes match frozen dossier. No existing real audio verified.
- Final scope checks:26 protected file hashes unchanged for each gate; future repository paths absent; all3 frozen artifacts and baseline/allowlist fingerprints match; proposed external roots still absent; listed FFmpeg/ffprobe binary hashes match. Runtime ACL/preflight and provider identity/cost are NOT_RUN.
- Final document links, proposal/body/scope hash binding and parent/child lifecycle invariants checked before handoff. Mandate CLI `validate`:14 valid records after capture/triage. CLI initially rejected medium risk for external/data scope before creating any item; proposals were correctly classified high risk and captured. No frozen approved artifact was altered to bypass validation.
- Independent read-only builder check found2 material gaps, both addressed before freezing (exclude teacher-added time, private-data/withdrawal retention). This is planning review, not teacher sign-off. No implementation, code test, audio/media QA or human rehearsal was executed. Prior52 PASS remain historical source qualification only.

## Gate A resource alignment revision

The owner supplied a Portal screenshot showing Free SpeechServices/eastasia, stated educational Azure for Students use, and explicitly requested Gate A documentation alignment. These are evidence for planning, not provider execution or a claim that a credential belongs to the resource. A was updated through CLI captured→triaged, approval=null; prior proposal `d3612882994d2ef40a41152acc302b4a01524b5e734aa1a09bdfe7aff4352aea` is superseded, not executable. Current A hash is in the table above. No paid-tier upgrade is proposed or performed. Student subscription and resource SKU are different levels.

Only A addendum/scope/proposal/item and this handoff change. B/C proposals, frozen master/review/inventory,26 protected source hashes, exact A file allowlist and external storage paths remain unchanged. Fresh document/hash/lifecycle/CLI validation is required before commit; no product test/build or DB/provider/media/human trial is required or run for this documentation-only change. All readiness flags remain as before.

## Closure and rollback

R1.2b may be proposed verified only with8 structurally valid final sources/64 activities/32 objectives,24 actual rights-cleared/checksummed/listening-reviewed audio files,8 qualified human sign-offs on exact source/rubric/audio hashes, actual approved-policy timing evidence for all8, no blocking/stale findings, and approved preview/media-binding qualification where required by canonical acceptance. Registry IDs only from real authorized operations; no release or learner access implied. Keep NOT_READY until then.

At preapproval rollback is only new planning/register artifacts while preserving history. Future A stops calls/quarantines candidates, B withdraws/supersedes decisions, C stops sessions and applies scoped private retention/withdrawal cleanup; none may delete product data or mutate historical LessonVersions/progress. Do not alter the frozen offline-authoring mandate or silently reinterpret approval of any one gate as approval of the other two.
