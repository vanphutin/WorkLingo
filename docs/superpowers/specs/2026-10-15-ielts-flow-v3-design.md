# IELTS Flow V3 — Định nghĩa sản phẩm và nghiệp vụ

**Implementation authorization:** Approved by the user with “duyệt” on 2026-10-15. Proposed defaults and content scope below are now approved for local inline implementation. Planning-only restrictions describe the preceding planning phase.
**Trạng thái:** Đã duyệt ngày 15/10/2026; đang triển khai cục bộ.
**Nguồn:** Yêu cầu ngày 15/10/2026: tái cấu trúc slide giới thiệu có thể xem lại, học từ vựng theo topic/ngữ cảnh với buổi học từ 90 phút, mock có hai chế độ. Người dùng đã xác nhận ba mục **mở độc lập; chỉ gợi ý xem slide trước**. “Tiếp tục công việc” tiếp nối việc lập kế hoạch.
**Quyết định đã duyệt:** user tự chọn topic, hệ thống gợi ý; buổi học 90/120/150 phút. Phê duyệt toàn bộ kế hoạch bằng “duyệt” bao gồm các mặc định đề xuất này.

## 1. Vấn đề hiện tại và mục tiêu

Trang hiện tại phơi bày năm module kỹ thuật thành năm cửa nối tiếp. Intro bị coi như bài thi đầu vào; Integrated Practice ghép bốn timed task từ Bridge, chưa phải kho bài học theo topic. Mock có ba giá trị enum nhưng hành vi thời gian/phản hồi chưa phân biệt đầy đủ; paper Beta hiện chỉ được phép Learning/Practice.

Flow mới có đúng ba mục chính: **Giới thiệu IELTS · Học theo chủ đề · Mock test**. Bridge trở thành bài hướng dẫn chiến thuật nằm trong bài học; Band trở thành thông tin định hướng và lịch sử, không phải cửa phải mở trước Mock. Ba mục có lịch sử riêng và không lấy hoàn thành mục này làm quyền truy cập mục khác.

Không chỉ đổi nhãn giao diện. Phải bổ sung kho học liệu thật, quy trình học rõ ràng, hai chính sách mock khác nhau ở server và bảo toàn lịch sử.

## 2. Ai được dùng và điểm vào

- Learner đăng nhập, tài khoản ACTIVE, hoàn thành onboarding chung có thể mở cả ba mục khi IELTS ở BETA/AVAILABLE.
- Không đòi checkpoint Foundation, enrollment Intermediate, hoàn thành Intro/Bridge hay Band journey để vào flow V3.
- Mỗi mục kiểm tra học liệu xuất bản riêng. Mục chưa có nội dung hiển thị lý do và hành động phù hợp; không khóa cả IELTS vì một mục chưa sẵn sàng.
- Vẫn giữ xác thực, quyền sở hữu, consent microphone, bản xuất bản hợp lệ và quy tắc chấm.
- Quyền `ieltsEarlyAccess` đã cấp được giữ nguyên để tương thích module cũ; flow V3 không phụ thuộc ngoại lệ theo email hay bật cờ này hàng loạt.
- Vào IELTS không đổi `LearnerProfile.activeProgramId` hoặc enrollment/level Intermediate. Phiên học V3 mang scope IELTS rõ ràng.

Điểm vào: `/ielts`; ba mục `/ielts/introduction`, `/ielts/learn`, `/ielts/mock-tests`. Lịch sử `/ielts/history` là liên kết phụ. Route cũ có phiên đang học tiếp tục hoạt động.

## 3. Slide là gì

Slide là tài liệu onboarding IELTS: IELTS dùng để làm gì, Academic/General khác nhau ra sao, bốn kỹ năng, cấu trúc bài thi, cách hiểu điểm, cách học trên WorkLingo và hai chế độ mock. Phạm vi mock lần này vẫn là Academic; không tự quảng bá đã hỗ trợ General Training.

- Gợi ý xem lần đầu, có nút **Bỏ qua và học ngay** và **Đến Mock test**.
- Được nhảy tới bất kỳ slide nào, xem mục lục, bật/tắt âm thanh và transcript; không tự phát hay tự xin microphone.
- **Xem lại giới thiệu** thực sự mở toàn bộ slide, kể cả khi đã xem hết; không chỉ hiện màn hình “đã hoàn thành”.
- Câu hỏi trong slide là tương tác tùy chọn, không cấp band, mastery, completion học thuật hay quyền vào học/mock.
- Lưu phiên bản đã xem và trang cuối để tiếp tục. Xuất bản bản mới không đổi nội dung một lần xem đang ghim; learner có thể chủ động mở phiên bản mới.
- Dùng `IeltsIntroductionVisit` riêng, không sửa đáp án/completion của `OrientationProgress` cũ để biểu diễn đã xem slide.
- Media chỉ được đọc nếu thuộc bản đang xuất bản, visit của chính learner hoặc Orientation progress cũ của chính learner.

## 4. Một buổi học là gì

**Chọn topic → chọn độ khó → chọn 90/120/150 phút → xem mục tiêu → học trong ngữ cảnh → vận dụng bốn kỹ năng → nhận phản hồi → ôn cách quãng.**

Độ khó: `foundation/developing/competent/advanced`, mô tả độ phức tạp học liệu, không quy đổi thành band đạt được. Không giả định trình độ từ việc user chọn mục tiêu.

Giữ canonical blocks 15 phút của learning engine hiện có:

| Thời lượng | Chuỗi block |
| --- | --- |
| 90 phút | activate → readDecode → listenReason → readDecode → listenReason → respond |
| 120 phút | activate → readDecode → listenReason → respond → activate → readDecode → listenReason → respond |
| 150 phút | activate → readDecode → listenReason → respond → activate → readDecode → listenReason → readDecode → listenReason → respond |

`activate` ôn từ/cụm từ cũ và dự đoán ý; `readDecode` đọc trong tình huống và giải mã cụm từ; `listenReason` nghe hội thoại/đoạn nói và suy luận; `respond` có cả bài viết và bài nói dùng các cụm từ đã học. Mỗi phiên phải có đủ bốn kỹ năng; `respond` không được chỉ có viết.

Đây là thời lượng học dự kiến; user có thể tạm dừng/tiếp tục. Không bắt chờ hết giờ để được qua bài. Phản hồi và đánh giá cần dữ liệu thực; tác vụ đang chấm không được hiển thị thành đã đạt.

### Topic và học liệu

Đề xuất đợt đầu 12 topic: Education, Work & Careers, Environment, Health, Technology, Travel & Transport, Housing & Cities, Media & Advertising, Culture & Traditions, Science & Research, Society & Community, Food & Nutrition.

Mỗi topic có bản xuất bản độc lập và tối thiểu:

- 12 từ/cụm từ trọng tâm: nghĩa Việt, phát âm, collocation, lỗi thường gặp, ví dụ.
- Hai tình huống khác nhau để chuyển ngữ cảnh; từ/cụm từ được dùng trong bài đọc, transcript và bài sản sinh, không chỉ xuất hiện ở danh sách.
- Ít nhất một bài đọc và một hội thoại có nội dung cụ thể, câu hỏi và chứng cứ đáp án; hội thoại nhiều nhân vật dùng metadata giới tính/giọng đã có, không đọc nhãn nhân vật.
- Bài nói và bài viết có prompt, rubric và ví dụ sau khi trả lời. Ẩn đáp án/required phrases dùng để đánh giá active recall trước khi nộp.
- Kế hoạch 150 phút có đủ activity khác nhau; kiểm tra bằng planner thật, không lặp cùng activity hoặc thêm thời gian trống cho đủ phút.
- Tối thiểu một pack `foundation` mỗi topic trong đợt đầu; mức cao hơn chỉ hiện khi có học liệu tương ứng. Không tạo các tùy chọn rỗng để đủ bốn mức.

Mỗi pack gắn `CurriculumRevision` và `LessonVersion` thật thuộc chương trình IELTS. Tạo Path/Level/Mission IELTS có học liệu thật, không dùng mission Intermediate làm dữ liệu giả. Một topic có thể có nhiều pack theo độ khó; mỗi pack ghim một curriculum revision/lesson version phù hợp engine một lesson/phiên hiện tại.

Ôn tập ưu tiên đến hạn và lỗi yếu, chọn ngữ cảnh khác khi có; thiếu biến thể phải ghi rõ, không tự coi lặp nguyên bài là chuyển ngữ cảnh. Completion, mastery và lịch ôn tách biệt; học xong một lần không đồng nghĩa đã nhớ bền vững.

### Dùng lại engine, giữ scope

Tạo phiên từ topic qua `SessionCreationService.create(tx, input)` với mission/revision được server xác định. Dùng lại player `/sessions/[id]`, activity attempts, media/recording, Teacher AI, mastery và scheduler; không tạo thêm một engine chấm IELTS giống hệt engine hiện có.

`IeltsTopicSession` liên kết một LearningSession với topic version và độ khó. Trong cùng transaction tạo enrollment IELTS nếu chưa có để lưu objective completion, không thay active program/level Intermediate. CurriculumProgress lấy scope từ session; không lấy active program hiện tại để cấp completion.

Language Block/Word Bank IELTS dùng ID riêng và slug namespace `ielts-`; không tái sử dụng ID Intermediate chỉ vì cùng mặt chữ. Các truy vấn mastery/review/analytics phải lọc program **trước** giới hạn/chọn review; mặc định màn hình Intermediate vẫn đọc scope Intermediate. IELTS gọi scope IELTS rõ ràng. Pending/failed evaluation không được đếm như mastered.

## 5. Mock test là gì

Mock là bài đánh giá riêng với paper được ghim khi bắt đầu; không lấy thời lượng buổi học làm thời gian bài thi. Giao diện có đúng hai lựa chọn mới:

| Quy tắc | Thi thử / luyện tập (`PRACTICE`) | Mô phỏng thi thật (`EXAM_SIMULATION`) |
| --- | --- | --- |
| Thời gian | Theo dõi thời gian, có pause/resume | Deadline do server giữ, không pause/gia hạn khi refresh |
| Listening | Nghe lại/đổi tốc độ trong UI | Một lượt phát mỗi phần, tốc độ 1×, không seek/replay trong UI |
| Trợ giúp | Có hướng dẫn; transcript/đáp án sau khi nộp phần | Ẩn transcript, gợi ý, đáp án trong lúc thi |
| Phản hồi | Sau khi nộp mỗi phần; chỉ phần đã nộp | Sau khi kết thúc bài; Writing/Speaking chờ giáo viên |
| Hết giờ | User chủ động nộp | Server chốt phần bằng bản lưu cuối, chuyển đúng một lần |
| Điểm | Kết quả luyện tập, không dùng như điểm thi mô phỏng | Band ước tính của bài mô phỏng, không phải chứng chỉ |

PRACTICE vẫn làm bốn phần theo thứ tự, được tạm dừng giữa/chủ động trong phần; không thêm single-skill mock trong đợt này. Không thay chế độ giữa một attempt.

`LEARNING` cũ vẫn đọc/resume theo chính sách `legacy-v1`; không hiện là lựa chọn mới. Attempt mới ghim `policyVersion: v2` và mode. Attempt cũ giữ deadline, mode, đáp án, report snapshot cũ; không diễn giải lại JSON cũ theo chính sách mới.

### Chấm, ghi âm và audio

- Listening/Reading có đáp án và các biến thể được chứng cứ hỗ trợ; bảo vệ word limit. Không gửi key/rubric đánh giá trước khi nộp.
- Speaking mô phỏng cần ghi âm thật, preview, consent, upload và giáo viên nghe được; nhập transcript không thay thế đánh giá nói. Teacher AI/STT là hỗ trợ tùy cấu hình, không bắt buộc gọi dịch vụ trả phí.
- Giữ pending Writing/Speaking tới khi có đánh giá đúng quy trình; không tạo overall band khi thiếu một kỹ năng.
- Audio transport retry không tiêu thụ lượt nghe mới. Lease phát gắn learner/attempt/asset, idempotent start, deadline; HEAD/range/retry không được tăng play counter. UI giới hạn lượt phát không được quảng cáo là DRM/chống gian lận tuyệt đối.
- Mất mạng không reset deadline mô phỏng. Lưu nháp chỉ chấp nhận revision hợp lệ trong thời gian còn lại; hết hạn chốt đúng một lần, client không tự quyết thời gian.

### Paper đủ điều kiện mô phỏng

Bài local hiện có audio khoảng 12,6 phút và chỉ một dạng câu hỏi; **không đổi `allowedModes` để giả thành paper mô phỏng đủ chuẩn**. Phải có paper Academic mới, original/được phép sử dụng, bốn phần Listening với timeline 30 phút gồm cả hướng dẫn và khoảng trả lời, ba bài Reading, Writing có dữ liệu Task 1 và Task 2, Speaking đủ ba phần, cùng rubric/answer evidence đã review. Dùng ít nhất ba dạng câu hỏi mục tiêu trong tập Listening/Reading; không kéo dài bằng lặp bài hoặc im lặng cho đủ giờ.

Chính sách mô phỏng sản phẩm: Listening 30 phút, Reading 60, Writing 60, Speaking tối đa 14. Đây là lựa chọn triển khai dựa trên [format Academic](https://ielts.org/take-a-test/test-types/ielts-academic-test), không tuyên bố tái hiện mọi điều kiện tổ chức thi. [Scoring guidance](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail) là tham chiếu; bảng quy đổi của paper local phải ghi rõ chưa được hiệu chuẩn ngoài hệ thống.

Chỉ paper được Content/System Admin xác nhận qualification mới cho start EXAM_SIMULATION. Khi chưa có paper phù hợp, vẫn hiển thị hai chế độ nhưng mô phỏng có lý do chưa sẵn sàng; **không coi toàn bộ đợt triển khai hoàn tất trước khi có ít nhất một paper mô phỏng thực sự dùng được**.

## 6. Giao diện và trạng thái

- `/ielts`: ba lựa chọn với mô tả, tiến độ và CTA; không còn danh sách năm cửa khóa nối tiếp.
- Introduction: mục lục, đọc/nghe, tiếp tục/xem lại, chuyển sang Học/Mock.
- Learn: danh sách topic, từ/cụm từ và tình huống mẫu, mức độ, thời lượng, phiên đang học, ôn tập đến hạn; không hiển thị thời lượng thiếu học liệu.
- Kết thúc buổi: bốn kỹ năng, từ đã thực hành, bài còn chờ chấm, lỗi cần ôn và đề xuất topic tiếp theo.
- Mock: chọn chế độ → chọn paper phù hợp → kiểm tra audio/microphone → đọc quy tắc → xác nhận bắt đầu → làm bài → báo cáo/lịch sử.
- Legacy Bridge/Integrated/Band nằm trong “Lịch sử trước đây”; giữ deep link resume/review, không âm thầm chuyển attempt đang chạy sang phiên kiểu mới.
- EN/VI, dark/light, keyboard, focus, mobile không tràn; các CTA đều có bước tiếp theo hoặc lý do dữ liệu chưa sẵn sàng.

## 7. Rollout và phạm vi

Chỉ lập kế hoạch trong lượt này. Triển khai sau khi duyệt; không commit toàn bộ working tree đang có thay đổi. Không gọi provider trả phí, đổi quyền tài khoản, chạy migration hay xuất bản trong lúc lập kế hoạch.

Khi triển khai: migration additive; đọc snapshot cũ; chuẩn bị content ở draft; release dry-run và backup trước writes; chuyển hub sang V3 sau qualification. Rollback chuyển hub về legacy và ngừng tạo phiên V3 mới, vẫn cho resume phiên đã bắt đầu. Không hạ migration, xóa phiên hoặc ghi lại snapshot cũ.

Đề xuất cờ server `WORKLINGO_IELTS_FLOW=legacy|v3`, mặc định legacy cho tới khi qualification hoàn tất. API overview trả flowVersion để UI đi theo cùng một quyết định; không có hai cờ API/web có thể lệch nhau. Policy của attempt đã tạo lấy từ snapshot, không lấy từ cờ hiện tại. Cờ rollback không ngăn owner đọc/tiếp tục phiên đã ghim.

Giữ một kế hoạch điều phối cho cùng trải nghiệm IELTS, chia task thành các deliverable độc lập kiểm thử được. Roadmap hiện tại vẫn là backlog chính; không tạo sprint board cạnh tranh.

Ngoài phạm vi: thi IELTS chính thức/cấp chứng chỉ, thanh toán, chống gian lận bằng giám sát, General Training đầy đủ, tự suy ra trình độ/band đạt từ lựa chọn topic, cloud deployment.

## 8. Tiêu chí nghiệm thu

1. Learner mới không có checkpoint/early-access vẫn mở ba mục độc lập; tắt một mục do thiếu content không chặn hai mục còn lại.
2. Xem/xem lại/nhảy slide không tạo mastery hay thay completion Orientation cũ.
3. Có 12 topic thật, tối thiểu 12 cụm từ và hai ngữ cảnh/topic; tạo được phiên 90/120/150 đủ bốn kỹ năng, không trùng activity trong phiên.
4. Phiên mới từ chối 45/60 phút; phiên cũ 60 phút vẫn resume được.
5. Chọn topic, đổi phiên bản, gọi lặp UUID hoặc hai tab không tạo phiên sai topic; ngôn ngữ/ảnh/audio đúng bản ghim.
6. Học IELTS không đổi context Intermediate; mastery, Error Bank, review và analytics hai chương trình không trộn.
7. Hai chế độ mock khác nhau ở server; refresh/mạng lỗi không gian lận thời gian hoặc mất lượt nghe do transport retry.
8. Có ít nhất một paper qualified cho mô phỏng; Speaking ghi âm thật; không hiện overall band trước review cần thiết.
9. Phiên, điểm và grant cũ còn nguyên; rollback không làm mất phiên V3 đang học.
10. Hành trình thực qua API trên desktop/mobile, contract/unit/integration/build/i18n và kiểm tra content đều đạt trước bàn giao.
