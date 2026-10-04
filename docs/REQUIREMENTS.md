# Requirements

Các yêu cầu dùng từ khóa MUST, SHOULD và MAY theo nghĩa bắt buộc, nên có và tùy chọn.

## 1. Phạm vi phát hành

MVP MUST cung cấp trải nghiệm English for Work từ Foundation 1 đến Workplace Intermediate trên responsive web. Hạ tầng và lưu trữ MUST chạy local; dịch vụ AI bên ngoài được gọi qua backend.

## 2. Yêu cầu chức năng

### FR-AUTH — Tài khoản và quyền

- **FR-AUTH-001:** Người dùng MUST đăng ký, đăng nhập và đăng xuất.
- **FR-AUTH-002:** Hệ thống MUST hỗ trợ vai trò Learner, Content Admin và System Admin.
- **FR-AUTH-003:** API admin MUST kiểm tra quyền ở backend.
- **FR-AUTH-004:** API key của nhà cung cấp AI MUST không xuất hiện ở frontend.

### FR-ONB — Onboarding và xếp lớp

- **FR-ONB-001:** Learner MUST có thể tự chọn level hoặc làm placement test.
- **FR-ONB-002:** Hệ thống SHOULD đề xuất điều chỉnh level dựa trên các phiên đầu.
- **FR-ONB-003:** Mọi đề xuất level MUST có giải thích và yêu cầu xác nhận.
- **FR-ONB-004:** Cổng TOEIC/IELTS trong tương lai MUST yêu cầu assessment B2 nội bộ ở cả bốn kỹ năng.

### FR-CONTENT — Nội dung học

- **FR-CONTENT-001:** Admin MUST nhập được một bài học hoàn chỉnh từ text theo template.
- **FR-CONTENT-002:** Parser MUST nhận diện các section bắt buộc và báo lỗi theo vị trí.
- **FR-CONTENT-003:** Hệ thống MUST giữ nguyên source text khi parse hoặc validate thất bại.
- **FR-CONTENT-004:** Admin MUST xem structured preview trước khi publish.
- **FR-CONTENT-005:** Nội dung MUST có trạng thái draft, validated, published và archived.
- **FR-CONTENT-006:** Nội dung published MUST có version bất biến.
- **FR-CONTENT-007:** Session đã tạo MUST tiếp tục tham chiếu đúng content version ban đầu.
- **FR-CONTENT-008:** Script nghe MUST có thể chuyển thành audio và nghe thử trước khi publish.

### FR-LEARN — Learning Path và session

- **FR-LEARN-001:** Hệ thống MUST hỗ trợ mốc 45, 60, 90, 120 và 150 phút.
- **FR-LEARN-002:** 60 phút MUST là lựa chọn mặc định.
- **FR-LEARN-003:** Mọi session MUST chứa hoạt động nghe, nói, đọc và viết.
- **FR-LEARN-004:** Session plan MUST kết hợp nội dung mới, nội dung cần ôn và phần vận dụng.
- **FR-LEARN-005:** Hệ thống MUST tạo checkpoint sau mỗi learning block.
- **FR-LEARN-006:** Learner MUST tạm dừng và tiếp tục từ checkpoint gần nhất.
- **FR-LEARN-007:** Khi không đủ nội dung phù hợp, hệ thống MUST không nhân bản câu hỏi chỉ để đạt thời lượng.

### FR-LANG — Word Bank và Language Block

- **FR-LANG-001:** Word Bank MUST có thể được liên kết với nhiều mission và lesson.
- **FR-LANG-002:** Language Block MUST hỗ trợ từ/cụm từ, nghĩa, phát âm, collocation, grammar pattern, ví dụ và lỗi phổ biến.
- **FR-LANG-003:** Hệ thống MUST theo dõi mastery của Language Block theo từng kỹ năng.
- **FR-LANG-004:** Grammar SHOULD được trình bày từ ngữ cảnh trước khi giải thích quy tắc.

### FR-MASTERY — Ghi nhớ và tiến bộ

- **FR-MASTERY-001:** Hệ thống MUST lưu mastery riêng cho nghe, nói, đọc và viết.
- **FR-MASTERY-002:** Review Engine MUST ưu tiên kiến thức sắp quên, còn yếu hoặc từng gây lỗi.
- **FR-MASTERY-003:** Một nội dung ôn SHOULD xuất hiện trong ngữ cảnh khác nội dung gốc.
- **FR-MASTERY-004:** Error Bank MUST lưu loại lỗi, kỹ năng, Language Block và ngữ cảnh.
- **FR-MASTERY-005:** Người học MUST xem được Mastery Map và Memory Health.
- **FR-MASTERY-006:** Level progression MUST yêu cầu ngưỡng tối thiểu ở từng kỹ năng, không chỉ điểm tổng.

### FR-AI — Teacher AI và speech

- **FR-AI-001:** Mọi dịch vụ AI MUST được gọi qua AI Gateway của backend.
- **FR-AI-002:** Microsoft Speech-to-Text SHOULD là provider nhận dạng giọng nói ban đầu.
- **FR-AI-003:** OpenAI-compatible provider SHOULD dùng cho đánh giá ngôn ngữ và feedback ban đầu.
- **FR-AI-004:** TTS MUST nhận script đã được admin kiểm tra.
- **FR-AI-005:** Kết quả đánh giá MUST lưu provider, model/config, rubric version và thời gian.
- **FR-AI-006:** AI failure MUST không làm mất câu trả lời hoặc tiến độ session.
- **FR-AI-007:** Learner MUST có thể retry tác vụ AI thất bại.
- **FR-AI-008:** Teacher AI MUST giới hạn feedback theo level, rubric và nội dung liên quan.
- **FR-AI-009:** AI score quan trọng SHOULD có khả năng được admin xem lại.

### FR-ADMIN — Quản trị

- **FR-ADMIN-001:** Admin MUST quản lý path, level, mission, lesson, Word Bank và Language Block.
- **FR-ADMIN-002:** Admin MUST xem lỗi validation trước khi publish.
- **FR-ADMIN-003:** Admin MUST preview audio và toàn bộ hoạt động của lesson.
- **FR-ADMIN-004:** Admin MUST archive thay vì xóa cứng nội dung đã được sử dụng.

### FR-PRIVACY — Bản ghi và dữ liệu

- **FR-PRIVACY-001:** Hệ thống MUST thông báo trước khi gửi audio/text đến provider bên ngoài.
- **FR-PRIVACY-002:** Bản ghi âm tạm MUST có chính sách xóa cấu hình được.
- **FR-PRIVACY-003:** Lưu bản ghi dài hạn MUST cần sự đồng ý của learner.
- **FR-PRIVACY-004:** Learner MUST xóa được bản ghi đã lưu.

## 3. Yêu cầu phi chức năng

### NFR-PERF — Hiệu năng

- **NFR-PERF-001:** Các thao tác không phụ thuộc AI SHOULD phản hồi trong 500 ms ở môi trường local tham chiếu.
- **NFR-PERF-002:** Tác vụ AI trên 2 giây MUST hiển thị trạng thái xử lý.
- **NFR-PERF-003:** Audio SHOULD hỗ trợ tải trước cho block hiện tại và tiếp theo.

### NFR-REL — Độ tin cậy

- **NFR-REL-001:** Session progress MUST được lưu ở cuối mỗi activity và block.
- **NFR-REL-002:** Tác vụ nền MUST idempotent hoặc có cơ chế chống tạo kết quả trùng.
- **NFR-REL-003:** Database và thư mục asset MUST có script backup/restore local.

### NFR-SEC — Bảo mật

- **NFR-SEC-001:** Mật khẩu MUST được băm bằng thuật toán phù hợp và không được log.
- **NFR-SEC-002:** Secret MUST được lấy từ environment và không commit.
- **NFR-SEC-003:** Upload MUST kiểm tra loại file, kích thước và tên đường dẫn.
- **NFR-SEC-004:** Log MUST tránh chứa transcript nhạy cảm, token hoặc raw audio.

### NFR-UX — Trải nghiệm

- **NFR-UX-001:** Các luồng learner chính MUST hoạt động trên desktop và mobile web.
- **NFR-UX-002:** Desktop MUST là trải nghiệm tối ưu cho đọc và viết dài.
- **NFR-UX-003:** UI MUST đáp ứng WCAG 2.2 AA ở các luồng chính khi khả thi.
- **NFR-UX-004:** Feedback MUST giải thích hành động tiếp theo, không chỉ hiển thị điểm.

### NFR-MAINT — Khả năng bảo trì

- **NFR-MAINT-001:** Backend MUST là modular monolith với ranh giới module rõ ràng.
- **NFR-MAINT-002:** Storage, speech và LLM MUST được truy cập qua interface nội bộ.
- **NFR-MAINT-003:** Business logic MUST không phụ thuộc trực tiếp SDK của provider.

## 4. Acceptance criteria cấp sản phẩm

MVP được xem là đủ điều kiện thử nghiệm khi:

1. Admin nhập, validate, preview và publish được một lesson hoàn chỉnh.
2. Learner hoàn thành được session 60 phút đủ bốn kỹ năng.
3. Tạm dừng hoặc refresh không làm mất checkpoint đã lưu.
4. Language Blocks cũ được đưa lại vào một session sau theo review schedule.
5. Speech/AI failure tạo trạng thái retry được thay vì phá session.
6. Mastery Map phản ánh riêng bốn kỹ năng.
7. Các luồng chính chạy trên desktop và mobile viewport.

## 5. Giả định và giới hạn

- MVP chạy trên một môi trường local do đội phát triển kiểm soát.
- Kết nối internet cần thiết khi gọi AI provider bên ngoài.
- Pricing/quota của provider không phải yêu cầu cố định và phải được xác nhận khi tích hợp.
- TOEIC/IELTS, thanh toán và cloud deployment không thuộc MVP.
