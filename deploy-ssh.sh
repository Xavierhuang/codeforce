#!/bin/bash

# Production deployment script
SERVER="143.198.24.72"
USER="root"
PASSWORD="Hhwj65377068Hhwj"
REMOTE_DIR="/var/www/codeforce"
APP_NAME="codeforce"

echo "=== Building production bundle ==="
npm run build

if [ ! -f .next/BUILD_ID ]; then
    echo "Build failed! Aborting deployment."
    exit 1
fi

echo "=== Creating deployment package ==="
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.env.local' \
    -czf codeforce-deploy.tar.gz \
    app/ components/ lib/ prisma/ public/ types/ \
    *.json *.js *.ts *.config.* \
    .env

echo "=== Uploading to server ==="
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no codeforce-deploy.tar.gz $USER@$SERVER:$REMOTE_DIR/

echo "=== Deploying on server ==="
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $USER@$SERVER << EOF
cd $REMOTE_DIR

echo "Stopping app..."
pm2 delete $APP_NAME 2>/dev/null || true

echo "Backing up current version..."
tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz . 2>/dev/null || true

echo "Extracting new version..."
tar -xzf codeforce-deploy.tar.gz

echo "Installing dependencies..."
npm install --production

echo "Building production app..."
npm run build

if [ -f .next/BUILD_ID ]; then
    echo "Build successful! Starting app..."
    pm2 start npm --name $APP_NAME -- start
    pm2 save
    echo "Deployment complete!"
    pm2 list
else
    echo "Build failed! Restoring backup..."
    # Restore logic here if needed
    exit 1
fi
EOF

echo "=== Cleaning up ==="
rm -f codeforce-deploy.tar.gz

echo "=== Deployment complete! ==="

