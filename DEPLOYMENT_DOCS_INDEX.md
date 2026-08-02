# SDICS Deployment Documentation Index

## 📚 Read These in Order

### 1. **Start Here** → `DEPLOYMENT_SUMMARY.md`
   - Overview of the entire system
   - Architecture diagram
   - Benefits and workflow
   - **Time**: 10 minutes

### 2. **Setup Guide** → `QUICK_SETUP_GITHUB_SECRETS.md`
   - 5-step quick setup
   - Copy-paste friendly
   - For people who like to act fast
   - **Time**: 5 minutes

### 3. **Visual Guide** → `GITHUB_SECRETS_VISUAL_GUIDE.md`
   - Click-by-click instructions
   - Screenshots descriptions
   - Troubleshooting
   - For people who like visuals
   - **Time**: 5 minutes

### 4. **Detailed Reference** → `GITHUB_SECRETS_SETUP.md`
   - Complete technical documentation
   - Security best practices
   - Advanced configurations
   - For reference later
   - **Time**: 20 minutes (reference)

---

## 🎯 Choose Your Path

### Path A: "Just Get It Working"
1. Read: `QUICK_SETUP_GITHUB_SECRETS.md`
2. Do: Add secrets to GitHub
3. Test: Push a commit
4. Done!

### Path B: "I Want to Understand"
1. Read: `DEPLOYMENT_SUMMARY.md`
2. Read: `GITHUB_SECRETS_VISUAL_GUIDE.md`
3. Do: Follow visual guide
4. Read: `GITHUB_SECRETS_SETUP.md` for details

### Path C: "I Need Help"
1. Go to: `GITHUB_SECRETS_VISUAL_GUIDE.md`
2. Find your issue in troubleshooting
3. Follow the fix
4. Test again

---

## 🔧 Deployment Scripts

### Manual Deployment (Local)
```bash
bash scripts/deploy-clean-git.sh
```
- Use when you want to deploy without GitHub Actions
- Removes old code, clones fresh repo
- Builds everything on server
- Starts services

### Verify Deployment Status
```bash
bash scripts/verify-deployment.sh
```
- Check services are running
- Verify frontend is deployed
- Test health endpoints

### Automated Deployment (GitHub Actions)
```bash
git push origin main
# Automatically triggers deployment
```
- No manual steps needed
- Defined in: `.github/workflows/deploy.yml`
- Watch at: https://github.com/X-culture24/sdics/actions

---

## 📋 Quick Checklist

Before your first deployment:

- [ ] Read `DEPLOYMENT_SUMMARY.md`
- [ ] Create GitHub Personal Access Token
- [ ] Get SSH private key (`cat ~/.ssh/id_rsa`)
- [ ] Add `SSH_PRIVATE_KEY` secret to GitHub
- [ ] Add `GITHUB_TOKEN` secret to GitHub
- [ ] Verify both secrets appear in repository settings
- [ ] Make a test commit and push
- [ ] Watch deployment in GitHub Actions
- [ ] Test app at https://sdics.tech
- [ ] Check logs: `ssh root@sdics.tech 'tail -20 /home/lawrence/nvrcms/logs/api.log'`

---

## 🚀 Your First Deployment

### Step 1: Setup (First Time Only)
Follow: `QUICK_SETUP_GITHUB_SECRETS.md`

### Step 2: Make Changes
```bash
# Edit your code
# Commit changes
git add .
git commit -m "Your changes"
git push origin main
```

### Step 3: Watch Deployment
```
https://github.com/X-culture24/sdics/actions
```
- Workflow should start within 1-2 minutes
- Shows real-time build and deploy logs
- Takes ~3-5 minutes total

### Step 4: Verify Live
```bash
# Check your app
curl https://sdics.tech/health | jq

# Or open browser
https://sdics.tech
```

Done! 🎉

---

## 🆘 Troubleshooting

### GitHub Actions Shows Red X
1. Click the failed workflow
2. Expand each step and read the error
3. Common issues:
   - Wrong secret value
   - Server not responding
   - Build failed (check locally first)

### Can't Connect to Server
1. Verify SSH key is correct: `cat ~/.ssh/id_rsa`
2. Verify public key is on server: `ssh root@sdics.tech 'cat ~/.ssh/authorized_keys'`
3. Test SSH: `ssh root@sdics.tech 'echo hello'`

### Git Clone Fails
1. Check `GITHUB_TOKEN` is set in secrets
2. Verify token has `repo` scope
3. Create a new token if old one expired

### Server Services Not Starting
1. Check logs: `ssh root@sdics.tech 'tail -50 /home/lawrence/nvrcms/logs/api-error.log'`
2. Check database connection: `ssh root@sdics.tech 'pg_isready -h localhost'`
3. Restart: `ssh root@sdics.tech 'systemctl restart nvrcms-api'`

### Frontend Still Shows Old Code
1. Hard refresh: `Ctrl+Shift+R`
2. Clear browser cache
3. Test in incognito window
4. Verify server: `curl https://sdics.tech/health`

---

## 📞 Common Commands

### Check Deployment Status
```bash
ssh root@sdics.tech 'systemctl status nvrcms-api'
```

### View API Logs
```bash
ssh root@sdics.tech 'tail -50 /home/lawrence/nvrcms/logs/api.log'
```

### Restart Services
```bash
ssh root@sdics.tech 'systemctl restart nvrcms-api'
ssh root@sdics.tech 'systemctl reload nginx'
```

### Test API
```bash
curl https://sdics.tech/health | jq
curl https://sdics.tech/api/v1/ping
```

### Manual Deploy (if needed)
```bash
bash scripts/deploy-clean-git.sh
```

---

## 🔐 Security Reminders

✅ **DO:**
- Store secrets in GitHub, not in code
- Rotate secrets every 90 days
- Use SSH keys for server access
- Check GitHub Actions logs for errors

❌ **DON'T:**
- Commit `.env` files
- Share GitHub tokens
- Use weak SSH keys
- Leave old secrets in GitHub

---

## 📈 What's New

### vs. Old SCP-Based Deployment

| Aspect | Old Way | New Way |
|--------|---------|---------|
| Deploy Method | SCP files | Git clone |
| Cache Issues | Frequent | Solved |
| Old Code | Lingers | Fresh only |
| Automation | Manual | Automatic |
| Reliability | Inconsistent | Consistent |
| Rollback | Hard | Easy |
| Logs | Minimal | Detailed |

---

## 📞 Getting Help

1. **GitHub Actions fails?**
   - Check: `GITHUB_SECRETS_VISUAL_GUIDE.md` → Troubleshooting

2. **Can't add secrets?**
   - Check: `GITHUB_SECRETS_VISUAL_GUIDE.md` → Step 4

3. **Server not responding?**
   - Check: `DEPLOYMENT_SUMMARY.md` → Troubleshooting

4. **Want to understand more?**
   - Read: `GITHUB_SECRETS_SETUP.md` → Detailed explanations

---

## ✨ You're Ready!

1. Pick your path (A, B, or C above)
2. Follow the guide
3. Add secrets
4. Push code
5. Watch it deploy automatically! 🚀

Questions? Re-read the relevant guide or check GitHub Actions logs.

---

**Last Updated**: August 2, 2026  
**Status**: ✅ Ready for Production  
**Tested**: ✅ Yes  
**Deployment Method**: Git-based with GitHub Actions  
**Browser Cache Issue**: ✅ Fixed  
