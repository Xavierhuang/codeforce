#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Backup ==="
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup5

echo "=== Step 2: Check current file ==="
echo "Total lines:"
wc -l components/header/UnifiedHeaderClient.tsx
echo "Lines 600-612:"
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 3: Find the last correct line before duplicates ==="
# Find the line with "Get Started" link closing tag
LAST_GOOD_LINE=$(grep -n "Get Started" components/header/UnifiedHeaderClient.tsx | tail -1 | cut -d: -f1)
echo "Last 'Get Started' at line: $LAST_GOOD_LINE"

# Get the line number for the closing </Link> after Get Started
CLOSING_LINK_LINE=$((LAST_GOOD_LINE + 1))
echo "Closing </Link> should be at line: $CLOSING_LINK_LINE"

echo "=== Step 4: Extract correct content up to line 604 ==="
head -n 604 components/header/UnifiedHeaderClient.tsx > /tmp/header_clean.tsx

echo "=== Step 5: Add correct closing tags ==="
cat >> /tmp/header_clean.tsx << 'EOF'
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
EOF

echo "=== Step 6: Replace file ==="
mv /tmp/header_clean.tsx components/header/UnifiedHeaderClient.tsx

echo "=== Step 7: Verify ==="
echo "New total lines:"
wc -l components/header/UnifiedHeaderClient.tsx
echo "Last 10 lines:"
tail -10 components/header/UnifiedHeaderClient.tsx
echo "Checking for </> fragments:"
grep -n "</>" components/header/UnifiedHeaderClient.tsx || echo "No </> fragments found - good!"

echo "=== Step 8: Rebuild ==="
rm -rf .next
npm run build

echo "=== Step 9: Result ==="
if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    pm2 restart codeforce
    echo "✓ PM2 restarted"
else
    echo "✗ BUILD FAILED"
    echo "Restoring backup..."
    cp components/header/UnifiedHeaderClient.tsx.backup5 components/header/UnifiedHeaderClient.tsx
fi

