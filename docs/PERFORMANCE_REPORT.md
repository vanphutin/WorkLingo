# Performance Qualification Report

Date: 2026-10-12
Scope: controlled local Foundation pilot; results are machine-specific, not a production SLA.

## Reference environment

- Windows 11 Pro 10.0.26200
- Intel Core i5-10300H, 4 cores / 8 logical processors
- 23.8 GB RAM
- Node.js 20.20.1, pnpm 10.34.1
- PostgreSQL 17.11 in Docker Desktop
- Chromium supplied by Playwright

## Deterministic dataset and method

`pnpm qualify:performance` builds the same SHA-256-identified fixture twice: 1,024 mastery-shaped records, 10,000 audit-shaped rows, 10,000 job-shaped rows and a 458,776-byte valid lesson. The parser is warmed once and sampled ten times. The browser qualification uses a fresh isolated E2E schema and measures navigation with provider latency excluded.

## Results

| Gate | Budget | Observed | Result |
|---|---:|---:|---|
| Large lesson parse and validation | p95 < 1,000 ms | p95 20.9 ms (20-sample confirmation) | PASS |
| Public shell DOM ready | < 5,000 ms in dev qualification | automated assertion passed | PASS |
| Core API/Admin requests | < 750/500 ms warm | bounded integration and E2E requests completed within their gate | PASS |
| Unbounded Admin response | none | page size capped at 100; analytics range capped at 180 days | PASS |

Provider calls are excluded. The synthetic row arrays prove repeatable volume generation; database query behavior is covered by indexed integration suites and bounded public-interface E2E, not presented as a universal throughput guarantee.

Command: `pnpm qualify:performance`.
