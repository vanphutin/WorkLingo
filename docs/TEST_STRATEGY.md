# Test Strategy

## Increment 3 acceptance coverage

`context-transfer.spec.ts` checks scheduler priority before novelty, stable block/skill matching, identical text under renamed versions and fallback. `adaptive-learning.integration.spec.ts` injects a clock for recurrence and checks learner isolation, unchanged old sessions and idempotent second-mission seed. `progression.integration.spec.ts` checks independent skill gates, pending evidence, replay/conflicts, append-only snapshots, concurrent confirmation and immediate-successor boundaries.

`adaptive-learning.spec.ts` runs on desktop and mobile alongside the existing Foundation/Admin journeys. It exercises duration availability, refresh, weak evidence, Mastery/Memory Health/Error Bank, context transfer and blocked advancement for unscored submissions. Provider evaluation is simulated only inside isolated backend fixtures, never exposed as a learner API. Full required gate: `pnpm verify`.

Auth integration uses the same migrated, randomly named schema harness as learner-session tests. Resets and teardown affect that generated schema only, never the default local learner database. Regression coverage asserts `current_schema()` and the Foundation profile default. Checkpoint boundary tests include zero/one floating-point bounds and targets with four skills but no canonical playable allocation.

## 1. Mục tiêu

Kiểm thử phải bảo vệ ba điều:

1. Người học không mất dữ liệu hoặc tiến độ.
2. Nội dung và thuật toán tạo đúng trải nghiệm học đã thiết kế.
3. Lỗi provider bên ngoài không lan vào lõi hệ thống.

## 2. Kim tự tháp kiểm thử

### Unit tests

Áp dụng cho logic thuần, chạy nhanh và không cần database/network:

- Content parser và source location mapping.
- Structural/semantic validators.
- Session allocation theo 45/60/90/120/150 phút.
- Kiểm tra coverage bốn kỹ năng.
- Mastery update và review scheduling.
- Progression threshold theo từng kỹ năng.
- Error classification.
- Rubric score normalization.
- Permission policies và state transitions.

### Integration tests

Chạy với PostgreSQL thật trong test environment và temporary data directory:

- Repository và transaction behavior.
- Publish một lesson version bất biến.
- Session checkpoint/resume.
- Job claiming, retry và idempotency.
- Local storage upload/delete/path safety.
- Adapter mapping cho AI provider bằng fake HTTP server.
- Recording retention workflow.

Không mock database ORM trong integration tests.

### Contract tests

- OpenAPI schema khớp implementation.
- Frontend generated client khớp API.
- Provider adapter xử lý success, timeout, rate limit và malformed response.
- Activity renderer có exhaustive handling cho mọi activity type.
- Content import format fixtures tương thích với parser version hỗ trợ.

### End-to-end tests

Các journey tối thiểu:

1. Đăng ký → tự chọn level → tạo session 60 phút → hoàn thành → xem progress.
2. Admin nhập source sai → thấy lỗi đúng vị trí → sửa → preview → publish.
3. Admin publish version mới trong khi learner đang học version cũ.
4. Learner ghi âm → STT/evaluation hoàn tất → mastery cập nhật.
5. Provider timeout → attempt còn nguyên → retry thành công.
6. Pause/refresh/resume giữa session không mất dữ liệu.
7. Learner chưa đạt một kỹ năng không được mở level kế tiếp.

E2E chạy ở desktop viewport và ít nhất một mobile viewport cho các luồng learner chính.

## 3. Content quality tests

Code correctness không đủ để đảm bảo chất lượng học. Mỗi lesson fixture chuẩn cần được kiểm tra:

- Có mục tiêu công việc rõ ràng.
- Có đủ hoạt động cho bốn kỹ năng.
- Word Bank và Language Blocks xuất hiện trong ngữ cảnh.
- Câu hỏi kiểm tra ý chính, chi tiết, logic hoặc hàm ý.
- Không thể trả lời phần lớn câu hỏi chỉ bằng keyword matching.
- Speaking/writing yêu cầu sử dụng hoặc chuyển ngữ cảnh kiến thức.
- Đáp án có explanation và evidence khi phù hợp.
- Độ khó khớp level.
- Khối lượng khớp thời lượng mục tiêu.

Một phần validation có thể tự động; đánh giá sư phạm cuối vẫn cần admin có chuyên môn.

## 4. AI evaluation tests

### Golden set

Duy trì bộ câu trả lời mẫu gồm:

- Đúng hoàn toàn.
- Đúng ý nhưng diễn đạt khác đáp án mẫu.
- Đúng một phần.
- Bắt keyword nhưng hiểu sai logic.
- Sai ngữ pháp nhưng vẫn truyền đạt được ý.
- Off-topic hoặc prompt injection.

Mỗi thay đổi rubric, prompt hoặc provider configuration chạy lại golden set và so sánh theo tolerance đã định.

### Human calibration

- Giáo viên chấm một mẫu ẩn danh.
- So sánh AI với giáo viên theo từng dimension.
- Theo dõi false pass và false fail, đặc biệt ở progression assessment.
- AI không tự quyết định gateway quan trọng nếu độ tin cậy dưới ngưỡng; đánh dấu review required.

## 5. Reliability và failure injection

Kiểm tra có chủ đích:

- Database transaction rollback.
- Disk full hoặc permission denied.
- File upload bị cắt giữa chừng.
- STT/LLM timeout, 429, 500 và response sai schema.
- Worker dừng sau khi provider đã xử lý nhưng trước khi lưu kết quả.
- Client gửi lại cùng `clientAttemptId`.
- Refresh hoặc đóng tab giữa activity.

Tiêu chí: không tạo dữ liệu trùng, không mất raw learner response và có đường retry rõ ràng.

## 6. Security tests

- Authentication và authorization cho learner/admin resources.
- IDOR: learner không đọc session/recording của người khác.
- Rate limiting ở auth và AI-heavy endpoints.
- Upload MIME/size/path traversal.
- Secret scanning và log redaction.
- Prompt injection fixtures trong lesson, transcript và learner response.
- Dependency audit theo lịch phát hành.

## 7. Accessibility và responsive QA

- Keyboard-only cho onboarding, session và admin import.
- Screen-reader labels cho audio/recorder/form errors.
- Focus order và focus restoration sau modal/sheet.
- Contrast và zoom 200%.
- Reduced motion.
- Mobile keyboard không che writing controls.
- Touch targets tối thiểu phù hợp.

## 8. Performance tests

MVP đo trên một cấu hình máy local tham chiếu được ghi lại:

- Tạo session với 1.000+ mastery records.
- Load lesson và checkpoint.
- Admin parse lesson lớn hợp lệ và không hợp lệ.
- Concurrent local jobs trong giới hạn cấu hình.
- Audio streaming/read từ local storage.

AI latency được đo riêng khỏi application latency.

## 9. Test data

- Seed một path nhỏ có Foundation mission hoàn chỉnh.
- Fixture không chứa dữ liệu cá nhân thật.
- Audio test ngắn và được phép sử dụng.
- Golden AI set được version control nhưng raw sensitive recordings thì không.
- Migration test từ database trống và từ snapshot phiên bản trước.

## 10. CI gates đề xuất

Khi CI được thiết lập:

1. Format/lint.
2. Type check.
3. Unit tests.
4. Integration tests.
5. Build frontend/backend.
6. Contract/schema check.
7. E2E smoke cho luồng quan trọng.

AI live tests không chạy ở mọi commit để tránh chi phí và không ổn định; chạy thủ công hoặc theo lịch với quota kiểm soát.

## Increment 4 acceptance coverage

- `evaluation-harness.spec.ts` và `ai:calibrate` khóa fixture/rubric version, tính tất định và expected ranges; human calibration vẫn được ghi rõ là pending.
- Adapter contract tests bao phủ Microsoft/OpenAI-compatible success, timeout, 429, malformed output và fake prompt-injection fixtures.
- Job tests bao phủ lease, backoff, terminal/manual retry, exactly-once evaluation/mastery và trạng thái attempt không terminal giả trong automatic retry.
- Media tests bao phủ MIME/signature/duration/size, consent, duplicate idempotency, compensation, ownership, early delete và retention cleanup.
- Web tests bao phủ microphone permission, track/object-URL cleanup, consent, multipart retry key, version-bound audio, writing revision autosave, polling và structured feedback.
- `teacher-ai-learning.spec.ts` chạy desktop/mobile với fake microphone và E2E-only deterministic 429. Failure injection bị config từ chối nếu không đồng thời có `NODE_ENV=test`, explicit E2E mode và fake language provider.

### Audio/TTS hardening coverage

- Contract/service tests khóa enum source/provider, owner/admin authorization, fail-closed provider
  readiness, safe audit metadata và selected candidate publish binding.
- Media tests chạy cả Admin/Learner cho 200, 206, 416, cache privacy, MIME và kiểm tra authorization
  trước range parsing.
- React tests khóa no-autoplay, browser voice fallback, published-only explicit failure, bounded job
  polling, candidate isolation và readiness derived từ explicit selection.
- `audio-settings.spec.ts` chạy Desktop Chrome và Pixel 5: settings qua reload, keyboard, 44px target,
  no horizontal overflow, fake generation/publish/archive, Admin/Learner authenticated 206 và Azure
  readiness bằng route stub chỉ tồn tại trong test. Test không chứa credential hoặc provider control
  endpoint production.

## Increment 5A1 acceptance coverage

- Contract/unit tests khóa onboarding DTO, playable-level policy, highest-eligible placement policy,
  four-skill evidence và immutable recommendation.
- PostgreSQL integration tests khóa migration từ learner cũ (`MIGRATED`), self-placement replay,
  concurrent confirmation, ownership/IDOR, placement/session version binding, retry eligibility và
  placement exclusion khỏi mastery, Error Bank và progression.
- Mutation checks đã chứng minh rằng bỏ purpose guard làm placement tạo MasteryEvent; guard được khôi
  phục và regression test bắt được thay đổi đó.
- `onboarding-placement.spec.ts` chạy Desktop Chrome và Pixel 5: self-placement bằng keyboard,
  pending-route guard, completed-learner bypass, refresh/resume, bốn kỹ năng, fake-provider automatic
  retry/processing, explicit recommendation confirmation, touch target 44px, no horizontal overflow
  và placement mastery isolation.
- Existing Foundation, adaptive và Teacher AI E2E đăng ký qua public API rồi self-place; không có
  test-only bypass cho product rule mới.

Fake provider chỉ kiểm chứng wiring/retry. `workplace-placement-v1` và quality của recommendation vẫn
**human calibration pending**; không dùng E2E xanh để tuyên bố độ chính xác ngôn ngữ thực tế.

### Trạng thái triển khai — Increment 5A2 (Weekly Engagement & Progress Evidence)

- **Domain/Policy Unit Tests:** `engagement-week.spec.ts` (timezone keys, Monday bounds, streak calculation, target updates, invalid timezone error), `evidence-of-progress.spec.ts` (two 28-day windows, minimum 2 evaluated samples threshold, placement purpose exclusion, four-skill delta). Mutation checks đã kiểm chứng độ nhạy của ngưỡng mẫu và offset ngày.
- **Application/Integration Tests:** `study-day-projector.service.spec.ts`, `engagement.service.spec.ts`, `engagement-projection.integration.spec.ts` (idempotent duplicate session completion projection, distinct-day projection, weekly reconciliation, rollback isolation), `engagement-api.integration.spec.ts` (GET summary, PATCH weekly-target immediate vs deferred updates, 2–5 boundary validation, learner isolation, backup-restore schema integrity).
- **Web Feature Tests:** `engagement-panel.test.tsx` (5 tests), `dashboard-view.test.tsx` (13 tests: independent retryable engagement loading, dashboard usability when engagement fails, start button resilience, target change).
- **Desktop/Mobile E2E:** `engagement-progress.spec.ts` trên Desktop Chrome và Pixel 5 (onboarding -> initial mission/consistency empty states -> immediate target update before study -> ordinary 60-min session completion across 4 activities -> exactly-once study day projection -> deferred target update notice after study -> touch target >= 44px, 16px mobile select, no horizontal overflow).

### Trạng thái triển khai — Increment 5B (Admin Curriculum Operations & Audit Browser)

- **Domain/Policy Unit Tests:** `curriculum-mutation-policy.spec.ts` (15 tests: playability, 4-skill coverage, archive blockers, revision checks), `curriculum-reorder-policy.spec.ts` (6 tests: order continuity, level & mission reordering), `audit-metadata-policy.spec.ts` (9 tests: email scrub, privacy masking, actor display name).
- **Application/Integration Tests:** `admin-curriculum-command.service.spec.ts` (7 tests), `admin-curriculum-commands.integration.spec.ts` (5 tests), `admin-curriculum-query.integration.spec.ts` (2 tests), `admin-audit-api.integration.spec.ts` (2 tests), `admin-curriculum-schema.integration.spec.ts` (2 tests).
- **Web Feature Tests:** `admin-curriculum-client.test.ts` (4 tests), `admin-audit-client.test.ts` (2 tests), `curriculum-workspace.test.tsx` (4 tests: tree rendering, path creation, conflict handling without crash, accessible reorder), `audit-workspace.test.tsx` (4 tests: privacy safety, filtering, cursor pagination, retryable error handling).
- **Desktop/Mobile E2E:** `admin-curriculum-audit.spec.ts` (login as content admin -> create path, level, mission -> 44px min touch targets -> privacy-safe audit browser navigation -> filter by action -> zero horizontal overflow).

### Increment 5C–5D qualification coverage

- Correlation/safe-error/log tests use forbidden fixtures for credentials, bearer tokens, email,
  address/connection data, transcript and raw response fields.
- Rate-limit integration proves atomic limits, scope isolation, bounded retry and untrusted proxy
  behavior with PostgreSQL persistence.
- Operations and Analytics contract/unit/integration/E2E tests cover Admin authorization, scrubbed
  payloads, bounded pages/date ranges, aggregate-only responses and desktop/mobile navigation.
- `pnpm qualify:performance` verifies deterministic volume generation and the 500 KB-class parser
  budget; browser qualification guards interaction-blocking navigation.
- `pnpm qualify:security` runs abuse/redaction/rate-limit suites and a tracked-file secret scan.
- `pnpm qualify:recovery` rehearses containment, manifest checksums and restore into isolated empty
  schema/data targets.
- Qualification Playwright covers keyboard/reflow/reduced-motion and a registration → onboarding →
  dashboard journey. Automated checks do not replace human language/content calibration.

### IELTS Phase 4 Orientation coverage

- Contract tests protect semantic bounds and learner answer-key/asset-ID redaction.
- Service and integration tests cover latest-checkpoint eligibility, optimistic revisions, wrong and
  correct knowledge checks, explicit completion, learner-authorized media, resume, and N/N+1 isolation.
- React tests cover Admin authoring/conflict recovery, learner locked/resume states, captions,
  narration fallback controls, question gating, and final completion.
- `ielts-orientation.spec.ts` runs independently on Desktop Chrome and Pixel 5: Admin publish,
  learner locked state, evidence unlock, start/resume, responsive overflow, and version isolation.

### IELTS Phase 5 Bridge coverage

- Contract tests protect the 31-question taxonomy, exact ten-stage order, semantic task requirements,
  and learner-safe DTOs.
- Service/integration tests cover Orientation gating, ownership, pinned resumes, optimistic conflicts,
  answer evaluation, durable timers, completion, seed idempotency, and immutable snapshots.
- React tests cover Admin authoring and learner lock/start/resume/task/timer/feedback states.
- `ielts-bridge.spec.ts` runs on Desktop Chrome and Pixel 5 and proves onboarding-compatible access,
  responsive layout, reload resume, Admin republish, and learner version isolation.

## 11. Definition of Done

Một increment chỉ hoàn tất khi:

- Acceptance criteria có test hoặc bằng chứng kiểm tra phù hợp.
- Happy path và failure path quan trọng đã được kiểm tra.
- Không có regression trong required gates.
- Migration/seed hoạt động từ môi trường sạch.
- UI được kiểm tra ở desktop và mobile khi có thay đổi giao diện.
- Tài liệu contract/decision liên quan được cập nhật.
- Không tuyên bố AI quality chỉ dựa trên một ví dụ thành công.

## 12. Exit criteria cho MVP pilot

- Tất cả journey E2E tối thiểu pass.
- Không có lỗi critical làm mất session/submission.
- Content validation bắt được các fixture sai đã xác định.
- Golden set AI đạt ngưỡng đồng thuận do đội sản phẩm đặt trước pilot.
- Backup/restore local được diễn tập thành công.
- Các luồng chính đáp ứng responsive và accessibility smoke checks.
