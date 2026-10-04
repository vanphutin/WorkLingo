# User Flows

## 1. Onboarding và xếp cấp độ

```text
Đăng ký
→ Chọn mục tiêu English for Work
→ Chọn tự đánh giá hoặc làm placement test
├── Tự đánh giá → chọn Foundation/Starter/Intermediate
└── Placement test → nhận level đề xuất
→ Xem giải thích kết quả
→ Xác nhận lộ trình
→ Chọn phiên học đầu tiên
```

Hệ thống tiếp tục quan sát các phiên đầu và có thể đề xuất điều chỉnh level. Không tự động chuyển level mà không giải thích.

## 2. Bắt đầu phiên học

```text
Mở dashboard
→ Xem Memory Health và mission hiện tại
→ Chọn 45/60/90/120/150 phút
→ Hệ thống tạo session plan
→ Người học xem mục tiêu và tài liệu cần thiết
→ Bắt đầu
```

Nếu không đủ nội dung phù hợp với thời lượng, hệ thống giảm thời lượng đề xuất hoặc tăng phần ôn; không nhân bản câu hỏi để lấp thời gian.

## 3. Phiên học 60 phút

### Block 1 — Activate

- Ôn Language Blocks sắp quên.
- Xem tình huống và mục tiêu mission.
- Kích hoạt kiến thức nền bằng một câu hỏi ngắn.

### Block 2 — Read & Decode

- Đọc nội dung công việc.
- Trả lời câu hỏi ý chính, chi tiết, logic và hàm ý.
- Khám phá Word Bank và Language Blocks trong ngữ cảnh.

### Block 3 — Listen & Reason

- Nghe script được tạo hoặc duyệt trước.
- Trả lời câu hỏi không phụ thuộc vào keyword.
- Đối chiếu thông tin nghe và đọc.

### Block 4 — Respond

- Shadowing hoặc nói tự do tùy level.
- Viết phản hồi theo nhiệm vụ.
- Nhận feedback và xem nội dung cần ôn lại.

## 4. Speaking theo cấp độ

```text
Foundation
→ nghe từng câu
→ lặp lại
→ shadowing đoạn ngắn
→ trả lời theo mẫu

Intermediate trở lên
→ trả lời bằng lời của mình
→ tóm tắt
→ role-play
→ hội thoại với Teacher AI
```

Khi speech API lỗi, bản ghi được giữ ở trạng thái chờ xử lý nếu người dùng đồng ý; session vẫn có thể tiếp tục.

## 5. Writing theo cấp độ

- Foundation: ghép câu, dịch Anh–Việt có mục tiêu, viết theo mẫu.
- Starter: trả lời ngắn, viết tin nhắn hoặc email đơn giản.
- Intermediate: tóm tắt, giải thích, phản hồi email và đề xuất giải pháp.
- B2+: viết độc lập theo rubric của nhiệm vụ hoặc kỳ thi.

## 6. Ôn tập thích ứng

```text
Mastery Engine phát hiện kiến thức sắp quên hoặc còn yếu
→ chọn hoạt động từ kỹ năng chưa đạt
→ đặt Language Block vào ngữ cảnh mới
→ người học phản hồi
→ cập nhật mastery và review schedule
```

Một Language Block chỉ rời hàng đợi ưu tiên khi người học thể hiện được năng lực ở các kỹ năng cần thiết.

## 7. Kết thúc và tiếp tục session

- Mỗi block hoàn chỉnh tạo checkpoint.
- Người học có thể tạm dừng giữa các block.
- Khi tiếp tục, hệ thống mở tại checkpoint gần nhất và hiển thị phần còn lại.
- Kết thúc session hiển thị năng lực tăng, lỗi cần chú ý và lịch ôn; không chỉ hiển thị điểm.

## 8. Chuyển cấp

```text
Đủ mission và mastery tối thiểu
→ làm checkpoint assessment
→ đạt ngưỡng ở từng kỹ năng
├── Đạt → mở level tiếp theo
└── Chưa đạt → tạo reinforcement plan theo kỹ năng
```

Để vào TOEIC hoặc IELTS, người học phải đạt bài đánh giá B2 nội bộ ở cả nghe, nói, đọc và viết. Chứng chỉ bên ngoài không thay thế bước này.

## 9. Admin nhập bài học

```text
Tạo draft
→ paste bài học theo template
→ parse
→ validate
├── Có lỗi → chỉ vị trí, giữ nguyên nguồn, sửa và chạy lại
└── Hợp lệ → tạo structured preview
→ tạo/xem thử audio
→ kiểm tra câu hỏi, đáp án và rubric
→ publish version
```

## 10. Admin sửa bài đã publish

- Tạo phiên bản draft mới từ phiên bản hiện tại.
- Người học đang học tiếp tục dùng phiên bản đã gắn với session.
- Phiên bản mới chỉ áp dụng cho session được tạo sau khi publish.
- Bài cũ được archived thay vì xóa cứng nếu đã có dữ liệu học tập.

## 11. Xử lý lỗi AI

```text
Gọi AI Gateway
→ timeout/retry giới hạn
├── Thành công → lưu kết quả có metadata
└── Thất bại → lưu trạng thái pending/failed
    → cho phép retry
    → không làm mất câu trả lời hoặc session
```

## 12. Quyền riêng tư bản ghi âm

- Trước lần ghi âm đầu, giải thích dữ liệu nào được gửi tới nhà cung cấp.
- Bản ghi tạm được xóa sau khi chấm theo chính sách cấu hình.
- Chỉ lưu lâu dài khi người dùng đồng ý dùng cho lịch sử tiến bộ.
- Người dùng có thể xóa bản ghi đã lưu mà không xóa kết quả học tổng hợp.
