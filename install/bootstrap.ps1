# Gets a Windows computer ready for /sketch without needing anything pre-installed.
# Uses Node.js 18+ if present; otherwise downloads a private copy into %USERPROFILE%\.wireframe\runtime.
$ErrorActionPreference = 'Stop'
$Kit = Split-Path -Parent $PSScriptRoot
$Runtime = Join-Path $HOME '.wireframe\runtime'
$Fallback = 'v24.11.1'

function Test-Node($exe) {
  try { & $exe -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)"; return $LASTEXITCODE -eq 0 } catch { return $false }
}

$node = $null
$found = Get-Command node -ErrorAction SilentlyContinue
if ($found -and (Test-Node $found.Source)) { $node = $found.Source; Write-Host "✓ Using the Node.js already on this computer." }
elseif ((Test-Path "$Runtime\node.exe") -and (Test-Node "$Runtime\node.exe")) { $node = "$Runtime\node.exe"; Write-Host "✓ Using the private runtime." }
else {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  try { $version = (Invoke-RestMethod https://nodejs.org/dist/index.json | Where-Object { $_.lts } | Select-Object -First 1).version } catch { $version = $Fallback }
  if (-not $version) { $version = $Fallback }
  $name = "node-$version-win-$arch"
  Write-Host "Downloading a private Node.js runtime ($version, about 30 MB)..."
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'node.zip'
  Invoke-WebRequest "https://nodejs.org/dist/$version/$name.zip" -OutFile $zip
  $sums = (Invoke-WebRequest "https://nodejs.org/dist/$version/SHASUMS256.txt").Content -split "`n"
  $expected = ($sums | Where-Object { $_ -match " $name.zip$" }) -split ' ' | Select-Object -First 1
  $actual = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) { throw 'The download did not match its checksum; stopping.' }
  Expand-Archive $zip -DestinationPath $tmp
  if (Test-Path $Runtime) { Remove-Item -Recurse -Force $Runtime }
  New-Item -ItemType Directory -Path (Split-Path $Runtime) -Force | Out-Null
  Move-Item (Join-Path $tmp $name) $Runtime
  Remove-Item -Recurse -Force $tmp
  $node = "$Runtime\node.exe"
  Write-Host "✓ Runtime installed in $Runtime."
}

& $node (Join-Path $Kit 'bin\wf.js') setup
