# Intermediate category authoring implementation plan

**Goal:** Give every Intermediate category its own lesson list, Add lesson route and structured add/edit form, reachable directly from the program overview and sidebar.
**Spec / user intent:** The user rejected the shared-library-only Intermediate workspace on 18/10/2026 and requires each section to have its own Add lesson function, including future sections. They previously delegated routine design decisions. Use seven existing product categories: grammar, pronunciation, vocabulary, reading, listening, speaking, writing. Foundation/TOEIC stay deferred.
**Architecture:** Reuse ContentImport persistence, revision protection and lifecycle API. Store explicit optional program/category/template metadata inside raw lesson source; no database migration or inferred classification of old lessons. Keep learner curriculum assignment/publication separate from authoring classification. Current running parser supports Format 1.0/1.1; do not merge the separate Intermediate 1.2 branch or change assessment policy.
**Tech stack:** Existing Next.js/React, Zod, content-format parser, Vitest.

## Interfaces / ownership

Coordinator owns content-format metadata/parser/tests and `features/admin-intermediate/lesson-model.ts` / `.test.ts`; docs and final integration.

`@worklingo/content-format` exports `intermediateCategories` (seven slugs above), `IntermediateCategory`, `isIntermediateCategory(value: string): value is IntermediateCategory`. LessonNode gains optional `program`, `category`, `authoringTemplate` fields, sourced from `program`, `category`, `authoring_template` in [LESSON]. Metadata is optional for legacy source. If present, program must be intermediate, category valid and paired; template is `intermediate-form-v1` for managed forms. Normalizer/runtime unchanged; raw source is persisted and remains canonical for classification.

`lesson-model.ts` exports:

- `IntermediateLessonDraft` with string `slug,title,level,objective,readingText,speaker,dialogue,activatePrompt,speakingPrompt,speakingModel,writingPrompt,writingModel`; number `durationMinutes`; `languageBlocks: {slug,expression,meaningVi,pronunciation,grammarPattern,example,commonError,collocations:string[]}[]`; `readingQuestions` / `listeningQuestions: {slug,prompt,options:string[],answerIndex:number,explanation:string,evidenceLine:number}[]`.
- `createIntermediateLessonDraft(category: IntermediateCategory): IntermediateLessonDraft` — empty editable draft with unique slug, B1, 60 minutes, one language block, two options per comprehension question, one question per skill.
- `serializeIntermediateLesson(category, draft): string` — emits source Format 1.0 with explicit program/category/template and four skill activities; rejects source delimiter/section injection and invalid scalar values. Drafts may contain unfinished educational fields; publishing remains existing validation's job.
- `readIntermediateLesson(source, category): IntermediateLessonDraft | null` — only managed source that can be represented losslessly; custom/unsupported content returns null, never silently drops fields.
- `getIntermediateCategory(source): IntermediateCategory | null` — explicit source metadata only; never infer program/category from level, title or an activity skill.

UI worker owns ONLY `intermediate-lesson-editor.tsx`, `intermediate-lesson-editor.test.tsx`, `intermediate-authoring.css`, `i18n/messages/adminIntermediate.ts`.

- Export `IntermediateLessonEditor({category, importId?}: {category: IntermediateCategory; importId?: string})`.
- Load by ID with cancellation guard; reject wrong category; preserve unrelated/custom source with clear advanced-editor link.
- Common lesson/language/context fields; category-specific emphasis and labels. Reading/Listening expose separate question lists/options/correct answer/evidence; audio shows named gender format. Speaking/Writing expose separate prompts/models. Grammar/pronunciation/vocabulary emphasize their own fields. All required supporting activities remain editable under an expandable section.
- Create via apiClient.createContentImport(serializedSource), route to own `/admin/programs/intermediate/${category}/${id}`. Save only selected draft via updateContentSource with expectedDraftRevision. Link existing validation/audio/publish workspace for the same ID; no auto publication, no forced shared import form.
- Test all seven forms, correct metadata/create destination, revision save, conflict preserves inputs, unknown source refusal, stale request cancellation and bilingual accessible controls.

Navigation/list worker owns ONLY `intermediate-category-workspace.tsx`, `intermediate-authoring-hub.tsx`, their tests and `intermediate-navigation.css`, `i18n/messages/adminProgramAuthoring.ts`, new route files below intermediate/[category], admin-dashboard integration/tests/messages if necessary, sidebar/breadcrumbs/tests, ContentList optional href/label props+tests.

- Hub export `IntermediateAuthoringHub()` with seven labeled cards, separate Add lesson/list links; use explicit metadata to count/filter. Legacy/unclassified shared library link is clearly labeled.
- Category list export `IntermediateCategoryWorkspace({category})`, loads imports and filters via getIntermediateCategory, uses existing per-row lifecycle protections and reload callback. ContentList optional `newImportHref`, `newImportLabel`, `getItemHref` preserve defaults for shared tools; category links use own add/edit routes.
- Routes `[category]/page.tsx`, `[category]/new/page.tsx`, `[category]/[importId]/page.tsx` validate category server-side via notFound; await Next params. Editor imported from UI worker's file. Breadcrumbs and sidebar expose category hierarchy, selected category and New lesson/details.
- Intermediate program overview must show the seven Add lesson functions prominently; do not hide them behind the existing generic shared-tools panel. Keep IELTS destinations and deferred Foundation/TOEIC.

## Tasks and gates

- [x] Coordinator: metadata/model tests RED → parser/serializer implementation → format suite and model tests GREEN. Verify all generated categories parse and normalize; arbitrary/custom source never loses fields on structured edit.
- [x] UI worker: component tests RED → seven category forms and per-ID create/edit → focused tests/lint GREEN. No shared helper/model edits.
- [x] Navigation worker: routes/list/hub/navigation tests RED → integration and category filtering → focused tests/lint GREEN. No model/editor edits.
- [x] Coordinator: integrate, full web suite, content-format suite, API publisher/import compatibility tests, lint/typecheck/i18n, isolated web build, browser smoke desktop/mobile EN/VI using fixtures.
- [x] Independent review against all above requirements, fix concrete issues with regressions; document checks and commit explicit files locally. No push/merge, dependency changes, live DB changes/publication, broad DB/E2E suites or server restarts by workers.

Review follow-up: protect dirty drafts during sidebar/breadcrumb/brand navigation with a shared admin guard; retain the existing unload warning. Verify cancellation preserves fields, confirmation permits leaving and saved/clean drafts do not prompt. Place category navigation directly beneath Intermediate. These are corrections within the approved authoring flow, not a new content or assessment scope.

## Review focus

- New category records remain in the correct list after save/reload, including explicit metadata; legacy and other programs do not leak into lists.
- Generated source delimiters cannot be injected through multiline author fields; source round-trip preserves supported content and refuses unsupported layouts.
- Switching/unmounting or failed requests cannot overwrite a different record or erase dirty edits.
- Category/program routes reject invalid slugs and wrong-category IDs; locale switches preserve inputs.
- Every overview card and category page has its own working Add lesson link and form; no category is a cosmetic link to the same raw import textarea.
