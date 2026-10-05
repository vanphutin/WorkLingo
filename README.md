# WorkLingo

WorkLingo is a local-first, four-skill communicative language learning platform. This Foundation Learning Slice provides an authentic, self-contained 60-minute session experience without cloud or third-party AI dependencies.

## Five-Command Quick Start

```powershell
# 1. Install monorepo dependencies
pnpm install

# 2. Run automated local environment setup (Docker PostgreSQL, .env, migrations, and seed)
pnpm setup:local

# 3. Start local development servers (API on http://127.0.0.1:4000, Web on http://127.0.0.1:3000)
pnpm dev

# 4. Run whole-slice verification (format, lint, typecheck, unit, integration, build, and E2E)
pnpm verify

# 5. Create an immutable timestamped backup (or restore into an empty target)
pnpm backup:local
```

For complete local architecture, environment configuration, database management, and troubleshooting instructions, please read [Local Development Guide](docs/LOCAL_DEVELOPMENT.md).
