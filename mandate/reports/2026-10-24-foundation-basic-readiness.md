# Phân tích mở Cơ bản / Mất gốc

- Ngày: 2026-10-24 (Asia/Saigon); tác nhân: Codex.
- Yêu cầu: phân tích cả quản trị và luồng học viên; chưa phải yêu cầu triển khai/mở dữ liệu/publish.
- Baseline: feature branch codex/fix-ai-lesson-generation, commit 69b0370; code sạch khi bắt đầu. PR18 đang được kiểm chứng riêng.
- Phạm vi có mục tiêu: catalog, access policy, nhập học, admin navigation/import/curriculum, Foundation format, schema và aggregate DB local. Không khảo sát toàn repo; không truy cập nội dung học viên cá nhân.
- Skills: mandate-steward + governance; brainstorming để phân tích lựa chọn; git/review/verification dùng riêng cho PR18.

## Kết luận

Chưa thể mở hoàn chỉnh bằng cách bật menu hay đổi COMING_SOON sang AVAILABLE. Có nền tảng tái sử dụng, nhưng còn thiếu workspace đúng chương trình, nhập học Beginner và nội dung đã duyệt/publish. Khuyến nghị mở theo thứ tự Admin → curriculum và bài pilot → enrollment/session → mở cho học viên sau kiểm chứng.

## Bằng chứng đã xác minh

| Phần | Quan sát | Nguồn |
| --- | --- | --- |
| Catalog | Hiện có một Beginner gộp Foundation/Pre-A1–A2, trạng thái COMING_SOON; chưa có hai program riêng Mất gốc/Cơ bản. | apps/api/src/learning-programs/domain/program-catalog.ts:14 |
| Admin | Mất gốc/Cơ bản là option disabled; navigation thật mới có Intermediate/IELTS. | apps/web/src/features/admin-dashboard/admin-sidebar.tsx:62 |
| Hạ tầng soạn bài | Có 7 loại Foundation, template, objective/evidence và curriculum dùng chung; template chỉ là scaffold TODO, không phải bài đã sẵn sàng. | packages/content-format/src/foundation-templates.ts:13; packages/content-format/src/foundation-metadata.ts:4 |
| Gắn chương trình | Tạo path đã nhận programId; nếu bỏ trống mặc định Intermediate. Workspace mới phải truyền đúng Beginner để tránh gắn nhầm. | apps/api/src/admin-curriculum/application/admin-curriculum-command.service.ts:135 |
| Access | Allowlist chỉ có Intermediate/IELTS. Đổi trạng thái DB không đủ để mở Beginner. | apps/api/src/learning-programs/domain/program-availability.ts:14 |
| Nhập học | Self-placement/placement khởi tạo Intermediate; candidate onboarding giới hạn Intermediate. Activation yêu cầu enrollment/currentLevel có sẵn, không tạo entry enrollment cho Beginner. | apps/api/src/learning-programs/application/program-context.service.ts:80; apps/api/src/onboarding/application/onboarding.service.ts:216; apps/api/src/learning-programs/application/program-context.service.ts:66 |
| AI | JSON generator hiện là Intermediate B1/B2. Không coi thay nhãn menu hoặc lấy JSON đó nguyên trạng là authoring Foundation. | packages/contracts/src/intermediate-topic-generation.contracts.ts:10 |
| Tương thích | Quyết định D-036 giữ Foundation legacy/enrollment/snapshot hiện có, không tự chuyển chúng sang Beginner. | docs/DECISIONS.md:333 |

Aggregate DB chính local (127.0.0.1:55432/worklingo), đọc bằng Prisma ngày khảo sát:

| Dữ liệu | Số lượng |
| --- | ---: |
| LearningProgram | 0 |
| Lesson | 0 |
| LessonVersion PUBLISHED | 0 |
| LessonVersion có Foundation metadata | 0 |
| VocabularySourceEntry | 8744 |

Đây là trạng thái môi trường sau đợt dọn DB đã yêu cầu trước đó; không kết luận mất dữ liệu ngoài phạm vi này. Nội dung được admin tạo sau thời điểm khảo sát có thể làm thay đổi các số đếm. Lệnh: node .superpowers/ai-lessons/foundation-basic-db.cjs; kết quả aggregate được giữ trong scratch ignored, không chứa learner identifiers. Chỉ SELECT/count, không seed hoặc ghi DB.

## Hai phương án sản phẩm

| Phương án | Ưu điểm | Chi phí / giới hạn |
| --- | --- | --- |
| A — Một program Beginner, hai path/lộ trình Mất gốc và Cơ bản (khuyến nghị) | Phù hợp catalog hiện có, dùng chung enrollment/roadmap và prerequisite graph, ít thay đổi contract hơn. | Cần quyết định rule vào lộ trình, chuyển cấp và cách hiển thị hai mục Admin; catalog học viên có thể vẫn một cửa vào với hai lộ trình. |
| B — Hai program riêng Foundation và Basic | Hai cửa vào và tiến độ program tách biệt. | Đổi catalog/slug/contracts/navigation/seed/admission; thiết kế chuyển chương trình và bảo toàn lịch sử. Không tự migration Foundation legacy. |

Phân tầng sư phạm đề xuất, chưa phải chuẩn đã hiệu chuẩn: Mất gốc hướng Pre-A1→A1, nội dung và chỉ dẫn từng bước, ưu tiên từ A1 đã duyệt; Cơ bản củng cố A1→A2 và dùng từ A1/A2. Cấp của từ không chứng minh cấp của toàn bài hay trình độ người học. Không quy đổi tự động sang điểm TOEIC/IELTS.

## Các đợt triển khai đề xuất (chưa được duyệt)

1. **Admin trước:** cấu hình program/path rõ ràng, workspace Mất gốc/Cơ bản, chủ đề, nhập/sửa/xem trước/validate. Tái sử dụng Foundation format 1.1 và objective/evidence, kho từ đã duyệt; JSON/AI cần schema và policy riêng. Giữ admin xem/sửa trước khi lưu và publish tường minh.
2. **Nội dung pilot:** giáo viên duyệt mục tiêu, bài/từ mẫu, đáp án, distractor, dẫn chứng và audio; đủ bốn kỹ năng. Tăng thời lượng bằng hoạt động thực hành, không bằng kéo dài bài đọc. Chỉ bật duration khi planner đủ nội dung phù hợp, không hứa hỗ trợ 90–150 phút từ scaffold hiện có.
3. **Học viên:** thiết kế entry enrollment cho Beginner, self-placement/placement phù hợp, route/catalog allowlist và readyness gate; roadmap/prerequisite/checkpoint/mastery theo program. Học viên mới học được bài đã publish; sai program/archived/missing content bị chặn; lịch sử resume theo version.
4. **Mở có kiểm soát:** fixtures DB test cách ly, integration/E2E admin→publish→enroll→learn→refresh/resume→checkpoint, desktop/mobile. Chỉ bật local cohort sau khi duyệt nội dung và đạt tiêu chí; không tự public release.

## Nghiệm thu tối thiểu

- Tạo/nhập bài từ đúng workspace gắn đúng Beginner/path, không vô tình mặc định Intermediate.
- AI (nếu được chọn triển khai) chỉ dùng từ mục tiêu từ kho đúng scope; metadata nguồn và REVIEW_REQUIRED cho nội dung AI; không tự publish.
- Không mở chương trình rỗng: có path/level/mission và bài bốn kỹ năng đã duyệt/publish, audio thật hợp lệ cho phần nghe/nói.
- New enrollment có level đầu hợp lệ; chọn/chuyển lộ trình có revision/idempotency; bảo toàn progress/session legacy.
- Các bài/lộ trình chưa được duyệt không xuất hiện trong luồng học viên; không bypass policy bằng URL.
- Full relevant tests, typecheck/lint/build và E2E độc lập; kỹ thuật xanh không thay thế duyệt sư phạm.

## Deduplication và điều chưa biết

- Đã find cả items/archive theo foundation, basic và cụm tiếng Việt: không có mandate trùng. MND-20261015-001 chỉ về Intermediate, giữ nguyên không sửa approval.
- Canonical backlog: docs/IMPLEMENTATION_ROADMAP.md, Increment 1–3 và program context; tái sử dụng docs/superpowers/plans/2026-10-04-foundation-learning-slice.md, docs/superpowers/specs/2026-10-22-admin-sidebar-ia-design.md và D-029/D-030/D-036. Không tạo sprint board hoặc sửa roadmap.
- Chưa chọn A/B; chưa có bộ bài pilot được giáo viên duyệt, tiêu chí đầu vào/đầu ra/điểm chuyển cấp, nội dung Pre-A1 được kiểm định, quy tắc AI riêng và phạm vi duration. Đây là các quyết định cần chốt trước khi code.
- Chưa kiểm chứng E2E Beginner đang học được: access hiện bị chặn và DB chưa có curriculum. Không tạo learner thử, không seed/publish/migration để phục vụ phân tích.
- Đề xuất được capture riêng, trạng thái captured, chưa có implementation approval. Validation register phải pass trước bàn giao.

## Kết quả capture

- MND-20261024-001: captured, owner chưa được chỉ định, không có approval triển khai.
- CLI mandate validate: valid=true, count=3.
- Phạm vi thay đổi dữ liệu tương lai được đánh dấu risk high; lần khảo sát này chỉ đọc DB và ghi tài liệu.

## Bổ sung phân tích curriculum/video (2026-10-24)

Xem [thiết kế mở rộng](../../docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md). Phát hiện mới: Unit có thể ánh xạ Mission; storage hiện đọc Buffer nên chưa đủ cho video lớn; roadmap/prerequisite dùng latest/exact revision nên cần policy cohort khi bổ sung video; progression cùng Path chưa tự chuyển Mất gốc sang Cơ bản. MND-20261024-001 được mở rộng ở trạng thái captured, không có approval triển khai. Snapshot PR18 ở phần đầu là lịch sử; PR18 đã merge tại 752c19c và không bị thay đổi.
