param(
  [Parameter(Mandatory=$true)][string]$BackupDir,
  [string]$AllowedRoot = "",
  [string]$TargetDataDir = "",
  [string]$TargetDatabaseUrl = "",
  [string]$TargetSchema = ""
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

function Convert-PgDumpSchema(
  [string]$sqlContent,
  [string]$sourceSchema,
  [string]$targetSchema
) {
  $sourcePattern = [System.Text.RegularExpressions.Regex]::Escape($sourceSchema)
  $sourceCreatePattern = "^\s*CREATE SCHEMA\s+(?:`"$sourcePattern`"|$sourcePattern)\s*;\s*$"
  $sourceAlterPattern = "^\s*ALTER SCHEMA\s+(?:`"$sourcePattern`"|$sourcePattern)\b.*;\s*$"
  $quotedSourcePrefix = "`"$sourceSchema`"."
  $quotedTargetPrefix = "`"$targetSchema`"."
  $plainSourcePrefix = "$sourceSchema."
  $plainTargetPrefix = "$targetSchema."
  $inCopyData = $false
  $convertedLines = foreach ($line in ($sqlContent -split "`r?`n")) {
    if ($inCopyData) {
      $line
      if ($line -eq '\.') { $inCopyData = $false }
      continue
    }
    if ($line -match $sourceCreatePattern -or $line -match $sourceAlterPattern) {
      continue
    }
    $converted = $line.Replace($quotedSourcePrefix, $quotedTargetPrefix)
    $converted = $converted.Replace($plainSourcePrefix, $plainTargetPrefix)
    $converted
    if ($line -match '^\s*COPY\s+') { $inCopyData = $true }
  }
  return ($convertedLines -join "`n")
}

# 1. Resolve and validate paths
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$resolvedBackupDir = Get-SafeFullPath $BackupDir

if (-not (Test-Path $resolvedBackupDir)) {
  Write-Error "Backup directory '$resolvedBackupDir' does not exist."
  exit 1
}

# Path safety check
if ($AllowedRoot) {
  $resolvedAllowedRoot = Get-SafeFullPath $AllowedRoot
  if (-not (Test-PathWithinRoot $resolvedBackupDir $resolvedAllowedRoot)) {
    Write-Error "BackupDir '$resolvedBackupDir' is outside allowed root '$resolvedAllowedRoot'. Unsafe path rejected."
    exit 1
  }
}

$manifestFile = Join-Path $resolvedBackupDir "manifest.json"
if (-not (Test-Path $manifestFile)) {
  Write-Error "Manifest file not found in '$resolvedBackupDir'."
  exit 1
}

# 2. Checksum verification
$manifest = Get-Content $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json
$manifestPaths = @{}
foreach ($entry in $manifest.files.PSObject.Properties) {
  $relPath = $entry.Name
  $expectedHash = $entry.Value
  $normalizedManifestPath = $relPath.Replace('\', '/')
  $manifestPaths[$normalizedManifestPath] = $true
  $normRel = $relPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
  if ([System.IO.Path]::IsPathRooted($normRel)) {
    Write-Error "Manifest path '$relPath' is unsafe because it is absolute."
    exit 1
  }
  $filePath = [System.IO.Path]::GetFullPath((Join-Path $resolvedBackupDir $normRel))
  if (-not (Test-PathWithinRoot $filePath $resolvedBackupDir)) {
    Write-Error "Manifest path '$relPath' resolves outside the backup directory."
    exit 1
  }
  if (-not (Test-Path $filePath)) {
    Write-Error "Manifest file '$relPath' is missing from backup directory."
    exit 1
  }
  $actualHash = Get-Sha256Hex $filePath
  if ($actualHash -ne $expectedHash) {
    Write-Error "Checksum verification failed for '$relPath'. Expected $expectedHash, got $actualHash."
    exit 1
  }
}

Get-ChildItem -LiteralPath $resolvedBackupDir -File -Recurse | ForEach-Object {
  if ($_.FullName -eq $manifestFile) { return }
  $relativePath = $_.FullName.Substring($resolvedBackupDir.Length).TrimStart('\', '/')
  $normalizedPath = $relativePath.Replace('\', '/')
  if (-not $manifestPaths.ContainsKey($normalizedPath)) {
    Write-Error "Backup file '$normalizedPath' is not covered by the manifest."
    exit 1
  }
}

# 3. Target Data Directory safety checks
if (-not $TargetDataDir) {
  if ($env:WORKLINGO_DATA_DIR) {
    $TargetDataDir = $env:WORKLINGO_DATA_DIR
  } else {
    $TargetDataDir = Join-Path $repoRoot "data"
  }
}

$resolvedTargetDataDir = Get-SafeFullPath $TargetDataDir

if ($AllowedRoot) {
  $resolvedAllowedRoot = Get-SafeFullPath $AllowedRoot
  if (-not (Test-PathWithinRoot $resolvedTargetDataDir $resolvedAllowedRoot)) {
    Write-Error "TargetDataDir '$resolvedTargetDataDir' is outside allowed root '$resolvedAllowedRoot'. Unsafe path rejected."
    exit 1
  }
}

if (Test-Path $resolvedTargetDataDir) {
  $existingEntries = @(Get-ChildItem -LiteralPath $resolvedTargetDataDir -Force)
  if ($existingEntries.Count -gt 0) {
    Write-Error "Target data directory '$resolvedTargetDataDir' is not empty. Restore requires an empty target."
    exit 1
  }
} else {
  New-Item -ItemType Directory -Path $resolvedTargetDataDir -Force | Out-Null
}

# 4. Target Database safety checks & restore
if (-not $TargetDatabaseUrl) {
  $TargetDatabaseUrl = $env:DATABASE_URL
  if (-not $TargetDatabaseUrl) {
    $TargetDatabaseUrl = "postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo"
  }
}

$cleanUrl = $TargetDatabaseUrl -replace '^postgresql://', 'http://' -replace '^postgres://', 'http://'
$uri = [System.Uri]$cleanUrl
$user = $uri.UserInfo.Split(':')[0]
$pass = if ($uri.UserInfo.Contains(':')) { $uri.UserInfo.Split(':')[1] } else { "" }
$hostName = $uri.Host
$port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
$dbName = $uri.AbsolutePath.TrimStart('/')

if (-not $TargetSchema -and $uri.Query) {
  $queryStr = $uri.Query.TrimStart('?')
  foreach ($part in $queryStr.Split('&')) {
    if ($part.StartsWith('schema=')) {
      $TargetSchema = $part.Substring(7)
    }
  }
}
Assert-SafePgIdentifier $TargetSchema "TargetSchema"

$sqlFile = Join-Path $resolvedBackupDir "database.sql"
if (-not (Test-Path $sqlFile)) {
  Write-Error "Database dump file '$sqlFile' not found."
  exit 1
}

$composeFile = Join-Path $repoRoot "infra/docker-compose.yml"
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue

# Check if target schema is non-empty
$schemaToCheck = if ($TargetSchema) { $TargetSchema } else { "public" }
$checkQuery = "SELECT count(*) FROM information_schema.tables WHERE table_schema = '$schemaToCheck';"

$countExitCode = $null
$countOutput = $null
if ($psqlCmd) {
  $env:PGPASSWORD = $pass
  $countOutput = & $psqlCmd.Source -h $hostName -p "$port" -U $user -d $dbName -t -A -c $checkQuery
  $countExitCode = $LASTEXITCODE
} elseif ($dockerCmd) {
  $countOutput = & $dockerCmd.Source compose -f "$composeFile" exec -T postgres psql -U $user -d $dbName -t -A -c $checkQuery
  $countExitCode = $LASTEXITCODE
} else {
  Write-Error "Unable to verify target database schema is empty: neither local psql nor docker is available."
  exit 1
}

$tableCount = 0
$countOutputText = ($countOutput | Out-String).Trim()
if ($countExitCode -ne 0 -or -not [int]::TryParse($countOutputText, [ref]$tableCount)) {
  Write-Error "Unable to verify target database schema is empty. Database check failed with exit code $countExitCode."
  exit 1
}

if ($tableCount -gt 0) {
  Write-Error "Target database schema '$schemaToCheck' is not empty (contains $tableCount tables). Restore requires an empty target."
  exit 1
}

# If the backup was created with a specific source schema and target is different, translate schema
$sqlContent = Get-Content -Path $sqlFile -Raw -Encoding UTF8
$originalSchema = $manifest.schema

if ($TargetSchema -and $originalSchema -and ($TargetSchema -ne $originalSchema)) {
  Assert-SafePgIdentifier $originalSchema "Manifest schema"
  $sqlContent = Convert-PgDumpSchema $sqlContent $originalSchema $TargetSchema
}

$createSchemaSql = "CREATE SCHEMA IF NOT EXISTS `"$schemaToCheck`";`n"
$sqlContent = $createSchemaSql + $sqlContent

# Restore database
$tempRestoreSql = Join-Path $resolvedBackupDir "restore-exec.sql"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($tempRestoreSql, $sqlContent, $utf8NoBom)

try {
  if ($psqlCmd) {
    $env:PGPASSWORD = $pass
    & $psqlCmd.Source -h $hostName -p "$port" -U $user -d $dbName -v ON_ERROR_STOP=1 -f $tempRestoreSql
  } elseif ($dockerCmd) {
    $composeFile = Join-Path $repoRoot "infra/docker-compose.yml"
    Get-Content $tempRestoreSql -Raw -Encoding UTF8 | & $dockerCmd.Source compose -f "$composeFile" exec -T postgres psql -U $user -d $dbName -v ON_ERROR_STOP=1
  } else {
    Write-Error "Neither local psql nor docker is available for PostgreSQL restore."
    exit 1
  }

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Database restore failed with exit code $LASTEXITCODE."
    exit $LASTEXITCODE
  }
} finally {
  if (Test-Path $tempRestoreSql) {
    Remove-Item -Path $tempRestoreSql -Force -ErrorAction SilentlyContinue
  }
}

# 5. Restore data directory files
$backupDataDir = Join-Path $resolvedBackupDir "data"
if (Test-Path $backupDataDir) {
  $baseDirLength = $backupDataDir.TrimEnd('\', '/').Length
  Get-ChildItem -Path $backupDataDir -File -Recurse | ForEach-Object {
    $relPath = $_.FullName.Substring($baseDirLength).TrimStart('\', '/')
    $destPath = Join-Path $resolvedTargetDataDir $relPath
    $destFolder = Split-Path $destPath
    if (-not (Test-Path $destFolder)) {
      New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $destPath -Force
  }
}

Write-Host "Restore completed successfully into '$resolvedTargetDataDir' and schema '$schemaToCheck'."
exit 0
