# Báo cáo tích hợp Discovery AI

Triển khai ngày 14 tháng 10 năm 2026; tiếp tục và xác minh ngày 15 tháng 10 năm 2026 trên nhánh `codex/ui-redesign-v2`.

Discovery đã được tích hợp vào Teacher AI hiện có, với Qwen3.8-27B là mặc định local, OpenAI dự phòng hai chiều và cài đặt AI cho tài khoản/admin. Migration bổ sung đã áp dụng local. Chatbot chưa xây theo phạm vi người dùng xác nhận. Không commit, push, merge hoặc phát hành.

## Phạm vi và quyết định

Người dùng yêu cầu giảm phụ thuộc OpenAI, tích hợp Discovery vào các tính năng hiện có, đặt lựa chọn AI trong settings người học/admin và dự phòng khi một bên lỗi. Tác vụ cần riêng OpenAI phải giữ OpenAI. Đây là quyền triển khai integration/settings; không phải quyền thay đổi rubric, curriculum hoặc bỏ gate calibration.

| Quyết định | Căn cứ và giới hạn |
| --- | --- |
| Chọn `qwen3.8-27b` | Một bài giả trả JSON đúng schema trong 5058 ms. Intern-S2 timeout 30/90 giây, Agents-A1 timeout 30 giây. Qwen có phí; không hứa miễn phí hoặc chất lượng đã hiệu chuẩn |
| Dự phòng tuần tự hai chiều | Tối đa một chuyển provider mỗi lượt đánh giá; không gọi đồng thời và không vòng lặp. Job retry hiện có vẫn áp dụng |
| Không downgrade capability bắt buộc OpenAI | Trusted routing context ở backend quyết định, không nhận capability từ learner request. Hiện chưa có tác vụ text được chứng minh bắt buộc riêng OpenAI |
| Giữ Microsoft và nghiệp vụ deterministic | STT/pronunciation/TTS và scoring quy tắc có boundary riêng; không thêm LLM cho CRUD, scheduling hoặc progress |
| Một reviewer độc lập | Giảm context lặp; reviewer chỉ đọc phạm vi feature, không đọc key hoặc gọi live API |
| Giữ checkout đang có | I18n/redesign chưa commit là dependency của settings. Đã lưu baseline patch/status và chỉ sửa các điểm tích hợp cần thiết |

Chiến lược, bảng model/giá, inventory AI toàn hệ thống và rollback: [AI_PROVIDER_STRATEGY.md](AI_PROVIDER_STRATEGY.md). Spec: [Discovery AI design](superpowers/specs/2026-10-14-discovery-ai-design.md). Plan: [Discovery AI implementation plan](superpowers/plans/2026-10-14-discovery-ai.md). Các tài liệu này nối với Increment 4 của roadmap hiện có.

## Thay đổi chính

- Discovery adapter dùng `/chat/completions`, key/model/base URL độc lập, output cap 2048 token, HTTP timeout/response-size boundary hiện có và schema validation trước khi dùng điểm.
- OpenAI adapter tiếp tục Responses API; thêm `max_output_tokens`, `store: false` và refusal không retry/dự phòng.
- Router đọc owner từ attempt, hợp nhất account preference với chính sách hệ thống và trả provenance riêng cho từng call. EvaluationService lưu provider/model thực tế vào result; không dùng trạng thái last-provider chung.
- Bảng `AiRoutingSetting` có FK cascade cho account, constraint scope và một system row. SYSTEM_ADMIN mới đổi global policy; ghi audit trong cùng transaction. Account không gửi owner ID/key/base URL trong payload settings.
- Endpoint authenticated `GET/PATCH /api/v1/me/ai-settings`; admin tương ứng `/api/v1/admin/ai-settings`. Stale account-bound PATCH bị từ chối 409; provider chưa cấu hình bị từ chối 422.
- UI `/settings/ai` và `/admin/settings/ai`, có VI/EN, trạng thái tải/lỗi/lưu và cảnh báo phí dự phòng. CONTENT_ADMIN đọc global settings; vẫn chỉnh preference cá nhân.
- `AI_ROUTING_ENABLED=false` cho rollback trực tiếp theo server mode, bỏ qua preference đã lưu, tắt dự phòng và khóa chỉnh settings. Rollback OpenAI cần đặt đồng thời provider `openai-compatible`.
- `.env` local ưu tiên Discovery/Qwen; cả hai key chỉ phía server, Git bỏ qua. `.env.example` không chứa key. Không thêm runtime dependency.

## Kiểm thử đã chạy

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| API gateway + AI settings + locale preferences + Teacher AI pipeline sau khi phục hồi PostgreSQL | **80/80 pass**, 12 files, ngày 15/10 |
| Toàn bộ API source unit tests sau sửa cuối | **490 pass, 1 fail**, 90 files; lỗi cũ LearningSessionsService dưới đây |
| API typecheck, lint và build sau sửa cuối | **Pass**, ngày 15/10 |
| Toàn bộ web unit/component tests | **366/366 pass**, 81 files, ngày 14/10; UI không đổi trong lượt tiếp tục |
| Contracts suite | **86/86 pass**, 17 files |
| Settings E2E desktop/mobile | **4/4 pass**; account save/reload/VI, admin page, unavailable providers, không lộ secret và không tràn ngang |
| Workspace production build | **Pass** ngày 14/10; có cả hai route settings mới |
| Workspace lint | **Pass**; web typecheck pass; API typecheck lỗi test fixture đã sửa bằng getOrThrow rồi chạy lại pass |
| I18n checker | **27 namespaces, 1642 paired keys, 0 errors**; 341 candidate unused keys cần phân biệt với dynamic usages |
| `pnpm format:check` | **Pass**; Git chỉ cảnh báo LF/CRLF trên working tree |
| Mandate register validate | **Valid, 1 item**; không tạo/sửa mandate item từ các giả thuyết về chatbot |
| Prisma migration/status | Đã áp dụng đúng migration mới `20261014163000_ai_routing_settings`; ngày 15/10 xác nhận **31 migrations, schema up to date** |
| Live synthetic Discovery | Qwen schema-valid trong 5058 ms; không dùng dữ liệu người học thật và không benchmark trả phí hàng loạt |

Các lệnh tái hiện chính:

```powershell
pnpm --filter @worklingo/api exec vitest run src/ai-gateway test/integration/ai-settings.integration.spec.ts test/integration/teacher-ai-pipeline.integration.spec.ts test/integration/locale-preferences.integration.spec.ts
pnpm --filter @worklingo/api exec vitest run src
pnpm --filter @worklingo/api typecheck
pnpm --filter @worklingo/api lint
pnpm --filter @worklingo/api build
pnpm --filter @worklingo/web test
pnpm --filter @worklingo/web e2e --project=ai-settings-desktop --project=ai-settings-mobile
pnpm i18n:check
pnpm format:check
```

Live check opt-in có thể phát sinh phí theo model: `pnpm --filter @worklingo/api exec tsx scripts/check-discovery.mts --live`. Script chỉ gửi một bài giả, không in key hoặc raw response. Không cần chạy live check để chạy tests.

## Review và lỗi đã sửa

Reviewer độc lập phát hiện hai P2 và đã tái hiện RED trước khi sửa:

1. Chỉ đổi env provider chưa đủ rollback nếu preference Discovery đã lưu. Bổ sung routing-disable switch; kiểm thử factory bypass, resolve/effective provider, khóa PATCH và preference không vượt rollback.
2. Discovery refusal thiếu `content` bị phân loại thành malformed JSON và có thể chuyển OpenAI. Kiểm tra explicit refusal signal trước validate envelope. Mở rộng cùng nguyên tắc cho OpenAI refusal thiếu text; regression test từ fail chuyển pass. Refusal vẫn fail-closed và không đi dự phòng.

Kiểm thử bổ sung xác nhận provenance khi hai tài khoản chọn hai provider khác nhau, không loop khi cả hai lỗi, account không vượt global fallback disable, SYSTEM_ADMIN có audit log, account rows cascade khi xóa user và không sửa các result đã hoàn thành.

## Gate chưa xanh và lần chạy bị ngắt

Source suite còn **một lỗi đã tồn tại trước integration**:

`src/learning-sessions/application/learning-sessions.service.spec.ts` — `LearningSessionsService state transitions > passes reviewQueue into planner and handles insufficient content with 422`: fixture/planner hiện cho phép tiếp tục thay vì báo insufficient content cho 90 phút, dẫn đến mock thiếu `transaction.learningSession.create`. File business logic và test này không được sửa trong task Discovery.

Lượt `pnpm --filter @worklingo/api test` toàn gói ngày 14/10 bị ngắt trước summary cuối. Log đã quan sát 15 lỗi thuộc baseline trước task: curriculum seed 2, learning-sessions integration 2, progression integration 10 và service test 1. Không coi lượt bị ngắt là full-suite pass hoặc là bằng chứng loại trừ mọi regression integration.

Khi tiếp tục ngày 15/10, PostgreSQL đang dừng, khiến ba integration suites không khởi tạo; một lượt rộng còn có năm lỗi local HTTP Microsoft adapter. Đã khởi động duy nhất `worklingo-review-postgres`; không khởi động container thứ hai dùng chung volume. Sau đó focused integration/gateway **80/80 pass** và chạy lại toàn source chỉ còn đúng lỗi planner baseline, các lỗi Microsoft không tái hiện. Không thay production Microsoft adapters hoặc nới timeout để làm tests qua. Không khẳng định nguyên nhân năm lỗi HTTP đã được xác định.

Không chạy lại toàn bộ E2E sản phẩm hoặc toàn `pnpm verify` vì các gate baseline đã biết đang đỏ; đã chạy đúng bốn E2E của settings mới. Không tuyên bố production/pilot-qualified.

## Còn cần quyết định và xác minh

- Human/live-provider calibration vẫn pending theo AI_CALIBRATION và release gates hiện có. Một sample JSON-valid không chứng minh score đúng, bias, CEFR hoặc IELTS band.
- Chưa có monthly budget bằng số hoặc budget ledger cưỡng chế. Cap 2048 token và retry tối đa không phải monthly billing cap; fallback OpenAI có thể phát sinh phí.
- Chưa đo tải thật, tỷ lệ fallback/timeout, chất lượng nhiều bài hoặc tiết kiệm phần trăm so với OpenAI. Giá ink points và thời hạn free là snapshot ngày kiểm tra.
- Chatbot/admin draft assistant chưa xây. Chưa có tác vụ vision hoặc audio Discovery được tích hợp.
- System Design Word bị chặn ở bước render reference: bundled runtime thiếu `soffice.exe`. [documents SKILL.md](C:/Users/ASUS/.codex/plugins/cache/openai-primary-runtime/documents/26.1013.11914/skills/documents/SKILL.md) yêu cầu “Run `render_docx.py` to produce `page-<N>.png` images” trước khi giao DOCX. Không tạo bản Word chưa xác minh; retained reference không bị sửa. Thiết kế Markdown đã cung cấp.

## Ảnh kiểm tra

Ảnh từ môi trường E2E **fake provider**, không phải ảnh live-provider health:

- [Admin desktop](ai-settings-admin-desktop.png)
- [Learner mobile tiếng Việt](ai-settings-learner-mobile.png)

Đã mở kiểm tra hai ảnh: labels đọc được, controls không bị cắt và không có tràn ngang. Screenshot thể hiện mô phỏng rõ ràng.

## Skill audit

| Skill | Trách nhiệm đã dùng |
| --- | --- |
| using-superpowers | Chọn và đọc workflow theo phase |
| codex-quota-optimizer | Search có mục tiêu, tái sử dụng gateway, một reviewer; không thêm SDK/framework |
| brainstorming và writing-plans | Xác nhận scope settings/chatbot và lưu spec/plan |
| nodejs-backend-patterns | DI, secret phía server, validation, HTTP boundary và lỗi chuẩn hóa |
| Git workflow | Kiểm tra nhánh/dirty state, giữ baseline và không commit/push công việc trước đó |
| TDD và systematic-debugging | Config/routing/provider regression, tái hiện review findings; phục hồi môi trường DB |
| ui-ux-pro-max | Dùng visual system settings hiện có, nhãn form, trạng thái tải/lưu và kiểm tra mobile |
| requesting-code-review và verification-before-completion | Review độc lập, kiểm thử thực tế và phân biệt focused pass với gate baseline đỏ |
| mandate-steward | Rà soát evidence/roadmap, kiểm tra trùng và validate register; không tự mở rộng scope chatbot |
| artifact-template-system-design và documents | Đọc template/runtime workflow; dừng nhánh Word ở render blocker, không giao artifact chưa QA |

Không dùng nhiều implementer agents hoặc thêm framework provider registry tổng quát: thay đổi bám LanguageEvaluationPort sẵn có. Không dùng finishing-a-development-branch để merge vì source suite và gate nền chưa xanh, và người dùng chưa yêu cầu tích hợp Git/publish.
