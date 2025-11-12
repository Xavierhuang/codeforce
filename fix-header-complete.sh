#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Backup file ==="
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup3

echo "=== Step 2: Check file structure ==="
echo "Total lines:"
wc -l components/header/UnifiedHeaderClient.tsx

echo "=== Step 3: Find problematic lines ==="
grep -n "</>" components/header/UnifiedHeaderClient.tsx

echo "=== Step 4: Check lines 600-612 ==="
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 5: Remove all </> fragments ==="
sed -i '/^[[:space:]]*<\/>$/d' components/header/UnifiedHeaderClient.tsx

echo "=== Step 6: Check if there are duplicate closing sections ==="
# Find the last occurrence of </header> and remove everything after it
LAST_HEADER_LINE=$(grep -n "</header>" components/header/UnifiedHeaderClient.tsx | tail -1 | cut -d: -f1)
echo "Last </header> found at line: $LAST_HEADER_LINE"

# Keep only up to the last </header> and the closing braces
TOTAL_LINES=$(wc -l < components/header/UnifiedHeaderClient.tsx)
if [ "$LAST_HEADER_LINE" -lt "$TOTAL_LINES" ]; then
    echo "Removing duplicate content after line $LAST_HEADER_LINE"
    head -n "$LAST_HEADER_LINE" components/header/UnifiedHeaderClient.tsx > /tmp/header_fixed.tsx
    echo "  )" >> /tmp/header_fixed.tsx
    echo "}" >> /tmp/header_fixed.tsx
    mv /tmp/header_fixed.tsx components/header/UnifiedHeaderClient.tsx
fi

echo "=== Step 7: Verify final structure ==="
echo "Total lines after fix:"
wc -l components/header/UnifiedHeaderClient.tsx
echo "Last 10 lines:"
tail -10 components/header/UnifiedHeaderClient.tsx

echo "=== Step 8: Clear cache ==="
rm -rf .next

echo "=== Step 9: Rebuild ==="
npm run build

echo "=== Step 10: Check result ==="
if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    pm2 restart codeforce
else
    echo "✗ BUILD FAILED"
    echo "Restoring backup..."
    cp components/header/UnifiedHeaderClient.tsx.backup3 components/header/UnifiedHeaderClient.tsx
fi

