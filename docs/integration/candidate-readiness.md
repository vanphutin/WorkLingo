# Candidate readiness — RED pending backend qualification

The coherent candidate is isolated and reviewable; **do not merge it yet**. Runtime product checkpoint `1c91938c5aba06d4116d68e20eb25a7b369ec8ee`, test reconciliation `168b377`; final metadata-only HEAD is recorded in the handoff report/manifest. No runtime source changed after the product checkpoint.

## Verified

- 85selected commits retain history: audio41,beta3,LiquidGlass41. Five explicitly deferred Intermediate/Luminary commits remain outside ancestry. All52original dirty paths have an explicit disposition and private backup hash.
- Two review-confirmed draft-loss defects fixed with RED→GREEN tests;798full web tests,107production owner/browser tests,25cross/native tests,125contracts tests and135content-format tests pass.
- Recursive lint/types, i18n, production web build, active mandate validation and utility checks pass.48page routes include all34LGpages; the14additional feature routes are not claimed fully redesigned merely because they receive shared tokens/shell.
- Real disposable API/browser journeys passed9distinct legacy/onboarding/admin journeys across initial+locale-corrected runs and8V3desktop/mobile journeys. Their source checkpoints precede the final UI draft-lock fixes; changed behavior has separate final-source unit/owner evidence, not a fabricated exact-HEAD E2E claim.
- Final-source lab sample:18cells, maximum observed CLS0.018958, LCP536ms, sampled event latency56ms. Loopback/headless/no throttle, not field CWV/INP or hardware certification.
- Backup/restore10, placement isolation2 and IELTS study isolation1 pass in the focused owned-DB replacement run. Safety/checksum/actual restore assertions remain;120souter backup budget matches bounded subprocesses.

## Open gate

The broader owned-DB API run reported a placement job-claim expectation failing while the focused run passed. Immediate `runOnce()` availability is not proven to be the same failure as production processing; the cause remains unproven. Three read-only host/PostgreSQL clock samples did not demonstrate out-of-interval clock skew. Do not call this an established clock defect, automatically retry it into a PASS, weaken the assertion or change scheduling/business logic speculatively.

The full API run also loaded the old20sbackup test before its120sbudget correction, causing timeout and dependent missing-artifact failure; the replacement focused run passed. Final exact suite summary and any additional failures belong in integration-qa.md. Until the broad critical failure is explained and relevant qualification closes, readiness remains **RED**, irrespective of individual passing reruns.

## Required before GREEN

1. Resolve the intermittent placement-job qualification failure with evidence of cause, preserving placement/learning isolation; qualify the final source with a clean applicable backend run. Do not treat the focused pass as erasing the failed full run.
   Re-run the critical real local API/browser journeys against the final runtime tree after fixes; earlier passing legacy/V3 records are explicitly pre-lock checkpoints.
2. Review disclosed visual/accessibility/provider/device limits and deferred minors; complete any human-required physical/provider/release qualification. No claim of exhaustive WCAG or live-provider approval.
3. Verify exact intended candidate source/evidence manifests, clean candidate and fresh original/index/backup preservation. Confirm main has not advanced and original dirty checkout remains protected.
4. Obtain explicit human merge approval for this exact candidate. A dirty main checkout still blocks an ordinary safe update; follow merge-handoff.md, never stash/reset/overwrite.

Deferred minors: invalid transplanted jump-highlight keyframes and unsupported decorative :has-text selector. Mobile program-folder “Add path” CTA can wrap into a narrow column in the preserved controls; screenshot evidence exists, interaction/reflow checks pass, further visual polish is not silently certified. No backend/product behavior change was made to hide these limits.
