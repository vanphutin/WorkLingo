# Writing evaluation specification

Status: IMPLEMENTED task-backed assessment contract, rubric, provider route and feedback controls. Real-provider semantic calibration BLOCKED; HUMAN_VALIDATED: NOT_RUN.

Writing submits the existing text response on an ActivityAttempt. Assessment context includes exact pinned prompt, content, level and authored objectives/task criteria. Sample answers are private context, not universal equality keys. Accepted contractions, alternative valid expressions and paraphrases must preserve meaning rather than match one model sentence.

Required dimensions: task achievement, meaning/factual accuracy, grammar, vocabulary, sentence construction, coherence, spelling/mechanics and level-appropriate use. Task and meaning have weight 3; each other dimension weight 1. Excess length is not rewarded. Errors should be distinguished by their effect and taught objectives, without demanding advanced forms from a beginner.

Primary and verifier return strict criterion levels and observable evidence. A separate feedback-role call receives no private reference context and supplies learner-facing prose; it cannot alter scores. Corrections use submission character spans, replacement text and concise explanations. The learner panel highlights valid ranges and renders corrected examples; overlapping/out-of-range highlights are skipped defensively. No hidden chain-of-thought is requested or stored.

Existing Beginner text practice remains unscored participation and its completion behavior is preserved. Requesting a separate assessment appends history and does not silently convert participation into qualified mastery. The benchmark's current writing reference ranges cover meaning only; full writing-dimension qualification requires independent authored/adjudicated reference evidence.
