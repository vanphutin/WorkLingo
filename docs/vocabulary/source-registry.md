# Source registry

User confirmation, 2026-10-22: reuse permission is absent or unclear. All five
LanGeek inputs are BLOCKED_BY_RIGHTS; no document hashes, row counts or acquisition
dates are invented. Reference page counts below came from the execution brief.

| Level | Reference pages (unverified) | Source |
| --- | ---: | --- |
| A1 | 31 | https://help.langeek.co/wp-content/uploads/2025/04/English-wordlist-A1.pdf |
| A2 | 74 | https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-A2.pdf |
| B1 | 85 | https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-B1.pdf |
| B2 | 102 | https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-B2.pdf |
| C1 | 113 | https://help.langeek.co/wp-content/uploads/2025/12/English-wordlist-C1.pdf |

The metadata-only registry command is idempotent and never grants rights:

```powershell
pnpm --filter @worklingo/api exec tsx src/vocabulary-operations/cli.ts registry --isolated
```

It requires TEST_DATABASE_URL naming a local *_test database and rejects the
application's port 55432. It does not download PDFs, create document versions,
write source entries or alter existing permission approvals.

After authorization, register exact acquired document SHA-256, page count,
edition and source URL via the Admin API. A changed file is a new document
version. An identical hash with conflicting immutable metadata is an error.
