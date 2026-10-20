# Actual rendered component evidence

Operations before: immutable optimized snapshot18e00fd. After: optimized product600cd1f. Same Chromium153,390×844, Vietnamese, API fixture and deliberately held summary response. These are real application screenshots, not mockups. Final loaded appearance is retained; pending summary reserves its eventual position. Filter y533.625→1003.375 before, y1003.375→1003.375 after. Original committed baseline7a5e383 was measured separately for CLS.

| State | Before fix | After fix |
| --- | --- | --- |
| Pending summary | [Actual screenshot](operations-shift/operations-before/pending.png) | [Actual screenshot](operations-shift/operations-fixed-final/pending.png) |
| Data loaded | [Actual screenshot](operations-shift/operations-before/loaded.png) | [Actual screenshot](operations-shift/operations-fixed-final/loaded.png) |

Native zoom uses actual Chromium tabs.setZoom2 in a disposable profile, physical window780 (CSS content762→381 at zoom2), CSSzoom1/pinchScale1. CDP captures visible device pixels directly because Playwright fullPage initially clipped under zoom; corrected captures replace that capture method, not application layout. Sixteen PNG cover both themes and physical windows780/1440, SettingsVI/EN, editor and mock player.

- [SettingsVI Light, actual zoom200](native-zoom/settings-vi-light-780.png)
- [SettingsVI Dark, actual zoom200](native-zoom/settings-vi-dark-780.png)
- [Admin editor Dark, actual zoom200](native-zoom/admin-vi-dark-780.png)
- [Mock player Dark, actual zoom200](native-zoom/ielts-vi-dark-780.png)
- [Real Next errorVI Light](error/vi-light.png)
- [Real Next errorEN Dark](error/en-dark.png)

Loaded route/theme/viewport screenshot matrix is under regression/ and the affected final group under operations-regression-final/. Phase5 visual baseline remains immutable in the sibling phase5 directory. No physical-device, Safari, assistive-tech or full-WCAG certification is implied.
