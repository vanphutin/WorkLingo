# Beginner R1.2b browser and cost implementation plan

> **For agentic workers:** Use executing-plans for coordinator work and bounded independent agents for disjoint cost, simulation and Gate C tasks. Tests precede behavioral implementation; the coordinator owns the register and commits.

**Goal:** Complete actual 24 synthetic frontend journeys, safely reduce Discovery request cost, and deliver human Gate C orchestration tooling while preserving all release gates.
**Architecture:** Exercise the current real Next frontend against a fail-closed loopback in-memory simulation generated from the eight canonical sources and existing parser/planner/projection. Compact only redundant validated Beginner Discovery metadata. Add a separate consent-gated Gate C CLI, preserving the synthetic rehearsal API.
**Tech Stack:** Existing TypeScript, Node/tsx, Node test/Vitest, Next, CUA browser automation; no new dependencies.
**Spec:** `mandate/reports/2026-10-30-r12b-browser-cost-authorization.md`, canonical IMPLEMENTATION_ROADMAP and existing Beginner qualification specs.

## Global constraints

- Baseline a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c, existing linked branch codex/foundation-basic-readiness; old frozen scopes/tests stay exact.
- 1.5 InkPoints maximum, USD 0 additional, zero live calls in this successor. Preserve qwen3.8-27b, Discovery endpoint, 2048 output reservation, 20 pilot/160 starts/32 anchor repeats and existing acceptance thresholds.
- No .env, credentials, DB, actual account changes, human responses, recording of people, publish/merge/push/deploy or readiness promotion.
- Exact paths in successor scope only. Runtime synthetic files stay in the named temp namespace; no real Gate C private files are created now.
- Browser evidence is SYNTHETIC_BROWSER_TESTING with MOCK_PROVIDER and simulated authentication/persistence; do not imply DB, real AI or learning efficacy qualification.

## Review focus

- Compaction must validate first, preserve exact fact/criteria strings and injection escaping, and preserve legacy OpenAI bytes.
- Simulation must reject cross-persona/session access, unknown routes and invalid submissions; UI success alone cannot prove backend behavior.
- Speaking must use supported synthetic media only; unavailable media remains an explicit gap, never a fabricated recording.
- Timer recovery cannot invent active time or consent; thresholds and 24-hour spacing remain unchanged.
- New governance checks historical scopes at their final baseline and evaluates only this successor delta without broadening old approvals.

## Task 1: Discovery cost (cost_oracle)

Exact files: Discovery adapter/spec, provider-calibration.ts/test, new cost-benchmark.ts/test, named cost report/JSON.
- [ ] RED: assert retained facts/criteria/level and escaping, removed redundant IDs, legacy byte equality and unchanged schedule/reservations.
- [ ] Implement Discovery-only compact serialization after validation; preserve full response schema, model and output cap.
- [ ] GREEN: run adapter/provider/benchmark suites, offline actual serialized 20/160 request benchmark, no tokenizer or cache savings claim.
- [ ] Report per-request/pilot/full/worst failed-start reservation and actual spend 0; independent review then atomic commit.

## Task 2: Browser simulation and actual UI (web_p2 + coordinator)

Exact files: browser-simulation.ts/test/test-server, browser-qualification.mjs supervisor, synthetic personas, browser report/results and five screenshots.
- [ ] RED: verify actual eight source hashes/24 namespaces; canonical learner DTO redaction, session progress, draft revision, consent/multipart recording and unknown/cross-session failures.
- [ ] Implement memory-only loopback simulation, explicit simulated auth cookie and source-bound immutable sessions; no upstream fallback.
- [ ] Start sanitized real frontend snapshot with allowlisted environment and no env files; use CUA to perform all 24 journeys, all four skills where supported, persona-specific scripts, errors/pause/reload/drafts, responsive and progress checks.
- [ ] Save observed UI states, timestamps, logs, requests and screenshots. Any observed product bug gets reproduction and matching finite successor before fix.
- [ ] Independent review and safe regression, then atomic commit. Do not substitute unit tests for UI operations.

## Task 3: Gate C tools (audio_qa)

Exact files: gate-c-session.ts/test, operator.md, tooling-verification.json, orchestration-report.md.
- [ ] RED: missing consent/eligibility/authority, wrong versions/order/spacing, unsafe provenance, crash timing and incomplete outcomes fail closed.
- [ ] Implement coded events, monotonic active/wait/support/research timer, pause/resume/stop and 60-minute cap, withdrawal/defect stops, private output gate and aggregate-only public summary.
- [ ] GREEN synthetic tests and CLI dry run/status show 0 real observations and NEEDS_HUMAN_EVIDENCE; document actual facilitator workflow without inventing evidence.
- [ ] Independent review, exact-file commit.

## Task 4: Governance, integration and closure (coordinator)

- [ ] Bind new approval/hash/scope via CLI; preserve all historical authority and protected assets.
- [ ] Add successor governance test: verify historical tests at a4685e7, current exact delta, hashes, no unexpected files.
- [ ] Run relevant safe no-env API/frontend suites, lint/typecheck/build as warranted; default env/DB integration remains excluded.
- [ ] Independent integrated review of full delta, fix Important findings, verify report counts against artifacts, validate register and explicit-file commits.
- [ ] Deliver all five requested reports, screenshot and local commit inventory. Terminal state is verified engineering with external provider/human/release gates explicit if they remain blocked.

## Plan review

The owner supplied execution method and waived routine questions. This plan reuses canonical qualification work; it does not create a competing backlog. Cost, simulation and Gate C have disjoint writers. Reviewer checks every requirement against artifacts, with the five review-focus cases covered by their owning tests. Parent performs the actual browser work and final verification.
