function Get-PostgresConnection([string]$databaseUrl) {
  # Preserve the PostgreSQL scheme: converting to HTTP would default to port 80.
  $uri = [System.Uri]$databaseUrl
  return @{
    Uri = $uri
    HostName = $uri.Host
    Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
  }
}

function Get-DockerPostgresArguments(
  [string]$tool,
  [string]$hostName,
  [int]$port,
  [string]$user,
  [string]$database
) {
  # A client container must connect to the requested endpoint, never implicitly
  # to the database of a similarly named Compose service.
  $normalizedHost = $hostName.Trim('[', ']')
  $clientHost = if ($normalizedHost -in @('localhost', '127.0.0.1', '::1')) {
    'host.docker.internal'
  } else { $normalizedHost }
  return @(
    'run', '--rm', '--pull=never', '-i',
    '--add-host=host.docker.internal:host-gateway',
    '--env', 'PGPASSWORD', '--env', 'PGCONNECT_TIMEOUT=5',
    'postgres:17-alpine', $tool,
    '-h', $clientHost, '-p', "$port", '-U', $user, '-d', $database
  )
}
