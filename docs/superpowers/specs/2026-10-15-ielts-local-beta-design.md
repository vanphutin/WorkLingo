# IELTS local Beta entry and curated release

## Authority and intent

The human explicitly requested: “oke, bạn thay tôi chọn lọc nội dung và làm điều đó”, accepting the prior proposal to finish and open IELTS Beta locally, review/publish missing content, connect the catalog, and preserve Foundation and Writing/Speaking review gates. This authorizes choosing and publishing local Beta content, restoring the archived Orientation as a reviewed new version, and making the local IELTS catalog navigable. It does not authorize public deployment, purchases, paid synthesis, fabricated calibration or learner evidence changes.

Existing evidence: `mandate/reports/2026-10-15-ielts-readiness.md`. Reuse the existing IELTS phase engines and authoring/publishing services. Work remains in the attached audio/dashboard worktree; preserve all prior changes.

## Product behavior

IELTS opens at `/ielts`, a Vietnamese/English guided hub linking Orientation → Bridge → Integrated Practice → Band Pathway → Academic Full Mock. Reuse existing eligibility APIs/cards and server gates. Navigating into IELTS does not replace the learner's active Intermediate enrollment: Orientation and practice currently depend on that evidence/context. Generic program switching stays unchanged for Intermediate. Direct activation into an IELTS generic level context must reject without changing learner data.

The catalog destination contract accepts exactly `/dashboard` and `/ielts`. IELTS may become selectable only when its stored availability is BETA/AVAILABLE and the full local published content chain is ready. A missing/archived current publication or missing real mock audio relocks entry. No fabricated generic IELTS LearningPath/Level rows or counts: the IELTS card shows its five phase labels instead of the generic path/level counters. Its Beta copy clearly describes practice, not official certification. Browser/learner gates still explain actual missing prerequisites after entry.

Readiness checks real current PUBLISHED versions for Orientation, Bridge's four skills, the existing 60/90/120/150-minute practice profiles, a validated seven-stage band curriculum, and at least one published Academic mock with four READY non-fake Listening artifacts. Mutable draft/validated status may coexist with a current published version; an explicitly ARCHIVED parent is unavailable. Keep read-only readiness queries bounded and return the existing catalog shape.

## Content and local release

Inspect existing authored drafts and immutable published versions. Prefer meaningful existing material, repair placeholders/errors for local practice, and document content provenance and limitations. No copyrighted exam copying; no claim of calibrated official bands. Choose original coherent Listening/Reading material with answer evidence, defensible objective keys, Writing tasks and Speaking prompts; teacher review remains required. Compare Academic structure with official IELTS documentation.

A release utility defaults to a read-only dry run, accepts an explicit execute option, requires loopback database and a local content/system admin actor, and writes a private rollback snapshot before mutations. It validates selected content and uses existing save/validate/publish services to create new immutable versions with audit events and revision checks. It never writes learner progress/checkpoints, historical version content or rubric reviews. Existing published Bridge/Practice may be reused if suitable.

Full Mock publication must retain the existing genuine-audio gate. Generate real spoken WAVs offline with installed Windows English voices, verify WAV metadata/bytes and attach honest provenance (`local-windows-speech`, never relabel fake audio). Store through existing local ObjectStorage. No paid API invocation or new dependency. The publication utility publishes prerequisites first, then only changes IELTS metadata to BETA once readiness succeeds. On failure keep entry locked and report progress; do not delete newly pinned immutable versions. Rollback restores catalog metadata and safely disables/archive new current releases through a documented compensating workflow, retaining history and learner pins.

## Verification

TDD for contract/catalog eligibility, direct activation non-mutation, hub/catalog navigation and release safety. Browser journey must exercise Programs → IELTS Beta → real gated Orientation entry, mobile/desktop, preserving the prior context. Local dry run and post-release aggregate verification must show all selected publications/current real media. Run scoped checks while editing; a final full suite for changed packages, lint/typecheck, builds with isolated Next output, and independent review. Preserve actual failures and focused rechecks, not inferred success.
