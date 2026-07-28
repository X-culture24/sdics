#!/bin/bash
# Restart the API service - run on server as: bash scripts/restart-api.sh

echo "Attempting to restart nvrcms-api service..."
echo "Cristiano7!" | sudo -S systemctl restart nvrcms-api

if [ $? -eq 0 ]; then
    sleep 2
    echo "Service restarted successfully. Checking status..."
    systemctl status nvrcms-api --no-pager
else
    echo "Failed to restart service. Trying to start it..."
    echo "Cristiano7!" | sudo -S systemctl start nvrcms-api
    sleep 2
    systemctl status nvrcms-api --no-pager
fi
