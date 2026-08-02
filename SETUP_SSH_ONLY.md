# ⚡ FASTEST SETUP - SSH Only (2 Minutes)

## You Only Need 1 Secret

No GitHub token. Just your SSH key for server access.

The workflow clones from public repo URL (no auth needed for public repos).

## Step 1: Copy SSH Key (30 seconds)

```bash
cat ~/.ssh/id_rsa
```

**Copy the entire output** (start to end)

## Step 2: Add Secret (1 minute)

1. Go to: https://github.com/X-culture24/sdics/settings/secrets/actions
2. Click **New repository secret**
3. Name: `SSH_PRIVATE_KEY`
4. Value: [Paste from Step 1]
5. Click **Add secret**

## Step 3: Test (3 minutes)

```bash
git add .
git commit -m "Test"
git push origin main
```

Watch: https://github.com/X-culture24/sdics/actions

Done! 🚀

---

**That's it.** Push code → auto deploy. 

Workflow does:
1. Uses SSH key to connect to your server
2. Clones code from public GitHub repo
3. Builds and deploys
4. Starts services

If deployment fails, check Actions logs for errors.
