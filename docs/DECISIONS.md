# Architecture and Product Decisions

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

## Các quyết định còn mở

Những nội dung sau cần quyết định trong implementation planning hoặc increment tương ứng:

- Cú pháp chính xác và version 1.0 của lesson import format.
- Thuật toán mastery/review ban đầu và ngưỡng calibration.
- Provider TTS ban đầu.
- Chính sách retention mặc định cho recordings.
- Authentication strategy cụ thể cho local MVP.
- Bộ màu, typography và component library sau prototype UI.
- Ngưỡng quality của AI golden set trước pilot.
