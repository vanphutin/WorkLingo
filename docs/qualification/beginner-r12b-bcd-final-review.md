# R1.2b BCD independent code review

Mission WORKLINGO-R12B-BCD-20261030; scope MND-20261030-005. Reviewer: delegated AI code reviewer, separate from Gate C, provider and expert-intake implementers. The reviewer authored the offline-speech runner, so its B examination is self-review only and does not supply independent review of B. No human qualifications or release approval are asserted.

Review checkpoint: baseline b08e96c, authority commit bb7b81f, concurrent implementation working tree. Tests were read before implementations. Reviewed Gate C session hardening, session kit and bindings, expert intake, provider cost options and local calibration. Source was read across correctness, readability, architecture, security and performance. No implementation, index or history was mutated by this review.

## Findings

Critical: none confirmed.

Important, resolved: terminal safety events at the active cap were discarded. A synthetic session created at monotonic zero, followed by transition(event,3600000,WITHDRAWAL), finalized with observed outcomes and passed through importCompleted, produced stopReason ACTIVE_LIMIT, events [], validCompleted 1. This incorrectly counted a withdrawal as completed; DISTRESS and CRITICAL_DEFECT used the same path. The parent independently reproduced RED and changed the allowlisted transition/import logic. The added regression covers all three codes at the cap and beyond it, preserves the active-time ceiling, and excludes those records from completion. This reviewer subsequently ran that regression in the 25-test focused suite and observed GREEN. No release verdict is transferred from this fix.

Important, resolved in B by an independent reviewer: the original PCM parser accepted a trailing byte outside complete declared chunks; deterministic trace names could reuse a stale child success after failure. The Gate C implementer independently identified these B defects; the parent reproduced RED and fixed complete-chunk parsing plus unique attempt paths and input-hash/exit guards. This B author did not independently review those fixes. This reviewer observed the final PowerShell suite pass 9/9. The original 24 recognition attempts used runner SHA256 0dbf41c9d82ea0310d5f12293b49231ae34112d724e151c6fb49ff3664f77869; final hardening was verified retrospectively and was not represented as having run during those attempts. No extra recognition retry is counted.

Remaining Important: none confirmed in the code reviewed at final reconciliation.

Minor: none raised solely for naming, formatting or stylistic preferences.

## Five-axis assessment

| Axis | Evidence and assessment |
|---|---|
| Correctness | Tests reject hidden terminal events, malformed clocks/order/categories, duplicate or mismatched study paths and lesson/audio assignments, stale source/bundle bindings, wrong application session/version/activity IDs, and forged expert metadata. Import preserves the terminal clock and pause category across a second validation. The cap defect above was confirmed and fixed. Local oracle preflight verifies 128 cases, 160 scheduled starts and 32 repeats while explicitly retaining liveOracleReady=false. |
| Readability | Modules keep study/session state, application correspondence, expert intake and local calibration responsibilities distinct. Some existing Gate C expressions are dense, but this review found no additional behavior defect attributable to that style and requests no speculative rewrite. |
| Architecture | New tools are bounded qualification harnesses rather than production route changes. Application correspondence returns STRUCTURE_MATCH_ONLY; it does not authenticate supplied IDs or grant study permission. Expert intake returns SELF_ATTESTED_UNVERIFIED and zero independently verified humans. Local calibration has a distinct provider/model identity and does not relabel Discovery. |
| Security/privacy | Expert submission schemas reject unexpected fields and retain only structural counts/hashes in stdout. Completed private submissions are explicitly excluded from repository storage. Gate C aggregate excludes participant slots and outcomes from the application sidecar. Local URLs are exact loopback-only with no redirects; original evidence is pinned; no credential, environment, learner database or remote inference access was used in review. |
| Performance | Fixed 24/128/160 cardinalities, 20-start pilot, response/context/output caps and serialized requests bound the new qualification work. No new dependency or production hot path was added. Runtime cost, not micro-optimization, dominates local model execution. |

## Verification observed by this reviewer

- Before the cap fix: Gate C baseline/hardening/kit/protocol plus expert intake, 48 tests passed. A separate synthetic command still demonstrated the cap defect; a green suite was therefore not treated as proof of that behavior.
- After the fix: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/bcd-cost-options.test.ts test/beginner-pilot/bcd-local-calibration.test.ts test/beginner-pilot/external-expert-intake.test.ts test/beginner-pilot/gate-c-evidence-hardening.test.ts test/beginner-pilot/gate-c-session-kit.test.ts`: 25 passed, zero failed/skipped.
- `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/bcd-local-calibration.ts --preflight`: 128 cases, 160 starts, 32 repeats; originalLiveOracleReady=false. This performs no inference.
- Extracted local llama-server.exe SHA256 7067c01956452430cd8c67b649f4cb13f86b173c63091123f852edaf5f038b1d matches that executable's member bytes in the pinned official runtime ZIP. Cached server properties identify b12000-68d20b884, the specified model alias/path, Q8_0, context8192 and one slot.
- Scope check against the exact 005 allowlist: seven tracked delta paths plus eighteen untracked paths; zero out-of-scope paths at checkpoint. Tracked baseline content/audio/decisions have no delta.
- Full-branch history count: 104 commits after 752c19c, comprising the previously audited 103 plus bb7b81f. Historical semantic/security review is attributed to beginner-r12b-final-commit-audit.md and beginner-r12b-commit-inventory.md; this review does not claim fresh professional certification of every historical generated line.
- New tracked diff whitespace check passed. The prior full-history audit documents three historical blank-EOF diagnostics; no full-history whitespace-clean claim is made.

Project-wide tests, lint, typecheck, builds, governance and final commit inventory are coordinated by the parent. Their results must be recorded separately when completed. Final local pilot evidence was independently reconciled as described below.

## Final local pilot reconciliation

The final C JSON and Markdown were read after completion. The 40-event private ledger validates against the exact first 20 scheduled starts. Its 20 outcome objects match the report receipts byte-for-byte after JSON serialization; recomputing measurePilot reproduces the report metrics. All 20 request hashes reproduce from the exact source-bound oracle and final request builder. Each preflight token count equals its observed input usage. Totals independently recomputed as 11,398 input tokens and 4,088 output tokens, zero unknown-usage starts.

All 20 raw responses identify worklingo-qwen3-0.6b-q8_0-23749fef and finish_reason stop; all 20 begin with Markdown JSON fences. The unchanged strict JSON parser correctly retains them as ERROR, with zero accepted evaluations. No fence stripping, synthetic score substitution or retry was used. False acceptance/rejection and rubric rates/confidence intervals remain null with zero evaluated denominators; anchor observations are zero. Local experiment status REVISE and PILOT_INCONCLUSIVE do not imply Discovery PASS. Service charges USD0/InkPoints0 are consistent with local execution; electricity is explicitly unmeasured.

The official runtime ZIP SHA256 6fb512a768e6b93c9ced1d01e1f84a3a96bc16b5f0a5948e38fb320d6e067220 and GGUF SHA256 9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031 were independently recomputed. Extracted executable correspondence is recorded above. Final tokenization.serverPropsSha256 equals the private properties-file hash e7e23287d6d91b8c93d6e1fb35a1855d0cdfe77ba35687de4419087043cee397. A first review command used the older top-level field name, yielding a false PROPS_DIFF assertion; the corrected final field matches. This is a review-command correction, not an evidence-integrity finding.

The retained launch record identifies PID20248 with CPU-only, loopback127.0.0.1:33441, context8192, one slot and offline flags. Shutdown record marks that owned process stopped; an independent listener query returned none. Final evidence explicitly discloses that raw-oracle pinning, streaming asset rehash and report metadata were added after inference began; those final source checks were not run by the already-running process. The retained compiled cache and its hash preserve the execution artifact; the original TypeScript snapshot is unavailable. Asset hashes were verified separately before execution and were recomputed in this review after completion. No claim of exact final-source execution is made.

The parent also reported a controlled expert-template guard mutation: inverting template equality caused 7/8 tests to fail; exact source bytes were restored and 8/8 passed. This is attributed parent verification, distinct from this reviewer's read-only execution.

## Declined to judge

- Actual human identity, qualifications, independence and reference authenticity: structural intake cannot establish them; an owner-appointed expert must provide evidence.
- Actual pronunciation, noise and Vietnamese beginner intelligibility: ASR output cannot establish them; all applicable auditory decisions remain NEEDS_EVIDENCE.
- Real learner answers, consent and comprehension: no actual participants were supplied; synthetic sessions cannot fill those observations.
- Groq/Gemini/OpenRouter live entitlement or provider privacy eligibility: no account inspection or authorized remote inference occurred. Published alternatives remain qualified by the documented unknowns.
- Model scoring accuracy beyond the recorded pilot: none of the 20 raw responses satisfies the strict output contract, so no scoring-quality or full calibration PASS can be inferred. Discovery qualification is separate.
- Production deployment, health, physical recovery and release gates: outside this read-only code checkpoint and not satisfied by these harness tests.
- Mutation of concurrent implementation files: explicitly prohibited by the delegated read-only review. The parent performed the cap RED/GREEN experiment; any further controlled mutation test belongs to the coordinator.
- The code-review skill's referenced global security/performance checklist files were absent at C:/Users/ASUS/.agents/references/{security-checklist,performance-checklist}.md. They were not claimed as read or silently substituted. The skill's five-axis instructions were applied directly.

## Assessment

The reviewed D/expert/C code has no remaining confirmed Critical or Important issue at final reconciliation. B independent review and its two fixes are attributed above, not represented as independent review by the B author. The failed strict-output local pilot is fully retained; unresolved human/provider/learner/release requirements continue to block a release-ready claim. No merge, push or deployment is approved by this report.

SKILL AUDIT: code-review-and-quality used for tests-first five-axis review; requesting-code-review and reviewer template read to establish severity, independence and declined judgments. No reviewer was spawned from this delegated reviewer. Verification commands and limitations are recorded above.
