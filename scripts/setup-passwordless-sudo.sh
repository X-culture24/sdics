#!/bin/bash
# Setup passwordless sudo for lawrence user
# Run this ONCE on the server as root: sudo bash -s < scripts/setup-passwordless-sudo.sh

echo "Setting up passwordless sudo for lawrence..."

# Add lawrence to sudoers with no password required for systemctl
echo "lawrence ALL=(ALL) NOPASSWD: /bin/systemctl" | sudo EDITOR=tee visudo -f /etc/sudoers.d/lawrence-systemctl

echo "Passwordless sudo configured for lawrence user (systemctl only)"
echo "Testing..."
sudo -u lawrence sudo systemctl status nvrcms-api --no-pager | head -3
