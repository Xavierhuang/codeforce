#!/bin/bash
cd /var/www/codeforce

echo "Stopping current app..."
pm2 delete codeforce 2>/dev/null || true

echo "Cleaning old build..."
rm -rf .next

echo "Building production app..."
npm run build

if [ -f .next/BUILD_ID ]; then
    echo "Build successful! Starting in production mode..."
    pm2 start npm --name codeforce -- start
    pm2 save
    echo "Production app started!"
    pm2 list
else
    echo "Build failed! Check errors above."
    exit 1
fi


