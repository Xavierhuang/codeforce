# Production deployment script - Direct file upload with verification
$SERVER = "143.198.24.72"
$USER = "root"
$PASSWORD = "Hhwj65377068Hhwj"
$REMOTE_DIR = "/var/www/codeforce"
$APP_NAME = "codeforce"
$hostkey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"

Write-Host "=== Building production bundle locally ==="
npm run build

if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Host "Build failed! Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host "=== Uploading files to server ==="

# Upload directories recursively
Write-Host "Uploading app directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r app $USER@$SERVER`:$REMOTE_DIR/

Write-Host "Uploading components directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r components $USER@$SERVER`:$REMOTE_DIR/

Write-Host "Uploading lib directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r lib $USER@$SERVER`:$REMOTE_DIR/

Write-Host "Uploading prisma directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r prisma $USER@$SERVER`:$REMOTE_DIR/

Write-Host "Uploading public directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r public $USER@$SERVER`:$REMOTE_DIR/

Write-Host "Uploading types directory..."
pscp -batch -pw $PASSWORD -hostkey $hostkey -r types $USER@$SERVER`:$REMOTE_DIR/

# Upload config files
Write-Host "Uploading config files..."
pscp -batch -pw $PASSWORD -hostkey $hostkey package.json package-lock.json next.config.js tsconfig.json tailwind.config.ts postcss.config.js $USER@$SERVER`:$REMOTE_DIR/

Write-Host "=== Verifying uploads and deploying on server ==="
$deployCommands = @"
cd $REMOTE_DIR
echo 'Verifying files...'
ls -la lib/ | head -5
ls -la prisma/ | head -5
echo 'Stopping app...'
pm2 delete $APP_NAME 2>/dev/null || true
echo 'Installing all dependencies (including dev)...'
npm install
echo 'Checking Prisma schema...'
if [ -f prisma/schema.prisma ]; then
    echo 'Prisma schema found'
else
    echo 'ERROR: Prisma schema.prisma not found!'
    ls -la prisma/
    exit 1
fi
echo 'Generating Prisma Client...'
npx prisma generate
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
    ls -la lib/
    exit 1
fi
"@

# Execute deployment commands
$deployCommands | plink -batch -ssh $USER@$SERVER -pw $PASSWORD -hostkey $hostkey

Write-Host "=== Deployment complete! ===" -ForegroundColor Green
