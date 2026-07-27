#!/bin/bash
# This script configures nginx for the React frontend
# Run as: bash configure-nginx.sh

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

echo "✅ Nginx configured successfully"
