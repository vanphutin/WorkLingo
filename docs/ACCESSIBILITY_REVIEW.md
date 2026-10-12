# Accessibility Review

Date: 2026-10-12
Target: WCAG-oriented controlled pilot review; automated checks complement manual review.

## Automated evidence

- Desktop and mobile registration keyboard access.
- Skip-link focus, semantic labels, visible submit action and 44px target.
- Mobile form font size of at least 16px.
- Reduced-motion mode and 200%-equivalent narrow reflow without blocked controls or horizontal overflow.
- Desktop/mobile Admin Operations and Analytics navigation.
- Existing E2E journeys cover onboarding, session controls, audio settings, content authoring, curriculum, audit, mastery and engagement.

Run:

```powershell
pnpm --filter @worklingo/web exec playwright test e2e/accessibility.qualification.spec.ts --project=qualification-desktop --project=qualification-mobile --no-deps
```

## Manual checklist

| Area | Keyboard/focus | Responsive/reflow | Status |
|---|---|---|---|
| Registration and onboarding | labels, logical focus, Enter/Space actions | mobile actions remain reachable | PASS |
| Learning session and writing | explicit controls and status text | transcript/content remains available | PASS |
| Audio settings | no autoplay; recovery is explicit | controls meet target sizing | PASS |
| Mastery and engagement | headings and textual evidence | cards reflow | PASS |
| Admin content/curriculum/audit | keyboard-accessible mutations and filters | stacked mobile presentation | PASS |
| Admin operations/analytics | links, filters, refresh and tables | nav wraps without overlap | PASS after mobile-nav repair |

Residual: screen-reader testing across multiple vendor/browser combinations remains a pilot-operations check, not an automated claim.
