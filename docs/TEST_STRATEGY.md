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
