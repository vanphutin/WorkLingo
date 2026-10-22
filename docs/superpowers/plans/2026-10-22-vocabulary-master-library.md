# Vocabulary Master Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an additive vocabulary library and rights-gated import workflow without touching application data.
**Architecture:** Central lexical entries/senses link explicitly to legacy LanguageBlock identities. Immutable source occurrences feed reviewed, versioned collections. All content gates fail closed.
**Tech Stack:** Existing NestJS, Prisma 6/PostgreSQL 17, Zod contracts, Next.js/React, Python PDF layout extraction.
**Spec:** docs/vocabulary/architecture.md and the user's full execution brief.

## Global Constraints

- No production DB access/migration, raw third-party dataset, merge, push or deploy.
- Full LanGeek ingestion is BLOCKED_BY_RIGHTS, as explicitly confirmed by the user.
- Work only on feat/vocabulary-master-library in the attached isolated worktree.
- Preserve all legacy IDs, published snapshots and learner references.
- Use synthetic fixtures and an isolated PostgreSQL database.
- Tests first; targeted checks first; final independent whole-branch review.

## Review Focus

- Concurrent staging/publication must not lose rows or expose partial versions.
- Rights revoked between stages must block subsequent ingestion/publication.
- Identical source keys with changed content must conflict, not overwrite.
- Unknown layout or missing page inventory must remain incomplete.
- Cross-source homographs and missing legacy teaching fields must not auto-merge or invent content.

### Task 1: Additive catalog schema and compatibility

**Files:** apps/api/prisma/schema.prisma; apps/api/prisma/migrations/20261022000100_vocabulary_master_library/migration.sql; apps/api/test/integration/vocabulary-library.integration.spec.ts.
**Interfaces:** Produces VocabularySource/Document/Batch/SourceEntry, LexicalEntry/Sense/Pronunciation/Topic/Cefr, VocabularyCollection/Version/Member/Binding/ProgramAssignment/LegacyLink delegates.
- [ ] Write DB integration tests for source identity, immutable provenance, additive legacy linking and published collection immutability; run RED against the isolated database.
- [ ] Implement schema, FK indexes and migration triggers without modifying old rows; generate Prisma client.
- [ ] Rehearse all migrations on empty isolated DB; run tests GREEN.
- [ ] Commit schema and passing tests.

### Task 2: Deterministic extraction and reconciliation

**Files:** apps/api/src/vocabulary/domain/layout-parser.ts; domain/import-policy.ts; domain/*.spec.ts; scripts/vocabulary/extract_pdf.py; scripts/vocabulary/test_extract_pdf.py.
**Interfaces:** parseVocabularyLayout(document: LayoutDocument): ExtractionManifest; reconcileManifest(manifest): Reconciliation; checkSourceRights(source, use): void. Geometry includes page index, bounding boxes and row ordinals independently of normalized content.
- [ ] Write synthetic tests for POS homographs, multiword/IPA, page continuation, topic reset, independent count mismatch, ambiguous rows and all A1–C1 configurations; run RED.
- [ ] Implement bounded native geometry adapter and conservative NFC normalization, candidate matching and completeness reports.
- [ ] Test Python extraction with synthetic objects; verify deterministic output, invariant counts and explicit OCR/layout exceptions; run GREEN.
- [ ] Commit parser/policy and passing tests.

### Task 3: Import, library and collection APIs

**Files:** packages/contracts/src/vocabulary-library.contracts.ts; apps/api/src/vocabulary/*.ts; apps/api/src/app.module.ts; apps/api/test/integration/vocabulary-library-api.integration.spec.ts.
**Interfaces:** /admin/vocabulary sources/documents/batches, staging/review/publish/rollback, entries search/detail, collections/versions/program assignments and legacy links. Consumers use shared Zod schemas.
- [ ] Write tests for rights gate, changed source payload, concurrent/idempotent stages, incomplete publish, rollback, role guards, pagination and unchanged legacy snapshots; run RED.
- [ ] Implement validated DTOs/controllers and transactional services, bounded writes, optimistic revision and fail-closed source/content permissions.
- [ ] Implement explicit collection version/membership/program/curriculum bindings and reviewed legacy correspondence; run GREEN and API typecheck/lint.
- [ ] Commit APIs/contracts and passing tests.

### Task 4: Admin vocabulary workspace

**Files:** apps/web/src/features/admin-vocabulary/*; apps/web/src/lib/api/vocabulary-library-client.ts; apps/web/src/app/(admin)/admin/vocabulary/page.tsx; existing shared navigation; apps/web/src/i18n/messages/adminVocabulary.ts.
**Interfaces:** Uses Task 3 contracts/endpoints; paginated entry list, detail/provenance, source/batch dashboard, review choices, collections/program assignments.
- [ ] Read frontend/React/UX skills and local Next.js guides; write component/client tests for blocked source, filters, pagination, review and failures; run RED.
- [ ] Implement readable solid surfaces in existing admin shell with English/Vietnamese copy; run GREEN, web typecheck/lint and browser QA.
- [ ] Commit UI and passing tests.

### Task 5: Operations, documentation and whole-branch verification

**Files:** docs/vocabulary/{data-model,source-registry,import-pipeline,source-completeness,deduplication-policy,program-mapping,licensing-and-provenance,import-qa}.md; scoped operational CLI/tests.
**Interfaces:** Metadata-only LanGeek registry, explicit isolated-target CLI, validation/dry-run/resume/reconciliation reports with no licensed content.
- [ ] Test operational safety and deterministic metadata registration; implement only against an explicit isolated target.
- [ ] Document verified measurements separately from NOT RUN/BLOCKED source rows and exact future authorized import steps.
- [ ] Run whole relevant test suites, build/type/lint/i18n, migration rehearsal and browser Admin QA; record every failure.
- [ ] Dispatch fresh independent whole-branch reviewer; fix critical/important findings with RED→GREEN tests.
- [ ] Commit final documentation and report SHAs, commits, evidence and limitations; leave branch unmerged/unpushed.
