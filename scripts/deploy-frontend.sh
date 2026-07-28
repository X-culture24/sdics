#!/bin/bash

# Frontend Deployment Script via SSH
# Usage: ./scripts/deploy-frontend.sh

set -e

# Configuration
REMOTE_USER="${DO_USER:-lawrence}"
REMOTE_HOST="${DO_HOST:-sdics.tech}"
REMOTE_PATH="~/nvrcms/frontend"
LOCAL_FRONTEND="frontend"
SSH_KEY="${SSH_KEY_PATH:~/.ssh/deploy_key}"

echo "🚀 Starting frontend deployment..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    exit 1
fi

# Create temporary directory for deployment
DEPLOY_DIR=$(mktemp -d)
trap "rm -rf $DEPLOY_DIR" EXIT

echo "📦 Preparing files..."

# Copy only necessary files (exclude node_modules, dist, etc)
mkdir -p "$DEPLOY_DIR/frontend"
cp -r "$LOCAL_FRONTEND"/{login.html,app.html,dashboard.html,index.html,package.json} "$DEPLOY_DIR/frontend/" 2>/dev/null || true
cp -r "$LOCAL_FRONTEND"/css "$DEPLOY_DIR/frontend/" 2>/dev/null || true
cp -r "$LOCAL_FRONTEND"/js "$DEPLOY_DIR/frontend/" 2>/dev/null || true
cp -r "$LOCAL_FRONTEND"/styles "$DEPLOY_DIR/frontend/" 2>/dev/null || true

echo "📡 Uploading to server..."

# Create backup on remote
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$REMOTE_USER@$REMOTE_HOST" \
    "cd $REMOTE_PATH && tar -czf frontend-backup-$(date +%s).tar.gz . || true"

# Upload files via SCP
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -r \
    "$DEPLOY_DIR/frontend"/* \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

echo "✅ Files uploaded successfully"

# Set proper permissions
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$REMOTE_USER@$REMOTE_HOST" \
    "cd $REMOTE_PATH && chmod -R 755 . && chmod 644 *.html *.json"

echo "🔧 Setting permissions..."

# Verify deployment
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$REMOTE_USER@$REMOTE_HOST" \
    "ls -lh $REMOTE_PATH/ | head -20 && echo '✅ Deployment verified'"

echo ""
echo "🎉 Frontend deployment complete!"
echo "🌐 Access at: https://sdics.tech"
