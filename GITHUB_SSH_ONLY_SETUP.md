# GitHub Secrets Setup - SSH ONLY (No Token Needed)

## TL;DR

If you already have SSH set up, you **ONLY need 1 secret**:

- `SSH_PRIVATE_KEY` = your `~/.ssh/id_rsa`

**That's it!** No GitHub token required.

---

## Step 1: Get Your SSH Private Key

```bash
cat ~/.ssh/id_rsa
```

Copy the entire output from `-----BEGIN RSA PRIVATE KEY-----` to `-----END RSA PRIVATE KEY-----`

---

## Step 2: Add SSH Secret to GitHub

Go to:
```
https://github.com/X-culture24/sdics/settings/secrets/actions
```

Click **"New repository secret"**

Fill in:
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: [Paste your private key from Step 1]

Click **Add secret**

---

## Step 3: Done! ✅

That's all you need. The workflow will:

1. Use SSH key to connect to server
2. Use SSH to clone the repo (no token needed)
3. Build and deploy

---

## Verify It Works

```bash
# Make a test commit
git add .
git commit -m "Test SSH deployment"
git push origin main
```

Go to: https://github.com/X-culture24/sdics/actions

Watch the deployment run. Should succeed in 3-5 minutes.

---

## Why SSH Works

The workflow does this:

1. **SSH to server** (using your SSH_PRIVATE_KEY)
2. **On server**: `git clone git@github.com:X-culture24/sdics.git`
3. SSH key from GitHub Actions connects to server
4. Server uses its own SSH to clone repo from GitHub
5. **No token needed!**

---

## Summary

| Method | Secrets Needed | Setup Time |
|--------|----------------|-----------|
| SSH Only (Recommended) | 1 secret | 2 minutes |
| SSH + Token | 2 secrets | 5 minutes |
| HTTPS Token | 1 secret | 2 minutes |

**SSH is the cleanest approach!** ✅

---

Done! Your deployment is ready. Just push code and watch it deploy. 🚀
