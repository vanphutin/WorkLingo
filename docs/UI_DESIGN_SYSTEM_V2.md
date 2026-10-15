# WorkLingo design system V2

Implements the adult, focused, evidence-based principles in DESIGN_SYSTEM.md. Existing CSS and stateful feature components remain the integration surface; no UI, animation, icon or font dependency was added.

## Visual direction

Warm paper background, navy reading text, teal learning actions. The distinctive element is the mission workspace: one clear task with quiet contextual language support. Learning evidence and optional IELTS pathways sit below the immediate task. Admin uses a separate operational sidebar, dense forms and contained table scrolling.

UI UX Pro Max's first education search returned children's styling; it was rejected and not persisted. One narrower professional-training search returned Minimalism & Swiss Style with navy and blue. Applied the functional layout/accessibility recommendations, adapted the accent to WorkLingo teal and retained warm reading surfaces from the product brief. Frontend Design's plan/critique principles guide deliberate hierarchy and restrained decoration. Suggestions are not treated as product policies.

The chosen layout keeps content left aligned and gives the mission more width than summary evidence. An equal-card layout was rejected during the source audit because optional pathways preceded the learner's next action.

```text
Learner desktop                      Learner mobile
Brand / account / theme               Brand / account / theme
Learning destinations                 Compact destinations
Welcome + program                     Welcome + program
Mission + action | summary            Mission + action
Roadmap                               Summary / roadmap
Evidence / weekly target              Evidence / weekly target
Gated IELTS steps                     Gated IELTS steps

Session: mission + block progress → activity | contextual support
Admin:   account + theme → operations sidebar | authoring / tables
```

## Token ownership

`apps/web/src/styles/tokens.css` owns palette, spacing, typography, radii, page/reader widths and motion. Existing global/domain CSS references semantic tokens. `workspace.css` owns universal controls and application shells; `learning.css` owns learner hierarchy and reading/editor presentation. Auth styles remain a CSS module. Avoid adding domain rules to tokens.

| Role | Light | Dark |
|---|---|---|
| Background | #f5f4f0 | #101c25 |
| Surface / soft surface | #ffffff / #eeefeb | #192b37 / #223744 |
| Foreground / muted | #182d3a / #526370 | #edf2f5 / #b2c2cd |
| Primary text / primary fill | #11675f / #11675f | #7bd7c8 / #12665d |
| Primary soft | #e3f0eb | #203e3b |
| Border / control border | #d5dcd8 / #788b88 | #405765 / #829aa6 |
| Focus | #ad5a00 | #ffcc79 |
| Success / soft | #176b42 / #e8f3eb | #8cdfae / #213e32 |
| Warning / soft | #815000 / #fff3d9 | #ffd18a / #443621 |
| Danger text / fill / soft | #a52e36 / #a52e36 / #fcecee | #ffa9b0 / #95313b / #452e39 |
| Information text / fill / soft | #245e9a / #245e9a / #e9f0f8 | #a2caff / #285d90 / #263c54 |

Filled primary/danger/info controls use `--on-primary` (#ffffff); light tonal text colors must never be used as filled control backgrounds. Source editor uses separate fixed dark editor tokens in both themes.

Spacing uses 4/8/12/16/24/32/48px. Controls use 10px corners, panels 16px, featured mission/program cards 24px. Page max width 76rem; long reading text max width 70ch. Shadow is subtle in light mode and removed in dark mode. Motion is limited to 150ms color feedback, disabled under reduced motion.

## Typography

System Segoe UI → Noto Sans → Arial provides Vietnamese/English coverage without network font requests. Body 16px / 1.6; readers 17px / 1.8; lead 18px; h3 20px; h2 24px; h1 30–48px responsive. Captions 14px; form controls stay at least 16px. Numbers use tabular variants. Long headings balance and long content wraps. Landing uses a restrained serif only for its clearly labelled language example, not long instructional content.

## Theme behavior

`ThemeControl` is a small client island. A static head script reads only `worklingo:theme:v1` before paint, accepts `light`/`dark`, and catches unavailable storage. System mode has no explicit attribute and uses CSS media queries even without JavaScript. Manual preference is persisted; storage events synchronize tabs. `useSyncExternalStore` supplies a stable server snapshot. Only the root HTML attribute has narrowly scoped hydration suppression. Theme updates do not replace the learner component tree or clear drafts.

## Implemented component patterns

| Pattern | Implementation / rules |
|---|---|
| Primary/secondary actions | Native button/Link + existing classes and `.primary-button`, `.secondary-button`, `.btn`; 44px min targets, clear hover/focus, disabled native semantics |
| Inputs/selects/textareas | Native controls, explicit themed foreground/background; visible labels, validation association and first-invalid-field focus on auth submit |
| Navigation | `WorkspaceNavigation` consumes real href/label items; `aria-current`, named nav, native details disclosure; learner admin link appears only for existing admin roles |
| Theme choice | Visible labelled System/Light/Dark select, keyboard usable, state preserved |
| Cards/status/badges | Existing domain components themed via surface/status tokens; written state labels remain alongside color |
| Roadmap/progress | Server-derived states, active session IDs, objective completion and genuine evidence; no estimated bands or fabricated percentages |
| Feedback/errors/empty/loading | Existing role=status/alert and retry handlers retained; empty admin workspace gets a clear import action; no synthetic data |
| Session support | Existing collapse control with expanded state and controls reference; reading/editor remains the main task, navigation is disclosed on session routes |
| Audio/recording | Existing native media controls, consent, recording/evaluation states and retention actions retained; danger fill readable in both themes |

No unused modal, tooltip, drawer, skeleton or general-purpose component catalog was added. Existing publishing confirmations/version checks and curriculum safeguards remain owned by their feature components.

## Responsive and accessibility evidence

`e2e/ui-redesign.spec.ts` visits real API-backed learner/admin routes at 320/375/430/768/1024/1440px and 720px (1440 at 200% zoom equivalent). It checks overflow, theme/reload, keyboard skip navigation, long Vietnamese display name, actual writing draft preservation and pause/resume. Existing E2E suites exercise four skills, activation, onboarding/IELTS and authoring workflows.

Measured token contrast is in UI_TOKEN_CONTRAST.json: normal text pairs 5.82–15.33:1; control-border contrast 3.59:1 light / 4.94:1 dark; focus/surface 4.95:1 light / 9.82:1 dark. Browser review caught legacy white keyword backgrounds and skip-link contrast; corrected them and added rendered control checks. These measurements and keyboard checks support the targeted changes; they do not constitute a complete manual WCAG certification or screen-reader audit.
