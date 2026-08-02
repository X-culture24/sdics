# SDICS Deployment - Quick Reference Card

## 🚀 Standard Workflow

```bash
# 1. Make changes locally
git add .
git commit -m "Your message"
git push origin main

# That's it! GitHub Actions handles the rest automatically.
# Your changes go live in ~3 minutes.
```

---

## 🔑 One-Time Setup (First Time Only)

### 1. Create GitHub Token
```
https://github.com/settings/tokens/new
Scope: repo
Expiration: 90 days
Copy the token → You'll need it next
```

### 2. Get SSH Key
```bash
cat ~/.ssh/id_rsa
# Copy the entire output
```

### 3. Add to GitHub
```
https://github.com/X-culture24/sdics/settings/secrets/actions
```

Add Secret 1:
- Name: `SSH_PRIVATE_KEY`
- Value: [paste your key from step 2]

Add Secret 2:
- Name: `GITHUB_TOKEN`
- Value: [paste your token from step 1]

### 4. Test
```bash
git push origin main
# Go to: https://github.com/X-culture24/sdics/actions
```

**Done!** ✅

---

## 📊 Status & Monitoring

### Check Deployment Status
```bash
# See if latest deployment succeeded
https://github.com/X-culture24/sdics/actions
```

### Check Server
```bash
ssh root@sdics.tech systemctl status nvrcms-api
```

### View API Logs
```bash
ssh root@sdics.tech tail -50 /home/lawrence/nvrcms/logs/api.log
```

### Test App
```bash
curl https://sdics.tech/health | jq
```

---

## 🔧 Manual Deployment (If Needed)

```bash
bash scripts/deploy-clean-git.sh
```

Then follow prompts. Takes ~5-10 minutes.

---

## ⚙️ Key Commands

```bash
# Restart services
ssh root@sdics.tech systemctl restart nvrcms-api

# Reload Nginx
ssh root@sdics.tech systemctl reload nginx

# Check processes
ssh root@sdics.tech ps aux | grep nvrcms-api

# Test frontend
curl https://sdics.tech | head -20

# Check Git latest commit on server
ssh root@sdics.tech "cd /home/lawrence/nvrcms && git log --oneline -1"
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Deployment fails in Actions | Click workflow → Check logs |
| SSH fails | Run: `cat ~/.ssh/id_rsa.pub \| ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'` |
| Git clone fails | Verify `GITHUB_TOKEN` in secrets |
| Old code showing | Hard refresh: `Ctrl+Shift+R` |
| Services won't start | `ssh root@sdics.tech tail -50 /home/lawrence/nvrcms/logs/api-error.log` |

---

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | Automation pipeline |
| `scripts/deploy-clean-git.sh` | Manual deployment |
| `scripts/verify-deployment.sh` | Check status |
| `QUICK_SETUP_GITHUB_SECRETS.md` | Setup guide |
| `DEPLOYMENT_SUMMARY.md` | Full overview |

---

## 🔐 Security

✅ Secrets are encrypted  
✅ Only used by GitHub Actions  
✅ Masked in logs  
✅ Rotate every 90 days  

---

## 💡 Tips

- Smaller commits deploy faster
- Check Actions before assuming deployment failed
- Hard refresh browser after deployment
- Keep SSH key safe - add passphrase if needed

---

## 📞 Support

1. Check relevant guide in documentation
2. Review GitHub Actions logs
3. Check server logs with `tail` command
4. Search troubleshooting section

---

**Your deployment is now automated!** 🎉  
Push code → App updates → Done!
