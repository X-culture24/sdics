#!/bin/bash
# Deploy React build and API binary using SSH
# Usage: bash scripts/deploy-with-ssh.sh
# Requires: SSH access to root@206.81.28.246

set -e

REMOTE_HOST="206.81.28.246"
REMOTE_USER="root"
REMOTE_PATH="/home/lawrence/nvrcms"

echo "================================================"
echo "🚀 Deploying React Build + API Binary via SSH"
echo "================================================"
echo ""

# Verify build exists
if [ ! -d "frontend/dist" ]; then
    echo "❌ Error: frontend/dist not found"
    echo "Run: npm run build (in frontend directory)"
    exit 1
fi

if [ ! -f "bin/nvrcms-api" ]; then
    echo "❌ Error: bin/nvrcms-api not found"
    echo "Run: go build -o bin/nvrcms-api ./cmd/api"
    exit 1
fi

echo "✅ Build artifacts verified"
echo ""

# Step 1: Backup and prepare remote
echo "📋 Step 1: Preparing remote server..."
ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_PREPARE'
#!/bin/bash
set -e

REMOTE_PATH="/home/lawrence/nvrcms"

echo "Creating backup of current state..."
if [ -d "$REMOTE_PATH/frontend" ]; then
    BACKUP_TIME=$(date +%s)
    mv "$REMOTE_PATH/frontend" "$REMOTE_PATH/frontend-backup-$BACKUP_TIME"
    echo "  ✅ Frontend backed up: frontend-backup-$BACKUP_TIME"
fi

if [ -f "$REMOTE_PATH/bin/nvrcms-api" ]; then
    BACKUP_TIME=$(date +%s)
    cp "$REMOTE_PATH/bin/nvrcms-api" "$REMOTE_PATH/bin/nvrcms-api.backup-$BACKUP_TIME"
    echo "  ✅ API binary backed up: nvrcms-api.backup-$BACKUP_TIME"
fi

echo "Stopping nvrcms-api service..."
systemctl stop nvrcms-api || true
sleep 1

echo "Creating fresh directories..."
mkdir -p "$REMOTE_PATH/frontend"
mkdir -p "$REMOTE_PATH/bin"

echo "✅ Remote prepared"
REMOTE_PREPARE

echo ""
echo "📡 Step 2: Uploading API binary..."
scp -o StrictHostKeyChecking=no bin/nvrcms-api "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/bin/nvrcms-api"
echo "✅ Binary uploaded"

echo ""
echo "📦 Step 3: Uploading React frontend build..."
scp -o StrictHostKeyChecking=no -r frontend/dist/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/frontend/"
echo "✅ Frontend uploaded"

echo ""
echo "🔧 Step 4: Configuring permissions and starting services..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_CONFIGURE'
#!/bin/bash
set -e

REMOTE_PATH="/home/lawrence/nvrcms"

echo "Setting permissions..."
chmod 755 "$REMOTE_PATH/bin/nvrcms-api"
chown lawrence:lawrence "$REMOTE_PATH/bin/nvrcms-api"

chmod -R 755 "$REMOTE_PATH/frontend"
find "$REMOTE_PATH/frontend" -type f -exec chmod 644 {} \;

echo "✅ Permissions set"

echo ""
echo "Restarting nvrcms-api service..."
systemctl start nvrcms-api
sleep 3

echo ""
echo "📊 Verifying deployment..."

# Check if API is responding
if curl -s http://localhost:8080/health | grep -q '"status":"ok"'; then
    echo "  ✅ API is healthy"
else
    echo "  ⚠️  Waiting for API to be ready..."
    sleep 3
fi

# Verify frontend files
FRONTEND_FILES=$(find "$REMOTE_PATH/frontend" -type f | wc -l)
echo "  ✅ Frontend files deployed: $FRONTEND_FILES"

# Show service status
echo ""
echo "Service status:"
systemctl status nvrcms-api --no-pager | head -8

REMOTE_CONFIGURE

echo ""
echo "🌐 Step 5: Verifying Nginx configuration..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'REMOTE_NGINX'
#!/bin/bash

echo "Testing Nginx configuration..."
nginx -t

echo ""
echo "Reloading Nginx..."
systemctl reload nginx

echo "✅ Nginx configured"

REMOTE_NGINX

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "📋 Deployed:"
echo "  • API Binary: $(basename bin/nvrcms-api)"
echo "  • React Build: frontend/dist"
echo "  • Server: 206.81.28.246"
echo ""
echo "🌐 Access application:"
echo "  • https://sdics.tech"
echo "  • API: https://sdics.tech/api/v1"
echo "  • Swagger: https://sdics.tech/swagger/index.html"
echo ""
echo "📊 Check logs:"
echo "  ssh root@206.81.28.246 'tail -f /home/lawrence/nvrcms/logs/api.log'"
echo ""
