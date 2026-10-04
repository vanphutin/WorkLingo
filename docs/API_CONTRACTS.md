# API Contracts

## 1. Quy ước chung

- Base path: `/api/v1`.
- JSON dùng `camelCase`.
- ID là UUID string.
- Timestamp là ISO 8601 UTC.
- Endpoint thay đổi state yêu cầu authentication và CSRF protection nếu dùng cookie session.
- API trả request/correlation ID để tra log.

## 2. Response envelope

Success trả resource trực tiếp hoặc object có metadata. Error dùng cấu trúc thống nhất:

```json
{
  "error": {
    "code": "CONTENT_VALIDATION_FAILED",
    "message": "Lesson source contains validation errors.",
    "details": [
      {
        "path": "questions[2].answer",
        "line": 31,
        "reason": "ANSWER_REQUIRED"
      }
    ],
    "requestId": "uuid"
  }
}
```

Không trả stack trace, provider secret hoặc raw provider error cho client.

## 3. Authentication

### `POST /auth/register`

```json
{
  "email": "learner@example.com",
  "password": "user supplied",
  "displayName": "An"
}
```

### `POST /auth/login`

Trả authenticated session/user summary. Rate limiting áp dụng cho login.

### `POST /auth/logout`

Thu hồi session hiện tại.

### `GET /me`

Trả profile, roles, preferences và enrollment summary.

## 4. Onboarding

### `POST /onboarding/self-placement`

```json
{
  "selectedLevelCode": "FOUNDATION_1",
  "reason": "learner_choice"
}
```

### `POST /assessments/{assessmentId}/attempts`

Tạo attempt cho placement/checkpoint/gateway.

### `POST /assessment-attempts/{attemptId}/submit`

Trả trạng thái `processing` nếu có phần AI, sau đó client đọc status endpoint.

## 5. Learning session

### `POST /learning-sessions`

```json
{
  "durationMinutes": 60,
  "clientSessionId": "uuid"
}
```

Response:

```json
{
  "id": "uuid",
  "clientSessionId": "uuid",
  "status": "planned",
  "durationMinutes": 60,
  "currentCheckpoint": 0,
  "mission": {
    "id": "uuid",
    "title": "Request a deadline extension"
  },
  "blocks": [
    {
      "id": "uuid",
      "type": "activate",
      "order": 1,
      "targetMinutes": 15,
      "activityIds": ["uuid"],
      "status": "available"
    }
  ]
}
```

Trong increment đầu tiên server chỉ chấp nhận 60 phút và MUST từ chối duration khác bằng
`INVALID_SESSION_DURATION`. `clientSessionId` là idempotency key theo learner; gửi lại cùng key trả
về phiên đã tạo thay vì tạo bản ghi mới.

### `GET /learning-sessions/{id}`

Trả plan, checkpoint, trạng thái activity và summary. Chỉ owner hoặc admin có quyền phù hợp được truy cập.

### `POST /learning-sessions/{id}/start`

Idempotent. Chuyển `planned` hoặc `paused` sang `in_progress`.

### `POST /learning-sessions/{id}/pause`

Lưu checkpoint hiện tại và trạng thái paused.

### `POST /learning-sessions/{id}/resume`

Chuyển phiên `paused` sang `in_progress` và giữ nguyên checkpoint. `GET`, `start`, `pause`, `resume`
và attempt đều trả `404` nếu phiên không thuộc learner đang đăng nhập.

### `GET /learning-sessions/{id}/activities/{activityId}`

Trả activity payload theo discriminated union, nội dung tham chiếu và các language block cần cho
ngữ cảnh. Answer specification (`answerIndex`, explanation/evidence nội bộ, sample answer) không xuất
hiện trong response trước khi learner nộp:

```json
{
  "id": "uuid",
  "activityType": "reading",
  "learningBlock": "readDecode",
  "content": [{ "slug": "welcome-email", "type": "email", "text": "..." }],
  "languageBlocks": [{ "slug": "welcome-to", "canonicalForm": "welcome to" }],
  "payload": {
    "prompt": "Read the email and answer every question.",
    "questions": [{ "slug": "main-purpose", "prompt": "...", "options": ["...", "..."] }]
  }
}
```

Không trả answer specification trước khi learner nộp.

### `POST /activities/{activityId}/attempts`

```json
{
  "sessionId": "uuid",
  "response": {
    "text": "The delivery was delayed because..."
  },
  "clientAttemptId": "uuid"
}
```

`clientAttemptId` là idempotency key theo learner. Câu hỏi đọc/nghe được chấm deterministic; chỉ khi
toàn bộ đáp án đúng checkpoint mới tăng. Speaking/writing được lưu với trạng thái `submitted` và vẫn
được chuyển bước, nhưng không được biểu diễn là câu trả lời đúng hoặc có điểm AI. Session response
trả `rawResponse` và `normalizedResponse` trong từng attempt để giao diện khôi phục phần learner đã
nhập sau khi tải lại trang.

### `GET /me/progress`

Trả level gần nhất, tổng attempt, tổng activity hoàn thành và số phiên theo trạng thái
`planned/inProgress/paused/completed` của learner đang đăng nhập.

## 6. Speaking upload

### `POST /activities/{activityId}/recordings`

Multipart upload gồm audio, session ID, client attempt ID và consent scope. Server kiểm tra size/type trước khi lưu.

Response `202`:

```json
{
  "attemptId": "uuid",
  "jobId": "uuid",
  "status": "processing"
}
```

### `GET /attempts/{attemptId}/evaluation`

```json
{
  "status": "completed",
  "scores": {
    "content": 0.82,
    "pronunciation": 0.74,
    "fluency": 0.69
  },
  "feedback": [],
  "retryable": false
}
```

## 7. Progress và mastery

### `GET /me/mastery`

Filter theo skill, state, Word Bank hoặc level.

### `GET /me/reviews/due`

Trả số item đến hạn, lý do ưu tiên và thời lượng ôn ước tính.

### `GET /me/error-bank`

Trả lỗi nhóm theo speaking, writing, listening và reading; không trả provider internals.

### `GET /me/progress`

Trả level, mission progress, skill summaries và evidence highlights.

## 8. Admin content import

### `POST /admin/content-imports`

```json
{
  "source": "TITLE: ...\nCONTENT: ...",
  "formatVersion": "1.0"
}
```

Tạo import draft, lưu source trước khi parse và trả parse/validation summary.

### `POST /admin/content-imports/{id}/validate`

Idempotent theo source hash và parser version.

### `GET /admin/content-imports/{id}/preview`

Trả structured lesson draft, validation issues và warnings.

### `POST /admin/content-imports/{id}/generate-audio`

Tạo job TTS cho script hợp lệ. Không publish tự động sau khi hoàn thành.

### `POST /admin/content-imports/{id}/publish`

Yêu cầu validation pass, audio/rubric bắt buộc hợp lệ và `expectedDraftVersion` để chống overwrite.

```json
{
  "expectedDraftVersion": 4
}
```

Response trả lesson ID và published version.

## 9. Admin curriculum

- `GET/POST /admin/learning-paths`
- `GET/PATCH /admin/levels/{id}`
- `GET/POST /admin/missions`
- `GET/PATCH /admin/word-banks/{id}`
- `GET/PATCH /admin/language-blocks/{id}`

Xóa resource đã được sử dụng trả `RESOURCE_IN_USE`; client đề xuất archive.

## 10. Jobs và health

### `GET /jobs/{id}`

Chỉ owner của tác vụ hoặc admin được xem. Trả `queued`, `running`, `completed`, `failed` và khả năng retry.

### `POST /jobs/{id}/retry`

Chỉ cho retry loại lỗi được đánh dấu retryable.

### `GET /health`

Trả health tổng quát không chứa secret. Endpoint chi tiết dành cho admin có database, storage và provider configuration status.

## 11. HTTP status và error codes

| Status | Trường hợp |
|---:|---|
| 200/201 | Thành công đồng bộ |
| 202 | Tác vụ đã được nhận và xử lý nền |
| 400 | Payload/format không hợp lệ |
| 401/403 | Chưa xác thực/không có quyền |
| 404 | Resource không tồn tại hoặc không nhìn thấy |
| 409 | Version conflict, duplicate idempotency hoặc state conflict |
| 422 | Dữ liệu đúng schema nhưng không đạt rule nghiệp vụ |
| 429 | Rate limit |
| 503 | Provider hoặc dependency tạm thời unavailable |

Mã lỗi ổn định gồm `VALIDATION_ERROR`, `INVALID_STATE_TRANSITION`, `CONTENT_VALIDATION_FAILED`, `AI_PROVIDER_UNAVAILABLE`, `EVALUATION_PENDING`, `RESOURCE_IN_USE` và `VERSION_CONFLICT`.

## 12. Versioning contract

- Breaking API change yêu cầu `/v2` hoặc migration được công bố.
- Activity payload thêm field theo hướng backward-compatible.
- `formatVersion` của content import độc lập với API version.
- Rubric, parser và lesson version phải được lưu trong kết quả liên quan để tái hiện quyết định.
