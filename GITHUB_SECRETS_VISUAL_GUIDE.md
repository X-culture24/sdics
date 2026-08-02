# GitHub Secrets - Visual Step-by-Step Guide

## Step 1: Create GitHub Personal Access Token

### Location
```
https://github.com/settings/tokens/new
```

### Screenshot Reference
1. Click your **profile icon** (top right)
2. Select **Settings**
3. On left sidebar: **Developer settings** → **Personal access tokens** → **Tokens (classic)**
4. Click **Generate new token** → **Generate new token (classic)**

### What to Fill In

```
Token name:        GitHub Actions Deployment Token
Expiration:        90 days
Scopes:           ☑️ repo (Full control of private repositories)
                   
Other scopes:      LEAVE UNCHECKED
```

### IMPORTANT: Copy Your Token

After clicking "Generate token", you'll see a long string like:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**COPY THIS IMMEDIATELY** - You won't see it again!

---

## Step 2: Get Your SSH Private Key

### In Your Terminal

```bash
# This prints your SSH private key
cat ~/.ssh/id_rsa
```

You should see:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
[lots of random characters]
-----END RSA PRIVATE KEY-----
```

**SELECT ALL AND COPY** the entire text including the BEGIN and END lines.

### If You Don't Have One

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_github

# Press Enter for all prompts (use defaults)
```

Then add it to your server:
```bash
cat ~/.ssh/id_rsa_github.pub | ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'
```

And use the private key:
```bash
cat ~/.ssh/id_rsa_github
```

---

## Step 3: Add Secrets to Repository

### Location
```
https://github.com/X-culture24/sdics/settings/secrets/actions
```

### Breakdown of URL
- Replace `X-culture24` with your GitHub username if different
- Replace `sdics` with your repository name if different

### What You'll See

You'll see a page like this:

```
Secrets
You have no organization secrets.

Repository secrets
+ New repository secret

[SSH_PRIVATE_KEY]          ●●●●●●●●●●●●●●●●
[GITHUB_TOKEN]             ●●●●●●●●●●●●●●●●
```

---

## Step 4: Adding Each Secret

### Click "New repository secret"

You'll see a form like:

```
┌─────────────────────────────────┐
│ Name                            │ (text field)
│ Secret                          │ (text area)
│                                 │
│  [Add secret]  [Cancel]         │
└─────────────────────────────────┘
```

### Secret 1: SSH_PRIVATE_KEY

**Fill in:**
- **Name field**: `SSH_PRIVATE_KEY` (exactly)
- **Secret field**: [Paste your private key from Step 2]

```
┌─────────────────────────────────┐
│ Name: SSH_PRIVATE_KEY           │
│                                 │
│ Secret:                         │
│ -----BEGIN RSA PRIVATE KEY-----  │
│ MIIEpAIBAAKCAQEA1234567890..  │
│ [lots of lines]                 │
│ -----END RSA PRIVATE KEY-----    │
│                                 │
│  [Add secret]                   │
└─────────────────────────────────┘
```

**Then click:** `Add secret`

### Secret 2: GITHUB_TOKEN

**Fill in:**
- **Name field**: `GITHUB_TOKEN` (exactly)
- **Secret field**: [Paste your token from Step 1]

```
┌─────────────────────────────────┐
│ Name: GITHUB_TOKEN              │
│                                 │
│ Secret:                         │
│ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx│
│                                 │
│  [Add secret]                   │
└─────────────────────────────────┘
```

**Then click:** `Add secret`

---

## Step 5: Verify Both Secrets Are Added

### After Adding Both

Go back to: https://github.com/X-culture24/sdics/settings/secrets/actions

You should see:

```
Repository secrets

[SSH_PRIVATE_KEY]    Updated recently   [Edit] [Delete]
[GITHUB_TOKEN]       Updated recently   [Edit] [Delete]
```

The `●●●●●●●●●●●●●●●●` means the secret is hidden (which is correct).

---

## Step 6: Test It Works

### Make a Test Commit

```bash
# Make a small change (e.g., add a comment to a file)
echo "# Test deployment" >> README.md

# Commit and push
git add README.md
git commit -m "Test GitHub Actions deployment"
git push origin main
```

### Watch the Workflow Run

1. Go to: https://github.com/X-culture24/sdics/actions
2. You should see a workflow running (might take 1-2 min to start)
3. Click on the workflow to see logs
4. Watch for:
   - ✅ `Setup SSH Key` - Check
   - ✅ `Deploy via Git Clone` - Check
   - ✅ Services starting - Check

### Check Your Server

```bash
# SSH to server
ssh root@sdics.tech

# Verify deployment
ls -lh /home/lawrence/nvrcms/
systemctl status nvrcms-api
tail -20 /home/lawrence/nvrcms/logs/api.log
```

---

## Common Issues & Fixes

### Issue: "Permission denied (publickey)"

**Cause**: SSH key not on server  
**Fix**: Run this from your machine:
```bash
cat ~/.ssh/id_rsa.pub | ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'
```

### Issue: "could not read Username for 'https://github.com'"

**Cause**: GITHUB_TOKEN is missing or wrong  
**Fix**:
1. Go to https://github.com/settings/tokens
2. Delete the old token
3. Create a NEW token
4. Update the `GITHUB_TOKEN` secret

### Issue: Workflow still fails

**Check the logs**:
1. Go to: https://github.com/X-culture24/sdics/actions
2. Click the failed workflow
3. Click "Deploy via Git Clone" step
4. Expand and read the error message
5. Most common: SSH key or GitHub token wrong

---

## Quick Reference Card

Copy this if you need to remember the steps:

```
1. Create GitHub PAT:     https://github.com/settings/tokens/new
   Scopes: ☑️ repo only
   Save: ghp_xxxxxxxxxx

2. Get SSH key:           cat ~/.ssh/id_rsa
   Copy: -----BEGIN...-----

3. Add to GitHub:         https://github.com/X-culture24/sdics/settings/secrets/actions
   Secret 1:              SSH_PRIVATE_KEY = [paste private key]
   Secret 2:              GITHUB_TOKEN = [paste github token]

4. Test:                  Push a commit → Watch Actions → Check server
```

---

## When to Refresh/Rotate Secrets

| Secret | Rotation Schedule | Why |
|--------|------------------|-----|
| `GITHUB_TOKEN` | Every 90 days | Good security practice |
| `SSH_PRIVATE_KEY` | Every 6 months | Key compromise prevention |
| If leaked | IMMEDIATELY | Create new, delete old |

To rotate:
1. Create new secret
2. Update GitHub secret with new value
3. Delete old value from server (if SSH key)
4. Done!

---

## You're Done! 🎉

Your pipeline is now set up. Every time you push to `main`, it will:

1. ✅ Clone your repo
2. ✅ Build API & Frontend
3. ✅ Deploy to sdics.tech
4. ✅ Restart services

No more manual deployments needed! 🚀
