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
Version lists now return metadata summaries with `_count: {members,bindings}`;
they do not embed members, assignments or bindings. Read ordered members at
`GET versions/:id/members` (position, then ID), assignments at
`GET versions/:id/assignments` (member position, then assignment ID), and bindings
at `GET versions/:id/bindings` (ID). Each takes strict page/limit queries and returns
`{items,total,page,limit}` with at most 100 items. Assignment and binding writes
still target the original immutable member/version IDs. Entry lists and entry
detail omit raw resolutions; all original occurrences, locations, document/source
metadata and content hashes remain available at `GET entries/:id/provenance`,
ordered by source-entry ID with the same pagination envelope and cap. Content
pages and version summaries recheck rights across the complete entry/snapshot
using database predicates without loading its provenance or members. Publication
and reuse validate every contributing sense and field, acquiring sense, entry
and source locks in deterministic ID order with three batch queries. Subsequent
ORM validation chunks contain at most 1,000 IDs and cover the complete snapshot,
never a validation limit taken from the visible page.
Publication and exact publication retries return the same bounded version
summary/counts, including batch publication and the version-publish action on an
already published import. Hand-curated draft creation retains its separate
500-sense input cap and bounded full draft response. Entry search and detail
return distinct CEFR level labels (at most A1–C2), grouped by entry and level in
the database; occurrence-specific CEFR evidence stays in paginated provenance.
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

Source registration accepts `pronunciationDialect` (`en-US`, `en-GB`, `und`),
defaulting to `und` when evidence does not assert a dialect. Reviews retain this
source evidence on pronunciations; the adapter does not invent a dialect.

For a legitimate uncertain occurrence, a review may include `correction` with
`parsedWord`, a resolved `normalizedPos`, the original `sourceContentHash`, and
a substantive `reason`. This is a reviewed interpretation stored on the batch
row. Original spelling, POS, warnings, locations and hash remain immutable.
The correction must match that exact source occurrence and cannot accompany a
non-vocabulary rejection. Reviewed decisions cannot be edited in place.
