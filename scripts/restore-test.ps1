param(
  [switch]$KeepRestoreDatabase
)

$restoreDatabase = 'edukonekta_restore_test'
$databaseExists = docker compose exec -T postgres psql -U edukonekta -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$restoreDatabase'"
$databaseExistsText = if ($null -eq $databaseExists) { '' } else { ($databaseExists | Out-String).Trim() }
if ($databaseExistsText -eq '1') {
  throw "Refusing to overwrite existing isolated restore database '$restoreDatabase'. Review or remove it explicitly first."
}

try {
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U edukonekta -d postgres -c "CREATE DATABASE $restoreDatabase"
  if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated restore database.' }

  docker compose exec -T postgres sh -c "pg_dump -U edukonekta edukonekta | psql -v ON_ERROR_STOP=1 -U edukonekta -d $restoreDatabase > /dev/null"
  if ($LASTEXITCODE -ne 0) { throw 'Restore command failed.' }

  $tables = docker compose exec -T postgres psql -U edukonekta -d $restoreDatabase -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
  if ([int]$tables.Trim() -lt 1) { throw 'Restored database did not contain public tables.' }
  Write-Host "Restore verification passed: $restoreDatabase contains $($tables.Trim()) public tables."
}
finally {
  if (-not $KeepRestoreDatabase) {
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U edukonekta -d postgres -c "DROP DATABASE IF EXISTS $restoreDatabase"
  }
}
