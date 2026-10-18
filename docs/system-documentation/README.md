# WorkLingo System Atlas

Website tài liệu **AS-IS** tương tác, được tạo từ snapshot working tree của WorkLingo. Toàn bộ mã website, dữ liệu, công cụ và báo cáo nằm trong thư mục này. Không sửa logic production hoặc database.

## Mở website

Yêu cầu Node.js 20+ và npm. Từ PowerShell:

```powershell
cd D:\Projects\WorkLingo\docs\system-documentation
npm ci --ignore-scripts
npm run dev
```

Mở **http://127.0.0.1:4173/**. `dev` phục vụ snapshot đã lưu, không tự phân tích lại repository. Nếu dependencies đã cài, chỉ cần `npm run dev`. Không mở `index.html` trực tiếp bằng `file://`, vì trình duyệt cần fetch JSON qua HTTP.

Đổi port khi cần:

```powershell
$env:DOCS_PORT = '4174'
npm run dev
```

## Build và kiểm chứng

```powershell
npm run analyze    # Read-only source/schema analysis; writes only documentation data/reports
npm run verify     # Tests, ESLint, model checkJs/types, references/graph validation, production build
npm run preview    # Serve production dist on port 4173
```

Trong terminal khác, khi preview đang chạy:

```powershell
npm run smoke
```

Smoke test dùng Chromium của Playwright. Nếu máy chưa có browser: `npx playwright install chromium`. Đây chỉ là browser kiểm thử website tài liệu; các test production/DB của WorkLingo **không** được thực thi.

`npm run build` tạo **dist/** độc lập, chỉ chứa HTML, CSS, browser JavaScript, JSON và Mermaid đã bundle cục bộ. Có thể đưa nguyên nội dung dist lên static HTTP host, kể cả thư mục con. Assets dùng đường dẫn tương đối; điều hướng dùng hash, không cần server rewrite. Không cần CDN, API WorkLingo hoặc database để đọc website. License Mermaid và thông báo third-party của bundle được giữ trong vendor.

## Nội dung và cách dùng

- 16 mục: tổng quan, kiến trúc, module, SRS, use case, quy tắc nghiệp vụ, domain/ERD, state, sequence/activity, API, bảo mật, data flow/integrations, kiểm thử, traceability, gaps và evidence.
- Tìm theo tên, ID, symbol, đường dẫn, actor hoặc thuộc tính lồng nhau; có lọc module/status và method/authentication cho API. `Ctrl+K` focus ô tìm kiếm.
- Click bản ghi để mở chi tiết, liên kết hai chiều và nguồn. Nguồn gồm path, symbol, line span và SHA-256; snapshot không đóng gói toàn bộ source hay credentials.
- Diagram có zoom, pan, fit và điều khiển bàn phím. Các nút có nodeMap mở chi tiết khi click/Enter. Danh sách liên quan cung cấp đường truy cập thay thế.
- Ma trận quyền: mục **Bảo mật → API role metadata matrix**. Giá trị `pass-role-check` chỉ nói về role metadata; ownership, session validity, rate limit và service rules vẫn có thể từ chối.
- Use cases có actor, trigger, preconditions, main/alternative/exception flows, postconditions, business rules và acceptance criteria. Các tiêu chí suy luận được ghi nhãn INFERRED.
- Trong traceability, liên kết Use Case → Requirement/Rule do người phân tích ánh xạ được ghi INFERRED trong `relationships`; không phải kết quả runtime/test coverage.

## Ý nghĩa độ tin cậy

| Nhãn | Ý nghĩa |
|---|---|
| VERIFIED | Có bằng chứng trực tiếp cho nhận định cụ thể trong source/schema/test declaration; không tự đồng nghĩa đã chạy test, đang deployed hoặc toàn module được xác minh. |
| INFERRED | Tổng hợp/suy luận có cơ sở; có thể cần xác nhận thêm. |
| DOCUMENTED_ONLY | Được mô tả trong tài liệu, chưa được chứng minh là hành vi đã triển khai. |
| UNKNOWN | Thiếu bằng chứng hoặc nằm ngoài phần đã đọc sâu. |
| CONFLICT | Có bằng chứng hai phía không khớp; cần review. |

Mọi module được đánh dấu **PARTIALLY_ANALYZED**. File coverage có mẫu số minh bạch: số file được parser/metadata extractor xử lý chia số file phát hiện trong scope; **không phải statement/branch, test coverage hay độ đầy đủ nghiệp vụ**. Xem [coverage](reports/coverage.md) và [gaps](reports/gaps.md).

## Pipeline và cấu trúc dữ liệu

```text
scripts/analyze/core.mjs       TypeScript AST routes and graph/evidence validators
scripts/analyze/extract.mjs    Discovery → AST/DMMF → normalized registry → relationships → reports
scripts/validate/validate.mjs  Source hashes, line bounds, IDs, FKs, coverage denominators, secret patterns
data/curated-*.json            Reviewed behavioral facts and citation hashes
data/relationships.json       Central analyst mapping of use cases to requirements/rules
data/system.json              Canonical generated registry consumed by the UI
data/*.json                   Generated per-kind views, inventory and traceability
src/                          UI/model/diagrams/styles; no application business logic
reports/                      Coverage, gaps, analysis, verification and screenshots
dist/                         Portable generated production website (ignored by Git)
```

`analyze` dùng TypeScript compiler AST cho controllers, decorators, tham số, DTO/type declarations, calls/imports và literal test titles. Prisma DMMF parser đọc models/enums/relations từ schema; FK chỉ lấy ở phía có `relationFromFields`. Index definitions lấy từ schema lines. Migration overview dùng extractor SQL có giới hạn cho CREATE TABLE/FK, không giả định đã parse toàn bộ semantics SQL.

Các class/module registrations và imports cho biết cấu trúc khai báo, không chứng minh mọi nhánh conditional đang hoạt động. API return types và Swagger annotations là declared contracts; không suy ra runtime response chỉ từ type. Một số service-level validation/errors được giải thích trong reviewed use cases; phần còn lại vẫn chưa đủ bằng chứng.

Scope: apps, packages, scripts, infra, tài liệu hiện có, selected root configs và .github nếu tồn tại. Loại trừ node_modules, generated/build/coverage, runtime data, .env, logs, binaries, drafts, skill/governance internals. Không import/khởi động business application, chạy migration, seed hoặc query database.

## Cập nhật tài liệu

1. Chạy `npm run analyze`, sau đó `npm run verify`.
2. Nếu source dùng trong curated record đã đổi, analyzer dừng với **Stale curated evidence**. Đọc lại implementation/test tương ứng, sửa nhận định và line span, rồi cập nhật SHA-256 trong đúng `data/curated-*.json`. Không xóa hashes hàng loạt hoặc tự gắn lại VERIFIED.
3. Chỉnh mapping trong `data/relationships.json` nếu requirements/use cases/rules đổi; giữ ID ổn định.
4. Chạy lại analyze/verify và smoke test. Đọc reports/coverage.md cùng gaps.md; không tự nâng module thành fully analyzed.

Lần đầu một curated citation chưa có hash, analyzer chốt hash của snapshot đang đọc. Các lần sau source đổi sẽ bị phát hiện. Đây là kiểm tra freshness ở cấp file, không tự chứng minh một line span chứa đủ nội dung hỗ trợ nhận định; việc review semantic vẫn cần con người/agent đọc source.

Để kiểm tra SHA-256 của file đã review trong PowerShell:

```powershell
(Get-FileHash -Algorithm SHA256 -LiteralPath D:\Projects\WorkLingo\apps\api\src\auth\auth.controller.ts).Hash.ToLowerInvariant()
```

## Báo cáo và giới hạn

- [Analysis summary](reports/analysis-summary.md): commit/time/counts và exclusions.
- [Per-module coverage](reports/coverage.md): structural numerator/denominator và số use cases/rules đã review.
- [Gaps/conflicts](reports/gaps.md): bao gồm README so với live-provider capability, contract correlation ID và các câu hỏi về lease/side-effect, retry/backup/deployment.
- [Testing/quality](reports/quality.md): tests được phát hiện, requirement mapping và những rules chưa có liên kết test trực tiếp; không suy ra chưa có test chỉ vì chưa có mapping.
- `reports/verification.json`: lệnh checks thực sự chạy và kết quả.
- `reports/ui-smoke.json`: checks trình duyệt, số diagram render và console errors.
- `reports/mutation-check.json`: thử đảo điều kiện duplicate-ID validator để xác nhận test phát hiện sai lệch.

Không có runtime code-coverage measurements, production test results, live schema validation hoặc xác nhận deployment/provider credentials trong báo cáo này. Typecheck giới hạn ở model dùng chung và registry types; toàn bộ browser/scripts JavaScript đi qua ESLint, parsing/bundling và smoke checks phù hợp. Những module chỉ có structural inventory được chỉ rõ trong coverage.

Dependency tooling riêng của tài liệu giữ Prisma parser 6.19.1 tương thích schema repository. Các overrides deepmerge-ts/effect và KaTeX xử lý advisories trong dependency tree; metadata 68 entities/23 enums được đối chiếu không đổi sau cập nhật. Mermaid được cập nhật trong package này, không sửa dependency của ứng dụng WorkLingo. Xem `reports/dependency-audit.json` cho kết quả audit tại thời điểm chạy.
