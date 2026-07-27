#!/bin/bash
# Run this ONCE on the DigitalOcean droplet as root
# ssh root@206.81.28.246 "bash -s" < scripts/server-setup.sh

set -e

echo "==> Updating system packages..."
apt-get update -y && apt-get upgrade -y

echo "==> Installing dependencies..."
apt-get install -y curl wget git unzip nginx certbot python3-certbot-nginx postgresql postgresql-contrib

echo "==> Installing Go 1.22..."
wget -q https://go.dev/dl/go1.22.2.linux-amd64.tar.gz -O /tmp/go.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf /tmp/go.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
export PATH=$PATH:/usr/local/go/bin

echo "==> Installing golang-migrate..."
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.17.1/migrate.linux-amd64.tar.gz | tar xvz
mv migrate /usr/local/bin/migrate

echo "==> Creating system user 'lawrence' if not exists..."
id -u lawrence &>/dev/null || useradd -m -s /bin/bash lawrence

echo "==> Setting up PostgreSQL..."
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='sdic_agent'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER sdic_agent WITH PASSWORD 'James_Bond007!';"
sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='sdic'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE sdic OWNER sdic_agent;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sdic TO sdic_agent;"

echo "==> Creating app directory..."
mkdir -p /home/lawrence/nvrcms/{bin,frontend,migrations,uploads,logs}
chown -R lawrence:lawrence /home/lawrence/nvrcms

echo "==> Writing .env file..."
cat > /home/lawrence/nvrcms/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sdic
DB_USER=sdic_agent
DB_PASSWORD=James_Bond007!
DB_SSLMODE=disable
JWT_SECRET=nvrcms_jwt_secret_change_in_production_32x
JWT_EXPIRY_MINUTES=15
REFRESH_SECRET=nvrcms_refresh_secret_change_in_prod_32x
REFRESH_EXPIRY_DAYS=7
PORT=8080
ENV=production
ALLOWED_ORIGINS=https://sdics.tech,https://www.sdics.tech
RATE_LIMIT_UNAUTH=20
RATE_LIMIT_AUTH=100
UPLOAD_DIR=/home/lawrence/nvrcms/uploads
MAX_UPLOAD_MB=50
EOF
chown lawrence:lawrence /home/lawrence/nvrcms/.env
chmod 600 /home/lawrence/nvrcms/.env

echo "==> Creating systemd service..."
cat > /etc/systemd/system/nvrcms-api.service << 'EOF'
[Unit]
Description=NVRCMS API Server
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=lawrence
WorkingDirectory=/home/lawrence/nvrcms
EnvironmentFile=/home/lawrence/nvrcms/.env
ExecStart=/home/lawrence/nvrcms/bin/nvrcms-api
Restart=always
RestartSec=5
StandardOutput=append:/home/lawrence/nvrcms/logs/api.log
StandardError=append:/home/lawrence/nvrcms/logs/api-error.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nvrcms-api

echo "==> Configuring Nginx for sdics.tech..."
cat > /etc/nginx/sites-available/sdics.tech << 'EOF'
server {
    listen 80;
    server_name sdics.tech www.sdics.tech;

    # Frontend - serve React build
    location / {
        root /home/lawrence/nvrcms/frontend;
        index index.html;
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

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # Swagger docs
    location /api/docs/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }

    # File uploads limit
    client_max_body_size 55M;
}
EOF

ln -sf /etc/nginx/sites-available/sdics.tech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo "==> Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Point sdics.tech DNS A record → 206.81.28.246"
echo "  2. Run: certbot --nginx -d sdics.tech -d www.sdics.tech"
echo "  3. Add DO_SSH_KEY secret to GitHub repo"
echo "  4. Push to main branch — GitHub Actions will deploy automatically"
