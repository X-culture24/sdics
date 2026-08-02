# Quick Setup: GitHub Secrets for SDICS Deployment

## TL;DR - 5 Steps to Add Secrets

### 1️⃣ Create GitHub Personal Access Token (PAT)

```
Go to: https://github.com/settings/tokens/new
```

Settings:
- **Token name**: `GitHub Actions Deployment Token`
- **Expiration**: 90 days
- **Scopes**: Check ✅ `repo` (that's all you need)
- Click **Generate token**
- **COPY THE TOKEN** (you'll see it only once!)

---

### 2️⃣ Get Your SSH Private Key

Open terminal and run:
```bash
cat ~/.ssh/id_rsa
```

Copy the entire output from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`

If you don't have an SSH key:
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_github
# Just press Enter for all prompts to use defaults
```

Then add the public key to your server:
```bash
cat ~/.ssh/id_rsa_github.pub | ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'
```

---

### 3️⃣ Add Secrets to Repository

Go to:
```
https://github.com/X-culture24/sdics/settings/secrets/actions
```

Click **"New repository secret"** and add these:

#### Secret 1: `SSH_PRIVATE_KEY`
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: [Paste your private key from step 2]
- Click **Add secret**

#### Secret 2: `GITHUB_TOKEN`
- **Name**: `GITHUB_TOKEN`
- **Value**: [Paste the token from step 1]
- Click **Add secret**

---

### 4️⃣ Verify Secrets Are Added

Check: https://github.com/X-culture24/sdics/settings/secrets/actions

You should see:
- ✅ `SSH_PRIVATE_KEY`
- ✅ `GITHUB_TOKEN`

(Values are hidden - that's normal!)

---

### 5️⃣ Test the Deployment

Make a commit and push:
```bash
git add .
git commit -m "Test deployment pipeline"
git push origin main
```

Watch the deployment:
```
Go to: https://github.com/X-culture24/sdics/actions
```

Check if workflow passes ✅

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Git clone fails** | `GITHUB_TOKEN` is wrong or expired. Create a new one. |
| **SSH connection fails** | `SSH_PRIVATE_KEY` is wrong. Use `cat ~/.ssh/id_rsa` to verify. |
| **Permission denied** | Public key not added to server. Run: `cat ~/.ssh/id_rsa_github.pub \| ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'` |
| **"No such file or directory"** | SSH key path wrong. Check: `ls -la ~/.ssh/id_rsa` |

---

## What Happens When You Push

1. GitHub reads your secrets securely
2. Workflow clones repository using `GITHUB_TOKEN`
3. Server connects via `SSH_PRIVATE_KEY`
4. Code builds and deploys
5. Frontend shows new code ✨

---

## Security Notes

🔐 **Secrets are:**
- Encrypted at rest
- Only visible to you and GitHub Actions
- Masked in logs (shown as `***`)
- Rotated if GitHub detects them in public

✅ **Best practices:**
- Rotate SSH keys every 6 months
- Set PAT expiration (90 days recommended)
- Delete unused secrets
- Never share your token

---

Done! Your pipeline is now ready for automated deployments. 🚀
