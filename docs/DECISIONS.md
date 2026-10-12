# Architecture and Product Decisions

## D-022 — Increment 3 evidence and progression policy

- **Status:** Accepted for local Increment 3; scoring calibration remains a pilot prerequisite.
- **Decision:** Use document type plus whitespace-normalized text fingerprints for review transfer. Stable Language Block ID and matching skill are required. Explicit same-context fallback preserves review opportunities when content is limited.
- **Decision:** Checkpoint policy `workplace-checkpoint-v1` evaluates a completed mission session against immutable content and first evaluated activity attempts, then checks all required curriculum blocks and mission completion. Threshold is 0.7 separately per skill; it is an initial versioned policy, not a calibrated CEFR/B2 certification.
- **Decision:** Pending/null speaking/writing scores prevent advancement. Missing or weak evidence produces a concrete reinforcement action; assessments are append-only and have idempotent request UUIDs.
- **Decision:** Confirming advancement is an explicit learner action, serialized against their persisted current level. Only the immediate next level with published four-skill content is eligible.
- **Review clarification:** Every required published mission at the target must form at least one canonical session according to the same duration planner. Four skill labels alone do not prove playability. Confirmation also rechecks current required missions and block scores, without rewriting the passed snapshot.
- **Consequence:** Increment 3 supplies the full gate/UI/data workflow. Increment 4 supplies genuine evaluated speaking/writing evidence; no fake score is introduced to make the local demo pass.

Tài liệu này ghi các quyết định đã chốt. Mỗi quyết định mới nên thêm một mục thay vì sửa lịch sử; nếu bị thay thế, ghi rõ quyết định kế nhiệm.

## D-001 — English for Work là định vị cốt lõi

- **Trạng thái:** Accepted
- **Ngày:** 2026-10-04
- **Quyết định:** WorkLingo tối ưu cho khả năng hiểu và giao tiếp trong công việc. TOEIC/IELTS là lộ trình sau nền tảng, không phải lõi MVP.
- **Lý do:** Mục tiêu người dùng là làm việc bằng tiếng Anh, không chỉ đạt điểm thi.
- **Hệ quả:** Nội dung được tổ chức thành Workplace Missions và sản phẩm đánh giá khả năng vận dụng.

## D-002 — Học theo Word Bank và Language Block

- **Trạng thái:** Accepted
- **Quyết định:** Không dạy từ đơn lẻ. Đơn vị học bao gồm cụm từ, collocation, mẫu ngữ pháp, phát âm và ngữ cảnh.
- **Lý do:** Người học cần chuyển kiến thức sang nghe, nói, đọc và viết.

## D-003 — Workplace Mission là trải nghiệm trung tâm

- **Trạng thái:** Accepted
- **Quyết định:** Mỗi bài học xoay quanh một vấn đề công việc có đầu vào đọc/nghe và đầu ra nói/viết.
- **Các phương án không chọn:** flashcard-first; bài đọc/luyện đề làm trung tâm.
- **Lý do:** Mission kết nối bốn kỹ năng và tạo mục tiêu thực tế.

## D-004 — Mọi session có đủ bốn kỹ năng

- **Trạng thái:** Accepted
- **Quyết định:** 45–150 phút đều có nghe, nói, đọc và viết. Thời lượng thay đổi độ sâu, không loại bỏ kỹ năng.
- **Hệ quả:** Session planner phải validate skill coverage.

## D-005 — 60 phút là session mặc định

- **Trạng thái:** Accepted
- **Quyết định:** Dùng block 15 phút; 60 phút gồm Activate, Read & Decode, Listen & Reason, Respond.
- **Lý do:** Đủ sâu cho một vòng học hoàn chỉnh và có thể co giãn.

## D-006 — Mastery theo kỹ năng và tái sử dụng ngữ cảnh

- **Trạng thái:** Accepted
- **Quyết định:** Theo dõi mastery từng Language Block riêng cho bốn kỹ năng; dùng spaced repetition, active recall, interleaving, context transfer và error recycling.
- **Lý do:** Hoàn thành một câu hỏi không chứng minh khả năng sử dụng lâu dài.

## D-007 — Tiến bộ là động lực chính

- **Trạng thái:** Accepted
- **Quyết định:** Mastery Map, Memory Health, Error Bank và evidence of progress là cơ chế giữ chân chính. XP, badge và streak chỉ hỗ trợ.
- **Lý do:** Tránh động lực ngắn hạn và áp lực không lành mạnh.

## D-008 — Xếp lớp linh hoạt, gateway nghiêm ngặt

- **Trạng thái:** Accepted
- **Quyết định:** Người mới có thể tự chọn level hoặc làm placement test. Chuyển level quan trọng và vào track TOEIC/IELTS yêu cầu ngưỡng từng kỹ năng; chứng chỉ bên ngoài không thay thế assessment nội bộ.

## D-009 — Nội dung do admin sở hữu

- **Trạng thái:** Accepted
- **Quyết định:** Admin nhập một lesson hoàn chỉnh bằng structured text; hệ thống parse, validate, preview và version trước khi publish.
- **Lý do:** Giữ chất lượng và khả năng kiểm soát; AI không tự ý tạo curriculum.

## D-010 — Teacher AI có phạm vi giới hạn

- **Trạng thái:** Accepted
- **Quyết định:** AI đánh giá và phản hồi theo rubric, level và nội dung đã duyệt. Foundation ưu tiên shadowing; level cao dần chuyển sang tóm tắt và hội thoại.
- **Hệ quả:** Kết quả lưu provider/config/rubric version và phải xử lý bất đồng bộ khi cần.

## D-011 — Responsive web, desktop là trải nghiệm tốt nhất

- **Trạng thái:** Accepted
- **Quyết định:** Một web app responsive phục vụ desktop và mobile. Chưa xây mobile native.
- **Lý do:** Tập trung nguồn lực MVP trong khi vẫn hỗ trợ hai bối cảnh thiết bị.

## D-012 — NestJS modular monolith và Next.js

- **Trạng thái:** Accepted
- **Quyết định:** Next.js cho web; NestJS modular monolith cho API; PostgreSQL cho dữ liệu quan hệ.
- **Các phương án không chọn:** microservices từ đầu; hai backend riêng.
- **Lý do:** Tốc độ phát triển, TypeScript xuyên suốt và ranh giới module đủ mạnh để mở rộng.

## D-013 — Local-first infrastructure

- **Trạng thái:** Accepted
- **Quyết định:** PostgreSQL và file storage chạy local; chưa dùng AWS, S3, CDN, managed queue hoặc cloud deployment.
- **Lý do:** Hoàn thiện sản phẩm và nội dung trước khi tối ưu triển khai.
- **Hệ quả:** Storage được bọc bởi interface; có backup/restore local; cloud migration là quyết định sau.

## D-014 — External AI qua gateway

- **Trạng thái:** Accepted
- **Quyết định:** Backend gọi OpenAI-compatible API cho language evaluation và Microsoft Speech-to-Text ban đầu; TTS qua interface cấu hình được.
- **Lý do:** Tận dụng năng lực provider nhưng không để business logic phụ thuộc SDK.
- **Lưu ý:** Pricing, quota và điều khoản provider phải được xác nhận tại thời điểm tích hợp.

## D-015 — Không dùng Redis trong MVP ban đầu

- **Trạng thái:** Accepted
- **Quyết định:** Job state lưu PostgreSQL và worker chạy trong cùng codebase.
- **Lý do:** Giảm hạ tầng local khi tải chưa chứng minh cần queue riêng.
- **Điều kiện xem lại:** queue latency, throughput hoặc reliability vượt khả năng database worker.

## D-016 — Published content là bất biến

- **Trạng thái:** Accepted
- **Quyết định:** Mọi thay đổi tạo lesson version mới; session đang chạy giữ version cũ.
- **Lý do:** Bảo toàn tính nhất quán của lịch sử học và kết quả đánh giá.

## D-017 — Speech/AI failure không phá session

- **Trạng thái:** Accepted
- **Quyết định:** Lưu submission trước, xử lý AI sau, hỗ trợ retry và checkpoint.
- **Lý do:** Provider bên ngoài không đáng tin tuyệt đối.

## D-018 — MVP từ Foundation 1 đến Workplace Intermediate

- **Trạng thái:** Accepted
- **Quyết định:** MVP hoàn thiện nền tảng Pre-A1 đến B1 trước. B2, TOEIC, IELTS, chuyên ngành, payment và cloud nằm sau MVP.
- **Lý do:** Kiểm chứng learning loop trước khi mở rộng phạm vi.

## D-019 — Phân loại trung thực Error Bank & Tính nguyên tử với MasteryEvent

- **Trạng thái:** Accepted (Task 14, Increment 3)
- **Quyết định:**
  1. `MasteryEvent` loại `INCORRECT_ATTEMPT` là source of truth duy nhất phát sinh bản ghi Error Bank.
  2. Bắt buộc phân loại trung thực ở mức độ hoạt động (`evidenceGranularity: ACTIVITY`, `errorType: ACTIVITY_INCORRECT`). Tuyệt đối không tự suy diễn lỗi ngữ pháp hay phát âm khi chưa có mô hình chấm chuyên biệt.
  3. Chỉ những attempt đã `EVALUATED` với `score < 0.7` mới ghi nhận vào Error Bank. Các bài `SUBMITTED` hoặc `score === null` tuyệt đối không ghi nhận là đúng hay sai.
  4. Lưu `ErrorBankEntry` trong cùng transaction với `MasteryEvent` và `MasteryRecord`, khóa unique trên `masteryEventId` đảm bảo tính lũy thừa khi retry.
  5. Ngữ cảnh lỗi lấy từ `ActivityAttempt` đã lưu; timestamp lỗi đồng nhất với `MasteryEvent.createdAt`.
- **Lý do:** Tránh hallucination về nguyên nhân lỗi, bảo toàn tính toàn vẹn dữ liệu sư phạm và nhất quán trạng thái học tập.

## D-020 — Thuật toán tất định Memory Health v1 & Toàn vẹn kỹ năng chưa đánh giá

- **Trạng thái:** Accepted (Task 14, Increment 3)
- **Quyết định:**
  1. Tính toán sức khỏe trí nhớ hoàn toàn tất định bằng hàm thuần túy với Clock được tiêm vào (không phụ thuộc thời gian thực hoặc gọi AI).
  2. Áp dụng công thức heuristic v1 với trọng số score/confidence và mức phạt quá hạn theo ngày (`overdueDays * 5`), giới hạn trần 40 điểm khi trạng thái là `NEEDS_ATTENTION`.
  3. Kỹ năng chưa được đánh giá có điểm số (`speaking`/`writing` chưa có MasteryRecord scored) bắt buộc trả về `health: null`, tuyệt đối không giả định điểm 0 để không gây hiểu lầm cho người học.
  4. Bỏ qua `MasteryRecord` chưa có `lastEvidenceAt` khi tổng hợp để không coi record placeholder là bằng chứng đã học.
- **Lý do:** Minh bạch trong sư phạm, tin cậy trong kiểm thử và phản ánh chính xác trạng thái thực tế của người học.

## D-021 — Multi-duration Session Planner & Review Integration

- **Trạng thái:** Accepted (Task 15, Increment 3)
- **Quyết định:**
  1. Hỗ trợ chính xác 5 mốc thời lượng: 45, 60, 90, 120, 150 phút (mỗi block cố định 15 phút, thứ tự liên tiếp từ 1 đến N). 60 phút là mặc định.
  2. Phiên 45 phút gồm 3 blocks (`readDecode` 15m, `listenReason` 15m, `respond` 15m), bao phủ đầy đủ 4 kỹ năng (Nghe - Nói - Đọc - Viết).
  3. Mọi phiên học đều kết thúc bằng block `respond` (vận dụng sản sinh: Speaking/Writing).
  4. Mọi activity trong plan phải duy nhất (không trùng lặp ID qua các blocks).
  5. Tích hợp ReviewScheduler: ưu tiên các LanguageBlock đến hạn/`NEEDS_ATTENTION`, lưu `reviewItemIds` vào `planSnapshot` để truy vết. Không tạo hoạt động ảo hoặc câu hỏi hallucinated.
  6. Xử lý thiếu nội dung: Nếu `LessonVersion` không đủ hoạt động duy nhất hoặc không đủ 4 kỹ năng cho thời lượng yêu cầu, server trả 422 `INSUFFICIENT_CONTENT_FOR_DURATION` kèm mảng `availableDurations: number[]`. Tuyệt đối không lặp lại câu hỏi hay nhân bản activity để lấp thời gian.
  7. Tương thích ngược: Duy trì khả năng parse và resume các `planSnapshot` 60 phút cũ mà không cần migrate hay rewrite dữ liệu.
- **Lý do:** Đảm bảo tính linh hoạt về thời gian học tập theo FR-LEARN-001/002/003/004/007, đồng thời giữ vững nguyên tắc sư phạm và tính trung thực của dữ liệu học tập.
- **Lý do chọn chuỗi 150 phút:** Hai chu trình có `activate` và `respond` giúp nhắc lại rồi vận dụng giữa phiên, thay vì dồn ba khối vận dụng về cuối. Lịch ôn chỉ gắn với activity tham chiếu đúng LanguageBlock **và** luyện đúng kỹ năng của MasteryRecord.

## D-022 — Durable Teacher AI với fake mặc định và retention hữu hạn

- **Trạng thái:** Accepted (Increment 4)
- **Ngày:** 2026-10-08
- **Quyết định:** Speaking/writing được lưu trước, xử lý qua PostgreSQL jobs và adapter-neutral AI Gateway. Fake STT/language/TTS là mặc định local; Microsoft Speech và OpenAI-compatible chỉ bật bằng cấu hình có credential. Recording terminal giữ 7 ngày, draft bỏ dở giữ 30 ngày, learner được xóa recording sớm.
- **Lý do:** Provider không được làm mất tiến độ; local development phải chạy không cần cloud/key; dữ liệu giọng nói cần retention tối thiểu và consent rõ ràng.
- **Hệ quả:** `JOB_WORKER_ENABLED=true` là cấu hình demo local. Automatic retry giữ attempt ở `queued`; chỉ failure terminal mới thành `evaluation_failed`. Golden fake harness bảo vệ wiring nhưng không thay thế human calibration.

## D-023 — Audio seed local là artifact bất biến theo LessonVersion

- **Trạng thái:** Accepted (hardening trước Increment 5)
- **Ngày:** 2026-10-09
- **Quyết định:** Bài học seed có listening phải tạo một WAV hợp lệ bằng fake TTS, lưu qua local object storage và liên kết với `LessonVersionAudioArtifact` trước khi publish. Artifact do hệ thống seed không cần `ContentImport`; vì vậy `AudioArtifact.contentImportId` có thể null, nhưng API Content Admin không được trả các artifact hệ thống này.
- **Nâng cấp dữ liệu:** Khi nội dung seed thay đổi, hệ thống tạo version kế tiếp và archive version cũ; không sửa child record của version đã publish. Session đang chạy tiếp tục dùng version cũ theo D-016.
- **Lý do:** Learner không được nhìn thấy audio player hỏng trong dữ liệu mặc định, đồng thời local-first vẫn chạy không cần provider hoặc cloud storage.
- **Hệ quả:** Fake TTS chỉ xác nhận vòng đời và khả năng phát WAV, không đại diện chất lượng giọng đọc production. UI luôn có transcript fallback nếu file không thể phát.

## D-024 — Nguồn audio do người dùng chọn và TTS candidate bất biến

- **Trạng thái:** Accepted (audio hardening trước Increment 5)
- **Ngày:** 2026-10-10
- **Quyết định:** Learner chọn `system-default`, `published-audio` hoặc `browser-tts`; mặc định Automatic ưu tiên audio đã bind rồi mới fallback sang Browser Speech. Admin preview bằng Browser Speech không tạo artifact. Mỗi lần server TTS tạo candidate mới và publish bắt buộc chọn tường minh một candidate READY cho từng audio script.
- **Provider:** Fake TTS là mặc định local. Azure AI Speech F0 được phép như một external allowance giới hạn khi operator tự cấu hình key/region ở backend; credential không đi vào database, browser, log hoặc audit metadata.
- **Lý do:** Tách playback preference khỏi authoring provider, tránh silent source switching, giữ reproducibility của LessonVersion và cho phép mở rộng provider sau này mà không đổi UI contract.
- **Rollback:** Đổi learner về `system-default` và admin về `fake-tts`; các LessonVersion đã publish vẫn giữ audio artifact cũ, không cần migration hay ghi đè file.

## D-025 — Onboarding bắt buộc và placement evidence cách ly

- **Trạng thái:** Accepted (Increment 5A1)
- **Ngày:** 2026-10-11
- **Quyết định:** Learner mới bắt đầu ở `PENDING` và phải tự chọn một level playable hoặc hoàn thành
  placement 45 phút bốn kỹ năng. Placement dùng mission/lesson version riêng, checkpoint bền vững và
  state machine `IN_PROGRESS → PROCESSING | ACTION_REQUIRED → RECOMMENDED → CONFIRMED`. Mọi quyết
  định thay level cần confirmation UUID idempotent và transaction khóa learner profile.
- **Cách ly:** Placement attempt không được tạo mastery, Error Bank, review schedule hoặc progression
  evidence. Mọi consumer đó lọc tường minh `Mission.purpose=LEARNING`; onboarding query reconcile
  trạng thái evaluation để reload không quay lại một session đã hoàn tất.
- **Policy:** `workplace-placement-v1` cần bằng chứng evaluated riêng cho cả bốn kỹ năng và hiện chỉ
  quảng bá candidate Foundation đã publish. Recommendation là heuristic workplace local,
  **human calibration pending**, không tương đương chứng chỉ CEFR/TOEIC/IELTS.
## D-026 — Weekly mission, flexible consistency streak và evidence of progress

- **Trạng thái:** Accepted (Increment 5A2)
- **Ngày:** 2026-10-11
- **Quyết định:** Thay thế daily streak trừng phạt bằng weekly consistency streak linh hoạt và Evidence of Progress:
  1. **Weekly Mission:** Learner đặt mục tiêu 2–5 ngày học/tuần (mặc định 3). Đếm số ngày học riêng biệt trong tuần theo lịch địa phương (Monday-start).
  2. **Active-Week Target Protection:** Đổi mục tiêu khi chưa học ngày nào trong tuần hiện tại áp dụng ngay lập tức; khi đã học >= 1 ngày, mục tiêu tuần hiện tại được bảo vệ và thay đổi hoãn sang thứ Hai tuần sau (`effectiveTargetNextWeek`).
  3. **Neutral Streak Model:** Đếm số tuần liên tiếp đạt mục tiêu. Sử dụng ngôn ngữ trung tính, hoàn toàn không dùng từ ngữ gây áp lực hoặc tội lỗi ("lost", "failed", "broken streak").
  4. **Exactly-Once Session Projection:** Mọi hoàn thành learning session ghi nhận vào bảng chiếu `LearnerStudyDay` và `LearnerStudySession` với unique constraint chống double-counting trong transaction duy nhất.
  5. **Four-Skill Evidence Windows:** So sánh hai cửa sổ 28 ngày (28 ngày gần nhất so với 28 ngày trước đó). Chỉ công bố delta phần trăm khi có tối thiểu 2 mẫu đã được đánh giá cho mỗi kỹ năng; nếu không, hiển thị trung thực `Insufficient evidence`.
  6. **Placement Exclusion:** Phiên placement assessment (`purpose = 'PLACEMENT'`) bị loại trừ hoàn toàn khỏi ngày học, streak, và bằng chứng tiến bộ.
- **Lý do:** Người đi làm học tiếng Anh công sở cần sự kiên trì bền vững thay vì áp lực streak hằng ngày dẫn đến bỏ cuộc khi bận rộn; dữ liệu tiến bộ phải trung thực, không giả lập điểm số khi thiếu bằng chứng.

## D-027 — Admin curriculum hierarchy operations, playability rules, and privacy-safe audit browser

- **Trạng thái:** Accepted (Increment 5B)
- **Ngày:** 2026-10-12
- **Quyết định:**
  1. **Optimistic Revision Concurrency:** Mọi mutation cấp Path, Level, Mission và MissionLesson yêu cầu `expectedRevision` khớp chính xác với DB; mismatch trả `409 Conflict` (`CURRICULUM_REVISION_CONFLICT`).
  2. **Playability Enforcements:** Chỉ cho phép publish một Mission khi các lesson đính kèm đã `PUBLISHED`, có audio artifact đầy đủ, bao phủ 4 kỹ năng và có khả năng lập kế hoạch cho phiên học 60 phút. Level và Path chỉ được publish khi chứa con playable.
  3. **Strict Archive Blockers:** Chặn archive Path và Level nếu có học viên đang được ghi danh/đặt tại đó; chặn archive Mission nếu có learning session đang dở dang.
  4. **Idempotency Receipt Hash:** Nhận diện trùng lặp qua SHA-256 payload hash kết hợp `idempotencyKey`, trả lại cached response mà không tái thực thi mutation.
  5. **Privacy-Safe Audit Browser:** Tuyệt đối không trả về địa chỉ email của actor trong audit response; chỉ hiển thị `actorDisplayName`. Metadata được lọc bỏ toàn bộ secret, token, và nội dung học viên.

## D-028 — Privacy-safe observability and technical qualification boundary

- **Trạng thái:** Accepted (Increment 5C–5D)
- **Ngày:** 2026-10-12
- **Quyết định:** Correlation/logging/rate limits chạy local bằng PostgreSQL và HMAC; raw IP,
  credentials, learner text/audio/transcript và provider body không được persist/log. Operations là
  Admin GET-only; Pilot Analytics chỉ nhận closed server-owned dimensions, aggregate rows và
  idempotency receipts với range tối đa 180 ngày.
- **Release boundary:** Repository automation chỉ được gán `TECHNICALLY_QUALIFIED`. Trạng thái
  `CONTROLLED_PILOT_APPROVED` bắt buộc named human approvals cho Teacher AI/placement calibration,
  Foundation content và pilot operations.
- **Lý do:** Local-first vẫn cần điều tra lỗi và bằng chứng sản phẩm mà không xây kho dữ liệu người
  học hoặc biến test xanh thành tuyên bố chất lượng ngôn ngữ.

## D-029 — Program catalog là ranh giới sản phẩm phía trên curriculum

- **Trạng thái:** Accepted (IELTS Phase 1)
- **Ngày:** 2026-10-12
- **Quyết định:** Thêm `LearningProgram` làm cha bắt buộc của `LearningPath`, với bốn chương trình
  canonical Beginner, Intermediate, TOEIC và IELTS. UUID và thứ tự hiển thị được seed ổn định;
  seed không ghi đè metadata do operator quản lý.
- **Access policy:** Trạng thái catalog chỉ là dữ liệu đầu vào; server suy ra `isSelectable` và
  `destination`. Phase 1 chỉ Intermediate được mở. UI của chương trình chưa sẵn sàng là disabled,
  không tạo session và không dùng URL client để vượt policy.
- **Admin compatibility:** Tạo Path nhận `programId`; request cũ thiếu field mặc định về
  Intermediate. Program không tồn tại hoặc `DISABLED` trả 422. Program đã chọn nằm trong
  idempotency fingerprint và audit snapshot.
- **Version boundary:** Program phân loại curriculum, còn phiên học vẫn khóa vào
  `LessonVersion`; thay đổi catalog không làm biến đổi session đang học.
- **Lý do:** Cho phép xây IELTS theo từng phase mà không trộn curriculum, không quảng cáo chương
  trình chưa đủ nội dung như đã sẵn sàng, đồng thời giữ tương thích dữ liệu MVP hiện có.

## Các quyết định còn mở

Những nội dung sau cần quyết định trong implementation planning hoặc increment tương ứng:

- Cú pháp chính xác và version 1.0 của lesson import format.
- Thuật toán mastery/review ban đầu và ngưỡng calibration.
- Authentication strategy cụ thể cho local MVP.
- Bộ màu, typography và component library sau prototype UI.
- Ngưỡng quality của AI golden set trước pilot.
