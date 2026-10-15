# Báo cáo triển khai i18n Việt / Anh — 2026-10-14

## 1. Tổng quan

Đã sửa source của WorkLingo để hỗ trợ giao diện `vi` / `en`, mặc định `vi` cho người dùng mới. Chuyển ngôn ngữ cập nhật React context ngay trong workspace, giữ form, câu trả lời, bản nháp và recorder. URL hiện tại được giữ nguyên. Trang 404 và error boundary cũng đã được chuyển sang dictionary. Source đang ở branch `codex/ui-redesign-v2`, chưa commit, push, merge hoặc deploy.

Trạng thái release: **chưa thể đánh dấu toàn bộ Definition of Done đạt**, vì full gate có lỗi curriculum/session/progression đã tồn tại trước i18n. Kết quả cụ thể ở mục 6 và 8; không coi các test chưa xanh là passing.

## 2. Kiến trúc và lý do

- Chọn `next-intl@4.14.9` (MIT, peer hỗ trợ Next.js 16) để dùng ICU interpolation/pluralization thay vì tự viết bộ parser. Chỉ thêm một dependency i18n trực tiếp. Tham chiếu: [next-intl core library](https://next-intl.dev/docs/environments/core-library).
- 26 namespace, 1.614 khóa đối ứng Việt/Anh ở lần kiểm tra hiện tại. Feature import catalog riêng; root chỉ giữ locale, không truyền toàn bộ catalog xuống mọi trang. Hai locale của feature nằm trong feature chunk để đổi ngay mà không remount.
- `useT` kiểm tra tên khóa bằng TypeScript; pure translator dùng được server/client. Có English fallback cho khóa thiếu và marker `namespace.key` cho khóa runtime không tồn tại.
- Cookie/auth SSR sử dụng async cookies của Next.js 16, request-local cache, `no-store` cho `/me`, chỉ forward session cookie tới API nội bộ. HTML lang và metadata hiện có được localized. Browser title cập nhật khi đổi locale mà không refresh route.

## 3. Khu vực đã chuyển đổi

Auth/Login/Register, landing/public, navigation Learner/Admin, theme control, Settings, dashboard, onboarding/placement, Programs/TOEIC availability, curriculum roadmap, mastery/checkpoint/error bank, engagement, session/activity renderers, recording/evaluation/audio settings; IELTS Orientation, Bridge, Integrated Practice, Full Mock và Band Pathway; Admin content/import/preview/publish/audio, curriculum/definition editor, audit, operations/analytics và các authoring workspace IELTS.

Đã chuyển system labels, placeholders, accessible names, loading/empty/error/success states và dynamic status labels. Ngày/số/phần trăm dùng locale-aware Intl; không đổi thời điểm. Các diagnostic machine identifiers vẫn có thể hiển thị ở Admin. Nội dung học và nội dung người dùng được giữ nguyên, không runtime AI translation.

## 4. Lưu và đồng bộ preference

- Guest: cookie `worklingo_locale`, path `/`, SameSite=Lax, một năm, Secure khi HTTPS. LocalStorage chỉ là kênh event giữa tab; storage bị chặn vẫn có thể chuyển và lưu cookie.
- Authenticated: `GET/PATCH /api/v1/me/preferences`, Zod/DTO chỉ nhận `vi` / `en`, dùng auth/validation pipeline hiện có. Lưu `LearnerProfile.locale` của chính tài khoản được xác thực. Body có `userId` bị từ chối.
- Admin thiếu profile: đọc trả `vi` không tạo dữ liệu; save rõ ràng mới upsert default profile, không tạo enrollment/session/progression.
- Precedence: lựa chọn hiện tại → server account preference lúc login/SSR/reload → guest cookie → `vi`. Register có thể gửi lựa chọn guest; client cũ vẫn dùng default `vi`. Login tài khoản khác không kế thừa server preference của tài khoản trước.
- Serialize writes; rollback về locale đã persist; bỏ response cũ và broadcast giá trị rollback. Header `x-worklingo-account-id` tùy chọn chặn save từ tab đang dùng account khác bằng `409 ACCOUNT_CHANGED`.
- Locale event chỉ áp dụng cùng account/guest và không ghi ngược server. Focus đọc `/me` để lấy thay đổi từ thiết bị khác. Khi account cookie thực sự đổi, toàn workspace reload để account data và locale chuyển cùng nhau; đổi ngôn ngữ thông thường không reload.

## 5. File và contract chính

`apps/web/src/i18n/`, `components/language-switcher.*`, root/route layouts, các feature component và catalog; `apps/api/src/users/{users.controller,application/users.service,dto/user-preferences.dto}.ts`; auth registration/user DTO; `packages/contracts/src/locale-preference.contracts.ts`, auth contracts và exports; `scripts/i18n-check.*`; Playwright i18n và các fixture regression xác định English rõ ràng.

`AuthUser.locale` và `RegisterInput.locale` là trường optional tương thích client cũ; API luôn trả supported locale. **Không thay đổi Prisma schema/migration**. Đã đối chiếu baseline và giữ nguyên các thay đổi có sẵn ở session-planner, foundation fixture, workplace-transfer seed, API test configuration, health test và backup/restore scripts.

## 6. Commands và kết quả thật

| Kiểm tra | Kết quả đã xác minh |
| --- | --- |
| `pnpm --filter @worklingo/web test` | 80 file, **364/364 test qua**, gồm sửa review và shared error states |
| `pnpm typecheck` | Toàn workspace qua |
| `pnpm lint` | Toàn workspace qua |
| `pnpm build` | API và Next.js production build qua |
| `pnpm i18n:check` | 26 namespace / 1.614 paired keys, 0 lỗi catalog/ICU/key; 329 candidate unused keys cần đọc theo giới hạn scanner |
| `pnpm test:i18n` | **7/7** test công cụ qua |
| API auth/preferences/services focused | **31/31** ở lượt đầu; preferences sau guard bổ sung **20/20** |
| Contracts trong full gate | **85/85** test qua; content-format **47/47** qua |
| `pnpm verify` | **Exit 1** ở API: 733 test qua, 15 lỗi trong 4 file; cùng tên 15 lỗi baseline, **0 lỗi API mới** |
| Full E2E lượt đầu ổn định | 33 qua, 14 lỗi, 10 chưa chạy do dependency; dùng để tìm lỗi assertion và integration |
| E2E sau sửa regression | Lượt đầy đủ: **49 qua, 3 lỗi, 7 bị dependency bỏ qua**. Lượt riêng cuối **20/20 qua**: 14 i18n desktop/mobile (gồm 404), 2 Admin mobile curriculum/observability, 4 qualification. Không cộng các lượt có coverage trùng nhau |
| Review fixes focused | **21/21** test qua sau 3 finding RED→GREEN |
| Mutation kiểm tra CSS status | Đổi class thành translated status làm **1 test fail**; restore nguyên byte, suite curriculum **6/6 qua** |
| Mandate register validate | `valid: true`, 1 record; không tạo competing backlog hoặc đổi approval của record cũ |

Full `verify` dùng short-circuit, vì API đỏ nên các bước web/build/E2E phía sau không được thực thi trong cùng invocation. Web, build và E2E được chạy riêng; không gọi gate đỏ là xanh.

Log nằm trong `.superpowers/sdd/2026-10-14-i18n-*.log`; baseline gốc ở `.superpowers/sdd/2026-10-14-i18n/baseline-tests.log`. Bằng chứng cuối: `i18n-web-completion.log`, `i18n-e2e-completion.log`, `i18n-build-completion.log`, `i18n-lint-completion.log`, `i18n-typecheck-completion.log`, `i18n-verify-stable.log` dưới thư mục scratch nêu trên. Các log là scratch gitignored, báo cáo này giữ kết luận có thể review.

Đã kiểm tra screenshot Login tiếng Việt 1440px và 375px, không overflow, dấu tiếng Việt đúng. Smoke thực hiện vi→en→vi rồi chụp với `caret: initial`: **0 hydration errors**. Lượt chụp đầu quá sớm dùng Playwright caret hiding đã gây cảnh báo attribute `caret-color` do công cụ chụp sửa DOM trước hydration; đã điều chỉnh cách chụp, không suppress lỗi ứng dụng để che cảnh báo. I18n E2E thu thập page/console hydration errors riêng.

## 7. Lỗi đã tìm và sửa

- Status đã localized bị truyền vào `PublishPanel` prop nghiệp vụ và CSS status classes: trả về machine status, chỉ translate display.
- Validation failure lưu cause nhưng không mở alert: sửa đường render, giữ editor/source.
- Fake URL recorder thay toàn bộ constructor khiến cookie setter lỗi: mock riêng object-URL methods, giữ constructor; recorder/state-switch tests qua.
- SSR exact optional types và translator generic typing: typecheck toàn workspace qua.
- Scanner regex hiểu nhầm plural literals là interpolation: dùng ICU AST; có regression.
- User/tab races: stale account-bound request, focus khi save chưa xong, rollback chuỗi lỗi, hết phiên phải clear guest identity, account focus phải transition dữ liệu cùng locale, broadcast persisted rollback. Review độc lập [I18N_REVIEW.md](I18N_REVIEW.md) ghi 3 P2 finding và bằng chứng sửa.
- Switcher idle tạo status rỗng làm nhiễu accessibility/test page status: chỉ có role status khi saving, vẫn aria-live.
- Regression E2E: cập nhật heading từ redesign cũ, chọn English rõ ràng, ICU singular/plural, localized status text và assertion retry; giữ nguyên assertion ownership, content versions, progress và API identifiers.

## 8. Chưa hoàn thành / chưa kiểm chứng

- 15 API lỗi có trước i18n trong `curriculum-seed.integration.spec.ts` (2), `learning-sessions.integration.spec.ts` (2), `progression.integration.spec.ts` (10), `learning-sessions.service.spec.ts` (1). Liên quan seed/fixture/session planner/progression đang thay đổi trong baseline. Chưa sửa business logic hoặc published data để làm gate xanh.
- Adaptive E2E cũ yêu cầu option 90 phút bị disabled, trong khi seed/planner hiện có cung cấp option này. Đây là cùng khu vực baseline đang đỏ, không đổi expectation để che lỗi.
- Admin content-authoring E2E mới quan sát timeout sau publish N+1: API availability trả `422 CURRICULUM_UNAVAILABLE`, reason `bound_lesson_unavailable`. Trace xác nhận locale learner thứ hai là `en`. Curriculum objective còn bound lesson version cũ; chưa thay binding/published data hoặc bỏ assertion version pinning để làm test qua.
- Admin mobile content-authoring chưa được chạy lại đến cuối sau khi sửa text assertion `Ready`; luồng desktop tương đương vẫn bị chặn bởi curriculum binding, nên chưa xác nhận acceptance version publishing này xanh.
- Chưa benchmark 100.000 người dùng, chưa chạy assistive technology thật, chưa có calibration của người biên tập giáo dục cho toàn bộ dynamic diagnostics.
- Scanner có thể bỏ sót key construction/runtime API prose; candidate unused không đồng nghĩa chắc chắn không dùng. Một số server diagnostic không có localized structured fields được trình bày bằng localized summary và giữ mã gốc.

## 9. Rủi ro còn lại

Gate toàn repository còn đỏ nên chưa sẵn sàng release. SSR cần request đọc account preference, làm các route dynamic; khi API lỗi chỉ có cookie fallback. Account switch từ tab khác reload vì cần bảo vệ identity/data, còn ordinary locale switch giữ nguyên workspace. Browser timezone là fallback khi API không cung cấp timezone cho display. Future learning-content localization cần model/version/provenance riêng và human validation.

## 10. Đề xuất production

Sửa riêng regression fixture/planner/progression nền với test business semantics, rồi chạy full gate xanh; review bản dịch bởi người Việt hiểu ngữ cảnh giáo dục; mở rộng structured API error/diagnostic codes thay exact prose mapping; load-test SSR/auth lookup và chunk budgets; chỉ sau các gate đó mới quyết định release/deploy. Không tự ý push/merge/publish.

## Skill audit

Used: using-superpowers → routing; brainstorming → xác định kỹ thuật dưới mandate autonomous; writing-plans / executing-plans → kế hoạch, ledger và tích hợp; dispatching-parallel-agents → disjoint API/UI slices; git-workflow-and-versioning → baseline và bảo toàn changes; TDD / systematic-debugging → RED/GREEN và root-cause repair; NestJS / React best practices → validation, DI, SSR và client state; frontend-design / ui-ux-pro-max → giữ design hiện có, shared accessible switcher; requesting-code-review / code-review-and-quality / receiving-code-review → review độc lập và sửa finding; verification-before-completion → báo đúng checks.

Not used: skill implement bị hạn chế model invocation; không cài skill mới; không dùng framework workflow chồng lên NestJS; không dùng skill redesign toàn UI vì chỉ localization; không dùng finishing/merge workflow vì full gate còn đỏ và commit/push/merge không nằm trong hành động được thực hiện. Mandate governance được đọc để liên kết roadmap; không tạo/sửa register proposal.
