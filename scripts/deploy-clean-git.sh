#!/bin/bash
# Clean deployment using git clone
# Deletes everything on server and does fresh clone + build
# Usage: bash scripts/deploy-clean-git.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REMOTE_HOST="${REMOTE_HOST:-sdics.tech}"
REMOTE_USER="${REMOTE_USER:-root}"
DEPLOY_DIR="/home/lawrence/nvrcms"
GIT_REPO="https://github.com/X-culture24/sdics.git"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}🔄 CLEAN GIT-BASED DEPLOYMENT${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""
echo "Repository: $GIT_REPO"
echo "Branch: $GIT_BRANCH"
echo "Server: $REMOTE_HOST"
echo "Deploy Dir: $DEPLOY_DIR"
echo ""

# Confirm with user
read -p "⚠️  This will DELETE everything in $DEPLOY_DIR. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/6]${NC} Backing up current deployment..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << 'BACKUP'
#!/bin/bash
set -e
DEPLOY_DIR="/home/lawrence/nvrcms"
BACKUP_DIR="/home/lawrence/nvrcms-backup-$(date +%s)"

if [ -d "$DEPLOY_DIR" ]; then
    echo "  Backing up to: $BACKUP_DIR"
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
    echo "  ✅ Backup complete"
    
    echo "  Stopping services..."
    systemctl stop nvrcms-api || true
    sleep 1
    
    echo "  Removing old deployment..."
    rm -rf "$DEPLOY_DIR"
    echo "  ✅ Cleaned"
else
    echo "  ℹ️  No existing deployment found"
fi
BACKUP

echo ""
echo -e "${YELLOW}[2/6]${NC} Cloning repository on server..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << CLONE
#!/bin/bash
set -e
DEPLOY_DIR="$DEPLOY_DIR"
GIT_REPO="$GIT_REPO"
GIT_BRANCH="$GIT_BRANCH"

echo "  Cloning $GIT_REPO (branch: $GIT_BRANCH)..."
git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$DEPLOY_DIR"
echo "  ✅ Repository cloned"

echo "  Repository size: \$(du -sh "$DEPLOY_DIR" | awk '{print \$1}')"
CLONE

echo ""
echo -e "${YELLOW}[3/6]${NC} Building Go API binary on server..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << BUILD_GO
#!/bin/bash
set -e
cd $DEPLOY_DIR

echo "  Installing Go dependencies..."
go mod download 2>&1 | tail -3

echo "  Building API binary (linux/amd64)..."
GOOS=linux GOARCH=amd64 go build -o bin/nvrcms-api ./cmd/api

if [ -f "bin/nvrcms-api" ]; then
    SIZE=\$(ls -lh bin/nvrcms-api | awk '{print \$5}')
    echo "  ✅ Binary built: \$SIZE"
else
    echo "  ❌ Build failed"
    exit 1
fi
BUILD_GO

echo ""
echo -e "${YELLOW}[4/6]${NC} Building React frontend on server..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << BUILD_REACT
#!/bin/bash
set -e
cd $DEPLOY_DIR/frontend

echo "  Installing Node dependencies..."
npm install --legacy-peer-deps 2>&1 | tail -3

echo "  Building React app..."
npm run build 2>&1 | tail -5

if [ -d "dist" ]; then
    FILES=\$(find dist -type f | wc -l)
    echo "  ✅ Frontend built: \$FILES files"
else
    echo "  ❌ Build failed"
    exit 1
fi
BUILD_REACT

echo ""
echo -e "${YELLOW}[5/6]${NC} Configuring and starting services..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << CONFIG
#!/bin/bash
set -e
DEPLOY_DIR="$DEPLOY_DIR"

cd "\$DEPLOY_DIR"

# Create necessary directories
mkdir -p bin logs uploads datasets

# Set permissions
chmod 755 bin/nvrcms-api
chown lawrence:lawrence bin/nvrcms-api
chown -R lawrence:lawrence logs uploads

# Ensure .env exists
if [ ! -f .env ]; then
    echo "  ⚠️  .env not found, copying from .env.example"
    cp .env.example .env
fi

# Configure Nginx
echo "  Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sdics.tech > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    listen [::]:80;
    server_name sdics.tech www.sdics.tech;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sdics.tech www.sdics.tech;

    ssl_certificate /etc/letsencrypt/live/sdics.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sdics.tech/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    client_max_body_size 55M;
    root $DEPLOY_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400s;
    }

    location /swagger {
        proxy_pass http://127.0.0.1:8080;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
        access_log off;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
NGINX_CONFIG

sudo nginx -t && echo "  ✅ Nginx configured"

# Create systemd service
echo "  Creating systemd service..."
sudo tee /etc/systemd/system/nvrcms-api.service > /dev/null << 'SERVICE_CONFIG'
[Unit]
Description=NVRCMS API Server
After=network.target postgresql.service

[Service]
Type=simple
User=lawrence
WorkingDirectory=$DEPLOY_DIR
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/bin/nvrcms-api
Restart=always
RestartSec=5
StandardOutput=append:$DEPLOY_DIR/logs/api.log
StandardError=append:$DEPLOY_DIR/logs/api-error.log

[Install]
WantedBy=multi-user.target
SERVICE_CONFIG

sudo systemctl daemon-reload

# Start services
echo "  Starting API service..."
sudo systemctl start nvrcms-api
sleep 3

if sudo systemctl is-active --quiet nvrcms-api; then
    echo "  ✅ API started"
else
    echo "  ❌ API failed to start"
    sudo journalctl -u nvrcms-api -n 20
    exit 1
fi

echo "  Reloading Nginx..."
sudo systemctl reload nginx
echo "  ✅ Nginx reloaded"

CONFIG

echo ""
echo -e "${YELLOW}[6/6]${NC} Verifying deployment..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" << VERIFY
#!/bin/bash

echo "  Services:"
systemctl is-active nvrcms-api > /dev/null && echo "    ✅ API running" || echo "    ❌ API not running"
systemctl is-active nginx > /dev/null && echo "    ✅ Nginx running" || echo "    ❌ Nginx not running"

echo ""
echo "  API Health:"
HEALTH=\$(curl -s http://localhost:8080/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "error")
echo "    Status: \$HEALTH"

echo ""
echo "  Frontend:"
if [ -f "$DEPLOY_DIR/frontend/dist/index.html" ]; then
    FILES=\$(find "$DEPLOY_DIR/frontend/dist" -type f | wc -l)
    echo "    ✅ React SPA deployed (\$FILES files)"
else
    echo "    ❌ Frontend not deployed"
fi

VERIFY

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ CLEAN DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "🌐 Your app is now live:"
echo "  • Frontend: https://sdics.tech"
echo "  • API: https://sdics.tech/api/v1"
echo "  • Swagger: https://sdics.tech/swagger/index.html"
echo ""
echo "📊 Check status:"
echo "  ssh root@sdics.tech systemctl status nvrcms-api"
echo ""
echo "📖 View logs:"
echo "  ssh root@sdics.tech tail -50 /home/lawrence/nvrcms/logs/api.log"
echo ""
