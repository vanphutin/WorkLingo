# Slice 1 — actual route comparisons

Before: immutable optimized2d9ba79. After: optimized source7a37bed. Same Chromium, guest network fixture, Vietnamese cookie, viewports and stored Light/Dark preference. No live account/provider/database. No generated mockups. `manifest.json` binds PNG/source hashes; `production-verified-tests/` contains the10 passing check records (24 route observations,198 contrast samples,12 CSS200 focus cases). Earlier diagnostic failures and deliberate focus mutation are retained under their own run names and are not counted as passes.

| Actual page | Before / after, desktop Light | Before / after, mobile Dark |
| --- | --- | --- |
| Home | [Before](before-production-home-light-1440.png) / [After](production-home-light-1440.png) | [Before](before-production-home-dark-390.png) / [After](production-home-dark-390.png) |
| Login | [Before](before-production-login-light-1440.png) / [After](production-login-light-1440.png) | [Before](before-production-login-dark-390.png) / [After](production-login-dark-390.png) |
| Register | [Before](before-production-register-light-1440.png) / [After](production-register-light-1440.png) | [Before](before-production-register-dark-390.png) / [After](production-register-dark-390.png) |
| Not found | [Before](before-production-phase4-missing-page-light-1440.png) / [After](production-phase4-missing-page-light-1440.png) | [Before](before-production-phase4-missing-page-dark-390.png) / [After](production-phase4-missing-page-dark-390.png) |

All four also have768px captures and390/1440px complementary themes. Parent visually inspected desktop Home/Login and mobile Home/Register including Dark. Automated checks cover remaining cells. Error retry callback/confidentiality uses the actual component unit test; a live runtime exception is not browser-certified. See [Phase4 QA](../../../phase4-qa.md) and [review](review.md).
