$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Set-Location $repoRoot

$trackedEnv = @(& git ls-files '.env' '.env.*' | Where-Object { $_ -notmatch '\.env\.example$' })
if ($trackedEnv.Count -gt 0) {
  Write-Error 'Security qualification failed: a non-example environment file is tracked.'
  exit 1
}

$privateKeys = @(& git grep -l -- '-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----' -- ':!pnpm-lock.yaml' 2>$null)
if ($privateKeys.Count -gt 0) {
  Write-Error 'Security qualification failed: private-key material was found in tracked files.'
  exit 1
}

Write-Host 'Tracked-file secret scan passed (environment files and private-key blocks).'
