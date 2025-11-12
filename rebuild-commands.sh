#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Clear cache ==="
rm -rf .next

echo "=== Step 2: Rebuild ==="
npm run build

echo "=== Step 3: Check result ==="
if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    echo "=== Step 4: Restart PM2 ==="
    pm2 restart codeforce
    echo "✓ PM2 restarted"
    echo "=== Step 5: Verify PM2 ==="
    pm2 list
else
    echo "✗ BUILD FAILED"
    echo "Checking build errors..."
fi

