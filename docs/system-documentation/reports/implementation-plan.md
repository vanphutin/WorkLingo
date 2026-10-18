# WorkLingo System Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver an evidence-based, interactive AS-IS system atlas entirely in `docs/system-documentation`.

**Architecture:** Read-only static TypeScript AST and Prisma DMMF extraction produces a normalized item registry and relationship graph. Human-reviewed behavioral records supplement structural metadata. A static HTML/JavaScript UI consumes the registry; Mermaid is bundled locally for offline diagrams.

**Tech Stack:** Node.js, TypeScript compiler API, Prisma metadata parser, JavaScript modules, CSS, Mermaid, esbuild, Playwright.

**Spec:** User attachment `Pasted text.txt`, master prompt with 16 documentation sections and seven execution phases. A copy is retained as `reports/user-specification.md`.

## Global Constraints

- All new output stays under `D:/Projects/WorkLingo/docs/system-documentation`.
- No production logic, database, API, commit, push, merge, reset or sensitive data changes.
- Source evidence includes path, symbol, line range and file hash. VERIFIED denotes the specific supported claim, not deployed/runtime verification.
- Distinguish VERIFIED, INFERRED, DOCUMENTED_ONLY, UNKNOWN and CONFLICT.
- Exclude dependencies/build output, environment files and local runtime data from discovery.
- User requests direct execution without repeated confirmation. User-specified output directory overrides workflow defaults for worktrees, plans and ledgers; no commit/publish steps.

## Review Focus

1. Method-level guard overrides and roles must not inherit incorrectly.
2. ORM relation lists must not be reported as database foreign keys.
3. Unknown serialization, dynamic paths and test execution must retain uncertainty.
4. Hash routing, nested static hosting and missing search results must remain usable.
5. Invalid evidence/duplicate IDs/dangling relationships/stale curated records must fail validation.

### Task 1: Repository metadata extraction

**Files:** `scripts/analyze/{extract,core}.mjs`, `scripts/validate/validate.mjs`, `tests/extraction.test.mjs`, `data/*.json`.
**Interfaces:** Produces `{meta,inventory,items,coverage}`. Every item has `{id,kind,name,module,status,description,evidence,relatedIds}`. Evidence has `{file,symbol,lineStart,lineEnd,sha256}`. Entity fields/relations and API parameters/guards/roles are typed metadata, not inferred runtime payloads.

- [x] Write tests for route composition, guard override, dynamic path uncertainty, orphan links and invalid evidence.
- [x] Observe failing tests before implementation.
- [x] Implement AST extraction; parse actual schema with Prisma DMMF; inventory all scoped source files, migrations, tests and operational configuration.
- [x] Run extraction and validate source references and relationships.

### Task 2: Behavioral evidence and traceability

**Files:** `data/curated-core.json`, `data/curated-learning.json`, generated `data/system.json`, `reports/{coverage,gaps,analysis-summary}.md`.
**Interfaces:** Curated files export `{items:[...]}` using the shared item schema. `module` uses `MOD-<api-folder>`; entity IDs use `ENT-<PrismaName>`. APIs link by source overlap, not guessed IDs. Diagram items use `{kind:'diagram',diagramType,code,relatedIds}`.

- [x] Review auth, jobs, learning sessions, content publishing, onboarding and IELTS workflows against implementations/tests.
- [x] Record requirements, detailed use cases, rules, diagrams, actors, integrations and uncertainty. Each claim requires evidence.
- [x] Merge through the pipeline; resolve links; classify unreviewed module behavior as partially analyzed.
- [x] Validate all curated references, hashes and relationships.

### Task 3: Interactive atlas

**Files:** `index.html`, `src/{app,views,diagrams,model}.js`, `src/styles.css`, `tests/{model,ui}.test.mjs`, `scripts/{build,serve}.mjs`, `package.json`.
**Interfaces:** UI loads `data/system.json`; details use `#item/<id>`. Diagram code comes only from registry; global search and module/status filters work across all kinds. Source details show evidence location and related records.

- [x] Write behavior tests for search/filter/deep links before implementing model logic.
- [x] Implement 16 sections, detail panel, breadcrumbs, TOC, theme, responsive sidebar, graph zoom/pan/fit, clickable relationships and source explorer.
- [x] Bundle Mermaid locally; build portable static output using relative assets and hash navigation.
- [x] Verify production build with browser smoke tests, diagram parsing, keyboard navigation, mobile layout and console errors.

### Task 4: Final validation and report

**Files:** `README.md`, `reports/{verification,skill-audit,progress}.md`.

- [x] Run the standalone documentation test/lint/typecheck/build/validation commands; do not run production integration tests that mutate databases.
- [x] Fresh review of extraction accuracy, security-sensitive output, UI and evidence integrity; fix material findings.
- [x] Compare source manifest with baseline to confirm production files were not modified by this task.
- [x] Report exact counts, per-module structural/behavioral coverage, gaps, commands and limits.
