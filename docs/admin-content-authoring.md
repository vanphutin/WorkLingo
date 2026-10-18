# Quản lý nội dung Trung cấp và IELTS

Ngày cập nhật: 18/10/2026. Bản triển khai nằm trên nhánh `codex/audio-dashboard-v2`.

## Đơn vị quản lý và định dạng

Các công cụ có cấu trúc khác nhau. Mỗi công cụ giữ định dạng riêng để kiểm tra đúng quy tắc nội dung.

| Công cụ | Đơn vị quản lý | Cách nhập và thao tác |
| --- | --- | --- |
| Chuyên mục Trung cấp | Một bài trong Ngữ pháp, Phát âm, Từ vựng, Đọc, Nghe, Nói hoặc Viết | Mỗi chuyên mục có nút thêm, danh sách và biểu mẫu tạo/sửa riêng; quản lý xóa/lưu trữ từng bài; mở công cụ nâng cao của chính bài đó để kiểm tra, làm âm thanh và xuất bản |
| Nội dung bài học | Một bản nhập bài | Văn bản WorkLingoLesson/1.0 hoặc /1.1; tạo từ mẫu, mở/sửa nháp, kiểm tra, âm thanh, xuất bản; xóa/lưu trữ riêng từng hàng |
| Chủ đề IELTS | Chủ đề, các gói học liệu và ngữ cảnh | Trường nhập tên, mô tả, mã gói, độ khó, phiên bản giáo trình đã xuất bản, mã cụm từ và ngữ cảnh; thêm/sửa/xóa nháp hoặc lưu trữ chủ đề |
| Định hướng IELTS | Slide trong một bản giới thiệu | Thêm/sửa/bỏ từng slide trong bản nháp; lưu, kiểm tra và xuất bản chung một phiên bản |
| Chuyển tiếp IELTS | Module theo dạng câu hỏi, gồm 10 bước | Biểu mẫu module và bài tập; cho phép nhiều module cùng dạng câu hỏi; xóa nháp/lưu trữ từng module |
| Luyện tập tích hợp | Cấu hình 60/90/120/150 phút | Sửa phân bổ thời gian bốn kỹ năng; giữ chỉnh sửa khi đổi cấu hình; có liên kết sang nơi soạn bài |
| Thi thử IELTS đầy đủ | Một đề Academic bốn kỹ năng | Tạo đề độc lập từ mẫu; trường nhập từng phần/câu hỏi/đáp án/âm thanh/tiêu chí; kiểm tra, xuất bản và xóa nháp/lưu trữ riêng từng đề |
| Giáo trình theo band | Cấu hình 7 giai đoạn cố định | Sửa mục tiêu, năng lực, hoạt động, ôn tập và điều kiện hoàn thành bằng biểu mẫu; giữ mã/thứ tự/khoảng band/điều kiện tiên quyết |

Chủ đề, đề thi thử và giáo trình theo band có mục nhập/xuất JSON nâng cao. Nội dung nhập phải hợp lệ trước khi áp dụng. Đề thi thử giữ định dạng 1/2 và các ID âm thanh, bằng chứng thẩm định đang có. Đề mẫu là nội dung minh họa; xuất bản vẫn phải qua các kiểm tra học liệu và âm thanh hiện hành.

Nền tảng/Mất gốc và TOEIC được đánh dấu **Phát triển sau** trong khu vực quản trị. Danh mục học viên và đăng ký học không bị thay đổi bởi việc điều chỉnh điều hướng này.

## Quy trình soạn bài

Với Trung cấp, mở `/admin/programs/intermediate`, chọn **Thêm bài** ở chuyên mục cần soạn. Ngữ pháp ưu tiên cấu trúc và ví dụ; Phát âm ưu tiên phiên âm; Từ vựng ưu tiên từ/cụm từ và nghĩa. Đọc có văn bản cùng câu hỏi, lựa chọn, đáp án và dòng dẫn chứng. Nghe có hội thoại riêng, tên nhân vật theo mẫu `An (nam): ...`, `Nhi (nữ): ...`, cùng câu hỏi nghe. Nói và Viết có yêu cầu và câu trả lời mẫu riêng. Mục mở rộng cho phép sửa các hoạt động hỗ trợ của bài bốn kỹ năng.

Lưu tạo bản nháp trong đúng chuyên mục. Công cụ nâng cao của cùng ID tiếp tục phụ trách kiểm tra, âm thanh và xuất bản. Bài đã xuất bản hoặc lưu trữ chỉ xem trong biểu mẫu; cần quản lý phiên bản bằng công cụ hiện có. Nếu lưu bị xung đột revision, nội dung đang nhập được giữ lại và cần đối chiếu trong công cụ nâng cao trước khi tiếp tục.

Phân loại soạn bài được lưu rõ trong `[LESSON]` với `program: intermediate`, `category` và `authoring_template: intermediate-form-v1`. Đây là phân loại cho quản trị; việc thêm bài vào lộ trình học viên vẫn theo cơ chế giáo trình hiện có. Bài cũ không có phân loại và nội dung tùy biến tiếp tục mở trong thư viện/công cụ nâng cao; hệ thống không tự đoán chuyên mục hoặc chuyển đổi làm mất dữ liệu.

Các chuyên mục phát triển tiếp theo cần cung cấp đường dẫn thêm bài, danh sách riêng và biểu mẫu phù hợp với cấu trúc nội dung của mình theo cùng cách này.

1. Chọn đúng công cụ và tạo hoặc mở một bài cụ thể.
2. Sửa nội dung, lưu bản nháp, kiểm tra rồi xuất bản khi đủ điều kiện.
3. Khi đổi chủ đề/đề thi đang có thay đổi, chọn tiếp tục chỉnh sửa hoặc bỏ thay đổi. Module Bridge, cấu hình thời lượng và giai đoạn band giữ các chỉnh sửa riêng khi chuyển lựa chọn trong không gian hiện tại.
4. Nếu có xung đột, tải lại. Bản mới của cùng bài được nạp sau khi xác nhận bỏ chỉnh sửa cục bộ; giữ chỉnh sửa không tự nâng revision để ghi đè nội dung của người khác.

## Xóa và lưu trữ

- Bản nháp chưa từng xuất bản có thể xóa sau khi xác nhận tên bài.
- Nội dung có lịch sử xuất bản được lưu trữ: ngừng mở phiên mới, giữ các phiên bản và tham chiếu của phiên học đã có.
- Lưu trữ một bản nhập bài cũ không thu hồi bản xuất bản mới hơn của cùng bài.
- API kiểm tra quyền, revision và thao tác đã xác nhận trong cùng transaction. Nếu bài vừa được xuất bản ở tab khác, yêu cầu xóa nháp cũ bị từ chối; cần tải lại và xác nhận lưu trữ.
- Các thao tác lặp lại sau mất kết nối dùng khóa idempotency để tránh thực hiện hai lần.

Endpoint bổ sung: `POST /api/v1/admin/content-lifecycle/:kind/:id/remove`, với `kind` là `lesson`, `topic`, `bridge` hoặc `mock`; body gồm `expectedRevision`, `expectedAction` (`deleted`/`archived`) và `idempotencyKey`. Tạo đề thi thử: `POST /api/v1/admin/ielts-mocks`.

## Phạm vi kiểm chứng

Xem báo cáo `superpowers/reports/2026-10-18-admin-content-crud-verification.md` và phần bổ sung `superpowers/reports/2026-10-18-intermediate-category-authoring-verification.md` để biết các lệnh kiểm tra, kết quả và giới hạn. Không có migration mới hoặc thay đổi dependency trong tính năng này.
