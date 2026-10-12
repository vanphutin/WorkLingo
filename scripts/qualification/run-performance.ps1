$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $repoRoot
& pnpm --filter '@worklingo/api' exec vitest run test/qualification/performance.qualification.spec.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Performance qualification passed. Machine-specific results are documented in docs/PERFORMANCE_REPORT.md.'
