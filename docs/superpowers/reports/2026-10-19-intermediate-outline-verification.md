# Intermediate outline verification — 2026-10-19

## Behavior

The topic editor has a right-hand sticky outline on viewports at least 1200 px wide. It lists the JSON panel, basic information, source passage, every reading/listening question, connected practice, saving and applicable review/publication tools. Word count and question counts reflect current form state. New records omit review links; published records omit saving links.

On smaller screens the outline precedes the form, starts collapsed and has a bounded scroll area when opened. In-page links open the JSON disclosure when needed and focus the destination without invoking the dirty navigation guard. Current-section observation uses one observer and cleans up on unmount or target changes.

Administrator-authored arrays determine the question count. A longer passage never generates questions. AI remains limited to the existing duration proposal workflow; no AI question generation was added.

## Verification

- TDD: the 10-reading-question import/outline test first failed because the outline was missing, then passed. It also checks final-question focus, unchanged count after lengthening the passage, add/remove updates and preserved edits without a leave confirmation.
- A second component test checks JSON expansion/focus and distinct reading/listening anchor IDs.
- Full web suite: **115 files, 687 tests passed**.
- Web TypeScript and lint passed. i18n: **36 namespaces, 2250 paired keys, zero errors**. Diff whitespace check passed.
- Browser fixture: actual Next routes, 1260-word passage and long prompts with **6 reading + 4 listening questions**. Import/export/save retained exactly 10 questions, without AI requests.
- At 1440 px the outline is right of the form, remains sticky after jumping to the last listening question and focuses the destination. At 375 px it starts collapsed and supports the same jump after opening. Neither viewport overflowed horizontally.
- Published read-only record checked in dark mode: no save link, question jump/focus still works. Light/dark and mobile screenshots inspected; no page errors. All API requests were intercepted, with no user-record mutations or live AI calls.
- One independent bounded review found no P1/P2 findings.

No backend, database, dependency or JSON-format changes. Production build and backend suites were not rerun for this frontend increment.
