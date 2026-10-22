# Admin sidebar information architecture

Implements the user's WORKLINGO — ADMIN SIDEBAR INFORMATION ARCHITECTURE REFACTOR brief. Base: local main `d2fe1e3d3fe89e839b808bf744f8462d4fb48639`. Work only on `codex/admin-sidebar-ia` in the new managed worktree. No merge, push, deployment, reset, stash, clean or backup changes.

## Intent and structure

Make navigation follow training programs without losing the 26 existing shell destinations. Preserve Liquid Glass tokens, shared responsive disclosure, all role checks, API behavior and editor state.

Four top-level entries: Overview (link), Training programs, Shared management, System (disclosures). At most one disclosure is open. Programs use a single flat program selector followed by contextual links, with no further accordion. Selecting a program changes navigation only, never URL or editor mounting. The pathname chooses the open group and selected program on deep link, reload and history changes; users may close or browse another group afterward.

Program selector order: Foundation / Mất gốc, Basic / Cơ bản, Intermediate / Trung cấp, TOEIC, IELTS. First, second and TOEIC are noninteractive proposed IA, labelled explicitly. Catalog currently combines pre-A1–A2 into `beginner`, COMING_SOON, not separate foundation/basic admin modules. TOEIC is COMING_SOON. Generic `/admin/programs/[slug]` is a statistics shell, not evidence of dedicated authoring. Existing foundation format/curriculum capabilities stay shared; do not relabel them as implemented program workspaces.

Intermediate contextual links: program overview; topic groups; topic lesson library; seven existing categories (grammar, vocabulary, pronunciation, reading, listening, speaking, writing). IELTS: program overview; orientation; bridge; integrated practice; mocks; topics; band curriculum.

Shared management: content library, content import (existing `/admin/content/new`, newly exposed shortcut), curriculum management, analytics. System: audit, operations, audio, AI, learner view. Preserve existing destination labels where they identify workflows. Breadcrumb behavior stays intact.

## Interaction and safety

Native buttons support Enter/Space, aria-expanded/controls, focus-visible; Escape collapses the current disclosure and restores its trigger, while a second Escape closes mobile navigation through the existing shell. Hidden groups cannot receive focus. Independent bounded nav scrolling keeps the last destination reachable. Reuse shared reduced-motion, themes and locale settings. Avoid localStorage state: route is authoritative and no storage permission is needed.

AdminLink continues enforcing dirty-form confirmations. Disclosure/program buttons never navigate. Layout children remain siblings and are never keyed or conditionally remounted. CONTENT_ADMIN and SYSTEM_ADMIN retain existing shell access; learner/anonymous denial and endpoint-specific policies remain unchanged.

## Evidence and acceptance

Inventory all 48 source page templates and distinguish 34 historical Liquid Glass routes from 14 additions. Preserve mapping of every previous destination, validate real route templates including dynamic constraints, and cover active boundary matching (no prefix collisions), topic-groups versus topic library, query strings, reload and back/forward. Unit tests cover state, permissions and draft protection. Browser tests run real Next UI against explicit API fixtures, covering all historical routes plus additions, desktop/mobile, VI/EN, light/dark/system, keyboard, zoom/reflow and reduced motion. Fixtures are presentation evidence, not live backend qualification.

Run web regression, targeted tests, lint, typecheck, i18n and production build. Perform independent branch review, address consequential findings with regression tests, then commit scoped files and stop on the feature branch.
