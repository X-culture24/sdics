# SDICS Deployment Pipeline - Complete Setup Summary

## What We've Set Up

You now have a **clean, git-based deployment pipeline** that:

✅ Clones your repo from GitHub  
✅ Builds the Go API binary  
✅ Builds the React frontend  
✅ Deploys everything fresh to the server  
✅ No more old code lingering in cache  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Your Local Machine / GitHub                        │
│  (Push code → GitHub)                               │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Actions (`.github/workflows/deploy.yml`)    │
│  • Reads SSH_PRIVATE_KEY secret                      │
│  • Reads GITHUB_TOKEN secret                         │
│  • Connects to server via SSH                        │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Server: sdics.tech (root@sdics.tech)               │
│  • Backs up current deployment                       │
│  • Clones fresh repo using GITHUB_TOKEN              │
│  • Builds Go API binary                              │
│  • Builds React frontend                             │
│  • Configures Nginx & Systemd                        │
│  • Starts services                                   │
└─────────────────────────────────────────────────────┘
```

---

## Files Created/Updated

### New Scripts

1. **`scripts/deploy-clean-git.sh`**
   - Manual deployment script
   - Use when you need to deploy locally without waiting for GitHub Actions
   - Usage: `bash scripts/deploy-clean-git.sh`

2. **`scripts/verify-deployment.sh`**
   - Check deployment status
   - Verify services are running
   - Usage: `bash scripts/verify-deployment.sh`

### Documentation

1. **`GITHUB_SECRETS_SETUP.md`**
   - Detailed guide on creating and adding GitHub secrets
   - Best practices for secret management
   - Troubleshooting tips

2. **`QUICK_SETUP_GITHUB_SECRETS.md`**
   - Quick 5-step setup guide
   - Copy-paste friendly instructions

3. **`DEPLOYMENT_SUMMARY.md`** (this file)
   - Overview of the entire deployment system

### Updated Files

1. **`.github/workflows/deploy.yml`**
   - Changed to git-based deployment
   - Now uses `SSH_PRIVATE_KEY` and `GITHUB_TOKEN` secrets
   - Builds and deploys automatically on push to main

---

## Step-by-Step: Get Started NOW

### Phase 1: Add GitHub Secrets (5 minutes)

Follow: **`QUICK_SETUP_GITHUB_SECRETS.md`**

You'll need:
1. Your SSH private key (`~/.ssh/id_rsa`)
2. A GitHub Personal Access Token (create in settings)

### Phase 2: Manual Deployment (optional, for testing)

If you want to test deployment locally before pushing:

```bash
bash scripts/deploy-clean-git.sh
```

(It will ask for confirmation before deleting old files)

### Phase 3: Automated Deployment

Once secrets are added, just push to main:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will automatically:
1. Run the workflow
2. SSH to your server
3. Clone the latest code
4. Build and deploy
5. Start services

Watch the deployment: https://github.com/X-culture24/sdics/actions

---

## Key Benefits of This Setup

### ✅ Old Code Problem SOLVED

**Before**: SCP copies could leave old files lingering  
**Now**: Fresh git clone ensures only your latest code is deployed

### ✅ Browser Cache SOLVED

**Before**: Nginx served old cached frontend  
**Now**: Every deployment gets new JS bundle with unique filename (hash)

### ✅ Consistent Environment

**Before**: Local build vs. server build could differ  
**Now**: Everything built on the server with same dependencies

### ✅ Easy Rollback

**Before**: Hard to revert to previous version  
**Now**: Backups in `/home/lawrence/nvrcms-backup-*` - easy restore

### ✅ Transparent Logs

**Before**: SCP gave minimal feedback  
**Now**: GitHub Actions shows every step - easy debugging

---

## Workflow: Day-to-Day Usage

### When You Make Changes

```bash
# 1. Edit files in your IDE
# 2. Commit changes
git add .
git commit -m "Fix dashboard bugs"

# 3. Push to GitHub
git push origin main

# 4. Check deployment automatically starts
# Go to: https://github.com/X-culture24/sdics/actions

# 5. Server automatically updates
# Your changes go live in ~3 minutes
```

### If You Need to Deploy Manually

```bash
# SSH to server and run
bash /home/lawrence/nvrcms/scripts/deploy-clean-git.sh

# Or run from your machine
REMOTE_HOST=sdics.tech bash scripts/deploy-clean-git.sh
```

### To Check Deployment Status

```bash
# View latest logs
ssh root@sdics.tech 'tail -50 /home/lawrence/nvrcms/logs/api.log'

# Check services
ssh root@sdics.tech 'systemctl status nvrcms-api'

# Test API
curl https://sdics.tech/health | jq
```

---

## Secrets Reference

### Required Secrets

| Secret | Source | Expires |
|--------|--------|---------|
| `SSH_PRIVATE_KEY` | `~/.ssh/id_rsa` | When key is removed from server |
| `GITHUB_TOKEN` | GitHub Settings → Tokens | 90 days (set when creating) |

### Optional Secrets (for future use)

| Secret | Purpose |
|--------|---------|
| `DB_PASSWORD` | Database password (if needed) |
| `JWT_SECRET` | JWT signing key |
| `SMTP_PASSWORD` | Email service password |

---

## Troubleshooting Workflow

### Deployment Failed in GitHub Actions

1. Go to: https://github.com/X-culture24/sdics/actions
2. Click the failed workflow
3. Expand each step to see logs
4. Common issues:
   - `Permission denied` → SSH key wrong
   - `could not read Username` → GITHUB_TOKEN missing/wrong
   - `Build failed` → Check if main branch builds locally

### Server Deployment Stuck

```bash
# Check if process is running
ps aux | grep nvrcms-api

# View error logs
ssh root@sdics.tech 'tail -100 /home/lawrence/nvrcms/logs/api-error.log'

# Restart manually
ssh root@sdics.tech 'systemctl restart nvrcms-api'
```

### Frontend Still Shows Old Code

1. Hard refresh: `Ctrl+Shift+R`
2. Clear cache: Settings → Clear Browsing Data
3. Test in incognito window
4. Verify server deployment: `curl https://sdics.tech/health`

---

## Security Checklist

✅ SSH key with proper permissions (600)  
✅ GitHub token with limited scopes (only `repo`)  
✅ Secrets not visible in code  
✅ Secrets not shown in logs (masked as `***`)  
✅ Regular secret rotation schedule  
✅ Server firewall configured  
✅ SSL certificates valid (`/etc/letsencrypt/`)  

---

## Next Steps

1. **📖 Read**: `QUICK_SETUP_GITHUB_SECRETS.md` (5 min)
2. **🔑 Add Secrets**: Go to GitHub repository settings (5 min)
3. **🧪 Test**: Push a small change and watch it deploy (3 min)
4. **✨ Done!** Your pipeline is live

---

## Support

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- **SSH Key Setup**: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- **Nginx SPA Routing**: https://angular.io/guide/deployment#production-serving

---

**Questions?** Check the troubleshooting section or review the script comments in `.github/workflows/deploy.yml`

**Ready to deploy?** 🚀 Follow the setup guide and make your first push!
