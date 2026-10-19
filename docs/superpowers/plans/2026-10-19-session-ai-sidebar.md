# Session AI feedback sidebar

User request: move AI feedback below the session information in the right column, make processing steps clear, and show a subdued model name for each responsibility. Existing design and delegated implementation choices apply.

Design: keep the activity in the main column. Right column stacks independently collapsible session information and AI feedback; on mobile it follows the activity. Feedback has a compact summary/score, actual processing steps and expandable details. No fake percentages. Stages are submission, optional speech transcription and evaluation/feedback. Read state from persisted attempt/recording/result; expose only recorded provider/model names. Pending model information stays explicitly unconfirmed, without another AI call or exposing routing configuration.

Steps:
1. Failing tests for sidebar placement, processing/completed/failed stages, saved model provenance and compact feedback details.
2. Extend learner-safe evaluation DTO with optional processing steps; populate from existing persisted fields, without schema migration. Preserve response compatibility, recording privacy/retry behavior and polling cadence.
3. Move component into the right-column stack, add accessible state labels/subtle metadata and responsive styling. Keep rule-based comprehension feedback near the activity.
4. Focused API/contracts/web tests, types/lint, review and browser verification at desktop/mobile; explicit-file commit. Do not submit learner answers or invoke paid AI providers during verification.

## Completed and verified
- Feedback now sits below session information in a separate right-column stack. Information collapse does not hide feedback; detailed feedback expands separately. Small screens retain the existing single-column breakpoint.
- The API reports submission, optional speech recognition and evaluation states from persisted data. A bounded job-status query is used only for pending speech attempts, so recognition and language-evaluation queues are distinguished. Completed model names come from saved evaluation provenance; current routing configuration is never substituted.
- Topic session information shows the actual approved minutes of the current stage, rather than a fixed fifteen-minute claim.
- 14 focused API tests (including ownership/retry and real database pipeline tests), 28 web tests, API/web type checks, touched-file lint and API build passed. A final feedback-component rerun passed after the presentation refinements.
- Real signed-in session verified on desktop (two columns), 960px (existing single-column breakpoint) and 375px mobile, without horizontal overflow. Model qwen3.8-27b is shown for the completed evaluation; metadata text is at least 12px and the score stays on one line. Detail disclosure was exercised. Temporary viewport overrides were reset.
- Screenshots: .superpowers/ai-sidebar-desktop.png and .superpowers/ai-sidebar-mobile.jpg. Verification did not submit answers, invoke live AI providers, alter learner progress or change provider settings. Concurrent settings/landing/admin changes are excluded from the commit.
