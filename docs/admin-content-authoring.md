# Quản lý nội dung Trung cấp và IELTS

Ngày cập nhật: 19/10/2026. Bản triển khai nằm trên nhánh `codex/audio-dashboard-v2`.

## Đơn vị quản lý và định dạng

Các công cụ có cấu trúc khác nhau. Mỗi công cụ giữ định dạng riêng để kiểm tra đúng quy tắc nội dung.

| Công cụ | Đơn vị quản lý | Cách nhập và thao tác |
| --- | --- | --- |
| Topic Trung cấp | Một bài đọc gốc và các phần học liên kết | Soạn từ vựng/ngữ pháp/phát âm, đọc/nghe hiểu, nói/viết trong cùng bài; AI đề xuất thời lượng, admin sửa/duyệt; kiểm tra, làm âm thanh và xuất bản riêng |
| Chuyên mục Trung cấp trước đây | Bài đã soạn theo từng chuyên mục | Giữ trong nhóm công cụ cũ để xem/sửa/xóa/lưu trữ; không tự chuyển đổi hoặc đoán topic |
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

Với Trung cấp, mở **Chủ đề & bài học** (`/admin/programs/intermediate/topic-groups`), chọn một chủ đề rồi bấm **Thêm bài học** trong chủ đề đó. Mỗi bài có một bài đọc gốc. Từ vựng, ngữ pháp, phát âm, câu hỏi đọc/nghe và nhiệm vụ nói/viết đều phục vụ cùng nội dung. Âm thanh dùng chính bài đọc đó; nhãn nhân vật `An (nam): ...`, `Nhi (nữ): ...` được hỗ trợ khi bài là hội thoại. Admin soạn các phần học; AI phân tích bố cục để đề xuất thời lượng/phân bổ, không tự tạo câu hỏi hoặc duyệt bài.

Lưu bản nháp rồi chọn **Nhờ AI đề xuất**, hoặc tự chọn khung học khi không dùng AI. AI chỉ đưa ra đề xuất có lý do; chế độ mô phỏng được ghi rõ. Admin được sửa thời lượng 45/60/90/120/150 phút và số phút của bốn chặng trước khi bấm **Phê duyệt khung học này**. Tổng phân bổ phải đúng thời lượng. Đổi nguồn sau khi duyệt làm phê duyệt cũ hết hiệu lực; yêu cầu AI trả về muộn hoặc revision cũ không được ghi đè bản mới.

### Nhập topic Trung cấp bằng JSON

Sidebar **Trung cấp → Công cụ Trung cấp** chỉ có một lối vào chính **Chủ đề & bài học**. Các chuyên mục cũ nằm trong nhóm thu gọn riêng, tự mở khi truy cập đường dẫn cũ. `/topics` chuyển về không gian chung; mở `/topics/new` thiếu mã chủ đề hợp lệ cũng quay về chọn chủ đề. Mã chủ đề đã xóa được kiểm tra trước khi mở biểu mẫu.

Trong biểu mẫu thêm/sửa topic, mở **Nhập bài theo chủ đề bằng JSON**. Dán nội dung hoặc chọn file JSON tối đa 1 MB; **Nạp JSON mẫu** cung cấp ví dụ đầy đủ. Có thể dùng [file mẫu nhà hàng](examples/intermediate-topic.json). JSON hợp lệ tự điền thông tin bài học, bài đọc và các phần luyện tập để review. Bấm **Xem bài đã điền** để đến phần thông tin, kiểm tra rồi **Tạo/Lưu bản nháp**; nhập JSON không tự lưu.

Nếu chưa sửa tay, các lần chỉnh JSON hợp lệ tiếp theo tiếp tục đồng bộ vào biểu mẫu. Khi admin đã sửa trường bằng tay, JSON mới không tự ghi đè: phải bấm **Áp dụng JSON vào biểu mẫu** và xác nhận thay thế. Quy tắc này cũng áp dụng nếu chỉnh tay trong khi file còn đang đọc. JSON chưa hợp lệ hoặc đang chờ áp dụng được cảnh báo khi rời trang và phải sửa, áp dụng hoặc xóa trước khi lưu/duyệt. File đọc lỗi hoặc JSON sai không thay nội dung biểu mẫu.

Định dạng cho **một topic**, không phải mảng nhiều bài:

| Trường | Nội dung |
| --- | --- |
| `format` | Chính xác `WorkLingoIntermediateTopic/1.0` |
| `slug`, `title`, `level`, `objective` | Mã, tên, trình độ và mục tiêu bài; tên không được rỗng |
| `readingText` | Bài đọc gốc không rỗng; xuống dòng dùng `\n` trong chuỗi JSON; âm thanh tự dùng cùng nội dung |
| `speaker`, `activatePrompt` | Nhân vật/người đọc và nhiệm vụ khởi động |
| `languageBlocks` | Ít nhất một mục gồm `slug`, `expression`, `meaningVi`, `pronunciation`, `grammarPattern`, `example`, `commonError`, `collocations` (mảng chuỗi) |
| `readingQuestions`, `listeningQuestions` | Mỗi mảng ít nhất một câu gồm `slug`, `prompt`, `options` (2–10 chuỗi), `answerIndex` (bắt đầu từ **0**), `explanation`, `evidenceLine` (dòng của bài đọc, bắt đầu từ **1**) |
| `speakingPrompt`, `speakingModel`, `writingPrompt`, `writingModel` | Yêu cầu và câu trả lời mẫu cho nói/viết |

Tất cả trường trên đều bắt buộc; các trường văn bản ngoài tên/bài đọc có thể để chuỗi rỗng để hoàn thiện sau. Mã bài/mục dùng chữ thường, số, dấu gạch nối; mã các mục phải khác nhau. Không thêm trường ngoài định dạng, kể cả trong câu hỏi hoặc mục ngôn ngữ. Các ký hiệu điều khiển của nguồn bài được kiểm tra trước khi áp dụng.

**Tải biểu mẫu dạng JSON** xuất các trường hiện tại, kể cả phần đang soạn dở; cần điền tên và bài đọc trước khi nhập lại. JSON không chứa `dialogue`, `durationMinutes`, ID hệ thống, trạng thái xuất bản hay phê duyệt. Nhập JSON không tự lưu, đề xuất AI, duyệt hoặc xuất bản. Thời lượng vẫn theo quy trình duyệt riêng; thay nguồn đã lưu làm phê duyệt cũ hết hiệu lực.

### Lỗi JSON và đề xuất sửa định dạng

Thông báo lỗi chỉ rõ đường dẫn trường, ví dụ `writingModel` hoặc `readingQuestions[0].answerIndex`. Chỉ số câu hỏi trong đường dẫn bắt đầu từ 0. Nếu sai cú pháp JSON, giao diện hiển thị dòng/cột khi bộ phân tích xác định được và nút **Đến vị trí lỗi JSON** đưa con trỏ đến chỗ đó. Tối đa 10 lỗi được liệt kê mỗi lần; sửa rồi hệ thống kiểm tra lại.

Ví dụ `writingModel` chứa email nhiều đoạn: định dạng bài hiện lưu câu trả lời mẫu trên một dòng, nên cần thay xuống dòng bằng dấu cách. Bài đọc gốc `readingText` vẫn được xuống dòng; số dòng của bài đọc gắn với dẫn chứng nên không tự đổi.

Với lỗi định dạng có thể xác minh, bấm **Nhờ AI đề xuất sửa JSON**. Chức năng dùng nhà cung cấp/model đã cấu hình tại **Cài đặt AI**, chỉ gọi khi admin bấm, một lần mỗi yêu cầu, không tự thử lại. Chế độ fake không tạo bản sửa giả. Phạm vi sửa tối đa 200.000 ký tự, nhỏ hơn giới hạn file nhập 1 MB.

AI chỉ đề xuất thay dấu phân cách hoặc khoảng trắng/xuống dòng của trường đơn dòng. Bộ kiểm tra so sánh các giá trị và cấu trúc, từ chối thêm/bớt câu hỏi, đổi đáp án, đổi bài đọc hay dòng dẫn chứng. Dữ liệu thiếu, chuỗi bị cắt, khóa trùng, cấu trúc ngoặc không rõ ràng, nhiều khả năng sửa hoặc bản sửa không hợp lệ đều phải sửa tay; hệ thống không cố đoán. Lỗi nhà cung cấp được báo riêng và giữ nguyên nội dung gốc.

Bản đề xuất hiển thị riêng, chưa thay ô JSON hay biểu mẫu. Admin đọc rồi bấm **Áp dụng bản sửa đã xem** hoặc **Bỏ đề xuất**. Nếu đã chỉnh tay trong lúc AI xử lý, thay thế phải được xác nhận. Áp dụng không tự lưu, phê duyệt hay xuất bản. Endpoint `POST /api/v1/admin/intermediate-topics/repair-json` chỉ dành cho content/system admin, giới hạn 5 yêu cầu/phút/người dùng và không ghi bài học vào cơ sở dữ liệu.

### Mục lục khi soạn bài dài

**Mục lục bài học** nằm cố định bên phải trên desktop, hiển thị số từ của bài đọc, số câu đọc/nghe và liên kết tới từng câu. Bấm một mục để đến đúng phần và chuyển tiêu điểm bàn phím; mục JSON tự mở nếu đang thu gọn. Nhảy trong bài không yêu cầu bỏ nội dung chưa lưu. Khi thêm/xóa câu hoặc áp dụng JSON, mục lục cập nhật theo các trường hiện tại. Bài mới chưa lưu chưa có liên kết duyệt thời lượng; bài đã xuất bản không có liên kết lưu nháp.

Trên màn hình nhỏ, mục lục nằm trước biểu mẫu, mặc định thu gọn và có vùng cuộn riêng khi mở. Danh sách dài không làm tràn chiều ngang.

**Admin quyết định toàn bộ câu hỏi.** Ví dụ JSON có 6 câu đọc và 4 câu nghe thì hệ thống dùng đúng 10 câu đó. Tăng độ dài bài đọc không tự thêm câu hỏi. AI chỉ hỗ trợ đề xuất thời lượng; không sinh hoặc tự chèn câu hỏi vào biểu mẫu hay phiên học.

Công cụ nâng cao của cùng ID tiếp tục phụ trách kiểm tra, âm thanh và xuất bản. Backend chặn xuất bản topic chưa có phê duyệt phù hợp nguồn hiện tại. Sau đó gắn bài đã xuất bản vào nhiệm vụ của đúng lộ trình/trình độ và xuất bản giáo trình theo công cụ hiện có. Việc lưu hoặc duyệt thời lượng không tự xuất bản, không tự thêm bài vào lộ trình.

Học viên chọn topic hoặc để hệ thống chọn ngẫu nhiên trong các topic đã xuất bản và đủ điều kiện của chương trình/trình độ hiện tại. Mỗi phiên giữ đúng một topic, toàn bộ hoạt động và khung thời lượng admin đã duyệt. Nói/viết cùng thuộc chặng phản hồi; bốn chặng có thời lượng linh hoạt và không bỏ bớt hoạt động để vừa khung 15 phút của bài cũ. Phiên đang học giữ snapshot đã đóng băng. Các bài cũ vẫn có thể bắt đầu khi chưa có topic mới hợp lệ.

Topic dùng `[LESSON] program: intermediate`, `category: reading`, `authoring_template: intermediate-topic-v1`. Bài theo chuyên mục cũ dùng `intermediate-form-v1`; các đường dẫn cũ vẫn hoạt động. Những phần phát triển tiếp theo cần giữ quan hệ từ các phần học về bài gốc của topic.

1. Chọn đúng công cụ và tạo hoặc mở một bài cụ thể.
2. Sửa nội dung, lưu bản nháp, kiểm tra rồi xuất bản khi đủ điều kiện.
3. Khi đổi chủ đề/đề thi đang có thay đổi, chọn tiếp tục chỉnh sửa hoặc bỏ thay đổi. Module Bridge, cấu hình thời lượng và giai đoạn band giữ các chỉnh sửa riêng khi chuyển lựa chọn trong không gian hiện tại.
4. Nếu có xung đột, tải lại. Bản mới của cùng bài được nạp sau khi xác nhận bỏ chỉnh sửa cục bộ; giữ chỉnh sửa không tự nâng revision để ghi đè nội dung của người khác.

## Chủ đề & bài học Trung cấp

Trong **Trung cấp → Chủ đề & bài học** (`/admin/programs/intermediate/topic-groups`), admin tạo/sửa tên và mô tả chủ đề. Một chủ đề chứa nhiều bài, ví dụ Nhà hàng có Đặt bàn, Gọi món, Thanh toán.

Danh mục khởi tạo có **150 chủ đề**, mỗi chủ đề có tên Việt, tên Anh và tên gọi khác đăng ký chung một ID. Có thể tìm bằng cả hai ngôn ngữ hoặc tên không dấu. Danh sách, tiêu đề và bộ chọn hiển thị tên theo ngôn ngữ giao diện: Việt dùng tên Việt, Anh dùng tên Anh (nếu chủ đề tùy chỉnh chưa có tên Anh thì dùng tên hiện có). Biểu mẫu sửa chủ đề vẫn có các trường riêng để quản trị hai tên và tối đa 20 tên gọi khác.

Ví dụ Nhà hàng / Restaurants có các tên Restaurant, restaurent và Nha hang cùng thuộc một ID. Nhập một tên/tên gọi đã thuộc chủ đề khác bị chặn; không tự gộp hai nhóm cũ. Nạp lại danh mục dùng mã ổn định, giữ ID, các bài đã liên kết và chỉnh sửa của admin; trường hợp nhiều nhóm cũ khớp cùng mục được báo xung đột để xử lý riêng.

**Quy tắc nghiệp vụ:** **Chọn chủ đề → Xem các bài trong chủ đề → Thêm bài bằng biểu mẫu/JSON → Lưu nháp → Kiểm tra nội dung và chuẩn bị âm thanh → Admin duyệt thời lượng → Xuất bản**. Trang soạn hiển thị các bước để biết vị trí hiện tại.

Chưa chọn chủ đề thì không có nút thêm bài. Chủ đề được cố định khi tạo bài mới; muốn chọn chủ đề khác, quay lại bước đầu (cảnh báo nếu có nội dung chưa lưu). Nhập JSON chỉ điền nội dung bài và giữ ID chủ đề đã chọn, không đọc tên nhóm từ JSON. API trả `400 TOPIC_GROUP_REQUIRED` khi tạo bài Trung cấp mới không có chủ đề, kể cả đổi bản nháp trống/định dạng khác sang bài Trung cấp; mã không tồn tại bị từ chối. Tạo bản nháp lưu bài và phân nhóm trong một transaction, nên lỗi chủ đề không để lại bản nháp tạo dở.

Với bài đã lưu, đổi chủ đề được lưu ngay bằng revision phân nhóm riêng và giữ nội dung bài đang chỉnh sửa. Các bài cũ chưa phân nhóm nằm trong **Bài chưa phân chủ đề** để admin đưa vào nhóm; khu vực này không tạo bài Trung cấp mới chưa phân nhóm. Bài đã xuất bản và phiên đang học vẫn giữ quy tắc dữ liệu trước đây.

- Chọn chủ đề rồi thêm và lưu bài bằng biểu mẫu hoặc JSON hiện có. Với bài đã lưu, có thể đổi chủ đề trong biểu mẫu hoặc cạnh bài trong không gian chung. Trạng thái từng bài được hiển thị riêng; dùng ô tìm kiếm và bộ lọc chủ đề để quản lý bài.
- Một bài có một chủ đề chung cho các phiên bản. Phân nhóm có revision riêng, không sửa bài đọc/câu hỏi hay làm mất phê duyệt thời lượng. Khi xuất bản, lựa chọn phân nhóm của admin được gắn cho bài và đồng bộ những bản nhập đã liên kết với bài đó. Bản nhập mới chưa từng chọn/bỏ chủ đề sẽ giữ chủ đề hiện có của bài.
- Xóa chủ đề cần xác nhận; các bài vẫn được giữ trong **Bài chưa phân chủ đề**. Xung đột với thao tác ở cửa sổ khác yêu cầu tải lại dữ liệu.
- Học viên chọn chủ đề, sau đó chọn một bài trong chủ đề. Các bài chưa phân nhóm vẫn truy cập được qua **Các bài khác**. Nút ngẫu nhiên chọn trên tất cả bài đủ điều kiện; không giới hạn theo bộ lọc đang chọn.
- Nhóm không thay thế xuất bản hay thiết lập giáo trình. Chỉ những bài có thời lượng được admin duyệt, đã xuất bản và đã được gắn/xuất bản trong đúng lộ trình, trình độ mới hiện với học viên. Chủ đề rỗng hoặc chỉ có bản nháp chưa hiện.

AI chỉ đề xuất thời lượng từng bài. Số câu hỏi do admin hoặc JSON quyết định. Một phiên học vẫn dùng đúng một bài đọc gốc và nội dung của bài được chọn; đổi tên, chuyển hoặc xóa chủ đề không sửa snapshot phiên đã mở.

API quản trị: `GET/POST /api/v1/admin/intermediate-topic-groups`, `PATCH/DELETE /:id`, `PUT /lessons/:importId`. Chỉ content/system admin có quyền; metadata nhóm và phân nhóm dùng optimistic revision độc lập.

## Xóa và lưu trữ bài

- Bản nháp chưa từng xuất bản có thể xóa sau khi xác nhận tên bài.
- Nội dung có lịch sử xuất bản được lưu trữ: ngừng mở phiên mới, giữ các phiên bản và tham chiếu của phiên học đã có.
- Lưu trữ một bản nhập bài cũ không thu hồi bản xuất bản mới hơn của cùng bài.
- API kiểm tra quyền, revision và thao tác đã xác nhận trong cùng transaction. Nếu bài vừa được xuất bản ở tab khác, yêu cầu xóa nháp cũ bị từ chối; cần tải lại và xác nhận lưu trữ.
- Các thao tác lặp lại sau mất kết nối dùng khóa idempotency để tránh thực hiện hai lần.

Endpoint bổ sung: `POST /api/v1/admin/content-lifecycle/:kind/:id/remove`, với `kind` là `lesson`, `topic`, `bridge` hoặc `mock`; body gồm `expectedRevision`, `expectedAction` (`deleted`/`archived`) và `idempotencyKey`. Tạo đề thi thử: `POST /api/v1/admin/ielts-mocks`.

## Phạm vi kiểm chứng

Xem báo cáo `superpowers/reports/2026-10-18-admin-content-crud-verification.md`, `superpowers/reports/2026-10-18-intermediate-category-authoring-verification.md` và `superpowers/reports/2026-10-19-intermediate-topic-verification.md`. Increment topic thêm bảng review bằng migration bổ sung; không đổi dependency. Các increment cũ không có migration mới.
