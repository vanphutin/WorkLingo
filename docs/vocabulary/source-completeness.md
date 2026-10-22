# Source completeness

No real LanGeek PDF was extracted or imported. Pages are reference values,
not verified measurements and never vocabulary counts.

| Level | Pages (reference) | Topics | Source rows | Validated | DB source rows | Unresolved | Status |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| A1 | 31 | NOT RUN | NOT RUN | NOT RUN | 0 imported | NOT RUN | BLOCKED_BY_RIGHTS |
| A2 | 74 | NOT RUN | NOT RUN | NOT RUN | 0 imported | NOT RUN | BLOCKED_BY_RIGHTS |
| B1 | 85 | NOT RUN | NOT RUN | NOT RUN | 0 imported | NOT RUN | BLOCKED_BY_RIGHTS |
| B2 | 102 | NOT RUN | NOT RUN | NOT RUN | 0 imported | NOT RUN | BLOCKED_BY_RIGHTS |
| C1 | 113 | NOT RUN | NOT RUN | NOT RUN | 0 imported | NOT RUN | BLOCKED_BY_RIGHTS |

The invariant is detected source rows = validated + unresolved + explicitly
rejected rows, with an independent inventory and a documented non-vocabulary
reason for every rejection. Canonical deduplication never subtracts occurrences.
Source keys include topic instance plus ordinal; page inventory must cover the
whole document exactly once. Duplicate keys, extra/missing rows, page gaps,
unknown layout, OCR-only pages and low-confidence parsing block completion.

Validate/dry-run a local manifest without database writes:

```powershell
pnpm --filter @worklingo/api exec tsx src/vocabulary-operations/cli.ts validate path/to/manifest.json
pnpm --filter @worklingo/api exec tsx src/vocabulary-operations/cli.ts dry-run path/to/manifest.json
```

Reports contain identifiers/counts and return exit 2 for incomplete data; exit 1
means invocation/schema failure. They do not disclose source definitions.
VALIDATED_NOT_REVIEWED means structural reconciliation only: it is not a rights
approval, human sense review, database import or publication result.
