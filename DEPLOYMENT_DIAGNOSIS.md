# Deployment Issue Diagnosis & Recovery

## Problem Summary
Your server is running old code. The pipeline is failing, and the deployed files on the server aren't being updated properly.

## Root Causes Identified

### 1. **Build Not Being Generated Locally**
- The GitHub Actions workflow expects:
  - `bin/nvrcms-api` (Go binary) - built via `go build`
  - `frontend/dist/` (React build) - built via `npm run build`
- If these don't exist locally, the SSH deployment fails silently or partially

### 2. **Pipeline Execution Issues**
- GitHub Actions may be failing during build steps
- SSH keys might not be configured correctly
- The workflow could be stopping at any step without clear feedback

### 3. **Server-Side File Permissions & Paths**
- Binary may not have execute permissions
- Nginx may be serving stale cached files
- React frontend files might be in wrong location
- API still pointing to old build location

### 4. **Service Not Restarting Properly**
- `systemctl start nvrcms-api` may be failing silently
- Binary may be corrupted or incompatible
- Missing environment variables or configuration

## Quick Diagnostic Steps

### Step 1: Check What's Running on Server
```bash
ssh root@sdics.tech 'bash -s' << 'EOF'
echo "=== Service Status ==="
systemctl status nvrcms-api --no-pager | head -20

echo ""
echo "=== API Binary Info ==="
ls -lh /home/lawrence/nvrcms/bin/nvrcms-api
file /home/lawrence/nvrcms/bin/nvrcms-api
md5sum /home/lawrence/nvrcms/bin/nvrcms-api

echo ""
echo "=== Frontend Files ==="
find /home/lawrence/nvrcms/frontend -type f -name "*.js" -o -name "*.html" | head -10
ls -lh /home/lawrence/nvrcms/frontend/index.html

echo ""
echo "=== Recent API Logs ==="
tail -20 /home/lawrence/nvrcms/logs/api.log 2>/dev/null || echo "No logs found"

echo ""
echo "=== Active Process ==="
ps aux | grep nvrcms-api | grep -v grep
EOF
```

### Step 2: Verify Local Builds Exist
```bash
echo "=== Go Binary ==="
ls -lh bin/nvrcms-api

echo ""
echo "=== React Build ==="
ls -lh frontend/dist/index.html
find frontend/dist/assets -type f | head -5
```

### Step 3: Check GitHub Actions History
- Look at https://github.com/YOUR_ORG/nvrcms/actions
- Check if recent workflow runs succeeded or failed
- Review build logs

## Recovery Plan

### Phase 1: Manual Emergency Deployment (NOW)
Run this to force-deploy the current code:

```bash
# 1. Build everything locally
echo "Building API..."
GOOS=linux GOARCH=amd64 go build -o bin/nvrcms-api ./cmd/api

echo "Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Run the deployment script
bash scripts/deploy-with-ssh.sh
```

### Phase 2: Verify After Deployment
```bash
# Check service is running
ssh root@sdics.tech systemctl status nvrcms-api

# Test API endpoint
curl -s https://sdics.tech/health | jq .

# Check if frontend loads
curl -s https://sdics.tech | head -20
```

### Phase 3: Fix the Pipeline
1. Ensure GitHub Actions SSH key is correctly configured
2. Add better error handling and logging to workflow
3. Add pre-flight checks before deployment

## Critical Files to Check

| File | Purpose | Location |
|------|---------|----------|
| `.github/workflows/deploy.yml` | CI/CD Pipeline | Root |
| `scripts/deploy-with-ssh.sh` | SSH Deployment Script | Root |
| `scripts/deploy-react-production.sh` | React Deployment | Root |
| `bin/nvrcms-api` | Compiled Go Binary | Must exist locally |
| `frontend/dist/` | React Build Output | Must exist locally |
| `/home/lawrence/nvrcms/` | Server Deploy Directory | Remote |

## Prevention for Future

1. **Add Build Verification**: Check binaries are created before deploying
2. **Add Deployment Verification**: Verify files on server after upload
3. **Add Rollback Script**: Create quick rollback to previous version
4. **Monitor Checksums**: Compare local vs remote file checksums
5. **Add Better Logging**: Log every deployment step
