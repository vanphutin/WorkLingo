# Beginner curriculum và Learning Resource — đề xuất thiết kế

**MND-20261024-001 · 2026-10-24 · Chỉ phân tích, chưa duyệt triển khai**

Bổ sung cho [báo cáo readiness](../../../mandate/reports/2026-10-24-foundation-basic-readiness.md), không thay thế roadmap. Baseline f202e19, branch codex/foundation-basic-readiness, sạch khi bắt đầu. PR18 đã merge tại 752c19c; không thay mã hoặc dữ liệu của PR18. Số đếm DB trong báo cáo trước chỉ là snapshot lịch sử, không đo lại trong lần này.

Ký hiệu: **V** = code đã xác minh; **P** = phương án Codex đề xuất; **D** = cần chủ sản phẩm duyệt. Curriculum/pilot là kế hoạch nội dung, không phải bài/video/chứng nhận đã hoàn tất. CEFR định hướng can-do, không quy định bảng ngữ pháp theo thứ tự bên dưới. [Council of Europe: CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors).

## 1. Cấu trúc curriculum và tái sử dụng

**P: một Program Beginner, hai Path Mất gốc và Cơ bản.** Phương án hai Program riêng vẫn là quyết định mở; không tự chuyển Foundation legacy.

| Khái niệm | Ánh xạ đề xuất | Hiện trạng |
| --- | --- | --- |
| Program | LearningProgram beginner | V: có định nghĩa catalog/seed; không đồng nghĩa đã có dữ liệu triển khai |
| Path | Hai LearningPath Mất gốc/Cơ bản | P |
| Level | Level với mã mới, không dùng lại FOUNDATION_* legacy | V/P |
| Unit | **Mission**; chứa nhiều Lesson | P: nhãn UI, không cần entity Unit mới |
| Lesson | Lesson + MissionLesson; nội dung đóng băng bằng LessonVersion | V |
| Lý thuyết/ví dụ | ContentBlock, Foundation content, WordBank/LanguageBlock | V |
| Bài tập | Activity → ActivityAttempt → evaluation/mastery | V |
| Video tái sử dụng | Resource identity/version/track/binding | P: năng lực mới |

Cây: Beginner → Path → Level → Unit/Mission → Lesson/LessonVersion → Resource/Content/Activity.

7 category Foundation là nhãn trọng tâm; không phải 7 chương trình hoặc 7 bộ năng lực rời nhau. Bài Grammar vẫn thực hành R/L/S/W. Mỗi bài/Unit chọn một category chính như enum hiện có; UI tổng hợp category của các bài, không tự thêm integrated vào contract.

**H = prerequisite cứng** ở Unit/Level. **R = thứ tự khuyến nghị** giữa các Lesson trong Unit. Pilot mở các Lesson published khi Unit đã mở; không áp khóa Lesson→Lesson vì graph hiện tại nằm ở Mission revision. Muốn khóa tuần tự từng bài là phạm vi bổ sung cần duyệt.

## 2. Đầu vào, đầu ra và curriculum map

| Stage | Đầu vào | Đầu ra quan sát được | Gate |
| --- | --- | --- | --- |
| MG-F0: Pre-A1 làm quen | Chưa cần nền tảng; có hướng dẫn tiếng Việt | Nhận biết từ quen, hiểu chỉ dẫn ngắn có hỗ trợ; trao đổi tên/thông tin theo mẫu | Bốn kỹ năng ở mức hỗ trợ |
| MG-F1: Xây nền hướng A1 | F0 hoặc assessment tương đương | Câu đơn về bản thân/thói quen/nơi chốn; nghe/đọc ngắn, viết theo khung | Checkpoint Mất gốc; chưa coi là đạt đầy đủ A1 |
| CB-A1: Hoàn thiện A1 | Mất gốc hoặc đầu vào được đánh giá | Hỏi/đáp việc quen, tìm thông tin trực tiếp, nói/viết câu đơn có ý nghĩa | Evidence từng kỹ năng trong ngữ cảnh mới |
| CB-A2a: Xây A2 | CB-A1 | Kể việc đơn giản, trao đổi nhu cầu/kế hoạch thường gặp | Checkpoint giữa A2 |
| CB-A2b: Vận dụng A2 | CB-A2a | Trao đổi thường lệ, giải thích ngắn, kết nối câu và viết thông điệp quen thuộc | Checkpoint A2 + đánh giá sẵn sàng học Intermediate |

Đây là mục tiêu nội bộ cần giáo viên đối chiếu descriptor; không cấp chứng nhận A1/A2. Không quy đổi số từ, phút học hay 70% thành CEFR/TOEIC/IELTS. P: hướng dẫn tiếng Việt nhiều ở đầu rồi giảm hỗ trợ; ví dụ/đầu ra tiếng Anh.

Mỗi Unit có lý thuyết → ví dụ có ngữ cảnh → thực hành R/L/S/W → truy hồi/chuyển ngữ cảnh → unit check. Mỗi 2 Unit có ôn tích lũy; cuối stage có checkpoint bốn kỹ năng.

| Unit / Stage | Ngữ pháp | Phát âm | Từ vựng và nhiệm vụ tích hợp | H |
| --- | --- | --- | --- | --- |
| MG01 / F0: Tôi là ai | I/you + be; chào/giới thiệu | Âm và tên chữ; trọng âm tên | Tên/chào/quốc gia: đọc-nghe thẻ giới thiệu, nói tên, viết mẫu | Entry F0 |
| MG02 / F0: Đồ vật quanh tôi | a/an, this/that, số nhiều | Phụ âm cuối trong từ thật | Vật dụng: nhãn, chỉ đồ vật, hỏi đáp, mô tả | MG01 unit check |
| MG03 / F0: Người thân | he/she + be; my/your/his/her | Tương phản nguyên âm giáo viên chọn | Gia đình/nghề: hồ sơ, giới thiệu người, viết ngắn | MG02 |
| MG04 / F0: Số và liên hệ | be questions; what/where | Teen/ty; nhịp đọc số | Tuổi/điện thoại/giờ: nghe-điền, xác nhận; ôn MG01–03 + F0 checkpoint | MG03 |
| MG05 / F1: Ngày của tôi | Present simple I/you; frequency | Trọng âm từ, âm yếu quen thuộc | Ngày/giờ/thói quen: lịch, routine nghe-nói-viết | F0 checkpoint |
| MG06 / F1: Điều tôi thích | do/don't; like + noun | Nhịp câu hỏi, phụ âm cuối | Sở thích/đồ ăn: chọn thông tin, trao đổi, nhắn tin | MG05 |
| MG07 / F1: Nhà và khu vực | there is/are; giới từ vị trí | Nghe âm trong chỉ dẫn, chia cụm | Phòng/địa điểm: sơ đồ, chỉ vị trí, mô tả | MG06 |
| MG08 / F1: Tôi làm được gì | can/can't; mệnh lệnh; ôn câu đơn | Trọng âm khẳng định/phủ định | Khả năng/nhiệm vụ; transfer + checkpoint Mất gốc | MG07 + ôn F1 |
| CB01 / A1: Thói quen/công việc | Present simple ngôi 3, do/does, wh | Đuôi /s z ɪz/ | Lịch làm việc: đọc-nghe, phỏng vấn, viết routine | MG08 checkpoint hoặc entry decision tương đương |
| CB02 / A1: Mua sắm/ăn uống | Count/uncount, some/any, how much/many | Trọng âm giá/số lượng | Giao dịch: hiểu giá, yêu cầu, viết đơn giản | CB01 |
| CB03 / A1: Điều đang diễn ra | Present continuous vs routine | -ing, nhịp mô tả | Thời tiết/trang phục/hoạt động: mô tả, nhắn tin | CB02 |
| CB04 / A1: Nhờ giúp/phối hợp | can requests, and/but; tổng hợp A1 | Ngữ điệu hỏi/làm rõ | Yêu cầu, phản hồi, ôn và A1 checkpoint | CB03 |
| CB05 / A2a: Chuyện đã xảy ra | was/were; past simple thường gặp | -ed và từ bất quy tắc được chọn | Sự kiện/ngày nghỉ: hiểu, kể, viết ngắn | A1 checkpoint |
| CB06 / A2a: Đi lại | did questions; chỉ đường/giới từ | Trọng âm thông tin, xác nhận | Sơ đồ/thông báo: hỏi đáp, tin nhắn | CB05 |
| CB07 / A2a: Kế hoạch | going to; will quen thuộc | Nhịp và độ rõ cụm kế hoạch | Hẹn/lịch/dự định: đề xuất, xác nhận | CB06 |
| CB08 / A2a: So sánh/lựa chọn | Comparative/superlative, because | Trọng âm đối chiếu | Dịch vụ/đồ vật: lựa chọn và giải thích; A2 giữa chặng | CB07 |
| CB09 / A2b: Sức khỏe/lời khuyên | should, imperative, lý do | Chia cụm, nhấn ý chính | Việc thường gặp: trao đổi/lời nhắn, không tư vấn y khoa chuyên môn | A2a checkpoint |
| CB10 / A2b: Trải nghiệm | Past simple, từ nối trình tự | Trọng âm kể chuyện | Đọc-nghe và kể/viết trải nghiệm ngắn | CB09 |
| CB11 / A2b: Xử lý việc thường lệ | Requests, clarification, first/then/because | Hỏi lại, giọng lịch sự | Sự cố sinh hoạt/công việc: hội thoại và email ngắn | CB10 |
| CB12 / A2b: Dự án/chuyển tiếp | Tổng hợp cấu trúc đã học | Độ rõ, tự sửa, ngữ điệu | Capstone R/L/S/W mới + checkpoint A2, hồ sơ sẵn sàng học B1 | CB11 + checkpoint bắt buộc |

P sư phạm: ngữ âm xoắn ốc gắn từ/ngữ cảnh, không buộc thuộc toàn bộ IPA trước giao tiếp. Mất gốc dùng từ mục tiêu A1 đã duyệt, Cơ bản A1/A2. Kho từ A1 không thay thế biên soạn Pre-A1. Không nhồi ngữ pháp B1 chỉ để đổi nhãn A2.

## 3. Chuẩn Lesson và ba tầng hoàn thành

| Thành phần | Yêu cầu | Evidence |
| --- | --- | --- |
| Mục tiêu | Can-do quan sát được, category, từ/grammar scope, prerequisite Unit | Map objective→activity |
| Activate | Truy hồi/đầu vào nhỏ | Formative, không tự cấp mastery |
| Lý thuyết | Giải thích ngắn, cách dùng, lỗi thường gặp | Content, không chứng cứ năng lực |
| Video tùy chọn | Theory/worked example/pronunciation demo; khi chưa có dùng text/audio đầy đủ | Xem hoặc không xem không tự mở khóa |
| Ví dụ | Tình huống, nghĩa, phản ví dụ và audio thật phù hợp | Không chép bài mẫu thành attempt |
| Luyện tập | MCQ, short text, shadowing/ghi âm hiện có; giảm hỗ trợ dần | ActivityAttempt, rubric, evaluation |
| Đánh giá | Task khác ví dụ mẫu; đáp án/dẫn chứng/rubric đã duyệt | R/L: trả lời; S: ghi âm; W: bài viết; từng kỹ năng được đánh giá |
| Ôn/chuyển ngữ cảnh | Truy hồi và dùng kiến thức ở tình huống mới | Mastery/ReviewScheduler, không chỉ xem lại video |

Lesson đưa qua session planner phải đủ bốn kỹ năng và số activity phù hợp. Pilot đề xuất 45 phút; 60 phút chỉ khi kiểm thử chứng minh đủ nội dung riêng. Video nằm trong thời lượng theory/Activate đã dự toán, không cộng phút xem để hợp thức hóa session dài. Micro-lesson một kỹ năng chỉ là tài liệu bổ trợ nếu chưa đáp ứng planner.

**P — Unit mastery không chỉ dựa vào Lesson 4:** mọi objective bắt buộc được map tường minh tới evidence đã đánh giá của L1–L3 và task transfer/check ở L4, đủ kỹ năng và không pending. Activity luyện thêm có thể optional, nhưng mapping evidence bắt buộc không bị bỏ qua. L4 có thể được xem/làm trước vì không có lesson-order hard gate; kết quả đó chỉ là evidence của L4, chưa hoàn tất Unit khi thiếu L1–L3. Challenge-out chỉ qua admission/exemption policy được duyệt riêng, không ngầm lấy L4 thay mọi bài. Các attempt/checkpoint cũ được giữ, không hồi tố điểm sau xem video chữa bài.

Tách biệt **đã xem resource** (engagement), **đã làm xong hoạt động/bài** (workflow), **đạt objective/mastery/checkpoint** (evidence đã đánh giá, đúng version/policy). Pending không thành pass; kỹ năng mạnh không bù kỹ năng yếu. V: policy hiện dùng evaluated score ≥0,7; không phải chuẩn CEFR. P: giữ policy kỹ thuật hiện tại, nhưng phải duyệt/hiệu chuẩn trước cohort thật; không âm thầm đổi ngưỡng.

## 4. Pilot — 2 Unit, 8 Lesson dự kiến

Một Unit = một Mission LEARNING, gồm 4 bài. Bài 4 là unit check/ôn tích hợp bằng activity/objective mapping. **Không tạo MissionPurpose=CHECKPOINT:** enum hiện chỉ LEARNING/PLACEMENT. Level checkpoint dùng assessment hiện có sau khi đủ toàn bộ Unit của level. Pilot không chứng nhận hoàn thành F0/A1/A2.

H của MG01 là entry F0; H của CB01 là checkpoint Mất gốc hoặc admission/exemption được đánh giá. Self-placement không tạo completion giả. R là thứ tự khuyến nghị, không khóa cứng giữa các Lesson.

| Bài | R | Mục tiêu G/P/V | Bốn kỹ năng và evidence | Vị trí video tương lai |
| --- | --- | --- | --- | --- |
| MG01-L1 Chào và nói tên | Đầu Unit | I am/you are, chào/tên | R: thẻ giới thiệu; L: nhận tên; S: giới thiệu; W: tự điền câu có nghĩa | Sau Activate: be + mẫu giới thiệu |
| MG01-L2 Nghe âm/đánh vần | L1 | Tên chữ vs âm, hỏi lại ngắn | R: tên/email; L: ghi nhận tên; S: đánh vần/xác nhận; W: ghi thông tin | Trước luyện âm: khẩu hình/nhịp tên |
| MG01-L3 Giới thiệu ở tình huống mới | L1–L2 | Quốc gia/người quen, truy hồi mẫu | R/L: hồ sơ mới; S: tự giới thiệu; W: hồ sơ ngắn; rubric/từ mục tiêu | Worked example trước practice |
| MG01-L4 Ôn và unit check | L1–L3 | Transfer, phát hiện lỗi | Task R/L/S/W mới; evaluation/objective evidence riêng | Không gợi đáp án trước check; chữa bài sau kết quả |
| CB01-L1 Thói quen cá nhân/người khác | Đầu Unit sau H | I work/he works, do/does, từ lịch | R: lịch; L: routine; S: hỏi đáp; W: hai routine | Theory: present simple/ngôi 3 |
| CB01-L2 Nói rõ đuôi và thời gian | L1 | /s z ɪz/, trọng âm/giờ | R: phân nhóm; L: phân biệt; S: shadow rồi câu mới; W: lời nhắn lịch | Pronunciation demo có phụ đề |
| CB01-L3 Hỏi và xác nhận lịch | L1–L2 | Wh/frequency, ngày/lịch | R/L: lịch đổi; S: phỏng vấn; W: xác nhận | Worked example giữa explanation/practice |
| CB01-L4 Ôn và unit check | L1–L3 | Tích hợp G/P/V | R/L/S/W độc lập; giữ pending nếu nói/viết chưa chấm | Remediation sau kết quả, không lộ đáp án trước check |

**Tất cả video: dự kiến, chưa có file/version/duration/review.** Nhãn MG01-L1/theory là kế hoạch biên tập, không phải Resource ID. Không tạo ResourceVersion rỗng để báo đủ video. Planned slot chỉ nằm trong Admin draft; lesson published không video vẫn đầy đủ theory/ví dụ/audio/task, không có binding hỏng. Các Lesson ở bảng cũng chưa phải nguồn nội dung đã hoàn thiện/publish.

## 5. Version curriculum, roadmap và chuyển cấp

**V:** prerequisite graph theo Mission revision và cùng program; eligibility/roadmap chọn revision published mới nhất; availableNextLevel chỉ tìm trong cùng Path. Enrollment revision là token concurrency, không phải version curriculum.

**P: manifest curriculum Beginner** chứa schemaVersion/hash, danh sách Unit revision/prerequisite/policy đã duyệt và được pin vào enrollment mới. Ưu tiên trường snapshot có schema trên enrollment, chưa tạo ngay toàn bộ release tables. Roadmap Beginner đọc manifest đó; enrollment legacy không có manifest giữ hành vi cũ. Đây là khả năng mới cần code/test.

- Thêm video vào lesson published tạo resource version/binding và LessonVersion mới; **bất kỳ thay đổi bound LessonVersion nào cũng cần CurriculumRevision mới, kể cả giữ nguyên Lesson ID/thứ tự và chỉ thêm video**. CurriculumRevisionLesson pin lessonVersionId, không phải current pointer. Để cohort mới thấy thay đổi, tạo manifest release mới tham chiếu revision mới. Không hot-swap session cũ. Cohort mới có thể dùng manifest mới; cohort cũ không mất completion.
- New-session resolver Beginner phải đi từ enrollment manifest → CurriculumRevision ID → CurriculumRevisionLesson.lessonVersionId; không lần theo Lesson.currentPublishedVersionId hoặc definition mới nhất. Khởi tạo session cần kiểm tra membership/lesson trạng thái và pin đúng lessonVersion/curriculumRevision. Đây là yêu cầu mới cho resolver, không mặc định code hiện tại đã làm đầy đủ.
- Level readiness Beginner phải dựa trên danh sách Unit bắt buộc trong stage plan/manifest: mọi Unit bắt buộc phải có revision published, content đủ và completion/evidence hợp lệ. Không dùng “mọi mission đang published đã xong” để bỏ qua Unit chưa được xây. Pilot có learningEnabled nhưng stage transitionEnabled=false; thiếu Unit dự kiến thì không mở assessment chuyển cấp. Các Unit chưa có lesson không có revision giả.
- Upgrade manifest enrollment đang học phải tường minh: preview tác động, expected revision, audit, rollback. Không tự đổi completion R1 thành R2; mặc định chưa có auto-upgrade/equivalence. Thay mục tiêu/rubric/evidence không là chỉnh trình bày.
- F0→F1 và các level cùng Path dùng checkpoint/immediate-successor readiness. Mất gốc→Cơ bản khác Path cần transition policy riêng: đủ evidence, đích có nội dung, learner xác nhận; không sort toàn bảng level để suy ra đích.
- Direct-entry Basic cần assessment/giáo viên duyệt và admission/exemption decision version hóa trong manifest; eligibility phải hỗ trợ trước khi dùng. Không tạo CurriculumCompletion giả cho Unit được miễn.
- A2→Intermediate cần admission và enrollment program riêng. Validator hiện chặn prerequisite edge chéo program. Giữ enrollment Beginner; A2 là evidence để xét học B1, không tự gọi người học là B1 hoặc trỏ vào legacy Foundation của Intermediate.

## 6. Learning Resource — mô hình đề xuất, không phải migration

### 6.1 Năm khái niệm cần bổ sung

| Khái niệm | Trường/quan hệ đề xuất | Bất biến/phạm vi |
| --- | --- | --- |
| LearningResource | id, slug, type, tên, creator/owner, quyền dùng, operational access/revocation | Identity tái sử dụng; không dùng ID từ vựng làm ID video |
| LearningResourceVersion | resourceId/version, ngôn ngữ/mô tả, storage key, MIME, byte size, duration ms, checksum/manifest hash, review actor/time/state, transcript/descriptive text, poster tùy chọn | APPROVED khóa nội dung; đổi bytes/transcript/caption tạo version; metadata lấy từ file thật |
| ResourceTrack | resourceVersionId, kind captions/subtitles/chapters, language/label, storage key/checksum, format | Track thuộc manifest version, duyệt cùng version; không sửa timing tại chỗ |
| LessonResourceBinding | lessonVersionId, resourceVersionId, slot/order, objective/content anchor, segment start/end, alternative content ref | Pin version, không current/latest; anchor phải thuộc cùng LessonVersion |
| ResourceEngagement | learnerId, sessionId, bindingId, position ms, coverage intervals gộp, state, event/update token/time | Tiến độ xem riêng; không tạo attempt/mastery/completion |

Một resource dùng ở nhiều bài bằng nhiều binding/segment; không phải upload lại. Ban đầu chỉ VIDEO có renderer/validator được nghiệm thu. Không biến AudioArtifact (gắn script/generation/voice) thành video. Dùng lại pattern storage key/role/ownership/audit/version-bound delivery, nhưng cần streaming mới.

Constraints/indexes dự kiến: unique(resourceId,version); unique(resourceVersionId,kind,language,label); unique(lessonVersionId,slot,order); index FK/filter phổ biến. Segment: start≥0, end>start, end≤duration; cue timing/language được validate. Byte size dùng kiểu đủ lớn, duration integer ms; kiểm tra MIME/checksum/size thực. Không global-unique checksum vì bytes giống nhau vẫn có quyền/metadata khác nhau. RESTRICT xóa version/binding có lịch sử, không cascade mất evidence.

Progress unique theo learner/session/binding; server kiểm tra binding thuộc lessonVersion của session sở hữu, dùng composite relationship hoặc validation giao dịch phù hợp. Batch-load tree/bindings/tracks và pagination library; không query một lần cho từng node.

### 6.2 Lifecycle, storage, access

- DRAFT → IN_REVIEW → APPROVED; rejected về draft. APPROVED đóng băng nội dung. ARCHIVED ngăn binding mới nhưng giữ historical playback nếu quyền còn hiệu lực. REVOKED là operational deny có audit, có thể chặn cả lịch sử; không ghi đè bytes/evidence. Lifecycle/deny không thay content hash bất biến.
- APPROVED không phải public. Admin preview theo role. Learner chỉ đọc khi binding thuộc LessonVersion published của session sở hữu, quyền còn hiệu lực. Mỗi request media/track/HEAD/Range đều kiểm tra lại; không lộ storageKey/raw path/public URL.
- Local storage trước. Upload streaming có giới hạn file/type/size được duyệt, metadata probe/checksum/key guard. ObjectStorage hiện nhận/đọc Buffer nên chưa đủ cho video lớn; cần port stream/range, test 206/416/HEAD, hủy request và nhiều người xem. Không mặc định thêm cloud/CDN/HLS/transcoding/dịch vụ phí.
- External hosting nếu chọn sau cần provider allowlist/entitlement/fallback riêng; không server-fetch URL tùy ý. Iframe/link riêng tư không tự chứng minh access control.
- Backup gồm media/tracks/transcript/checksum; không GC bytes còn được version/session tham chiếu. Rollback ưu tiên tắt capability/admission mới, giữ metadata/file/lịch sử.

### 6.3 Caption, transcript, accessibility

P: captions gốc khác subtitles dịch; transcript đọc riêng có mô tả thông tin thị giác cần thiết. Dùng WebVTT track có ngôn ngữ/nhãn/timing được validate; caption/transcript AI chưa duyệt không được coi hoàn chỉnh. Đổi track/transcript tạo resource version mới. [W3C captions](https://www.w3.org/WAI/media/av/captions/), [transcripts](https://www.w3.org/WAI/media/av/transcripts/), [WebVTT](https://www.w3.org/TR/webvtt1/).

Player: keyboard/focus, tốc độ/âm lượng/phụ đề, text thay thế, không autoplay âm thanh. Người không xem được vẫn tiếp cận theory/task tương đương. Đây là thiết kế, chưa phải chứng nhận accessibility.

### 6.4 Viewed không phải mastery

Video optional chưa xem không chặn lesson nếu đủ activity/evidence. P có thể định nghĩa VIEWED là ≥90% unique coverage của segment, không cộng tua/lặp, nhưng ngưỡng cần duyệt. Chỉ lưu aggregate/resume tối thiểu; client telemetry không chứng minh sự chú ý/năng lực. Gộp/giới hạn intervals, chống replay; pause/seek/retry không tăng ảo.

Pilot chỉ gắn lecture video ở formative theory/example. Video làm input assessment sau này phải có exposure/caption/transcript/answer policy riêng; không xem chữa bài trước checkpoint rồi coi đó là tự làm.

## 7. Foundation format, API và legacy

**P: giữ Foundation format 1.1 cho lesson; thêm attachment manifest v1 riêng**, chưa mặc định DSL 1.3. Parser/validator Foundation hiện branch đúng 1.1; chỉ đổi chuỗi version có thể bỏ/mất metadata. Không dùng nguyên JSON generator Intermediate B1/B2 cho Beginner.

Manifest chứa resource version/slot/order/segment/anchor/alternative; planned slots chỉ draft. Đề xuất draft attachment có schema trên ContentImport, lưu atomic với rawSource dưới draftRevision. Publish validate source+manifest cùng transaction; resource manifest hash phải tham gia publication fingerprint resource-aware. Legacy không attachment giữ hash/parse cũ. Source text giống nhưng binding khác không được collision/idempotency thành cùng bản published. Export/import roundtrip source và manifest; môi trường khác phải resolve resource hoặc báo thiếu, không tạo ID/file giả.

| Phần | Tái sử dụng | Khoảng trống |
| --- | --- | --- |
| Foundation | 1.1, categories/objective refs, WordBank, four-skill/TODO validation | Manifest draft/normalize/preview/publish/export |
| Curriculum | Hierarchy, revision/prerequisite/completion | UI tree, enrollment manifest, chuyển Path, cohort policy |
| Enrollment | Program boundary/concurrency/audit | Entry Beginner, assessed exemption, pin manifest/resolver và stage readiness; bridge riêng |
| Progress | Attempt/evaluation/mastery/review/checkpoint | Engagement riêng, giữ nghĩa completion |
| API | Catalog/context/Foundation roadmap/admin import | DTO tree/resource/media/manifest/engagement versioned; không thêm video vào enum skill |
| DB | Hierarchy/version hiện có | 5 resource concepts + draft attachment/enrollment manifest; physical schema chốt sau duyệt |
| Legacy | LessonVersion/CurriculumRevision session đã pin, D-036 | Không chuyển dữ liệu/enrollment/score; null manifest giữ hành vi cũ |

Capability API đề xuất, tên route chưa là contract đã duyệt:

1. Admin tree theo program/path; sắp xếp draft với expectedRevision/idempotency; preview ảnh hưởng/validate/publish tường minh.
2. Resource metadata/upload/track/transcript/review/version/usage preview; không auto-approve sau upload.
3. Save/validate source+manifest; preview dùng cùng schema/renderer learner, quyền Admin riêng, không ghi learner progress.
4. Roadmap theo program/enrollment/manifest với states/next task/lý do khóa; không lộ draft media/answer.
5. Descriptor/media/track theo session; progress nhận binding/event token, không tin client gửi mastered/lessonCompleted.
6. Admission/transition nhận expected revision và evidence/đích cụ thể, fail-closed khi Path/level/lesson/audio chưa ready.

## 8. Luồng Admin và learner

**Admin:** chọn Beginner → Path → Level → Unit → Lesson; prerequisite/status ở Unit, video là resource ở vị trí trong Lesson. Tree có lọc category/review/missing content, độ phủ R/L/S/W và nơi đang dùng resource. Reorder bằng keyboard hoặc drag/drop chỉ đổi draft, không đổi published order.

Soạn mục tiêu → source/JSON Beginner riêng → theory/example/activity → planned slot hoặc chọn resource version thật → preview learner view/caption/alternative → validate references/graph/coverage/readiness → content review → publish explicit. Preview không tạo enrollment, watched, attempt hay mastery. Đổi video ở bài published phải tạo draft/version mới.

**Learner:** entry/assessment → roadmap manifest → vị trí hiện tại/next recommended lesson → theory hoặc video optional → practice R/L/S/W → nộp/đợi chấm → objective summary → ôn/cải thiện → checkpoint → transition được duyệt. Xem lại video không xóa lần làm hay hồi tố điểm.

Roadmap phân biệt planned/unavailable, locked có lý do, available, in progress, activities completed, mastery pending/needs review, unit mastered. Đây là DTO/UI đề xuất, contract hiện chưa có hết. Planned roadmap chỉ hiển thị tên kế hoạch được Admin duyệt công bố, không lấy draft private. Lý do khóa phải cụ thể: thiếu checkpoint, Speaking pending, bài/audio chưa publish/duyệt hoặc quyền hết hiệu lực; video optional thiếu không thành gate năng lực.

## 9. Increment độc lập và rollback

Liên kết backlog hiện có: IMPLEMENTATION_ROADMAP Increment 1–3/content publishing/program context; giữ spec Foundation/admin-sidebar và D-029/030/031/036. Không sửa backlog thành sprint/cam kết ngày công.

| Đợt | Scope/phụ thuộc | Nghiệm thu/test đề xuất | Rollback |
| --- | --- | --- | --- |
| I0 Chốt thiết kế | Duyệt mục 10, chủ biên/rubric; chưa code/DB | Review mapping, graph/pilot scope | Chỉ sửa đề xuất |
| I1 Admin + lesson text | Sau I0; tree/authoring/preview/plan slots, manual content trước | Category/graph/revision conflict tests; teacher hoàn thiện pilot không TODO; preview không ghi learner | Tắt workspace mới, giữ shared curriculum |
| I2 Entry/roadmap pilot | Sau I1 + nội dung được duyệt; manifest/enrollment/entry/exemption/unit evidence; chưa cần video | Isolated E2E entry→learn→save/resume→unit check; pending/fail/thiếu Unit chưa published không mở cấp; L4-first không bỏ evidence; manifest dùng exact lessonVersion; legacy regression | Tắt admission mới, giữ enrollment/session/manifest; không backfill legacy |
| I3 Resource library/stream | Độc lập I2 sau I0; version/track/review/upload thật/Admin preview | Size/type/hash, stream/HEAD/206/416/cancel, IDOR/path traversal, captions, archive/revoke, backup/restore | Tắt upload mới, giữ version/file được dùng |
| I4 Video binding/player | Sau I1/I3 và I2 để test learner; manifest fingerprint, player/engagement | Wrong version/learner deny; optional no-video vẫn học; viewed không tăng mastery; caption/replace version; old cohort/session giữ nguyên | Tắt video optional, text vẫn đầy đủ; giữ pinned history |
| I5 Chuyển cấp/đủ lộ trình | Sau I2; nội dung F0/F1/A1/A2 theo đợt, cross-path và A2 admission Intermediate | Teacher can-do review từng kỹ năng; readiness; no direct-entry bypass; migration rehearsal DB test được phép | Dừng transition/cohort mới; giữ progress/resume cũ |

Mỗi đợt có thể duyệt riêng. I1/I2 không phải đợi video do chủ sản phẩm sản xuất xong; I3 không đòi public learner. AI Beginner là phạm vi riêng sau schema/teacher policy nếu được chọn, không là phụ thuộc bắt buộc. Không sinh lesson/video giả để đạt số lượng.

## 10. Quyết định cần duyệt trước code

| D | Mặc định Codex đề xuất | Cần chủ sản phẩm chốt |
| --- | --- | --- |
| D1 Cấu trúc | Một Beginner, hai Path, 5 stage; Unit=Mission | Một/hai program, tên và map 20 Unit |
| D2 Entry/exit | F0 mới; Basic có evaluated admission, không tự khai completion | Chủ biên, assessment/exemption, tiêu chí từng kỹ năng và matrix evidence L1–L4 |
| D3 Pilot | 2 Unit/8 bài, 45 phút trước; chưa chứng nhận cả cấp | Chủ đề/từ/rubric/phát âm và duration |
| D4 Video | Optional theory/example, lesson đủ khi chưa có | Có video bắt buộc về sau không; alternative tương đương |
| D5 Hosting | Local streaming trước, chưa cloud/transcoding | Type/codec/size/storage budget, người quản lý/backup/quyền dùng |
| D6 Accessibility | Reviewed captions gốc, subtitle Việt nếu cần, transcript | Ngôn ngữ giảng/phụ đề, người duyệt |
| D7 Cohort/version | Pin manifest, không auto-upgrade | Quyền upgrade/equivalence và trải nghiệm bản cũ |
| D8 Engagement | Aggregate/resume riêng; 90% chỉ là viewed | Có nhãn viewed không, ngưỡng/retention, không làm mastery |
| D9 Rollout | Admin/local test trước, cohort sau duyệt nội dung | Migration/seed/publication/cohort cụ thể ở bước triển khai |
| D10 AI | Không dùng generator B1/B2 nguyên trạng | Có AI authoring không; schema/review/word scope/budget riêng |

Mọi mặc định là P, chưa phải lựa chọn người dùng đã chấp thuận. Không có quyền code/migrate/seed/publish/public/gọi AI/sản xuất video từ tài liệu này. Sau duyệt thiết kế/phạm vi cụ thể mới lập implementation plan.

## 11. Bằng chứng và giới hạn

| V | File đã đọc đúng phạm vi | Hệ quả mới |
| --- | --- | --- |
| E01 | apps/api/prisma/schema.prisma: hierarchy/MissionLesson/LessonVersion | Unit=Mission, không cần mọi entity mới |
| E02 | packages/content-format/src/ast.ts, packages/content-format/src/parser.ts, packages/content-format/src/foundation-metadata.ts | Foundation 1.1, chưa có resource binding AST mới |
| E03 | apps/api/src/curriculum-foundation/domain/objective-evidence-policy.ts | Video không thay attempt/mastery evidence |
| E04 | apps/api/src/curriculum-foundation/application/curriculum-eligibility.service.ts, apps/api/src/curriculum-foundation/application/curriculum-progress.service.ts | Latest revision + exact prereq; cần cohort policy khi thêm video |
| E05 | apps/api/src/progression/application/checkpoint-evidence.ts | Next level chỉ cùng Path |
| E06 | apps/api/src/curriculum-foundation/domain/prerequisite-graph.ts | Không cạnh chéo program |
| E07 | apps/api/src/storage/domain/object-storage.port.ts; apps/api/src/learning-sessions/application/learner-audio.service.ts | Buffer port, có pattern version-bound auth nhưng chưa streaming video |
| E08 | apps/api/prisma/schema.prisma: AudioArtifact/OrientationMediaKind/ContentImport | Audio/AUDIO-IMAGE không là video library; draft attachment mới |
| E09 | apps/api/src/progression/domain/checkpoint-policy.ts; packages/contracts/src/curriculum-foundation.contracts.ts | 0,7 nội bộ, roadmap chưa có mọi proposed state |
| E10 | docs/DECISIONS.md D-029/030/031/036; docs/ARCHITECTURE.md | Bảo toàn legacy, enrollment revision không là curriculum release |

Không chạy lại full tests/code scan/DB query: chỉ đọc source liên quan và thiết kế tài liệu. Không kiểm chứng playback/upload lớn/student readiness/CEFR thực tế vì chưa triển khai/chưa có media. Tests ở mục 9 là tiêu chí đề xuất, không phải kết quả pass. Không đọc dữ liệu học viên hoặc PDF LanGeek.

Bàn giao cần builder-check, kiểm tra local references, cập nhật cùng mandate ID và validate, diff chỉ docs/mandate. Quyết định mở ở mục 10 không bị biến thành approval.

## Kiểm chứng tài liệu (2026-10-24)

- Builder-check nêu 2 câu hỏi ảnh hưởng kế hoạch; đã làm rõ evidence L1–L4 và pin CurriculumRevision/LessonVersion khi đổi video.
- Bổ sung stage readiness: pilot không được tự chứng nhận cả level chỉ vì mới publish một Unit.
- Kiểm tra cấu trúc: 20 Unit, 8 Lesson pilot, 11 mục chính; local source references tồn tại.
- Mandate giữ captured, approval=null. Các test sản phẩm nêu trên chưa chạy trong tác vụ phân tích này.
