# Intermediate JSON and sidebar verification — 2026-10-19

## Delivered

- Versioned, strict JSON for one topic: paste or local file up to 1 MB, complete example, form export and explicit application.
- Array-driven language blocks and questions; valid answer indexes, evidence bounds, unique slugs and existing source delimiter constraints checked before application.
- Invalid JSON preserves form fields. Replacing unsaved fields requires confirmation. Pending JSON protects navigation and blocks save/review until applied or cleared.
- Intermediate sidebar groups topic list/new links and retained legacy category routes; exactly one current destination.
- Import fills the existing form. It does not save, call AI, approve, publish or change curriculum automatically.

## Evidence

- Full web suite: **115 files / 684 tests passed** before the final empty-buffer review fix.
- Final focused suite after that fix: **11 files / 125 tests passed**, including Intermediate model/form/review/routes, navigation and navigation guards.
- Web lint and TypeScript passed; i18n checker: **36 namespaces / 2244 paired keys / 0 errors**. Diff whitespace check passed.
- Browser smoke against actual Next pages: Vietnamese menu/list/new selection, invalid paste preservation, erase-buffer unlock, local file import, explicit apply, JSON download, source save and separate human approval controls.
- Browser fixtures intercepted all API requests. Desktop 1440 px and mobile 375 px screenshots inspected; no horizontal overflow or page errors.
- The example's serialized source passes `analyzeLessonSource(...).canPublish`; this checks content format only, not approval/audio/publication readiness.
- Independent bounded review found one P2: erasing JSON manually kept save/review locked. A failing regression reproduced it, then the fix and final focused tests passed.

## Limits

No production build or backend suite rerun for this frontend-only increment. No backend, database, dependency or route schema changes; no live AI calls or user-record mutations.

Question counts follow the imported arrays (up to 100 reading and 100 listening questions in JSON). A longer source passage does not generate additional questions automatically. AI currently proposes session time only; question generation and content approval would be a separate feature. The learner consumes the published activity snapshot.
