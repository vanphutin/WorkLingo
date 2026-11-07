# Unified evaluation contract

Status: IMPLEMENTED in packages/contracts/src/assessment.contracts.ts; relevant unit suites exist. Final milestone TESTED/VERIFIED receipt is root-owned. AI_QUALIFIED: BLOCKED. HUMAN_VALIDATED: NOT_RUN.

The strict Zod assessment/1 result contains UUID run/submission/learner/lesson/activity identities, nullable pinned program version, skill, rubric ID/version, policy and prompt versions, input/context hashes, status, criterion results, nullable 0–100 total, evidence, feedback, confidence, corrections, provider records, previous evaluation identity and timestamps. Unknown metadata stays null.

Statuses: RECEIVED, VALIDATING, EVALUATING, SCORED, NEEDS_REVIEW, NOT_SCORABLE, FAILED, CANCELLED. Only SCORED may expose a numeric total, and all mandatory criteria must be scored. The history implementation generally admits directly into EVALUATING; the other progress statuses are supported vocabulary, not promises of emitted events.

Each criterion carries ID/description, integer level 0–3 or null, rawScore or null, maximumScore=3, positive weight, required flag, SCORED/NOT_SCORED/NEEDS_EVIDENCE status, evidence IDs and concise rationale/feedback. Null levels cannot masquerade as scored observations. Aggregation rejects missing, extra or duplicated criterion identities.

Evidence sources are submission, passage, transcript and audio. Text references use exact character start/end and quote equality; audio references use validated milliseconds within the source duration. Public projection retains submission/audio evidence and removes private-source links and provider rationale detail. Corrections reference bounded submission spans; they are not model chain-of-thought.

Provider records identify logical role, actual name/model/family/request identity, synthetic flag and nullable measured tokens/cost/latency. Unknown model identity must not be substituted with an assumed model. Logical roles do not prove separate providers or independent families. A separate feedback role uses an isolated stateless request that omits private evaluation context; it does not cast another scoring vote.

Legacy EvaluationDto/EvaluationResult scores remain 0–1. AssessmentResult totals are 0–100. Consumers must not mix these scales or feed assessment totals into legacy <0.7 mastery thresholds.
