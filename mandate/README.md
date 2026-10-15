# Mandate Steward — WorkLingo

Sổ đề xuất cải tiến có bằng chứng. Mặc định: **ghi nhận và đề xuất**. Xem [INDEX](INDEX.md) để theo
dõi; roadmap/plan hiện tại vẫn quản lý việc triển khai. Phê duyệt công cụ này không phê duyệt các
đề xuất mà nó tìm ra.

## Cách dùng

Yêu cầu agent: `Dùng $mandate-steward audit luồng learner/audio, đọc tối đa các file liên quan;
ghi bằng chứng và đề xuất trong mandate/, dừng sau triage, không triển khai code.`

```sh
node .agents/skills/mandate-steward/scripts/mandate.mjs --help
node .agents/skills/mandate-steward/scripts/mandate.mjs find --query "audio fallback"
node .agents/skills/mandate-steward/scripts/mandate.mjs create --input proposal.json --date 2026-10-14
node .agents/skills/mandate-steward/scripts/mandate.mjs transition --id MND-20261014-001 --status triaged --input decision.json
node .agents/skills/mandate-steward/scripts/mandate.mjs validate
node --test .agents/skills/mandate-steward/scripts/mandate.test.mjs
```

Shortcut: `pnpm mandate:check` và `pnpm test:mandate`. Hai gate này cũng được thêm vào `pnpm verify`
để các thay đổi register/công cụ sau này không bỏ qua kiểm tra. Không cần chạy toàn bộ app suite
khi chỉ kiểm chứng tooling mandate.

`proposal.json`: điền [template JSON](templates/mandate.json) với bằng chứng thật, không dùng nguyên
placeholder. Nội dung Markdown theo [template](templates/mandate.md). Tất cả lệnh nhận `--root PATH`;
ngày mặc định UTC nếu không truyền `--date`. Frontmatter dùng JSON hợp lệ nằm giữa dấu `---`
(một tập con của YAML). [Schema](../.agents/skills/mandate-steward/references/mandate.schema.json)
và [governance](../.agents/skills/mandate-steward/references/governance.md) là contract chính thức.

Decision JSON ví dụ để triage:

```json
{"actor":"named-owner","reason":"Evidence and value reviewed","owner":"named-owner"}
```

Approved cần thêm `reference` trỏ đến nguồn xác nhận thật của người có quyền. Implementing cần plan
tồn tại và approval còn khớp scope. Verified cần `checks` gồm `command`, `result: "passed"`,
`reference` tới kết quả thực tế. CLI chỉ ghi trạng thái, không chạy code/test/migration theo metadata.
Một tên actor hay file approval không chứng minh người đó đã duyệt: agent phải kiểm tra nguồn.

## Kích hoạt audit

| Dịp | Prompt đề nghị | Đầu ra |
| --- | --- | --- |
| Theo yêu cầu | Audit `<scope>`, ngân sách `<files/time>`, ghi nhận/đề xuất | Report, mandate mới hoặc liên kết item cũ |
| Refinement/sprint review | Rà vùng thay đổi của Increment/Phase/plan hiện tại và bằng chứng deferred | Đề xuất cho chủ backlog quyết định, không tự thêm sprint |
| Trước release | Rà theo RELEASE_CHECKLIST và qualification report hiện có | Bằng chứng/gap; không tự đánh dấu human approval |
| Tự động sau này | Scheduler gọi cùng skill, proposal-only, một writer | Report và captured proposals cho người duyệt |

Chưa có lịch tự chạy. Nếu muốn ngày/tuần: có thể cấu hình automation của Codex khi người dùng yêu
cầu, hoặc GitHub Actions với agent runner đã được cấp quyền. `SKILL.md` tự nó không chạy 24/7.
Runner tương lai cần checkout đúng revision, giữ secret ngoài log, serialize register writes và
chỉ xuất report/patch cho review; không merge/deploy/migrate/approve. Trạng thái không đổi không cần
thông báo; báo findings mới, blocker hoặc lỗi thực sự. Không tạo runner/cloud/chi phí trong v1 này.

## Quyền sở hữu và phục hồi

`items/`: đề xuất đang theo dõi. `archive/`: verified/rejected đã lưu outcome. `reports/`: audit và
verification, gồm cả giả thuyết chưa đủ bằng chứng. `templates/`: mẫu sử dụng lại. INDEX được sinh
từ item; không sửa thủ công. Nếu INDEX stale sau gián đoạn, kiểm tra item rồi chạy `reindex`/`validate`.
Lock `.lock` chỉ được dọn sau khi xác minh writer đã dừng. Tool không tự sửa/đóng/triage hàng loạt.

Nếu archive/đổi tên bị gián đoạn, công cụ giữ journal `.pending.json`. Kiểm tra journal và writer,
sau đó chạy `node .agents/skills/mandate-steward/scripts/mandate.mjs recover`. Lệnh này hoàn tất
đúng thao tác đang dở và dựng lại INDEX; nó từ chối nếu file gốc/đích đã bị sửa. File được ghi vào
staging trước khi xuất hiện ở tên chính thức; yêu cầu local filesystem hỗ trợ hard link cùng volume
(NTFS hiện tại đã kiểm thử). Không cam kết an toàn trước mọi kiểu mất điện/hỏng ổ đĩa.

Tích hợp Scrum hiện dùng tham chiếu `backlog_reference`, `plan_reference`, `sprint_reference` tới
artifact đã tồn tại. Không tạo sprint board độc lập. Không lưu raw giọng nói, câu trả lời học viên,
token, key hoặc dữ liệu cá nhân trong report.
