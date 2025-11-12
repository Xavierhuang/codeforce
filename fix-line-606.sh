#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Backup ==="
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup7

echo "=== Step 2: Check current line 606 ==="
sed -n '606p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 3: Check context (lines 603-610) ==="
sed -n '603,610p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 4: Fix line 606 - replace </> with </div> ==="
# Replace any </> on line 606 with </div>
sed -i '606s|</>|</div>|' components/header/UnifiedHeaderClient.tsx

echo "=== Step 5: Verify fix ==="
echo "Line 606 now:"
sed -n '606p' components/header/UnifiedHeaderClient.tsx
echo "Context (lines 603-610):"
sed -n '603,610p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 6: Check if there are any other problematic </> fragments ==="
# Find </> that are standalone (not part of valid JSX)
grep -n "^[[:space:]]*</>$" components/header/UnifiedHeaderClient.tsx || echo "No standalone </> fragments found"

echo "=== Step 7: Rebuild ==="
rm -rf .next
npm run build

if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    pm2 restart codeforce
else
    echo "✗ BUILD FAILED"
    echo "Restoring backup..."
    cp components/header/UnifiedHeaderClient.tsx.backup7 components/header/UnifiedHeaderClient.tsx
fi

