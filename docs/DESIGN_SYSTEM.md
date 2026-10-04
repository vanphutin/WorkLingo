# Design System

## Mục tiêu trải nghiệm

Giao diện phải tạo cảm giác tập trung, trưởng thành và đáng tin cậy. WorkLingo là công cụ học nghiêm túc cho người đi làm, không phải trò chơi trẻ em hoặc dashboard doanh nghiệp khô cứng.

## Nguyên tắc

1. **Một mục tiêu chính trên mỗi màn hình học.**
2. **Nội dung là trung tâm.** Điều hướng và điểm thưởng không lấn át bài học.
3. **Phản hồi có hành động tiếp theo.** Mỗi lỗi phải chỉ ra cách cải thiện.
4. **Tiến bộ có bằng chứng.** Ưu tiên mastery, sản phẩm nói/viết và khả năng nhớ lại.
5. **Desktop-first, mobile-complete.** Desktop tối ưu; mobile không mất chức năng cốt lõi.
6. **Giảm mệt mỏi.** Phiên dài cần nhịp nghỉ, độ rộng đọc phù hợp và trạng thái rõ ràng.

## Giọng điệu nội dung

- Rõ ràng, khích lệ và tôn trọng người trưởng thành.
- Không dùng ngôn ngữ gây tội lỗi khi mất streak hoặc trả lời sai.
- Giải thích ngắn trước, chi tiết theo yêu cầu.
- Ở Foundation, ưu tiên tiếng Việt hỗ trợ; mức hỗ trợ giảm dần theo level.
- Dùng thuật ngữ nhất quán: Mission, Word Bank, Language Block, Session, Mastery.

## Hệ thống thị giác định hướng

### Màu sắc

- Một màu thương hiệu chính cho hành động và tiến trình.
- Màu trung tính ấm cho nền đọc dài.
- Semantic colors riêng cho success, warning, error và info.
- Không dùng màu là tín hiệu duy nhất.

Giá trị màu cụ thể sẽ được chọn và kiểm tra contrast khi xây UI; tài liệu này không khóa palette trước khi có prototype.

### Typography

- Font sans-serif dễ đọc, hỗ trợ đầy đủ tiếng Việt.
- Độ rộng dòng đọc dài khoảng 60–75 ký tự trên desktop.
- Body text tối thiểu 16 px trên mobile.
- Cỡ chữ, line-height và khoảng cách phải hỗ trợ phiên học 60–150 phút.

### Spacing và layout

- Dùng spacing scale nhất quán theo bội số 4 hoặc 8.
- Desktop lesson layout có vùng nội dung chính và panel hỗ trợ có thể thu gọn.
- Mobile dùng một cột; thông tin phụ mở bằng sheet hoặc accordion.
- Hành động `Continue` cố định hợp lý nhưng không che nội dung hoặc bàn phím.

## Thành phần cốt lõi

### Lesson Shell

- Header tối giản: mission, block hiện tại và thời gian ước tính.
- Progress biểu diễn theo block, không tạo áp lực đếm từng giây.
- Nội dung chính giữ vị trí ổn định khi feedback xuất hiện.

### Content Reader

- Hỗ trợ đoạn văn, email, chat, báo cáo và hội thoại.
- Cho phép đánh dấu Language Block nhưng không biến toàn bộ văn bản thành highlight.
- Transcript chỉ hiện khi activity cho phép.

### Audio Player

- Play/pause, tua, tốc độ và trạng thái loading/error.
- Nút điều khiển tối thiểu 44×44 CSS px.
- Có transcript và keyboard controls theo chính sách activity.

### Language Block Card

- Cụm từ, nghĩa theo ngữ cảnh, phát âm, collocation và ví dụ.
- Hiển thị trạng thái mastery theo kỹ năng khi cần.
- Không buộc người học mở modal để xem thông tin cơ bản.

### Question Renderer

- Hỗ trợ lựa chọn, sắp xếp, short answer, matching và open response.
- Sau khi nộp, hiển thị đáp án, giải thích và bằng chứng từ nội dung khi phù hợp.
- Không tiết lộ keyword khiến câu hỏi suy luận trở thành tìm kiếm bề mặt.

### Speaking Recorder

- Trạng thái idle, recording, uploading, processing, feedback và failed.
- Hiển thị rõ bản ghi sẽ được lưu hay xóa.
- Cho phép nghe lại trước khi nộp nếu rubric cho phép.

### Writing Editor

- Không làm mất bản nháp khi refresh hoặc AI lỗi.
- Hiển thị rubric trước khi nộp.
- Feedback tách thành meaning, organization, vocabulary và grammar.

### Feedback Panel

- Bắt đầu bằng điều người học đã làm được.
- Nêu tối đa các lỗi quan trọng nhất, tránh tràn feedback.
- Có `Try again`, `Show explanation` và `Add to review` khi phù hợp.

### Mastery Map

- Thể hiện riêng nghe, nói, đọc và viết.
- Phân biệt `new`, `learning`, `review due`, `stable` và `needs attention`.
- Cung cấp drill-down tới Language Blocks và lỗi liên quan.

## Responsive behavior

| Khu vực | Desktop | Mobile |
|---|---|---|
| Lesson | Nội dung + panel hỗ trợ | Một cột, panel dạng sheet |
| Writing | Editor rộng, rubric cạnh bên | Editor toàn chiều rộng, rubric thu gọn |
| Reading | Cột đọc giới hạn độ rộng | Full width với padding an toàn |
| Admin import | Source và preview song song | Chuyển tab source/preview |
| Mastery | Bản đồ + bộ lọc | Danh sách nhóm theo kỹ năng |

## Accessibility checklist

- Điều hướng hoàn chỉnh bằng bàn phím.
- Focus indicator rõ ràng.
- Label cho input, recorder và audio controls.
- Caption/transcript cho nội dung nghe khi được phép.
- Error được liên kết với trường tương ứng.
- Không tự động phát audio.
- Hỗ trợ `prefers-reduced-motion`.
- Contrast đáp ứng WCAG AA cho nội dung thiết yếu.

## Trạng thái bắt buộc

Mỗi component có dữ liệu hoặc network MUST thiết kế đủ:

- Loading.
- Empty.
- Success.
- Validation error.
- Recoverable failure.
- Permission denied.
- Offline/provider unavailable khi liên quan.

## Tránh

- Confetti hoặc animation sau mọi câu đúng.
- Streak gây áp lực hoặc lời nhắc mang tính phán xét.
- Quá nhiều card lồng nhau.
- Màu gradient và shadow chỉ để trang trí.
- Đếm ngược liên tục trong phiên học bình thường.
- Feedback AI dài hơn nội dung người học cần sửa.
