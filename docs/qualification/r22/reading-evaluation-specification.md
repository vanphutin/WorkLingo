# Reading evaluation specification

Status: IMPLEMENTED submission/schema/rendering and assessment routing. Scoped comprehension tests TESTED during development; actual model calibration NOT_RUN/BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Existing omitted responseType means multiple choice. New response types: multiple_choice, true_false, matching, fill_blank, short_answer, open_ended. True/false uses authored True/False options. Matching is one left-hand prompt and its candidate right-hand choices per question; multiple prompts form a matching set.

Submission uses answerIndexes:number[] with one slot per question; text slots use -1. Optional answers:string[] uses the same indexing and empty strings for choice slots. Text answers must be nonempty and bounded. Source passage and task come from the exact session lesson snapshot, with activity equality checked before assessment.

Choices score against authored indices, even if they carry auxiliary semantic criteria. Fill/short text can use authored acceptedAnswers; comparisons trim only, with case folding only if answerCaseSensitive is explicitly false. Semantic criteria on text responses or an open_ended task route semantic judgment through AI rather than sample-answer equality. In mixed tasks, incorrect objective answers cannot be overridden by semantic model agreement. Semantic submission is saved SUBMITTED with null score pending separate assessment; legacy MC advancement remains score===1.

The existing source authoring DSL now preserves these formats through validation and immutable publication. Private scalar fields before QUESTION are `accepted_answers` (pipe-separated), `answer_case_sensitive` (true/false) and `semantic_criteria`. Choice tasks retain OPTIONS/ANSWER; text tasks normalize answerIndex=-1. Actual Admin publication and learner semantic submission/assessment are covered in test-execution-report.md.

The AI rubric asks for meaning, task completeness and source evidence, including paraphrases, factual contradictions, details and inference. Question prompts/semanticCriteria can express main idea, vocabulary in context, interpretation or paraphrase; no extra published curriculum is invented. Grammar mistakes that preserve comprehension should not reduce meaning scores.

Learner question projection excludes answerIndex, acceptedAnswers, semanticCriteria, explanations and private evidence. Assessment feedback may link submitted text; private passage-based evidence stays in authorized server/admin context. Independent verifier disagreement assigns NEEDS_REVIEW without a total.
