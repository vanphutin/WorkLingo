# Beginner R1.1 — Scope review trước approval

**2026-10-24 · CAPTURE ONLY · NO IMPLEMENTATION APPROVAL**

Parent [MND-20261024-001](../items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md); [plan R1.1](../../docs/superpowers/plans/2026-10-24-beginner-implementation.md#r11--format-evidence-và-beginner-planner). Human chọn R1.1 nhưng yêu cầu chỉ thực thi khi có approval hợp lệ đúng scope/hash, không tự approve; hiện chỉ capture/review.

## Baseline và approval binding

- Worktree: C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo; branch codex/foundation-basic-readiness, HEAD6113427. Có hai thay đổi tài liệu từ vòng refinement trước: plan và parent mandate; giữ nguyên phần đã có.
- Main D:/Projects/WorkLingo ở752c19c; apps/web/next-env.d.ts modified và backups/ untracked; không đưa vào scope.
- Plan SHA-256 (UTF-8 LF): 165fc3e8cbcf7ce1b2245974fa7cb40cc0c75b10cb31cf87fe2557f6a922c96b.
- Existing R1.1 source/test baseline fingerprint (29 path/hash pairs sorted): baef0869f96d715139af966ce290375177280cfe787d65608e9c76f0bdec34ef.
- Exact allowlist fingerprint: 3dad13875964ae06d41c94cd314d9a548794022d6b1dd82f26efc714e96160d5. Source hashes được kiểm chứng lại trước execution; đổi source/plan/scope phải review và capture lại trước approval thực thi.
- Proposal hash do mandate CLI model tính sau capture; record approval=null cho tới có xác nhận người dùng và transition hợp lệ. Parent giữ captured; approval Intermediate cũ không áp dụng Beginner.

## Exact file allowlist

Đây là file dự kiến khi được approve, chưa sửa/tạo source hay test. Các file Modify đã xác nhận tồn tại; Create chưa tồn tại. Ngoài allowlist cần scope review và renewed approval, không mở rộng vì compile fail.

| Action | File |
| --- | --- |
| Modify source | `packages/content-format/src/ast.ts` |
| Modify source | `packages/content-format/src/parser.ts` |
| Modify source | `packages/content-format/src/normalizer.ts` |
| Modify source | `packages/content-format/src/validator.ts` |
| Modify source | `packages/content-format/src/foundation-metadata.ts` |
| Modify source | `packages/content-format/src/index.ts` |
| Modify source | `packages/contracts/src/index.ts` |
| Modify source | `apps/api/src/curriculum/domain/curriculum.types.ts` |
| Modify source | `apps/api/src/content-authoring/application/content-imports.service.ts` |
| Modify source | `apps/api/src/content-authoring/application/content-publisher.service.ts` |
| Modify source | `apps/api/src/teacher-ai/domain/foundation-rubrics.ts` |
| Modify source | `apps/api/src/teacher-ai/application/evaluation.service.ts` |
| Modify source | `apps/api/src/learning-sessions/application/learning-sessions.service.ts` |
| Modify source | `apps/api/src/learning-sessions/application/learning-session.types.ts` |
| Modify source | `apps/web/src/lib/api/api-client.ts` |
| Modify source | `apps/web/src/features/learning-session/activity-workspace.tsx` |
| Modify source | `apps/web/src/features/learning-session/activity-renderers/speaking-activity.tsx` |
| Create source | `packages/content-format/src/beginner-format.ts` |
| Create source | `packages/contracts/src/beginner.contracts.ts` |
| Create source | `apps/api/src/learning-sessions/domain/beginner-session-planner.ts` |
| Create source | `apps/api/src/teacher-ai/domain/beginner-rubrics.ts` |
| Modify unit/component test | `packages/content-format/src/parser.spec.ts` |
| Modify unit/component test | `packages/content-format/src/normalizer.spec.ts` |
| Modify unit/component test | `packages/content-format/src/validator.spec.ts` |
| Modify unit/component test | `packages/content-format/src/foundation-format.spec.ts` |
| Modify unit/component test | `apps/api/src/content-authoring/application/content-imports.service.spec.ts` |
| Modify unit/component test | `apps/api/src/content-authoring/application/content-publisher.service.spec.ts` |
| Modify unit/component test | `apps/api/src/teacher-ai/domain/foundation-rubrics.spec.ts` |
| Modify unit/component test | `apps/api/src/teacher-ai/application/evaluation.service.spec.ts` |
| Modify unit/component test | `apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts` |
| Modify unit/component test | `apps/web/src/lib/api/api-client.test.ts` |
| Modify unit/component test | `apps/web/src/lib/api/api-client.learner.test.ts` |
| Modify unit/component test | `apps/web/src/features/learning-session/activity-renderers/speaking-activity.test.tsx` |
| Create unit/component test | `packages/content-format/src/beginner-format.spec.ts` |
| Create unit/component test | `packages/contracts/src/beginner.contracts.spec.ts` |
| Create unit/component test | `apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts` |
| Create unit/component test | `apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts` |
| Create unit/component test | `apps/web/src/features/learning-session/activity-workspace.test.tsx` |

Không sửa Prisma schema/migrations/seed, CurriculumService resolver, SessionCreation, onboarding, app module/route wiring, registry approval/publication, R1.2a supersession policy, media/resource/entity hay package dependency. Hai index files chỉ export modules mới. Client api-client.ts chỉ additive DTO field, không endpoint/catalog/admission.

## Exact LessonVersion → planner

- Contract đề xuất: planBeginnerSession(input:{mission:PublishedMission,expectedLessonVersionId:string,durationMinutes:45}):SessionPlan. PublishedMission hiện đã chứa một lessonVersion.id, không cần chọn MissionLesson đầu.
- R2 resolver (chưa triển khai R1.1) resolve manifest→exact CurriculumRevisionLesson→LessonVersion V2, giữ curriculumRevisionId riêng cho future session persistence; không từ currentPublishedVersionId. Truyền V2 cả trong snapshot và expected ID.
- Planner pure kiểm tra ID bằng nhau trước chọn activities; mismatch fail BEGINNER_LESSON_VERSION_MISMATCH, không fallback. Output lessonVersionId bằng V2, chỉ IDs thuộc V2,3R+3L+1S+1W vào3 blocks×15 phút.
- Tests synthetic có V1-first/V2-selected, mismatched snapshot V1/expectedV2, duplicate/missing skills/unmapped evidence, immutability/determinism. Không tuyên bố đã verify real resolver/FK/start/resume: đó là R2. R1.1 không nối planner vào learner runtime đang chạy.

## Tác động và quyết định kỹ thuật đề xuất

| Surface đã đọc | Phạm vi R1.1 / regression bắt buộc |
| --- | --- |
| Parser/AST/validator/foundation metadata chỉ có1.0/1.1, shadowing | 1.2 additive với INSTRUCTION, guided_response, explicit positive min_words và exact rubric id/version. 1.0/1.1 không nhận semantics mới hoặc đổi normalized output. Không áp skip-validation của Foundation cho mọi format. |
| Normalizer đang minWords>=4 và suy mẫu từ prompt | Chỉ1.2 dùng authored min_words; prompt, hidden sampleAnswer và task hints tách biệt. Không ép independent response nói y chang sample. Existing1.0/1.1 output giữ nguyên. |
| FoundationRubric có hai ID cố định, evaluator dispatch theo type/mode | New Beginner registry/dispatch theo pinned id+version trên validated1.2 snapshot. Không fallback latest/unknown version. Existing rubrics/weights/output giữ nguyên; ID/version phải tham gia provenance/hash và duplicate result check. Same version khác rubric ID không được silently reuse. |
| Independent speaking khác shadowing | Không dùng sample-match/requiredPhrases exact-copy làm điều kiện pass hoặc bắt shadowing accuracy metrics cho guided response. Synthetic registry fixtures kiểm tra task/meaning/target-language/clarity; không claim AI/STT calibration hay CEFR. Provider mocks only. |
| Backend getActivity đã redact comprehension keys và chỉ show sample cho shadowing | Preserve legacy shadowing behavior;1.2 guided/writing không gửi hidden model answer/rubric/answerIndex/explanation/evidence qua learner payload hoặc unrestricted spread; test unique hidden marker trên serialized DTO. Teaching instructions tách source đáp án; input audio dùng chấm không lộ transcript ngoài policy. |
| Client api-client learnerActivityDtoSchema hiện chưa có instructions | Add optional typed instructions trên learner Activity DTO, snapshot và client schema; UI theo phase; legacy omit, SessionPlan vẫn chỉ IDs. |
| ContentImportsService.create viết DRAFT trước parse; updateSource/validate cũng ghi DB | Guard1.2 create/updateSource/validate trước write; publisher guard trước mutation transaction, giữ receipt/hash semantics cũ. Error BEGINNER_AUTHORING_DISABLED, không flag bypass trong R1.1. Test fake existing1.2 import, BOM/CRLF và malformed/header variants; legacy flows giữ output/status như cũ. |

Registry defaults đề xuất để approval có scope cụ thể: beginner-guided-speaking@1 và beginner-short-writing@1 đều dùng taskCompletion0.35, meaningAndLogic0.25, targetLanguage0.20, clarity0.20 (tổng1); guided response không dùng pronunciation/sample-match metric làm mandatory score. Đây là technical prototype chưa hiệu chuẩn, không sửa weights legacy hoặc ngưỡng0.7 chung. Unknown id/version fail RUBRIC_VERSION_UNSUPPORTED trước provider; same-version khác rubric ID trong existing result phải conflict trước write, không silent reuse. Thay defaults này cần recapture/renewed approval; chưa phê duyệt rubric sư phạm. Không dùng R1.1 để publish nội dung hoặc đánh giá learner thật. Chưa có reviewer/timing không chặn pure software tests, nhưng vẫn chặn CONTENT_READY/cohort thật.

## Gates cho execution sau approval

1. Test-first red→green trên pure parser/schema/hash/planner, DTO redaction, registry/dispatch, guard mocks, UI components. New/unknown1.2 rubric và wrong expected LV đều fail closed trước provider/writes. Legacy1.0/1.1/Intermediate/IELTS normalization/planning/response behavior giữ nguyên trong regression tests hiện có.
2. Commands scoped: content-format/contracts/API/Web unit/component test files trong allowlist bằng pnpm --filter <package> exec vitest run <file-list>; không chạy root test/E2E/integration setup tạo DB. Lint/typecheck/build trong bốn package ảnh hưởng; lỗi/skip phải ghi riêng, không tính PASS.
3. No real database, migration/seed/data import/publication, real AI/STT calls, learner/catalog enabling, future increments, merge/push/deploy. Test doubles không được kết nối provider/DB.
4. Review actual diff against allowlist + baseline fingerprints, targeted gates đạt mới được commit feature branch theo scope được human approve. Rollback preactivation là revert code-only change; nếu bất ngờ thấy1.2 history phải dừng/review, không remove reader/delete history.

## Approval đang thiếu / điều kiện R1.2a

Không có record R1.1 approved đúng scope/hash tại thời điểm review. Yêu cầu hiện tại cho phép capture/review có điều kiện, không phải tự ký approval sau capture. Không transition approved/implementing và không sửa code.

Sau explicit human approval scope/hash và lifecycle hợp lệ mới thực thi. R1.2a cần R1.1 đã verify và approval riêng cho Admin/editor/registry, supersession policy và isolated test-DB fixture publication; không kế thừa quyền dữ liệu từ R1.1. Tám bài/audio/reviewer/timing ở R1.2b, không giả CONTENT_READY để mở đợt sau.
