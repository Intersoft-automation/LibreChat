[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $projectRoot 'mvp.env.example'
$envPath = Join-Path $projectRoot '.env'

if ((Test-Path -LiteralPath $envPath) -and -not $Force) {
    throw ".env already exists. Use -Force only if replacing it is intentional."
}

function New-HexSecret {
    param([Parameter(Mandatory)][int]$ByteCount)

    $bytes = New-Object byte[] $ByteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
}

$content = Get-Content -Raw -LiteralPath $templatePath
$replacements = @{
    '__GENERATE_ADMIN_PANEL_SECRET__'  = New-HexSecret -ByteCount 32
    '__GENERATE_JWT_SECRET__'          = New-HexSecret -ByteCount 32
    '__GENERATE_JWT_REFRESH_SECRET__'  = New-HexSecret -ByteCount 32
    '__GENERATE_CREDS_KEY__'           = New-HexSecret -ByteCount 32
    '__GENERATE_CREDS_IV__'            = New-HexSecret -ByteCount 16
    '__GENERATE_MEILI_MASTER_KEY__'    = New-HexSecret -ByteCount 32
}

foreach ($entry in $replacements.GetEnumerator()) {
    $content = $content.Replace($entry.Key, $entry.Value)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($envPath, $content, $utf8NoBom)

Write-Host "Created $envPath with generated local secrets."
Write-Host 'Set LITELLM_MASTER_KEY to a client credential accepted by LLMGateway.'
