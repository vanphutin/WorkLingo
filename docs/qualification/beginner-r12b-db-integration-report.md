# R1.2b disposable database integration evidence

Mission WL-R12B-EVIDENCE-CLOSURE-001; MND-20261030-004. Executed 2026-10-30 against the linked qualification worktree. This is real PostgreSQL/Nest integration with synthetic data, separate from mocks and real learner qualification.

Result: **PASS within the tested integration scope**. Five isolation guard tests and seven real database/API/Web integration tests passed. No real provider or shared database was used. No Beginner publication or readiness was granted.

## Executed environment and isolation

- Docker desktop-linux; cached official postgres:17-alpine, pinned `postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`; `--pull=never`.
- Exact container `worklingo-r12b-evidence-closure-001`; exact volume `worklingo-r12b-evidence-closure-001-pgdata`; host binding 127.0.0.1:55433; database `worklingo_r12b_evidence_closure_001`; role `wl_r12b_evidence_001`.
- Fresh disposable password and session secret generated in memory, never printed or committed. Children receive an explicit OS-variable allowlist and fake provider settings. Existing credentials and project env files were not read. No DATABASE_URL fallback.
- Copied unchanged current schema and migrations into the approved migration-snapshot subtree; verified every migration byte hash and schema byte equality. Explicit generated Prisma config avoids the repository config that loads env files. Prisma output confirms config detection and environment-variable loading skipped.
- Schema SHA-256 `62cf277eb66200feb757f145d38534d1d67f8a7f12c3f6e3880cbfbf8e9ffd95`. All **47 current migrations** completed; 48 migration-directory entries include migration_lock.toml.
- Nest AppModule starts with a real PrismaService. NODE_ENV=test and WORKLINGO_BEGINNER_ISOLATED_TEST=1 disable app env loading. Test guards deny env file reads/loadEnvFile, provider fetch, and sockets except the exact disposable DB port and owned HTTP test-server ports.
- Exact resource names and fresh private ownership labels are checked before cleanup; foreign/pre-existing resources cause a stop. No filesystem recursive deletion was performed. Synthetic artifacts and sanitized logs remain in the authorized runtime root.

## Actual assertions

1. Every migration appears finished with no rollback in the real _prisma_migrations table, against SQL-confirmed exact database and role.
2. Eight canonical Beginner sources match pinned source hashes, build valid draft snapshots, and round-trip from real LessonVersion.parsedContent. Each version has eight persisted activity payloads: **8 versions / 64 activities**. Every version remains DRAFT.
3. A real transaction that inserts a lesson and throws leaves no inserted lesson. Duplicate lesson/version violates Prisma P2002; original version count is retained.
4. Unscoped Beginner mutation/publication selection is rejected by the actual policy function with real repository lookups; zero canonical Beginner versions become PUBLISHED. No permission records or private grants were manufactured.
5. Real Nest HTTP registration and onboarding persist a learner and one enrollment. Repeated clientSessionId returns the same session. Start/resume retain the plan. Learner DTO excludes passwordHash/privateCriteria/evaluationContext. A writing attempt is processed through the existing fake language evaluator and real job/database pipeline; one EvaluationResult persists. Re-evaluation reuses that result without adding/changing history; attempt remains EVALUATED.
6. Explicit env-file loading and external fetch are rejected.

The HTTP and actual Web learner/evaluation pipeline uses the existing seedFoundationCurriculum **Intermediate Foundation fixture**, not a published Beginner lesson. Canonical Beginner snapshots are independently tested as unpublished draft persistence. This distinction is essential: actual scoped Beginner publication/enrollment/session execution still needs genuine private grants and qualification evidence.

## Verification and reproduction

From repository root:

```powershell
node --require ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cjs/index.cjs --test apps/api/test/beginner-pilot/disposable-db.test.ts
node --require ./node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/cjs/index.cjs apps/api/test/beginner-pilot/disposable-db.ts
node apps/api/node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json
```

Focused ESLint ran on all four new TypeScript files using installed eslint9.39.1; PASS. API no-emit typecheck PASS. Guard tests: **5/5 PASS**. Real integration: **7/7 PASS, zero skipped**; final verified run approximately149.55s (Vitest), including the real browser journey and fresh production Web build, excluding container/migration orchestration. Parent owns the broader mission regression/build verification; unsafe default integration config was intentionally not run.

TDD: initial guard skeleton produced three expected assertion failures (missing DSN/child-environment/ownership guards), then implementation produced3/3GREEN; extended guard suite5/5GREEN. First integration attempt failed at collection due to virtual setup resolution; fixed suffix resolution. Tightened network guard then caught a synchronous supertest listen registration race (5PASS/1FAIL); corrected ownership registration, subsequent complete runs6/6PASS. Typecheck caught a fixture-only nonexistent activity title field, removed it; final typecheckPASS. These were tooling/test corrections; protected production sources were untouched.

Sanitized runtime artifacts: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r12b-evidence-closure-001/artifacts/migration-result.txt` and `db-integration-result.txt`. Fresh passwords/DSNs/session secrets are redacted from captured child output before persistence or display.

## Limits and remaining evidence

- No physical power-loss, storage power-cut or distributed durability assertion follows from this DB test. Parent owns separate process/filesystem fault evidence.
- No complete repository-wide DB suite, PostgreSQL version matrix, sustained load, production migration, production rollback, restore exercise, real provider quality, actual learner consent/session or human expert qualification was performed here.
- The observed rollback is an application transaction rollback, not a production migration downgrade or disaster-recovery proof.
- Cached result persistence is tested for one existing writing flow with fake language output; it does not authenticate remote provider receipts or prove grading accuracy.
- This report is AI-authored engineering evidence. Independent review and all release gates remain separate.

SKILL AUDIT
Used: test-driven-development -> isolation guards RED/GREEN; nestjs-expert -> actual Nest DI/application/HTTP validation integration; supabase-postgres-best-practices -> bounded real PostgreSQL connections/transaction evidence; git-workflow-and-versioning -> preserve concurrent unrelated changes and exact five-file ownership; verification-before-completion -> fresh test/lint/typecheck/cleanup evidence.
Verification: 5guardPASS;7realintegrationPASS;focusedlintPASS;APIno-emittypecheckPASS;exactownedDockerresourcesremoved.
Not used: shared integration harness because it reads project Prisma env config, has a shared DB fallback and unrestricted temp cleanup; production migrations, real providers and broad default test command are outside this isolated scope.

## Actual Web → Nest → PostgreSQL evidence and fresh production build

An additional isolated Playwright Chromium test **passed** using actual tracked frontend source, actual Nest listeners, actual PostgreSQL and no API mocks. Registration used the rendered Web form; onboarding used browser fetch through the real Next proxy; the dashboard Start60-minute action opened a persisted session; page reload restored that session. SQL independently confirmed the synthetic user, exactly one enrollment and exactly one session whose ID matched the browser URL. Provider access remained fake/disabled. No real browser profile or desktop was controlled.

The frontend was copied to fresh `artifacts/frontend-<private-owner-UUID>` from tracked root package/config files, packages, apps/web/src, named Next/TypeScript files and e2e/fixtures required by source typechecking. Env files, existing .next builds and existing Playwright/global setup/teardown were excluded. Installed dependencies were explicitly linked; source bytes were compared after copying. `artifacts/frontend-source-manifest.json` records SHA-256 per copied source. Next generated declarations/build output only inside the disposable snapshot; tracked next-env.d.ts remained untouched.

After the browser and dev server stopped, fresh production `next build --webpack` ran in that no-env snapshot with sanitized child environment and env-read-denying preload. **Production Web build PASS**, including optimized compilation, TypeScript and generated routes. Output: `artifacts/web-production-build.txt`; dev output: `artifacts/web-db-result.txt`. Existing Playwright config/run-next.mjs were not invoked because they load workspace env and introduce shared database fallback/setup.

Additional observed corrections: first Web navigation timed out during fresh compilation at30seconds; navigation limit became120seconds. Browser APIRequestContext was replaced by actual page-context fetch so onboarding uses the owned browser loopback route. First production compilation succeeded but typecheck found a tracked e2e fixture imported by a source test; copied that required tracked fixture directory and reran. Final combined result **7/7 PASS** includes the fresh production build. This is a synthetic Foundation browser start/resume journey, not a full activity-completion journey, not eight published Beginner Web journeys, and not real learner evidence.

Final frontend source-manifest SHA-256: `e0ebda6f2a428c6e0ecddf9aa235dbee2ed470847f53cbb9e9f5743dfe4f2d6f`. Final production log reports compilation41s and TypeScript25.7s with successful route generation. Final API no-emit typecheck and focused four-file ESLint both exited0. Post-run exact-name Docker container/volume listings and owned-runtime Node process query were empty; tracked apps/web/next-env.d.ts has no Git change.
