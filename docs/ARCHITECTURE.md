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
- Modular monolith → tách Media/Teacher AI khi tải hoặc ownership yêu cầu.
- Single local deployment → cloud deployment có managed database.

Các thay đổi này chỉ thực hiện khi có bằng chứng về nhu cầu, không phải điều kiện của MVP.
