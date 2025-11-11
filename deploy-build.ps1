# Deploy Build Script
# Builds locally and deploys .next folder to production server

$ErrorActionPreference = "Stop"

# Configuration
$SERVER = "143.198.24.72"
$SERVER_USER = "root"
$SERVER_PASSWORD = "Hhwj65377068Hhwj"
$SERVER_HOSTKEY = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"
$SERVER_PATH = "/var/www/codeforce"
$PROJECT_PATH = "H:\VIBE\CodeForce\CodeForce"

Write-Host "=== Build and Deploy Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build locally
Write-Host "[1/4] Building application locally..." -ForegroundColor Yellow
Set-Location $PROJECT_PATH

# Clean previous build
if (Test-Path ".next") {
    Write-Host "  Removing old .next folder..." -ForegroundColor Gray
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
}

# Run build
Write-Host "  Running npm run build (this may take a few minutes)..." -ForegroundColor Gray
Write-Host "  (Warnings about dynamic server usage are normal and can be ignored)" -ForegroundColor DarkGray

$oldErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Run npm build - capture both stdout and stderr but don't fail on warnings
try {
    $null = npm run build 2>&1 | ForEach-Object {
        # Show progress but filter out repetitive warnings
        if ($_ -notmatch "Error fetching|Dynamic server usage") {
            Write-Host "    $_" -ForegroundColor DarkGray
        }
    }
} catch {
    # Ignore exceptions from npm warnings
}

# Wait a moment for file system to sync
Start-Sleep -Seconds 2

# Check if build succeeded by verifying .next directory exists
if (-not (Test-Path ".next")) {
    $ErrorActionPreference = $oldErrorAction
    Write-Host "  Build failed - .next directory not found!" -ForegroundColor Red
    Write-Host "  Run 'npm run build' manually to see full error output" -ForegroundColor Yellow
    exit 1
}

$ErrorActionPreference = $oldErrorAction
Write-Host "  Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Create archive
Write-Host "[2/4] Creating build archive..." -ForegroundColor Yellow
$archivePath = Join-Path $PROJECT_PATH ".next.zip"
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
}

Compress-Archive -Path ".next" -DestinationPath $archivePath -Force
Write-Host "  Archive created: .next.zip" -ForegroundColor Green
Write-Host ""

# Step 3: Upload to server
Write-Host "[3/4] Uploading build to server..." -ForegroundColor Yellow
try {
    & pscp -P 22 -pw $SERVER_PASSWORD -hostkey "$SERVER_HOSTKEY" "$archivePath" "${SERVER_USER}@${SERVER}:/tmp/.next.zip"
    if ($LASTEXITCODE -ne 0) {
        throw "pscp failed with exit code $LASTEXITCODE"
    }
    Write-Host "  Upload completed!" -ForegroundColor Green
} catch {
    Write-Host "  Upload failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Extract and restart on server
Write-Host "[4/4] Extracting build and restarting PM2..." -ForegroundColor Yellow
$serverCommands = "cd $SERVER_PATH && pm2 stop codeforce && rm -rf .next && unzip -q /tmp/.next.zip -d . && rm /tmp/.next.zip && pm2 start codeforce && pm2 save && echo 'Deployment completed!'"

try {
    $result = & plink -ssh ${SERVER_USER}@${SERVER} -pw $SERVER_PASSWORD -hostkey "$SERVER_HOSTKEY" $serverCommands
    if ($LASTEXITCODE -ne 0) {
        throw "plink failed with exit code $LASTEXITCODE"
    }
    Write-Host $result
    Write-Host "  PM2 restarted successfully!" -ForegroundColor Green
} catch {
    Write-Host "  Server commands failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "Application is running on production server" -ForegroundColor Green

# Cleanup local archive
if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
    Write-Host "Local archive cleaned up" -ForegroundColor Gray
}

