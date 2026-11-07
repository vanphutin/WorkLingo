# Beginner R2.1 vocabulary integration

Date: 2026-11-07. Evidence is the captured primary master-library snapshot, current admission code and synthetic regression tests.

## Mapping result

All 41 authored lexical blocks are accounted for: 20 contextual sense matches, 13 headword-component-only exceptions and 8 missing exact master-phrase exceptions. Only the 20 exact contextual matches are admitted to published vocabulary collections. Component evidence does not certify the authored article/phrase or connected pronunciation. No approximate phrase match is silently substituted.

| Expression | Relationship | Occurrences | Master entry ID | Master sense ID | Original CEFR |
|---|---|---:|---|---|---|
| a bag | HEADWORD_COMPONENT_ONLY | 4 | `5aecc76b-8141-43a5-a061-f52324382333` | `3b54e42c-6efd-497c-8af6-3090f0c12611` | A1 |
| a book | HEADWORD_COMPONENT_ONLY | 4 | `fc596ea3-f93d-4f27-b5f9-b86124fb58dc` | `679b3480-0384-4363-ab30-88feeead5e18` | A1 |
| a pen | HEADWORD_COMPONENT_ONLY | 4 | `0273c973-3524-4e54-baad-4e01bb9f4860` | `c3cc4c4d-9348-4279-9f89-4c13d4b5930b` | A1 |
| an eraser | HEADWORD_COMPONENT_ONLY | 1 | `bd7719cd-b16b-4187-9944-58022bb12c51` | `a94137e2-3942-4280-b3dc-71be4972b264` | A1 |
| from | CONTEXTUAL_SENSE_MATCH | 4 | `f645a610-9c89-48c8-b029-1ef6ba81a583` | `f07ea45f-15ef-47e4-a352-d62823ee4e3d` | A2 |
| hello | CONTEXTUAL_SENSE_MATCH | 4 | `90bc95e9-49ca-4c05-8cd3-8a0ba701a9f2` | `7363923c-26fe-4c8c-9f60-42bf08dec8d9` | A1 |
| I am | NO_EXACT_MASTER_PHRASE | 4 | none | none | unresolved phrase |
| name | CONTEXTUAL_SENSE_MATCH | 4 | `939df981-db99-4e5e-a4a4-7661084b42fd` | `b6210c15-6d8e-4fe8-a5ce-86135e5ec427` | A1 |
| that | CONTEXTUAL_SENSE_MATCH | 4 | `8f9b8af5-3738-412a-8a85-6e0225f6a547` | `869d6381-a61f-4b36-8609-752be281d00c` | A1 |
| this | CONTEXTUAL_SENSE_MATCH | 4 | `6b1535fb-fcf3-4d76-a161-91caf8169078` | `016f2b38-5c0c-47c4-8035-164a2fb08e6c` | A1 |
| you are | NO_EXACT_MASTER_PHRASE | 4 | none | none | unresolved phrase |

Full 41-row lesson-specific mappings, contextual rationale, IPA differences and provenance remain in `beginner-pilot-vocabulary-provenance.json`. In particular, `from` remains A2; it is not downgraded to A1 to fit the program label. All admitted exact senses retain A1/A2 classification. No B1-C2-only sense is admitted.

## Live reconciliation and writes

`beginner-vocabulary-evidence.ts` validates the complete captured metadata projection across VocabularySource, VocabularyDocument, LexicalEntry, LexicalSense, LexicalPronunciation, LexicalCefrAssociation and VocabularySourceEntry. It rejects changed definitions, IPA, source permissions, document identity, occurrence content and CEFR, missing rows, added pronunciation/CEFR rows and changed mapping relationships. Both dry-run and apply call this validation. Official vocabulary services also validate current source rights.

The full evidence is bound into the source inventory. Evidence SHA-256: `e8cca326f361f96102f71eec3745a82bcfdcbda883cf36872a96492a29bfe67a`.

Importer master writes: **0**. It does not create or overwrite master entries, senses, CEFR, pronunciations or provenance. It creates lesson vocabulary collections/versions and exact-sense bindings through existing services. Existing learner writes: **0** in the proposed import set. Database preservation/readback evidence is recorded by the coordinator in [publication report](beginner-program-publication-report.md).

## Verification and limitations

PASS: 9 vocabulary evidence tests in the independent rerun, including definition, IPA, CEFR, document, permission and occurrence drift; added CEFR/missing senses; and component-to-exact tampering. The complete three-scope rerun passed 13 tests. An equality mutation was detected; original source bytes were restored before the passing rerun.

The snapshot was captured as read-only actual primary evidence on 2026-10-30. The helper revalidates its bounded records against the selected database at execution; this report alone is not a fresh database attestation. IPA differences and component/phrase exceptions remain explicit content-quality evidence. The historical 297 decisions and local grading REVISE are not promoted to human or production qualification.
