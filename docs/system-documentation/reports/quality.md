# Testing and quality boundaries

- Existing test files: 292.
- Literal AST-extracted test declarations: 1191. Dynamic/parameterized expansion is not counted.
- Application tests executed by this documentation task: 0 (NOT_RUN).
- Statement/branch/runtime coverage: UNKNOWN.
- Documentation package tests and browser checks are reported separately in verification.json and ui-smoke.json.

## Rules without a direct test-file mapping

These rules may have tests elsewhere. Absence of a mapping is not proof of missing tests. Tests associated with a use case are candidates for semantic review, not automatic evidence that each rule is covered.

- BR-CORE-01: Normalized registration and learner defaults
- BR-CORE-02: Session token and account validity
- BR-CORE-03: Method role override and any-role matching
- BR-CORE-04: Preferences use authenticated identity
- BR-CORE-05: Draft edits use revision compare-and-set
- BR-CORE-06: Validation binds hash and blocking issues
- BR-CORE-07: Publication serializes allocation and replay
- BR-CORE-08: Listening binds explicit current READY candidates
- BR-CORE-09: Audio replay and freshness are separate
- BR-CORE-10: Job replay checks identity rather than payload equality
- BR-CORE-11: Claim locks and owner-attempt fences
- BR-CORE-12: Bounded code-specific retry
- BR-CORE-13: Owner manual retry grants one attempt
- BR-CORE-14: Fixed-window limiting applies only to decorated operations
- BR-CORE-15: Fallback is constrained independently of retryable flag

## Requirements and direct mapped tests

|Requirement|Direct test-file links|Reviewed use cases|
|---|---:|---|
|REQ-CORE-01|0|UC-CORE-Register, UC-CORE-Session|
|REQ-CORE-02|0|UC-CORE-Session|
|REQ-CORE-03|0|UC-CORE-Preferences|
|REQ-CORE-04|0|UC-CORE-Import, UC-CORE-Publish|
|REQ-CORE-05|0|UC-CORE-Audio, UC-CORE-Publish|
|REQ-CORE-06|0|UC-CORE-Job|
|REQ-CORE-07|0|No use-case mapping|
|REQ-CORE-08|0|UC-CORE-Audio, UC-CORE-AIRoute|
|REQ-CORE-09|0|No use-case mapping|
|REQ-CORE-10|0|No use-case mapping|
|REQ-LRN-ownership|1|UC-LRN-session, UC-LRN-draft|
|REQ-LRN-session-continuity|1|UC-LRN-session, UC-LRN-draft|
|REQ-LRN-concurrent-commands|2|UC-LRN-session, UC-LRN-draft, UC-LRN-submit-ai|
|REQ-LRN-ai-feedback|1|UC-LRN-submit-ai, UC-LRN-mastery|
|REQ-LRN-retry-disclosure|1|UC-LRN-submit-ai|
|REQ-LRN-onboarding-evidence|1|UC-LRN-self-placement, UC-LRN-placement|
|REQ-LRN-program-isolation|1|UC-LRN-placement, UC-LRN-progression, UC-LRN-program-context|
|REQ-LRN-objective-completion|1|UC-LRN-foundation|
|REQ-LRN-progression-evidence|1|UC-LRN-mastery, UC-LRN-progression|
|REQ-LRN-bridge-practice|1|UC-LRN-bridge|
|REQ-LRN-integrated-band-evidence|1|UC-LRN-integrated, UC-LRN-band|
|REQ-LRN-mock-report|2|UC-LRN-mock|
|REQ-ARCH-boundaries|1|No use-case mapping|
|REQ-SEC-validation|0|No use-case mapping|
|REQ-OPS-error-envelope|1|No use-case mapping|

## Modules without a reviewed use case or rule assigned directly

- workspace: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- api: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- database: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- admin-curriculum: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- analytics: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- audio-settings: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- audit: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- curriculum: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- engagement: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- health: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- ielts-orientation: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- media: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- operations: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- progress: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- storage: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- api-tests: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- web: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- existing-docs: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- infra: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- package-content-format: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- package-contracts: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- package-test-fixtures: structural metadata only, or referenced as a dependency by another module’s reviewed flow.
- operations-scripts: structural metadata only, or referenced as a dependency by another module’s reviewed flow.

Potential architectural risks and unverified edge cases remain in gaps.md, with evidence confidence. Test presence does not certify assertions or successful execution.
