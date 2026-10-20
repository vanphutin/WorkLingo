# WorkLingo Liquid Glass — Phase 0 UI audit

Ngày: 2026-10-19, Asia/Saigon. Phạm vi được yêu cầu: discovery, baseline và đề xuất; chưa phê duyệt implementation.

## A. Current Architecture

- Checkout: `D:/Projects/WorkLingo`, branch `main`, HEAD `7a5e383763ccd63c4befa4ab07a5559ba7cabfbe`. Baseline là working tree hiện tại, không phải HEAD sạch.
- pnpm 10.34.1 workspace `apps/*`, `packages/*`; Node 20.20.1. Web: Next 16.3.8, React/React DOM 19.3.0, TypeScript 5.9.3, next-intl 4.14.9, Zod 4.6.5. Vitest 3.2.6 và Playwright 1.63.0. Phiên bản lấy từ manifest và runtime local, không suy từ brief.
- Next App Router: **34 page routes, 14 layouts**; public 1, auth 2, learner 17, admin 14. Hai boundary `error.tsx`, `not-found.tsx` được theo dõi riêng, không cộng thành route có URL mới. Xem [coverage](03-route-coverage.md) và [source inventory](evidence/source-inventory.json).
- Root server layout lấy locale/user preference, metadata và dựng `LocaleProvider`, `AuthenticationTransition`, `LocalizedPageTitle`. Import order hiện tại: tokens → globals → workspace → learning. Một số feature import CSS riêng; cần xét cascade sau navigation.
- Learner/admin shells là Client Components, kiểm tra user qua API. Learner redirect khi onboarding pending hoặc hết phiên; admin yêu cầu `CONTENT_ADMIN` hoặc `SYSTEM_ADMIN`. Đây là lớp UI guard; không thay thế quyền của backend và không phải quyền redesign được mở rộng.
- 3 shared component files: `WorkspaceNavigation`, `ThemeControl`, `LanguageSwitcher`; **53 feature TSX files** trong 23 feature directories. Đây là số file, không phải số lượng React exports hay UI primitives. Không có thư mục `src/hooks`/`src/contexts`; hooks nằm gần feature, locale context ở `i18n/provider.tsx`.
- `lib/api/` sở hữu typed API clients; session/checkpoint/evaluation/recording state nằm trong feature hooks. NestJS/PostgreSQL và các shared contracts/content-format là ranh giới bảo toàn. Không có lý do đổi backend cho redesign.
- Existing V2: [design system](../UI_DESIGN_SYSTEM_V2.md), [audit cũ](../UX_AUDIT.md), [report cũ](../UI_REDESIGN_REPORT.md), [execution plan](../superpowers/plans/2026-10-14-ui-redesign-v2.md). Các tài liệu cũ là lịch sử, không phải bằng chứng runtime của ngày hôm nay.

## B. UI Audit

### Theme, CSS và component ownership

`styles/tokens.css` đang dùng nền warm paper/navy/teal, các tên như `--surface`, `--foreground`, `--primary-fill`, `--control-border`. Có spacing, radius, typography, width và motion tokens. Dark palette được khai báo cả trong `[data-theme='dark']` và system media query; migration phải giữ hai nhánh đồng bộ.

`lib/theme.ts:1` dùng `worklingo:theme:v1`; static head script đọc light/dark trước paint. System mode bỏ attribute và dùng CSS; `ThemeControl` dùng `useSyncExternalStore`, catch storage failure, storage event đồng bộ tabs. **Tái sử dụng cơ chế này.** Tài liệu V2 còn mô tả select, trong source hiện tại control là button tuần hoàn system/light/dark.

| Nhóm | Thành phần thật / style owner | Điều cần giữ khi migration |
| --- | --- | --- |
| Shell/navigation | Root, learner/admin layouts; WorkspaceNavigation; `workspace.css` | URL, aria-current, role visibility, skip link, native details |
| Auth/public | HomePage; AuthPage/AuthForm; `landing.css`, `auth.module.css` | Submit, validation, authenticated destination; ví dụ ngôn ngữ hiện có |
| Learning | DashboardView, SessionShell, ActivityRenderer; reading/listening/speaking/writing renderers, support panels; `globals.css`, `learning.css` | Drafts, autosave/checkpoint, UUIDs, timers, answers, consent, immutable lesson version |
| Media/feedback | LessonAudioPlayer, BrowserSpeechControls, EvaluationFeedback; audio settings CSS | Native playback, recording tracks, explicit source fallback, retry/deletion handlers |
| Roadmap/evidence | CurriculumRoadmap, EngagementPanel, MasteryWorkspace/Overview, ErrorBankPanel, CheckpointPanel | Evidence nguồn server, skill gates, pagination, confirm level |
| IELTS | OrientationPlayer; Bridge catalog/player; Integrated launcher/player; BandPathway; Mock catalog/player | Snapshot/version, staged progress, server timers, expiry, submit, review |
| Admin authoring | ContentList/NewContentImport/ContentAuthoringWorkspace; SourceEditor, LessonPreview, ValidationPanel, PublishPanel, AudioPreview; curriculum and IELTS editors | Unsaved source, optimistic revision, validate/publish ordering, permission |
| Admin operations | AuditWorkspace, OperationsWorkspace, AnalyticsWorkspace | Filters, pagination, diagnostic identifiers, privacy-safe payloads |
| Preferences | Learner settings hub, AudioSettingsPanel, AdminAudioSettingsPanel, AiSettingsPanel | Existing preference APIs, configured-provider status, no exposed secrets |

22 CSS files, 10,010 lines theo PowerShell line count. Static inventory ghi **123 hex occurrences ngoài tokens.css, 258 rgb/hsl calls ngoài tokens.css, 1,068 `!important`, 37 `transition: all`**. Đây là số occurrence, không tự động là số lỗi: rgba/shadow và màu editor có thể hợp lệ. CSS line count trong JSON có thể cao hơn 1/file do trailing newline. Những file tập trung literal: curriculum (83 hex), AI settings (17), admin audio (9), mastery/settings (6 mỗi file). Kiểm tra từng semantic role trước khi thay, không search-replace màu hàng loạt.

### Observed findings

Priority dưới đây là ưu tiên đề xuất; risk P0–P3 ở coverage mô tả hậu quả regression, không khẳng định sản phẩm đang có lỗi P0.

| ID | Source evidence / quan sát | Priority | Hướng xử lý và acceptance |
| --- | --- | --- | --- |
| F01 | `styles/tokens.css:1`: palette teal hiện tại, chưa có surface/glass semantic API theo brief; chỉ 2 backdrop declarations rời rạc ở mastery/AI CSS | P1 | Extend cùng token source; alias tương thích; dùng một GlassSurface, solid content, fallback rõ ràng |
| F02 | `features/admin-curriculum/curriculum.css`, `features/ai/admin-ai-settings.css`, `app/(learner)/settings/settings.css`: literal colors, specificity và `!important` dày | P1 | Migrate theo owner; kiểm tra light/dark + system dark và chuyển route, giảm override sau khi consumer đã đổi |
| F03 | `features/learning-session/evaluation-feedback.tsx:270`: popup `role="dialog" aria-modal="true"`; toàn file không có focus trap/restoration, Escape hay inert background | P1 | UI-only overlay focus lifecycle; test open/Tab/Shift+Tab/Escape/return focus. Đây là source finding trên thay đổi có sẵn; chưa có authenticated browser reproduction |
| F04 | `app/(learner)/settings/settings.css:340`: focus-visible select loại outline; wrapper controls override xuống 34px | P1 | Restyle focus ring và hit target ~44px; đo rendered keyboard focus/contrast, không kết luận chỉ từ hex |
| F05 | `app/landing.css:119`, `:132`, `:296`: ambient/pulse infinite; public Chromium sampling thấy 10–11 animation lặp đang chạy ở home | P2 | Static ambient wash mặc định, motion có mục đích; giữ nội dung và tương tác thật. Không tự diễn giải mọi animation là WCAG violation |
| F06 | Không có `prefers-contrast`, `forced-colors`, `prefers-reduced-transparency` trong CSS scan; có reduced-motion global và landing override | P1 | Reduced-transparency preference + solid default fallback; contrast/forced-colors support. Giữ reduced-motion hiệu lực qua mọi route CSS |
| F07 | `features/admin-audio-settings.css` và `features/ai/admin-ai-settings.css` cùng định nghĩa `.admin-settings-tabs-nav`; globals/workspace/feature cùng style control classes | P2 | Owner-scoped selectors và test navigation audio↔AI↔learner; source cho thấy collision risk, chưa khẳng định rendered defect |
| F08 | `app/(learner)/settings/page.tsx:308`: copy tuyên bố WCAG AAA, chưa có bằng chứng audit toàn UI tương ứng | P2 | Bỏ/điều chỉnh tuyên bố vượt bằng chứng trong UI copy migration; mục tiêu của brief là WCAG 2.2 AA |
| F09 | `app/(learner)/layout.tsx`: learning-mode chỉ nhận `/sessions/` và `/onboarding/placement/` | P1 | Kiểm tra presentation cho IELTS player routes; nếu cần mở rộng shell mode bằng pathname, không remount player hay thay navigation semantics |

Các vấn đề có bằng chứng và migration scope được capture thành MND-20261019-001 tại repository gốc, trạng thái `captured`, chưa phê duyệt toàn bộ implementation. [Bản ghi lịch sử](evidence/mandate-phase0-historical.md) giữ evidence của dirty baseline gốc; không import bản ghi vào register của worktree vì các code citations đó chưa tồn tại trong HEAD được cách ly. Không trộn với mandate workload/cross-skill Intermediate đã tồn tại. Chưa suy ra lỗi hiệu suất GPU, mất dữ liệu, lỗi timer hay không đạt toàn bộ contrast khi chưa đo.

### Baseline mới chạy

| Command / check | Kết quả 2026-10-19 | Giới hạn |
| --- | --- | --- |
| `pnpm --filter @worklingo/web test` | **82 files / 369 tests passed**, 61.78s, exit 0 | Unit/component, không chứng minh browser hoặc backend |
| `pnpm --filter @worklingo/web typecheck` | Pass, exit 0 | Không phải production build |
| `pnpm --filter @worklingo/web lint` | Fail, exit 1: `curriculum-workspace.tsx:832`, `pIndent` unused | Có trước mọi thay đổi của Phase 0; không tự sửa dirty source |
| `git diff --check` | Fail, exit 2: `evaluation-feedback.test.tsx:161`, new blank line at EOF | Có sẵn; CRLF messages là cảnh báo riêng |
| `node docs/ui-redesign/evidence/collect-baseline.cjs` | Pass; 18 Chromium captures: `/`, `/login`, `/register` × light/dark × 390×844, 768×1024, 1440×900 | HTTP 200, mỗi page 1 h1, không horizontal overflow và không pageerror ở các samples |
| Visual inspection | Xem trực tiếp home light desktop và login dark mobile PNG | 18 file đã capture, chỉ 2 được inspect bằng image viewer; không tự nhận visual review mọi màn hình |
| Browser availability | Chromium installed; Firefox/WebKit absent | Không cài thêm browser trong audit; chưa cross-browser certified |
| Protected runtime/E2E | Chưa chạy trong audit này | Không dùng tài khoản thật hoặc mutate learning/admin data để lấy baseline |
| Build, full monorepo `verify`, Web Vitals, screen reader, contrast composite, zoom/keyboard đầy đủ | Chưa chạy | Hoãn đến execution trong môi trường test biệt lập; không tự nhận pass |

[Public evidence](evidence/public-baseline.json) lưu viewport/status/overflow/animation count; capture dùng guest context mới, không submit form. Animation disabled lúc screenshot để ổn định ảnh; count lấy trước khi disable. Dev indicator trong ảnh thuộc next dev, không phải product UI. Có server local ở port 3000, PostgreSQL listener 55432; listener không chứng minh backend/E2E readiness.

### Dirty-state boundaries

Trước audit: 13 tracked modified files (settings hub/AI/audio, globals, homepage, curriculum workspace/CSS, evaluation feedback/test, session shell, mastery CSS và 2 message catalogs), 3 untracked source files (settings test/CSS, landing.css), cùng các report directories có sẵn. Không stage/commit/revert/reset chúng. `source-inventory.json` giữ SHA-256 của toàn bộ web source để kiểm tra source không bị audit sửa. Các test/lint kết quả ở trên bao gồm các thay đổi sẵn có.

## C–E. Proposed architecture, plan và approval

Đọc [02-redesign-plan.md](02-redesign-plan.md): addendum cho plan V2, đầy đủ token migration, GlassSurface contract, theme/fallback integration, module order, tests và rollback. [03-route-coverage.md](03-route-coverage.md) là acceptance matrix duy nhất cho đợt Liquid Glass này, không phải sprint board mới. [progress.md](progress.md) ghi checkpoint tiếp tục.

## Skill registry và evidence policy

Đã discover frontmatter từ global `C:/Users/ASUS/.agents/skills/`, repo `.agents/skills/` và đối chiếu native/plugin catalog của session. `implement` và `improve-codebase-architecture` có `disable-model-invocation: true`, không được gọi ngầm. Không cài skill hay plugin mới.

| Skill / path | Trigger và responsibility | Exclusion / overlap decision |
| --- | --- | --- |
| `.agents/skills/ui-ux-pro-max/SKILL.md` | UI audit, coherent visual direction, UX outcome queries | Primary UI skill; recommendations không override brief |
| `.agents/skills/codex-quota-optimizer/SKILL.md` | Request tiết kiệm quota/context; snapshot một lần, targeted reads, một baseline suite | Không đoán account quota, không đổi model/settings hay dùng CQO CLI |
| `.agents/skills/mandate-steward/SKILL.md` + governance | Audit, dedupe và evidence-backed proposal | Record/propose; không duyệt implementation, không runner |
| `.agents/skills/superpowers/using-superpowers/SKILL.md` | Entry routing và Codex tool adaptation | User workflow có ưu tiên |
| `.agents/skills/superpowers/brainstorming/SKILL.md` | Design constraints và builder check | Brief đã đầy đủ và yêu cầu bắt đầu Phase 0; không lặp discovery questions, không dựng throwaway app |
| `.agents/skills/superpowers/writing-plans/SKILL.md` | File boundaries, phase dependency, verification và self-review | User chỉ định `docs/ui-redesign/`, dùng làm addendum cho plan hiện có |
| `C:/Users/ASUS/.agents/skills/web-design-guidelines/SKILL.md` | Source UI/a11y review, current Vercel checklist | User scope chỉ audit; findings giữ file:line, không ép đổi business state/URL theo checklist |
| `.agents/skills/superpowers/verification-before-completion/SKILL.md` | Evidence trước completion claims | Chỉ báo check đã thực sự chạy |
| `C:/Users/ASUS/.agents/skills/git-workflow-and-versioning/SKILL.md` | Dirty-tree preservation và proposed isolation/atomic Git slices | Chưa tạo branch, commit, push; không dùng destructive recovery examples |

UI Pro Max: query `professional education liquid glass --design-system` trả style đúng nhưng font restaurant/palette navy-gold không phù hợp: reject, không persist. Retry duy nhất `education SaaS --design-system` có product phù hợp hơn nhưng là Glassmorphism/general SaaS; chỉ dùng functional guidance, không lấy palette/font hay khuyến nghị tránh dark trái brief. Explicit `liquid glass --domain style` xác nhận style ID `liquid-glass`, **native SwiftUI/UIKit/AppKit**, không phải renderer CSS cho Next.js. `keyboard focus modal --domain ux` phân biệt focus minimum AA và enhanced AAA; `server client hydration --stack nextjs` khuyến nghị giữ server boundary. Không persist output chưa phù hợp thành design-system cạnh tranh.

Alternatives: frontend-design/design-taste trùng visual responsibility nên chưa load; TDD/executing-plans/worktrees dành cho execution sau duyệt; backend/database không thuộc scope; Sites không phù hợp migration trong app thật; visualize/imagegen không cần cho source audit. Một builder reviewer giới hạn docs được dùng theo brainstorming, không fan-out implementation.

Sources đối chiếu: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) (đọc markdown bằng HTTP sau khi web renderer không đọc được), [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). HIG đặt material ở navigation/controls; đây là nguồn tham khảo cho mô phỏng web, không cam kết tái tạo Apple renderer. Tiêu chí và palette dự án lấy từ brief của người dùng.
