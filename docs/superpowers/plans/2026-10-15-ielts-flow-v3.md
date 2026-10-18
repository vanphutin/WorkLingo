# IELTS Flow V3 Implementation Plan

**Implementation authorization:** Approved by the user with “duyệt” on 2026-10-15. Proposed defaults and content scope below are now approved for local inline implementation. Planning-only restrictions describe the preceding planning phase.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay flow năm cửa khóa bằng ba mục độc lập: giới thiệu xem lại được, học theo topic/ngữ cảnh từ 90 phút, và mock với hai chế độ có hành vi thật.

**Architecture:** Giữ modular monolith, immutable publications và session pinning. Topic mới tạo LearningSession thật từ curriculum IELTS qua SessionCreationService; tái sử dụng player, attempts, audio, mastery và đánh giá. Intro visit tách khỏi earned Orientation completion; mock ghim chính sách theo attempt để nâng cấp không đổi bài đang làm.

**Tech Stack:** NestJS, Prisma/PostgreSQL, shared Zod contracts, Next.js/React, local object storage, Vitest, Playwright, existing content-format.

**Spec:** `docs/superpowers/specs/2026-10-15-ielts-flow-v3-design.md`.

## Global Constraints

- Ba mục mở độc lập; chỉ gợi ý xem slide trước. Không dùng Foundation/Intermediate/Intro/Bridge/Band completion để mở flow V3.
- Learner ACTIVE, đăng nhập và onboarding chung COMPLETE; giữ quyền sở hữu, consent và publication checks.
- Topic choice là đề xuất user chọn + hệ thống gợi ý; thời lượng mới `[90,120,150]`, mặc định `90`; legacy 60 phút vẫn resume.
- Topic/IELTS scope không đổi active program hoặc level Intermediate; không trộn mastery/review/analytics giữa hai chương trình.
- Hai lựa chọn mock mới là PRACTICE và EXAM_SIMULATION; LEARNING và attempt cũ giữ legacy-v1.
- Không đánh dấu học thuật/điểm hoàn thành chỉ vì đã xem slide, được cấp quyền, chạy hết đồng hồ hoặc AI còn pending.
- Không sửa/xóa snapshot, đáp án, report, version pin hoặc early-access grant cũ.
- Chỉ sửa tài liệu trong giai đoạn lập kế hoạch này; không chạy migration, publish, grant/revoke hay provider.
- Thực thi sau khi duyệt; stage từng hunk/file thuộc task. Working tree hiện đang có nhiều thay đổi đã được user yêu cầu: không blanket stage, reset, auto-merge hoặc commit chúng vào task mới.

## Review Focus

1. Topic/version hoặc UUID đổi giữa hai tab: chỉ một phiên đúng topic, không replay sang topic khác. Task 5.
2. Archived publication/đổi nội dung giữa lúc học/xem lại: giữ snapshot đang ghim; chỉ new start dùng bản hợp lệ. Tasks 3–5.
3. Active program Intermediate trong khi học IELTS: không đổi context, không lẫn Word Bank/mastery/analytics. Tasks 4–6.
4. Refresh, timeout, đồng hồ client hoặc retry audio: không reset deadline/tiêu thụ lượt nghe hai lần hoặc lộ đáp án trước nộp. Tasks 7–8.
5. Cắt sang V3 rồi rollback với phiên cũ/mới đang mở: vẫn resume được, không nâng band hay tạo completion giả. Task 11.

## File structure and interfaces

New focused boundaries:

- `packages/contracts/src/ielts-flow.contracts.ts`: overview, intro visit and three-section availability.
- `packages/contracts/src/ielts-study.contracts.ts`: topic/pack/version and new-session input; generic session response remains LearningSessionDto.
- `apps/api/src/ielts-flow/`: rollout/admission/readiness; no cross-module completion gates.
- `apps/api/src/ielts-orientation/application/ielts-introduction.service.ts`: view/revisit only, reuses published presentation/media.
- `apps/api/src/ielts-study/`: immutable topic publishing and topic→LearningSession adapter; imports existing engines, never the reverse.
- `apps/api/src/ielts-mock/domain/mock-mode-policy.ts`, `application/mock-attempt-clock.ts`, `mock-section-review.service.ts`, `mock-playback.service.ts`, `mock-recording.service.ts`: separate mode rules, timing, answers after submission, transport and recordings.
- Web `features/ielts-introduction/`, `features/ielts-study/`: new UX; retain legacy feature folders for history/resume.
- `content/ielts/topics/`, `content/ielts/mocks/`: reviewable original content, manifests and qualification evidence; actual media stays in existing storage.

Keep one coordinated plan: the three sections are independent learner choices, but share rollout, identity, publication and compatibility. Each task below produces a separately reviewable deliverable.

## Task 1: Contracts, policy versions and V3 admission

**Files:** Create `packages/contracts/src/ielts-flow.contracts.ts`, `ielts-flow.contracts.spec.ts`, `ielts-study.contracts.ts`, `ielts-study.contracts.spec.ts`; modify `packages/contracts/src/index.ts`, `ielts-mock.contracts.ts`, `ielts-mock.contracts.spec.ts`; create `apps/api/src/ielts-flow/domain/ielts-flow-policy.ts`, `.spec.ts`; modify `apps/api/src/common/config/app-config.schema.ts` and its existing tests.

**Interfaces:** Export `ieltsStudyDurationSchema`, `IeltsStudyDuration = 90|120|150`; `StartIeltsTopicSessionInput {clientSessionId, topicVersionId, packSlug, durationMinutes}`; `IeltsFlowOverviewDto {flowVersion:'legacy'|'v3', introduction, study, mock}` where each section is `{available:boolean, reason:'CONTENT_UNAVAILABLE'|null}`. `IeltsMockPolicyVersion='legacy-v1'|'v2'`; `NewIeltsMockMode='PRACTICE'|'EXAM_SIMULATION'`. `canEnterIeltsV3({role,status,onboardingStatus,programStatus}):boolean`. New mock content schemaVersion 2 adds qualification evidence; v1 remains readable via a discriminated union.

Additional DTOs defined here: `IeltsIntroductionDto {presentation:OrientationLearnerPresentation,visit:IeltsIntroductionVisitDto|null,currentPublishedVersionId:string|null}`; visit has `orientationVersionId,lastSlideIndex,visitedSlideIds,viewedAllAt,revision`. `IeltsTopicCatalogDto {topics:[{id,topicVersionId,title,description,packs:[{slug,difficulty,supportedDurations,chunkCount,contexts}],activeSessionId}],recommendations:[{topicVersionId,reason}]}`. `IeltsStudyProgressDto` contains `completedSessionCount,practicedChunkCount,masteredChunkCount,pendingEvaluationCount,dueReviewCount` and per-skill `{skill,evaluatedCount,pendingCount,score:number|null}`. `IeltsContentQualificationResult {canPublish:boolean,supportedDurations:IeltsStudyDuration[],qualifiedModes:NewIeltsMockMode[],issues:[{code,path,message}]}`. A practiced chunk has an actual attempt; a mastered chunk has STABLE records for all four skills under existing mastery policy, never only a viewed card. New attempt DTOs add `policyVersion,elapsedMs:number,pausedAt:ISODateTime|null`; legacy responses default safely without changing old timing logic. Overview section adds `resumeHref:string|null`; history types are `IeltsHistoryItem {kind,id,title,href,updatedAt,state:'viewed'|'in-progress'|'completed'|'pending-review'}` and `IeltsHistoryPageDto {items:IeltsHistoryItem[],nextCursor:string|null}`; kind is introduction/topic-study/legacy-bridge/legacy-integrated/legacy-band/mock.

- [ ] Write failing contract/policy tests: `ieltsStudyDurationSchema.safeParse(60).success === false`, `[90,120,150]` accepted; active onboarded learner with no Foundation/enrollment/grant admitted; disabled/admin rejected; v1 paper/LEARNING attempt still parses; new V3 mode LEARNING rejected; V2 content without qualification cannot declare EXAM_SIMULATION.

```ts
expect(ieltsStudyDurationSchema.safeParse(60).success).toBe(false);
expect([90, 120, 150].every(n => ieltsStudyDurationSchema.safeParse(n).success)).toBe(true);
```
- [ ] Run `pnpm --filter @worklingo/contracts test src/ielts-flow.contracts.spec.ts src/ielts-study.contracts.spec.ts src/ielts-mock.contracts.spec.ts` and API policy test; verify RED for the exact missing behavior.
- [ ] Implement the types and pure policy. Add server `WORKLINGO_IELTS_FLOW=legacy|v3`, default legacy. Keep legacy read enums and 60-minute plan schemas unchanged; server chooses attempt policy, client cannot set it.
- [ ] Rerun those tests and both package typechecks; require GREEN. Verify missing individual content is representable without global lock.
- [ ] Review the scoped diff; commit only this task's reviewed hunks if commits are authorized.

## Task 2: Additive storage and compatibility fixtures

**Files:** Modify `apps/api/prisma/schema.prisma`; create `apps/api/prisma/migrations/20261015000200_ielts_flow_v3/migration.sql`, `apps/api/test/integration/ielts-flow-v3-schema.integration.spec.ts`. This follows the observed 20261015000100 early-access migration; if another task takes this timestamp before execution, update the plan to the next free monotonic name before adding the migration.

**Interfaces:** Add `IeltsIntroductionVisit(learnerId,orientationVersionId,lastSlideIndex,visitedSlideIds,viewedAllAt,revision)` unique learner/version; `IeltsTopic` parent with draft revision/current pointer; `IeltsTopicVersion(topicId,version,status,content,publishedAt,archivedAt)`; `IeltsTopicSession(sessionId PK/FK,topicVersionId,packSlug)` referencing LearningSession. Add mock `policyVersion default legacy-v1`, pause/elapsed fields. Add `IeltsMockPlayback` unique `(attemptId,assetId)` for strict-mode lease, and `IeltsMockRecording` unique `(attemptId,clientRecordingId)` with part, storage metadata, consent/retention timestamps. Existing status stays source of truth; do not duplicate LearningSession status in TopicSession.

- [ ] Write a migration rehearsal fixture containing old 60-minute Integrated sessions, Orientation answers, an incomplete old mock, report and early-access grant. Assert all values/pins unchanged after upgrade; new users/attempt rows use safe defaults; invalid FKs/duplicate session bindings rejected.

```ts
expect(after.legacySessions).toEqual(before.legacySessions);
expect(after.legacyAttempt.policyVersion).toBe('legacy-v1');
expect(after.earlyAccessGrant).toEqual(before.earlyAccessGrant);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run test/integration/ielts-flow-v3-schema.integration.spec.ts`; verify RED on an isolated schema.
- [ ] Add the migration with restrictive history FKs and indexes on learner/version/topic session and live attempt lookup. No data copy from earned-progress tables into new visit/access rows. Preserve all existing columns.
- [ ] Generate Prisma and rerun schema rehearsal/typecheck. On Windows stop only the verified local API process if the generated engine DLL is locked, then restart; do not reset the database.
- [ ] Review migration/defaults/locks; scoped commit only after passing checks.

## Task 3: Introduction can be opened, skipped and genuinely reviewed

**Files:** Create `apps/api/src/ielts-orientation/application/ielts-introduction.service.ts`, `.spec.ts`, `ielts-introduction.controller.ts`, `dto/ielts-introduction.dto.ts`; modify `ielts-orientation.module.ts`; create `apps/web/src/app/(learner)/ielts/introduction/page.tsx`, `features/ielts-introduction/introduction-player.tsx`, `.test.tsx`, `.css`, `lib/api/ielts-introduction-client.ts`, `i18n/messages/ieltsIntroduction.ts`; create `apps/api/test/integration/ielts-introduction-v3.integration.spec.ts`.

**Interfaces:** `IeltsIntroductionService.get(learnerId, versionId?):Promise<IeltsIntroductionDto>` and `visit(learnerId,{orientationVersionId,slideIndex,expectedRevision}):Promise<IeltsIntroductionVisitDto>`; GET `/me/ielts-introduction`, PUT `/me/ielts-introduction/visit`, GET `/me/ielts-introduction/media/:assetId?versionId=...`. Presentation reuses existing learner-safe Orientation shape; no answerIndex exposure. GET never creates a visit/progress row.

- [ ] Write tests: a learner without Foundation opens current slides; all slides can be reached after viewing all; skip links go to learn/mock; viewing/reviewing creates no OrientationProgress/mastery. Publish replacement then resume owned old visit; foreign/unreferenced archived media gives 404; current version media works before first saved visit.

```ts
expect(review.presentation.slides).toHaveLength(published.slides.length);
expect(oldProgressAfter).toEqual(oldProgressBefore);
expect(foreignMediaResponse.status).toBe(404);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-orientation/application/ielts-introduction.service.spec.ts test/integration/ielts-introduction-v3.integration.spec.ts` and `pnpm --filter @worklingo/web test src/features/ielts-introduction/introduction-player.test.tsx`; verify RED.
- [ ] Implement free slide navigation, saved visit/optional viewed badge, pinned revisit/latest-version choice and non-autoplay audio. Keep old Orientation start/update completion behavior under legacy routes.
- [ ] Verify GREEN, EN/VI, keyboard navigation and actual completed→review rendering; no completion reset required.
- [ ] Review/commit the scoped deliverable.

## Task 4: Topics and real contextual content publishing

**Files:** Create `apps/api/src/ielts-study/ielts-study.module.ts`, `ielts-topics-admin.controller.ts`, `dto/ielts-topic-admin.dto.ts`, `application/ielts-topic-admin.service.ts`, `.spec.ts`, `domain/ielts-topic-validation.ts`, `.spec.ts`; create `packages/content-format/src/ielts-topic-manifest.ts`, `.spec.ts`; modify `packages/content-format/src/index.ts`, `apps/api/src/app.module.ts`; create `apps/web/src/app/(admin)/admin/ielts-topics/page.tsx`, `features/ielts-study-admin/topic-editor.tsx`, `.test.tsx`, `lib/api/ielts-topic-admin-client.ts`.

**Interfaces:** `IeltsTopicContent {schemaVersion:1,title,description,packs:[{slug,difficulty,curriculumRevisionId,focusChunkSlugs,contexts:[{slug,title}]}]}`. `saveDraft(actorId,topicId,{expectedRevision,idempotencyKey,content})`, `validate(topicId,{expectedRevision})`, `publish(actorId,topicId,{expectedRevision,idempotencyKey})`. Admin routes `/admin/ielts-topics`, `/:id`, `/:id/validate`, `/:id/publish`. Each pack references one real IELTS mission/curriculum revision with one lesson version; metadata never overrides the lesson snapshot.

- [ ] Write tests rejecting an Intermediate mission, missing/archived revision, fewer than 12 meaningful chunks/two contexts, unreferenced chunks, unsupported difficulty pack, unsupported answer variants and unplayable listening. Two concurrent publishers with the same revision cannot both replace the current pointer; old versions remain immutable.

```ts
expect(wrongProgram.issues.map(issue => issue.code)).toContain('IELTS_TOPIC_WRONG_PROGRAM');
expect(currentPublishedVersions).toHaveLength(1);
expect(oldPinnedContentAfter).toEqual(oldPinnedContentBefore);
```
- [ ] Run `pnpm --filter @worklingo/content-format test src/ielts-topic-manifest.spec.ts`, `pnpm --filter @worklingo/api exec vitest run src/ielts-study/domain/ielts-topic-validation.spec.ts src/ielts-study/application/ielts-topic-admin.service.spec.ts` and `pnpm --filter @worklingo/web test src/features/ielts-study-admin/topic-editor.test.tsx`; verify RED.
- [ ] Implement transactional version publishing with existing auth/audit/receipt conventions and existing Content Import pipeline for LessonVersion. Validate duration availability with the real planner and all four skills. Require IELTS-specific Word Bank/Language Block IDs and `ielts-` slugs; no ID reuse across programs.
- [ ] Run GREEN tests, including Admin preview→publish→learner-safe manifest. The UI shows exact missing-content issues before publishing.
- [ ] Review/commit this authoring deliverable.

## Task 5: Topic session creation and scoped learning evidence

**Files:** Create `apps/api/src/ielts-study/application/ielts-study.service.ts`, `.spec.ts`, `ielts-study.controller.ts`, `dto/ielts-study.dto.ts`, `application/ielts-study-progress.service.ts`, `.spec.ts`; modify `ielts-study.module.ts`, `apps/api/src/mastery/domain/mastery.types.ts`, `mastery/application/mastery.service.ts`, `mastery/application/mastery-map.service.ts`, `mastery/mastery.controller.ts`, `curriculum-foundation/application/curriculum-progress.service.ts`, `analytics/application/dashboard-analytics.service.ts`; create `apps/api/test/integration/ielts-study-session.integration.spec.ts`; extend `test/integration/program-learning-boundaries.integration.spec.ts`.

**Interfaces:** `catalog(learnerId):Promise<IeltsTopicCatalogDto>`, `start(learnerId,input:StartIeltsTopicSessionInput):Promise<LearningSessionDto>`, `progress(learnerId):Promise<IeltsStudyProgressDto>`; GET `/me/ielts-study/topics`, GET `/me/ielts-study/progress`, POST `/me/ielts-study/sessions`. `ReviewSelectionOptions` adds optional `programId`/`languageBlockIds`; `getMasteryRecords(learnerId,skill?,scope?:{programId:string})` preserves prior positional arguments. Other learner mastery reads take optional server-owned scope, defaulting to current active program; never trust a raw client-selected mission/revision/learner ID.

- [ ] Write tests: new session 60 rejected but old 60 resumes; 90/120/150 generate 6/8/10 canonical blocks with four skills and unique activity IDs. A same UUID/different topic, pack or duration yields 409; concurrent identical requests return one session. Archive/republish between request and transaction cannot change the pinned target.
- [ ] Add boundary tests: active Intermediate remains byte-for-byte unchanged; create only the required IELTS enrollment without switching active program; completing topic activity updates IELTS mastery/objectives only. Review scope is filtered before limit/scheduler; otherwise due Intermediate items could crowd out IELTS reviews. Pending/failed productive evidence never counts as mastered.

```ts
expect(new Set(created.plan.blocks.flatMap(block => block.activityIds)).size).toBe(plannedActivityIds.length);
expect(afterIntermediateContext).toEqual(beforeIntermediateContext);
expect(masteredChunkCountWhileEvaluationPending).toBe(0);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-study/application test/integration/ielts-study-session.integration.spec.ts test/integration/program-learning-boundaries.integration.spec.ts`; verify RED.
- [ ] Implement the adapter: validate current topic version/pack and released program inside transaction; resolve mission via `CurriculumService.getPublishedMissionForRevision`; upsert IELTS enrollment scoped to that real level; call `SessionCreationService.create(tx,input)`; insert TopicSession in the same transaction. Replay validates TopicSession binding before returning. Reuse existing session GET/start/submit/recording APIs and objective projector, not the Integrated four-task engine.
- [ ] Make mastery/analytics reads explicitly program-scoped; user-facing Intermediate totals and Error Bank stay scoped by default. Run GREEN tests plus existing session-ownership and boundary regressions; review/commit.

## Task 6: Study catalogue, launch, resume and useful completion

**Files:** Create `apps/web/src/app/(learner)/ielts/learn/page.tsx`, `features/ielts-study/topic-catalog.tsx`, `.test.tsx`, `study-summary.tsx`, `.test.tsx`, `ielts-study.css`, `lib/api/ielts-study-client.ts`, `.test.ts`, `i18n/messages/ieltsStudy.ts`; modify `app/(learner)/sessions/[sessionId]/page.tsx`, `features/learning-session/session-shell.tsx`, `session-shell.test.tsx` only at the existing navigation/context boundary; add `apps/web/e2e/ielts-study.spec.ts`.

**Interfaces:** Consumes Task 5; resume uses `/sessions/:id`, with server-owned TopicSession metadata determining `Back to IELTS study`, not a client query parameter. Topic selection persists only until start; retry uses the same pending UUID until outcome is known.

- [ ] Write UI tests selecting topic→pack→90 minutes; only authored packs/durations enabled; topic sample shows actual chunks and contexts; user can reach speaking and writing; resume returns to same topic. Completed summary distinguishes submitted, pending, evaluated and mastered. Empty/error states have retry or a real next step.

```tsx
fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu buổi học 90 phút' }));
expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ durationMinutes: 90, topicVersionId }));
expect(screen.queryByText('Đã thành thạo')).not.toBeInTheDocument(); // pending-only fixture
```
- [ ] Run `pnpm --filter @worklingo/web test src/features/ielts-study src/lib/api/ielts-study-client.test.ts src/features/learning-session/session-shell.test.tsx`; verify RED.
- [ ] Implement catalogue/recommendation labels, duration picker, syllabus preview, start/resume and scoped completion summary. Show 90/120/150; do not merely hide 60 on a still-accepting server. Recommendations use actual history and expose insufficient evidence honestly.
- [ ] Run GREEN tests and real browser topic→session→save/reload→summary on desktop/mobile; verify no overflow and no Intermediate activation request.
- [ ] Review/commit the UI deliverable; do not create a duplicate player.

## Task 7: Two mock modes with server-owned clocks and feedback

**Files:** Create `apps/api/src/ielts-mock/domain/mock-mode-policy.ts`, `.spec.ts`, `application/mock-attempt-clock.ts`, `.spec.ts`, `application/mock-section-review.service.ts`, `.spec.ts`; modify `application/ielts-mock-learner.service.ts`, `.spec.ts`, `dto/ielts-mock-learner.dto.ts`, `ielts-mock-learner.controller.ts`, `ielts-mock-attempt.controller.ts`, `ielts-mock.module.ts`; create `apps/api/test/integration/ielts-mock-modes.integration.spec.ts`; modify `apps/web/src/features/ielts-mock/ielts-mock.tsx`, `.test.tsx`, `i18n/messages/ieltsMock.ts`, `lib/api/ielts-mock-client.ts`.

**Interfaces:** `resolveMockModePolicy(mode,policyVersion):MockModePolicy` with `{timerMode:'elapsed'|'deadline',canPause:boolean,feedbackRelease:'section'|'test',audioPlayLimit:1|null}`. `MockAttemptClock.pause(learnerId,attemptId,{expectedRevision,clientOperationId})` and `.resume(...)` return `Promise<IeltsMockAttemptDto>`; `.expireIfDue(learnerId,attemptId):Promise<IeltsMockAttemptDto>` uses an injected server Clock and locked current row. Add POST `/me/ielts-mocks/attempts/:id/pause`, `/resume`; GET `.../:id/sections/:section/review` returns answers/explanations only for a submitted PRACTICE section. Existing get/save/submit use the pinned policy; both existing controller aliases must call identical rules.

- [ ] Write tests: PRACTICE pauses and resumes without losing answers; EXAM rejects pause; server clock expiry auto-submits saved responses once under concurrent GET/save/submit. Changing mode/policy from client is rejected. Future-section keys and strict in-progress feedback remain hidden. New strict attempt requires qualified paper; legacy attempt retains old deadlines even when rollout flag changes.

```ts
expect(resolveMockModePolicy('EXAM_SIMULATION', 'v2').canPause).toBe(false);
expect(afterRefresh.sectionDeadlineAt).toBe(beforeRefresh.sectionDeadlineAt);
expect(retriedResume.elapsedMs).toBe(firstResume.elapsedMs); // same clientOperationId
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-mock test/integration/ielts-mock-modes.integration.spec.ts` and `pnpm --filter @worklingo/web test src/features/ielts-mock/ielts-mock.test.tsx`; verify RED.
- [ ] Implement policies and split timing/review logic out of the learner service. After V3 activation new start has only PRACTICE/EXAM_SIMULATION and no Band journey prerequisite. PRACTICE records elapsed time; strict deadline never resets on reload. Completed attempts keep immutable reports and pending teacher-review handling.
- [ ] Verify GREEN; test exact-deadline boundary with injected clock and both HTTP aliases. UI uses the same advertised allowed modes and labels “Mô phỏng thi thật”, never official certification.
- [ ] Review/commit policy behavior before adding transport/recording.

## Task 8: Reliable one-play audio and real Speaking submissions

**Files:** Create `apps/api/src/ielts-mock/application/mock-playback.service.ts`, `.spec.ts`, `mock-recording.service.ts`, `.spec.ts`, `ielts-mock-media.controller.ts`; modify `ielts-mock.module.ts`, `application/ielts-mock-review.service.ts`, `dto/ielts-mock-admin.dto.ts`, `ielts-mock-review.controller.ts`; create `apps/web/src/features/ielts-mock/mock-audio-player.tsx`, `.test.tsx`, `mock-speaking-recorder.tsx`, `.test.tsx`; modify `apps/web/src/features/admin-ielts-mock/ielts-mock-workspace.tsx`, `.test.tsx`, `lib/api/admin-ielts-mock-client.ts`; create `apps/api/test/integration/ielts-mock-media.integration.spec.ts`.

**Interfaces:** `MockPlaybackService.start(learnerId,attemptId,assetId,clientPlayId):Promise<PlaybackLeaseDto>` with `{id,streamUrl,expiresAt,remainingSeconds}`; POST `.../attempts/:id/audio/:assetId/playback`, GET audio with owned lease for new strict policy. One lease per strict attempt/asset; same clientPlayId retry returns the same lease. `MockRecordingService.upload(learnerId,attemptId,{clientRecordingId,part,consent},file):Promise<IeltsMockRecordingDto>` with `{id,part,durationSeconds,createdAt}` and owner/reviewer-scoped read; no STT request is required to persist a valid spoken answer. Add these two media DTOs to `packages/contracts/src/ielts-mock.contracts.ts` and its tests in this task.

- [ ] Write tests for simultaneous start, retries/range/HEAD, new play ID after consumed lease, expired lease, missing file and foreign owner; only successful user playback start consumes the one-play allowance. Strict parts must be played in authored order; skipping to part 4 before part 1 is rejected. PRACTICE replay remains possible. Transport retries use the existing lease and never reset section time.
- [ ] Write recording tests: consent/file type/size/duration checks, duplicate upload idempotence, part/attempt ownership, retention and reviewer read authorization. Strict Speaking cannot be completed by submitting only text; human reviewer can hear all submitted recordings.

```ts
expect(retriedLease.id).toBe(firstLease.id);
expect(strictPlaybackRows).toHaveLength(1);
expect(textOnlySpeakingSubmit.status).toBe(422);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-mock/application/mock-playback.service.spec.ts src/ielts-mock/application/mock-recording.service.spec.ts test/integration/ielts-mock-media.integration.spec.ts` and `pnpm --filter @worklingo/web test src/features/ielts-mock/mock-audio-player.test.tsx src/features/ielts-mock/mock-speaking-recorder.test.tsx`; verify RED, then implement using existing storage/streaming and file validation components. Keep strict seek/rate controls off, with disclosure that app behavior is not absolute DRM; preserve legacy audio endpoints.
- [ ] Verify GREEN, real audio bytes/range responses, microphone failure recovery and teacher pending→reviewed report. Use fake media only in isolated E2E fixtures, never to qualify actual release content.
- [ ] Review/commit the media deliverable.

## Task 9: Author and qualify the actual catalogue and simulation paper

**Files:** Create `content/ielts/topics/catalog.json`, twelve `<topic-slug>/manifest.json` and `<topic-slug>/lesson.txt` files following Task 4's manifest; `content/ielts/mocks/academic-02/paper.json`, `listening-scripts.json`, `qualification.json`; extend `apps/api/src/ielts-study/domain/ielts-topic-validation.ts`; create `apps/api/src/ielts-study/infrastructure/topic-content-qualification.spec.ts`, `apps/api/src/ielts-mock/domain/mock-content-qualification.ts`, `.spec.ts`, `apps/api/scripts/prepare-ielts-flow-v3.ts`; add `docs/IELTS_FLOW_V3_CONTENT.md`.

**Interfaces:** `qualifyIeltsTopicPack(manifest,publishedLesson):IeltsContentQualificationResult` is exported from `ielts-topic-validation.ts`; `qualifyIeltsMockPaper(paper,audioManifest):IeltsContentQualificationResult` from `mock-content-qualification.ts`. That file defines `IeltsMockAudioManifest` entries `{assetId,checksum,byteSize,durationSeconds,mimeType,provenance}` and part timeline references. Results use Task 1's common qualification DTO. These are content gates used by publishers and the release utility, not a second parser.

- [ ] Write negative fixtures: old 12.6-minute/short-answer-only paper cannot qualify strict mode; repeated tasks/fake WAVs/unsupported answer alternatives/uncontextualized word lists fail. Positive fixture proves all 12 topics have >=12 chunks, >=2 situations and real plans for all three durations.

```ts
expect(qualifyIeltsMockPaper(oldBetaPaper, oldAudio).qualifiedModes).not.toContain('EXAM_SIMULATION');
expect(qualifiedTopics).toHaveLength(12);
expect(qualifiedTopics.every(topic => topic.supportedDurations.join(',') === '90,120,150')).toBe(true);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-study/infrastructure/topic-content-qualification.spec.ts src/ielts-mock/domain/mock-content-qualification.spec.ts`; verify RED.
- [ ] Author the 12 named topic packs and one new original Academic mock. Listening has a reviewed 30-minute timeline including meaningful scripted pauses; Reading/Writing/Speaking satisfy the spec. At least three objective question types across Listening/Reading; all variants evidenced. Use existing dialog-gender metadata and actual speech files, not spoken speaker labels or relabelled fake artifacts.
- [ ] Run real planner, source/content checks, media checksums/durations and human content review. Do not blindly set qualifiedModes from schema validity. Keep the old paper PRACTICE-only. Render/inspect Writing Task 1 data and audition actual Listening before asserting readiness.
- [ ] Review the content diff and record provenance/limitations; commit source only if authorized, never generated private backups or learner data.

## Task 10: Three-entry hub and independent availability

**Files:** Create `apps/api/src/ielts-flow/ielts-flow.module.ts`, `ielts-flow.controller.ts`, `application/ielts-flow.service.ts`, `.spec.ts`, `domain/ielts-v3-readiness.ts`, `.spec.ts`; modify `apps/api/src/app.module.ts`, `learning-programs/application/learning-programs.service.ts`; modify web `features/ielts-hub/ielts-hub.tsx`, `.test.tsx`, `.css`, `i18n/messages/ieltsHub.ts`, `app/(learner)/layout.tsx`; create `lib/api/ielts-flow-client.ts`, `app/(learner)/ielts/history/page.tsx`, `features/ielts-study/ielts-history.tsx`, `.test.tsx`.

**Interfaces:** `IeltsFlowService.overview(learnerId):Promise<IeltsFlowOverviewDto>` at GET `/me/ielts-overview` includes server-generated owner resume links. `history(learnerId,{kind?,cursor?,limit}):Promise<IeltsHistoryPageDto>` at GET `/me/ielts-history`, default 20/max 50, stable cursor `(updatedAt,kind,id)` and owner filters before page limit. `readIeltsV3Readiness(db)` returns per-section content readiness; released program is selectable when at least one section is usable. Legacy rollout still uses legacy readiness. Flow config is decided once by API; UI never guesses from cached old progress.

- [ ] Write tests showing exactly three primary choices, fresh learner can enter each without early-access flag, intro recommendation is dismissible, and missing intro/topic/mock affects only its own action. Old Bridge/Band remain reachable through history without being displayed as mandatory gates; foreign history is 404.

```ts
expect(primaryDestinations).toEqual(['/ielts/introduction', '/ielts/learn', '/ielts/mock-tests']);
expect(partialContentOverview.study.available).toBe(true); // intro publication missing
expect(orientationProgressWrites).toHaveLength(0);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run src/ielts-flow src/learning-programs/application/learning-programs.service.spec.ts` and `pnpm --filter @worklingo/web test src/features/ielts-hub src/features/ielts-study/ielts-history.test.tsx`; verify RED.
- [ ] Implement the overview and three primary routes. Place duration/topic choice inside Learn, not above intro/mock. Preserve active Intermediate header/context and old deep links; do not auto-complete old phases during navigation.
- [ ] Verify GREEN plus Programs→IELTS for missing-partial/full content and both locale/theme/viewport combinations. Verify current publication counts describe real content.
- [ ] Review/commit the navigation deliverable.

## Task 11: Compatibility qualification, staged activation and rollback rehearsal

**Files:** Create `apps/web/e2e/ielts-flow-v3.spec.ts`, `e2e/helpers/ielts-flow-v3.ts`, `apps/api/test/integration/ielts-flow-v3-compatibility.integration.spec.ts`, `apps/api/scripts/release-ielts-flow-v3.ts`, `docs/IELTS_FLOW_V3_REVIEW.md`; modify `apps/web/playwright.config.ts`, `docs/IMPLEMENTATION_ROADMAP.md`, and existing IELTS operations docs only to link current behavior without rewriting historical records.

**Interfaces:** `release-ielts-flow-v3.ts` dry-run by default; reviewed execute/fingerprint only for exact local DB/storage, active admin actor and complete Task 9 content. `WORKLINGO_IELTS_FLOW=v3` activates new entries; rollback to legacy blocks new V3 starts while retaining old/new pinned resume/read and reports. No destructive schema rollback.

- [ ] Write compatibility fixtures for old Orientation progress, 60-minute Integrated sessions, old LEARNING/EXAM attempts, existing grant and a new V3 topic/mock. Assert no automatic completion, unchanged active Intermediate, no report reinterpretation and valid owner resume after flag switch both ways. User ID/email is never hardcoded in policy.

```ts
expect(resumedAfterRollback.plan).toEqual(pinnedBeforeRollback.plan);
expect(legacyReportAfterUpgrade).toEqual(legacyReportBeforeUpgrade);
expect(earlyAccessFlagAfterUpgrade).toBe(earlyAccessFlagBeforeUpgrade);
```
- [ ] Run `pnpm --filter @worklingo/api exec vitest run test/integration/ielts-flow-v3-compatibility.integration.spec.ts`; add named Playwright projects `ielts-flow-v3-desktop` and `ielts-flow-v3-mobile`, then run `pnpm --filter @worklingo/web exec playwright test --project=ielts-flow-v3-desktop --project=ielts-flow-v3-mobile` for intro skip/review, topic 90/120/150, practice pause/feedback and strict expiry/audio/recording. Confirm RED before last compatibility corrections.
- [ ] Implement dry-run/revision/backup/audit/idempotence and fix actual failures. Publish through existing/new admin publishers; activate only after real content qualification. Rehearse compensating disable in an isolated schema; keep immutable versions/learner pins.
- [ ] Run affected packages first, then final root verification once: `pnpm verify`. Inspect every failed gate; do not describe skipped or pending tests as passing. Before a long full browser run, qualify new desktop/mobile projects so failures stay diagnosable. Windows build/E2E use the existing separate cache and restore normal route types afterward.
- [ ] Update roadmap/review with exact checks, content qualification, snapshots and remaining limitations. Show the three real flows for product review, record rollout decision, and commit/push only within explicit user authorization.

## Acceptance map and self-review

| Spec criterion | Owning tasks |
| --- | --- |
| Independent access/partial availability | 1, 3, 7, 10 |
| Introduction replay without earned evidence | 2, 3 |
| Real topics/context/chunks/four skills | 4, 5, 6, 9 |
| 90+ new start / legacy 60 resume | 1, 2, 5, 11 |
| UUID/version/archive safety | 2, 4, 5 |
| Intermediate/mastery isolation | 4, 5, 6, 11 |
| Two actual mock policies/network/clock | 1, 7, 8 |
| Qualified paper / spoken recording / pending review | 7, 8, 9 |
| History/grants/rollback preservation | 2, 3, 10, 11 |
| Browser/package/content checks | each scoped task, 11 |

Self-review completed: every spec requirement is mapped above; contract/method/route names and qualification DTOs are defined; actual session-player (`session-shell.tsx`) and teacher-review component (`admin-ielts-mock/ielts-mock-workspace.tsx`) were located in the repository; every Review Focus has an owning regression. Independent builder check returned “nothing important left”. Proposed topic-selection/default duration/content-count decisions remain labelled proposals, not approved facts. No product code, migrations, grants or publications were executed by writing this plan.

## Suggested execution

Recommend **Native (inline)** for this plan: schema, published content, generic learning evidence and mock compatibility share interfaces, so one implementer can keep those boundaries consistent. Use bounded independent review at the migration/content/rollout gates and final branch review. Subagent-driven is also available if the user prefers a fresh implementer/reviewer per task. Review this plan and resolve proposed topic selection/duration/content scope before execution.
