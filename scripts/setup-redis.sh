#!/bin/bash

# Redis Setup Script for Digital Ocean Droplet
# This script helps set up Redis for rate limiting

set -e

echo "🚀 Setting up Redis for CodeForce Platform..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update

# Install Redis
echo "📥 Installing Redis..."
apt install -y redis-server

# Configure Redis
echo "⚙️  Configuring Redis..."

# Backup original config
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Generate strong password
REDIS_PASSWORD=$(openssl rand -base64 32)
echo "Generated Redis password: $REDIS_PASSWORD"
echo "⚠️  SAVE THIS PASSWORD - Add it to your .env file as REDIS_PASSWORD"

# Update Redis config
sed -i "s/# requirepass foobared/requirepass $REDIS_PASSWORD/" /etc/redis/redis.conf
sed -i "s/bind 127.0.0.1/bind 127.0.0.1/" /etc/redis/redis.conf

# Set memory limit (adjust based on your droplet size)
# For 1GB droplet, use 256MB for Redis
sed -i "s/# maxmemory <bytes>/maxmemory 256mb/" /etc/redis/redis.conf
sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf

# Enable persistence
sed -i "s/save 900 1/save 900 1/" /etc/redis/redis.conf
sed -i "s/save 300 10/save 300 10/" /etc/redis/redis.conf
sed -i "s/save 60 10000/save 60 10000/" /etc/redis/redis.conf

# Restart Redis
echo "🔄 Restarting Redis..."
systemctl restart redis-server
systemctl enable redis-server

# Test Redis connection
echo "🧪 Testing Redis connection..."
redis-cli -a "$REDIS_PASSWORD" ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is running successfully!"
else
    echo "❌ Redis connection test failed"
    exit 1
fi

# Configure firewall (if UFW is installed)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    ufw allow from 127.0.0.1 to any port 6379
    echo "✅ Firewall configured"
fi

# Display connection information
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Redis Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Add these to your .env file:"
echo ""
echo "REDIS_HOST=localhost"
echo "REDIS_PORT=6379"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "REDIS_DB=0"
echo ""
echo "Or use connection string:"
echo ""
echo "REDIS_URL=redis://:$REDIS_PASSWORD@localhost:6379"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "To test Redis manually:"
echo "  redis-cli -a '$REDIS_PASSWORD' ping"
echo ""
echo "To monitor Redis:"
echo "  redis-cli -a '$REDIS_PASSWORD' monitor"
echo ""




