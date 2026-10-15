# WorkLingo UI redesign V2

## Constraints

Preserve existing APIs, auth/roles, program activation rules, checkpoints/drafts, audio consent and evaluation lifecycle. No dependencies, backend/schema changes, fake analytics, commits or publishing. Preserve initial untracked `.agents/`, `AGENTS.md`, `skills-lock.json`. Branch starts from current IELTS Phase 8 work so implemented journeys remain available.

## Slices and acceptance

1. Audit: route/style map, skill matrix, baseline existing tests and login screenshot.
2. Foundation: semantic tokens in `styles/tokens.css`, controlled color migration of existing CSS, readable light/dark themes. Theme preference applies before paint, survives reload and blocked storage.
3. Navigation: shared active Navigation and ThemeControl; learner destinations + separate operational admin sidebar. Mobile disclosure keyboard accessible; 44px controls; skip links.
4. Dashboard/catalog: mission/resume precedes optional IELTS; true roadmap/progress, active program badge. Availability/idempotency preserved.
5. Session: focused reader/editor/recorder, progress and contextual objective, useful support disclosure. Existing four-skill, pause/resume and draft tests pass.
6. Public/auth: independent subagent owns landing/auth files. Clear hierarchy, existing real routes and validated forms.
7. Evidence/onboarding/IELTS/settings/admin: consistent themed surfaces, responsive feature layouts, readable dense tables, no changed policies.
8. Verification/report: web lint/typecheck/unit/build; relevant E2E and full `pnpm verify` if local services available; six viewports, theme, keyboard, reflow, console/hydration and screenshots; five-axis diff review.

## Verification economy

Baseline web unit suite once; focused tests per behavior slice; broad gate once after integration. No repeated whole-repository scans. Escalate only on unexplained failures or contract coupling. Runtime evidence distinguishes real API journeys from any browser fixture checks.

## Checkpoint

- Audit complete; baseline 68 files / 273 tests passed.
- Web dev server running on 127.0.0.1:3000; PostgreSQL containers currently stopped.
- Next 16.3.8 bundled CSS/layout docs consulted.
- Foundation/theme, shell/navigation, dashboard/catalog/session, public/auth and cross-route feature styling implemented. Shared components preserve existing hooks/contracts.
- User subsequently authorized and installed UI UX Pro Max, Frontend Design and 15 Superpowers skills. Codex native repo discovery: all enabled, no errors. Existing skills untouched.
- Focused tests and web lint/typecheck/build passed. New responsive UI journey and Foundation/catalog E2E passed.
- Independent review found dark white-background/control/evidence and skip-link issues; corrected, with actual browser contrast guards. Public skip links and first-invalid-field focus added.
- Broad `pnpm verify`: web 69 files / 277 tests green; API 148 files passed / 2 failed (default5432 health and Compose backup/restore prerequisites). Gate stopped before later stages; no backend workaround.
- Full web E2E: 39 passed / 1 admin secondary-page timeout / 7 dependency-skipped. Focused Admin + qualification rerun: 10/10 passed unchanged. Do not report a green full run.
- Theme branch mutation detected by 2/3 tests; source restored and 3/3 passed. Final UI contrast/screenshot journey passed; public-focused checks 9/9 and shell/auth checks 16/16 passed. Final build passed after the last auth-border adjustment; `git diff --check` passed. Evidence in `docs/UI_REDESIGN_REPORT.md`.
- Frontend implementation and repository skill installation delivered. Release qualification remains limited by default5432 health/Compose backup prerequisites and the documented combined-run E2E timeout. No unknown changes were discarded; no commits or publishing performed.
