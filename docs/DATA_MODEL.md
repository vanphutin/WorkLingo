# Data Model

## 1. Quy ước

- Primary key dùng UUID.
- Mọi bảng thay đổi được có `created_at`, `updated_at`.
- Nội dung published dùng version record bất biến.
- Timestamp lưu UTC; timezone chỉ dùng khi hiển thị/lập lịch theo người dùng.
- Trạng thái dùng enum có migration rõ ràng hoặc lookup table khi cần mở rộng động.

## 2. Curriculum và content

### learning_paths

| Field | Ý nghĩa |
|---|---|
| id | Định danh |
| slug, name | Tên ổn định và tên hiển thị |
| status | draft/published/archived |

### levels

Thuộc một path; có `code`, `cefr_reference`, thứ tự, mô tả và progression policy.

### missions

Thuộc level; mô tả tình huống công việc, mục tiêu, kết quả mong đợi và thứ tự.

### lessons

Định danh logic của bài học. `current_published_version_id` trỏ tới snapshot hiện hành; nội dung
thực tế nằm ở `lesson_versions`.

### lesson_versions

| Field | Ý nghĩa |
|---|---|
| lesson_id, version | Khóa phiên bản |
| status | draft/published/archived |
| source_hash | Hash của source đã tạo snapshot |
| parsed_content | Snapshot cấu trúc đã chuẩn hóa |
| published_at | Thời điểm publish |

Published version không sửa tại chỗ.

### word_bank_versions và language_block_versions

`WordBankVersion` được nhận diện bởi `word_bank_id + version` và deduplicate bằng canonical
`source_hash`. `LanguageBlockVersion` thuộc đúng Word Bank version. Cả hai loại version là bất biến;
`LessonVersionWordBank` giữ đồng thời logical Word Bank ID và version ID để snapshot cũ không đổi.

### content_blocks

Các phần email, article, chat, report, dialogue hoặc listening script. Có loại, thứ tự, content và metadata độ khó.

### word_banks

Chủ đề từ vựng có thể liên kết nhiều mission/lesson qua join tables.

### language_blocks

| Field | Ý nghĩa |
|---|---|
| canonical_form | Cụm/từ chuẩn |
| meaning | Nghĩa theo ngữ cảnh |
| pronunciation | IPA hoặc metadata phát âm |
| collocations | Dữ liệu có cấu trúc |
| grammar_pattern | Mẫu ngữ pháp liên quan |
| examples | Ví dụ được duyệt |
| common_errors | Lỗi phổ biến |
| cefr_level | Level tham chiếu |

### activities

Thuộc lesson version và learning block. `type` xác định payload schema: reading, listening, choice, ordering, short_answer, speaking, writing hoặc reflection.

### questions và rubrics

Question lưu prompt, answer specification, explanation và evidence references. Rubric có version và criteria; submission luôn tham chiếu đúng rubric version.

## 3. Users và enrollment

### users

Thông tin xác thực tối thiểu, role và trạng thái tài khoản.

### learner_profiles

Mục tiêu, locale, timezone, assistance language, preferences và recording consent.

### enrollments

Liên kết learner với path/level hiện tại, trạng thái và ngày bắt đầu.

### placement_attempts

Lưu lựa chọn tự đánh giá hoặc bài test, score theo kỹ năng, level đề xuất và quyết định cuối của learner.

## 4. Session và submission

### learning_sessions

| Field | Ý nghĩa |
|---|---|
| learner_id | Người học |
| client_session_id | Idempotency key; unique cùng learner |
| duration_minutes | 60 trong increment đầu tiên; mở rộng 45/90/120/150 sau |
| lesson_version_id | Snapshot nội dung |
| plan_snapshot | Kế hoạch block/activity bất biến |
| status | planned/in_progress/paused/completed/abandoned |
| current_checkpoint | Chỉ số zero-based của activity kế tiếp; vị trí resume |
| started/completed_at | Thời gian |

### session_blocks

Mỗi block có loại, thứ tự, thời lượng mục tiêu và trạng thái.

### activity_attempts

Mỗi lần learner nộp activity, gồm `client_attempt_id` (idempotency key theo learner), raw response,
normalized response, trạng thái chấm, điểm và feedback summary. Attempt tham chiếu đồng thời session,
learner và activity để ownership được kiểm tra ở cả tầng ứng dụng và ràng buộc dữ liệu.

### recordings

Metadata file, consent scope, provider processing status, retention deadline và deleted timestamp. Không lưu secret/provider token.

### evaluation_results

Lưu kết quả deterministic/AI, provider, model/config, rubric version, score dimensions, feedback và raw response đã redacted khi cần audit.

## 5. Mastery và review

### mastery_records

Khóa logic duy nhất: `learner_id + language_block_id + skill`.
Lưu trữ trạng thái thành thạo hiện tại của learner đối với từng Language Block riêng biệt cho 4 kỹ năng (`reading`, `listening`, `speaking`, `writing`), ổn định qua các phiên bản `LessonVersion`.

| Field | Kiểu | Ý nghĩa & Ràng buộc |
|---|---|---|
| id | UUID | Khóa chính |
| learner_id | UUID | Tham chiếu `User(id)` (CASCADE) |
| language_block_id | UUID | Tham chiếu `LanguageBlock(id)` (RESTRICT) |
| skill | ActivityType | `reading`, `listening`, `speaking`, `writing` |
| state | MasteryState | `NEW`, `LEARNING`, `REVIEW_DUE`, `STABLE`, `NEEDS_ATTENTION` |
| score | Float | Điểm thành thạo ước lượng: 0.0 – 1.0 |
| confidence | Float | Độ tin cậy ước lượng: 0.0 – 1.0 |
| interval_days | Float | Khoảng cách giãn cách hiện tại (> 0 ngày) |
| last_evidence_at | Timestamp | Thời điểm bằng chứng gần nhất |
| next_review_at | Timestamp | Lịch đến hạn ôn tiếp theo |
| last_lesson_version_id | UUID | Tham chiếu `LessonVersion(id)` gần nhất chứa bằng chứng |
| created_at, updated_at | Timestamp | Thời gian tạo và cập nhật |

Indexes:
- Unique: `(learner_id, language_block_id, skill)`
- `(learner_id, state, next_review_at)`
- `(learner_id, skill)`
- `(language_block_id)`
- `(next_review_at)`

### mastery_events

Event append-only ghi nhận từng bằng chứng thành thạo từ `ActivityAttempt` đã đánh giá. Đảm bảo tính bất biến và truy vết ngược về đúng `LessonVersion`.
Chỉ attempt ở trạng thái `EVALUATED` với điểm số mới tạo event và cập nhật record. Bài nói/viết mới nộp (`SUBMITTED`, chưa chấm) không được cộng điểm mastery. Trigger PostgreSQL chặn sửa/xóa event trực tiếp; xóa learner vẫn xóa dữ liệu liên quan theo cascade.

| Field | Kiểu | Ý nghĩa & Ràng buộc |
|---|---|---|
| id | UUID | Khóa chính |
| learner_id | UUID | Tham chiếu `User(id)` |
| attempt_id | UUID | Tham chiếu `ActivityAttempt(id)` |
| language_block_id | UUID | Tham chiếu `LanguageBlock(id)` |
| skill | ActivityType | Kỹ năng liên quan |
| lesson_version_id | UUID | Phiên bản bài học tại thời điểm sinh bằng chứng |
| mastery_record_id | UUID | Tham chiếu `MasteryRecord(id)` liên quan (tùy chọn) |
| event_type | MasteryEventType | Task 13 phát sinh `CORRECT_RECALL` hoặc `INCORRECT_ATTEMPT`; `ASSISTED_RECALL` và `SUBMISSION_RECORDED` được giữ trong enum cho các bước sau, chưa phát sinh ở luồng hiện tại |
| score | Float | Điểm số của lần thử (0.0 – 1.0) |
| metadata | JSONB | Chi tiết ngữ cảnh, câu hỏi hoặc thông tin phụ |
| created_at | Timestamp | Thời điểm ghi nhận sự kiện |

Ràng buộc Idempotency:
- Unique: `(attempt_id, language_block_id, skill)` ngăn chặn nhân bản event khi retry.
- Ghi event và cập nhật record trong cùng transaction, có khóa theo learner/block/skill để retry hoặc các attempt đồng thời không cộng điểm lặp, không mất tiến độ.
- Migration backfill tạo `LanguageBlock` ổn định từ `LanguageBlockVersion` của bài đã publish trước Increment 3; publish mới tái sử dụng cùng ID block qua các phiên bản bài học.

### error_bank_entries

Mô hình lưu vết sai sót (`ErrorBankEntry`) được liên kết 1:1 với `MasteryEvent` có `eventType = INCORRECT_ATTEMPT`.
Chỉ những lần làm bài đã được đánh giá (`EVALUATED`) có `score < 0.7` mới sinh bản ghi Error Bank. Các bài nộp mới nộp (`SUBMITTED`), chưa chấm điểm (`score === null`), hoặc đạt yêu cầu (`score >= 0.7`) tuyệt đối không sinh bản ghi vào Error Bank.

| Field | Kiểu | Ý nghĩa & Ràng buộc |
|---|---|---|
| id | UUID | Khóa chính |
| learnerId | UUID | Tham chiếu `User(id)`, cascade on delete |
| masteryEventId | UUID | Unique, tham chiếu `MasteryEvent(id)`, cascade on delete |
| languageBlockId | UUID | Tham chiếu `LanguageBlock(id)`, restrict on delete |
| skill | ActivityType | Kỹ năng liên quan (`reading`, `listening`, `speaking`, `writing`) |
| errorType | ErrorType | Loại lỗi: `ACTIVITY_INCORRECT` (phân loại trung thực theo mức độ hoạt động) |
| evidenceGranularity | EvidenceGranularity | Mức chi tiết bằng chứng: `ACTIVITY` (không tự suy diễn lỗi ngữ pháp/phát âm sớm) |
| lessonVersionId | UUID | Tham chiếu `LessonVersion(id)`, restrict on delete |
| activityId | UUID | Tham chiếu `Activity(id)`, restrict on delete |
| activitySlug | Text | Slug của activity tại thời điểm làm bài |
| contextKey | Text | Khóa ngữ cảnh bền vững: `${lessonId}:${activitySlug}` qua các version bài học |
| occurredAt | Timestamp | Thời điểm phát sinh lỗi (đồng bộ từ MasteryEvent) |
| createdAt | Timestamp | Thời điểm tạo |
| updatedAt | Timestamp | Thời điểm cập nhật |

Đặc tính kỹ thuật:
- **Nguyên tử & Idempotency:** Lưu cùng transaction với `MasteryEvent`. Ràng buộc unique trên `masteryEventId` đảm bảo retry không tạo trùng lặp bản ghi.
- **Backfill & Idempotency:** Migration chèn các sự kiện `INCORRECT_ATTEMPT` lịch sử; service có hàm đối soát chạy thủ công khi cần. Cả hai đều bỏ qua `masteryEventId` đã có.
- **Nguồn ngữ cảnh:** `activityId`, `activitySlug` và `lessonId` được đọc từ `ActivityAttempt` đã lưu, không tin metadata do caller truyền vào. `occurredAt` bằng `MasteryEvent.createdAt`.
- **Grouped Aggregation:** Truy vấn tổng hợp theo nhóm `(learnerId, languageBlockId, skill, errorType, evidenceGranularity, contextKey)` trả về: `occurrenceCount`, `firstOccurredAt`, `lastOccurredAt`, và `lessonVersionId` mới nhất, kèm thông tin canonical form từ Language Block. Sắp xếp ổn định (`lastOccurredAt DESC, id ASC`).
- **Data Isolation & Leak Protection:** API bảo vệ nghiêm ngặt quyền riêng tư, cách ly hoàn toàn theo learner và không làm lộ câu trả lời thô hay provider internals.

### review_items

Mô hình hàng đợi ôn tập được scheduler tính toán tất định theo `next_review_at`, ưu tiên `NEEDS_ATTENTION` và các mục quá hạn; có bộ lọc theo kỹ năng. Cân đối bốn kỹ năng và chọn ngữ cảnh chuyển giao thuộc các task sau.

## 6. Progression và assessment

### assessments

Định nghĩa placement, checkpoint hoặc gateway assessment.

### assessment_attempts

Lưu kết quả từng kỹ năng, overall summary và quyết định pass/fail. Pass yêu cầu ngưỡng từng kỹ năng theo policy version.

### progression_events

Audit các lần mở khóa, đề xuất học củng cố và chuyển level.

## 7. Import, jobs và audit

### content_imports

Authoring record có `raw_source`, `source_hash`, `draft_revision`, `parser_version`, parsed AST,
normalized preview, validation report/hash, actor tạo/cập nhật và trạng thái
`DRAFT/VALIDATED/PUBLISHED/ARCHIVED`. Record published/archived không được sửa hoặc validate lại.

### audio_artifacts và lesson_version_audio_artifacts

Artifact fake-TTS lưu script hash, adapter/voice config, MIME, checksum, byte size, server-generated
storage key và trạng thái `MISSING/GENERATING/READY/FAILED/STALE`. Join record gắn artifact `READY`
vào immutable lesson version; không nhận storage path từ client.

### jobs

Increment 2 lưu job fake-audio tối thiểu với type, trạng thái `PENDING/RUNNING/COMPLETED/FAILED`,
payload/result, lỗi, Content Import và actor tạo.

### mutation_receipts

Khóa duy nhất `actor_id + operation + idempotency_key`, request hash và response đã commit. Receipt
nằm cùng transaction publish để retry hoặc request đồng thời không tạo thêm version.

### audit_logs

Actor, action, resource, metadata an toàn và timestamp cho thao tác admin quan trọng.

## 8. Quan hệ tổng quát

```text
LearningPath 1─* Level 1─* Mission *─* Lesson
Lesson 1─* LessonVersion 1─* Activity
LessonVersion *─* WordBank 1─* LanguageBlock

User 1─1 LearnerProfile
User 1─* Enrollment
User 1─* LearningSession 1─* ActivityAttempt

User *─* LanguageBlock through MasteryRecord
ActivityAttempt 1─* MasteryEvent
MasteryEvent *─1 MasteryRecord
```

## 9. Invariants

1. Published lesson version không được sửa.
2. Session plan phải tham chiếu content/rubric version tồn tại.
3. Completed activity attempt không bị ghi đè; retry tạo attempt mới.
4. Mastery update phải truy vết được về evidence event.
5. Gateway pass phải thỏa ngưỡng từng kỹ năng của policy version.
6. Xóa recording không xóa kết quả mastery tổng hợp nhưng phải xóa file và đánh dấu metadata.
7. Archive content không làm hỏng session hoặc lịch sử đã tồn tại.
8. Chỉ có một `PUBLISHED` LessonVersion cho mỗi logical Lesson; publish N+1 archive N và đổi pointer
   trong cùng transaction.
9. `LearningSession.lesson_version_id` và `plan_snapshot` không được đổi khi publish version mới.

## 10. Indexes ban đầu

### Trạng thái triển khai — Foundation slice, Task 4

Các entity curriculum đã có schema Prisma và migration PostgreSQL. Quan hệ
Mission–Lesson và LessonVersion–WordBank dùng bảng liên kết; foreign key có
index riêng hoặc được bao phủ bởi unique key. Activity có `activityType`,
learning block, skill coverage và payload JSON được kiểm tra bằng Zod khi seed.

`LessonVersion.parsedContent` lưu snapshot đầy đủ, gồm cả metadata của Word Bank
và Language Blocks. Nội dung published và các bản ghi con trực tiếp được bảo vệ
bằng database trigger. Thay đổi Word Bank dùng chung không đổi snapshot cũ.
Chi tiết seed, contract nội bộ và giới hạn hiện tại ở [CURRICULUM.md](CURRICULUM.md).

- `review_items(learner_id, due_at, priority)`.
- `mastery_records(learner_id, state, next_review_at)`.
- `learning_sessions(learner_id, status, updated_at)`.
- `jobs(status, available_at)` và unique `idempotency_key` khi có.
- `lesson_versions(lesson_id, version)` unique.
- Full-text index cho admin search chỉ thêm khi có nhu cầu thực tế.
