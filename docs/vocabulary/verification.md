# Báo cáo triển khai thư viện từ vựng — 2026-10-22

## 1. Phạm vi và Git

- SHA bắt đầu: `bd7c6c283c9035629ca58560d88bfb0b616ec039`.
- Nhánh: `feat/vocabulary-master-library`; giữ nguyên worktree riêng.
- SHA kết thúc mã triển khai: `96bbb4f46411ce593e350c439093296d884037dc`; commit báo cáo được ghi riêng trong lịch sử Git và trong thông báo bàn giao.
- Worktree: `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`.
- Checkout được bảo vệ `D:/Projects/WorkLingo` vẫn ở nhánh `main`, với đúng hai thay đổi có sẵn: `apps/web/next-env.d.ts` và `backups/`. Không sửa, stash, reset hoặc chuyển nhánh tại đó.
- Không push, merge, deploy, chạy migration hay ghi dữ liệu vào DB ứng dụng/production. Chỉ sử dụng PostgreSQL riêng tại cổng 55439 và các DB có hậu tố `_test`.

## 2–3. Khảo sát hệ thống và quyết định kiến trúc

WordBank/LanguageBlock có định danh gắn với lịch sử học; WordBankVersion,
LanguageBlockVersion và LessonVersionWordBank giữ snapshot đã xuất bản.
LessonVocabularyUsage nối từ với ngữ cảnh bài học/chủ đề; mastery và ErrorBank
tham chiếu LanguageBlock. Những định danh và quan hệ này được giữ nguyên.

Chọn Option B: catalog từ vựng tập trung có liên kết được duyệt tới LanguageBlock,
không tự tạo dữ liệu giảng dạy còn thiếu. Xem [ADR 001](architecture.md).

## 4. Mô hình Prisma

Thêm VocabularySource, VocabularyDocument, VocabularyBatch,
VocabularySourceEntry, VocabularyBatchRow, LexicalEntry, LexicalSense,
LexicalPronunciation, VocabularyEntryResolution, LexicalCefrAssociation,
LexicalEntryTopic, VocabularyTopicMapping, VocabularyCollection,
VocabularyCollectionVersion, VocabularyCollectionMember,
VocabularyProgramAssignment, VocabularyCurriculumBinding và VocabularyLegacyLink.
IntermediateTopicGroup có thêm quan hệ cha tùy chọn.

Occurrence và inventory bất biến. Correction lưu cách hiểu đã duyệt, không sửa
raw spelling/POS/hash. Việc xử lý UNKNOWN_POS lưu riêng code, vị trí, hash và
lý do; quyết định đã duyệt và bằng chứng không thể sửa tại chỗ. Quyền sử dụng
được kiểm tra cả trong API và các ràng buộc/trigger PostgreSQL.
Chi tiết: [data-model.md](data-model.md), [api-boundary.md](api-boundary.md).

## 5–6. Quyền sử dụng và độ đầy đủ từng PDF

Người dùng xác nhận chưa có hoặc chưa rõ quyền tái sử dụng LanGeek. Cả năm
nguồn vẫn `BLOCKED_BY_RIGHTS`; năm bản ghi metadata trong DB thử nghiệm đều
`PENDING`. Không tải hoặc trích xuất toàn bộ PDF, không tạo document version,
occurrence hoặc nghĩa canonical từ LanGeek.

| Trạng thái | Kết quả |
| --- | --- |
| Hạ tầng | Hoàn tất phạm vi được phép: schema, parser/pipeline, API, quản trị, kiểm thử, review và tài liệu |
| Parser trên dữ liệu tự tạo | 28 kiểm thử TypeScript; 18 kiểm thử Python đạt |
| Parser trên năm PDF thật | NOT RUN / BLOCKED_BY_RIGHTS |
| Dataset thật đã trích xuất | 0; chưa thực hiện |
| Dataset thật đã duyệt | 0; chưa thực hiện |
| Dataset thật đã nhập vào DB riêng | 0 |
| Dataset thật đã xuất bản | 0 |

Bảng A1–C1 tại [source-completeness.md](source-completeness.md) giữ các số trang
tham chiếu 31/74/85/102/113, đánh dấu mọi phép đo nguồn chưa chạy. Đây không phải
số lượng từ và chưa phải số trang được đo độc lập. Hướng dẫn nguồn thay thế và
phạm vi quyền: [licensing-and-provenance.md](licensing-and-provenance.md).

## 7–8. Occurrence, canonical và quyết định trùng nghĩa

Kiểm tra DB riêng xác nhận: 5 metadata LanGeek, 0 document thật, 0 occurrence
thật, 0 nghĩa canonical LanGeek. Không có tổng từ vựng nguồn nào được suy đoán.

Một luồng trình duyệt dùng dữ liệu tự soạn đã kiểm tra 1 occurrence → 1 nghĩa →
1 thành viên snapshot; sau thu hồi vẫn còn 1 occurrence, 1 nghĩa và 1 thành viên,
phiên bản chuyển ARCHIVED. Đây là fixture kiểm thử, không phải dữ liệu LanGeek.

NEW_ENTRY, NEW_SENSE, REUSE_SENSE và REJECT là quyết định rõ ràng của người duyệt.
Từ đồng dạng khác POS không bị gộp; nhiều occurrence có thể dùng chung nghĩa mà
không mất dòng nguồn. Tái nhập đúng payload không tạo bản sao; đổi payload dưới
cùng định danh gây conflict. Xem [deduplication-policy.md](deduplication-policy.md).

## 9–10. CEFR, chủ đề và chương trình

CEFR lấy từ bằng chứng occurrence; chủ đề dùng IntermediateTopicGroup hiện có;
chương trình dùng LearningProgram thực tế. Ba chiều độc lập. Không tự tạo chương
trình Basic, không suy diễn điểm TOEIC hoặc band IELTS từ CEFR. Gán chương trình
cần lý do, kỹ năng và mục tiêu học; curriculum binding ghim đúng phiên bản đã
xuất bản. Xem [program-mapping.md](program-mapping.md).

## 11. Quản trị

Route `/admin/vocabulary` có giao diện tiếng Việt/Anh: tìm kiếm theo các chiều,
xem nguồn gốc/phát âm/nghĩa, đăng ký nguồn và phạm vi quyền, kiểm tra bản kê JSON,
nhập theo chunk, duyệt và sửa có bằng chứng, đối soát, xuất bản và thu hồi.
Collection có phiên bản, gán chương trình và liên kết curriculum. API yêu cầu
CONTENT_ADMIN hoặc SYSTEM_ADMIN; không thêm endpoint công khai chứa nội dung.
Danh sách phiên bản chỉ trả metadata/số lượng; thành viên, gán chương trình,
binding và provenance có phân trang độc lập, tối đa 100 dòng. CEFR được tổng hợp
trong PostgreSQL, tối đa sáu nhãn cho mỗi mục từ. Xuất bản trả summary nhưng vẫn
kiểm tra quyền toàn bộ snapshot, kể cả thành viên ngoài trang đang xem.

## 12. Kiểm thử và rà soát

Lưu log chi tiết cục bộ trong `.superpowers/sdd/2026-10-22-vocabulary-master-library/`
(được ignore, không đưa secret hoặc nội dung PDF vào Git).

| Kiểm tra | Kết quả đã xác minh |
| --- | --- |
| Contracts toàn bộ | 130/130 đạt |
| Content-format toàn bộ | 135/135 đạt |
| Parser và operations CLI | 35/35 đạt |
| Native geometry/Python | 18/18 đạt với Python runtime kèm Codex |
| API workflow có sửa lỗi review | 28/28 đạt; gồm SQL NULL, terminal retirement, parser UNKNOWN_POS và bảo toàn dữ liệu cũ |
| API tích hợp cuối trên mã ổn định | 42/42 đạt ở bốn file: schema, HTTP, workflow và phân trang |
| Browser client sau sửa exception | 8/8 đạt |
| API phân trang/truy vấn quyền | 9/9 đạt; 125 nguồn/nghĩa cần 8 truy vấn gồm BEGIN/COMMIT; kiểm tra đầy đủ thành viên 1.001 |
| UI/client phân trang | 24/24 đạt ở ba file tập trung |
| Web toàn bộ trên mã ổn định | 137 file / 852 test đạt; 2 worker, test timeout 15 giây; không thay đổi cấu hình production |
| Các file API cũ từng lỗi | Chạy lại 42/42 đạt: progression, backup/restore, placement confirmation, mastery schema; hook timeout được đặt 60 giây cho lượt này |
| Migration DB trống lần cuối | 46 migration, 97 bảng, 0 user và 0 occurrence; đạt |
| Browser thật | Đăng nhập admin fixture; nguồn pending bị chặn; import/review/publish/retire fixture đạt; không lỗi JS; không tràn ngang ở 1440/768/390 px |
| Browser hai trang | 26 dòng tự soạn được nhập/duyệt/xuất bản; chọn thành viên trang hai, gán chương trình và binding curriculum đạt |
| Rà soát độc lập | Reviewer xác nhận đóng cả 4 lỗi và 2 điểm bổ sung về response; không còn finding critical/important trong phạm vi đã review |
| Lint/typecheck/i18n sau các sửa cuối | Toàn bộ workspace đạt; 41 namespace, 2.694 cặp key; 0 lỗi i18n |
| Build sau các sửa cuối | API và web production build đạt; WORKLINGO_API_URL trỏ tới API thử nghiệm 45400 |
| Quét secret / whitespace | Đạt; không có env bí mật/private-key được theo dõi trong Git, git diff --check đạt |

Lượt API toàn bộ ban đầu chạy 227 file: 221 đạt, 5 lỗi, 1 bỏ qua; 1219 test đạt,
15 lỗi, 7 bỏ qua. Lượt này bắt đầu trước các sửa cuối: một lỗi quyền dịch đã sửa
và kiểm tra lại trong workflow; bốn file lỗi còn lại đã chạy lại 42/42 đạt.
Không trình bày lượt toàn bộ ban đầu là một lượt xanh hoàn toàn.

Lượt web ban đầu có timeout 5 giây ở topic-publication; file này chạy riêng
10/10 đạt. Lượt giới hạn hai worker/15 giây sau đó có 845 test đạt và một test
RED mới được nạp trước khi sửa; test đó chạy lại đạt. Lượt cuối giữ mã ổn định
trong suốt quá trình và đạt 852/852, exit 0. Không thay đổi timeout hoặc logic
production để che lỗi.

Không chạy lại nguyên bộ API dài 44 phút sau khi các lỗi đã được kiểm tra lại;
đã chạy đủ bốn file lỗi cũ và bốn file tích hợp của tính năng trên mã cuối. Không
chạy nguyên chuỗi `pnpm verify` hoặc toàn bộ Playwright lịch sử; QA browser của
tính năng chạy trên cổng riêng, dữ liệu tự soạn và không dùng API ứng dụng 4000.
Các giới hạn này không được trình bày thành kết quả kiểm tra đã chạy.

## 13. Toàn vẹn dữ liệu

Audit DB riêng: 0 resolution mồ côi; 0 dữ liệu LanGeek; fixture trình duyệt vẫn
giữ đầy đủ dòng nguồn và thành viên sau thu hồi. Test liên kết legacy kiểm tra
định danh LanguageBlock, snapshot WordBank và mastery qua publish/rollback.
FK ghép ngăn sense/entry không tương thích. Kiểm tra mutation đảo điều kiện cổng
DB bị các assertion từ chối; source repository được giữ nguyên trong phép thử.

## 14. Migration và rollback

Migration chỉ cộng thêm; giữ checksum các migration đã áp dụng. Các migration
004–006 chặn grant NULL, làm ARCHIVED thành trạng thái kết thúc và thêm audit xử
lý exception. Grant NULL cũ làm deployment dừng để xử lý minh bạch; không tự cấp
quyền thay người quản trị. Đã diễn tập trên một DB trống riêng sau các sửa này.

Rollback nghiệp vụ archive snapshot, giữ occurrence, thành viên và tham chiếu
curriculum. Không cung cấp down-migration xóa dữ liệu. Trước rollout thật cần
backup/restore theo quy trình có sẵn và phê duyệt riêng.

## 15. Giới hạn

- Chưa xác minh hình học, hàng, chủ đề hoặc độ đầy đủ của bất kỳ PDF thật nào.
- Adapter native word geometry hỗ trợ năm cấu hình CEFR; OCR hoặc layout chưa
  nhận diện tạo exception, không được coi là nhập thành công.
- Không tự dịch, bịa ví dụ, nghĩa hoặc thông tin liên quan kỳ thi.
- Fixture và tài khoản kiểm thử không phải dữ liệu production; mật khẩu chỉ ở
  cấu hình cục bộ được ignore, không ghi trong tài liệu hoặc commit.
- Chưa triển khai lên DB ứng dụng hoặc website đang sử dụng.
- Chưa benchmark 100.000 dòng hoặc chạy stress concurrency ở quy mô đó; các
  phép thử quy mô lớn nhất được nêu rõ ở bảng kiểm thử, không suy rộng số đo.

## 16. Commit

Các commit theo phần: `5f8f7e8` schema/ADR, `3af2d48` operations/docs,
`aa6d6b7` CLI tests, `83aa69b` parser, `24f547d` native rights gate,
`45f3ca1` manifest CLI, `1c86f80` extraction handoff, `a09dea6` Python CLI,
`1f73102` rights/contracts, `7e8a601` API, `15fee56` quản trị.
`2dbdc1b` chặn grant NULL, terminal retirement và audit xử lý exception.
`f89314f` giới hạn truy vấn/response và `96bbb4f` quản trị theo trang.
Commit báo cáo cuối đứng sau các commit mã triển khai này.

## 17. Bước cần phê duyệt con người

Hạ tầng và kiểm thử độc lập được thực hiện trong phạm vi đã cho phép. Việc nhập
nguồn thật cần quyền sử dụng rõ ràng, tham chiếu văn bản và đúng phạm vi field/use;
sau đó mới đo trang/hash, trích xuất, đối soát và duyệt theo
[import-pipeline.md](import-pipeline.md). Push, merge, deploy, migration DB ứng dụng
và xuất bản nội dung bên thứ ba vẫn cần chỉ thị riêng của người dùng.
