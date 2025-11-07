# Skillyy Deployment Script for PowerShell
# Run: .\deploy.ps1

$SERVER = "root@143.198.24.72"
$SERVER_PATH = "/var/www/codeforce"
$PASSWORD = "Hhwj65377068Hhwj"
$HOSTKEY = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"

Write-Host "🚀 Starting deployment to Skillyy..." -ForegroundColor Green

# Step 1: Upload files
Write-Host "📤 Uploading files..." -ForegroundColor Yellow
pscp -pw $PASSWORD -hostkey $HOSTKEY -r app ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY -r components ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY -r lib ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY -r prisma ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY -r public ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY -r types ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY next.config.js ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY package.json ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY package-lock.json ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY tsconfig.json ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY tailwind.config.ts ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY postcss.config.js ${SERVER}:${SERVER_PATH}/
pscp -pw $PASSWORD -hostkey $HOSTKEY ecosystem.config.js ${SERVER}:${SERVER_PATH}/

Write-Host "✅ Files uploaded" -ForegroundColor Green

# Step 2: Clean build and restart
Write-Host "🧹 Cleaning old build cache..." -ForegroundColor Yellow
$cleanCmd = 'cd /var/www/codeforce; rm -rf .next; rm -rf node_modules/.cache'
plink -ssh $SERVER -pw $PASSWORD -hostkey $HOSTKEY $cleanCmd

Write-Host "🔨 Building application (this takes 2-3 minutes)..." -ForegroundColor Yellow
$buildCmd = 'cd /var/www/codeforce; npm install; npm run build'
plink -ssh $SERVER -pw $PASSWORD -hostkey $HOSTKEY $buildCmd

# Step 3: Full restart (stop and start fresh)
Write-Host "🔄 Restarting application..." -ForegroundColor Yellow
$restartCmd = 'cd /var/www/codeforce; pm2 stop codeforce 2>/dev/null || true; pm2 delete codeforce 2>/dev/null || true; pm2 start ecosystem.config.js; pm2 save'
plink -ssh $SERVER -pw $PASSWORD -hostkey $HOSTKEY $restartCmd

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Site: https://skillyy.com" -ForegroundColor Cyan

