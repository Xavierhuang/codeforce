#!/bin/bash

# Skillyy Deployment Script
# This script deploys all changes to the production server

SERVER="root@143.198.24.72"
SERVER_PATH="/var/www/codeforce"
PASSWORD="Hhwj65377068Hhwj"
HOSTKEY="ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"

echo "🚀 Starting deployment to Skillyy..."

# Step 1: Upload all application files
echo "📤 Uploading files..."
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" -r app root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" -r components root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" -r lib root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" -r public root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" next.config.js root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" package.json root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" tsconfig.json root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" tailwind.config.ts root@143.198.24.72:$SERVER_PATH/
pscp -pw "$PASSWORD" -hostkey "$HOSTKEY" postcss.config.js root@143.198.24.72:$SERVER_PATH/

echo "✅ Files uploaded"

# Step 2: Connect and rebuild
echo "🔨 Building application..."
plink -ssh root@143.198.24.72 -pw "$PASSWORD" -hostkey "$HOSTKEY" "cd $SERVER_PATH && npm install && npm run build"

# Step 3: Restart PM2
echo "🔄 Restarting application..."
plink -ssh root@143.198.24.72 -pw "$PASSWORD" -hostkey "$HOSTKEY" "cd $SERVER_PATH && pm2 restart codeforce || pm2 start ecosystem.config.js"

echo "✅ Deployment complete!"
echo "🌐 Site: https://skillyy.com"









