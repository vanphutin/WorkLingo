param(
  [string]$BackupRoot = "./backups",
  [string]$AllowedRoot = "",
  [string]$DataDir = "",
  [string]$DatabaseUrl = "",
  [string]$Schema = ""
)

$ErrorActionPreference = "Stop"

function Get-SafeFullPath([string]$inputPath) {
  if ([string]::IsNullOrWhiteSpace($inputPath)) { return "" }
  if ([System.IO.Path]::IsPathRooted($inputPath)) {
    return [System.IO.Path]::GetFullPath($inputPath)
  }
  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $inputPath))
}

function Test-PathWithinRoot([string]$candidatePath, [string]$rootPath) {
  $normalizedCandidate = [System.IO.Path]::GetFullPath($candidatePath)
  $normalizedRoot = [System.IO.Path]::GetFullPath($rootPath).TrimEnd(
    [System.IO.Path]::DirectorySeparatorChar,
    [System.IO.Path]::AltDirectorySeparatorChar
  )
  if ($normalizedCandidate.Equals($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }
  $rootPrefix = $normalizedRoot + [System.IO.Path]::DirectorySeparatorChar
  return $normalizedCandidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-Sha256Hex([string]$filePath) {
  $stream = [System.IO.File]::OpenRead($filePath)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha256.ComputeHash($stream)
    return [System.BitConverter]::ToString($hash).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha256.Dispose()
    $stream.Dispose()
  }
}

function Assert-SafePgIdentifier([string]$identifier, [string]$label) {
  if ($identifier -and $identifier -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
    Write-Error "$label '$identifier' is not a safe PostgreSQL identifier."
    exit 1
  }
}

# 1. Resolve and validate paths
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

if (-not $DataDir) {
  if ($env:WORKLINGO_DATA_DIR) {
    $DataDir = $env:WORKLINGO_DATA_DIR
  } else {
    $DataDir = Join-Path $repoRoot "data"
  }
}

if (-not $DatabaseUrl) {
  $DatabaseUrl = $env:DATABASE_URL
  if (-not $DatabaseUrl) {
    $DatabaseUrl = "postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo"
  }
}

$resolvedBackupRoot = Get-SafeFullPath $BackupRoot

# Path safety check
if ($AllowedRoot) {
  $resolvedAllowedRoot = Get-SafeFullPath $AllowedRoot
  if (-not (Test-PathWithinRoot $resolvedBackupRoot $resolvedAllowedRoot)) {
    Write-Error "BackupRoot '$resolvedBackupRoot' is outside allowed root '$resolvedAllowedRoot'. Unsafe path rejected."
    exit 1
  }
}

if (-not (Test-Path $resolvedBackupRoot)) {
  New-Item -ItemType Directory -Path $resolvedBackupRoot -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupId = [System.Guid]::NewGuid().ToString("N").Substring(0, 8)
$targetBackupDir = Join-Path $resolvedBackupRoot "backup-$timestamp-$backupId"
New-Item -ItemType Directory -Path $targetBackupDir | Out-Null
$targetDataDir = Join-Path $targetBackupDir "data"
New-Item -ItemType Directory -Path $targetDataDir -Force | Out-Null
$backupComplete = $false

try {
  # 2. Database backup
  $dumpFile = Join-Path $targetBackupDir "database.sql"

# Parse connection string
$cleanUrl = $DatabaseUrl -replace '^postgresql://', 'http://' -replace '^postgres://', 'http://'
$uri = [System.Uri]$cleanUrl
$user = $uri.UserInfo.Split(':')[0]
$pass = if ($uri.UserInfo.Contains(':')) { $uri.UserInfo.Split(':')[1] } else { "" }
$hostName = $uri.Host
$port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$dbName = $uri.AbsolutePath.TrimStart('/')

if (-not $Schema -and $uri.Query) {
  $queryStr = $uri.Query.TrimStart('?')
  foreach ($part in $queryStr.Split('&')) {
    if ($part.StartsWith('schema=')) {
      $Schema = $part.Substring(7)
    }
  }
}
Assert-SafePgIdentifier $Schema "Schema"

$pgDumpCmd = Get-Command pg_dump -ErrorAction SilentlyContinue
$dumpExitCode = 0

if ($pgDumpCmd) {
  $env:PGPASSWORD = $pass
  $dumpArgs = @("-h", $hostName, "-p", "$port", "-U", $user, "-d", $dbName)
  if ($Schema) {
    $dumpArgs += @("-n", $Schema)
  }
  & $pgDumpCmd.Source @dumpArgs | Set-Content -Path $dumpFile -Encoding UTF8
  $dumpExitCode = $LASTEXITCODE
} else {
  # Fallback to docker compose
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCmd) {
    $composeFile = Join-Path $repoRoot "infra/docker-compose.yml"
    $schemaArg = if ($Schema) { @("-n", $Schema) } else { @() }
    $execArgs = @("compose", "-f", $composeFile, "exec", "-T", "postgres", "pg_dump", "-U", $user, "-d", $dbName) + $schemaArg
    & $dockerCmd.Source @execArgs | Set-Content -Path $dumpFile -Encoding UTF8
    $dumpExitCode = $LASTEXITCODE
  } else {
    Write-Error "Neither local pg_dump nor docker is available for PostgreSQL backup."
    exit 1
  }
}

if ($dumpExitCode -ne 0) {
  Write-Error "Database dump command failed with exit code $dumpExitCode."
  exit $dumpExitCode
}

if (-not (Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
  Write-Error "Database dump failed or produced an empty file."
  exit 1
}

# 3. Copy files from DataDir
$resolvedDataDir = Get-SafeFullPath $DataDir
if (Test-Path $resolvedDataDir) {
  Get-ChildItem -Path $resolvedDataDir -File -Recurse | ForEach-Object {
    $relPath = $_.FullName.Substring($resolvedDataDir.Length).TrimStart('\', '/')
    $destPath = Join-Path $targetDataDir $relPath
    $destFolder = Split-Path $destPath
    if (-not (Test-Path $destFolder)) {
      New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $destPath -Force
  }
}

# 4. Generate manifest with SHA-256 checksums
$filesManifest = @{}

Get-ChildItem -Path $targetBackupDir -File -Recurse | ForEach-Object {
  $rel = $_.FullName.Substring($targetBackupDir.Length).TrimStart('\', '/')
  $normalizedKey = $rel.Replace('\', '/')
  $sha256 = Get-Sha256Hex $_.FullName
  $filesManifest[$normalizedKey] = $sha256
}

$manifest = @{
  version = "1.0"
  timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  databaseDump = "database.sql"
  schema = $Schema
  files = $filesManifest
}

  $manifestJson = $manifest | ConvertTo-Json -Depth 5
  $manifestPath = Join-Path $targetBackupDir "manifest.json"
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($manifestPath, $manifestJson, $utf8NoBom)
  $backupComplete = $true
} finally {
  if (-not $backupComplete -and (Test-Path -LiteralPath $targetBackupDir)) {
    $resolvedTarget = [System.IO.Path]::GetFullPath($targetBackupDir)
    if (
      (Test-PathWithinRoot $resolvedTarget $resolvedBackupRoot) -and
      -not $resolvedTarget.Equals($resolvedBackupRoot, [System.StringComparison]::OrdinalIgnoreCase)
    ) {
      Remove-Item -LiteralPath $resolvedTarget -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Backup completed successfully."
Write-Host "BACKUP_DIR: $targetBackupDir"
exit 0
