# Diagram text regression

User reported missing text. The overview and ordinary page content were present; flowchart node labels were blank after rendering.

Root cause: with Mermaid 11.17.2, setting only `flowchart.htmlLabels: false` still emitted HTML labels inside SVG `foreignObject`. The renderer intentionally removes foreignObject as part of its SVG policy, which also removed those labels. Previous smoke tests checked SVG existence, navigation and interactions but missed label loss after sanitization.

Fix: set global `htmlLabels: false` while retaining strict security mode, per-flowchart configuration and the existing sanitizer. Labels are native SVG text, so no relaxation of sanitization is needed.

Regression: `npm run smoke:diagram-text` runs the real UI renderer in Chromium, checks two node labels and an edge label after sanitization in light/dark themes, then checks all 38 real dependency-map nodes retain text. This test failed with blank labels before the change and passed afterward. The main smoke command now rejects empty dependency-map node labels as well.

Checks: 21/21 existing tests, lint, model typecheck, source/graph validation and production build passed. Light/dark native-label regression passed. Full browser smoke results are recorded separately in ui-smoke.json.

Changes stay within the documentation folder. No production source, database or Git history was modified. Existing local server is retained for the user's requested preview.

SKILL AUDIT
Used: systematic-debugging → reproduce and trace missing labels; test-driven-development → failing/passing browser regression; ui-ux-pro-max → text visibility in both themes; git-workflow-and-versioning → working-tree safety; code-review-and-quality → bounded independent review; verification-before-completion → executed checks.
Not used: brainstorming because this restores specified existing behavior rather than designing a new feature; backend/database workflows are outside scope.
