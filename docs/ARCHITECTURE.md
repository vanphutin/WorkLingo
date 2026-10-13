# Architecture

## 1. Mục tiêu kiến trúc

- Chạy toàn bộ ứng dụng và dữ liệu nghiệp vụ trên local trong MVP.
- Phát triển nhanh nhưng giữ ranh giới module rõ ràng.
- Không để SDK AI, filesystem hoặc framework UI xâm nhập business logic.
- Bảo toàn session khi provider bên ngoài lỗi.
- Cho phép chuyển sang cloud hoặc tách service sau này mà không thiết kế microservices từ đầu.

## 2. Kiến trúc tổng thể

```text
┌───────────────────────────────────────────┐
│ Responsive Web — Next.js                 │
│ Learner UI · Admin UI                    │
└───────────────────┬───────────────────────┘
                    │ HTTP / SSE when needed
┌───────────────────▼───────────────────────┐
│ NestJS Modular Monolith                  │
│                                           │
│ Auth · Users · Curriculum · Content      │
│ Sessions · Mastery · Assessment · Admin  │
│ AI Gateway · Jobs · Local Storage        │
└──────────────┬───────────────┬────────────┘
               │               │
       ┌───────▼──────┐  ┌────▼───────────┐
       │ PostgreSQL   │  │ Local files    │
       │ local        │  │ audio/uploads  │
       └──────────────┘  └────────────────┘
               │
        Outbound HTTPS only
               │
       ┌───────▼───────────────────────────┐
       │ AI providers                     │
       │ OpenAI-compatible · Microsoft STT│
       │ Configurable TTS                  │
       └───────────────────────────────────┘
```

## 3. Lựa chọn kiến trúc

### Modular monolith

MVP dùng một backend deployable. Mỗi module sở hữu use cases, domain rules và persistence interface của mình. Module giao tiếp qua public application services hoặc domain events nội bộ, không truy cập repository riêng của module khác.

### Local-first infrastructure

- PostgreSQL chạy local, ưu tiên Docker Compose cho môi trường phát triển thống nhất.
- File được lưu dưới một data directory cấu hình được và nằm ngoài source tree khi chạy thật.
- Không yêu cầu Redis, S3, CDN hoặc cloud database.
- Job dài được lưu trạng thái trong PostgreSQL và xử lý bởi worker trong cùng codebase.
- Backup bao gồm database dump và data directory theo cùng một snapshot logic.

### Provider adapters

Các interface lõi:

```text
SpeechToTextProvider
TextToSpeechProvider
LanguageEvaluationProvider
ObjectStorage
JobDispatcher
Clock
```

Adapter ban đầu gọi Microsoft Speech-to-Text, OpenAI-compatible API và local filesystem. Nghiệp vụ không import SDK của provider trực tiếp.

## 4. Backend modules

| Module | Trách nhiệm |
|---|---|
| Auth | Đăng nhập, session/token và kiểm tra quyền |
| Users | Hồ sơ, preference, consent và mục tiêu |
| Curriculum | Path, level, mission và progression rules |
| Content | Lesson, Word Bank, Language Block và versioning |
| Content Import | Parse, validate, preview và publish source text |
| Learning Sessions | Lập kế hoạch, checkpoint và resume phiên học |
| Activities | Render contract và chấm các activity xác định được |
| Mastery | Mastery per skill, review schedule và Error Bank |
| Assessment | Placement, checkpoint và gateway assessment |
| Teacher AI | Rubric, prompt contract, evaluation và feedback |
| Media | Audio generation, recording metadata và retention |
| Jobs | Tác vụ nền, retry và idempotency |
| Admin | Các use case quản trị và audit log |

## 5. Frontend boundaries

```text
app/
├── learner/       dashboard, onboarding, session, mastery
├── admin/         import, preview, curriculum, publishing
├── auth/
└── shared/        design system and API client
```

- Server state được truy cập qua typed API client.
- Draft nói/viết được lưu thường xuyên ở server; local browser state chỉ là lớp dự phòng ngắn hạn.
- Activity renderer dùng discriminated union theo `activity.type`.
- Provider status không được ánh xạ trực tiếp vào UI; API trả trạng thái nghiệp vụ chuẩn hóa.

## 6. Data flows quan trọng

### Tạo session

```text
duration + user + current mission
→ load mastery/review due
→ select lesson version
→ allocate review/new/transfer activities
→ validate four-skill coverage
→ persist immutable session plan
→ return first block
```

Session plan đã bắt đầu không bị thay đổi khi content mới được publish.

### Chấm speaking

```text
record locally in browser
→ upload to backend
→ store local file + submission record
→ enqueue STT job
→ normalize transcript
→ deterministic checks + AI evaluation
→ persist result and mastery event
→ apply retention policy to audio
```

Speaking và writing dùng cùng state machine nghiệp vụ `queued → processing → evaluated | evaluation_failed`.
Lỗi provider còn automatic retry đưa attempt về `queued`, tránh client hiểu nhầm là terminal. Kết quả
và MasteryEvent được ghi đúng một lần theo attempt/rubric; refresh chỉ đọc lại durable state. Browser
audio không bao giờ tự phát hoặc tự xin microphone.

### Import lesson

```text
raw source
→ parser AST
→ structural validation
→ semantic validation
→ draft entities
→ preview
→ media generation
→ publish transaction
```

### Onboarding và placement

```text
register learner (PENDING)
→ choose playable level ───────────────────────────────→ confirm + open dashboard
└→ create version-bound PLACEMENT session (45 minutes)
   → resume from durable checkpoint
   → collect separate reading/listening/speaking/writing evidence
   → durable provider jobs + bounded retry
   → recommendation snapshot (workplace-placement-v1)
   → explicit learner confirmation → open dashboard
```

`GET /me/onboarding` reconciles the active attempt with its session/evaluation state before returning
`nextAction`; reload therefore cannot send a completed placement back into the assessment. Placement
sessions reuse the learning-session engine but every mastery/progression consumer filters
`Mission.purpose=LEARNING`. Recommendation evidence is isolated and never becomes ordinary mastery.
The placement mission and `LessonVersion` are immutable for the life of the attempt.

### Audio source resolution và publish binding

```text
Admin script → Browser Speech preview (không tạo artifact)
             → selected TTS provider → immutable candidate in local storage
             → explicit READY candidate selection → atomic LessonVersion binding

Learner setting
  browser-tts     → Web Speech API only
  published-audio → version-bound media or explicit error
  system-default  → version-bound media, then Browser Speech fallback on playback error
```

Frontend không nhận provider credential và không autoplay. Admin/Learner media URL đều qua API đã
xác thực; authorization chạy trước range parsing. Session đã tạo giữ nguyên `LessonVersion` và audio
candidate đã bind, kể cả khi Admin generate hoặc publish candidate mới.

## 7. Job processing

Job table tối thiểu chứa type, payload reference, status, attempts, available time, idempotency key và error summary.

- Worker claim job bằng database locking.
- Retry dùng exponential backoff có giới hạn.
- Tác vụ không retry tự động vô hạn.
- Tạo audio và AI evaluation phải có idempotency key.
- API trả `202 Accepted` cho tác vụ nền và endpoint status để frontend theo dõi; SSE có thể bổ sung sau.
- Local demo bật worker trong API process bằng `JOB_WORKER_ENABLED=true`; trạng thái job vẫn ở PostgreSQL,
  nên restart không làm mất hàng đợi.

## 8. Reliability và lỗi

- Ghi câu trả lời trước khi gọi provider.
- Checkpoint sau mỗi activity và learning block.
- Transaction cho publish và progression updates quan trọng.
- Provider timeout và retry policy cấu hình được.
- Circuit breaker MAY được thêm khi provider thường xuyên lỗi; không bắt buộc ở increment đầu.
- Log có correlation ID nhưng không chứa secret hoặc raw nội dung nhạy cảm.

## 9. Bảo mật và quyền riêng tư

- Password hash bằng Argon2id hoặc lựa chọn tương đương được kiểm chứng.
- Role/permission kiểm tra ở controller guard và use-case boundary quan trọng.
- Upload chống path traversal, giới hạn size và allowlist MIME type.
- API provider chỉ gọi từ backend.
- Consent và retention metadata đi cùng recording.
- Prompt injection từ lesson/user content được xem là dữ liệu; system rubric không được nội dung nhập đè lên.

## 10. Cấu trúc local data đề xuất

```text
<WORKLINGO_DATA_DIR>/
├── generated-audio/
├── recordings/
├── imports/
├── exports/
└── backups/
```

`WORKLINGO_DATA_DIR` phải là cấu hình bắt buộc ngoài production-like local setup. Thư mục runtime và secret không được commit.

## 11. Observability local

- Structured logs với request/job correlation ID.
- Health endpoint cho database, storage và cấu hình provider.
- Admin page hiển thị failed jobs và thao tác retry.
- Metrics ban đầu: latency, error rate, queue depth, provider usage và session completion.

## 12. Hướng mở rộng, chưa triển khai

- Local filesystem → S3-compatible storage.
- In-process/database worker → dedicated queue worker.
Các thay đổi này chỉ thực hiện khi có bằng chứng về nhu cầu, không phải điều kiện của MVP.

## 13. Engagement and Evidence Architecture (Increment 5A2)

- **Engagement Module:** Encapsulates study day projections, weekly mission reconciliation, and four-skill evidence comparison.
- **Single Canonical Projection Transaction:** Learning session completions route through `StudyDayProjectorService.recordCompletion` within the `LearningSessionsService.advanceSubmittedActivity` completion transaction.
- **Idempotent Study Day Deduplication:** Unique constraint `LearnerStudySession(learnerId, sessionId)` and unique index `LearnerStudyDay(learnerId, studyDateKey)` ensure each completed session is projected exactly once, preventing double-counting across retries or replays.
- **Deterministic Monday-Start Calendar Weeks:** Weeks are calculated from the learner profile timezone (`Asia/Ho_Chi_Minh`) using `toWeekStartKey(date, tz)`.
- **Active-Week Target Protection:** Weekly targets (2–5) update immediately if 0 study days have been completed in the current week. Once study has commenced in the active week, the target change is deferred to next week (`effectiveTargetNextWeek`) to protect ongoing weekly targets.
- **Evidence Comparison Windows:** Two 28-day windows (recent 28 days vs preceding 28 days) are compared across four skills with a minimum threshold of 2 evaluated samples per skill. Placement sessions (`purpose = 'PLACEMENT'`) are excluded.

## 14. Curriculum Operations and Audit Architecture (Increment 5B)

- **Curriculum Mutation Policy:** Pure domain rules in `curriculum-mutation-policy.ts` govern publishability, playability, and archive operations:
  - Paths require at least one published, playable CEFR level.
  - Levels require at least one published, playable mission.
  - Missions require published lessons with audio artifacts covering four skills and forming a 60-minute session.
  - Archive is blocked when active learners are currently enrolled or in-progress sessions exist.
- **Transactional Idempotency & Concurrency:** Commands are guarded by optimistic revision concurrency (`expectedRevision`) and unique SHA-256 payload receipts; database constraints serialize competing receipts and versions.
- **Atomic Audit Trail:** Every administrative command emits an audit log record within the same database transaction.
- **Privacy-Safe Audit Browser:** Cursor pagination query service scrubs metadata to ensure actor emails, raw lesson scripts, user voice recordings, and sensitive tokens are never exposed.

## 15. Security, Operations and Pilot Analytics (Increment 5C)

- Correlation middleware and the global exception filter return safe IDs while structured logging
  recursively redacts sensitive keys and infrastructure identifiers.
- Durable rate-limit buckets use route/actor scopes and HMAC subjects; trusted proxy hops default to
  zero and production requires a dedicated hash key.
- Admin Operations reads selected job/attempt fields only. It cannot replay jobs or expose raw
  payload/result/provider bodies.
- Pilot Analytics has no ingestion endpoint. Server-owned transitions write idempotency receipts and
  daily aggregates with a closed dimension union; retention queries return cohort counts only.

## 16. Pilot qualification boundary (Increment 5D)

Qualification runs on fresh schemas and temporary data roots. Performance, security, recovery,
accessibility and end-to-end gates produce versioned evidence in `docs/`. Technical success does not
approve language calibration, content quality, cloud deployment or public release.

## 17. Learning program boundary (IELTS Phase 1)

- `LearningProgram` là aggregate phân loại cấp cao hơn `LearningPath`; curriculum vẫn giữ cấu trúc
  Program -> Path -> Level -> Mission -> Lesson.
- Catalog canonical gồm Beginner, Intermediate, TOEIC và IELTS, được seed bằng UUID ổn định và
  thứ tự hiển thị cố định. Seed chỉ tạo bản ghi thiếu, không ghi đè nội dung do operator đã sửa.
- Learner đọc catalog qua module `LearningPrograms`. Quyền truy cập được suy ra phía server từ
  `availabilityStatus`; client không tự quyết định chương trình nào có thể mở.
- Phase 1 chỉ mở Intermediate tới dashboard. Beginner/TOEIC/IELTS vẫn xuất hiện minh bạch nhưng
  không điều hướng và không tạo learning session.
- Content Admin phải chọn program khi tạo path; request cũ không có `programId` được gắn
  Intermediate để giữ tương thích. Program `DISABLED` hoặc ID không tồn tại bị từ chối.
- Session hiện tại tiếp tục bất biến theo `LessonVersion`; việc phân loại program không thay đổi
  version đã gắn vào session.

## 18. Learner program context (IELTS Phase 2)

- `LearningProgramsModule` exports `ProgramContextService`, which validates active program,
  enrollment and level membership. Onboarding, sessions, mastery and progression consume this
  boundary; new learning does not infer the current level from the compatibility mirror.
- Activation, onboarding and progression lock the same learner profile row and resolve context
  within the transaction. Read-only context and learning summaries use repeatable-read snapshots.
- Curriculum selection requires the resolved program plus published level/path. Review selections
  are restricted to language blocks in that curriculum.
- Historical sessions continue to resume against their frozen mission/version. Assessment and
  confirmation reject another active program, including replay requests.
- Dashboard progress counts the active program; weekly engagement retains the existing learner-wide
  calendar model. PENDING learners receive empty progress and cannot open program-scoped mastery
  or progression before onboarding.
- Intermediate remains the only selectable program. IELTS content and calibrated admission are
  separate capabilities; changing a catalog status cannot bypass the server release policy.

## 19. Curriculum foundation progression (IELTS Phase 2)

- Authoring separates mutable definitions from immutable published revision snapshots. Validation
  resolves every lesson/activity/block reference before publication.
- Eligibility resolves the latest published revision in the learner's active program and requires
  exact prerequisite-revision completions. Session creation persists the chosen revision ID.
- Completion is projected transactionally from completed-session evaluated evidence. The roadmap
  derives objective progress from stored attempts and never trusts client-supplied progress.
- Republishing affects future selection only; historical sessions and completion evidence remain
  bound to their original revision.

## 20. IELTS Orientation boundary (IELTS Phase 4)

- `IeltsOrientationModule` owns one mutable Admin draft, immutable published versions, local media,
  and learner progress. It does not create IELTS band scores or learning sessions.
- A learner can start only after completed onboarding, Intermediate enrollment, and a latest
  passing Foundation checkpoint with evaluated Reading, Listening, Speaking, and Writing evidence.
- Starting pins an `IeltsOrientationVersion`. Later publications affect new learners only; resume,
  knowledge-check answers, media access, and completion remain version-bound.
- Learner projections strip answer indexes, explanations, storage keys, and internal asset IDs.
  Media streaming authorizes each asset against a version already pinned to that learner.
- Uploaded local narration is preferred. If absent, the web client reads the authored transcript
  through browser speech; fake TTS output is never presented as release audio.
