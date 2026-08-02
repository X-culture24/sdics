# 🚀 GET STARTED NOW - 3 Steps to Automated Deployment

## Step 1: Read (5 min)
**File**: `QUICK_SETUP_GITHUB_SECRETS.md`

This is the fastest way to understand what you need to do.

## Step 2: Create GitHub Token (5 min)

1. Go to: https://github.com/settings/tokens/new
2. Fill in:
   - **Token name**: `GitHub Actions Deployment`
   - **Expiration**: 90 days
   - **Scopes**: Check only ✅ `repo`
3. Click **Generate token**
4. **COPY THE TOKEN** (save it temporarily)

## Step 3: Get Your SSH Key (1 min)

In your terminal:
```bash
cat ~/.ssh/id_rsa
```

Copy the entire output (from `-----BEGIN` to `-----END`)

## Step 4: Add Secrets (5 min)

Go to: https://github.com/X-culture24/sdics/settings/secrets/actions

Click **New repository secret** twice:

### Secret 1: SSH_PRIVATE_KEY
- Name: `SSH_PRIVATE_KEY`
- Value: [Paste your SSH key from Step 3]
- Click **Add secret**

### Secret 2: GITHUB_TOKEN  
- Name: `GITHUB_TOKEN`
- Value: [Paste the token from Step 2]
- Click **Add secret**

## Step 5: Test It (3 min)

```bash
# Make a tiny change
echo "# Deployment test" >> README.md

# Commit and push
git add README.md
git commit -m "Test deployment"
git push origin main
```

Then:
1. Go to: https://github.com/X-culture24/sdics/actions
2. Watch the workflow run
3. Check your app: https://sdics.tech

**Done!** 🎉

---

## From Now On

Every time you push to main:
```bash
git push origin main
```

Your app automatically deploys in 3-5 minutes.

No more manual steps needed!

---

## If Something Fails

1. Check GitHub Actions logs: https://github.com/X-culture24/sdics/actions
2. Find the error message
3. Check `QUICK_SETUP_GITHUB_SECRETS.md` troubleshooting section
4. Fix and try again

---

## Questions?

- Quick answers: `DEPLOYMENT_QUICK_REFERENCE.md`
- Visual guide: `GITHUB_SECRETS_VISUAL_GUIDE.md`
- Full docs: `DEPLOYMENT_SUMMARY.md`

---

**That's it!** Your automated deployment system is ready. 🚀

Go to Step 1 now →
