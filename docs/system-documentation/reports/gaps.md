# Gaps, conflicts and unknowns

## GAP-CORE-ReadmeAI: README no-cloud description versus live AI routing (CONFLICT)

README describes a self-contained slice without cloud/third-party AI dependencies. Architecture depicts outbound providers but names OpenAI-compatible/Microsoft STT/configurable TTS without Discovery/account routing. Current factories support fake, direct OpenAI/Discovery and a two-provider router. The README statement fits fake mode rather than all supported configurations.

Evidence: README.md:1-3 (WorkLingo); docs/ARCHITECTURE.md:32-38 (2. Kiến trúc tổng thể); docs/ARCHITECTURE.md:55-68 (Provider adapters); apps/api/src/ai-gateway/ai-gateway.module.ts:45-67 (AiGatewayModule); apps/api/src/ai-gateway/infrastructure/routing-language-evaluation.adapter.ts:15-29 (RoutingLanguageEvaluationAdapter); apps/api/src/ai-gateway/application/ai-settings.service.ts:11-22 (AiSettingsService); apps/api/src/ai-gateway/application/ai-settings.service.ts:65-82 (AiSettingsService); apps/api/src/common/config/app-config.schema.ts:113-117 (environmentSchema)

## GAP-CORE-LeaseBoundary: Claim fencing does not prove side-effect exclusivity (INFERRED)

Completion/failure predicates match status/owner/attempt rather than leaseExpiresAt. Reviewed runner has no lease renewal or cancellation path; an expired handler could continue after another claim. External/domain writes therefore cannot be assumed exactly once. Configuration lengthens lease to at least three provider timeouts plus 10 seconds when evaluation/STT is live.

Evidence: apps/api/src/jobs/application/jobs.service.ts:96-193 (JobsService); apps/api/src/jobs/application/job-runner.service.ts:116-181 (JobHandlerRegistry); apps/api/src/common/config/app-config.schema.ts:213-217 (parseAppConfig); apps/api/src/common/config/app-config.schema.ts:253-256 (parseAppConfig); apps/api/src/content-authoring/application/audio-generation.handler.ts:70-101 (AudioGenerationHandler)

## GAP-CORE-WorkerConcurrency: Timer serialization is not global concurrency configuration (VERIFIED)

pollActive serializes only private timer poll. AudioGenerationService calls public runOnce in a bounded loop outside that flag; runOnce has no enabled check or concurrency gate. Database locks protect claims, but a fixed global concurrency of one cannot be inferred.

Evidence: apps/api/src/jobs/application/job-runner.service.ts:105-181 (JobHandlerRegistry); apps/api/src/content-authoring/application/audio-generation.service.ts:270-277 (AudioGenerationService); apps/api/src/content-authoring/application/audio-generation.service.ts:299-305 (AudioGenerationService); apps/api/src/common/config/app-config.schema.ts:81-85 (environmentSchema)

## GAP-CORE-AudioManualRetry: Manual job retry does not reset FAILED audio candidate (INFERRED)

Terminal/exhausted audio failure marks artifact FAILED. retryJob resets Job fields only, while the handler requires its existing candidate to be GENERATING. A retryable job may therefore be scheduled without its failed artifact becoming eligible again. This consequence is inferred across code paths and not reproduced.

Evidence: apps/api/src/content-authoring/application/audio-generation.handler.ts:59-69 (AudioGenerationHandler); apps/api/src/content-authoring/application/audio-generation.handler.ts:103-124 (AudioGenerationHandler); apps/api/src/jobs/application/jobs.service.ts:239-279 (JobsService)

## GAP-CORE-PublishReceiptScope: Publication request hash omits import identity (INFERRED)

Publication receipt lookup uses actor/operation/key; request hash includes revision/hash/key/audio selection but omits importId. Receipt replay precedes import lookup. Cross-import requests with otherwise identical hashed fields could replay another import response. Audio generation includes contentImportId in its hash.

Evidence: apps/api/src/content-authoring/application/content-publisher.service.ts:33-75 (ContentPublisherService); apps/api/src/content-authoring/application/audio-generation.service.ts:74-85 (AudioGenerationService); apps/api/prisma/schema.prisma:1220-1231 (MutationReceipt)

## GAP-CORE-DeploymentCookie: Transport and deployment guarantees remain unknown (UNKNOWN)

Source cookie secure=false is unconditional. API and development Compose database bind loopback; Next forwards to configured API origin. These sources do not establish deployed TLS, proxy trust, hostname, process count or filesystem permissions.

Evidence: apps/api/src/auth/auth.controller.ts:93-100 (AuthController); apps/api/src/main.ts:21-33 (bootstrap); infra/docker-compose.yml:8-11 (services.postgres); apps/web/next.config.ts:6-15 (nextConfig.rewrites)

## GAP-CORE-Observability: Job correlation and rate-limit cleanup scheduling are unverified (DOCUMENTED_ONLY)

Architecture describes request/job correlation IDs. Middleware and HTTP errors carry request IDs; runner warnings include job ID and safe code but no request correlation propagation in the reviewed path. Rate-limit cleanup is an injectable one-day-default method; reviewed source search found no production caller or scheduler.

Evidence: docs/ARCHITECTURE.md:229-234 (11. Observability local); apps/api/src/common/request-context/correlation-id.middleware.ts:23-40 (CorrelationIdMiddleware); apps/api/src/jobs/application/job-runner.service.ts:154-166 (JobHandlerRegistry); apps/api/src/common/rate-limit/rate-limit-cleanup.service.ts:5-21 (RateLimitCleanupService); apps/api/src/common/rate-limit/rate-limit.module.ts:8-20 (RateLimitModule)

## GAP-CORE-BackupConsistency: Cross-resource backup snapshot consistency not established (INFERRED)

Architecture describes database/directory backup as one logical snapshot. Script creates dump before copying files and hashing bundle. Reviewed sequence does not demonstrate application-write freezing or coordinated database/file snapshot. Integrity/empty-target checks exist; concurrent consistency remains unknown.

Evidence: docs/ARCHITECTURE.md:49-53 (Local-first infrastructure); scripts/backup-local.ps1:94-99 (backup-local.ps1::<script>); scripts/backup-local.ps1:147-187 (backup-local.ps1::<script>); scripts/restore-local.ps1:109-144 (restore-local.ps1::<script>); scripts/restore-local.ps1:213-239 (restore-local.ps1::<script>)

## SCOPE-CORE-Analysis: Core behavioral analysis scope and limits (INFERRED)

Reviewed auth/users session and locale paths; job enqueue/claims/attempts/retries; import validation, transaction publication and registered audio generation; AI routing/HTTP boundaries; local storage; request limits, safe errors/logs and correlation; bootstrap/web rewrite and backup/restore excerpts. This is not a whole-system runtime certification.

Evidence: apps/api/src/app.module.ts:38-82 (AppModule); apps/api/src/jobs/jobs.module.ts:16-46 (JobsModule)

## GAP-LRN-scope: Phạm vi học tập chỉ được phân tích từng phần (UNKNOWN)

Đã đọc các nhánh chính của session/draft/AI, onboarding/placement, mastery/progression, eligibility/completion/program context và IELTS learner services. Đây không phải xác minh toàn bộ ứng dụng hay deployed behavior.

Evidence: apps/api/src/learning-sessions/application/learning-sessions.service.ts:85-180 (LearningSessionsService); apps/api/src/onboarding/application/placement-recommendation.service.ts:33-118 (PlacementRecommendationService); apps/api/src/curriculum-foundation/application/curriculum-progress.service.ts:25-56 (CurriculumProgressService); apps/api/src/ielts-integrated-practice/application/ielts-integrated-learner.service.ts:28-92 (IeltsIntegratedLearnerService); apps/api/src/ielts-mock/application/ielts-mock-learner.service.ts:38-113 (IeltsMockLearnerService)

## GAP-LRN-draft-retention: Chưa xác minh cleanup nháp và đua tạo lần đầu (UNKNOWN)

save tính expiresAt; get không lọc expiresAt. Hai save đầu cùng expectedRevision0 có unique constraint nhưng service không bắt riêng lỗi create race; chưa xác minh mapping lỗi HTTP/cleanup thực tế.

Evidence: apps/api/src/learning-sessions/application/activity-drafts.service.ts:27-70 (ActivityDraftsService.save/get); apps/api/prisma/schema.prisma:719-736 (ActivityDraft uniqueness and expiry index)

## GAP-LRN-ai-worker-recording: Chưa review toàn bộ recording, lease và provider retries (UNKNOWN)

Đã đọc evaluator/handler/manual retry và policy delay. Chưa xác minh end-to-end speech upload, consent, transcription, lease reclaim hoặc callback sau xóa recording.

Evidence: apps/api/src/teacher-ai/application/evaluation.service.ts:107-299 (EvaluationService.retryForLearner/evaluateAttempt); apps/api/src/teacher-ai/application/evaluate-attempt.handler.ts:28-69 (EvaluateAttemptHandler.handle); apps/api/prisma/schema.prisma:660-691 (Recording); apps/api/src/jobs/application/job-runner.service.ts:15-51 (decideJobRetry)

## GAP-LRN-mastery-projections: Chưa review đầy đủ mastery map, Error Bank và memory health (UNKNOWN)

recordInTransaction tạo ErrorBankEntry cho score<0.7 ở mức activity; các projection đọc/backfill tiếp theo chưa được phân tích đầy đủ.

Evidence: apps/api/src/mastery/application/mastery.service.ts:250-265 (MasteryService.recordInTransaction error entry); apps/api/src/mastery/application/mastery.service.ts:281-330 (MasteryService.getReviewQueue/getMasteryRecords)

## GAP-LRN-foundation-authoring: Chưa review sâu validator và admin publication Foundation (UNKNOWN)

FoundationCurriculumService có validate/publish/archive và receipt locking; chỉ đọc service, chưa phân tích validator phụ trợ/cycle và đủ test admin.

Evidence: apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts:42-81 (FoundationCurriculumService.validateDraft/publishDraft/archiveRevision); apps/api/src/curriculum-foundation/application/foundation-curriculum.service.ts:96-125 (FoundationCurriculumService.mutate)

## GAP-LRN-orientation-gates: Chưa xác minh toàn bộ Orientation và khác biệt gate Bridge (UNKNOWN)

Bridge catalog yêu cầu ít nhất4 required modules và mọi module required trong catalog hoàn tất; Integrated/Band chỉ đếm completed required progress>=4. Hai predicate khác nhau khi tập required mở rộng.

Evidence: apps/api/src/ielts-bridge/application/ielts-bridge-learner.service.ts:35-69 (IeltsBridgeLearnerService.catalog); apps/api/src/ielts-bridge/application/ielts-bridge-learner.service.ts:176-180 (IeltsBridgeLearnerService.hasCompletedOrientation); apps/api/src/ielts-integrated-practice/application/ielts-integrated-learner.service.ts:88-88 (IeltsIntegratedLearnerService.bridgeComplete); apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.ts:94-95 (IeltsBandLearnerService.bridgeComplete)

## GAP-LRN-productive-band: Chưa chứng minh đường tiến band cho task text và spoken (UNKNOWN)

Integrated evaluate trả correct=null cho text/spoken không rỗng. Band policy chỉ đếm boolean; unit test advancement dùng synthetic correct=true cho cả bốn skill. Đường production tạo productive boolean chưa được chứng minh.

Evidence: apps/api/src/ielts-integrated-practice/application/ielts-integrated-learner.service.ts:91-91 (IeltsIntegratedLearnerService.evaluate); apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.ts:81-88 (IeltsBandLearnerService.evaluate); apps/api/src/ielts-band-curriculum/domain/evaluate-band-progression.ts:14-46 (evaluateBandProgression); apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.spec.ts:47-52 (synthetic four-skill advancement fixture)

## GAP-LRN-mock-races: Chưa xác minh mọi race giữa timer, save, audio và review (UNKNOWN)

Mock dùng CAS revision cho save/submit; audio dùng hai transaction khóa asset tách bởi storage.read. Transaction sau đọc lại lượt nhưng không kiểm tra lại currentSection; hiệu ứng đua thời gian/section chưa được kiểm chứng.

Evidence: apps/api/src/ielts-mock/application/ielts-mock-learner.service.ts:58-102 (IeltsMockLearnerService.get/saveResponses/submitSection); apps/api/src/ielts-mock/application/ielts-mock-learner.service.ts:116-138 (IeltsMockLearnerService.getAudio); apps/api/src/ielts-mock/application/ielts-mock-review.service.ts:20-40 (IeltsMockReviewService.review)

## FIND-OBS-error-id: Error envelope: correlationId server khác requestId client (CONFLICT)

SafeExceptionFilter trả correlationId và X-Correlation-ID. errorEnvelopeSchema của ApiClient khai báo requestId trong error lồng; ApiClient.request chỉ đọc data.error.requestId, còn nhánh lỗi phẳng không gán requestId. Có khác biệt contract/source giữa hai phía; tác động UI và hành vi runtime chưa chạy xác minh. Không tự coi đây là lỗ hổng bảo mật.

Evidence: apps/api/src/common/http/safe-exception.filter.ts:106-113 (SafeExceptionFilter.catch); apps/web/src/lib/api/api-client.ts:77-92 (errorEnvelopeSchema); apps/web/src/lib/api/api-client.ts:236-268 (ApiClient.request error branch)

## FIND-ARCH-deployment: CI/CD và production topology chưa được chứng minh (UNKNOWN)

Trong phạm vi khảo sát có Docker Compose cho PostgreSQL và scripts setup/backup/restore/qualification. Không phát hiện thư mục .github trong snapshot hiện tại. Không suy ra rằng hệ thống không có CI/CD bên ngoài; production deployment, caching và recovery thực tế chưa được quan sát.

Evidence: infra/docker-compose.yml:1-14 (services.postgres); package.json:15-38 (scripts)

## FIND-runtime: Runtime and deployment remain unverified (UNKNOWN)

This analysis reads source, schema and migration files. It does not connect to PostgreSQL, inspect migration application state, execute application tests, or verify external provider availability. The documentation package is tested separately.

Evidence: README.md:1-27 (local startup instructions)

## FIND-extraction-limits: Static extraction boundaries (UNKNOWN)

TypeScript AST extracts declarations and direct static calls. Dynamic dispatch, runtime DTO serialization, all service-level error branches, conditional registration, test parameter expansion and SQL semantics are not fully resolved. SQL migration facts use a bounded extractor; Prisma DMMF is authoritative for schema declarations. Files outside the explicit scope are not analyzed.

Evidence: Analysis boundary; no runtime evidence.
