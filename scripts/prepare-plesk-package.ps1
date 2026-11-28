<#
.SYNOPSIS
  Đóng gói toàn bộ mã nguồn production VNEconomics v2 chuẩn POSIX cho Plesk.
.DESCRIPTION
  1. Chạy typecheck, toàn bộ unit tests và vite build
  2. Gom dist/*, api/* (loại trừ api/config.php và api/cache/), migrations/*, .htaccess, robots.txt, trang tĩnh & bảo mật uploads
  3. Đóng gói duy nhất 1 file vneconomics-production.zip và tự động dọn dẹp dist/, _plesk_stage/
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '===> 1. Typecheck (tsc --noEmit)...' -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw "Typecheck failed with exit code $LASTEXITCODE" }

Write-Host '===> 2. Unit & Integration Tests (npm test)...' -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) { throw "Tests failed with exit code $LASTEXITCODE" }

Write-Host '===> 3. Vite Production Build...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }

$distDir = Join-Path $root 'dist'
$stageDir = Join-Path $root '_plesk_stage'
$outZip = Join-Path $root 'vneconomics-production.zip'

if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
if (Test-Path $outZip) { Remove-Item $outZip -Force }

Write-Host '===> 4. Staging files & Security hardening...' -ForegroundColor Cyan
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
Copy-Item -Path (Join-Path $distDir '*') -Destination $stageDir -Recurse -Force

# Copy API excluding secrets (config.php) and local caches (cache/)
$stageApi = Join-Path $stageDir 'api'
New-Item -ItemType Directory -Path $stageApi -Force | Out-Null
Get-ChildItem -Path (Join-Path $root 'api') -Force | Where-Object {
    $_.Name -ne 'config.php' -and $_.Name -ne 'cache'
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $stageApi -Recurse -Force
}

# Copy migrations
$stageMig = Join-Path $stageDir 'migrations'
New-Item -ItemType Directory -Path $stageMig -Force | Out-Null
Copy-Item -Path (Join-Path $root 'migrations\*') -Destination $stageMig -Recurse -Force

# Copy legacy compliance & autopost HTML pages
foreach ($staticFile in @('admin.html', 'privacy.html', 'terms.html', 'data-deletion.html')) {
    $src = Join-Path $root $staticFile
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $stageDir -Force
    }
}

# Ensure .htaccess and robots.txt at web root
Copy-Item -Path (Join-Path $root 'public\.htaccess') -Destination (Join-Path $stageDir '.htaccess') -Force
Copy-Item -Path (Join-Path $root 'public\robots.txt') -Destination (Join-Path $stageDir 'robots.txt') -Force

# Harden uploads directory (block PHP execution)
$stageUploads = Join-Path $stageDir 'uploads'
New-Item -ItemType Directory -Path $stageUploads -Force | Out-Null
"<?php header('HTTP/1.0 403 Forbidden'); exit; ?>" | Set-Content -Path (Join-Path $stageUploads 'index.php') -Encoding UTF8
@"
<FilesMatch "\.(php|phtml|phar|php5|php7|php8|cgi|pl|py|sh)$">
  Order allow,deny
  Deny from all
</FilesMatch>
"@ | Set-Content -Path (Join-Path $stageUploads '.htaccess') -Encoding UTF8

# Build info
$buildTime = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
"VNEconomics.com v2 Production Build - $buildTime" | Set-Content -Path (Join-Path $stageDir 'build-info.txt') -Encoding UTF8

Write-Host '===> 5. Creating POSIX zip vneconomics-production.zip...' -ForegroundColor Cyan
tar -a -c -f $outZip -C $stageDir .
if ($LASTEXITCODE -ne 0) { throw "tar packaging failed with exit code $LASTEXITCODE" }

# Cleanup temporary staging and build folders per storage-cleanup rule
Remove-Item $stageDir -Recurse -Force
Remove-Item $distDir -Recurse -Force

Write-Host "===> HOAN TAT DONG GOI PLESK: $outZip" -ForegroundColor Green
