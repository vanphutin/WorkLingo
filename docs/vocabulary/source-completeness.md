# Source completeness

The authorized TXT import finished in the isolated `worklingo_vocabulary_test`
database on 2026-10-23. The latest instruction makes TXT the sole extraction
source. No PDF was reopened for this TXT execution.

| Level | TXT topics | TXT occurrences | DB occurrences | Missing | Source reviews pending |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 32 | 608 | 608 | 0 | 0 |
| A2 | 50 | 1,581 | 1,581 | 0 | 1 |
| B1 | 58 | 1,850 | 1,850 | 0 | 0 |
| B2 | 64 | 2,224 | 2,224 | 0 | 1 |
| C1 | 67 | 2,481 | 2,481 | 0 | 0 |
| Total | 271 | 8,744 | 8,744 | 0 | 2 |

Independent TXT enumeration matched every source anchor and assigned all 23,408
content lines exactly once. Raw-sidecar, field and ownership comparisons had
zero mismatches. Direct SQL confirmed distinct occurrence IDs and source keys
equal the counts above. Replaying every staging chunk created no occurrences.

Status: **IMPORTED_REVIEW_REQUIRED**. Two unknown parts of speech and one
malformed source IPA remain queued; no replacement information was fabricated.
The IPA warning is an additional pronunciation review, not a missing occurrence.

All official totals are **EXPECTED_UNKNOWN**: TXT contains no published count
statement. This establishes completeness against independently enumerated TXT,
not **100% PDF VERIFIED**. TXT `pageIndex` and `pageCount` are logical topic
sections; persisted source lines are not physical PDF page numbers/coordinates.

See [the execution report](authorized-txt-import-2026-10-22.md) for counts,
hashes, review locations, authorization basis and verification scope, and
[read-only SQL](verify-txt-import.sql) for DB checks. No production write,
curriculum publication, program assignment, merge, push or deployment occurred.
