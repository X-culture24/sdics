#!/bin/bash
# Frontend debugging script - run on server to diagnose flashing/crashing issues

set -e

echo "═══════════════════════════════════════════════════════════"
echo "NVRCMS Frontend Debugging Script"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Check if API is running and responding
echo "1️⃣  Checking API Health..."
if curl -s http://localhost:8080/health | jq . 2>/dev/null; then
    echo "✅ API is running"
else
    echo "❌ API is NOT responding at localhost:8080"
    echo "   Checking service status..."
    sudo systemctl status nvrcms-api --no-pager || true
fi
echo ""

# 2. Check frontend files
echo "2️⃣  Checking Frontend Files..."
if [ -f ~/nvrcms/frontend/index.html ]; then
    echo "✅ index.html exists"
    echo "   Size: $(stat -c%s ~/nvrcms/frontend/index.html) bytes"
else
    echo "❌ index.html NOT found"
fi

if [ -f ~/nvrcms/frontend/js/app.js ]; then
    echo "✅ app.js exists"
    echo "   Size: $(stat -c%s ~/nvrcms/frontend/js/app.js) bytes"
else
    echo "❌ app.js NOT found"
fi

if [ -d ~/nvrcms/frontend/js/pages ]; then
    echo "✅ Pages directory exists"
    echo "   Pages: $(ls -1 ~/nvrcms/frontend/js/pages/ | wc -l) files"
    ls -1 ~/nvrcms/frontend/js/pages/
else
    echo "❌ Pages directory NOT found"
fi
echo ""

# 3. Check Nginx configuration
echo "3️⃣  Checking Nginx Configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx config is valid"
else
    echo "⚠️  Nginx config issues:"
    sudo nginx -t 2>&1 || true
fi
echo ""

# 4. Check API logs for errors
echo "4️⃣  Checking API Logs (last 20 lines)..."
if [ -f ~/nvrcms/logs/nvrcms.log ]; then
    echo "📋 Application Log:"
    tail -20 ~/nvrcms/logs/nvrcms.log
else
    echo "ℹ️  No application log found, checking systemd journal..."
    sudo journalctl -u nvrcms-api -n 20 --no-pager 2>/dev/null || echo "   (Run with sudo to see logs)"
fi
echo ""

# 5. Check frontend for common issues
echo "5️⃣  Analyzing Frontend Code..."
echo "Checking app.js for issues:"
grep -n "navigateToPage\|hideLoading\|showLoading" ~/nvrcms/frontend/js/app.js | head -10

echo ""
echo "Checking for async/await on page init:"
grep -n "await init" ~/nvrcms/frontend/js/app.js || echo "   ⚠️  No 'await init' found"
echo ""

# 6. Check CSS for blinking animations
echo "6️⃣  Checking CSS for animations that might cause flashing..."
grep -n "animation\|@keyframes\|blink" ~/nvrcms/frontend/css/*.css ~/nvrcms/frontend/styles/*.css 2>/dev/null || echo "   ✅ No problematic animations found"
echo ""

# 7. Test API endpoints
echo "7️⃣  Testing API Endpoints..."
echo "Testing /health endpoint:"
curl -s -w "\nStatus: %{http_code}\n" http://localhost:8080/health | head -5

echo ""
echo "Testing /api/v1/ping (should return 401 without token):"
curl -s -w "\nStatus: %{http_code}\n" http://localhost:8080/api/v1/ping | head -3

echo ""

# 8. Check for CORS issues
echo "8️⃣  Checking CORS Configuration..."
curl -s -I -H "Origin: http://localhost:3000" http://localhost:8080/api/v1/ping | grep -i "access-control" || echo "   ⚠️  CORS headers not found"
echo ""

# 9. Check database connection
echo "9️⃣  Checking Database Connection..."
if sudo systemctl is-active --quiet postgres; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is NOT running"
fi
echo ""

# 10. Summary
echo "═══════════════════════════════════════════════════════════"
echo "🔍 Debugging Complete"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Check browser console for JavaScript errors:"
echo "   - F12 → Console tab"
echo "   - Look for red error messages"
echo ""
echo "2. Check Network tab:"
echo "   - F12 → Network tab"
echo "   - Look for failed requests (red status codes)"
echo ""
echo "3. Check this script output above for ❌ issues"
echo ""
