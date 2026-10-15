# Discovery AI Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans; execute locally with one final review. Steps use checkbox syntax.

**Goal:** Integrate Discovery evaluation and account/system AI settings with bounded fallback.

**Architecture:** Reuse evaluation ports, rubric validation and provider HTTP boundary. Persist settings in one additive table and provenance in the existing evaluation result columns.

**Tech Stack:** NestJS 11, Prisma 6, Zod 4, Next.js 16, Vitest.

**Spec:** docs/superpowers/specs/2026-10-14-discovery-ai-design.md

## Global Constraints

- No new runtime dependencies, chatbot, curriculum mutations, commits/pushes or public deployment.
- Discovery qwen3.8-27b default after synthetic compatibility check, 2048 output token cap, at most one fallback per invocation.
- Keep fake source/E2E defaults; SYSTEM_ADMIN owns global changes; secrets server-only.
- Preserve prior uncommitted i18n/redesign; the task baseline is in .superpowers/sdd/2026-10-14-discovery-ai.

## Review Focus

- Provider failure with fallback disabled: zero calls to alternate.
- OpenAI-only capability unavailable: fail without downgrade.
- Concurrent users with opposite choices: correct per-result provenance.
- Stale account settings request: reject without mutation.
- User preference cannot bypass global fallback disable; admin content role cannot alter global billing policy.

### Task 1: Provider configuration and Discovery adapter

**Files:** common/config/app-config.schema.ts and spec; ai-gateway/infrastructure/discovery-language-evaluation.adapter.ts and spec; .env.example.
**Interfaces:** DiscoveryLanguageEvaluationAdapter.evaluate(input: LanguageEvaluationInput): Promise<LanguageEvaluation>; config requires discovery key only in discovery mode, independent OpenAI credentials for optional fallback.
- [x] Add failing config and transport tests for Discovery mode, token cap, JSON validation/truncation/refusal.
- [x] Run `pnpm --filter @worklingo/api exec vitest run src/common/config/app-config.schema.spec.ts src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts`; expected red for missing feature.
- [x] Implement the adapter and bounded configuration without changing existing OpenAI contract.
- [x] Rerun focused tests; expected pass.

### Task 2: Persistent settings and routing

**Files:** Prisma schema/additive migration; packages/contracts/src/ai-settings.contracts.ts; ai-gateway/application/ai-settings.service.ts; routing-language-evaluation.adapter.ts; settings controllers; evaluation.service.ts; ai-gateway.module.ts.
**Interfaces:** AiSettingsService.resolve(userId?: string): Promise<{preferredProvider: 'discovery'|'openai'; fallbackEnabled: boolean}>. Evaluation result includes optional provenance consumed by EvaluationService.
- [x] Write failing router tests covering both directions, no-loop, disabled/unavailable fallback, refusal, non-provider errors, OpenAI-only and concurrent provenance.
- [x] Write failing settings tests and disposable DB integration for auth/roles/owner/persistence.
- [x] Run focused tests; expected red before implementation.
- [x] Implement strict contracts/DTOs, settings service, additive migration and routing; actual provenance must accompany individual output.
- [x] Generate Prisma client; rerun focused tests and existing Teacher AI tests; expected pass.

### Task 3: Learner and admin settings

**Files:** web/features/ai/ai-settings-panel.tsx and tests; lib/api/ai-settings-client.ts; i18n/messages/ai.ts; settings routes and navigation.
**Interfaces:** authenticated GET/PATCH me/ai-settings and admin/ai-settings; VI/EN panel for preferences, server availability, fallback cost warning and global policy.
- [x] Write failing component tests for saved selection, disabled provider, VI labels and error/retry states.
- [x] Run focused Vitest; expected red before implementation.
- [x] Implement pages using existing settings classes, labeled fields and live status; no secrets in UI.
- [x] Rerun tests, i18n check, API/web type and lint; expected pass.

### Task 4: Verification and system audit

**Files:** docs/AI_PROVIDER_STRATEGY.md and verification report, existing roadmap references if needed.
- [x] Run synthetic Discovery check, record non-secret metadata and calibration limitation.
- [x] Review complete feature diff, run package tests and builds; report baseline failures without business logic fixes.
- [x] Document observed AI uses and deferred features; validate mandate register if changed.
- [x] Deliver report and known limitations. Word template output is blocked if bundled LibreOffice is unavailable; never claim visually verified DOCX.
