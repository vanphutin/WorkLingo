# W1/W4 — Bộ review nội dung B1 pilot

Ngày: 16/10/2026 (Asia/Saigon).
Trạng thái: **Bản nội dung đã review AI và sửa; CEFR tạm thời, chưa import/publish. Format 1.2 đang được triển khai theo scope riêng.**
Mandate dùng lại: MND-20261015-001. Không tạo mandate hoặc sprint board mới.
Phạm vi lượt “ok,tiếp” sau W3: chuẩn bị bước tiếp theo trong Task 4 của kế hoạch hiện có. Không mở rộng phê duyệt W0/W3 thành quyền thay đổi dữ liệu, assessment hoặc phát hành.

- [Thiết kế W1/W4](../../docs/superpowers/specs/2026-10-16-intermediate-b1-content-authoring-design.md)
- [Bản đọc hai bài với toàn bộ đáp án/căn cứ/phương án nhiễu](../../docs/content-drafts/2026-10-16-intermediate-b1-pilot.md)
- [Nguồn JSON có cấu trúc](../../docs/content-drafts/2026-10-16-intermediate-b1-pilot.json)
- [Kế hoạch chuẩn — Task 4](../../docs/superpowers/plans/2026-10-16-intermediate-learning-quality.md#task-4-w1w4--product-mapping-b1-content-and-authoring)

## Phần đã chuẩn bị

| Bài dự thảo | Mục tiêu | Reading / Listening | Nhiệm vụ mở |
| --- | --- | --- | --- |
| Handle a delayed delivery | Hiểu thay đổi giao hàng, điều kiện và hành động khả thi | 6 / 6 MCQ | Gợi nhớ, tin nhắn thoại, email cho người tổ chức |
| Reschedule a team arrangement | Chọn lịch phù hợp ràng buộc, phân biệt đề xuất và xác nhận | 6 / 6 MCQ | Gợi nhớ, tin nhắn thoại, email cho hướng dẫn viên |

Mỗi bài dự kiến 5 activity, 12 MCQ, 3 prompt mở, 4 context và 5 Language Block. Đây là số đếm của bản soạn, không phải số bài đang có trong DB. Mỗi câu có slug, đáp án, dòng bằng chứng, giải thích, lý do từng phương án nhiễu sai và nhãn nhận thức do người soạn đề xuất. Không có thời gian hoặc độ khó đo được.

Các văn bản là tình huống hư cấu mới do Codex soạn, không dùng dữ liệu học viên hoặc sao chép đề thi. Người dùng chọn **“AI”** cho vai trò review. Codex đã review bằng AI theo rubric bên dưới; không gán chứng chỉ chuyên môn con người cho AI. Kết luận CEFR có điều kiện; quyền sử dụng, hiệu quả thực tế và audio vẫn cần kiểm tra ở bước liên quan.

Cơ sở định hướng là các thang B1 về hiểu lời nói, thư từ nghề nghiệp, phối hợp công việc và email factual của [Council of Europe, Companion volume 2020](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4). Đây là đề xuất liên hệ mục tiêu với thang mô tả, không phải chứng nhận các bài này đã đạt B1.

## Đề xuất kỹ thuật có thể duyệt riêng

Đề nghị làm trước **Format 1.2 cho nhóm câu hỏi đọc/nghe và metadata mục tiêu**, giữ payload MCQ runtime hiện tại. Bài cũ 1.0/1.1 giữ nguyên; không đổi planner, scoring, seed hoặc catalog.

Lý do: hiện normalizer chỉ xuất 1 câu mỗi activity, còn planner 45/60 chỉ chọn 1 activity Reading và 1 Listening. Chia 6 câu thành 6 activity sẽ không tự làm cả 6 câu xuất hiện. Snapshot và executor đã có question arrays; điểm thiếu nằm ở authoring.

Phát hiện thêm: snapshot Speaking hiện chỉ chấp nhận shadowing. Hai nhiệm vụ nói trong bản soạn yêu cầu tự tạo lời nhắn, vì vậy chưa thể nhập và chạy đúng ý định. Thiết kế **không** đổi chúng thành shadowing rồi gọi là transfer. Cần một thiết kế executor/evaluation riêng trước khi đưa trọn bộ vào app.

Phạm vi code đã tiếp tục theo “ok,tiếp”: parser/AST/validation/normalization 1.2; optional root pedagogy JSON; preview/publish/readback bằng fixture kỹ thuật dùng các mode được hỗ trợ; kiểm tra private metadata không lọt vào learner DTO. Không publish hai bài dự thảo, không gọi provider ngoài fake test và không tạo path/level thật. [Execution plan](../../docs/superpowers/plans/2026-10-16-intermediate-grouped-authoring.md) ghi phần triển khai này.

## Rubric đề xuất: worklingo-b1-pilot-review-v1-draft

Đây là rubric để **review nội dung**, không phải chính sách chấm điểm/mastery mới.

Mỗi tiêu chí ghi: đạt / cần sửa / chưa đủ bằng chứng, kèm item/context cụ thể, lý do và hướng sửa. Không cộng điểm thành một tỷ lệ “đạt B1”. Nếu không đủ bằng chứng về audio hoặc năng lực thực tế, kết luận phải giữ trạng thái chưa đủ bằng chứng.

| Tiêu chí | Reviewer cần kiểm tra | Căn cứ phải lưu |
| --- | --- | --- |
| Mục tiêu và CEFR | Text, task demand và cách phản hồi phù hợp người học B1 mục tiêu; không dùng độ dài để suy ra level | Thang tham chiếu, đoạn/item cụ thể, giải thích mức yêu cầu |
| Điều kiện tiên quyết | Người học hiểu mốc thời gian, số lượng, lý do, yêu cầu xác nhận; không mặc định hoàn thành Foundation là đủ | Capability map và cách kiểm tra trước học |
| Đáp án MCQ | Chỉ có một đáp án tốt nhất, suy ra từ đúng context; không cần kiến thức chuyên ngành ngoài bài | Answer index và evidence line; rà cả distractors |
| Chất lượng phương án nhiễu | Đại diện lỗi hiểu khả dĩ, không vô lý, không đoán chỉ bằng độ dài/lịch sự | Lý do từng distractor sai, sửa item mơ hồ |
| Đọc–nghe độc lập | Dữ kiện trả lời phần nghe không được phần đọc/vocabulary/feedback/task cards tiết lộ | Rà toàn bộ thứ tự exposure, không chỉ hash hoặc từ trùng |
| Nói/viết chuyển giao | Tình huống mới buộc áp dụng mục tiêu và ràng buộc; model không phải lời duy nhất được chấp nhận | Required meaning, mẫu đạt và mẫu cần sửa, cách chấp nhận diễn đạt tương đương |
| Gợi nhớ | Có bằng chứng đã học trước mới gọi spaced retrieval | Nguồn prior evidence; nếu không có thì first exposure |
| Audio | Nghe bản artifact thật, phân biệt người nói, đúng script/ý nghĩa, không nuốt chi tiết cần thiết | Artifact ID/hash, measured duration, người nghe và kết luận; hiện chưa có |
| Khối lượng | Số activity/item được chọn thực sự, thời gian chưa biết phải giữ unknown | Plan thực khi đã hỗ trợ, đo pilot sau; không thêm filler |
| Khả năng tiếp cận | Có hỗ trợ phù hợp; evidence label phản ánh transcript/hints đã dùng | Review flow và nhãn support; W2 quyết định chính sách |
| Tương thích | Không sửa bài/phiên đã publish hoặc chuyển enrollment | Kết quả kỹ thuật sau implementation; không lấy tài liệu làm bằng chứng chạy |
| Quyền và bối cảnh | Nội dung/giọng đọc có quyền dùng, bối cảnh không phụ thuộc giả định gây bất lợi không liên quan kỹ năng | Người kiểm tra, nguồn, vấn đề và cách xử lý |

## Anchor cho sản phẩm nói/viết

Áp dụng thủ công vào từng response trong JSON; tên rubricRefs trùng bảng dưới. Có thể dùng mức 0/1/2 để trao đổi giữa reviewer, nhưng **không** đưa vào Teacher AI hoặc mastery khi chưa thiết kế/phê duyệt chính sách.

| rubricRef | 0: chưa thể hiện | 1: thể hiện một phần | 2: thể hiện đủ trong nhiệm vụ |
| --- | --- | --- | --- |
| task-achievement | Bỏ vấn đề hoặc đề xuất không khả thi | Nêu vấn đề nhưng thiếu ràng buộc quan trọng | Nêu đúng vấn đề, ràng buộc và yêu cầu xác nhận; không hứa điều chưa chắc |
| reason-and-action | Không có hành động hoặc không có lý do | Hành động hợp lý nhưng lý do chưa rõ | Hành động phù hợp thông tin, lý do ngắn gọn kết nối đúng |
| coherence | Ý khó theo dõi, quan hệ thời gian không rõ | Hiểu được nhưng chuyển ý hoặc trình tự còn yếu | Người nhận hiểu thay đổi → tác động → đề xuất → điều cần xác nhận |
| language-control | Sai sót làm sai/khó hiểu ý chính | Hiểu ý dù có lỗi; một số cách diễn đạt thiếu chính xác | Đủ từ/cấu trúc diễn đạt rõ ý và quan hệ; không đòi hoàn hảo hoặc đúng nguyên văn mẫu |
| intelligibility | Bản ghi không đủ hiểu để xử lý yêu cầu | Cần nghe lại hoặc có chỗ chưa rõ | Ý chính và chi tiết hành động hiểu được; không đòi giọng bản ngữ |

Ví dụ cho printer-voice-message:
- Mẫu đủ ý: lời mẫu trong JSON chỉ là một cách trả lời; “Can you pick it up?” có thể tương đương “Could you collect it?”.
- Mẫu cần sửa: “The printer comes Friday. I have booked your collection for Thursday.” Nêu được thay đổi nhưng bỏ tác động lên badges và tự khẳng định việc chưa xác nhận.
- Không thể đánh giá intelligibility từ văn bản gõ hoặc script. Phải có bản ghi thực; văn bản chỉ giúp review nội dung.

Ví dụ cho site-visit-email:
- Mẫu đủ ý: đề xuất 3 p.m., giải thích vì sao 9 a.m. không được, kết thúc trước giờ xe đi, hỏi meeting point và chờ xác nhận.
- Mẫu cần sửa: “The visit is confirmed for nine. See you there.” Mâu thuẫn giờ xe và khẳng định booking chưa xác nhận.
- Độ dài 80–110 từ là gợi ý soạn bài, không phải ranh giới CEFR hoặc tự động đạt/trượt.

Ví dụ cho uniform-email:
- Mẫu đủ ý: nêu 20 áo sẵn, 5 áo nhỏ trễ sau sự kiện; đề xuất màu khác vào Friday và chờ người tổ chức duyệt trước tomorrow noon.
- Mẫu cần sửa: “All shirts will arrive for Saturday. I accepted the new colour for you.” Hứa sai thời gian của 5 áo nhỏ và tự phê duyệt thay người tổ chức.

Ví dụ cho interview-voice-message:
- Mẫu đủ ý: đề xuất Wednesday 4 p.m., giải thích giờ làm và di chuyển của ứng viên, hỏi xác nhận trước khi đặt lịch.
- Mẫu cần sửa: “I confirmed nine in the morning because you finish work at three.” Chọn lịch không đáp ứng ràng buộc và khẳng định việc chưa xác nhận.

Cả bốn anchor do Codex đề xuất để chuyên gia phản biện. Không coi đây là calibration với học viên hoặc thay thế bản ghi nói thực tế.

## Phiếu quyết định review

Lưu một record theo từng lesson và source hash, không chỉnh trường cefrReviewStatus thành reviewed chỉ vì code đã xanh.

- Reviewer: Codex (AI), theo lựa chọn trực tiếp “AI” của người dùng. Đây là self-review có giới hạn, không phải review độc lập của chuyên gia con người.
- Source hash SHA-256 hiện tại: `2a84d48c44dab16b380f452d31b1580600706e433dd0a8145f696902424a28d0`; mọi sửa JSON tạo hash mới, các phê duyệt cũ không tự áp dụng.
- Rubric: worklingo-b1-pilot-review-v1-draft; cần người phụ trách chấp nhận trước khi dùng làm gate.
- Kết luận theo criterion/item: review AI đã thực hiện, chi tiết bên dưới.
- Audio artifact review: chưa có; có 2 script, 0 bản thu đã duyệt.
- Listening exposure review: AI đã đối chiếu text và không tìm thấy câu trả lời nghe được cung cấp bởi context khác; không xác nhận independent ở runtime.
- Runtime Speaking transfer: chưa hỗ trợ trong snapshot hiện tại.
- Kết luận hiện tại: cần review, chưa đủ điều kiện import/publish/pilot.

## Kiểm tra kỹ thuật tài liệu

Đã chạy Node verifier cho review artifact: PASS (exit 0). JSON parse được; slug và refs/evidence hợp lệ; mỗi câu có 4 lựa chọn, answer index đúng phạm vi và rationale tương ứng; có 2 bài/24 MCQ/6 prompt mở; dữ liệu thời gian và người review giữ unknown. Verifier còn kiểm tra objective coverage theo loại kỹ năng thực, model email 80–110 từ và audio script-only. Log/hash/link checks cuối lượt được ghi sau khi đồng bộ tài liệu.

Đây không thay thế content-format tests: JSON là **review artifact**, cố ý không phải WorkLingoLesson source hay runtime LessonSnapshot. Không chạy lại toàn bộ 1.324 test W3 cho thay đổi chỉ gồm tài liệu/nội dung review. Bằng chứng W3 tiếp tục nằm trong [báo cáo W3](2026-10-16-intermediate-workload-visibility.md).

## Handoff

Fresh builder check đã đọc thiết kế và trả về “nothing important left”. Đây là kiểm tra đủ rõ để lập kế hoạch authoring, không phải code review hoặc review CEFR. Không có câu hỏi do builder đặt ra cần người dùng giải quyết. Chưa tick checkbox “accepted mapping”, “expert reviewed” hoặc toàn bộ “implemented” trong master plan. Mandate đã cập nhật scope qua CLI và ghi lại approval cho slice authoring W4; các cổng còn lại giữ nguyên.

Người dùng tiếp tục “ok,tiếp” sau đề xuất cụ thể về Format 1.2; phạm vi authoring được ghi riêng trong approval note và execution plan. Không cần quyết định provider hoặc pilot để triển khai authoring trong worktree. Nội dung vẫn chưa được publish.

## Kết quả review AI và sửa

Codex đối chiếu 24 câu với từng context/dòng evidence, đáp án, distractors, thứ tự exposure, các response mẫu và thang CEFR đã dẫn. Không dùng AI provider ngoài phiên chat, không có chi phí thu âm/TTS mới.

- **Đáp án/căn cứ:** AI đọc thấy một đáp án tốt nhất cho mỗi câu; structural verifier kiểm tra index và dòng evidence. Đây là nhận định semantic của AI, không phải thử nghiệm với học viên.
- **Distractors:** 10/24 câu ban đầu có đáp án đúng dài hơn mọi đáp án nhiễu. Sửa phương án/rationale ở 12 câu; sau sửa không còn câu nào có đáp án đúng dài nhất duy nhất. Độ dài chỉ là một kiểm tra thiên lệch đơn giản, không chứng minh item hết đoán được.
- **Cognition:** hạ 5 nhãn inference bị phóng đại. Bản cuối mỗi bài có 7 comprehension và 5 application MCQ; không có inference/intent/tone thật được khẳng định. Productive tasks là transfer đề xuất. Bộ này chưa bao phủ toàn bộ chương trình B1.
- **CEFR:** giữ B1 candidate có điều kiện: email factual, ràng buộc quen thuộc, lý do ngắn và request confirmation hợp định hướng đã dẫn. Sự đơn giản ở một số câu là chủ ý hỗ trợ gist/detail; không gọi mỗi câu riêng lẻ là đo B1. Chưa có dữ liệu năng lực hoặc calibration.
- **Độc lập context:** dữ kiện nghe khác bài đọc; một giờ chung như 3 p.m. có thể lặp nhưng không cung cấp câu trả lời câu nghe. Không dùng hash/entity list để chứng nhận độc lập.
- **Nói/viết:** model đáp ứng các requiredMeaning theo review AI; các anchor cần sửa nêu lỗi cụ thể. Không đòi đúng nguyên văn; không đánh giá intelligibility từ text.
- **Giới hạn còn lại:** audio script-only; Speaking transfer chưa hỗ trợ; prerequisite IDs chưa ánh xạ; retrieval có điều kiện prior evidence; thời gian unknown; admission/publish/pilot chưa duyệt.

Kết luận AI: **sẵn sàng để tiếp tục kỹ thuật authoring và phản biện nội dung, chưa sẵn sàng learner release**. Trường qualifiedCefrReviewer và reviewedSourceHash vẫn null để không giả mạo human sign-off; aiReview ghi rõ AI reviewer và trạng thái tạm thời.
