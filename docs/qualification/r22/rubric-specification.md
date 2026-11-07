# Assessment rubric specification

Status: IMPLEMENTED in teacher-ai/domain/assessment-rubrics.ts and assessment-scoring.ts. AI_QUALIFIED: BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Initial scale: 0 no demonstrated evidence; 1 emerging; 2 partially meets expectations; 3 meets expectations. IDs are r22-{skill}, version 1. Every initial criterion is required. Level adaptation is carried by exact task/objectives and levelCode; there is no claim that generic wording alone validates a CEFR measurement scale.

| Skill | Criterion weights |
|---|---|
| Reading/Listening | meaning 3, task 3, evidence 2 |
| Writing | task 3, meaning 3; grammar, vocabulary, sentences, coherence, mechanics, level each 1 |
| Speaking | task 3, meaning 3; grammar 1, vocabulary 1, pronunciation 2, intelligibility 2, fluency 2, communication 1 |

Weighted total = sum(level × weight) / sum(weight) / 3 × 100, rounded to two decimals. Total requires every required criterion SCORED with evidence and HIGH confidence. LOW/MEDIUM/UNKNOWN does not produce a numerical success.

Reading/Listening must assess understanding rather than incidental grammar. Writing separates meaning from language form and uses taught objectives rather than advanced-grammar demands. Speaking acoustic criteria require actual available acoustic dimension evidence; a correct transcript is insufficient. Word stress, syllable or rhythm observations must be supported by real provider output and must not be inferred from alignment alone.

Rubric revisions must change version identity and result hashes; historical rows remain intact. Source evidence and private task criteria stay server-side. Current objective path maps the aggregate correct-answer fraction to one rounded 0–3 level across the comprehension criteria; this loses item-level granularity and is an explicit qualification limitation.
