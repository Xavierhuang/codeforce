# Production deployment script for Windows PowerShell
$SERVER = "143.198.24.72"
$USER = "root"
$PASSWORD = "Hhwj65377068Hhwj"
$REMOTE_DIR = "/var/www/codeforce"
$APP_NAME = "codeforce"

Write-Host "=== Building production bundle ==="
npm run build

if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "=== Creating deployment package ==="
# Create tar archive with all necessary files
tar --exclude='node_modules' `
    --exclude='.next' `
    --exclude='.git' `
    --exclude='*.log' `
    --exclude='.env.local' `
    -czf codeforce-deploy.tar.gz `
    app components lib prisma public types `
    package.json package-lock.json next.config.js tsconfig.json tailwind.config.ts postcss.config.js `
    .env 2>$null

Write-Host "=== Uploading to server ==="
$hostkey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"
plink -batch -ssh $USER@$SERVER -pw $PASSWORD -hostkey $hostkey "mkdir -p $REMOTE_DIR"

# Upload using pscp
pscp -batch -pw $PASSWORD -hostkey $hostkey codeforce-deploy.tar.gz $USER@$SERVER`:$REMOTE_DIR/

Write-Host "=== Deploying on server ==="
$deployCommands = @"
cd $REMOTE_DIR
echo 'Stopping app...'
pm2 delete $APP_NAME 2>/dev/null || true
echo 'Backing up current version...'
tar -czf backup-`$(date +%Y%m%d-%H%M%S).tar.gz . 2>/dev/null || true
echo 'Extracting new version...'
tar -xzf codeforce-deploy.tar.gz
echo 'Installing dependencies...'
npm install --production
echo 'Building production app...'
npm run build
if [ -f .next/BUILD_ID ]; then
    echo 'Build successful! Starting app...'
    pm2 start npm --name $APP_NAME -- start
    pm2 save
    echo 'Deployment complete!'
    pm2 list
else
    echo 'Build failed!'
    exit 1
fi
"@

# Execute deployment commands
$deployCommands | plink -batch -ssh $USER@$SERVER -pw $PASSWORD -hostkey $hostkey

Write-Host "=== Cleaning up ==="
Remove-Item -Force codeforce-deploy.tar.gz -ErrorAction SilentlyContinue

Write-Host "=== Deployment complete! ===" -ForegroundColor Green

