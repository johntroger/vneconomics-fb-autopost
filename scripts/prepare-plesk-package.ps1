$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outZip = Join-Path $root 'vneconomics-autopost-plesk.zip'
$stageDir = Join-Path $root '_plesk_stage'

if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
if (Test-Path $outZip) { Remove-Item $outZip -Force }

New-Item -ItemType Directory -Path (Join-Path $stageDir 'api') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageDir 'migrations') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageDir 'uploads') -Force | Out-Null

Copy-Item -Path (Join-Path $root 'admin.html') -Destination $stageDir -Force
Copy-Item -Path (Join-Path $root 'api\*') -Destination (Join-Path $stageDir 'api') -Recurse -Force
Copy-Item -Path (Join-Path $root 'migrations\*') -Destination (Join-Path $stageDir 'migrations') -Recurse -Force

# Chan thuc thi PHP truc tiep trong thu muc uploads
"<?php header('HTTP/1.0 403 Forbidden'); exit; ?>" | Set-Content -Path (Join-Path $stageDir 'uploads\index.php') -Encoding UTF8

# Nen chuan POSIX slash (/) bang tar de tuong thich 100% voi Linux unzip tren Plesk
tar -a -c -f $outZip -C $stageDir .
Remove-Item $stageDir -Recurse -Force

Write-Host "Da dong goi chuan POSIX cho Plesk: $outZip" -ForegroundColor Green
