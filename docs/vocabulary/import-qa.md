# Import QA and release gates

Infrastructure, parser validation, extraction, human review, isolated import and
publication are separate states. Passing a script is not proof of completeness.
Real A1–C1 source acceptance remains BLOCKED_BY_RIGHTS (source-completeness.md).

Required verification for an authorized dataset:

- Hash, measured pages and exact edition match the registered source version.
- Every page, topic instance and source ordinal is enumerated independently.
- Raw spelling/POS/IPA/definition retain allowed provenance and all locations.
- detected = validated + unresolved + explicitly rejected, with documented reasons.
- No missing/extra/duplicate source identifiers or unresolved legitimate rows.
- Source occurrences and canonical links are counted separately.
- Staging counts match DB occurrences; exact re-import produces no duplicate rows,
  senses, CEFR associations or curriculum membership.
- Publication checks current rights, complete review and consistent atomic version.
- Revocation blocks later content reads/stages/publication; retirement remains safe.
- Legacy WordBank IDs, published snapshots and learner mastery/error records match
  pre-migration fingerprints on synthetic rehearsal data.
- Admin role/validation/pagination, search dimensions, error/retry states and
  responsive readable surfaces pass API/component/browser QA.
- Migration rehearses against an empty isolated PostgreSQL database, including all
  old migrations; existing constraints and immutable versions remain enforced.

Use targeted tests during edits, then package suites, lint/type/build/i18n checks
and an independent whole-branch review. Record actual commands/results and any
pre-existing failure by name in verification.md. Never claim real-source parsing
or full import from synthetic-fixture results.
