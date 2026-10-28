# Beginner pilot correction requests — teacher proposal only

PREAPPROVAL TEMPLATE. No qualified reviewer appointed, no human verdict or source correction executed. Linked mandate MND-20261027-003; exact baseline/source/audio bindings in [snapshot](../../mandate/reports/2026-10-28-beginner-gate-b-source-audio-snapshot.json).

## Correction request form

Use a unique CR-B-001 onward; never write into Lesson/audio files from Gate B. Record actual reviewer/evidence reference, date, Lesson and bundle/source SHA, source lines/slugs, issue and severity, teacher exact requested wording or proposed diff, reason, affected objectives/activities/answers/rubric, source/audio/script hash changes and Gate A/C impact. Status PROPOSED until a separate matching amendment authorizes implementation. No source-edit permission is implied by PASS/REVISE/REJECT. Keep withdrawal/superseding history; no forged signer.

```json
{
  "correctionId": null,
  "lessonCode": null,
  "reviewedBundleSha256": null,
  "sourcePath": null,
  "sourceSha256": null,
  "sourceLines": null,
  "affectedSlugs": [],
  "reviewerId": null,
  "actualReviewDate": null,
  "teacherEvidenceReference": null,
  "severity": null,
  "issue": null,
  "exactRequestedReplacementOrDiff": null,
  "rationale": null,
  "sourceOrAudioChangeNeeded": null,
  "affectedAudioHashes": [],
  "gateAImpact": null,
  "gateCImpact": null,
  "matchingImplementationMandate": null,
  "status": "NOT_SUBMITTED"
}
```

## Initial preapproval blockers (not teacher findings)

| Lesson | Human status | Open blockers |
| --- | --- | --- |
| MG01-L1 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG01-L2 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG01-L3 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG01-L4 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG02-L1 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG02-L2 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG02-L3 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |
| MG02-L4 | NOT_REVIEWED | Reviewer appointment; exact-hash teacher decision; support/demonstration adjudication |

## AI assistance flags for teacher attention (unconfirmed)

- MG01-L1/L2 still contain general wording about Vietnamese-name pronunciation although actual proper nouns are now international; teacher should judge relevance/instruction load. No automatic correction or REVISE verdict.
- MG01-L2: spelling Ed/E,D and Jo/J,O/Joe distractors, IPA/letter names and current audio must be judged together.
- MG02-L1: eraser is explicitly proposed support vocabulary; teacher must adjudicate it and article/sound distinction. Do not infer approval from technical tests.
- MG02-L1–L4: final consonants/plural allomorphs, near/far perspective, quantity, please, English task labels and minimal lexical load need actual expert review.

All AI flags are hypotheses, not signed defects; source/audio stay frozen.
