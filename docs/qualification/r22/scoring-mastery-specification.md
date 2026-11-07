# Scoring and mastery specification

Status: IMPLEMENTED separate assessment projection; real-model qualification BLOCKED. Full progression integration verification is root-owned. HUMAN_VALIDATED: NOT_RUN.

Activity assessment validates strict verdicts, criterion identity sets, exact text/audio evidence references and bounded corrections before aggregation. Required acoustic evidence and HIGH confidence are mandatory. Valid disagreement is NEEDS_REVIEW; missing acoustics is NOT_SCORABLE. Neither yields a misleading total. Scores use the rubric's weighted 0–3 scale normalized to 0–100.

projectAssessmentMastery deduplicates by submission ID using the latest supplied run, then separates Reading, Listening, Speaking and Writing. Only scored nonsynthetic provider-backed observations enter evidence. Qualified mastery additionally requires an explicitly supplied qualified policy set; the default set is empty. Thus assessment observation is not AI_QUALIFIED and cannot establish CEFR certification.

Qualified observations use exponential recency weights with a 30-day constant. Summaries include observation counts, qualified counts, nullable score, consistency as population standard deviation, low criterion gaps, last observation and review recommendations. Confidence is MEDIUM only after at least five qualified observations with variance ≤100; otherwise LOW. Difficulty and repeated errors are not yet a fully calibrated psychometric model, and no such claim is made.

The HTTP mastery method currently fetches at most 500 runs of all statuses. The projector chooses the latest supplied run per submission before selecting scored evidence, so a superseding unscored decision does not retain an older scored observation. Historical per-language-block MasteryEvent uniqueness and <0.7 logic remain unchanged.

The new endpoint/panel supports independent review recommendations without altering enrollment/completion rules. Existing ProgramProgressService still has its own qualified deterministic evidence policy; there is no claim here that merely adding a summary has automatically activated AI-based advancement or updated all roadmap decisions.
