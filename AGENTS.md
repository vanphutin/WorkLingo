# Engineering and skill routing

## Discover dynamically

At session start, before substantive repository work, inspect global
`~/.agents/skills/`, repository `.agents/skills/`, and native/plugin skills
exposed by the current environment. Read actual names and frontmatter first;
do not infer availability from memory or load every workflow. Keep a session
registry of paths, purposes, triggers, exclusions, and overlaps. Refresh it
when installations change. Report missing or unreadable skills accurately;
never claim to use them or silently replace a required skill.

## Classify and route

Before every task, classify it and consult the registry. Applicable exact-match
installed skills MUST be used. Select the smallest sufficient set, preferring
task-specific skills, then framework/domain skills, then workflow skills.
Choose one primary skill per responsibility; add another only for a distinct
need. Respect invocation restrictions. If none applies, explicitly report
`Selected: none` and why.

## Execute the selected workflow

Read each selected `SKILL.md` fully before execution. Follow its mandatory
sequence, constraints, checks, and completion criteria; read supporting files
only as needed. Do not skip required planning, reproduction, tests first, or
review to start editing sooner. Route compound tasks phase-by-phase and
reassess skills when scope changes.

Within higher-priority system/developer instructions, resolve conflicts by:
explicit current user instructions, applicable repository instructions,
task-specific skills, domain skills, workflow skills, then defaults.
Disclose conflicts that materially affect the result before proceeding;
request clarification only when necessary.

## Git safety

Before edits, inspect Git status, current branch, and existing changes.
Use applicable Git skills for Git operations. Preserve unrelated user work;
stage explicit files or hunks and prefer atomic commits. Do not use blanket
staging, discard unknown changes, or perform destructive resets, force pushes,
or shared-history rewrites without specific justification and authorization.
Keep commits, pushes, and publishing within the user's authorized scope.

## Testing and verification

Use applicable TDD, testing, review, and verification skills. Run checks
appropriate to the change and all required gates. Inspect failures, fix
regressions caused by the work, and verify the final diff before claiming
completion. Report checks actually run, their results, and any skipped checks
or blockers. Distinguish verified facts from assumptions; do not call untested
work passing. Stop redundant checks once verification is sufficient.

## Concise reports

Before substantive work, emit:

```text
SKILL ROUTING
Task: <classification>
Selected: <skills or none>
Reason: <brief explanation>
Execution order: <phase order>
```

After substantial work, emit:

```text
SKILL AUDIT
Used: <skill -> responsibility>
Verification: <checks and results>
Not used: <relevant alternatives and reasons, or none>
```

Only claim skill usage when its instructions were read and followed.

## Mandate Steward

For improvement audits, mandate/proposal management, sprint refinement or pre-release reviews,
read `.agents/skills/mandate-steward/SKILL.md` and its governance reference. Keep evidence-backed
proposals in `mandate/`; hypotheses remain in reports. Reuse the existing roadmap/spec/plan rather
than create a competing sprint board. Default is record-and-propose: audit permission is not
implementation, data-change, publication or release approval. Verify explicit human scope before
starting approved work. Run the mandate CLI `validate` before handing off register changes.
This skill is not a scheduled service; configure a real runner only when explicitly requested.
