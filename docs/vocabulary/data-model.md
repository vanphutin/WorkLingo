# Data model

See ADR 001 in architecture.md for the choice of an additive catalog.

| Responsibility | Prisma models | Identity and preservation |
| --- | --- | --- |
| Authorization | VocabularySource | provider + URL; explicit revisioned permission scope |
| Exact PDF | VocabularyDocument | source + SHA-256 + source CEFR; immutable metadata |
| Reproducible run | VocabularyBatch | document + parser version; independent inventory hash |
| Original occurrence | VocabularySourceEntry | document + topic-instance/ordinal key; immutable raw fields |
| Batch reconciliation | VocabularyBatchRow | batch + occurrence; reviewed/rejected/unresolved disposition |
| Lexical identity | LexicalEntry | language, form, kind and POS; candidate indexes, no forced spelling merge |
| Meaning | LexicalSense | entry + sense key; nullable definition, explicit rights basis |
| Reviewed mapping | VocabularyEntryResolution | one reviewed mapping per source occurrence |
| Pronunciation | LexicalPronunciation | explicit dialect, IPA, source and rights |
| Difficulty evidence | LexicalCefrAssociation | source occurrence + CEFR; optionally sense-specific |
| Taxonomy | LexicalEntryTopic, VocabularyTopicMapping | existing IntermediateTopicGroup IDs; source heading kept separately |
| Reusable snapshots | VocabularyCollection/Version/Member | ordered sense membership; published versions immutable |
| Pedagogical assignment | VocabularyProgramAssignment | member + real program; reason, skills and learning goal |
| Curriculum use | VocabularyCurriculumBinding | exactly one program/path/level/mission/lesson/bank-version target |
| Compatibility | VocabularyLegacyLink | reviewed sense correspondence to an existing LanguageBlock |

Composite sense/entry foreign keys reject mismatched senses. Foreign keys have
supporting indexes. No existing LanguageBlock ID, mastery record, lesson snapshot
or LessonVersionWordBank relationship is migrated or deleted. Linking catalog
content is an explicit administrative action, never automatic materialization of
incomplete teaching fields. WordBank API behavior stays unchanged.

Catalog publication changes library visibility and collection snapshots, not the
content of a published lesson. A later lesson author must deliberately bind an
approved vocabulary version. Source occurrences remain even when several of them
resolve to a single sense in a collection.
