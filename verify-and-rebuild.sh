#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Verify file structure ==="
echo "Total lines:"
wc -l components/header/UnifiedHeaderClient.tsx

echo "=== Step 2: Check last 10 lines ==="
tail -10 components/header/UnifiedHeaderClient.tsx

echo "=== Step 3: Check for problematic fragments ==="
grep -n "</>" components/header/UnifiedHeaderClient.tsx && echo "WARNING: Contains </>" || echo "✓ No </> fragments found"

echo "=== Step 4: Check lines 600-612 ==="
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 5: Clear cache ==="
rm -rf .next

echo "=== Step 6: Rebuild ==="
npm run build

echo "=== Step 7: Check result ==="
if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    echo "=== Step 8: Restart PM2 ==="
    pm2 restart codeforce
    echo "✓ PM2 restarted"
else
    echo "✗ BUILD FAILED"
fi

