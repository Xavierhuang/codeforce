#!/bin/bash
echo "=== NGINX STATUS ==="
systemctl is-active nginx
echo ""
echo "=== BUILD CHECK ==="
cd /var/www/codeforce
if [ -f .next/BUILD_ID ]; then
    echo "BUILD EXISTS"
else
    echo "NO BUILD"
fi
echo ""
echo "=== PM2 STATUS ==="
pm2 list
echo ""
echo "=== PORT 3000 CHECK ==="
ss -tlnp | grep 3000 || echo "PORT 3000 NOT LISTENING"
echo ""
echo "=== NGINX CONFIG TEST ==="
nginx -t
echo ""
echo "=== SSL CERT CHECK ==="
test -f /etc/letsencrypt/live/skillyy.com/fullchain.pem && echo "SSL EXISTS" || echo "NO SSL"

