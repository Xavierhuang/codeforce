#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Backup ==="
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup6

echo "=== Step 2: Check current state ==="
TOTAL_LINES=$(wc -l < components/header/UnifiedHeaderClient.tsx)
echo "Total lines: $TOTAL_LINES"

echo "=== Step 3: Find the last occurrence of the component closing brace ==="
# Find all lines with just "}" 
CLOSING_BRACES=$(grep -n "^}$" components/header/UnifiedHeaderClient.tsx)
echo "Lines with closing braces:"
echo "$CLOSING_BRACES"

# Find the last "}" that comes after "</header>"
LAST_HEADER=$(grep -n "</header>" components/header/UnifiedHeaderClient.tsx | tail -1 | cut -d: -f1)
echo "Last </header> at line: $LAST_HEADER"

# Find the first "}" after the last </header>
FIRST_BRACE_AFTER_HEADER=$(awk -v header="$LAST_HEADER" 'NR > header && /^}$/ {print NR; exit}' components/header/UnifiedHeaderClient.tsx)
echo "First } after </header> at line: $FIRST_BRACE_AFTER_HEADER"

# The component should end at line after the closing brace
COMPONENT_END=$((FIRST_BRACE_AFTER_HEADER + 1))
echo "Component should end at line: $COMPONENT_END"

echo "=== Step 4: Check what's at the end ==="
echo "Last 15 lines:"
tail -15 components/header/UnifiedHeaderClient.tsx

echo "=== Step 5: Remove everything after line 612 (correct end) ==="
# Keep only first 612 lines (which should be the correct end)
head -n 612 components/header/UnifiedHeaderClient.tsx > /tmp/header_correct.tsx

echo "=== Step 6: Verify the end ==="
echo "Last 10 lines of corrected file:"
tail -10 /tmp/header_correct.tsx

echo "=== Step 7: Check for problematic fragments ==="
grep -n "</>" /tmp/header_correct.tsx && echo "WARNING: Still contains </>" || echo "No </> fragments - good!"

echo "=== Step 8: Replace file ==="
mv /tmp/header_correct.tsx components/header/UnifiedHeaderClient.tsx

echo "=== Step 9: Final verification ==="
echo "New total lines:"
wc -l components/header/UnifiedHeaderClient.tsx
echo "Last 5 lines:"
tail -5 components/header/UnifiedHeaderClient.tsx

echo "=== Step 10: Rebuild ==="
rm -rf .next
npm run build

echo "=== Step 11: Result ==="
if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    pm2 restart codeforce
    echo "✓ PM2 restarted"
else
    echo "✗ BUILD FAILED"
    echo "Checking error..."
    echo "Restoring backup..."
    cp components/header/UnifiedHeaderClient.tsx.backup6 components/header/UnifiedHeaderClient.tsx
fi

