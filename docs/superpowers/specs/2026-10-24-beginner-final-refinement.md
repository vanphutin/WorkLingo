# Refinement cuối — Beginner Knowledge Map và Video Library MVP

**MND-20261024-001 · 2026-10-24 · PROPOSED / CHƯA APPROVED**

Bổ sung cho [thiết kế gốc](2026-10-24-beginner-curriculum-resources-design.md). Khi khác nhau, refinement này thay thế các lựa chọn pilot, Video MVP, engagement và dependency cũ. Các nguyên tắc version/legacy/evidence không đổi. Baseline tài liệu 10d32a0, branch codex/foundation-basic-readiness. Không đọc lại repo/DB; dùng source references đã xác minh trong thiết kế gốc. Không thay Intermediate, IELTS, Foundation legacy hoặc PR18.

Một Beginner Program, hai Path, năm Stage và Unit=Mission tiếp tục là **phương án đề xuất**, không phải quyết định đã duyệt.

## 1. Knowledge Map theo Unit và Lesson

[Knowledge Map đầy đủ](2026-10-24-beginner-knowledge-map.md) có 20 Unit × 4 Learning Lesson = 80 hàng thiết kế. Mỗi hàng có:

- Mã/tên Unit, Stage, Lesson và vai trò bài.
- Grammar, pronunciation và vocabulary: **danh mục kiến thức** cần biên soạn.
- Reading, listening, speaking, writing: tác vụ học cụ thể.
- Can-do objective + điều kiện hỗ trợ + evidence bắt buộc: **mục tiêu năng lực** có thể quan sát, không chỉ “đã học present simple”.
- H = prerequisite cứng của Unit; R = thứ tự khuyến nghị giữa Lesson.

Mẫu xuyên suốt: L1 dùng cấu trúc để thực hiện tác vụ; L2 nghe/nói rõ và giữ nghĩa; L3 tích hợp từ vựng vào giao tiếp; L4 ôn/chuyển ngữ cảnh độc lập. Mỗi Learning Lesson vẫn đủ R/L/S/W khi đưa vào session planner. Trọng tâm G/P/V không làm mất bốn kỹ năng.

H áp dụng cho mọi Lesson trong Unit; R không tự trở thành hard gate. L4-first chỉ tạo evidence L4; không bỏ evidence bắt buộc của L1–L3. H viết tắt mã Unit luôn là Unit mastery đủ evidence L1–L4, không riêng bài check. Mã lesson/objective/activity trong map là mã biên tập **PLANNED**, không phải ID/bản ghi DB. Từ ví dụ là candidate lexical scope cần đối chiếu source sense đã duyệt, không khẳng định đang có sẵn toàn bộ trong kho.

## 2. Video Production Plan

[Kế hoạch video](2026-10-24-beginner-video-production-plan.md) ánh xạ mã nội dung tới toàn curriculum, gồm: topic/objective, loại video, linked Lesson, outline, bài tập đi kèm, language/caption plan, production/review state và reuse.

Ba vị trí kế hoạch/Unit:

1. G: giải thích ngữ pháp dùng trong tác vụ L1.
2. P: demo phát âm/nghe; có thể dùng chung nội dung giữa Unit phù hợp.
3. X: worked example về vocabulary/listening/speaking/reading/writing cho L3.

Code nội dung dùng tiền tố VP; **không phải Resource ID**. Nội dung tái sử dụng giữ cùng code và bổ sung linked Lessons, không đếm thành nhiều video đã sản xuất. Kế hoạch có thể gộp/bỏ slot sau review sư phạm; không phải cam kết phải làm hết video để mở chương trình.

Tất cả hiện **PLANNED / NOT_STARTED**, chưa có file/duration/checksum/resourceVersion. Pilot ưu tiên 6 vị trí MG01/MG02; không có lịch quay/ngân sách/ngày hoàn tất được bịa ra.

Ngôn ngữ đề xuất: hướng dẫn tiếng Việt, mẫu tiếng Anh; captions phản ánh lời nói thực, transcript gồm giải thích và thông tin thị giác quan trọng. Subtitle dịch là hạng mục riêng chưa sản xuất, không ghi đã có. Không cần dịch toàn bộ sang Anh để nghiệm thu pilot nếu chưa được chọn.

Production workflow đề xuất: PLANNED → SCRIPT_DRAFT → SCRIPT_REVIEWED → RECORDED → EDITED → CAPTION_REVIEW → READY_FOR_RESOURCE_REVIEW. Đây là workflow biên tập, khác resource approval/publication. Không upload placeholder vào DB để biểu diễn PLANNED.

## 3. Learning Lesson và Supplementary Resource

| Loại | Ràng buộc | Ý nghĩa hoàn tất |
| --- | --- | --- |
| Learning Lesson chính | Can-do/objectives, theory/example, R/L/S/W, assessed evidence, prerequisite và lesson version | Hoàn tất workflow không tự đồng nghĩa đạt mastery |
| Supplementary Resource | Một video ngữ pháp/phát âm/từ vựng/chiến lược, transcript/caption, quyền dùng và version | **Không cần đủ bốn kỹ năng**, không tạo lesson completion/mastery/enrollment riêng |
| Bài tập đi kèm video | Nếu tính evidence phải là Activity thật trong Lesson, có rubric/policy và version | Điểm đến từ bài làm đã đánh giá, không từ playback |

Một video chuyên đề được dùng ở nhiều Learning Lesson bằng binding; không biến nó thành Mission/Lesson chỉ để hợp thức hóa cây curriculum. Không thêm VIDEO vào ActivityType hoặc LearningSkill. Quiz minh họa trong video không tự gửi đáp án thành ActivityAttempt.

MVP learner mở resource từ Lesson đã mở khóa trong enrollment manifest **hoặc** từ session lịch sử thuộc mình. Cả hai đường phải pin đúng binding/LessonVersion và kiểm tra quyền; xem supplementary không tự khởi tạo LearningSession hoặc giả một hoạt động học. Admin preview dùng quyền riêng. Video của Lesson bị khóa không được stream chỉ bằng việc đoán resource ID.

## 4. Pilot: chọn MG01 + MG02

| Tiêu chí | MG01 + CB01 cũ | MG01 + MG02 đề xuất |
| --- | --- | --- |
| Learning progression liên tiếp | Không; nhảy Path/Stage | Có; MG01 mastery là H của MG02 |
| Entry policy phát sinh | Cần direct-entry/exemption Basic đúng nghĩa | Chỉ cần entry F0 |
| Test pending/fail → khóa → đạt → mở | Bị lẫn với policy admission | Kiểm chứng trực tiếp cùng Stage |
| Coverage hai Path | Có thể thử cả hai, nếu admission đầy đủ | Chưa chứng minh luồng Basic |
| Chi phí/phạm vi đầu tiên | Lớn hơn | Nhỏ và cô lập hơn |

**Chọn MG01 + MG02 cho pilot progression.** Tám Learning Lesson:

- MG01: L1 chào/nói tên; L2 âm/đánh vần; L3 giới thiệu ở ngữ cảnh mới; L4 ôn/unit check.
- MG02: L1 gọi tên/chỉ đồ vật (a/an, this/that, plural); L2 nghe/nói đuôi và số lượng; L3 tìm/mô tả đồ vật trong tình huống mới; L4 ôn/unit check chuyển ngữ cảnh.

Test chuẩn: entry F0 → MG01 L1–L4 → MG02 vẫn khóa khi thiếu/pending/fail evidence → đủ evaluated evidence mở MG02 → lưu/resume đúng version → MG02 mastery. Stage MG-F0 vẫn chưa hoàn tất vì MG03/MG04 và stage checkpoint chưa đủ. Không tuyên bố Pre-A1/A1 đạt chỉ vì pilot pass.

CB01 vẫn trong map, không bị bỏ Path Cơ bản; chỉ không là pilot release đầu.

### Direct-entry Basic ở đợt sau

Nếu triển khai learner Basic trước khi người học hoàn tất Mất gốc, phải có assessment riêng được duyệt:

1. Bộ task đọc/nghe/nói/viết và rubric version hóa, đúng Beginner, không dùng pipeline initializeIntermediate nguyên trạng.
2. Kết quả đủ bốn kỹ năng; pending/thiếu evidence hoặc đánh giá chưa được hiệu chuẩn → REVIEW_REQUIRED, chưa admit.
3. Admission decision bất biến có learner/program/đích, assessment version/evidence, policy/reviewer/time và các Unit/prerequisite được miễn cụ thể.
4. Manifest/enrollment tham chiếu decision; eligibility xác minh exemptions được phép. Không tạo CurriculumCompletion, MasteryEvent hay điểm giả cho Unit chưa học.
5. Chọn “tôi muốn Cơ bản” chỉ là yêu cầu đánh giá, không là pass. Hết hiệu lực/đổi policy cần review theo quy tắc đã duyệt.

Đây là dependency bắt buộc trước direct-entry Basic, nhưng **không chặn code/pilot MG01→MG02**. Tên/physical model của decision chốt ở implementation plan; không giả định contract Placement hiện tại đã hỗ trợ.

## 5. Video Library MVP tối giản

**Bốn khái niệm dữ liệu đề xuất:** LearningResource, LearningResourceVersion, ResourceTrack, LessonResourceBinding. ResourceEngagement đưa sang increment sau; không cần bảng analytics cho MVP.

| Có trong MVP | Hoãn |
| --- | --- |
| Metadata/creator/quyền dùng; tìm/lọc cơ bản | Recommendation/personalization và analytics dashboard |
| Upload file thật local, metadata/hash/size validation | Cloud/CDN/HLS/transcoding/DRM |
| Reviewed version, transcript, caption/subtitle đã có | Caption AI tự duyệt, workflow studio phức tạp |
| Binding whole-video theo vị trí/order; reuse/where-used | Cắt đoạn/chapters và clipping workflow |
| Player cơ bản, keyboard/caption, text alternative | Heatmap, attention score, unique coverage/% viewed |
| Authorize media/track/HEAD/Range theo binding và context | Server-side viewing events/đồng bộ vị trí xem đa thiết bị |
| Archive/revoke, pin history, backup/restore | Tự upgrade cohort hoặc tự GC file đang tham chiếu |

MVP không có trạng thái “đã xem đủ 90%”. Player position chỉ tạm trong phiên UI; refresh có thể phát lại từ đầu. Resume Lesson/attempt vẫn dùng cơ chế hiện có, **không hứa resume chính xác giây video**. Lịch sử session giữ cùng video version/bytes/caption nếu quyền chưa bị revoke, không bị đổi sang latest.

MVP cần stream/range port vì storage hiện đọc Buffer; không áp nguyên read-all cho file lớn. Sessionless learner access chỉ cho binding thuộc Lesson đã unlock trong manifest của chính learner; historical session access dùng pinned version. Resource APPROVED không có nghĩa public.

Binding resource-aware publish phải tham gia validation/fingerprint; đổi file/caption/transcript tạo version mới. Đổi bound LessonVersion tạo CurriculumRevision/manifest mới cho release mới. Không hot-swap lịch sử.

## 6. Roadmap: Stage → Unit → Lesson

Đây là presentation/read-model trên hierarchy hiện có, không cần entity Stage/Unit mới chỉ để vẽ cây.

| Node | Nội dung hiển thị |
| --- | --- |
| Stage | Can-do đầu/ra, Unit bắt buộc đã mastered/tổng expected, checkpoint và lý do chưa chuyển |
| Unit | Mục tiêu, H, R; số Lesson đã làm và objective/evidence đã đạt **tách riêng** |
| Lesson | Vai trò, trạng thái, next action, kỹ năng pending/need practice, source version |
| Bổ trợ | Video/tài liệu theo vị trí; tùy chọn; tình trạng có thật/không có, không có mastery badge |
| Checkpoint | Task/policy, chưa đủ điều kiện/đang chấm/cần luyện/đạt; không gắn % xem |

Next-action rule đề xuất: tiếp tục owned session đang dở → hoàn thiện evidence pending/weak bằng hành động phù hợp → Lesson R tiếp theo trong Unit đã mở → Unit tiếp theo đủ H. Không đề xuất “xem lại video để tự pass”; video là lựa chọn hỗ trợ khi có.

Nếu đang chờ chấm, không nộp lặp để tăng điểm; có thể ôn các phần được phép. L4-first không bỏ các objective bắt buộc. Stage/Unit chưa có nội dung chỉ hiện tên kế hoạch đã được Admin duyệt công bố, không lộ draft/media/answer.

### Ba định nghĩa readiness

| Khái niệm | Điều kiện đề xuất | Không đủ để thay thế |
| --- | --- | --- |
| Lesson readiness | Published version, objective/evidence references hợp lệ, theory/example đầy đủ, activity/audio/rubric đủ cho planner R/L/S/W, required file thật, binding thật nếu có | Planned video, tên category, đủ số câu |
| Unit mastery | Tất cả objective bắt buộc và matrix evidence L1–L4 đã evaluated/pass đúng policy/version; session/activity hợp lệ, không pending, kể cả L4-first | Đã bấm xong Lesson, xem video, điểm trung bình bù kỹ năng yếu |
| Stage transition readiness | Mọi Unit expected được duyệt đã ready/mastered, stage checkpoint đủ bốn kỹ năng/pass, đích ready, policy/transitionEnabled và xác nhận chuyển hợp lệ | Chỉ toàn bộ Unit đang published, hoặc hoàn thành pilot 2 Unit |

Learner startability = Lesson readiness + đúng entitlement/manifest + H đã thỏa, khác với content readiness. Tên state chi tiết là DTO đề xuất; tái sử dụng trạng thái hiện có khi cùng nghĩa, không thay contract cũ để tô badge.

## 7. Dependency, acceptance và rollback cập nhật

| Đợt | Dependency / phạm vi | Acceptance bắt buộc | Rollback |
| --- | --- | --- | --- |
| R0 Duyệt phạm vi | Chốt các quyết định mục 8; chưa thực thi | Map/objective/H-R và scope pilot được duyệt; approval gắn scope cụ thể | Chỉ sửa tài liệu |
| R1 Admin + pilot text/audio | Sau R0; tree, Main/Supplementary separation, MG01/MG02 source/preview | Không TODO/fake resource; đúng program; preview không ghi learner; validate graph/revision/four-skill | Tắt workspace mới, giữ shared/legacy |
| R2 Entry F0 + progression | Sau R1 và nội dung/audio/rubric được duyệt; manifest/roadmap/readiness | MG01→MG02 unlock đúng; fail/pending/L4-first không bypass; exact-version resume; stage exit vẫn tắt | Tắt admission mới; giữ enrollment/attempt/history |
| R3 Video Library MVP | Sau R0; có thể độc lập R2; 4 resource concepts, real file/review/stream | Type/size/hash/caption; auth/IDOR/HEAD/206/416; archive/revoke/backup; không analytics | Tắt upload mới; không xóa file/version referenced |
| R4 Optional video in lesson | Sau R1/R3; learner test cần R2 | Reuse/binding/version; sessionless unlocked và historical access đúng; text fallback/no-video vẫn học; không mastery khi play; old session không đổi | Tắt optional player, dùng text/audio; giữ pins/history |
| R5 Basic entry và curriculum mở rộng | Sau R2; assessment/rubric/direct-entry policy được duyệt; đủ nội dung đích | Bốn kỹ năng admission; decision/exemption chính xác; không completion giả; cross-path/admission Intermediate đúng | Dừng direct-entry/transition mới, giữ progress cũ |
| R6 Analytics tùy chọn | Chỉ sau R4 và scope/retention riêng được duyệt | Mọi watch event độc lập mastery; privacy/replay/retention; không tự thay UI readiness | Tắt telemetry, học/stream vẫn chạy |

Không bắt R1/R2 đợi sản xuất video hoặc analytics; không bắt R3 mở learner public. Acceptance/test là đề xuất chưa chạy, không là PASS. Migrations/seed/publication/cohort permission phải được duyệt theo increment; không suy ra từ approval tài liệu tổng quát. Rollback không drop dữ liệu mới đã có historical references, không reset score và không đảo migration legacy.

## 8. Quyết định thực sự còn mở

| Nhóm cần duyệt | Đề xuất hiện tại |
| --- | --- |
| Cấu trúc và kiến thức | Một program/hai path/năm stage/Unit=Mission; map 20 Unit/80 Lesson là khung biên soạn, cần chủ biên duyệt |
| Scope pilot đầu | MG01+MG02; thử progression, chưa Basic direct-entry hay chứng nhận CEFR |
| Sư phạm/evidence | Người chịu trách nhiệm, rubric, matrix L1–L4 và stage checkpoint; policy điểm hiện tại không phải CEFR chuẩn |
| Video MVP/production | Optional whole-video; ưu tiên 6 slot pilot, reuse; VI với mẫu EN, caption/transcript review; local storage budget/file limits cần chốt |
| Version/cohort | Pin manifest/version, không auto-upgrade; operational revoke có audit |
| Phạm vi triển khai được phép | Duyệt riêng R1/R2/R3/R4, cùng quyền dữ liệu/cohort/publication tương ứng |

Không cần chốt ngưỡng % xem, heatmap, cloud/DRM hay AI authoring để bắt đầu MVP đã duyệt: chúng được hoãn rõ, không để thành dependency ngầm. Direct-entry Basic phải chốt trước R5; không phải blocker của R1/R2.

Toàn bộ vẫn PROPOSED. Không ghi các lựa chọn thành approval. Không sản xuất video, gọi AI, code, migrate, seed, publish hay bật chương trình trong tác vụ này.

## 9. Handoff và kiểm chứng tài liệu

Artifacts là tài liệu thiết kế: knowledge map, production plan và refinement này; không phải import batch. Dùng lại source references của thiết kế gốc, không khảo sát repo/DB rộng. Kiểm tra cấu trúc, mã tham chiếu, planned status, H/R và builder-check có mục tiêu; mandate vẫn captured/approval=null. Test sản phẩm chỉ chạy khi triển khai được duyệt.

### Kết quả kiểm chứng refinement

- Builder-check có mục tiêu: không còn mâu thuẫn/câu hỏi quan trọng ngoài lựa chọn đang chờ chủ sản phẩm duyệt; chỉ review tài liệu, không code/DB/network.
- Kiểm tra artifact: 20 Unit, 80 Lesson (đủ cột G/P/V/R/L/S/W/objective/prerequisite), 55 mã video cho 60 slot chính, 6 mã ưu tiên pilot; tất cả PLANNED / NOT_STARTED; không có linked Lesson hoặc relative file link bị thiếu. Việc dùng lại G video ở L3 là binding optional bổ sung, không nằm trong 60 slot chính G/P/X.
- Mandate CLI validate: valid=true, count=3; MND-20261024-001 captured, approval=null.
- Diff chỉ gồm docs/mandate; không chạy lại tests sản phẩm hoặc gọi AI, không thay DB. Các test ở mục 7 vẫn là acceptance đề xuất.
