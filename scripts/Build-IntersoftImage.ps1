[CmdletBinding()]
param(
    [string]$ImageRepository = 'intersoft/librechat',
    [string]$ImageTag
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$commit = (& git -C $repoRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to resolve the LibreChat source commit.'
}

$package = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$version = ([string]$package.version).TrimStart('v')
if (-not $version) {
    throw 'Unable to resolve the LibreChat package version.'
}

$shortCommit = $commit.Substring(0, 7)
if (-not $ImageTag) {
    $ImageTag = "$version-intersoft-$shortCommit"
}

$branch = (& git -C $repoRoot branch --show-current).Trim()
$buildDate = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$image = "${ImageRepository}:${ImageTag}"

& docker build `
    --pull `
    --build-arg "BUILD_COMMIT=$commit" `
    --build-arg "BUILD_BRANCH=$branch" `
    --build-arg "BUILD_DATE=$buildDate" `
    --tag $image `
    $repoRoot

if ($LASTEXITCODE -ne 0) {
    throw "Docker build failed for $image."
}

Write-Host "Built image: $image"
