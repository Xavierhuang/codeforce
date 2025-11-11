#!/bin/bash
echo "=== Checking Nginx Installation ==="
which nginx || echo "NGINX NOT FOUND"
nginx -v 2>&1 || echo "NGINX VERSION CHECK FAILED"

echo ""
echo "=== Checking Nginx Service ==="
systemctl status nginx --no-pager | head -5

echo ""
echo "=== Testing Nginx Config ==="
nginx -t

echo ""
echo "=== Restarting Nginx ==="
systemctl restart nginx
sleep 2
systemctl status nginx --no-pager | head -5

echo ""
echo "=== Checking Ports ==="
ss -tlnp | grep -E '(:80|:443)'

echo ""
echo "=== Checking App Status ==="
cd /var/www/codeforce
pm2 list 2>/dev/null || echo "PM2 NOT RUNNING"
ss -tlnp | grep 3000 || echo "PORT 3000 NOT LISTENING"









