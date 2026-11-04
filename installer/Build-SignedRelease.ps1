#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Fa-f0-9]{40}$')]
    [string]$CertificateThumbprint,
    [string]$SignTool = 'signtool.exe',
    [switch]$MachineStore
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$signer = (Get-Command $SignTool -CommandType Application).Source
$store = if ($MachineStore) { 'LocalMachine' } else { 'CurrentUser' }
$certificate = Get-Item -LiteralPath "Cert:\$store\My\$CertificateThumbprint"
$now = Get-Date
if (!$certificate.HasPrivateKey -or $certificate.NotBefore -gt $now -or $certificate.NotAfter -le $now -or
    '1.3.6.1.5.5.7.3.3' -notin $certificate.EnhancedKeyUsageList.ObjectId) {
    throw 'Serve un certificato di firma del codice valido con chiave privata.'
}

$definition = Join-Path $PSScriptRoot 'sentinel.iss'
$version = [regex]::Match((Get-Content -LiteralPath $definition -Raw), '(?m)^#define AppVersion "([0-9]+(?:\.[0-9]+)+)"').Groups[1].Value
if (!$version) { throw 'Versione installer non valida.' }
$compiler = Join-Path $root 'runtime\inno\ISCC.exe'
if (!(Test-Path -LiteralPath $compiler)) {
    $compiler = (Get-Command ISCC.exe -CommandType Application).Source
}

# Stage each build separately so a failed signing attempt cannot replace a release.
$release = Join-Path $root "dist\signed-$version"
if (Test-Path -LiteralPath $release) { throw "La release $version esiste gia. Incrementa la versione." }
$stage = Join-Path $root ('dist\staging-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $stage | Out-Null
$exe = Join-Path $stage 'Sentinel Decentralizer Node Installer.exe'
& $compiler "/O$stage" '/FSentinel Decentralizer Node Installer' $definition
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $exe)) { throw 'Compilazione non riuscita.' }

$signArgs = @('sign', '/fd', 'SHA256', '/sha1', $CertificateThumbprint, '/tr', 'http://timestamp.digicert.com', '/td', 'SHA256')
if ($MachineStore) { $signArgs += '/sm' }
& $signer @signArgs $exe
if ($LASTEXITCODE -ne 0) { throw 'Firma o marca temporale non riuscita.' }
& $signer verify /pa /tw /v $exe
if ($LASTEXITCODE -ne 0) { throw 'Verifica SignTool non riuscita.' }
$signature = Get-AuthenticodeSignature -LiteralPath $exe
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Thumbprint -ne $CertificateThumbprint -or !$signature.TimeStamperCertificate) {
    throw 'Firma, identita del firmatario o marca temporale non valide.'
}

$zip = Join-Path $stage "Sentinel-Windows-$version.zip"
$readme = Join-Path $root 'Installazione Wizard\LEGGIMI.txt'
Compress-Archive -LiteralPath $exe, $readme, (Join-Path $root 'Installazione Wizard\Instructions-ENG.txt') -DestinationPath $zip
Get-FileHash -LiteralPath $exe, $zip -Algorithm SHA256 | ForEach-Object {
    '{0}  {1}' -f $_.Hash, (Split-Path -Leaf $_.Path)
} | Set-Content -LiteralPath (Join-Path $stage 'SHA256SUMS.txt') -Encoding ASCII
Rename-Item -LiteralPath $stage -NewName (Split-Path -Leaf $release)
Write-Output $release

