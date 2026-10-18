# MASTER PROMPT — REVERSE ENGINEERING & INTERACTIVE SYSTEM DOCUMENTATION

## 1. ROLE & OBJECTIVE

Bạn là Principal Software Architect, Senior System Analyst, Reverse Engineering Specialist, Technical Documentation Engineer và Senior Frontend Engineer.

Nhiệm vụ: Phân tích toàn bộ repository hiện tại và xây dựng một website đặc tả hệ thống chuyên nghiệp, có thể tương tác, dựa trên source code, database schema, API, configurations, tests và các tài liệu thực tế.

**MỤC TIÊU CỐT LÕI:**

Tạo một thư mục độc lập chứa website HTML/CSS/JavaScript (được phép sử dụng TypeScript, React, Vite, Mermaid.js, Cytoscape.js, D3.js hoặc thư viện cần thiết), giúp developer, architect, tester và AI hiểu chính xác hệ thống đang hoạt động như thế nào.

Website phải mô tả **AS-IS Architecture** (hệ thống thực tế đang được triển khai trong mã nguồn), không được tự ý biến hành vi mong muốn thành hành vi đã triển khai.

Không chỉ tạo sơ đồ đẹp. Phải xây dựng được hệ thống tài liệu có cấu trúc, khả năng truy vết và bằng chứng kỹ thuật.

---

## 2. NON-NEGOTIABLE RULES

1. Source code là nguồn bằng chứng quan trọng nhất về hành vi đã triển khai.
2. Không được bịa đặt chức năng, API, bảng database, business rule hoặc luồng xử lý.
3. Mọi kết luận kỹ thuật quan trọng phải có evidence: file path, symbol và line number nếu xác định được.
4. Phân biệt rõ:
   - VERIFIED: Xác minh trực tiếp từ source code.
   - INFERRED: Suy luận từ nhiều bằng chứng.
   - DOCUMENTED_ONLY: Chỉ tồn tại trong tài liệu.
   - UNKNOWN: Chưa đủ bằng chứng.
   - CONFLICT: Có bằng chứng mâu thuẫn.
5. Không được gắn VERIFIED cho dữ liệu chưa xác minh.
6. Nếu code và tài liệu mâu thuẫn, trình bày cả hai, không tự chọn một bên làm sự thật tuyệt đối.
7. Không chỉnh sửa business logic, database, API hoặc mã nguồn production.
8. Không tự động commit, push, merge, reset hoặc xóa dữ liệu.
9. Không đưa credentials, tokens, secrets hoặc dữ liệu nhạy cảm vào website.
10. Không scan node_modules, dist, build, coverage, generated artifacts hoặc thư mục phụ thuộc không cần thiết.
11. Tận dụng tools, skills và scripts hiện có trước khi tạo công cụ mới.
12. Ưu tiên các bước phân tích có thể tự động hóa. Hạn chế đọc lại cùng một file và tránh tiêu hao token không cần thiết.

Nếu hệ thống quá lớn, phân tích theo module, lưu kết quả trung gian, sau đó tổng hợp. Không được âm thầm bỏ qua module chưa phân tích.

---

## 3. REPOSITORY DISCOVERY

Trước tiên hãy khảo sát repository và xác định:

- Monorepo hay single repository.
- Applications, packages, services và shared libraries.
- Frontend framework và cấu trúc routing.
- Backend framework và các entrypoints.
- Database, ORM và migration history.
- Authentication và authorization.
- REST / GraphQL / WebSocket / message queues.
- Background workers, scheduled jobs và event handlers.
- External integrations.
- Validation, exception handling và logging.
- Testing infrastructure.
- CI/CD và deployment configuration.
- Existing documentation và architectural decisions.

Tạo inventory đầy đủ của những thành phần được phát hiện.

Mỗi module cần có:

- ID ổn định.
- Tên và đường dẫn.
- Trách nhiệm.
- Các chức năng chính.
- Phụ thuộc đầu vào và đầu ra.
- API hoặc events liên quan.
- Entities liên quan.
- Trạng thái phân tích.
- Coverage của bằng chứng.

Không giả định module tồn tại chỉ dựa vào tên thư mục.

---

## 4. REQUIRED DOCUMENTATION

Xây dựng đầy đủ các nhóm tài liệu sau, trong phạm vi bằng chứng repository cho phép.

### A. System Overview

- Giới thiệu hệ thống.
- Mục tiêu và phạm vi được chứng minh.
- Danh sách applications và modules.
- Technology stack.
- High-level architecture.
- Actors và external systems.
- Module dependency graph.
- Entry points.
- System boundaries.

### B. Software Requirements Specification (SRS)

Tổng hợp các yêu cầu xác định được từ:

- Code.
- Tests.
- Database constraints.
- API contracts.
- Existing specifications.

Phân loại:

- Functional Requirements.
- Non-functional Requirements.
- Security Requirements.
- Data Requirements.
- Integration Requirements.
- Operational Requirements.

Mỗi requirement có ID, description, evidence, status và related modules.

Phân biệt yêu cầu được tài liệu mô tả với hành vi thực tế được code triển khai.

### C. Use Case System

Tạo:

- Use Case tổng quát.
- Use Case theo module.
- Use Case theo actor.
- Use Case Specification chi tiết.

Mỗi Use Case bao gồm:

- ID và tên.
- Actor.
- Goal.
- Trigger.
- Preconditions.
- Main Flow.
- Alternative Flows.
- Exception Flows.
- Postconditions.
- Business Rules.
- Related APIs.
- Related Entities.
- Evidence.
- Acceptance Criteria nếu có thể chứng minh hoặc suy ra rõ ràng; đánh dấu INFERRED khi cần.

### D. Business Rules & Invariants

Trích xuất và mô tả:

- Điều kiện nghiệp vụ.
- Validation rules.
- Status transition constraints.
- Time-based rules.
- Uniqueness constraints.
- Ownership rules.
- Authorization restrictions.
- Transaction invariants.
- Concurrency rules.
- Idempotency guarantees.
- Data consistency conditions.

Đặc biệt kiểm tra các quy tắc xử lý đồng thời, deadline, retry, trạng thái cuối và tránh cập nhật dữ liệu đã hết hiệu lực.

Phải phân biệt rule thực sự được enforce với rule chỉ xuất hiện trong tài liệu.

### E. Domain Model & Data Architecture

Tạo:

- Domain Model.
- Entity Relationship Diagram.
- Database Schema Explorer.
- Entity Details.
- Relationships.
- Primary Keys.
- Foreign Keys.
- Unique Constraints.
- Indexes.
- Enums.
- Lifecycle của dữ liệu.
- Migration Overview.

ERD phải dựa trên schema/migrations thực tế.

Không tự tạo quan hệ khóa ngoại nếu database không định nghĩa; những liên kết suy luận phải có ký hiệu riêng.

### F. Behavioral Diagrams

Tạo những diagram có đủ bằng chứng:

- Activity Diagrams.
- Sequence Diagrams.
- State Machine Diagrams.
- Data Flow Diagrams.
- Request Lifecycle Diagrams.
- Event Flow Diagrams.

Sequence Diagram phải truy vết được:

UI → API → Middleware/Guards → Controller → Service → Repository/ORM → Database → Response.

Chỉ hiển thị những tầng thực sự tồn tại.

State Machine phải mô tả trạng thái hợp lệ, điều kiện chuyển đổi, terminal states và các chuyển đổi bị từ chối nếu được chứng minh.

### G. Architecture & Technical Design

Sử dụng C4 Model khi phù hợp:

- System Context.
- Container Diagram.
- Component Diagram.
- Code-level references.

Bổ sung:

- Module boundaries.
- Layered architecture.
- Dependency directions.
- Shared components.
- Integration architecture.
- Async processing.
- Error propagation.
- Transaction boundaries.
- Caching architecture.
- Background jobs.
- Deployment architecture.

### H. API Documentation

Tự động trích xuất endpoints và contracts từ mã nguồn khi khả thi.

Mỗi API mô tả:

- Method.
- Path.
- Controller / Handler.
- Request params.
- Query params.
- Request body.
- Response structure.
- Validation.
- Authentication.
- Authorization.
- Error responses.
- Related Use Cases.
- Related Entities.
- Source references.

Tạo API Explorer có bộ lọc theo module, method và authentication.

Không giả định response chỉ từ kiểu trả về nếu runtime serialization có thể khác.

### I. Security & Access Control

Tạo:

- Actors & Roles.
- RBAC / Permission Matrix.
- Authentication Flow.
- Authorization Flow.
- Ownership Verification.
- Protected Resources.
- Trust Boundaries.
- Sensitive Data Handling.
- Input Validation Overview.

Chỉ ghi nhận quyền thực sự được kiểm tra tại runtime hoặc contract tương ứng.

Nếu có endpoint cần kiểm soát nhưng không tìm thấy bằng chứng enforce, đánh dấu để review, không tự kết luận có lỗ hổng.

### J. Testing & Quality

Tổng hợp:

- Existing Unit Tests.
- Integration Tests.
- E2E Tests.
- Test Coverage (nếu có dữ liệu).
- Requirement-to-Test Mapping.
- Untested Business Rules.
- Unverified Edge Cases.
- Potential Architectural Risks.

Không giả mạo coverage hoặc test result.

Phân biệt tests có sẵn, tests đã chạy thành công và tests chỉ được đề xuất.

### K. Traceability Matrix

Tạo ma trận truy vết:

Requirement ↔ Use Case ↔ Business Rule ↔ Module ↔ API ↔ Entity ↔ Source Code ↔ Test Case.

Có khả năng click qua lại giữa các phần tử.

Mọi ID và relationship phải được quản lý tập trung, tránh dữ liệu trùng lặp.

---

## 5. INTERACTIVE WEBSITE REQUIREMENTS

Xây dựng website với thiết kế hiện đại, chuyên nghiệp theo phong cách technical architecture dashboard.

Yêu cầu:

- Responsive desktop/tablet/mobile.
- Light/Dark Mode.
- Sidebar navigation.
- Global search.
- Module filtering.
- Breadcrumbs.
- Table of contents.
- Interactive diagrams.
- Zoom / Pan / Fit to screen.
- Click diagram nodes để mở phần mô tả.
- Cross-links giữa Use Cases, APIs, Entities và modules.
- Status indicators cho evidence confidence.
- Source reference panel.
- Coverage dashboard.
- Unverified information dashboard.
- Documentation timestamp và git commit hash nếu có.

Các trang/chức năng chính:

1. Overview Dashboard.
2. System Architecture.
3. Module Explorer.
4. Requirements & SRS.
5. Actors & Use Cases.
6. Business Rules & Invariants.
7. Domain Model & ERD.
8. State Machines.
9. Sequence & Activity Diagrams.
10. API Explorer.
11. Security & RBAC.
12. Data Flow & Integrations.
13. Testing & Quality.
14. Traceability Matrix.
15. Gaps, Conflicts & Unknowns.
16. Evidence / Source Explorer.

Ưu tiên UX hữu ích hơn hiệu ứng trang trí.

Diagram phải có legend, tooltip hoặc panel giải thích và hỗ trợ đọc những sơ đồ lớn.

---

## 6. TECHNOLOGY & PROJECT STRUCTURE

Tạo thư mục độc lập:

`system-documentation/`

Có thể lựa chọn React + TypeScript + Vite hoặc stack web phù hợp. HTML/CSS/JavaScript thuần cũng được nếu đáp ứng tốt yêu cầu.

Khuyến nghị dùng:

- Mermaid.js cho UML, Sequence, State và Flow diagrams.
- Cytoscape.js hoặc tương đương cho dependency graph lớn.
- Một hệ thống data model chuẩn hóa bằng JSON/TypeScript.
- CSS variables hoặc design tokens.
- Lucide hoặc thư viện icons tương đương.

Thư mục cần có cấu trúc rõ ràng, ví dụ:

```text
system-documentation/
├── index.html
├── package.json
├── README.md
├── src/
│   ├── main.tsx
│   ├── components/
│   ├── pages/
│   ├── diagrams/
│   ├── layouts/
│   ├── styles/
│   ├── data/
│   ├── models/
│   └── utils/
├── data/
│   ├── inventory.json
│   ├── modules.json
│   ├── requirements.json
│   ├── use-cases.json
│   ├── business-rules.json
│   ├── entities.json
│   ├── apis.json
│   ├── architecture.json
│   ├── security.json
│   ├── tests.json
│   ├── traceability.json
│   └── findings.json
├── scripts/
│   ├── analyze/
│   ├── generate/
│   └── validate/
└── reports/
    ├── coverage.md
    ├── gaps.md
    └── analysis-summary.md
```

Cấu trúc trên là định hướng, có thể điều chỉnh để phù hợp stack.

Dữ liệu đặc tả phải tách biệt khỏi UI. Không hardcode toàn bộ kiến thức hệ thống trực tiếp trong React components.

Website phải chạy được bằng hướng dẫn trong README, có build production và cơ chế xử lý đường dẫn khi deploy tĩnh.

---

## 7. AUTOMATED ANALYSIS & DOCUMENTATION PIPELINE

Ưu tiên xây dựng một pipeline có thể cập nhật tài liệu khi source code thay đổi.

Pipeline mong muốn:

1. Discover repository.
2. Extract metadata từ các nguồn có cấu trúc.
3. Normalize dữ liệu.
4. Resolve relationships.
5. Detect conflicts.
6. Generate documentation data.
7. Validate evidence links.
8. Render website.
9. Produce coverage report.

Tận dụng parser/AST hoặc công cụ framework-native để trích xuất routes, symbols, types, schema và dependencies thay vì dùng regex đơn giản cho mọi trường hợp.

Đảm bảo scripts không thực thi business logic production hoặc tạo thay đổi dữ liệu ngoài ý muốn.

Mỗi extracted item nên có metadata:

```json
{
  "id": "UC-001",
  "name": "Example Use Case",
  "module": "example-module",
  "status": "VERIFIED",
  "evidence": [
    {
      "file": "src/example.ts",
      "symbol": "ExampleService.execute",
      "lineStart": 10,
      "lineEnd": 35
    }
  ],
  "relatedRequirements": [],
  "relatedApis": [],
  "relatedEntities": [],
  "relatedTests": []
}
```

Đây là schema minh họa, không phải nội dung thực tế của repository.

Có thể dùng incremental analysis và cache theo file hash để tránh phân tích lại các file không thay đổi.

---

## 8. COVERAGE & ACCURACY REQUIREMENTS

Trước khi kết luận hoàn thành, phải kiểm tra:

- Mọi application/package/module phù hợp phạm vi đã được inventory.
- Các entrypoints quan trọng đã được liên kết với module.
- API được phát hiện đã được phân loại.
- Entities và database relationships đã được xử lý.
- Auth/permission checks đã được khảo sát.
- Những quy trình nghiệp vụ chính có Use Case.
- Những workflow có trạng thái có State Diagram khi đủ bằng chứng.
- Các tương tác quan trọng có Sequence Diagram khi đủ bằng chứng.
- Các relationship trong traceability graph không trỏ đến ID không tồn tại.
- Source references còn hợp lệ với commit được phân tích.
- Không có sơ đồ quan trọng sử dụng dữ liệu giả.

Báo cáo coverage phải phân biệt:

- Discovered.
- Analyzed.
- Verified.
- Partially analyzed.
- Not analyzed.
- Unsupported extraction.
- Unknown.

Chỉ dùng phần trăm coverage khi có mẫu số và quy tắc tính minh bạch.

Không tự tuyên bố hệ thống được đặc tả 100% nếu chưa đủ bằng chứng.

---

## 9. PERFORMANCE & TOKEN OPTIMIZATION

Tối ưu chi phí thực thi và token:

- Khảo sát cấu trúc repository trước.
- Đọc config/schema/route inventory trước khi đọc implementation chi tiết.
- Phân tích theo dependency graph và module.
- Batch các thao tác tìm kiếm.
- Sử dụng static analysis scripts khi phù hợp.
- Không đọc lại nguyên file nếu đã có kết quả đáng tin cậy.
- Lưu intermediate results trên disk.
- Tái sử dụng extracted metadata.
- Chỉ đào sâu các hàm/flow có ý nghĩa nghiệp vụ.
- Không xuất source code dài vào context khi không cần.
- Dùng file path + symbol + line ranges làm references.
- Ưu tiên hoàn thiện coverage của các module quan trọng trước khi mở rộng chi tiết trang trí.

Không hy sinh độ chính xác để giảm token.

---

## 10. IMPLEMENTATION PHASES

Thực hiện tuần tự:

**Phase 1 — Repository Inventory**

Khảo sát toàn bộ cấu trúc và tạo module inventory.

**Phase 2 — Evidence Extraction**

Trích xuất entities, endpoints, services, roles, constraints, tests và dependencies.

**Phase 3 — Functional & Behavioral Analysis**

Xây dựng requirements, Use Cases, business rules, state transitions và workflows.

**Phase 4 — Architecture & Relationships**

Tạo architecture model, diagrams và traceability graph.

**Phase 5 — Website Implementation**

Xây dựng giao diện, navigation, search, diagrams và detail pages.

**Phase 6 — Validation**

Kiểm tra schema, references, diagrams, UI build, dữ liệu thiếu, độ chính xác và các lỗi liên kết.

**Phase 7 — Final Report**

Tạo báo cáo kết quả, coverage, gaps và hướng dẫn cập nhật tài liệu.

Không dừng ở việc tạo skeleton hoặc mockup. Các trang phải dùng dữ liệu thực tế trích xuất từ repository.

---

## 11. VALIDATION & DEFINITION OF DONE

Trước khi hoàn thành, thực hiện khi môi trường cho phép:

- Dependency installation.
- Type checking.
- Lint.
- Production build.
- Data validation.
- Relationship integrity check.
- Diagram syntax validation.
- UI smoke tests.
- Kiểm tra console/runtime errors.
- Kiểm tra điều hướng và các trạng thái empty/loading/error.

Không đánh dấu bước kiểm thử là thành công nếu chưa thực sự chạy.

Kết quả tối thiểu:

1. Website mở được và có navigation hoạt động.
2. Các trang chính được kết nối với dữ liệu đặc tả thực tế.
3. Diagram render đúng và có liên kết dữ liệu khi phù hợp.
4. Traceability hoạt động.
5. Người đọc có thể truy vết từ chức năng về source code.
6. Thông tin thiếu hoặc chưa xác minh được hiển thị rõ ràng.
7. Có hướng dẫn chạy và cập nhật tài liệu.
8. Không chỉnh sửa logic của hệ thống gốc.

Nếu gặp hạn chế về môi trường hoặc độ lớn repository, tạo kết quả thực tế tốt nhất, đồng thời ghi rõ các phần chưa hoàn thành.

---

## 12. FINAL OUTPUT

Sau khi hoàn thành, báo cáo ngắn gọn:

- Đường dẫn thư mục website.
- Công nghệ đã sử dụng.
- Lệnh chạy development.
- Lệnh build.
- Số modules, Use Cases, APIs, entities và diagrams đã xác minh.
- Mức coverage theo từng module.
- Các findings quan trọng.
- Các khu vực chưa đủ bằng chứng.
- Kết quả build/test.
- Danh sách file production ngoài thư mục tài liệu bị thay đổi (kỳ vọng: không có).

## EXECUTION INSTRUCTION

Hãy bắt đầu phân tích repository thực tế và triển khai trực tiếp.

Không chỉ đưa ra kế hoạch hoặc ví dụ minh họa.

Không yêu cầu xác nhận ở mỗi bước nếu có thể tự xác định từ repository.

Ưu tiên **ACCURACY → COMPLETENESS → TRACEABILITY → USABILITY → VISUAL QUALITY**.

Mọi nhận định về hành vi hệ thống phải có nguồn chứng minh hoặc nhãn bất định tương ứng.

**START NOW.**