# WorkLingo UI/UX audit — 2026-10-14

## Evidence and scope

Source audit of actual App Router routes, feature components, typed clients, CSS and existing tests. Baseline: 68 web test files / 273 tests passed. Rendered baseline login captured in `ui-redesign-baseline-login.png`; protected routes require the local API/PostgreSQL. No authenticated visual observations are claimed before runtime verification.

| Finding / evidence | Impact | Priority | Solution / acceptance |
|---|---|---|---|
| `dashboard-view.tsx:174`: five IELTS cards precede the mission launcher in DOM | Main learning action is buried, especially on mobile | P1 | Mission/resume first in DOM; roadmap and evidence next, optional IELTS below |
| `dashboard-view.tsx:184`: fixed workplace introduction description for every mission | Description can contradict the actual program/mission | P1 | Neutral four-skill guidance; title and availability remain API derived |
| `globals.css:1`: light-only color scheme; repeated hex values in 13 stylesheets | Inconsistent appearance; no readable dark theme | P1 | Shared semantic palette for all existing CSS, system/light/dark preference, persistence and reload checks |
| `(learner)/layout.tsx:94`: Programs and Audio are the only destinations; no active location | Mastery and IELTS journeys are difficult to locate | P1 | Labelled primary navigation, current-page indication, real routes and role-aware admin access |
| `(admin)/layout.tsx:100`: 12 navigation links share one wrapping header | Navigation dominates small screens and breaks operator hierarchy | P1 | Separate operational sidebar; compact mobile disclosure; preserve role checks |
| `globals.css:279,330`: equal card treatment for mission and secondary metrics | Weak action hierarchy | P1 | Featured mission; quieter numerical evidence and sequential roadmap |
| `globals.css:711,718`: lesson content spread across boxed surfaces | Reading fatigue during long sessions | P2 | Comfortable 70ch reading, restrained support panel, distinct feedback/recorder/editor states |
| `program-catalog.tsx:175`: cards do not mark the active enrollment | Learner cannot distinguish active from selectable | P2 | Explicit active badge; unavailable actions remain disabled by server state |
| Feature styles contain generic `.evidence-header` and `.audio-browser-fallback` selectors | Route-loaded CSS remains mounted across navigation in Next.js | P2 | Scope collision-prone rules to their owning feature; review route transitions |

## Route, layout and ownership map

| Journey | Implemented routes / components | Style ownership |
|---|---|---|
| Public/auth | `/`, `/login`, `/register`; AuthPage/AuthForm | global foundation + landing/auth CSS |
| Onboarding/placement | `/onboarding`, `/onboarding/placement/[sessionId]`; OnboardingWorkspace/PlacementStatus/SessionShell | onboarding.css + session styles |
| Daily learning | `/dashboard`, `/programs`, `/sessions/[sessionId]`; DashboardView/CurriculumRoadmap/ProgramCatalog/SessionShell | global + learner/session/catalog styles |
| Evidence | `/mastery`; MasteryWorkspace, memory health, error bank, checkpoint | mastery.css |
| IELTS | `/ielts/orientation`, `/ielts/bridge`, `/ielts/bridge/[moduleId]`, `/ielts/practice`, `/ielts/practice/[sessionId]`, `/ielts/pathway`, `/ielts/mock-tests`, `/ielts/mock-tests/[attemptId]` | orientation/bridge/pathway CSS + existing shared classes |
| Settings | `/settings/audio` | shared audio styles |
| Operations | `/admin/content` (new/import detail), `/admin/curriculum`, IELTS authoring routes, `/admin/audit`, `/admin/operations`, `/admin/analytics`, `/admin/settings/audio` | admin.css + domain-specific admin CSS |

Learner and admin layouts retain authenticated API checks. Feature hooks own drafts, durable session checkpoints, audio consent/cleanup, idempotency and version binding. APIs/contracts own program availability, progression and evidence. Product/Vision contain future ambitions; no future capabilities or artificial statistics will be added.

## Skill routing matrix

| Skill | Availability | Assigned task | Usage evidence |
|---|---|---|---|
| codex-quota-optimizer | Accessible, repository | Execution economy | Compact snapshot, one bounded delegated scope, existing tests and CSS reused |
| web-design-guidelines | Accessible, global | UI/a11y audit | Current Vercel guidelines fetched; source findings above, runtime focus/overflow checks |
| vercel-react-best-practices | Accessible, global | React/theme boundaries | Read hydration and storage rules; small client control, static initialization, no new dependencies |
| git-workflow-and-versioning | Accessible, global | Change isolation | Inspected status; `codex/ui-redesign-v2`; pre-existing untracked files preserved |
| code-review-and-quality | Accessible, global | Final five-axis review | Tests first, final diff + mutation of new conditional behavior |
| design-taste-frontend | Accessible, global | Landing/auth only | Delegated public-page audit and implementation; product dashboards excluded by skill |
| ui-ux-pro-max, frontend-design, superpowers workflows | Installed after explicit user authorization | Design/UX, visual direction, appropriate workflows | Native Codex repo discovery verified; see SKILL_INSTALLATION_REPORT.md |
| Playwright-specific skill | Not found | None | Existing Playwright tools/tests used directly |
| implement, improve-codebase-architecture | Accessible, invocation restricted | None | `disable-model-invocation: true`; not explicitly invoked |
| Sites, imagegen, backend/database skills, TDD | Available but not selected | None | Existing repository redesign; no generated bitmap/backend work, no request for test-first development |

Global/repository SKILL.md frontmatter discovered; native/plugin catalog inspected. Repository `.codex/skills` does not exist. One subagent audits and edits public/auth pages; main agent handles independent learner/admin audit and implementation.
