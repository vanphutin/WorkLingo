# Vocabulary admin API boundary

Root: `/api/v1/admin/vocabulary` (client helpers already prepend `/api/v1`).
All routes require an authenticated CONTENT_ADMIN or SYSTEM_ADMIN. Inputs use
`packages/contracts/src/vocabulary-library.contracts.ts`; unknown fields fail
validation. UUID path parameters are validated. JSON responses serialize dates as ISO strings.

| Method/path | Input | Response |
| --- | --- | --- |
| GET entries | vocabularyQuerySchema query | `{items,total,page,limit}`; entries include senses, pronunciations, topics and cefrAssociations |
| GET entries/:id | UUID | entry with senses, pronunciations, topics, cefrAssociations, resolutions/provenance |
| GET sources | page/limit | `{items,total,page,limit}`; source metadata and document counts |
| POST sources | vocabularySourceInputSchema | source, initially PENDING, revision 1 |
| PATCH sources/:id/rights | vocabularyRightsInputSchema | source with incremented revision |
| POST documents | vocabularyDocumentInputSchema | immutable document metadata (no upload or extraction) |
| GET batches | page/limit | `{items,total,page,limit}` with document/source metadata |
| POST batches | vocabularyBatchInputSchema | stable batch identity and revision; may be BLOCKED_BY_RIGHTS |
| GET batches/:id | page/limit | `{batch,rows,total,page,limit,reconciliation:{detected,stored,validated,unresolved,rejected}}`; rows include sourceEntry and resolution |
| POST batches/:id/stage | vocabularyStageSchema, max 250 rows | current batch, checkpoint/revision |
| POST batches/:id/review | vocabularyReviewSchema | current batch/revision; one explicit source-row decision |
| POST batches/:id/publish | vocabularyPublishSchema | published collection version with ordered members |
| POST batches/:id/rollback | vocabularyRollbackSchema | retired batch; occurrences and members preserved |
| GET collections | page/limit | `{items,total,page,limit}` metadata with version counts |
| POST collections | vocabularyCollectionInputSchema | collection metadata |
| GET collections/:id/versions | page/limit | `{items,total,page,limit}` versions with ordered members/senses, bindings, assignments |
| POST collections/:id/versions | vocabularyCollectionMembersSchema (`senseIds`) | new DRAFT version with ordered members |
| POST versions/:id/publish | empty JSON object | published version with ordered members |
| POST assignments | vocabularyProgramInputSchema | reviewed member/program assignment; explicit reason and learning goal |
| POST versions/:id/bindings | vocabularyBindingInputSchema | binding to exactly one real curriculum target; version must be PUBLISHED |
| POST legacy-links | vocabularyLegacyInputSchema | reviewed correspondence; never edits LanguageBlock or learner state |
| GET options | page/limit/search | `{programs,topics,page,limit}`; each array bounded by limit, each option has id and name |

Pagination defaults: page 1, limit 25; limit 1–100. Search supports independent
CEFR, POS, topicId, programId, sourceId and reviewStatus filters. No inferred exam mapping.
Metadata lists remain usable while rights are blocked. Content reads and reuse
recheck current source rights, including field scope; blocked content returns
422 `BLOCKED_BY_RIGHTS` or is excluded from search. No public content routes.

Mutations return 201 for creation, 200 for actions and rights updates. Invalid input
returns 400; missing identity 404; revision/provenance conflict 409; rights and
completeness policy failure 422. Error bodies contain `code` and `message` when
the domain supplies a code. Refresh after `VOCABULARY_STALE`; never auto-retry a
review decision with an invented revision. Exact staging/publication retries are
idempotent; changed immutable payloads conflict. Rights revocation blocks later
content reads/stages/reviews/publication. Rollback is still allowed to retire data.

Real source PDFs are NOT RUN / BLOCKED_BY_RIGHTS. Metadata registration does not
imply permission, successful extraction, completeness, or publication.
