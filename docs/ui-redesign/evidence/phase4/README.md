# Phase4 real application before/after gallery

**34/34 actual routes verified with Chromium schema-valid fixtures.** Immutable optimized baseline2d9ba79 versus per-slice production owner commits; final whole-phase source bcef16b.105 final browser checks and403 web tests pass. These are screenshots of the real application, not generated mockups or live backend certification.

| Slice | Actual surfaces | Before/after and measurements |
| --- | --- | --- |
|1|Public landing, Login/Register, missing-page boundary|[Gallery](slice-1/README.md)|
|2|Dashboard, Programs, Mastery|[Gallery](slice-2/README.md)|
|3|Onboarding, placement, session reading/listening/writing/speaking/media|[Gallery](slice-3/README.md)|
|4|Orientation, Bridge catalog/player|[Gallery](slice-4/README.md)|
|5|Integrated launcher/player, Pathway, Mock catalog/player|[Gallery](slice-5/README.md)|
|6|Content list/import/editor, Curriculum and five IELTS authoring owners|[Gallery](slice-6/README.md)|
|7|Settings/account/system AI/audio, Audit, Operations, Analytics|[Gallery](slice-7/README.md)|

Each gallery links Light/Dark and390/768/1440 viewport captures. Source hashes and per-test evidence identify fixture conditions and limitations. Final re-run captures live in [final-run](final-run/README.md); prior accepted capture bytes/manifests are preserved.

## Settings equivalent390px/CSS zoom200

| Locale | Baseline scrollWidth | After | Real screenshots |
| --- | ---: | ---: | --- |
|VI|564|390|[Before](slice-7/before-production-settings-vi-390-css200.png) / [After](slice-7/production-settings-vi-390-css200.png)|
|EN|615|390|[Before](slice-7/before-production-settings-en-390-css200.png) / [After](slice-7/production-settings-en-390-css200.png)|

The wider full-page baseline PNG reflects actual horizontal overflow. Both use390x844 viewport, CSS zoom2, System appearance in the same Chromium environment and schema-valid fixtures. CSS zoom is not native browser zoom.32 locale/width/zoom cells, long text and full native focus indicators pass after owner-grid fixes, without overflow hiding.

[Completion and QA report](../../phase4-completion.md), [final provenance](final-run/manifest.json), [34-route mapping](final-run/routes.json). Human Phase4 acceptance is pending; no Phase5/6/merge/push/deploy.
