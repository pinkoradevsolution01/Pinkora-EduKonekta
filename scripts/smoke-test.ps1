param(
  [string]$WebBaseUrl = 'http://localhost:3100',
  [string]$ApiBaseUrl = 'http://localhost:4000/api/v1'
)

$ErrorActionPreference = 'Stop'

function Get-Json([string]$Url) {
  $response = Invoke-WebRequest -UseBasicParsing -Uri $Url
  if ($response.StatusCode -ne 200) { throw "Expected HTTP 200 from $Url; received $($response.StatusCode)." }
  return $response.Content | ConvertFrom-Json
}

$web = Get-Json "$($WebBaseUrl.TrimEnd('/'))/api/health"
if ($web.status -ne 'ok' -or $web.service -ne 'web') { throw 'Web health response is invalid.' }

$api = Get-Json "$($ApiBaseUrl.TrimEnd('/'))/health"
if ($api.status -ne 'ok' -or $api.service -ne 'api' -or $api.database -ne 'up') {
  throw 'API health response is invalid or the database is unavailable.'
}

try {
  Invoke-WebRequest -UseBasicParsing -Uri "$($ApiBaseUrl.TrimEnd('/'))/auth/me" | Out-Null
  throw 'Unauthenticated auth/me request unexpectedly succeeded.'
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($status -ne 401) { throw }
}

Write-Host "Smoke test passed: web=$($WebBaseUrl.TrimEnd('/')); api=$($ApiBaseUrl.TrimEnd('/'))."
