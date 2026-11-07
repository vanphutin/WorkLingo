# R2.2 architecture decisions

Status: IMPLEMENTED; code paths and synthetic engineering workflows TESTED / VERIFIED. Final review and integration are recorded in independent-review-report.md and final-acceptance-report.md. AI_QUALIFIED: BLOCKED. HUMAN_VALIDATED: NOT_RUN.

## ADR-1: Reuse attempts, provider port and Teacher AI boundary

ActivityAttempt remains the submission identity for all four skills. TeacherAiModule registers the existing EvaluationService and new AssessmentHistoryService; LanguageEvaluationPort adds optional assess(input, signal). The legacy speaking/writing EvaluationResult path remains intact. Current request/history orchestration resides in AssessmentHistoryService; it does not currently delegate through EvaluationService. This is an extension inside the existing module/port rather than a second submission or curriculum pipeline, but strict EvaluationService ownership is an integration review consideration.

AssessmentContext resolves the exact session lesson snapshot, compares stored activity against the pinned snapshot, and includes task, content, rubric, prompt and policy in SHA-256 context/input hashes. History admission additionally verifies session plan identity and, where supplied, program enrollment/version/curriculum release pins. Legacy sessions can retain null programVersionId; they must never invent today's active version.

## ADR-2: Add history without changing legacy uniqueness

EvaluationRun references ActivityAttempt. EvaluationResult and UNIQUE(attemptId,rubricVersion) remain unchanged. Every assessment request has a UUID key scoped to the attempt; re-evaluation appends a linked run. Short advisory-locked admission transactions precede provider calls. Generation-fenced writes prevent stale execution replacing cancellation/recovery. Terminal rows reject updates/deletion through a PostgreSQL trigger. Recovery currently happens when the same request key is replayed after lease expiry; there is no autonomous recovery worker claimed here.

## ADR-3: Objective verification plus AI semantics

Authored choice and exact acceptable-answer keys are deterministic. Open-ended/semantic criteria use separate primary/verifier calls without exposing each other's response. Disagreement is NEEDS_REVIEW unless a separately supplied adjudicator agrees with one side. The history service supplies the configured adapter for primary, verifier and conditional adjudicator roles. Disagreement can trigger the optional adjudicator before isolated feedback; a semantic assessment can therefore require up to four provider calls. Same-model calls do not prove model-family independence. Learner prose is generated in a separate stateless feedback-role request whose serializer omits private context; failed feedback generation falls back to safe public templates without changing the decision.

## ADR-4: Fail closed and keep completion separate

Required criteria need valid evidence and HIGH confidence for a total. Speech requires actual matching acoustic dimensions and source checksum. Provider/privacy flags default disabled; objective scoring remains available without a provider. Assessment evidence projection does not rewrite participation completion, enrollment or legacy mastery. Live AI qualification is separate from engineering behavior.

## Explicit boundaries

History currently returns at most 50 runs per attempt; mastery reads at most 500 runs before latest-submission selection. These are bounded views, not a complete audit export or paginated archive. Admin access uses CONTENT_ADMIN; no override permission or destructive decision mutation is added. Retention and deletion policy requires review because restrictive history foreign keys and terminal immutability prevent ordinary cascading erasure.
