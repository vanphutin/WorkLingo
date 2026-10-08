# API Contracts

## Increment 3 adaptive learner endpoints

All endpoints require authentication and use the authenticated learner ID.

- `GET /api/v1/learning-sessions/availability`: selected mission/version, supported durations 45/60/90/120/150, content-backed available durations and default 60. Creation reruns selection because publishing/evidence can change; a 422 response includes `availableDurations`.
- `GET /api/v1/me/mastery-map`: current published curriculum Language Blocks with independent reading/listening/speaking/writing evidence. A null skill means unassessed, not zero. `reviewQueue` contains stable block ID, skill, `priorityReason` and review date.
- `GET /api/v1/me/progression`: persisted current level, immediate available next level, assessable completed session, prerequisite reasons and latest assessment.
- `POST /api/v1/me/checkpoint-assessments`: only `{ sessionId, clientAssessmentId }` UUIDs are accepted. Reads server evidence and the immutable session version. Same UUID/session replays the same snapshot; conflicting reuse returns 409. Incomplete/wrong-level sessions return 409, foreign session returns 404.
- `POST /api/v1/me/checkpoint-assessments/{id}/confirm`: confirms a passed four-skill checkpoint transactionally. Does not skip an unpublished intermediate level; duplicate confirmation is idempotent and stale requests cannot downgrade.

Checkpoint policy `workplace-checkpoint-v1` requires >=0.7 independently per skill, evaluated coverage of required blocks and completion of published missions. The first evaluated attempt of each checkpoint activity is used; correct retries do not erase weak first evidence. Unscored submissions keep `pending_evaluation`; known weak evidence still produces reinforcement actions. No speaking/writing score is inferred from saved text. A new request UUID creates a new assessment after real evaluation arrives, preserving old snapshots.

Assessment states are `pending_evaluation`, `reinforcement_required`, `not_ready` (curriculum/mission prerequisites incomplete), and `passed`. Prerequisite reasons and reinforcement actions are returned separately. Passing does not change the level: learner confirmation is required, and the immediate next level must have published playable content. The server rechecks prerequisites when confirming.

Session plans may include `reviewSelections: [{ reviewItemId, activityId, transferred }]`. IDs must refer to included reviews/planned activities. Transfer requires a different document context fingerprint, stable block and matching skill; same-context fallback is explicitly false.

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

Trong Increment 3 (Task 15), hệ thống hỗ trợ chính xác các mốc: **45, 60, 90, 120, 150 phút** (mặc định 60 phút nếu bỏ trống).
- Mỗi block có thời lượng cố định 15 phút (`targetMinutes = 15`), tổng `targetMinutes` bằng `durationMinutes`.
- Toàn bộ 4 kỹ năng (nghe, nói, đọc, viết) được bao phủ trong mọi phiên học.
- Chuỗi block canonical:
  - 45 phút (3 blocks): `readDecode` (15m, Đọc), `listenReason` (15m, Nghe), `respond` (15m, Nói + Viết).
  - 60 phút (4 blocks): `activate`, `readDecode`, `listenReason`, `respond`.
  - 90 phút (6 blocks): `activate`, `readDecode`, `listenReason`, `readDecode`, `listenReason`, `respond`.
  - 120 phút (8 blocks): `activate`, `readDecode`, `listenReason`, `respond`, `activate`, `readDecode`, `listenReason`, `respond`.
  - 150 phút (10 blocks): `activate`, `readDecode`, `listenReason`, `respond`, `activate`, `readDecode`, `listenReason`, `readDecode`, `listenReason`, `respond`.
- Mọi activity trong session plan là duy nhất (không nhân bản hay lặp activity).
- Tích hợp ReviewScheduler: ưu tiên các mục `NEEDS_ATTENTION` hoặc đến hạn có LanguageBlock tương ứng trong `LessonVersion` **và** cùng kỹ năng với activity; chỉ lưu ID của các mục khớp vào `reviewItemIds` trong `planSnapshot` để phục vụ truy vết.
- Khi thời lượng không hợp lệ (không thuộc 45, 60, 90, 120, 150), server trả `422 INVALID_SESSION_DURATION`.
- Khi bài học đã publish không có đủ nội dung/hoạt động độc lập cho thời lượng yêu cầu, server trả `422 INSUFFICIENT_CONTENT_FOR_DURATION` kèm trường `availableDurations: number[]` (danh sách thời lượng thực tế khả dụng).
- `clientSessionId` là idempotency key theo learner; gửi lại cùng key trả về phiên đã tạo thay vì tạo bản ghi mới.


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
toàn bộ đáp án đúng checkpoint mới tăng. Writing được lưu trước với trạng thái `queued`, enqueue
`EVALUATE_ATTEMPT`, rồi chuyển bước mà không bịa điểm trong lúc chờ. Speaking text fallback được lưu
như luyện tập không chấm điểm. Session response
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
  "recordingId": "uuid",
  "jobId": "uuid",
  "status": "processing"
}
```

### `GET /attempts/{attemptId}/evaluation`

```json
{
  "attemptId": "uuid",
  "status": "evaluated",
  "transcript": "Hello, I am Lan from support.",
  "scores": {
    "taskCompletion": 0.82,
    "meaningAndLogic": 0.78,
    "targetLanguage": 0.85,
    "clarity": 0.8,
    "pronunciationOrFluency": 0.74
  },
  "score": 0.8,
  "feedback": {
    "summary": "...",
    "strengths": ["..."],
    "improvements": ["..."],
    "correctedExample": "..."
  },
  "recording": { "id": "uuid", "retentionUntil": "ISO-8601", "deletedAt": null },
  "retryable": false
}
```

Trạng thái là `queued | processing | evaluated | evaluation_failed`. Chỉ failure terminal có source
còn giữ và job cho phép retry mới trả `retryable: true`. Retry dùng
`POST /attempts/{attemptId}/evaluation/retry`; không yêu cầu upload lại nếu recording còn retention.
`DELETE /recordings/{recordingId}` xóa audio sớm, hủy retry đang chờ và trả 204 idempotently.

Writing autosave dùng `GET/PUT/DELETE /learning-sessions/{sessionId}/activities/{activityId}/draft`.
PUT nhận `expectedRevision` và trả `DRAFT_REVISION_CONFLICT` nếu client cũ. Audio Listening dùng
`GET /learning-sessions/{sessionId}/activities/{activityId}/audio`; server chỉ stream artifact READY
của đúng `LessonVersion` đã khóa trong session.

## 7. Progress và mastery

### `GET /me/mastery`

Filter theo skill, state, Word Bank hoặc level.

### `GET /me/reviews/due`

Trả số item đến hạn, lý do ưu tiên và thời lượng ôn ước tính.

### `GET /me/error-bank`

Yêu cầu xác thực bằng session cookie theo cơ chế đăng nhập hiện tại. Trả danh sách các điểm sai sót được tổng hợp theo nhóm của chính learner đã xác thực.

Query parameters:
- `skill` (tùy chọn): Lọc theo `reading | listening | speaking | writing`.
- `page` (tùy chọn, mặc định: 1, tối thiểu: 1).
- `limit` (tùy chọn, mặc định: 20, tối đa: 100).

Sắp xếp ổn định: `lastOccurredAt DESC, id ASC`. Tuyệt đối không để lộ câu trả lời riêng tư (`rawResponse`, `normalizedResponse`) hoặc database/provider internals.

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "languageBlockId": "uuid",
      "languageBlockSlug": "my-name-is",
      "canonicalForm": "My name is ...",
      "skill": "reading",
      "errorType": "ACTIVITY_INCORRECT",
      "evidenceGranularity": "ACTIVITY",
      "contextKey": "lesson-uuid:greeting-activity",
      "activityId": "uuid",
      "activitySlug": "greeting-activity",
      "occurrenceCount": 2,
      "firstOccurredAt": "2026-10-06T12:00:00.000Z",
      "lastOccurredAt": "2026-10-06T13:00:00.000Z",
      "lessonVersionId": "uuid"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### `GET /me/memory-health`

Yêu cầu xác thực bằng session cookie theo cơ chế đăng nhập hiện tại. Trả về chỉ số sức khỏe trí nhớ tính toán tất định theo heuristic v1 cho từng kỹ năng và tổng thể.

Heuristic formula v1:
- `base = Math.round(100 * (0.7 * score + 0.3 * confidence))`
- `overdueDays = Math.max(0, Math.floor(overdueMs / 86400000))` (ngày quá hạn trọn vẹn sau `nextReviewAt`)
- `penalty = Math.min(40, overdueDays * 5)`
- `health = Math.min(100, Math.max(0, base - penalty))`
- Nếu `state === 'NEEDS_ATTENTION'`: `health = Math.min(40, health)`
- Chỉ tính `MasteryRecord` có `lastEvidenceAt`; record `NEW` chưa có bằng chứng không được tính vào các chỉ số.
- **Kỹ năng chưa được chấm/đánh giá:** Bắt buộc trả `health: null` (không được trả 0).

Response `200`:
```json
{
  "reading": {
    "health": 71,
    "evaluatedBlocksCount": 2,
    "dueCount": 0,
    "needsAttentionCount": 0
  },
  "listening": {
    "health": 40,
    "evaluatedBlocksCount": 1,
    "dueCount": 1,
    "needsAttentionCount": 1
  },
  "speaking": {
    "health": null,
    "evaluatedBlocksCount": 0,
    "dueCount": 0,
    "needsAttentionCount": 0
  },
  "writing": {
    "health": null,
    "evaluatedBlocksCount": 0,
    "dueCount": 0,
    "needsAttentionCount": 0
  },
  "overall": {
    "health": 61,
    "evaluatedBlocksCount": 3,
    "dueCount": 1,
    "needsAttentionCount": 1
  }
}
```

### `GET /me/progress`

Trả level, mission progress, skill summaries và evidence highlights.

## 8. Admin content import

Tất cả endpoint trong phần này chỉ dành cho `CONTENT_ADMIN` hoặc `SYSTEM_ADMIN`.

### `POST /admin/content-imports`

```json
{
  "rawSource": "FORMAT: WorkLingoLesson/1.0\n\n[LESSON]\n..."
}
```

Tạo `ContentImport` trạng thái `DRAFT`, lưu nguyên văn source và trả `draftRevision`, `sourceHash`,
`parserVersion`. Danh sách và chi tiết dùng `GET /admin/content-imports` và
`GET /admin/content-imports/{id}`.

### `PATCH /admin/content-imports/{id}/source`

```json
{
  "rawSource": "FORMAT: WorkLingoLesson/1.0\n...",
  "expectedDraftRevision": 3
}
```

Optimistic concurrency: revision sai trả `DRAFT_REVISION_CONFLICT`. Source đã publish/archive là
bất biến và trả `VERSION_ALREADY_PUBLISHED`.

### `POST /admin/content-imports/{id}/validate`

```json
{ "expectedDraftRevision": 4 }
```

Trả `canPublish`, `issues`, `issuesTruncated`, revision và hash. Issue có `severity`, stable code và
half-open range `start/end` gồm `line`, `column`, `offset`. Lỗi parse/semantic trả 422 với
`CONTENT_PARSE_FAILED` hoặc `CONTENT_VALIDATION_FAILED`; warning không chặn publish.

### `GET /admin/content-imports/{id}/preview`

Trả normalized lesson draft từ backend, validation issues và `canPublish`.

### `POST /admin/content-imports/{id}/generate-audio`

```json
{
  "audioScriptSlug": "complaint-call",
  "idempotencyKey": "uuid-or-client-operation-key",
  "voiceConfig": {}
}
```

Trả 202 với `jobId`. `GET /jobs/{id}` dùng để poll theo trạng thái; endpoint job trong Increment 2
cũng chỉ dành cho Admin. `GET /admin/content-imports/{id}/audio` liệt kê artifact và
`GET /admin/audio-artifacts/{id}/content` stream file đã được authorize. Fake output luôn có nhãn
`Audio mô phỏng — chưa phải giọng đọc phát hành`.

### `POST /admin/content-imports/{id}/publish`

Yêu cầu validation/hash còn mới và mọi audio được tham chiếu ở trạng thái `READY` với script hash
hiện tại.

```json
{
  "expectedDraftRevision": 4,
  "expectedSourceHash": "sha256-hex",
  "idempotencyKey": "uuid-or-client-operation-key"
}
```

Response trả `lessonId`, `lessonVersionId`, version và `publishedAt`. Publish đồng thời cùng key trả
cùng response; key khác trên cùng draft chỉ cho một request thành công. Archive dùng
`POST /admin/lesson-versions/{id}/archive`; thao tác này idempotent và xóa con trỏ current nếu archive phiên bản đang phát hành. Không có hard-delete endpoint.

## 9. Admin curriculum

- `GET/POST /admin/learning-paths`
- `GET/PATCH /admin/levels/{id}`
- `GET/POST /admin/missions`
- `GET/PATCH /admin/word-banks/{id}`
- `GET/PATCH /admin/language-blocks/{id}`

Xóa resource đã được sử dụng trả `RESOURCE_IN_USE`; client đề xuất archive.

## 10. Jobs và health

### `GET /jobs/{id}`

Trong Increment 2 chỉ Admin được xem. Trả `PENDING`, `RUNNING`, `COMPLETED` hoặc `FAILED` cho job
fake-audio cục bộ.

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
