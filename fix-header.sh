#!/bin/bash
cd /var/www/codeforce

# Step 1: Backup the file
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup2

# Step 2: Check current content around problematic area
echo "=== Current content lines 600-612 ==="
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

# Step 3: Remove any `</>` fragments
sed -i '/^[[:space:]]*<\/>$/d' components/header/UnifiedHeaderClient.tsx

# Step 4: Check if line 606 still has issues
echo "=== After removing fragments ==="
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

# Step 5: Verify file ends correctly
echo "=== Last 5 lines ==="
tail -5 components/header/UnifiedHeaderClient.tsx

# Step 6: Count total lines
echo "=== Total lines ==="
wc -l components/header/UnifiedHeaderClient.tsx

# Step 7: Clear cache
rm -rf .next

# Step 8: Rebuild
npm run build

# Step 9: Check result
if [ -f .next/BUILD_ID ]; then
    echo "BUILD SUCCESS"
else
    echo "BUILD FAILED"
fi

