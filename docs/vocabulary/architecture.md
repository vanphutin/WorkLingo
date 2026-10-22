# Master vocabulary library — ADR 001

Status: accepted implementation direction under the user's execution brief, 2026-10-22.
Starting main: bd7c6c283c9035629ca58560d88bfb0b616ec039. The older reported d2fe1e3 is an ancestor.

## Intent and scope

Build one reusable lexical catalog with immutable source occurrences, explicit rights,
reviewed senses, independent CEFR/topic/program dimensions, and versioned collections.
The user explicitly confirmed that LanGeek reuse permission is absent/unclear:
full extraction and ingestion remain BLOCKED_BY_RIGHTS. Synthetic fixtures are the
only development content. No original checkout edits, production writes, push,
merge or deployment are authorized. All migration tests use a separate local
PostgreSQL container/database, never the application's configured database.

## Existing architecture and alternatives

WordBank owns stable LanguageBlock identities; WordBankVersion and
LanguageBlockVersion freeze authored content. LessonVersionWordBank pins the bank
snapshot. LessonVocabularyUsage links individual canonical blocks to lesson and
IntermediateTopicGroup contexts. MasteryRecord, MasteryEvent and ErrorBankEntry
reference LanguageBlock IDs. Published snapshots are protected by DB triggers.
Existing expression matching uses NFKC, whitespace folding and lowercasing; it
does not distinguish POS, source occurrences or structured senses.

Option A extends LanguageBlock into a dictionary. This would overload its required
Vietnamese meaning, pronunciation and bank ownership, and risk learning identity
changes. Option B adds a lexical catalog with explicit legacy links. Choose B:
keep every existing ID, FK, API and snapshot; add a reviewed sense-to-LanguageBlock
link and never synthesize missing teaching fields just to materialize a block.
Legacy banks remain usable without a catalog link. Catalog publication never edits
legacy content. A link records correspondence; it does not rewrite a lesson.

## Domain and identities

Source → exact document (SHA-256 + source + source CEFR) → parser-versioned batch
→ immutable source occurrence (document + topic instance + row ordinal).
An occurrence keeps raw spelling/POS, topic, page/bounds, pronunciation,
permitted definition, warnings, confidence and content hash independently of
its reviewed canonical mapping. Re-importing the same key with different content
is a conflict; it is never an update or a silent skipped row.

LexicalEntry has language, display/search forms, lemma, kind and POS. Matching
returns candidates; identical spelling/POS does not force a merge. LexicalSense
keeps meaning, definition language, editorial rights and review status.
Pronunciations retain dialect and source. CEFR associations refer to their source
occurrence and optionally a sense. Topics reuse IntermediateTopicGroup; source
topic mappings preserve original headings separately. A spelling may have many
senses, levels, topics and program assignments.

Collections have immutable published versions, ordered many-to-many membership,
and explicit curriculum bindings (program/path/level/mission/lesson/bank version).
Program assignments reference real LearningProgram IDs and an inclusion reason;
no CEFR-to-exam-score inference is performed. Empty programs are not auto-seeded.

## Import and rights boundaries

Metadata registration may happen while blocked; content staging may not. Rights
approval requires an authorization reference, permitted uses and permitted
content fields. API guards require CONTENT_ADMIN or SYSTEM_ADMIN. Each stage
rechecks current rights, rather than trusting a client status or an earlier pass.
No public lexical-content endpoint is added. Approval references are opaque IDs,
not confidential documents. Logs/reports contain identifiers and counts, not
third-party definitions.

The PDF adapter accepts native word geometry and returns deterministic page/topic
rows, a separate geometry enumeration and explicit unresolved fragments. Repeated
headers/footers are classified; numbering restarts are scoped by topic instance;
continuations retain all contributing locations. Unsupported/OCR-only layouts
produce exceptions, never an empty successful import. Real LanGeek layout
validation remains NOT RUN while rights are blocked; supporting five CEFR
configurations is not evidence that all five real PDFs were validated.

Dry-run/validation do not write content. Staging uses bounded chunks and a stable
batch identity/checkpoint. Review resolves every occurrence explicitly to a new
entry/sense or an eligible existing sense, or rejects a proven non-vocabulary row
with a reason. A batch cannot publish unless its independent expected source-row
inventory reconciles, every page is accounted for and no legitimate row is
unresolved. Publication is atomic. Rollback retires visibility; it never deletes
source occurrences, senses or published curriculum references.

## Admin experience and acceptance

Add “Thư viện từ vựng” under shared management. Use existing admin patterns and
Liquid Glass shell, with solid readable tables/editors. Provide bounded search,
CEFR/POS/topic/program/source/review filters, source and batch status, provenance,
review decisions, versioned collections and program assignment. Never show an
imported/published success for a rights-blocked source.

Acceptance: schema rehearsal and FK/unique constraints; synthetic parser cases
for all five CEFR configurations, Unicode/IPA/POS/multi-line/page/topic boundaries;
rights bypass, content mutation, concurrent import, incomplete publication,
rollback and idempotency tests; legacy snapshot/mastery preservation; API role and
pagination checks; frontend tests and browser QA. Report each stage independently.
All five real PDFs remain NOT RUN/BLOCKED, with no fabricated vocabulary totals.
