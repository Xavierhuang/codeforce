$password = "Hhwj65377068Hhwj"
$server = "143.198.24.72"
$hostkey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"

Write-Host "=== Checking Nginx ===" 
plink -batch -ssh root@$server -pw $password -hostkey $hostkey "systemctl is-active nginx"

Write-Host "`n=== Checking Port 3000 ==="
plink -batch -ssh root@$server -pw $password -hostkey $hostkey "ss -tlnp | grep :3000 || echo 'Port 3000 not listening'"

Write-Host "`n=== Checking PM2 ==="
plink -batch -ssh root@$server -pw $password -hostkey $hostkey "pm2 list"

Write-Host "`n=== Checking Build ==="
plink -batch -ssh root@$server -pw $password -hostkey $hostkey "cd /var/www/codeforce && test -f .next/BUILD_ID && echo 'BUILD EXISTS' || echo 'NO BUILD'"

Write-Host "`n=== Checking SSL ==="
plink -batch -ssh root@$server -pw $password -hostkey $hostkey "test -f /etc/letsencrypt/live/skillyy.com/fullchain.pem && echo 'SSL EXISTS' || echo 'NO SSL'"

