$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $repoRoot ".env"
$hadEnv = Test-Path -LiteralPath $envPath
$originalEnv = if ($hadEnv) { [System.IO.File]::ReadAllBytes($envPath) } else { $null }

try {
  $fixture = @(
    "DATABASE_URL=postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo?schema=public",
    "WORKLINGO_ADMIN_EMAIL=admin@worklingo.local",
    "WORKLINGO_ADMIN_PASSWORD=replace-with-a-local-admin-password"
  ) -join "`r`n"
  [System.IO.File]::WriteAllText($envPath, "$fixture`r`n")

  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "setup-local.ps1") -SkipDocker -SkipMigrate -SkipSeed | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "setup-local.ps1 exited with code $LASTEXITCODE"
  }

  $values = @{}
  Get-Content -LiteralPath $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
      $values[$matches[1].Trim()] = $matches[2]
    }
  }

  if ($values['WORKLINGO_ADMIN_EMAIL'] -ne 'admin@worklingo.local') {
    throw "Expected the local admin email to remain usable."
  }
  if (
    [string]::IsNullOrWhiteSpace($values['WORKLINGO_ADMIN_PASSWORD']) -or
    $values['WORKLINGO_ADMIN_PASSWORD'] -eq 'replace-with-a-local-admin-password'
  ) {
    throw "Expected setup to replace the CRLF-terminated placeholder password."
  }

  Write-Host "setup-local credentials regression test passed." -ForegroundColor Green
} finally {
  if ($hadEnv) {
    [System.IO.File]::WriteAllBytes($envPath, $originalEnv)
  } elseif (Test-Path -LiteralPath $envPath) {
    Remove-Item -LiteralPath $envPath -Force
  }
}
