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

**Trạng thái 2026-10-09:** Implementation Tasks 1–12 đã được hoàn thiện trên branch Increment 4: contracts/config, adapters, PostgreSQL jobs, recording/draft/evaluation persistence, consent/retention, learner recorder/audio/writing UI, golden harness và Teacher AI E2E desktop/mobile. Fake calibration pass 3/3 expected ranges. Sau khi khôi phục PostgreSQL local, full `pnpm verify` đã pass: lint/typecheck, 352 API tests, 136 web tests, 138 integration tests, production build và 8 Playwright journeys trên desktop/mobile. **Human calibration pending** và live-provider calibration chưa chạy; hai mục này chặn tuyên bố pilot-ready/live-provider, không chặn hoàn tất kỹ thuật Increment 4 trên local.

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

**Trạng thái Increment 5A1 (2026-10-11):** Luồng onboarding bắt buộc đã hoàn thiện cho learner mới:
self-placement vào level playable hoặc placement 45 phút bốn kỹ năng, resume/checkpoint, durable
evaluation, recommendation và explicit confirmation. Placement evidence được cách ly khỏi
mastery/progression; route guard, idempotency, ownership và desktop/mobile journey đã có test. Policy
`workplace-placement-v1` hiện chỉ đưa ra candidate Foundation có nội dung đã publish và vẫn
**human calibration pending**; chưa đủ điều kiện tuyên bố CEFR/certification equivalence hay pilot-ready.

**Trạng thái Increment 5A2 (2026-10-11):** Đã hoàn thiện toàn diện Weekly Mission, flexible consistency streak và Evidence of Progress:
- Schema, contracts, và deterministic projection: `LearnerStudyDay`, `LearnerStudySession`, `LearnerEngagementWeek`, `weeklyTargetDays`.
- Exactly-once session projection trong completion transaction với unique constraint chống double counting.
- Bảo vệ mục tiêu tuần hiện tại khi đã bắt đầu học (chuyển thay đổi sang tuần kế tiếp `effectiveTargetNextWeek`).
- Evidence of Progress so sánh 2 cửa sổ 28 ngày qua 4 kỹ năng với quy tắc trung thực: >= 2 mẫu đánh giá mới tính % thay đổi, còn lại gắn cờ `Insufficient evidence`.
- Dashboard UI hỗ trợ độc lập, retryable, 44px touch targets, 16px mobile select, kiểm thử vitest 182 passed, Playwright desktop/mobile E2E passed.

**Trạng thái Increment 5B–5D (2026-10-12):** Curriculum/Audit, request safety, durable rate limiting,
Operations, aggregate Pilot Analytics và bộ qualification local đã hoàn thiện. Các lệnh
`pnpm qualify:performance`, `pnpm qualify:security`, `pnpm qualify:recovery` và `pnpm verify` là
bằng chứng kỹ thuật. Trạng thái tối đa từ automation là `TECHNICALLY_QUALIFIED`; Teacher AI,
placement, content và pilot operations vẫn cần named human approval trước controlled pilot.

Vận hành: `docs/INCREMENT_5A_DEMO.md`. Kế hoạch chi tiết:
`docs/superpowers/plans/2026-10-09-increment-5a1-onboarding-placement.md` & `docs/superpowers/plans/2026-10-09-increment-5a2-engagement-progress.md`.

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

## IELTS Phase 2 — Curriculum foundation (2026-10-13)

Đã hoàn thành authoring/validation/publish revision, prerequisite eligibility, session pinning,
objective evidence projection và learner roadmap responsive. Acceptance E2E mới pass trên desktop
và mobile; regression program catalog cũng pass trên cả hai viewport. Chi tiết bàn giao nằm tại
`docs/IELTS_PHASE_2_CURRICULUM_REVIEW.md`.

## IELTS Phase 3 — Foundation learning (started 2026-10-13)

The first vertical slice is Grammar: a versioned Foundation lesson teaches contextual patterns and
common errors before practice, returns authored feedback after submission, and reuses the existing
mastery/review pipeline. Pronunciation, Vocabulary, and the four focused skill slices follow in that
order. See `docs/superpowers/specs/2026-10-13-ielts-phase-3-foundation-learning-design.md`.

Grammar and Pronunciation slices are now implemented. Shadowing teaches the versioned model and IPA
before recording, respects learner Audio Settings, and uses session-bound published audio with free
Browser TTS fallback. STT pronunciation metrics continue through the existing Teacher AI and mastery
pipeline.

The Vocabulary slice now teaches reusable chunks, meanings, and transfer contexts during contextual
reading. Vocabulary writing requires active recall without exposing `requiredPhrases`; Teacher AI and
the existing review selector still evaluate those hidden targets and prefer a new workplace context.

Phase 3 Foundation implementation is complete. The final repository gate passed across unit,
integration, production build, and all 36 desktop/mobile Playwright journeys; see
`docs/IELTS_PHASE_3_FOUNDATION_REVIEW.md`.

## IELTS Phase 4 — Orientation (completed 2026-10-13)

The approved implementation is a data-driven, narrated presentation with Admin authoring,
immutable publish versions, local media, Foundation-checkpoint eligibility, version-bound learner
resume, knowledge checks, and durable completion. It extends the existing local-first monolith and
does not introduce IELTS scoring or a second learning engine. See
`docs/superpowers/specs/2026-10-13-ielts-phase-4-orientation-design.md`.
Implementation evidence and remaining non-code release constraints are recorded in
`docs/IELTS_PHASE_4_ORIENTATION_REVIEW.md`.

## Definition of Done cho roadmap

- Các acceptance criteria trong `docs/REQUIREMENTS.md` có bằng chứng test.
- Mọi journey bắt buộc trong `docs/TEST_STRATEGY.md` pass.
- Không có critical defect gây mất session/submission.
- Bộ content Foundation đủ cho pilot và qua content-quality review.
- Backup/restore local được diễn tập.
- Product owner duyệt trải nghiệm desktop và mobile web.
