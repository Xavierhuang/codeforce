$password = "Hhwj65377068Hhwj"
$server = "143.198.24.72"
$domain = "skillyy.com"
$hostkey = "ssh-ed25519 255 SHA256:snoHk0NSh/m65kvyNFwjmaUi+if85C5HN8rYpV3FSs4"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT CHECK FOR $domain" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to run SSH command
function Run-SSHCommand {
    param([string]$command, [string]$description)
    Write-Host "`n=== $description ===" -ForegroundColor Yellow
    try {
        $result = plink -batch -ssh root@$server -pw $password -hostkey $hostkey $command 2>&1
        if ($result) {
            Write-Host $result
            return $result
        } else {
            Write-Host "No output" -ForegroundColor Gray
            return $null
        }
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
        return $null
    }
}

# Check DNS
Write-Host "=== DNS Check ===" -ForegroundColor Yellow
$dnsResult = nslookup $domain | Select-String "Address" | Select-Object -Last 1
if ($dnsResult -match "143.198.24.72") {
    Write-Host "DNS is correctly pointing to $server" -ForegroundColor Green
} else {
    Write-Host "DNS may not be pointing to the correct IP" -ForegroundColor Red
    Write-Host $dnsResult
}

# Check Nginx status
Run-SSHCommand "systemctl is-active nginx" "Nginx Service Status"

# Check Nginx configuration
Run-SSHCommand "nginx -t" "Nginx Configuration Test"

# Check for nginx site config
Run-SSHCommand "ls -la /etc/nginx/sites-enabled/ | grep -i skillyy || ls -la /etc/nginx/conf.d/ | grep -i skillyy || echo 'No nginx config found for skillyy.com'" "Nginx Site Configuration"

# Check SSL certificate
$sslCheck = Run-SSHCommand "test -f /etc/letsencrypt/live/$domain/fullchain.pem && echo 'SSL EXISTS' || echo 'NO SSL'" "SSL Certificate Check"
if ($sslCheck -match "SSL EXISTS") {
    Write-Host "Checking certificate details..." -ForegroundColor Cyan
    Run-SSHCommand "certbot certificates 2>/dev/null | grep -A 5 $domain || openssl x509 -in /etc/letsencrypt/live/$domain/fullchain.pem -noout -subject -dates 2>/dev/null || echo 'Could not read certificate details'" "SSL Certificate Details"
}

# Check if application build exists
Run-SSHCommand "cd /var/www/codeforce && test -f .next/BUILD_ID && echo 'BUILD EXISTS' || echo 'NO BUILD'" "Application Build Check"

# Check PM2 status
Run-SSHCommand "pm2 list" "PM2 Process Status"

# Check if port 3000 is listening
Run-SSHCommand "ss -tlnp | grep :3000 || netstat -tlnp | grep :3000 || echo 'Port 3000 not listening'" "Port 3000 Check"

# Check application directory
Run-SSHCommand "ls -la /var/www/codeforce/ | head -20" "Application Directory Contents"

# Check environment file exists
Run-SSHCommand "test -f /var/www/codeforce/.env && echo '.env EXISTS' || echo 'NO .env FILE'" "Environment File Check"

# Check nginx access/error logs for recent activity
Write-Host "`n=== Recent Nginx Activity ===" -ForegroundColor Yellow
Run-SSHCommand "tail -5 /var/log/nginx/access.log 2>/dev/null || echo 'No access log found'" "Recent Nginx Access Log"
Run-SSHCommand "tail -5 /var/log/nginx/error.log 2>/dev/null || echo 'No error log found'" "Recent Nginx Error Log"

# Check if site is accessible via curl
Write-Host "`n=== Testing Site Accessibility ===" -ForegroundColor Yellow
Run-SSHCommand "curl -I http://localhost 2>&1 | head -5" "Local HTTP Test"
Run-SSHCommand "curl -I https://localhost 2>&1 | head -5" "Local HTTPS Test"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CHECK COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan












