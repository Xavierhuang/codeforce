#!/bin/bash
cd /var/www/codeforce

# Backup
cp components/header/UnifiedHeaderClient.tsx components/header/UnifiedHeaderClient.tsx.backup4

# Remove everything from line 605 onwards and rebuild correctly
head -n 604 components/header/UnifiedHeaderClient.tsx > /tmp/header_new.tsx

# Add the correct closing tags
cat >> /tmp/header_new.tsx << 'EOF'
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
EOF

# Replace the file
mv /tmp/header_new.tsx components/header/UnifiedHeaderClient.tsx

# Verify
echo "=== File structure ==="
tail -10 components/header/UnifiedHeaderClient.tsx
echo "=== Total lines ==="
wc -l components/header/UnifiedHeaderClient.tsx

# Rebuild
rm -rf .next
npm run build

if [ -f .next/BUILD_ID ]; then
    echo "✓ BUILD SUCCESS"
    pm2 restart codeforce
else
    echo "✗ BUILD FAILED - Restoring backup"
    cp components/header/UnifiedHeaderClient.tsx.backup4 components/header/UnifiedHeaderClient.tsx
fi

