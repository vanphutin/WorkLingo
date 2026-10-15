# Mandate Steward design

## Intent and scope

WorkLingo needs an evidence-backed improvement intake, not an autonomous product-code writer.
The user authorized creating this skill, its repository register and tools. Approval of this tooling
does not approve any mandate it discovers. Default operation is record-and-propose.

## Repository observations

- `AGENTS.md` requires dynamic skill discovery, scoped Git changes and evidence before claims.
- `docs/ARCHITECTURE.md` and `apps/api/src/app.module.ts`: Next.js/NestJS modular monolith,
  local PostgreSQL/files, durable jobs, AI adapters, immutable learning/version boundaries.
- `docs/IMPLEMENTATION_ROADMAP.md`: Increment 1–5 and IELTS Phase plans, Definition of Ready/Done.
  `docs/superpowers/plans/` owns execution plans; specs own approved designs.
- No separate Sprint/Scrum board or GitHub Actions directory was found. Mandates reference the
  existing roadmap and execution plan; a future sprint reference is optional, not a new task board.
- D-016/031–035 require immutable published versions and historical session isolation. D-028 and
  `docs/RELEASE_CHECKLIST.md` require human calibration/content/operator approval before pilot release.
- Dirty `codex/ui-redesign-v2` contains unrelated ongoing work. Add tooling in this checkout;
  do not stage or publish the surrounding changes as part of this task.

## Chosen design

Use `.agents/skills/mandate-steward/SKILL.md` as a concise, discoverable entrypoint; details in
`references/governance.md`. Store the single register in `mandate/`: `INDEX.md`, active `items/`,
`reports/`, reusable `templates/`, terminal `archive/`. This is cheaper and more reviewable than a
database/Admin module or a second Scrum service. No runtime app, database or dependency changes.

Files use `MND-YYYYMMDD-NNN-type-short-description.md`. The immutable ID is
`MND-YYYYMMDD-NNN`, globally unique across active and archived files; NNN starts at 001 and cannot
exceed 999 per date. Types: bug, feature, performance, security, architecture, refactor, upgrade,
ux, learning-content, infrastructure. Filename `ux` displays as UX. Dates are explicitly calendar
dates; the operator may pass an audit date. Default CLI date uses UTC and reports that convention.

Frontmatter uses JSON objects between YAML delimiters (JSON is a YAML subset). This deliberately
avoids another YAML dependency and ambiguous implicit dates. JSON Schema is the single structural
contract; a small validator supports only the schema keywords we use and fails on unsupported ones.
Handwritten alternative YAML is unsupported and produces a clear format error.

## Workflow and authority

AUDIT → DISCOVER → CAPTURE → TRIAGE → APPROVE → IMPLEMENT → VERIFY → ARCHIVE.
Audit/discovery are runs, not item statuses. Captured → triaged → approved → implementing →
verified → archived; triaged may be deferred/rejected; deferred may return to triaged; rejected
may be archived. Archive retains outcome. Related observations are report entries, not fake bugs.

Capture requires a factual observation with a resolvable citation, explicit unknowns, concrete
beneficiary/value, acceptance criteria, risk/effort, affected scope, and dedupe key. Hypothesis-only
claims remain in audit reports. Triage scores impact/confidence/effort, assigns an owner, and
references the canonical backlog. Priority is an estimate, not a sprint commitment.

Approval records named human, dated authorization reference, and proposal SHA-256. Explicit
authorization in a user message can be recorded in a repository approval note; never manufacture
authorization. Hash covers proposal metadata and Markdown scope/plan. Updates reset to captured
and revoke approval; approved/in-progress scope is frozen. Starting implementation requires a
linked existing execution plan; verification requires named checks, passing results and evidence.
The CLI records governance states only and cannot execute application code. It cannot authenticate
the human behind a string: review of the authorization source remains mandatory; files are not
an authorization security boundary. Large/breaking/data/security/publishing changes require explicit
approval for those exact actions, compatibility checks and rollback planning.

## Consistency and deduplication

Exact normalized dedupe-key and normalized title matches search active AND archived items across
types. Search also returns token-similar candidates; agent reviews conceptual overlap and existing
roadmap before capture. Never override an exact duplicate just by changing its type/title.
Recurrence after closure updates evidence and seeks a new human-scoped plan; this v1 CLI does not
reopen archived items. Genuine distinct problems use distinct keys and explain their relationship.

All mutation commands take an exclusive register lock and prevalidate the register and current
INDEX. Writes stage complete content before atomic publish; new files use exclusive hard links
on the same local volume. Interrupted item+INDEX updates are detected by validate and recoverable
with reindex after inspection. Relocations persist a journal; explicit recover verifies original
hash/target scope and completes the operation plus INDEX. ID allocation is serialized and exclusive.
Symlinks/path escapes in the managed register and local references are rejected. No shell command
or provider is evaluated from item/report content. No secret/raw learner submissions in evidence.
INDEX is a deterministic derived view of items/archive; human policy text lives in README instead.

## Activation and verification

On-demand audit, sprint refinement/review and before-release audit use scoped prompts and a report
template. Future scheduler integration must be explicitly requested: Codex heartbeat/automation or
GitHub Actions+agent runner can invoke the same skill in proposal-only mode, serialized per register.
No scheduler, cloud account, auto-commit, implementation or release approval is created now.

Tests use Node's built-in runner with temporary synthetic repositories. Cover capture, naming/ID,
schema/evidence/value gates, exact+semantic candidate search, archived duplicate detection, history,
approval/hash/scope invalidation, verification/archive, stale INDEX, invalid references, lock races,
unsafe paths and a CLI journey. Pressure scenarios test agent behavior without and with the skill.
Fault-injection subprocesses additionally test partial writes and abrupt exit during relocation.
Run focused tooling checks and skill validation; application tests are unrelated to this additive
repository-management tool. One fresh read-only reviewer checks the final scoped change.
