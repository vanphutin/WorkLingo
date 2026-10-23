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

Hai AI dùng cấu hình server hiện có. Môi trường chưa có khóa hiển thị chưa
cấu hình; môi trường local có khóa hợp lệ cho phép chọn từng nhà cung cấp.
Discovery: DISCOVERY_API_KEY / DISCOVERY_BASE_URL / DISCOVERY_MODEL.
OpenAI: OPENAI_API_KEY / OPENAI_BASE_URL / OPENAI_MODEL.
Bật AI_ROUTING_ENABLED=true và dùng WORKLINGO_LANGUAGE_EVALUATION_PROVIDER
discovery hoặc openai-compatible theo cấu hình hệ thống, rồi khởi động lại API.
Không đưa khóa vào trình duyệt/Git. Cài đặt AI của tài khoản chỉ chọn ưu tiên,
không cấp khóa nhà cung cấp.

AI_LESSON_MAX_OUTPUT_TOKENS mặc định 12000, phạm vi 4096–32768, dành riêng
cho tạo bài; ngân sách đánh giá nói/viết giữ nguyên. Mỗi lượt gọi đúng AI đã
chọn; không tự chuyển AI. Kết quả JSON hoàn chỉnh nhưng chưa hợp lệ được
sửa tối đa một lần với cùng AI, dùng chung ngân sách 120 giây. Lỗi mạng,
xác thực, hạn mức hoặc kết quả bị cắt không tự gọi lại. Proxy Web chờ tối đa
150 giây. Với Qwen, tắt thinking và yêu cầu JSON để dành token cho bài học.
Kết quả bị cắt ngắn, thiếu trường, sai chỉ số đáp án/dẫn chứng hoặc từ mục tiêu
ngoài bộ được chọn sẽ không được áp dụng.

POST /api/v1/admin/intermediate-topics/generate yêu cầu CONTENT_ADMIN hoặc
SYSTEM_ADMIN, tối đa 3 lượt/phút/tài khoản. Input: topicGroupId, durationMinutes,
provider, level, difficulty. Output: topicGroupId, topic, plan, provider, model.

Không đổi schema DB và không tự lưu/xuất bản bài. Lỗi timeout, khóa, hạn mức
và nội dung không hợp lệ có thông báo riêng; bản nháp được giữ nguyên.

Structured Outputs chọn từ mục tiêu trước bài đọc và giới hạn expression bằng
enum từ đã duyệt. Khi sửa bài, candidate được truyền như dữ liệu không tin cậy
(tối đa 200.000 ký tự); schema ràng buộc từ còn thiếu và server kiểm tra lại
toàn bộ JSON, từ mục tiêu, đáp án và chỉ số dẫn chứng trước khi trả kết quả.
Nếu chỉ thiếu cách dùng từ chính xác, AI tạo câu kết phù hợp cho từng từ còn
thiếu. Server nối các câu này vào cuối bài đọc, giữ nguyên các dòng cũ, câu hỏi
và evidenceLine. Câu sửa phải có đúng từ, nằm trên một dòng, không chứa trường
ngoài schema. Nếu lỗi thuộc loại khác, AI được sửa toàn bộ JSON một lần.

## Bằng chứng kiểm chứng (2026-10-23)

- Kiểm thử hồi quy service: 37 tests pass; Web toàn bộ: 873 tests pass.
- API source tests và integration chủ đề: 950 tests/148 files pass trên DB test
  cách ly sau thay đổi runtime cuối. Lượt full API trước đó có 1.309 tests pass,
  2 lỗi service trong lúc code đang được sửa, 1 skipped; hai ca đó đã được chạy
  lại thành công trong suite cuối. Không ghi nhận lượt full API đó là pass.
- Typecheck, lint, i18n và build API/Web được chạy; xem log vận hành cho kết quả.
- Gọi AI thật đã được người dùng cho phép; chỉ gửi chủ đề, thời lượng và tối
  đa 40 từ đã duyệt, không gửi tài khoản hoặc toàn bộ DB.
- Browser thật qua Web proxy local: Discovery qwen3.8-27b HTTP 200 trong
  12,2 giây (5 từ mục tiêu), OpenAI gpt-4o-mini HTTP 200 trong 14,8 giây
  (7 từ mục tiêu), cấu hình 45 phút/Trung bình/B1. Cả hai điền JSON và áp dụng
  vào biểu mẫu tường minh; 0 page errors. Không lưu hay xuất bản bài thử.
  Đây là mẫu kiểm chứng, không bảo đảm mọi lần tạo/cấu hình đều thành công.
  Nội dung, nghĩa và tính phù hợp sư phạm vẫn cần admin duyệt.
- Kiểm thử tự động dùng mock và DB test cách ly 55439; các lượt gọi thật chỉ
  đọc bộ từ ở DB local. Không lưu bài sinh thử.

Tham khảo: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
và [Qwen vLLM deployment](https://qwen.readthedocs.io/en/stable/deployment/vllm.html).

Log và phản hồi AI phục vụ kiểm chứng nằm trong .superpowers/ (ignored),
không được commit cùng mã nguồn. Không ghi khóa vào log.
