# R1.2b → R2 source-of-truth audit

2026-10-30. Repository baseline `0f8b83acbc8ad79ec095f9c6c2384042dc2706f4`; actual local main integration is recorded separately in `r12b-git-integration-report.md`. The initial database-unavailable result was preserved; a later read-only connection succeeded against PostgreSQL 17.11. No learner records were queried and no database mutations were performed.

| Actual primary table | Rows |
|---|---:|
| VocabularySource / VocabularyDocument | 5 / 5 |
| VocabularySourceEntry | 8,744 |
| LexicalEntry / LexicalSense | 8,129 / 8,742 |
| LexicalPronunciation / LexicalCefrAssociation | 8,542 / 8,742 |
| VocabularyEntryResolution | 8,742 |
| VocabularyLegacyLink / VocabularyCurriculumBinding / VocabularyProgramAssignment | 0 / 0 / 0 |
| LearningProgram / LearningPath / Level / Mission / Lesson / LessonVersion | 0 each |
| WordBank / WordBankVersion / LanguageBlock / LanguageBlockVersion | 0 each |

Private raw snapshots remain in `C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-r2-20261030/`. Exact candidate snapshot SHA256 `647e4157505e3298355e9dd692733dd7d2dfe46d32934e3dd9be1ea8501aa8c2`; expanded headword snapshot SHA256 `6eba30ec6e56eebd4fe88231aa8ad824f127646f3957515c2e587d10a55c0695`. The versioned sanitized projection is `beginner-pilot-vocabulary-provenance.json` (SHA256 `a7869e664664a5397dd15b918c60394cd9feb6ec23fe86a0647284f30e177614`). It retains actual lexical/sense/pronunciation/source/document/CEFR identifiers and exact authored block hashes, with no credentials or learner information.

The 41 authored blocks contain 11 expressions. Twenty blocks match contextual senses for hello/name/from/this/that; thirteen map only their noun headword for a pen/a book/a bag/an eraser. Eight grammar-phrase blocks (I am/you are) have no exact master record. No artificial IDs or CEFR levels were created. Homographic verb/conjunction candidates were rejected in favor of the classroom noun/determiner contexts. Master `from` is A2; this is retained, not relabeled Pre-A1. Master and authored IPA differences remain explicit. Rights metadata says APPROVED with user-attested provenance; this audit does not independently authenticate the underlying license.

The primary DB therefore supplies vocabulary provenance, but cannot supply existing R2 curriculum or lesson IDs. R2 tests use clearly synthetic, disposable program/curriculum rows and existing repository lesson fixtures; none is promoted into primary data or represented as production content. Existing source/audio/oracle hashes and failed model experiments remain unchanged.
