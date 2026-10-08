# WorkLingo MVP Implementation Roadmap

## Mục tiêu

Triển khai MVP theo các vertical increments nhỏ. Mỗi increment phải chạy được trên local, có test, có dữ liệu mẫu và tạo ra một luồng người dùng có thể kiểm chứng. Không xây toàn bộ backend trước rồi mới nối giao diện.

## Nguyên tắc thực thi

- TDD cho domain rules, parser, session planner và mastery algorithm.
- Mỗi increment có migration, seed, unit/integration/E2E tests và tài liệu chạy local.
- Chỉ thêm abstraction khi có ít nhất một use case hiện tại cần nó; ngoại lệ là provider/storage ports đã được đặc tả để bảo vệ business logic.
- PostgreSQL và filesystem chạy local; AI provider gọi qua backend.
- Mọi increment kết thúc bằng review toàn bộ diff và một commit/chuỗi commit nguyên tử.
- Không bắt đầu increment kế tiếp khi required gates của increment hiện tại chưa đạt.

## Kiến trúc repository mục tiêu

```text
WorkLingo/
├── apps/
│   ├── api/                 NestJS modular monolith
│   └── web/                 Next.js responsive web
├── packages/
│   ├── contracts/           Shared API schemas/types
│   ├── content-format/      Lesson import parser and validators
│   └── test-fixtures/       Approved fixtures without personal data
├── docs/
├── infra/
│   └── docker-compose.yml   Local PostgreSQL
├── scripts/                 Local setup, backup and restore
├── data/                    Runtime data; gitignored
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Increment 1 — Local foundation và learning slice

**Kết quả:** một learner đăng ký, đăng nhập, nhận curriculum mẫu, tạo session 60 phút, hoàn thành activity mẫu, refresh/resume và xem progress cơ bản.

**Bao gồm:**

- pnpm workspace, Next.js, NestJS, shared contracts.
- PostgreSQL local, Prisma migrations và local storage adapter.
- Authentication và learner profile tối thiểu.
- Seed path Foundation 1 với một mission/lesson version bất biến.
- Session planner 60 phút gồm bốn block và bốn kỹ năng.
- Activity attempts, checkpoint và resume.
- Learner dashboard/session shell responsive.
- E2E happy path và refresh/resume.

**Không bao gồm:** admin import, adaptive mastery, live AI hoặc audio generation.

**Detailed plan:** `docs/superpowers/plans/2026-10-04-foundation-learning-slice.md`.

## Increment 2 — Content authoring và publishing

**Kết quả:** Content Admin dán một lesson có cấu trúc, sửa lỗi theo vị trí, preview và publish version dùng được trong session mới.

**Bao gồm:**

- Lesson format 1.0 và fixture chuẩn.
- Parser tạo AST kèm source locations.
- Structural và semantic validators.
- Draft/validated/published/archived workflow.
- Preview UI và publish transaction.
- Local generated-audio lifecycle với fake TTS adapter trước.
- Version isolation: session cũ giữ lesson version cũ.

**Required gates:** parser fixtures, invalid-source matrix, publish/version integration tests và E2E admin flow.

## Increment 3 — Mastery, review và progression

**Kết quả:** hệ thống theo dõi từng Language Block theo bốn kỹ năng, đưa kiến thức cũ trở lại session và chỉ mở level khi đạt ngưỡng từng kỹ năng.

**Bao gồm:**

- Mastery events và materialized mastery records.
- Review scheduler phiên bản đầu có clock injection.
- Error Bank và Memory Health.
- Session planner cho 45/60/90/120/150 phút.
- Context-transfer constraints.
- Checkpoint assessment và reinforcement plan.
- Mastery Map UI.

**Required gates:** deterministic scheduler tests, time-travel tests, four-skill minimum tests và E2E review recurrence.

**Trạng thái 2026-10-07:** Hoàn tất Increment 3 trên local; independent review không còn Critical/Important findings, `pnpm verify` pass và 6 E2E desktop/mobile pass. Kế hoạch chi tiết: `docs/superpowers/plans/2026-10-07-increment-3-completion.md`; vận hành: `docs/INCREMENT_3_DEMO.md`; kết quả review và sự cố test isolation: `docs/INCREMENT_3_REVIEW.md`.

Speaking/writing chưa có điểm AI thật nên checkpoint có thể còn chờ đánh giá; scoring thuộc Increment 4. Hai mission mẫu hỗ trợ 45/60 phút; 90/120/150 chỉ được bật khi có đủ activity độc lập. Hoàn tất Increment 3 không đồng nghĩa hoàn tất toàn bộ MVP/pilot.

## Increment 4 — Speech, TTS và Teacher AI

**Kết quả:** learner làm shadowing và bài viết có cấu trúc; submission được lưu trước, chấm bất đồng bộ và retry được khi provider lỗi.

**Bao gồm:**

- AI Gateway ports và provider configuration.
- Microsoft Speech-to-Text adapter.
- OpenAI-compatible language-evaluation adapter.
- Configurable TTS adapter và audio preview.
- PostgreSQL-backed jobs, idempotency và retry.
- Recording consent/retention.
- Speaking recorder, processing states và feedback UI.
- Golden-set evaluation harness.

**Required gates:** fake-provider contract tests, timeout/429/malformed-response tests, duplicate-attempt test và human calibration report.

**Trạng thái 2026-10-08:** Implementation Tasks 1–12 đã được hoàn thiện trên branch Increment 4: contracts/config, adapters, PostgreSQL jobs, recording/draft/evaluation persistence, consent/retention, learner recorder/audio/writing UI, golden harness và Teacher AI E2E desktop/mobile. Fake calibration pass 3/3 expected ranges; **human calibration pending** và live-provider calibration chưa chạy. Trên máy thực hiện hiện tại, unit/lint/typecheck pass nhưng integration/E2E/full `pnpm verify` chưa thể hoàn tất vì PostgreSQL `127.0.0.1:5432` không chạy (Prisma P1001); không ghi nhận gate này là pass cho đến khi hạ tầng được khôi phục.

Vận hành: `docs/INCREMENT_4_DEMO.md`. Calibration: `docs/AI_CALIBRATION.md`. Detailed plan: `docs/superpowers/plans/2026-10-07-increment-4-speech-teacher-ai.md`.

## Increment 5 — Admin, quality và pilot readiness

**Kết quả:** local MVP đủ ổn định để chạy pilot có kiểm soát với bộ Foundation content đầu tiên.

**Bao gồm:**

- Admin curriculum management và audit log.
- Placement test và level recommendation.
- Flexible streak, weekly mission và evidence-of-progress.
- Backup/restore scripts và rehearsal.
- Accessibility, responsive và performance pass.
- Security hardening, rate limiting và log redaction.
- Observability page cho failed jobs/provider status.
- Pilot analytics không lưu raw sensitive content.

**Required gates:** toàn bộ MVP E2E journeys, backup/restore rehearsal, accessibility smoke, security review và release checklist.

## Thứ tự phụ thuộc

```text
Increment 1: Foundation slice
        ↓
Increment 2: Content pipeline
        ↓
Increment 3: Adaptive learning
        ↓
Increment 4: Teacher AI
        ↓
Increment 5: Pilot hardening
```

Content pipeline đứng trước AI để Teacher AI luôn đánh giá nội dung/rubric có version. Mastery đứng trước AI để kết quả AI có nơi cập nhật rõ ràng. Pilot hardening đứng cuối nhưng security, accessibility và failure handling vẫn được thực hiện trong từng increment.

## Ma trận bao phủ đặc tả

| Nhóm yêu cầu | Increment sở hữu |
|---|---|
| Auth, users, local infrastructure | 1 |
| Seed curriculum, session 60 phút, checkpoint/resume | 1 |
| Structured content import, validation, preview, versioning | 2 |
| Word Bank/Language Block authoring | 2 |
| Mastery per skill, Error Bank, review scheduling | 3 |
| Các mốc 45/90/120/150 phút | 3 |
| Placement/checkpoint/gateway progression | 3 và hoàn thiện ở 5 |
| Speech-to-text, TTS, Teacher AI, async jobs | 4 |
| Recording consent và retention | 4 |
| Admin operations, audit, observability | 5 |
| Engagement, accessibility, security, performance, pilot | xuyên suốt; exit gate ở 5 |

Các hạng mục hậu MVP trong `VISION.md` và `PRODUCT.md` như TOEIC/IELTS hoàn chỉnh, mobile native, payment, cloud deployment và microservices không được đưa vào năm increment này.

## Mốc demo

| Mốc | Demo bắt buộc |
|---|---|
| 1 | Learner hoàn thành và resume một session 60 phút từ seed data |
| 2 | Admin paste → validate → preview → publish → learner nhận version mới |
| 3 | Kiến thức cũ quay lại đúng lịch và progress cập nhật theo kỹ năng |
| 4 | Shadowing/writing được xử lý qua provider và retry sau lỗi |
| 5 | Khôi phục local backup và chạy full pilot journey trên desktop/mobile |

## Definition of Ready cho mỗi increment

- Detailed implementation plan đã được duyệt.
- Interfaces với increment trước được ghi rõ.
- Fixture/acceptance examples tồn tại.
- Không còn quyết định sản phẩm ảnh hưởng lớn bị để mở trong phạm vi increment.

## Definition of Done cho roadmap

- Các acceptance criteria trong `docs/REQUIREMENTS.md` có bằng chứng test.
- Mọi journey bắt buộc trong `docs/TEST_STRATEGY.md` pass.
- Không có critical defect gây mất session/submission.
- Bộ content Foundation đủ cho pilot và qua content-quality review.
- Backup/restore local được diễn tập.
- Product owner duyệt trải nghiệm desktop và mobile web.
