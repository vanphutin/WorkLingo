# Gate A storage follow-up — read-only preapproval review

2026-10-27. Baseline `423bc561a3e1c7f26af2cb3b170bdc16adec559d`, `codex/foundation-basic-readiness`, clean. User authorized preparation if needed and subsequently requested ACL repair/audio/Azure continuation after the blocker is resolved. No matching final new hash has yet been approved. No OS/storage/provider changes in this task.

## Observed evidence

- Previous [verification](2026-10-27-beginner-r12b-gate-a-verification.md):44 pure tests PASS; original A implementing; zero live calls/audio/cost. Seven Important software findings already corrected. Do not reimplement those fixes.
- Native `fs.promises.realpath` resolves the approved C: logical root to `C:/Users/ASUS/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/WorkLingo/qualification/r12b-20261027/A`, so the physical-path guard fails. No sync-realpath bypass is acceptable.
- Read-only Get-Acl confirms C: root owner Administrators, inherited ASUS/SYSTEM/Administrators FullControl, an additional package capability SID with FullControl/GenericAll, and another local SID ending1011 with read/execute. Those extra allow entries do not meet the qualifier's private-root policy. No ACL was changed; no write-access probe was run.
- Current token is ASUS SID `S-1-5-21-3809754005-2092998575-1059868825-1001`, administrator role true. No standard-worker requirement is introduced for this offline A scope and no claim of non-elevation is made.
- D: read-only `Get-Volume` reports healthy NTFS. Native realpath is `D:\`. `D:/WorkLingoQualification` and proposed run root are absent. D: ACL has broad inherited-eligible grants, so new top-level private DACL is necessary; D: itself must remain unchanged.
- Current/source authority and scope hashes will be frozen in the new scope. Existing parent A scope and B/C remain immutable. Search `mandate find --query "audio storage ACL"` found original A but no independent storage-correction candidate; archive is empty. A is frozen implementing, so use a distinct linked follow-up rather than hand-editing it.

## Options and operator recommendation

| Option | Benefit | Cost / boundary |
| --- | --- | --- |
| New private D: root (recommended) | Outside observed C: package virtualization; ACL only on new objects; old evidence retained | Requires exact root mapping, new-directory ACL approval and actual native/ACL preflight; write ability not yet proven |
| Keep actual LocalCache root and repair its ACL | Same logical area | Package capability inheritance/container access may conflict with privacy; changes existing package objects and risks further aliases; rejected for this scope |
| Bypass realpath/accept extra principals | Fewer setup steps | Defeats approved path/privacy checks; rejected |

Recommendation is the agent's engineering choice, not a fabricated product-owner decision. Scope preparation is necessary to keep the existing safety contract. No new workers, instance, DB, dependency or paid service. Proposed root is `D:/WorkLingoQualification/r12b-20261027/A`, trusted SIDs only ASUS/SYSTEM/Administrators. Parent D: and all old C: data stay unchanged. This is ordinary development-user privacy, not isolation from administrators.

## Proposed approval boundaries and risks

One matching follow-up approval should cover only the exact new-root owner/ACL setup, the existing two offline tool/test files and QA dossier, plus effective root mapping for the already approved A audio workflow. Original F0 resource,USD0/72-call/10000-character ceilings and pilot-before-expansion are preserved. Setup/software verification can complete separately; actual human pilot listening is still required before expansion, and every selected file requires real QA. Full A completion is conditional, never guaranteed by OS setup.

Risk: packaged processes may still lack effective access or native mapping at D:. Mitigation: actual fail-closed preflight/probe after approval, no automatic third root or ACL widening. Risk: broader inherited D: access before private policy is established; create protected directories before sensitive artifacts, verify identity/emptiness and stop on races. Risk: tool can read modified scope but original hash checker rejects it; implement dual authority with narrowly deterministic rebinding, not a global bypass. Risk: old request history could be lost; original root must still contain no receipts/takes before a fresh zero ledger, otherwise stop/reconcile.

Rollback is stop-and-retain with narrowly verified empty-directory/probe cleanup only. No recursive deletion, parent ACL edit, C: cleanup, DB or Azure-setting mutation. Existing gates remain unchanged and no readiness flags are promoted during preapproval.

Plan: [storage correction addendum](../../docs/superpowers/plans/2026-10-27-beginner-gate-a-storage-amendment.md). Exact paths, source hashes, frozen artifacts and request limits are bound in the new storage scope; child approval=null until a human approves its computed hash. Preparation does not record execution approval from the user's general intent.

## Bounded design review

Independent read-only builder check by Dewey (`01a17e2b-9fc5-7103-978c-20891fcabafb`) reviewed only this report and the linked addendum. Verdict: nothing important left unanswered; execution still requires matching explicit new-hash approval. No source/OS/DB/provider operation was delegated or performed. Plan self-review checked coverage, exact authority/root interfaces, source versus runtime baseline checks, rollback and the five negative test classes. These are document reviews, not executed storage acceptance tests.
