param(
  [switch]$SkipDocker,
  [switch]$SkipMigrate,
  [switch]$SkipSeed
)

$ErrorActionPreference = "Stop"

# 1. Resolve repo root
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Write-Host "==> Starting WorkLingo Local Developer Environment Setup..." -ForegroundColor Cyan

# 2. Validate prerequisites
Write-Host "--> Checking prerequisites..." -ForegroundColor Yellow

# Node.js check
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
  Write-Error "Node.js is not found in PATH. Please install Node.js >= 20 < 21."
  exit 1
}
$nodeVersion = (& node -v).TrimStart('v')
Write-Host "    Node.js version: $nodeVersion"
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20 -or $nodeMajor -ge 21) {
  Write-Warning "WorkLingo requires Node.js >= 20 and < 21 (current: $nodeVersion). Unexpected behavior may occur."
}

# pnpm check
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmCmd) {
  Write-Error "pnpm is not found in PATH. Please install pnpm >= 10."
  exit 1
}
$pnpmVersion = (& pnpm -v)
Write-Host "    pnpm version: $pnpmVersion"
$pnpmMajor = [int]($pnpmVersion.Split('.')[0])
if ($pnpmMajor -lt 10) {
  Write-Warning "WorkLingo requires pnpm >= 10 (current: $pnpmVersion)."
}

# Docker check (if not skipped)
if (-not $SkipDocker) {
  $dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $dockerCmd) {
    Write-Error "Docker is not found in PATH. Please install and start Docker Desktop, or run with -SkipDocker if using an external database."
    exit 1
  }
  Write-Host "    Docker is available."
}

# 3. Environment configuration (.env)
Write-Host "--> Configuring environment files..." -ForegroundColor Yellow
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
  if (Test-Path $envExamplePath) {
    Copy-Item -Path $envExamplePath -Destination $envPath
    Write-Host "    Created .env from .env.example." -ForegroundColor Green
  } else {
    Write-Warning "    .env.example not found. Please create .env manually."
  }
} else {
  Write-Host "    Using existing .env file." -ForegroundColor DarkGray
}

# 4. Ensure local data directory exists
Write-Host "--> Ensuring local storage directory..." -ForegroundColor Yellow
$dataDir = Join-Path $repoRoot "data"
if ($env:WORKLINGO_DATA_DIR) {
  if ([System.IO.Path]::IsPathRooted($env:WORKLINGO_DATA_DIR)) {
    $dataDir = $env:WORKLINGO_DATA_DIR
  } else {
    $dataDir = Join-Path $repoRoot $env:WORKLINGO_DATA_DIR
  }
}
if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
  Write-Host "    Created data directory: $dataDir" -ForegroundColor Green
} else {
  Write-Host "    Data directory exists: $dataDir" -ForegroundColor DarkGray
}

# 5. Start Docker containers (PostgreSQL)
if (-not $SkipDocker) {
  Write-Host "--> Starting PostgreSQL container via Docker Compose..." -ForegroundColor Yellow
  $composeFile = Join-Path $repoRoot "infra/docker-compose.yml"
  & docker compose -f $composeFile up -d
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start Docker Compose services."
    exit $LASTEXITCODE
  }

  # Wait for PostgreSQL to become ready
  Write-Host "    Waiting for PostgreSQL to accept connections..."
  $retries = 30
  $ready = $false
  while ($retries -gt 0) {
    $null = & docker compose -f $composeFile exec -T postgres pg_isready -U worklingo 2>&1
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
    $retries--
  }

  if (-not $ready) {
    Write-Error "PostgreSQL failed to become ready within 30 seconds."
    exit 1
  }
  Write-Host "    PostgreSQL is ready." -ForegroundColor Green
}

# 6. Database migrations
if (-not $SkipMigrate) {
  Write-Host "--> Applying database migrations..." -ForegroundColor Yellow
  & pnpm --filter @worklingo/api prisma migrate deploy
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Database migrations failed."
    exit $LASTEXITCODE
  }
  Write-Host "    Database migrations applied." -ForegroundColor Green
}

# 7. Seed Foundation curriculum
if (-not $SkipSeed) {
  Write-Host "--> Seeding Foundation curriculum..." -ForegroundColor Yellow
  & pnpm --filter @worklingo/api prisma db seed
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Database seeding failed."
    exit $LASTEXITCODE
  }
  Write-Host "    Foundation curriculum seeded." -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  WorkLingo local developer setup completed successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Next commands to try:"
Write-Host "  pnpm dev           - Start local API and Web development servers"
Write-Host "  pnpm verify        - Run entire test and verification suite"
Write-Host "  pnpm backup:local  - Create an immutable timestamped backup"
Write-Host "  pnpm restore:local - Restore state into an empty target"
Write-Host ""
exit 0
