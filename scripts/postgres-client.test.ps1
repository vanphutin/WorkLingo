$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'postgres-client.ps1')
$script:failureCount = 0

function Test-Case([string]$name, [scriptblock]$check) {
  try {
    & $check
    Write-Host "PASS: $name"
  } catch {
    $script:failureCount += 1
    Write-Host "FAIL: $name - $($_.Exception.Message)"
  }
}

function Assert-Equal($actual, $expected) {
  if ($actual -ne $expected) { throw "Expected '$expected', received '$actual'." }
}

Test-Case 'Docker maps bracketed IPv6 loopback to the host' {
  $arguments = @(Get-DockerPostgresArguments 'psql' '[::1]' 55432 'fixture' 'fixture')
  Assert-Equal $arguments[$arguments.IndexOf('-h') + 1] 'host.docker.internal'
  Assert-Equal $arguments[$arguments.IndexOf('-p') + 1] '55432'
}

Test-Case 'PostgreSQL URL without an explicit port defaults to 5432' {
  $connection = Get-PostgresConnection 'postgresql://fixture:fixture@localhost/fixture'
  Assert-Equal $connection.Port 5432
  Assert-Equal $connection.HostName 'localhost'
}

Test-Case 'Explicit PostgreSQL ports are preserved, including 80' {
  foreach ($port in @(80, 55432)) {
    $connection = Get-PostgresConnection "postgresql://fixture:fixture@127.0.0.1:$port/fixture"
    Assert-Equal $connection.Port $port
  }
}

Test-Case 'Docker preserves a remote endpoint instead of selecting local Compose data' {
  $arguments = @(Get-DockerPostgresArguments 'pg_dump' 'database.example.test' 65432 'fixture' 'fixture')
  Assert-Equal $arguments[$arguments.IndexOf('-h') + 1] 'database.example.test'
  Assert-Equal $arguments[$arguments.IndexOf('-p') + 1] '65432'
}

if ($script:failureCount -gt 0) { exit 1 }
Write-Host 'PostgreSQL client connection regression checks passed.'
