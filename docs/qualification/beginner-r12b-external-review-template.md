# External expert review intake

Status: NEEDS_EVIDENCE. Actual expert decisions: 0/82 QA and 0/128 oracle.

Template SHA256: 92e6a7168562b35b83b97a22a5caa6a2539e56805226c6ea6a75164c2758f2ff

Review only targets assigned by the owner. The existing source-bound QA HTML and oracle JSON hold full context; this compact sidecar preserves their exact hashes. Keep the original packets unchanged. For each reviewed target copy kind, id and bindings into a submission with schemaVersion worklingo-external-expert-intake/1 and this templateSha256.

Supply reviewer id, authorType HUMAN_SELF_ATTESTED, qualificationReference, identityEvidenceReference and independenceAttestation true. Keep identity documents and raw review evidence in an owner-controlled private location; submit opaque references and SHA256, never raw identity documents or learner data. Do not commit completed private submissions.

Each review requires decision PASS/REVISE/REJECT/NEEDS_EVIDENCE, actual UTC reviewedAt, method ACTUAL_AUDIO_LISTENING/SOURCE_TEXT_REVIEW/ASR_ONLY, evidenceReferences [{reference,sha256}], rationale, confidence HIGH/MEDIUM/LOW, nonempty limitations, correction (required for REVISE/REJECT, otherwise null), comparisonToAI AGREE/DISAGREE/PARTIAL/NOT_COMPARED, and disagreementRationale (required for DISAGREE/PARTIAL, otherwise null). An audio PASS requires listening to the exact WAV. ASR cannot certify phonetics.

Run: pnpm --filter @worklingo/api exec tsx test/beginner-pilot/external-expert-intake.ts --validate-stdin < private-submission.json

The validator returns counts and hashes only. Structural acceptance cannot authenticate identity, qualifications, independence, signatures or the referenced evidence. Independently verified human count remains zero and readiness cannot change here. Confirm those facts with the appointed expert through the owner before any separate qualification decision.
