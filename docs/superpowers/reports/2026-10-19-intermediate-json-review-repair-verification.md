# Intermediate JSON review and repair — 2026-10-19

## Changes

- Valid pasted/file/template JSON auto-fills untouched form state and provides a link to the filled lesson information. Further JSON edits synchronize until an administrator edits the form manually; replacement then requires explicit confirmation, including edits made while a file was being read.
- Shared strict JSON validation reports specific field paths; scalar line breaks, duplicate/reserved slugs, invalid options/answer indexes/evidence and source delimiters are checked before applying.
- Syntax errors retain parser details and line/column where available, plus a caret navigation action. At most ten diagnostics are displayed; original JSON and form fields remain intact.
- Explicit AI repair requests use the existing provider configuration once, with bounded input/output, role checks and rate limiting. Fake mode reports unavailable instead of inventing a repair.
- Proposed text patches must match uniquely, produce valid topic JSON and retain decoded values, primitive order, bracket structure and the passage's line layout. Duplicate keys, missing/incomplete data, changed answers/content/counts or uncertain proposals are rejected. An administrator reviews and explicitly applies a proposal; no automatic save, approval or publication.
- A current-section regression observed during browser checks was reproduced and fixed so a question is preferred over its large containing section.

## Verification

- RED→GREEN: automatic paste/file filling; exact `writingModel` diagnostic path; duplicate-key/structural-repair rejection; outline section selection.
- Contract suite: **22 files / 115 tests passed**; contract lint and TypeScript passed.
- Final full web suite: **118 files / 698 tests passed**, with two workers to avoid contention. Earlier broad runs under heavier parallel load had timeouts in the existing band JSON test and the 10-question editor test; the final suite passed both.
- Intermediate API suite: **10 files / 43 tests passed**, including administrator/learner HTTP access, invalid bodies, provider refusal/failure, formatting-only repair and changed-answer rejection. Test application uses the same body-parser configuration as production.
- API lint, TypeScript and build passed. Full backend/DB integration suites were not rerun; no schema or database changes.
- Web lint and TypeScript passed. Translation check: **36 namespaces / 2264 paired keys / zero errors**.
- Independent bounded review found no concrete P1/P2 findings. Reviewer also ran 36 focused tests across six files successfully.
- Browser fixture used the actual user attachment: valid JSON rejected for multi-paragraph `writingModel`; a whitespace-only candidate passed shared preservation validation. The UI displayed diagnostics and the proposal separately, applied only after an explicit click, filled lesson information/source passage and retained exactly **8 reading + 2 listening questions**.
- Incomplete JSON showed line/column and caret positioning, with AI disabled for missing content. Desktop/mobile dark-mode screenshots were inspected; no overflow or page errors. All browser API calls were intercepted; no live AI call or user-content mutation occurred.
- API runtime health returned 200 with database/storage up, and unauthenticated repair returned 401. Windows reserves the range containing port 4000, so this session runs API on 4300 and web on 3000 with its proxy directed to 4300; environment overrides are session-local.

## Limits

No live provider quality or latency claim; responses were tested with controlled fixtures. Real use requires a configured provider. Repairs are intentionally conservative: preserving brackets and all content means some otherwise recoverable JSON must be corrected manually. A production web build was not rerun; actual Next development routes and web type/lint tests were checked.
