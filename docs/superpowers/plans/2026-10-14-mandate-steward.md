# Mandate Steward Implementation Plan

> **For agentic workers:** Use executing-plans for inline implementation. Track checkboxes and evidence here; use writing-skills for behavioral validation.

**Goal:** Create a proposal-only improvement register with tested lifecycle tools and skill guidance.
**Architecture:** Markdown/JSON-subset YAML frontmatter backed by a deterministic local CLI.
**Tech Stack:** Node 20 standard library; Markdown; JSON Schema; no application dependencies.
**Spec:** `docs/superpowers/specs/2026-10-14-mandate-steward-design.md`.

## Global constraints

- No database, runtime app, cloud, scheduler or automatic implementation changes.
- Preserve current dirty workspace; no blanket staging or unrelated commits.
- Proposal approval is distinct from implementation, publication and pilot approval.
- Reuse roadmap/spec/plan links; no independent sprint board.

## Review focus

- Similar titles with different categories must still reveal duplicates.
- Archived items participate in uniqueness and ID allocation.
- Revisions to proposal content invalidate approval, including hand-edited body changes.
- Broken or escaping references and symlinked register directories cannot cause external writes.
- Failed/concurrent commands must leave recoverable files and detected INDEX inconsistencies.

## Task 1 — Contract and lifecycle tooling

Files: skill `scripts/model.mjs`, `scripts/store.mjs`, `scripts/mandate.mjs`, `scripts/mandate.test.mjs`,
`references/mandate.schema.json`; `mandate/templates/mandate.json` and `mandate.md`.
File staging is owned by `scripts/files.mjs`; fault injection by `scripts/test-fixtures/fault-loader.cjs`.
Interfaces: `create(root, proposal, date)`, `transition(root, id, status, details)`,
`update(root, id, proposal)`, `find(root, query)`, `validate(root)`, `reindex(root)`.
Recovery interface: `recover(root)` finishes only the validated pending register relocation.

- [ ] Write behavior tests with real temporary files and observe RED for the missing tool.
- [ ] Implement schema/evidence/value checks, duplicate prevention, serialized IDs and lifecycle guards.
- [ ] Run `node --test .agents/skills/mandate-steward/scripts/mandate.test.mjs`; expected all pass.

## Task 2 — Skill, register and integration

Files: `SKILL.md`, `references/governance.md`, `agents/openai.yaml`, `mandate/README.md`,
`INDEX.md`, reports/templates/items/archive, and the routing addition in `AGENTS.md`.
Add `mandate:check`/`test:mandate` scripts and those two gates to the existing `package.json` verify chain.
Consumes Task 1 CLI and schema. Produces documented register and usable activation prompts.

- [ ] Read-only baseline pressure scenarios before writing the skill; record observed gaps honestly.
- [ ] Write skill/reference and audit templates; inventory discovered skills with availability distinctions.
- [ ] Generate initial register via CLI; capture only independently evidenced findings as proposals.
- [ ] Run with-skill pressure scenario; validate schema/frontmatter using skill-creator validator.

## Task 3 — Final review and verification

- [ ] Ask a fresh reviewer to inspect only the new mandate paths and `AGENTS.md` addition.
- [ ] Fix actionable findings with reproduction tests; run complete mandate test suite.
- [ ] Run register validate, CLI smoke test, skill validator, syntax checks and scoped diff check.
- [ ] Record evidence, decisions and limitations in `mandate/reports/`; report created files to user.

## Execution ledger

- Ruling: implement in current feature checkout because governance must reflect its actual uncommitted
  state; test isolation is supplied by disposable synthetic repositories. No commit/push in this task.
- Ruling: follow user's explicit design-and-implement request without a second planning permission turn;
  the resulting discovered product changes remain captured proposals requiring separate approval.
- Pre-flight: Task 2 consumes the CLI/schema from Task 1; Task 3 verifies both. No conflicting interfaces.
