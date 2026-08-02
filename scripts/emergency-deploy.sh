#!/bin/bash
# Emergency Deployment Script
# Use this to quickly rebuild and deploy when the server is running old code
# Usage: bash scripts/emergency-deploy.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REMOTE_HOST="${REMOTE_HOST:-sdics.tech}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_PATH="/home/lawrence/nvrcms"

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}🚨 EMERGENCY DEPLOYMENT SCRIPT${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""

# Step 1: Clean old builds
echo -e "${YELLOW}[1/6]${NC} Cleaning old build artifacts..."
rm -rf bin/nvrcms-api
rm -rf frontend/dist
echo -e "${GREEN}✅ Cleaned${NC}"

# Step 2: Build Go binary
echo ""
echo -e "${YELLOW}[2/6]${NC} Building Go API binary (linux/amd64)..."
GOOS=linux GOARCH=amd64 go build -o bin/nvrcms-api ./cmd/api
if [ ! -f "bin/nvrcms-api" ]; then
    echo -e "${RED}❌ Go build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Binary built: $(ls -lh bin/nvrcms-api | awk '{print $5, $9}')${NC}"

# Step 3: Build React
echo ""
echo -e "${YELLOW}[3/6]${NC} Building React frontend..."
cd frontend
npm install --legacy-peer-deps > /dev/null 2>&1 || npm install > /dev/null 2>&1
npm run build
cd ..
if [ ! -d "frontend/dist" ]; then
    echo -e "${RED}❌ React build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ React built: $(find frontend/dist -type f | wc -l) files${NC}"

# Step 4: Pre-flight checks
echo ""
echo -e "${YELLOW}[4/6]${NC} Pre-flight checks..."
echo "  • Go binary executable: $([ -x bin/nvrcms-api ] && echo 'OK' || echo 'FAIL')"
echo "  • React index.html: $([ -f frontend/dist/index.html ] && echo 'OK' || echo 'FAIL')"
echo "  • React assets: $([ -d frontend/dist/assets ] && echo 'OK' || echo 'FAIL')"

# Step 5: Deploy
echo ""
echo -e "${YELLOW}[5/6]${NC} Deploying to $REMOTE_HOST..."

# Backup
echo "  • Creating backups on remote..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'BACKUP_SCRIPT'
#!/bin/bash
set -e
BACKUP_TIME=$(date +%s)
REMOTE_PATH="/home/lawrence/nvrcms"

# Backup current binary
if [ -f "$REMOTE_PATH/bin/nvrcms-api" ]; then
    cp "$REMOTE_PATH/bin/nvrcms-api" "$REMOTE_PATH/bin/nvrcms-api.bak-$BACKUP_TIME"
    echo "    ✓ Binary backed up"
fi

# Backup frontend
if [ -d "$REMOTE_PATH/frontend" ]; then
    mv "$REMOTE_PATH/frontend" "$REMOTE_PATH/frontend-bak-$BACKUP_TIME"
    echo "    ✓ Frontend backed up"
fi

mkdir -p "$REMOTE_PATH/bin" "$REMOTE_PATH/frontend"
BACKUP_SCRIPT

# Deploy binary
echo "  • Uploading binary..."
scp -o StrictHostKeyChecking=no bin/nvrcms-api "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/bin/nvrcms-api"

# Deploy frontend
echo "  • Uploading frontend..."
scp -o StrictHostKeyChecking=no -r frontend/dist/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/frontend/"

# Permissions and restart
echo "  • Configuring on remote..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'RESTART_SCRIPT'
#!/bin/bash
set -e
REMOTE_PATH="/home/lawrence/nvrcms"

# Permissions
chmod 755 "$REMOTE_PATH/bin/nvrcms-api"
chown lawrence:lawrence "$REMOTE_PATH/bin/nvrcms-api"
find "$REMOTE_PATH/frontend" -type d -exec chmod 755 {} \;
find "$REMOTE_PATH/frontend" -type f -exec chmod 644 {} \;

# Stop service
echo "    • Stopping service..."
systemctl stop nvrcms-api || true
sleep 2

# Start service
echo "    • Starting service..."
systemctl start nvrcms-api
sleep 3

# Verify
if systemctl is-active --quiet nvrcms-api; then
    echo "    ✓ Service running"
else
    echo "    ✗ Service failed to start"
    exit 1
fi

# Reload Nginx
echo "    • Reloading Nginx..."
systemctl reload nginx

RESTART_SCRIPT

# Step 6: Verify
echo ""
echo -e "${YELLOW}[6/6]${NC} Verification..."

# Check service
echo -n "  • API service: "
if ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" systemctl is-active --quiet nvrcms-api; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
    exit 1
fi

# Check health endpoint
echo -n "  • Health endpoint: "
HEALTH=$(curl -s -m 5 https://sdics.tech/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "error")
if [ "$HEALTH" = "ok" ]; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Status: $HEALTH${NC}"
fi

# Check frontend
echo -n "  • Frontend: "
FRONTEND=$(curl -s -m 5 https://sdics.tech 2>/dev/null | grep -q "React app" && echo "ok" || echo "unknown")
if [ "$FRONTEND" = "ok" ]; then
    echo -e "${GREEN}✅ Loaded${NC}"
else
    echo -e "${YELLOW}⚠️  Check manually${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ EMERGENCY DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📋 Deployed:"
echo "   • API: $(ls -lh bin/nvrcms-api | awk '{print $5}')"
echo "   • Frontend: $(find frontend/dist -type f | wc -l) files"
echo ""
echo "🌐 Access:"
echo "   • App: https://sdics.tech"
echo "   • API: https://sdics.tech/api/v1"
echo "   • Health: https://sdics.tech/health"
echo ""
echo "📊 Check logs:"
echo "   ssh $REMOTE_USER@$REMOTE_HOST 'tail -50 /home/lawrence/nvrcms/logs/api.log'"
echo ""
