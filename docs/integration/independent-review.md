# Independent integration review

Reviewer: fresh-context agent Einstein, 2026-10-20 15:54 UTC evidence cutoff. Read-only review of main `7a5e383763ccd63c4befa4ab07a5559ba7cabfbe` to product checkpoint `f172cd9e6ae4d1c538870a8d407f09dc1a3e3950`, emphasizing merge commits a208f75/2cb0cb3 and dirty reconciliation. No reviewer edits, database access, external access or reviewer subagents. One review, not a second acceptance cycle. Author remediation and final qualification follow this cutoff.

Original verdict: **Request changes / RED**. Two actual-component, deferred-response/in-memory reproductions confirmed unsaved-data loss. The reviewer independently checked approved ancestry, all52 dirty dispositions and preservation hashes; no missing disposition, source/hash/index/status drift, product conflict marker or inspected fixture-to-production import was found.

| Finding | Effect / evidence | Author disposition |
| --- | --- | --- |
| Critical/P1 curriculum collapse/filter | FoundationDefinitionEditor lived in an unmounted subtree; modified objective returned to saved statement after Collapse all/Expand all | Stable editor outside filtered/collapsed tree, keyed by actual mission. Workspace test reproduces old loss and checks identity, value and unchanged load count through collapse/search/status/path filters. RED→GREEN |
| Critical/P1 IELTS save-and-exit | New writing entered during deferred save was absent from outgoing snapshot when navigation occurred | Dedicated exit lock disables response editing until successful navigation; failure unlocks and preserves draft. Ordinary saves retain editable local drafting. Deferred success/failure tests RED→GREEN; original lost-response/newer-writing test retained |
| Important/P2 Foundation focus suppression | Imported scoped :focus rules set outline/box-shadow none; cascade could suppress intended ring | Explicit semantic3px ring for Foundation/search/select; actual browser coverage added. Pre-fix Chromium probe already showed a ring on Foundation controls and failed on draft loss instead; do not claim a reproduced Foundation ring failure. Reflow probe independently reproduced566px at320/CSS200 |
| Minor/P3 invalid imported animation/selector | Keyframe selectors prefixed with .curriculum-container, repeated keyframe blocks; :has-text is not CSS | Deferred minor: jump highlight animation and Foundation-specific decorative selector. No data/state/security impact established. Build diagnostics retained; no claim of warning-free CSS |

Other QA defects observed during review were not accepted as passing: missing harness import-time config; current Prisma model selecting future columns at old migration boundaries; backup PowerShell wrapped message assertion; topic JSON repair requiring optional speech keys; stale browser expectations for structured Band/mock editors, dashboard tabs and gated transcript. See integration-qa.md for exact replacement runs; failed evidence remains.

## Review limits and author rulings

- 3,563-file inherited range was reviewed by risk/owner, not exhaustively line by line. Approved history remains auditable; integration tests reduce but cannot eliminate inherited risk.
- Entire audio backend correctness/security was not independently certified; no reviewer database access. Disposable API/contract/real-browser qualification is the author's gate.
- Later runtime contract and QA changes were observed but not finally accepted by the reviewer. Author regression tests, final source manifest and fresh checks must qualify those bytes; no second review implied.
- Exhaustive visual/a11y, commercial providers, physical recording hardware, packaging and field performance were not exercised. These remain explicit limitations, not passes.
- Historical LG index bytes were not in the original manifest. LG HEAD/status are verified; original main index bytes are verified. No historical LG index-hash assertion is made.
- Non-test migrations, merge/release/push/deploy remain unauthorized. No reviewer verdict grants that authority.

Strengths recorded: all85 approved commits preserved, five deferred commits excluded; generic guarded navigation seam with26 destinations; inline feedback data/controls preserved;52 unique dirty dispositions; mandate provenance retained byte-exact at committed-blob level (checkout CRLF conversion distinguished).

Review verification was read-only history/diffs, two in-memory reproductions, fresh preservation comparison, scoped imports/secret checks and QA log inspection. It was not a new execution of the complete suites, a production secret audit or deployment-package certification.
