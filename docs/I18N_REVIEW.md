# Independent i18n review — 2026-10-14

Reviewer: Erdos, a fresh subagent with no inherited conversation history. Static, read-only inspection against the i18n design, plan and baseline dirty diff. It did not independently rerun test suites or browser/security qualification. The first review dispatch failed before starting because its model was at capacity; the retry completed.

## Findings and disposition

1. **P2: expired sessions retain the locale account identity.** Learner/Admin layouts redirected after `/me` returned 401 without clearing the persistent root provider. Guest language switching then attempted an unauthorized account PATCH and rolled back. Fixed by clearing the locale account on confirmed auth loss in both layouts; focus also detects 401 and initiates an auth transition. Regression `clears the expired account so guest language switching remains usable after redirect` failed before the fix and passed afterward.
2. **P2: focus silently adopts another account while old workspace data remains mounted.** The provider used to synchronize `/me` account B into a workspace showing account A. Fixed by blocking locale saves and requesting a coordinated root authentication reload when the account changes; ordinary language changes still preserve state without a reload. Regression `requests an authentication transition before adopting another account discovered on focus` failed before the fix and passed afterward. Browser coverage for this transition was added.
3. **P2: partial save failure leaves other tabs stale.** Earlier queued success was not broadcast when a later selection failed. Fixed by broadcasting the last persisted value during rollback. Regression `broadcasts the persisted language when a later queued save fails` failed before the fix and passed afterward.

The focused review repair run passed **21 tests in 4 files**. Later complete unit/E2E outcomes are recorded in `I18N_IMPLEMENTATION_REPORT.md`. No broad merge approval was issued.

## Scope rulings

- Unrelated baseline redesign/curriculum/verification changes: preserve; report their preexisting failures, do not reinterpret them as i18n approval.
- Curriculum localization: preserve the supplied educational data; future localized content needs separate validation/publication.
- Live browser/security validation and test execution: controller runs the repository's disposable-schema QA; static reviewer findings are not a substitute for those results.

## Author integration checks

- Technical status values remain API/CSS keys; only displayed labels are localized. A status prop passed through a translation had been corrected before the review. An additional curriculum CSS class regression was corrected afterward.
- Empty idle switcher status was removed after E2E exposed interference with page status semantics. Saving still announces through an accessible live region.
- The review fixes are changes in the current uncommitted workspace. There was no push, merge or deployment.
