$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $repoRoot

& pnpm --filter '@worklingo/api' exec vitest run test/qualification/recovery.qualification.spec.ts test/integration/backup-restore.integration.spec.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Recovery rehearsal passed using isolated schemas and temporary paths.'
