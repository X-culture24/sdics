#!/bin/bash

# NVRCMS Frontend Deployment Script
# Deploy to production server with all frontend assets

SERVER_USER="root"
SERVER_IP="sdics.tech"
REMOTE_PATH="/home/nvrcms/frontend"

echo "🚀 Deploying NVRCMS frontend to $SERVER_IP..."
echo "📦 Copying frontend files..."

# Create remote directory if it doesn't exist
ssh -i ~/.ssh/id_rsa "$SERVER_USER@$SERVER_IP" "mkdir -p $REMOTE_PATH"

# Deploy HTML files
scp -i ~/.ssh/id_rsa frontend/app.html "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/index.html"
scp -i ~/.ssh/id_rsa frontend/login.html "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"
scp -i ~/.ssh/id_rsa frontend/error.html "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo "📁 Copying CSS files..."
scp -i ~/.ssh/id_rsa -r frontend/css "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo "🔧 Copying JavaScript files..."
scp -i ~/.ssh/id_rsa -r frontend/js "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/"

echo "🌐 Copying styles..."
scp -i ~/.ssh/id_rsa -r frontend/styles "$SERVER_USER@$SERVER_IP:$REMOTE_PATH/" 2>/dev/null || true

echo "🔨 Organizing remote files..."
ssh -i ~/.ssh/id_rsa "$SERVER_USER@$SERVER_IP" << 'EOF'
#!/bin/bash
FRONTEND="/home/nvrcms/frontend"

echo "Cleaning up old files..."
cd $FRONTEND

# Remove development/build files
rm -f dashboard.html index-simple.html index-new.html *.ts *.jsx *.tsx 2>/dev/null
rm -f *.map *.lock *.json 2>/dev/null
rm -rf src node_modules dist 2>/dev/null

# Set proper permissions
chmod 644 *.html 2>/dev/null
chmod 644 css/*.css 2>/dev/null
chmod 644 js/*.js 2>/dev/null
chmod 644 js/api/*.js 2>/dev/null
chmod 644 js/components/*.js 2>/dev/null
chmod 644 js/middleware/*.js 2>/dev/null
chmod 644 js/pages/*.js 2>/dev/null
chmod 644 js/services/*.js 2>/dev/null
chmod 644 js/utils/*.js 2>/dev/null
chmod 755 css js js/api js/components js/middleware js/pages js/services js/utils 2>/dev/null

echo "🔄 Reloading web server..."
sudo systemctl reload nginx

echo "✅ Frontend deployment complete!"
echo "🌐 Access dashboard at: https://sdics.tech"
echo "🔐 Login page at: https://sdics.tech/login.html"
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Access the dashboard:"
    echo "   • Dashboard: https://sdics.tech"
    echo "   • Login: https://sdics.tech/login.html"
    echo ""
else
    echo "❌ Deployment failed. Check your SSH connection and credentials."
    exit 1
fi
