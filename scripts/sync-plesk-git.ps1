<#
.SYNOPSIS
  Biên dịch và đồng bộ trực tiếp lên nhánh 'production' trên GitHub để Plesk Git Extension cập nhật ngay lập tức.
#>
$ErrorActionPreference = "Stop"

Write-Host "===> 1. Kiem tra kieu du lieu & Unit Tests..." -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "===> 2. Bien dich bundle production (Vite Build)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "===> 3. Dong goi backend PHP & cau hinh bao mat vao dist/..." -ForegroundColor Cyan
$deployDir = "dist"
if (-not (Test-Path "$deployDir/api")) { New-Item -ItemType Directory -Path "$deployDir/api" -Force | Out-Null }
if (-not (Test-Path "$deployDir/uploads")) { New-Item -ItemType Directory -Path "$deployDir/uploads" -Force | Out-Null }
if (-not (Test-Path "$deployDir/migrations")) { New-Item -ItemType Directory -Path "$deployDir/migrations" -Force | Out-Null }

Copy-Item -Path "api/*" -Destination "$deployDir/api" -Recurse -Force
if (Test-Path "$deployDir/api/config.php") { Remove-Item "$deployDir/api/config.php" -Force }
if (Test-Path "public/.htaccess") { Copy-Item -Path "public/.htaccess" -Destination "$deployDir/.htaccess" -Force }
Copy-Item -Path "migrations/*" -Destination "$deployDir/migrations" -Recurse -Force

"Options -Indexes`n<FilesMatch `"\.(php|phtml|phar|sh|pl|py|cgi)$`">`n  Order allow,deny`n  Deny from all`n</FilesMatch>" | Set-Content -Path "$deployDir/uploads/.htaccess" -Encoding UTF8
"" | Set-Content -Path "$deployDir/uploads/index.html" -Encoding UTF8
"<?php header('HTTP/1.0 403 Forbidden'); exit; ?>" | Set-Content -Path "$deployDir/uploads/index.php" -Encoding UTF8
$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"vneconomics.com production build - $buildDate" | Set-Content -Path "$deployDir/build-info.txt" -Encoding UTF8

$originUrl = (git remote get-url origin).Trim()
if (-not $originUrl) { throw "Khong tim thay git remote origin." }

Write-Host "===> 4. Day truc tiep sang nhanh 'production' de Plesk Git tu dong cap nhat..." -ForegroundColor Cyan
Push-Location $deployDir
git init -b production
git config user.name "VNEconomics Deployer"
git config user.email "deploy@vneconomics.com"
git add -A
git commit -m "deploy: sync production build to Plesk ($buildDate)"
git remote add origin $originUrl
git push --force origin HEAD:refs/heads/production
Pop-Location

# Don dep dist/ theo quy tac Storage Cleanup
Remove-Item -Recurse -Force $deployDir

Write-Host "===> HOAN TAT DONG BO PLESK QUA NHANH PRODUCTION!" -ForegroundColor Green
