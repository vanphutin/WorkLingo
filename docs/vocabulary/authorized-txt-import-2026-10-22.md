# Authorized A1–C1 TXT import

Started 2026-10-22; resumed and verified 2026-10-23. Feature branch:
`codex/langeek-pdf-import`. Content writes targeted only
`127.0.0.1:55439/worklingo_vocabulary_test`. No production write, push, merge,
deployment, curriculum publication or automatic program assignment occurred.

## Measured result

| Level | Expected | TXT parsed | DB imported | Duplicates | Missing | AI enriched | Source reviews pending |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | EXPECTED_UNKNOWN | 608 | 608 | 6 | 0 | 0 | 0 |
| A2 | EXPECTED_UNKNOWN | 1,581 | 1,581 | 64 | 0 | 0 | 1 |
| B1 | EXPECTED_UNKNOWN | 1,850 | 1,850 | 79 | 0 | 0 | 0 |
| B2 | EXPECTED_UNKNOWN | 2,224 | 2,224 | 61 | 0 | 0 | 1 |
| C1 | EXPECTED_UNKNOWN | 2,481 | 2,481 | 62 | 0 | 0 | 0 |
| Total | EXPECTED_UNKNOWN | 8,744 | 8,744 | 272 | 0 | 0 | 2 |

Duplicates counts additional case-insensitive, whitespace-normalized form/POS
occurrences **within each level**, not deleted records. All occurrences remain.
Canonical matching preserves case/POS and reuses a sense only for an exact
definition. Matching is scoped to this approved import, excluding unrelated test
fixtures. There are **8,129 distinct resolved lexical entries** and **8,742
senses**; two unresolved source occurrences are excluded from these totals.
Vietnamese meanings/examples were absent and were not fabricated or AI-enriched.

Status: **IMPORTED_REVIEW_REQUIRED**. TXT ingestion is complete; editorial
completion remains incomplete. The following source defects remain visible:

| Review | TXT location | Handling |
| --- | --- | --- |
| Missing POS | A2 `topic-10:15`, line 2132, `discuss` | Literal `(.)` retained; source stored, canonical decision pending |
| Missing POS | B2 `topic-20:8`, lines 13784–13788, `about time` | Source stored; no guessed POS |
| Malformed IPA | B1 `topic-31:26`, lines 9216–9217 | Literal internal slash retained; pronunciation REVIEW_REQUIRED |

## Integrity evidence

No published entry totals exist in the supplied TXT: **EXPECTED_UNKNOWN** for
every level. No PDF was read, rendered or OCRed after the TXT-only instruction.
This is not **100% PDF VERIFIED**. Logical manifest page slots represent topic
sections; the Admin UI displays persisted source line spans for TXT.

- Independent TXT census: 8,744 ordinal anchors, 271 topics, 23,408 content lines.
  Every content line belongs to exactly one occurrence. Zero missing/extra/
  duplicate anchors, field mismatches, ownership disagreements or raw-line errors.
- All manifest fields compared directly with every DB row: zero mismatches.
  SQL confirms 8,744 distinct IDs and `(documentId, sourceEntryKey)` pairs, and
  zero invalid line spans. Original TXT lines remain in the private raw sidecar.
- Initial insertion plus two full staging replays, including after canonical
  review and the nullable-field compatibility fix: unchanged occurrence counts.
- Review resumed from persisted state after process interruption. Completed
  resolutions were retained; remaining valid rows were processed.
- Legacy table counts matched the pre-import baseline: LanguageBlock 12,
  WordBank 12, WordBankVersion 12, MasteryRecord 12, LessonVersion 0. This count
  check is not a byte-for-byte audit of unrelated legacy records.

[verify-txt-import.sql](verify-txt-import.sql) was executed with a read-only
connection. A1/B1/C1 batch status: REVIEWED; A2/B2: REVIEW_REQUIRED.
All staging checkpoints equal the respective TXT counts.

Private audit files under `.superpowers/langeek-authorized-import-2026-10-22/`:
`independent-txt-inventory.json`, `independent-txt-v5-crosscheck.json`,
`txt-v5/source-occurrences.jsonl`, `txt-stage-1.log`, `txt-stage-2.log`,
`txt-stage-final-replay.log`, `txt-review-resume.log`, `txt-final-db.json`,
`txt-readonly-sql.json`. Raw source data, grants and credentials are not in Git.

## Fingerprints

Input `full 5 files pdf.txt`: UTF-8, 873,263 bytes, 25,699 lines.
SHA-256: `a94a32fdaf896c0110842aacf4673eb7e510587e9da13e558ecc79cd8e0bd4fb`.
The five document records share this combined TXT hash and have distinct CEFR
identities; this is not a hash of any original PDF.

| Artifact | SHA-256 |
| --- | --- |
| A1 manifest | `953eea351598632a6376d15113437e718260b778a7da9b2ebd76fdcc71bb6b43` |
| A2 manifest | `b65c2f382265e81eeb46f0fcd3e1f15045410467daf4eec4a9ecc655b1407d40` |
| B1 manifest | `f21caad638f2c7172d2b19600961856888107324795ed269b19ce0df5d3cba99` |
| B2 manifest | `e817b4008d16a5b7b32fd99292ce1259589b322f7dd03f2cfc358b7a35b78684` |
| C1 manifest | `c41774f4045dd13bf874759093d0b98dc0f9ecfba0f66580691897861ab7f2c5` |
| Independent inventory | `059dfba7e8430bbb53066ef83035e288452bc85e01a6e30be0e4392c97106143` |
| Raw occurrence sidecar | `fbfa2ef513ff44cc4e5550a8f4a1490d09a42c96350f2ab230fa7db2cf12b496` |

## Authorization and integration

The user reaffirmed the supplied final email image was their received approval.
Reference: `user-attested-LanGeek-five-PDF-email-2025-12-17-reaffirmed-2026-10-22`.
This is user-attested evidence; independent mailbox authentication is not claimed.
Scope: five books in WorkLingo; EXTRACT/STORE/MODIFY/TRANSLATE/COMMERCIAL and
FORM/DEFINITION/PRONUNCIATION. Separate raw-data/PDF redistribution is excluded.
Attribution displayed in Admin provenance:
**Vocabulary content from LanGeek (https://langeek.co)**.

Existing normalized vocabulary/sense/pronunciation/topic/CEFR/source occurrence/
collection/version/program architecture was reused. Additive migration
`20261022000700_vocabulary_txt_provenance` adds document format and paired
positive line spans, preserving default PDF and nullable legacy fields.
Forty-seven migrations are applied only in the isolated DB.

CEFR/topics/POS support course reuse: A1/A2 are candidates for the existing
beginner catalog (foundation/basic), B1/B2 for intermediate. C1 has no supported
general program mapping. TOEIC/IELTS relevance and scores are not inferred.
Legacy WordBank/LanguageBlock adapters and published curriculum remain untouched
by this import; no collection was published or bound to learner lessons.

## Verification

- Python parsers: 29 passed, including 10 TXT regressions.
- Contracts: full 131 passed; lint/typecheck passed.
- API: 70 targeted plus 21 additional relevant tests passed. A subsequent legacy
  nullable/omitted provenance regression was reproduced failing, fixed, and
  passed with the TXT resume/idempotency test (2 tests).
- Guarded operational runner: 8 offline tests passed.
- Admin client/UI: 36 tests passed in seven files; typecheck and targeted lint
  passed, covering TXT line display, legacy PDF null fields and attribution.
- API/Web builds and full API/Web lint passed; API/Web and contracts typechecks
  passed. i18n check passed with 2,695 paired keys and zero errors.
  The first web build invocation failed because Node's `--env-file`
  propagated to worker NODE_OPTIONS; loading env before spawning Next resolved
  it without an application change.
- Live authenticated API login/search returned 200. Headless browser smoke on
  the built app passed: Admin rendered, search/details opened, TXT source lines
  and attribution were visible, and there were zero page errors. Evidence:
  `txt-live-api.json`, `txt-browser-smoke.json`. The app runs locally on port
  45300 against the isolated API on port 45400.
- Unrelated monorepo/E2E/release qualification suites were not rerun. This is an
  isolated import, not a production release qualification.

Parser and compatibility review findings were addressed before commit. Local
feature commit IDs are recorded in the task handoff; none are pushed.
