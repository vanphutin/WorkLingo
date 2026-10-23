# Tạo bài Trung cấp bằng AI và nhập JSON

Admin → Chương trình → Trung cấp → Chủ đề → chọn chủ đề → nhập bài.
Chọn **Tạo bằng AI**, chọn **Discovery** hoặc **OpenAI**, thời lượng
**45/60/90/120/150 phút**, độ khó từ vựng và trình độ bài **B1/B2**.

| Độ khó từ vựng | Nguồn từ mục tiêu | Yêu cầu |
| --- | --- | --- |
| Dễ | A1 | Có từ mục tiêu A1 |
| Trung bình | A1–A2 | Có ít nhất một từ mục tiêu A2 |
| Khó | A1–B1 | Có ít nhất một từ mục tiêu B1 |

Server chọn tối đa 40 từ/cụm từ đã duyệt từ Vocabulary Master, ưu tiên cùng
chủ đề và cân đối các cấp được phép. Nguồn phải có quyền lưu, sửa đổi và dịch;
source occurrence hợp lệ, entry và sense đã REVIEWED. Không gửi toàn bộ kho
cho AI. Nếu thiếu từ ở cấp yêu cầu, trả lỗi rõ ràng trước khi gọi AI.

AI chỉ được chọn languageBlocks.expression từ bộ từ này và phải sử dụng đúng
cụm từ trong bài đọc. Từ trùng/ngoài kho hoặc chỉ xuất hiện dưới dạng chuỗi con
của từ khác bị từ chối. Giới hạn A1–B1 áp dụng cho **từ mục tiêu**; không chứng
nhận mọi từ nối trong toàn văn đều ở cấp đó. B1/B2 là trình độ ngôn ngữ của bài,
độc lập với bộ từ mục tiêu. Admin vẫn cần duyệt độ chính xác nội dung/nghĩa.

AI tạo khởi động, cụm từ/giải thích tiếng Việt/IPA/ví dụ/ngữ pháp/lỗi thường
gặp/collocations, bài đọc, câu đọc và nghe có đáp án/dòng dẫn chứng, nhiệm vụ
nói/viết và bài mẫu. Phần nghe dùng cùng đoạn văn với phần đọc theo định dạng
hiện có. Số phút là kế hoạch học gồm thực hành, không phải thời gian AI xử lý.

Chọn **Điền bài vào ô JSON**. Hệ thống mở ô nhập JSON, chưa tự áp dụng vào bài.
Admin xem/sửa JSON rồi bấm **Áp dụng JSON vào biểu mẫu**, kiểm tra và lưu nháp.
Thời lượng đi cùng JSON và qua vòng lưu/mở lại; panel duyệt lấy thời lượng đó.
Có xác nhận trước khi ghi đè JSON hoặc nội dung chưa lưu. Tạo AI không tự lưu,
duyệt hoặc xuất bản. Bài đã xuất bản vẫn chỉ đọc.

JSON có vocabulary.difficulty và danh sách ID source occurrence/lexical entry/
sense, CEFR và attribution do server gắn từ kho; AI không tự cấp các ID này.
Đây là metadata của lần tạo trong JSON: định dạng bài học lưu hiện tại giữ
nội dung từ/cụm từ nhưng chưa lưu các ID này như liên kết curriculum. Nếu cần
lưu bằng chứng lần tạo, giữ bản JSON xuất tại bước nhập trước khi chuyển thành
định dạng bài học. Không coi metadata do admin sửa là bằng chứng đã xác minh.
Nghĩa tiếng Việt, ví dụ và nội dung mới do AI soạn, cần admin duyệt; source gốc
trong Vocabulary Master không bị sửa.

Hai AI dùng cấu hình server hiện có. Bản test hiện dùng fake và chưa có khóa,
nên lựa chọn hiển thị chưa cấu hình, không tạo bài giả để báo thành công.
Discovery: DISCOVERY_API_KEY / DISCOVERY_BASE_URL / DISCOVERY_MODEL.
OpenAI: OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL.
Bật AI_ROUTING_ENABLED=true và dùng WORKLINGO_LANGUAGE_EVALUATION_PROVIDER
discovery hoặc openai-compatible theo cấu hình hệ thống, rồi khởi động lại API.
Không đưa khóa vào trình duyệt/Git. Cài đặt AI của tài khoản chỉ chọn ưu tiên,
không cấp khóa nhà cung cấp.

AI_LESSON_MAX_OUTPUT_TOKENS mặc định 12000, phạm vi 4096–32768, dành riêng
cho tạo bài; ngân sách đánh giá nói/viết giữ nguyên. Mỗi lượt gọi đúng AI đã
chọn một lần, không tự retry hoặc chuyển AI. Admin chủ động thử lại/đổi AI.
Kết quả bị cắt ngắn, thiếu trường, sai chỉ số đáp án/dẫn chứng hoặc từ mục tiêu
ngoài bộ được chọn sẽ không được áp dụng.

POST /api/v1/admin/intermediate-topics/generate yêu cầu CONTENT_ADMIN hoặc
SYSTEM_ADMIN, tối đa 3 lượt/phút/tài khoản. Input: topicGroupId, durationMinutes,
provider, level, difficulty. Output: topicGroupId, topic, plan, provider, model.

Triển khai không đổi schema DB, không ghi production, không tự publish/merge/push.
Kiểm thử trả lời AI dùng mock; chưa gọi AI trả phí do chưa cấu hình khóa.

## Bằng chứng kiểm chứng (2026-10-23)

- API Trung cấp/cấu hình: 157 tests, 18 files, pass.
- Web Trung cấp: 148 tests, 18 files, pass.
- Contracts: 138 tests, 27 files, pass.
- Lint toàn workspace, typecheck các package, build API/Web và i18n: pass.
  Lỗi type ở fixture test API đã sửa và chạy lại API typecheck thành công.
- Browser: đăng nhập thật và kiểm tra trạng thái chưa cấu hình; mô phỏng phản
  hồi AI OpenAI, chọn 90 phút/Khó, điền JSON rồi áp dụng tường minh; 0 page errors.
- DB test chỉ đọc: chọn 40 từ A1 cho Dễ, 39 từ A1/A2 cho Trung bình, 37 từ
  A1/A2/B1 cho Khó; tất cả qua điều kiện quyền nguồn, duyệt và cấp độ.
- Full Web 868 tests và content-format 135 tests đã pass trước các thay đổi
  giới hạn độ khó cuối; các suite liên quan ở trên kiểm tra diff cuối.
- Lượt pnpm test toàn workspace bị gián đoạn do host/session restart, chưa có
  kết quả hoàn tất. Không coi đây là toàn bộ release qualification.
- Chưa gọi AI thật do môi trường không có khóa. Các lượt sinh bài kiểm thử
  dùng mock được ghi rõ, không được coi là bằng chứng chất lượng AI thực tế.

Log vận hành nằm trong .superpowers/ (ignored), không chứa khóa AI và không
được commit cùng mã nguồn.
