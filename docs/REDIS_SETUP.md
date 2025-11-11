# Redis Setup Guide for Digital Ocean

This guide will help you set up Redis for rate limiting on your Digital Ocean droplet.

## Option 1: Managed Redis (Recommended)

Digital Ocean offers managed Redis databases. This is the easiest option:

1. **Create Managed Redis Database**
   - Go to Digital Ocean Dashboard → Databases → Create Database
   - Choose Redis
   - Select your region and plan
   - Note the connection details

2. **Get Connection String**
   - Copy the connection string from the database dashboard
   - Format: `redis://username:password@host:port`

3. **Set Environment Variable**
   ```bash
   REDIS_URL=redis://username:password@host:port
   ```

## Option 2: Self-Hosted Redis on Droplet

If you prefer to run Redis on your droplet:

### Step 1: Install Redis

```bash
# Update system packages
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server

# Verify Redis is running
sudo systemctl status redis-server
```

### Step 2: Configure Redis

Edit Redis configuration:
```bash
sudo nano /etc/redis/redis.conf
```

**Important settings:**
```conf
# Bind to localhost and your droplet's private IP
bind 127.0.0.1 your_droplet_private_ip

# Set a password (recommended)
requirepass your_strong_password_here

# Enable persistence (optional but recommended)
save 900 1
save 300 10
save 60 10000

# Set max memory (adjust based on your droplet size)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Restart Redis:
```bash
sudo systemctl restart redis-server
```

### Step 3: Configure Firewall

If using UFW:
```bash
# Allow Redis from localhost only (recommended)
sudo ufw allow from 127.0.0.1 to any port 6379

# Or allow from specific IPs if needed
sudo ufw allow from your_app_server_ip to any port 6379
```

### Step 4: Test Redis Connection

```bash
# Connect to Redis
redis-cli

# If password is set:
redis-cli -a your_password

# Test connection
PING
# Should return: PONG

# Test set/get
SET test "Hello"
GET test
# Should return: "Hello"
```

### Step 5: Set Environment Variables

Add to your `.env` file:

```env
# Option A: Using connection string
REDIS_URL=redis://:your_password@localhost:6379

# Option B: Using individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## Option 3: Docker Redis (Alternative)

If you're using Docker:

```bash
# Run Redis container
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --requirepass your_password

# Set environment variable
REDIS_URL=redis://:your_password@localhost:6379
```

## Security Best Practices

1. **Use Strong Password**
   - Generate a strong password: `openssl rand -base64 32`
   - Store in environment variables, never commit to git

2. **Restrict Network Access**
   - Only allow connections from your application server
   - Use firewall rules to restrict access
   - Consider using private networking on Digital Ocean

3. **Enable TLS (Optional but Recommended)**
   ```bash
   # In redis.conf
   port 0
   tls-port 6380
   tls-cert-file /path/to/cert.pem
   tls-key-file /path/to/key.pem
   tls-ca-cert-file /path/to/ca.pem
   ```

4. **Regular Backups**
   ```bash
   # Manual backup
   redis-cli --rdb /backup/redis-$(date +%Y%m%d).rdb
   
   # Or use Redis persistence (RDB/AOF)
   ```

## Monitoring Redis

### Check Redis Status
```bash
redis-cli INFO
```

### Monitor Commands
```bash
redis-cli MONITOR
```

### Check Memory Usage
```bash
redis-cli INFO memory
```

### Check Connected Clients
```bash
redis-cli CLIENT LIST
```

## Troubleshooting

### Redis Not Starting
```bash
# Check logs
sudo journalctl -u redis-server

# Check if port is in use
sudo netstat -tulpn | grep 6379
```

### Connection Refused
- Check Redis is running: `sudo systemctl status redis-server`
- Check firewall rules
- Verify host/port in environment variables
- Check Redis bind configuration

### Authentication Failed
- Verify password in environment variables
- Check Redis password configuration: `redis-cli CONFIG GET requirepass`

### High Memory Usage
- Check current memory: `redis-cli INFO memory`
- Review maxmemory policy
- Consider increasing droplet memory or using managed Redis

## Application Configuration

After setting up Redis, update your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://:password@localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

The application will automatically:
1. Try to connect to Redis
2. Use Redis for distributed rate limiting
3. Fall back to in-memory rate limiting if Redis is unavailable

## Testing Redis Connection

Test from your application:

```bash
# In Node.js/TypeScript
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});
redis.ping().then(() => console.log('Connected!')).catch(err => console.error('Error:', err));
"
```

## Production Recommendations

1. **Use Managed Redis** for production (better reliability, backups, monitoring)
2. **Set up monitoring** (Digital Ocean provides metrics for managed Redis)
3. **Configure alerts** for memory usage and connection issues
4. **Regular backups** if using self-hosted Redis
5. **Use private networking** if available on Digital Ocean
6. **Enable persistence** for important data (though rate limits are ephemeral)

## Cost Considerations

- **Managed Redis**: Starts at ~$15/month (1GB RAM)
- **Self-Hosted**: Included with your droplet (uses droplet resources)
- **Docker**: Included with your droplet

For MVP, self-hosted Redis on your droplet is sufficient. Upgrade to managed Redis as you scale.


