# WorkLingo Liquid Glass — Design Foundation and Core Presentation

Implemented on `codex/worklingo-liquid-glass-redesign` in `D:/Projects/WorkLingo-Liquid-Glass`. Foundations/preferences and Phase 2 core presentation extend the existing V2 structure in place; no route is certified as fully redesigned.

## Source ownership

| Owner | Responsibility |
| --- | --- |
| `apps/web/src/styles/tokens.css` | Exact iOS primitive palette; semantic light/dark/system colors, typography/spacing/radius/motion/z/shadow tokens; legacy aliases |
| `apps/web/src/styles/glass.css` | Material composition, opaque fallback, nesting/accessibility rules; scoped new appearance preference layout |
| `apps/web/src/components/glass-surface.tsx` | Server-compatible neutral surface, native div props/ref/className; no business logic or client directive |
| `apps/web/src/lib/theme.ts` | Existing versioned theme key and static pre-paint script; added versioned transparency key |
| `apps/web/src/components/theme-control.tsx` | Existing System→Light→Dark cycle and storage subscription, reused without replacing its manager |
| `apps/web/src/components/transparency-control.tsx` | Native checkbox, localized label/help, external-store snapshot; root-mounted TransparencySync owns cross-tab synchronization even outside Settings |
| `apps/web/src/app/(learner)/settings/page.tsx` | Appearance group uses solid GlassSurface and the real theme/transparency controls |

Root imports tokens → glass → existing globals → workspace → learning. No parallel CSS token system, UI library, font request or new application dependency. Existing feature CSS and state ownership remain. No showcase/public route was added; fixture markup is under E2E only.

## Palette and semantics

All 12 requested iOS colors plus six neutral levels exist as `--ios-*` primitives with the exact light/dark values in the approved plan. Primitives are inputs, not automatically accessible text/fill combinations.

| Semantic role | Light | Dark |
| --- | --- | --- |
| Primary text / fill | #0066CC / #0066CC | #66B3FF / #0091FF |
| On primary | #FFFFFF | #000000 |
| Primary hover / active | #005BB8 / #004F9E | #33A6FF / #66BAFF |
| Primary subtle | #E6F1FF | #102942 |
| Indigo accent / subtle | #5145CD / #F0EDFF | #B2B9FF / #252347 |
| Surface primary / secondary | #FFFFFF / #F2F2F7 | #000000 / #1C1C1E |
| Surface tertiary / elevated | #FFFFFF / #FFFFFF | #2C2C2E / #2C2C2E |
| Text primary / secondary / muted | #1C1C1E / #48484A / #5E5E63 | #F5F5F7 / #D1D1D6 / #AEAEB2 |
| Decorative border / control border | #D1D1D6 / #85858A | #48484A / #929297 |
| Focus ring | #005FCC | #88C7FF |
| Success label / fill | #176B42 / #176B42 | #76E899 / #30D158 |
| Warning label / fill | #875000 / #875000 | #FFC078 / #FF9230 |
| Danger label / fill | #B4232C / #B4232C | #FF9295 / #FF4245 |
| Info label / fill | #0066CC / #0066CC | #66B3FF / #0091FF |

On-status colors are white in light, black in dark. Text placeholders and disabled/inverse roles are separate. Never fill a button with a light label token. `--border-default` and glass border are decorative; actionable control boundaries use `--border-strong`, not the faint glass outline.

Compatibility aliases preserve every old token in the original stylesheet: background→surface-secondary, surface→surface-primary, surface-soft→surface-secondary, foreground→text-primary, muted→text-secondary; primary/fill/hover/soft/on-primary→their color roles; border/control-border/focus→default/strong/ring; status soft/fill/border and old radius/motion/shadow aliases remain. The fixed source editor palette is retained as an explicit exception. No legacy token was deleted because route migration is still pending.

Both manual dark and no-attribute system dark expose identical computed custom properties, verified in Chromium. Light is the CSS default; system dark works without JS or stored preferences. No page remount or business state key depends on appearance.

## Material API

```tsx
<GlassSurface variant="regular" tint="none" className="consumer">
  <nav aria-label="Learning">...</nav>
</GlassSurface>
```

Props extend `ComponentPropsWithRef<'div'>`; variant is `regular | clear | tinted | solid`, tint is `none | primary | indigo`. Default is regular/none. Native props/ref and classes compose; child semantics stay intact. The primitive does not create a button, modal, form or accessible role on the caller's behalf.

| Variant | Blur / saturation | Surface |
| --- | --- | --- |
| regular | 20px / 180% | White or dark neutral at 92% opacity by default |
| clear | 6px / 180% | 80% neutral; only use for an actual verified media/controls backdrop |
| tinted | 28px / 180% | Higher-opacity blue-neutral 96%; optional restrained primary/indigo tint |
| solid | None | Opaque elevated semantic surface |

Glass uses `--glass-bg`, `--glass-bg-clear`, `--glass-bg-tinted`, border/highlight/shadow, blur/saturation/tint and `--glass-opacity`. Changing root opacity affects regular material background, not text opacity. Local internal `--_glass-*` variables select variant values; no `opacity` is applied to the whole component. CSS declares an opaque baseline, then enhances through standard/prefixed backdrop-filter `@supports`.

Reduced-transparency attribute, supported OS reduced-transparency, increased contrast or forced-colors media queries force opaque material with a stronger border. Accidental nested GlassSurfaces become solid. No SVG displacement, WebGL, will-change, infinite animation or per-row/card blur is added. Clear is not a general content card: its use must be checked with its actual text/control colors, not the primary label sample alone.

Settings adopts the solid variant. Navigation and feature consumers remain for later approved shell/route phases; an overlay requires its own approved interaction contract. Do not apply this primitive everywhere simply because it exists.

## Appearance preferences and hydration

- Existing key `worklingo:theme:v1`: `light`, `dark`, or absence for system. Existing ThemeControl keeps its cycle and storage-event behavior.
- New key `worklingo:reduce-transparency:v1`: `reduce`, or absence to follow default/OS. Attribute `data-reduce-transparency="true"` selects solid glass. Disabling the checkbox removes the manual reduction; OS requirements may still force solid. Help text explains that distinction.
- The existing head script independently reads both validated keys before paint; failure reading either key cannot suppress the other. No user-controlled text is interpolated into script source.
- TransparencyControl uses a stable false server snapshot and the initialized DOM state after hydration. It never reads storage in render, resets a form, changes the locale/auth provider or persists learner data.
- Root mounts the null-rendering `TransparencySync` client island. Its listener survives route changes and remains active without any checkbox mounted; it also reconciles storage once after hydration to cover changes between the head script and mount. Unavailable storage leaves the pre-paint snapshot usable. This fixes the initial review finding without remounting children or creating another preference manager.
- Native checkbox uses a full label hit target ≥44px, associated description and focus-visible ring. Values persist when storage is available, stay usable in-page when blocked, and synchronize through same-tab custom events and cross-tab storage/clear events.
- VI/EN labels live in `commonMessages`. No new backend preference contract, route, cookie, user field or API endpoint.

## Shape, typography and motion

System font stack uses Apple system names when installed and system-ui/Segoe UI fallback, with no font download. Title/body reference 34/28/22/17px; callout16/subhead15/footnote13/caption12. Existing CSS consumers determine where these tokens are adopted; dense UI is not forcibly rewritten.

Spacing is 4px units (1/2/3/4/5/6/8/10/12/16), page max75rem/reader70ch. Radius scale4/8/12/20/28px/pill999px; old control/panel/feature aliases map to12/20/28px. Duration150/220/280ms, standard/spring easings and z content0/navigation10/backdrop20/dialog30/toast40 are available. Reduced motion sets durations to0 and the existing workspace reduced-motion override still disables nonessential animations. Adopting z/motion/radius consistently across legacy feature CSS belongs to later phases.

## Verification boundary

See [Phase 1 QA](phase1-qa.md) and [browser evidence](evidence/phase1/browser-results.json). Chromium measured80 semantic pairs: normal-text minimum4.875:1, applicable UI boundary/focus minimum3.290:1;48 actual screenshot-pixel glass composites had primary-label minimum8.249:1. These validate defined pairs and sampled surfaces, not every legacy descendant, screen reader or full product accessibility.

Three required sizes are tested in both themes; actual settings integration uses the real Next route with a network fixture for `/me`. Fixture tests are explicitly not real backend/IELTS journeys. Cross-engine browser qualification and complete 34-route migration remain pending future authorization.

## Phase 2 — adopted native presentation contracts

The original owners stay canonical: `workspace.css` for shared native patterns, `globals.css` for learning/status/action presentation, `learning.css` for learning overrides, and scoped `auth.module.css` for auth. No new stylesheet import order, component library or production route was introduced.

| Existing consumer | Presentation / state contract |
| --- | --- |
| `.primary-button`, `.primary-action-button` | Semantic fill/on-fill,44px minimum, named hover/active, wrapped labels, disabled neutral presentation; native button/anchor semantics retained |
| `.secondary-button` | Solid secondary, bordered; no blur |
| `.secondary-action-button` | Tinted secondary, native retry/pause/resume callbacks unchanged |
| `.theme-control` | Existing named icon/plain control,44px; System/Light/Dark cycle unchanged |
| `.recording-delete-button` | Destructive tint/border/text, explicit label retained; disabled+aria-busy follow owner props |
| `.recording-stop-button`, `.retry-button` | Danger fill uses `--color-on-danger` independently of primary |
| `.field-group`, writing/speaking inputs | Native fields/select with control border,16px text, token radius, placeholder/error/readonly/disabled states; field label/help/error association stays in existing JSX |
| `.option-label`, `.recording-consent`, `.audio-source-option` | Native radio/checkbox, semantic accent and visible group focus; no custom selection state |
| `.teacher-feedback` | Solid named inline section; no focus trap, Escape close, opener or modal side effects; long mobile headings reflow; errors and retained-audio callbacks unchanged |
| `.status-badge` and existing status banners | Text+semantic color, solid backgrounds; statuses remain readable without color alone |
| Existing admin table base | Opaque primary surface, tabular numerals; no row blur or table data/layout refactor |

No production glass-button consumer exists in this baseline. GlassSurface continues to wrap actual Settings appearance controls as solid; the test-only toolbar exercises regular glass composition and reduced-transparency fallback. This does not migrate shell/navigation or invent a product overlay. Feature-specific legacy overrides require later route-owner checks; inheriting these shared rules is not route acceptance.

Feedback stays inline because the committed SessionShell renders it directly and provides no open/close contract. Phase 2 adds no new effects, event listeners, portal, state owner, storage key or prop. New busy semantics reflect existing pending props. Unit/browser tests protect asynchronous draft/focus continuity and one retry while disabled. See [Phase 2 QA](phase2-qa.md) for test evidence and limits.

## Phase 3 — application-shell contracts

The existing learner/admin layouts own authentication, authorization and destinations. Shared `WorkspaceNavigation` owns disclosure state only. `workspace.css` owns the responsive grid/header/sidebar; HomePage retains its inline scoped styles and existing hero/CTA logic. CSS imports and server/client boundaries stay unchanged.

- Desktop ≥1000px: learner sidebar15.5rem, admin sidebar16rem with independent scrolling for all13 destinations. Solid feature content has a maximum75rem; outer sidebar+content frame is97rem. Header and navigation are separate regular GlassSurface siblings; links never add blur. Identity, group captions, icon+label and a visible active edge supplement semantic color.
- Below1000px: shell owns inline safe-area insets once; direct learner main/evidence-workspace has zero inline padding, retaining vertical padding and feature content rules. This removes cumulative insets without clipping. One-column in-flow nonmodal disclosure, initially closed, native button with `aria-expanded`/`aria-controls`, named navigation and native links. No backdrop, trap, body lock or portal. Escape closes and returns focus; outside pointer closes while keeping outside focus. Ordinary link activation and route/history changes close the disclosure. Activation restores focus to the trigger before hiding a focused panel, including when the current destination does not navigate; ordinary desktop links keep their focus. Breakpoint transitions reset it and repair focus if CSS hid the focused control. Same-breakpoint notifications retain the state. Modified link clicks retain browser semantics.
- Focus mode applies only to dynamic `/sessions/*`, `/onboarding/placement/*`, `/ielts/bridge/*`, `/ielts/practice/*`, `/ielts/mock-tests/*`. Catalog/index routes retain the ordinary shell. Header/navigation become solid and compact, greeting is hidden, menu stays available on request, and no menu reveal animation runs. The main child slot stays in one position without new keys or player effects.
- Header preserves real brand destination, user/role controls, logout, existing ThemeControl and LanguageSwitcher. Locale controls use semantic3:1 borders and44px height. Public navigation adds the native home link around the existing WorkLingo heading and groups existing controls; hero and auth CTAs remain unchanged.
- Mobile padding includes safe-area insets; text wraps, controls have44px targets, active state uses color plus edge/weight, focus uses the shared3px outline. Navigation has scroll padding and link scroll margins so native Tab scrolling leaves breathing room. Reduced Motion disables reveal/chevron transitions; Reduced Transparency, Increased Contrast and Forced Colors inherit Phase1 solid material fallbacks.

Browser evidence exercises real routes/components with intercepted network fixtures. It does not certify live authentication, learning-media hardware or every feature page. CSS200% + VI +390px + native Tab is distinct from native browser zoom. After final responsive remediation, existing Settings feature content has the same564px reach at that combination in baseline and new shell; shell controls themselves reflow. Full feature migration remains Phase4, not a shell acceptance claim.

## Phase4 adopted Public/Auth owners

Slice1 source7a37bed: HomePage imports its scoped landing.css; brand remains a navigation link, primary h1 describes the learning purpose. Static workplace example and three principle columns are solid content. Auth wrappers group their existing introduction; auth.module.css owns the fluid solid two-column/stacked form layout. Existing GlassSurface groups locale/theme controls with an accessible preference label. Auth/Public owners supply scroll margin/padding and inset skip links so native keyboard outlines fit CSS200; selectors are conditional on their real owner, leaving protected pages unaffected. Error/not-found share only error-state.module.css; retry callback and localized confidentiality remain unchanged. No new tokens, package, fake progress or generic frontend is introduced.

Slice2 source0dbb076: dashboard.css is imported only by DashboardView and scopes its descendant rules to dashboard-container; no SessionShell selector added. Dashboard current-level labels reuse the existing formatLevel formatter, retaining unknown authored identifiers. Program/Mastery owners retain native API/state semantics, solid metric/evidence panels and fluid status/filter/summary layouts. Mastery section links share one GlassSurface, not repeated blur in evidence rows. Flex/grid data children use zero minimums with wrapping at narrow widths; no overflow hiding. Test-only phase4-a11y records effective opaque text contrast and does not claim glass compositing.

Slice3 c3166b0: session-experience.css is imported by existing SessionShell and scopes descendants to session-layout; solid action-group material, solid passages/editor/media/feedback. No activity subtree reparenting/keys/remounts or modality changes. Fluid minmax(0,1fr), child min-width0 and wrapping replace unintended minimum widths, including footer button160px and speech-fallback range constraints. Onboarding owner retains native radio/disabled semantics, readable solid panels and focus-within outlines. No new palette/tokens/dependencies.
