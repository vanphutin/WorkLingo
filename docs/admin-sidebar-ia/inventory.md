# Sidebar inventory and mapping (2026-10-22)

Verified from local main `d2fe1e3`, before product edits. There are **48 page templates**, **34 historical Liquid Glass routes + 14 additions**, and **26 original shell destinations**. Dynamic templates expand into multiple valid URLs, so 48 is not the number of concrete URLs.

The actual layout used `useAdminNavigationItems` -> flat `WorkspaceNavigation`; legacy `AdminNavigation` was unused by the layout and omitted the standalone topic library link. The replacement unifies these consumers and preserves their union.

## Program availability

| Requested program | Real catalog/module evidence | Sidebar treatment |
| --- | --- | --- |
| Mất gốc / Foundation | No separate catalog slug or dedicated admin authoring module. Existing beginner combines Foundation/Pre-A1–A2, COMING_SOON. Generic slug page is statistics/deferred UI. | Proposed IA, no link |
| Cơ bản / Basic | No distinct basic program or admin module. Shared Foundation format, curriculum and onboarding are existing shared capabilities, not a dedicated Basic workspace. | Proposed IA, no link |
| Trung cấp / Intermediate | AVAILABLE; topic groups/topics and seven category authoring routes. | Contextual links |
| TOEIC | Catalog COMING_SOON; deferred authoring, no dedicated TOEIC CRUD/API. | Proposed IA, no link |
| IELTS | Catalog IN_DEVELOPMENT; six dedicated admin workspaces and program overview exist. Learner admission remains gated. | Contextual links, no availability change |

Evidence: `apps/api/src/learning-programs/domain/program-catalog.ts`, `admin-dashboard.tsx` ProgramWorkspace, `admin-navigation.tsx`, `packages/content-format/src/intermediate-authoring.ts`, source page files below. There is no inference that a generic `[slug]` page implements arbitrary programs.

## Old navigation -> new navigation

| Old destination | New location | Change |
| --- | --- | --- |
| `/admin` | Overview | Retained unchanged |
| `/admin/programs/intermediate` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/ielts` | Training programs / IELTS | Retained unchanged |
| `/admin/programs/intermediate/topic-groups` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/topics` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/grammar` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/pronunciation` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/vocabulary` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/reading` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/listening` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/speaking` | Training programs / Intermediate | Retained unchanged |
| `/admin/programs/intermediate/writing` | Training programs / Intermediate | Retained unchanged |
| `/admin/ielts-topics` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-orientation` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-bridge` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-integrated` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-mocks` | Training programs / IELTS | Retained unchanged |
| `/admin/ielts-band-curriculum` | Training programs / IELTS | Retained unchanged |
| `/admin/content` | Shared management | Retained unchanged |
| `/admin/curriculum` | Shared management | Retained unchanged |
| `/admin/settings/audio` | System | Retained unchanged |
| `/admin/analytics` | Shared management | Retained unchanged |
| `/admin/audit` | System | Retained unchanged |
| `/admin/operations` | System | Retained unchanged |
| `/admin/settings/ai` | System | Retained unchanged |
| `/dashboard` | System | Retained unchanged |
| `/admin/content/new` (existing page action) | Shared management / Import content | Existing route exposed as shortcut |

## Guards and active matching

`(admin)/layout.tsx` authenticates via `/me`, permits CONTENT_ADMIN or SYSTEM_ADMIN, sends learners to `/dashboard` and anonymous/401/403 to `/login`; retryable infrastructure errors remain visible. Admin endpoints retain `@Roles(CONTENT_ADMIN, SYSTEM_ADMIN)` including content imports, intermediate topic groups/topics, IELTS authoring, analytics, audit, operations, audio and AI. No new role or permission is implied by grouping. `/dashboard` retains its learner-layout policy.

All links use existing AdminLink navigation guard; disclosure and program selection buttons do not invoke routing. Active selection uses the longest matching complete path segment, so `/admin` cannot win over a child and `/admin/content/new` beats `/admin/content`. The old `/topics` URL is retained as a destination but its existing page redirects to `/topic-groups`; the active link follows the final URL. `/topics/new` requires a valid `topicGroupId` query and existing group; missing/invalid context continues redirecting to topic groups. Editor deep links select the topic library destination. Query/hash do not affect usePathname. A route change resets navigation context without remounting children. No server role checks were replaced by menu visibility.

## Route templates

| Route | Source | Cohort | Existing access |
| --- | --- | --- | --- |
| `/admin/analytics` | `apps/web/src/app/(admin)/admin/analytics/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/audit` | `apps/web/src/app/(admin)/admin/audit/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/content/[importId]` | `apps/web/src/app/(admin)/admin/content/[importId]/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/content/new` | `apps/web/src/app/(admin)/admin/content/new/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/content` | `apps/web/src/app/(admin)/admin/content/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/curriculum` | `apps/web/src/app/(admin)/admin/curriculum/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-band-curriculum` | `apps/web/src/app/(admin)/admin/ielts-band-curriculum/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-bridge` | `apps/web/src/app/(admin)/admin/ielts-bridge/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-integrated` | `apps/web/src/app/(admin)/admin/ielts-integrated/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-mocks` | `apps/web/src/app/(admin)/admin/ielts-mocks/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-orientation` | `apps/web/src/app/(admin)/admin/ielts-orientation/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/ielts-topics` | `apps/web/src/app/(admin)/admin/ielts-topics/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/operations` | `apps/web/src/app/(admin)/admin/operations/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin` | `apps/web/src/app/(admin)/admin/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/[slug]` | `apps/web/src/app/(admin)/admin/programs/[slug]/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/[category]/[importId]` | `apps/web/src/app/(admin)/admin/programs/intermediate/[category]/[importId]/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/[category]/new` | `apps/web/src/app/(admin)/admin/programs/intermediate/[category]/new/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/[category]` | `apps/web/src/app/(admin)/admin/programs/intermediate/[category]/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/topic-groups` | `apps/web/src/app/(admin)/admin/programs/intermediate/topic-groups/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/topics/[importId]` | `apps/web/src/app/(admin)/admin/programs/intermediate/topics/[importId]/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/topics/new` | `apps/web/src/app/(admin)/admin/programs/intermediate/topics/new/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/programs/intermediate/topics` | `apps/web/src/app/(admin)/admin/programs/intermediate/topics/page.tsx` | Additional 14 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/settings/ai` | `apps/web/src/app/(admin)/admin/settings/ai/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/admin/settings/audio` | `apps/web/src/app/(admin)/admin/settings/audio/page.tsx` | Liquid Glass 34 | CONTENT_ADMIN or SYSTEM_ADMIN |
| `/login` | `apps/web/src/app/(auth)/login/page.tsx` | Liquid Glass 34 | Public |
| `/register` | `apps/web/src/app/(auth)/register/page.tsx` | Liquid Glass 34 | Public |
| `/dashboard` | `apps/web/src/app/(learner)/dashboard/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/bridge/[moduleId]` | `apps/web/src/app/(learner)/ielts/bridge/[moduleId]/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/bridge` | `apps/web/src/app/(learner)/ielts/bridge/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/history` | `apps/web/src/app/(learner)/ielts/history/page.tsx` | Additional 14 | Learner layout |
| `/ielts/introduction` | `apps/web/src/app/(learner)/ielts/introduction/page.tsx` | Additional 14 | Learner layout |
| `/ielts/learn` | `apps/web/src/app/(learner)/ielts/learn/page.tsx` | Additional 14 | Learner layout |
| `/ielts/mock-tests/[attemptId]` | `apps/web/src/app/(learner)/ielts/mock-tests/[attemptId]/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/mock-tests` | `apps/web/src/app/(learner)/ielts/mock-tests/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/orientation` | `apps/web/src/app/(learner)/ielts/orientation/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts` | `apps/web/src/app/(learner)/ielts/page.tsx` | Additional 14 | Learner layout |
| `/ielts/pathway` | `apps/web/src/app/(learner)/ielts/pathway/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/practice/[sessionId]` | `apps/web/src/app/(learner)/ielts/practice/[sessionId]/page.tsx` | Liquid Glass 34 | Learner layout |
| `/ielts/practice` | `apps/web/src/app/(learner)/ielts/practice/page.tsx` | Liquid Glass 34 | Learner layout |
| `/mastery` | `apps/web/src/app/(learner)/mastery/page.tsx` | Liquid Glass 34 | Learner layout |
| `/onboarding` | `apps/web/src/app/(learner)/onboarding/page.tsx` | Liquid Glass 34 | Learner layout |
| `/onboarding/placement/[sessionId]` | `apps/web/src/app/(learner)/onboarding/placement/[sessionId]/page.tsx` | Liquid Glass 34 | Learner layout |
| `/programs` | `apps/web/src/app/(learner)/programs/page.tsx` | Liquid Glass 34 | Learner layout |
| `/sessions/[sessionId]` | `apps/web/src/app/(learner)/sessions/[sessionId]/page.tsx` | Liquid Glass 34 | Learner layout |
| `/settings/ai` | `apps/web/src/app/(learner)/settings/ai/page.tsx` | Liquid Glass 34 | Learner layout |
| `/settings/audio` | `apps/web/src/app/(learner)/settings/audio/page.tsx` | Liquid Glass 34 | Learner layout |
| `/settings` | `apps/web/src/app/(learner)/settings/page.tsx` | Liquid Glass 34 | Learner layout |
| `/` | `apps/web/src/app/page.tsx` | Liquid Glass 34 | Public |
