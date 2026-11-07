# Listening evaluation specification

Status: IMPLEMENTED / TESTED / VERIFIED for exact audio binding, published semantic authoring and synthetic learner assessment. See test-execution-report.md. Real-model/audio qualification BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Listening supports the same indexed choice/text response contract as Reading: MC, true/false, per-prompt matching, fill, short and open responses. Numeric/name/date questions can use explicitly authored alternatives; meaning, details, inference and paraphrase require semantic criteria where exact answers are inappropriate. Grammar is not an assessed comprehension criterion.

AssessmentHistoryService resolves the pinned lesson activity and calls resolveListeningAudioBinding. Its artifact ID/checksum/script hash becomes privateContext.audioIdentity and changes contextHash. The resolved script supplies private transcript context. Playback and evaluation must use this same binding; stale scripts, mismatched hashes and ambiguous candidates must fail rather than silently choose current assets.

Beginner listening projection hides content/transcript. Newly typed non-MC listening also hides legacy audioText/content server-side. Historical MC script-help behavior is preserved for compatibility; that historical disclosure is not a private assessment transcript promise. Answer keys and semanticCriteria never appear in the learner question payload.

The primary/verifier evaluate source-supported meaning and task completion. Objective keys remain deterministic. Missing exact audio binding cannot count as completed semantic evaluation. Historical result reads skip source-availability resolution so revoking an asset does not erase prior evaluation history. The seed benchmark contains Listening text specifications only; actual audio assets, playback integrity and measured learner understanding are not claimed.
