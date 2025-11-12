#!/bin/bash
cd /var/www/codeforce

echo "=== Step 1: Check lines 600-612 ==="
sed -n '600,612p' components/header/UnifiedHeaderClient.tsx

echo "=== Step 2: Check total lines ==="
wc -l components/header/UnifiedHeaderClient.tsx

echo "=== Step 3: Find the problematic </> ==="
grep -n "^[[:space:]]*</>$" components/header/UnifiedHeaderClient.tsx | head -5

echo "=== Step 4: Check line 606 specifically ==="
sed -n '606p' components/header/UnifiedHeaderClient.tsx | cat -A

echo "=== Step 5: Check context around line 606 ==="
sed -n '603,610p' components/header/UnifiedHeaderClient.tsx

