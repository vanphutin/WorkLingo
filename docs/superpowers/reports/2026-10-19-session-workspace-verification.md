# Session workspace verification — 2026-10-19

## Authorized behavior

- All learning sessions use the available browser width, across Reading, Listening, Speaking and Writing.
- Only actual source content creates a text pane. Source text stays left; questions, response controls and Continue stay right. No sample text or empty placeholder is invented.
- Without source text, the response area occupies the main space with compact support alongside it.
- Listening uses its audio player in the source pane. Raw text does not pass through the generic source renderer; transcript reveal still requires six complete listens and an explicit action while questions remain unanswered.
- Session information and AI feedback remain separate from answer controls, below the response card when a source pane is present.
- Narrow viewports stack content, with links between the source and response areas.

## Implementation

`ActivityWorkspace` owns the shared composition. `ActivityRenderer` composes Reading/Writing/Speaking with real source content. Listening supplies its stateful audio panel to the same workspace. `SessionShell` passes existing submission actions and support as slots, retaining submission, pause/resume and evaluation behavior.

Styles are scoped to learning/session containers. Existing unrelated settings, admin and global stylesheet edits were preserved. No dependencies, backend rules, published lesson content or learner answers were changed.

## Verification

- Red: four new tests failed before implementation because separate source/response regions and the colocated Continue action were absent.
- Focused session regression: 99/99 tests passed, including no-source content, answer selection, locale preservation and listening transcript gating.
- Full frontend: `pnpm --filter @worklingo/web test --maxWorkers=2`: **124 files, 754/754 tests passed**.
- `pnpm --filter @worklingo/web typecheck`: passed. A corrupt generated Next route declaration was regenerated before checking; no generated file is included in the change.
- ESLint for all modified React/test files: passed.
- `node scripts/i18n-check.mjs`: 0 errors; English/Vietnamese source and response labels included.
- `git diff --check` for modified files: passed.
- Browser verified the existing Restaurant session without submitting an answer. At 1920 px, source and response started on the same row and used approximately 1020/765 px respectively. At 1280 px, both columns remained available. At 390/320 px they stacked, source scrolling became normal page scrolling, and the question jump link worked. No horizontal overflow at any tested width. Temporary viewport overrides were reset.
- Desktop and mobile screenshots remain local in `.superpowers/session-layout-desktop.png` and `.superpowers/session-layout-mobile.png`; screenshots contain the signed-in learner UI and are not committed.

The first broad run exposed two outdated localization expectations: the former AI heading and the previous direct Reading component ownership of source text. Tests now verify the current queued AI status and the public activity workspace in Vietnamese. The final full frontend run is green.

No production build, backend suite or real AI/audio-provider request was needed for this layout-only change. This does not resolve the separate Intermediate business-flow audit findings.

## Skill audit

- Brainstorming: applied the explicit source-left/response-right requirement and subsequent no-placeholder clarification as a small scoped change.
- UI/UX Pro Max: responsive reading width, overflow, keyboard access and compact supporting information.
- Vercel React best practices: shared composition and derived layout without duplicate state/effects or dependencies.
- TDD: observed red tests, then implemented and verified the behavior.
- Git workflow: existing isolated checkout, explicit file staging and a dedicated local commit.
- Verification before completion: checks and browser evidence above, no extrapolated backend/AI success claim.
- Code review and quality: reviewed data visibility, transcript gating, selection persistence, layout scope and generated/unrelated files before committing.
