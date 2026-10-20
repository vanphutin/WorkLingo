# Trung cấp: một topic, một bài gốc, admin duyệt thời lượng

## Mục tiêu đã được người dùng xác nhận

Mỗi phiên học thuộc một topic riêng (ví dụ Nhà hàng), có một bài đọc gốc. Từ vựng, ngữ pháp, phát âm, nghe, đọc hiểu, nói và viết cùng phục vụ việc hiểu trọn bài đó. Người học chọn topic hoặc để hệ thống chọn ngẫu nhiên. AI đọc bố cục/nội dung và đề xuất khung 45/60/90/120/150 phút; admin sửa hoặc duyệt. AI không có quyền duyệt.

## Quyết định triển khai

- Dùng lại ContentImport, LessonVersion, Mission, xuất bản, audio và checkpoint hiện có. Một topic là một bài học hoàn chỉnh, gắn vào nhiệm vụ trong lộ trình Trung cấp. Không dùng Topic IELTS cho Trung cấp.
- Thêm mẫu `intermediate-topic-v1`; bài gốc dùng chung cho văn bản đọc và audio. Các phần đều tham chiếu cùng ngữ cảnh. Nội dung/bài tập do admin soạn; AI trong increment này đề xuất thời lượng/phân bổ, không tự sinh hoặc tự xuất bản nội dung.
- Topic mới có một khung thời lượng được admin duyệt. Bốn chặng: activate, readDecode, listenReason, respond, có số phút nguyên dương, tổng đúng khung. Bộ tạo phiên đưa toàn bộ hoạt động của topic vào đúng chặng, không cắt bài hoặc ghép topic khác để đủ giờ. Khung cũ 15 phút/chặng của bài legacy được giữ nguyên.
- Lưu đề xuất và phê duyệt trong bảng review liên kết bản nhập; gắn revision và sourceHash. Đổi nội dung làm phê duyệt cũ mất hiệu lực. AI chỉ ghi đề xuất. Chỉ endpoint có quyền CONTENT_ADMIN/SYSTEM_ADMIN ghi phê duyệt và actor/thời điểm.
- Khi xuất bản, kiểm tra lại review trong transaction và đóng băng khung đã duyệt vào snapshot. Phiên học đang có tiếp tục dùng snapshot cũ. Không tự xuất bản hoặc tự gắn vào lộ trình.
- Topic được chọn/ngẫu nhiên chỉ từ nhiệm vụ hợp lệ của chương trình/trình độ hiện tại, đã xuất bản, có snapshot topic được duyệt và thỏa điều kiện tiên quyết. Không dùng chung bộ chọn IELTS.
- Giữ bài legacy và các đường dẫn cũ. Admin Trung cấp chuyển điểm vào chính sang topic/bài gốc. Dashboard học viên bổ sung chọn topic; giữ đường bắt đầu bài cũ khi chưa có topic mới hợp lệ để tránh khóa dữ liệu đang dùng.
- AI dùng cấu hình provider hiện có, chỉ gọi khi admin bấm; output có schema, giới hạn và báo lỗi kín. Fake được ghi rõ mô phỏng. Không gọi provider thật trong kiểm thử. Không fallback thành tự duyệt.

## Tiêu chí nghiệm thu

1. Admin tạo một topic/bài gốc, sửa các phần bên trong, lưu đúng một bản nhập.
2. AI đề xuất có lý do, tổng phút hợp lệ; không làm xuất hiện trạng thái đã duyệt.
3. Admin duyệt thủ công hoặc sửa đề xuất; nguồn thay đổi/đề xuất trả về muộn không ghi đè phê duyệt mới.
4. Xuất bản topic chưa duyệt hoặc duyệt bản nguồn cũ bị từ chối ở backend.
5. Chọn topic hoặc ngẫu nhiên tạo một phiên có đúng topic đó, thời lượng đã duyệt, toàn bộ hoạt động và đủ bốn kỹ năng. Retry cùng UUID không tạo phiên mới/chọn topic khác.
6. Topic chưa xuất bản, sai chương trình/trình độ, bị lưu trữ hoặc chưa đủ điều kiện không được chọn.
7. EN/VI, thay đổi chưa lưu, lỗi mạng và revision conflict giữ dữ liệu nhập.

## Ngoài phạm vi

Không triển khai Nền tảng/TOEIC, thay rubric/chấm điểm, merge nhánh Format 1.2, sinh bài tự động hàng loạt, tự duyệt, tự xuất bản hoặc chuyển đổi bài cũ một cách suy đoán.
