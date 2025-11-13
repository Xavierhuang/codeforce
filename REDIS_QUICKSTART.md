# Redis Quick Start Guide

## 🚀 Quick Setup on Digital Ocean Droplet

### Option 1: Automated Setup (Recommended)

Run the setup script on your droplet:

```bash
# SSH into your droplet
ssh root@your_droplet_ip

# Download or copy the setup script
# Then run:
sudo bash scripts/setup-redis.sh
```

The script will:
- Install Redis
- Configure security
- Generate a secure password
- Set up firewall rules
- Display connection details

### Option 2: Manual Setup

```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Generate password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Password: $REDIS_PASSWORD"

# Configure Redis
sudo nano /etc/redis/redis.conf
# Add: requirepass YOUR_PASSWORD_HERE
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli -a YOUR_PASSWORD ping
```

## 📝 Environment Variables

Add to your `.env` file:

```env
# Option 1: Connection string (recommended)
REDIS_URL=redis://:your_password@localhost:6379

# Option 2: Individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

## ✅ Verify Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Test Redis connection:**
   ```bash
   node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL || {host: 'localhost', port: 6379, password: process.env.REDIS_PASSWORD}); r.ping().then(() => console.log('✅ Redis connected!')).catch(e => console.error('❌ Error:', e));"
   ```

3. **Start your application:**
   ```bash
   npm run dev
   ```

The app will automatically:
- ✅ Connect to Redis for rate limiting
- ✅ Fall back to in-memory if Redis unavailable
- ✅ Log connection status

## 🔍 Troubleshooting

### Redis not connecting?
- Check Redis is running: `sudo systemctl status redis-server`
- Verify password in `.env` matches Redis config
- Test manually: `redis-cli -a YOUR_PASSWORD ping`

### Rate limiting not working?
- Check application logs for Redis connection errors
- Verify environment variables are loaded
- App will fall back to in-memory rate limiting if Redis fails

### Need help?
See `docs/REDIS_SETUP.md` for detailed documentation.




