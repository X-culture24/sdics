#!/bin/bash
# Run debug script on server via SSH
# Usage: ./scripts/run-debug-ssh.sh

set -e

# Read deployment secrets
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "Please create .env with:"
    echo "  DO_HOST=your.server.ip"
    echo "  DO_USER=deploy"
    echo "  DO_SSH_KEY_PATH=~/.ssh/deploy_key"
    exit 1
fi

source .env

SSH_KEY="${DO_SSH_KEY_PATH:-~/.ssh/deploy_key}"
HOST="${DO_HOST}"
USER="${DO_USER}"

if [ -z "$HOST" ] || [ -z "$USER" ]; then
    echo "❌ DO_HOST and DO_USER must be set in .env"
    exit 1
fi

echo "🔗 Connecting to $USER@$HOST..."
echo ""

# Copy debug script to server
echo "📋 Copying debug script to server..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    scripts/debug-frontend.sh \
    "$USER@$HOST":~/debug-frontend.sh

# Run debug script
echo ""
echo "🚀 Running debug script on server..."
echo ""
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$USER@$HOST" \
    "chmod +x ~/debug-frontend.sh && ~/debug-frontend.sh"

echo ""
echo "✅ Debug complete. Check output above for issues."
