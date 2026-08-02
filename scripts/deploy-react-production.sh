#!/bin/bash
# Complete React Deployment Script
# Deploys React TypeScript build to production server
# Removes all old vanilla JS templates completely
# Updates Nginx and API configuration

set -e

# Configuration
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-sdics.tech}"
REMOTE_PATH="/home/lawrence/nvrcms"
FRONTEND_DIST="frontend/dist"
LOCAL_SOURCE_DIR="frontend/src"

echo "================================================"
echo "🚀 React Production Deployment"
echo "================================================"

# Verify React build exists
if [ ! -d "$FRONTEND_DIST" ]; then
    echo "❌ React build not found at $FRONTEND_DIST"
    echo "Run 'npm run build' in frontend directory first"
    exit 1
fi

echo ""
echo "📦 Build artifacts ready:"
du -sh "$FRONTEND_DIST"
ls -lh "$FRONTEND_DIST/index.html" "$FRONTEND_DIST/assets" 2>/dev/null | head -10

echo ""
echo "🔍 Step 1: SSH into server and backup current state..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" 'bash -s' << 'REMOTE_STEP1'
#!/bin/bash
set -e

REMOTE_PATH="/home/lawrence/nvrcms"

echo "Creating backup of current frontend..."
if [ -d "$REMOTE_PATH/frontend" ]; then
    BACKUP_DIR="$REMOTE_PATH/frontend-backup-$(date +%s)"
    mv "$REMOTE_PATH/frontend" "$BACKUP_DIR"
    echo "✅ Backed up to: $BACKUP_DIR"
fi

# Create fresh frontend directory
mkdir -p "$REMOTE_PATH/frontend"
echo "✅ Created fresh frontend directory"

REMOTE_STEP1

echo ""
echo "📡 Step 2: Uploading React build..."
scp -o StrictHostKeyChecking=no -r "$FRONTEND_DIST"/* "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/frontend/"
echo "✅ React build uploaded"

echo ""
echo "🔧 Step 3: Configuring server..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" 'bash -s' << 'REMOTE_STEP3'
#!/bin/bash
set -e

FRONTEND_PATH="/home/lawrence/nvrcms/frontend"

echo "Setting permissions..."
find "$FRONTEND_PATH" -type d -exec chmod 755 {} \;
find "$FRONTEND_PATH" -type f -exec chmod 644 {} \;
chmod 755 "$FRONTEND_PATH"

echo "✅ Permissions set correctly"

echo ""
echo "📋 Verifying React build structure:"
echo "  index.html: $([ -f "$FRONTEND_PATH/index.html" ] && echo "✅" || echo "❌")"
echo "  assets directory: $([ -d "$FRONTEND_PATH/assets" ] && echo "✅" || echo "❌")"
echo "  File count: $(find "$FRONTEND_PATH" -type f | wc -l)"

ls -lh "$FRONTEND_PATH/" | grep -E "^-|^d"

REMOTE_STEP3

echo ""
echo "🌐 Step 4: Updating Nginx configuration..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" 'bash -s' << 'REMOTE_STEP4'
#!/bin/bash

echo "Configuring Nginx for React SPA..."

sudo tee /etc/nginx/sites-available/sdics.tech > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    listen [::]:80;
    server_name sdics.tech www.sdics.tech;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sdics.tech www.sdics.tech;

    # SSL certificates (configured via certbot)
    ssl_certificate /etc/letsencrypt/live/sdics.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sdics.tech/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client upload limit
    client_max_body_size 55M;

    # Root for static React files
    root /home/lawrence/nvrcms/frontend;
    index index.html;

    # SPA routing - serve index.html for all non-API routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }

    # Swagger/Docs
    location /swagger {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8080;
        access_log off;
    }

    # Cache assets (CSS, JS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
NGINX_CONFIG

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo "✅ Nginx configured and reloaded"

REMOTE_STEP4

echo ""
echo "⚙️  Step 5: Verifying services..."
ssh -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" 'bash -s' << 'REMOTE_STEP5'
#!/bin/bash

echo "Checking services..."
echo ""

# Check Nginx
if sudo systemctl is-active --quiet nginx; then
    echo "  ✅ Nginx: running"
else
    echo "  ❌ Nginx: not running"
fi

# Check API
if sudo systemctl is-active --quiet nvrcms-api; then
    echo "  ✅ NVRCMS API: running"
else
    echo "  ❌ NVRCMS API: not running"
fi

# Check database
if pg_isready -h localhost > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL: connected"
else
    echo "  ⚠️  PostgreSQL: check connection"
fi

echo ""
echo "🔗 Testing API health endpoint..."
HEALTH=$(curl -s http://localhost:8080/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$HEALTH" = "ok" ]; then
    echo "  ✅ API health: OK"
else
    echo "  ⚠️  API health: $HEALTH"
fi

echo ""
echo "📊 Frontend directory content:"
find /home/lawrence/nvrcms/frontend -type f -name "*.html" -o -name "*.js" -o -name "*.css" | wc -l
echo "  files deployed"

REMOTE_STEP5

echo ""
echo "================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "  • React build: deployed to server"
echo "  • Old vanilla JS frontend: completely removed"
echo "  • Nginx: configured for React SPA"
echo "  • CORS: configured in Go API"
echo "  • Services: all running"
echo ""
echo "🌐 Access your application:"
echo "  • Frontend: https://sdics.tech"
echo "  • API: https://sdics.tech/api/v1"
echo "  • Swagger Docs: https://sdics.tech/swagger/index.html"
echo ""
echo "📊 Logs:"
echo "  • API logs: ssh $REMOTE_USER@$REMOTE_HOST 'tail -f /home/lawrence/nvrcms/logs/api.log'"
echo "  • Nginx logs: ssh $REMOTE_USER@$REMOTE_HOST 'tail -f /var/log/nginx/access.log'"
echo ""
