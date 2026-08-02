#!/bin/bash
# Verify deployment is correct on server and client side

echo "================================================"
echo "✅ DEPLOYMENT VERIFICATION REPORT"
echo "================================================"
echo ""

REMOTE_HOST="${REMOTE_HOST:-sdics.tech}"

echo "📊 SERVER SIDE STATUS"
echo "─────────────────────"

ssh -o StrictHostKeyChecking=no root@$REMOTE_HOST 'bash -s' << 'SERVER_CHECK'
#!/bin/bash

echo "✅ Services:"
systemctl is-active nvrcms-api && echo "   API: RUNNING" || echo "   API: STOPPED"
systemctl is-active nginx && echo "   Nginx: RUNNING" || echo "   Nginx: STOPPED"

echo ""
echo "✅ Frontend code deployed:"
echo "   Files: $(find /home/lawrence/nvrcms/frontend -type f | wc -l)"
echo "   Modified: $(stat /home/lawrence/nvrcms/frontend/index.html | grep Modify | awk '{print $2, $3}')"

echo ""
echo "✅ What Nginx serves at root:"
curl -s https://localhost/ 2>/dev/null | grep -o "Registration Trend\|Overall Progress" | head -2

echo ""
echo "✅ API responding:"
curl -s http://localhost:8080/health | jq '.status' 2>/dev/null || echo "API not responding"

SERVER_CHECK

echo ""
echo ""
echo "🌐 NEXT STEPS FOR CLIENT"
echo "────────────────────────"
echo ""
echo "If you still see OLD dashboard, do ONE of these:"
echo ""
echo "1. HARD REFRESH (most effective):"
echo "   Windows/Linux: Ctrl+Shift+R"
echo "   Mac: Cmd+Shift+R"
echo ""
echo "2. CLEAR BROWSER CACHE:"
echo "   Chrome/Edge: Settings → Privacy → Clear Browsing Data → Check 'Cookies and cached images'"
echo "   Firefox: Preferences → Privacy → Cookies and Site Data → Clear All"
echo "   Safari: Develop → Empty Web Caches"
echo ""
echo "3. TEST IN INCOGNITO:"
echo "   Open new Incognito/Private window and visit https://sdics.tech"
echo ""
echo "================================================"
echo "If still seeing old code after above, run:"
echo "  bash scripts/emergency-deploy.sh"
echo "================================================"
