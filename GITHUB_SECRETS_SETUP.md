# GitHub Secrets Setup Guide

## What are GitHub Secrets?

GitHub Secrets are encrypted environment variables stored securely in your repository. They're used to store sensitive information like SSH keys, API tokens, and credentials without exposing them in your code or logs.

## Step-by-Step: Adding Secrets to Your Repository

### Step 1: Create a Personal Access Token (PAT)

This allows the workflow to authenticate with GitHub when cloning your private repo.

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Fill in:
   - **Note**: `GitHub Actions Deployment Token`
   - **Expiration**: 90 days (or as needed)
   - **Scopes**: Check only `repo` (Full control of private repositories)
4. Click "Generate token"
5. **Copy the token** (you'll only see it once!)

### Step 2: Add Secrets to Your Repository

1. Go to: https://github.com/X-culture24/sdics/settings/secrets/actions
2. Click "New repository secret"

#### Secret 1: SSH_PRIVATE_KEY
- **Name**: `SSH_PRIVATE_KEY`
- **Value**: Your SSH private key (the one that gives you access to sdics.tech)
  - Usually located at: `~/.ssh/id_rsa`
  - Copy the entire content including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
  - If you don't have one, generate: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_github`
  - Add the public key to your server: `cat ~/.ssh/id_rsa_github.pub | ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'`

#### Secret 2: GITHUB_TOKEN
- **Name**: `GITHUB_TOKEN`
- **Value**: The Personal Access Token you created in Step 1

#### Secret 3: SERVER_HOST (Optional but recommended)
- **Name**: `SERVER_HOST`
- **Value**: `sdics.tech`

#### Secret 4: SERVER_USER (Optional but recommended)
- **Name**: `SERVER_USER`
- **Value**: `root`

### Step 3: Verify Secrets Are Added

1. Go to: https://github.com/X-culture24/sdics/settings/secrets/actions
2. You should see all your secrets listed (values are hidden)

## How the Workflow Uses Secrets

In the GitHub Actions workflow file (`.github/workflows/deploy.yml`), secrets are accessed with:

```yaml
- name: Deploy
  run: |
    ssh -i ~/.ssh/id_rsa root@sdics.tech 'bash ...'
  env:
    SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
```

## Screenshots for Visual Reference

### Finding Repository Settings
1. Go to your repo: https://github.com/X-culture24/sdics
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

### Adding a Secret
- Give it a name (e.g., `SSH_PRIVATE_KEY`)
- Paste the secret value
- Click **Add secret**

## Testing the Secrets

You can verify secrets work by:
1. Making a commit/push to trigger the workflow
2. Go to: https://github.com/X-culture24/sdics/actions
3. Click the latest workflow run
4. Check the logs (secrets will be masked with `***`)

## Security Best Practices

✅ **DO:**
- Rotate SSH keys periodically
- Use strong, unique PATs with minimal scopes
- Set PAT expiration dates
- Review and delete unused secrets
- Audit which actions can use secrets

❌ **DON'T:**
- Commit secrets to the repository
- Share secrets in chat or emails
- Use the same keys for multiple purposes
- Leave PATs without expiration

## Troubleshooting

### Secret Not Found
- Error: `${{ secrets.SSH_PRIVATE_KEY }} is empty`
- Fix: Ensure the secret name matches exactly (case-sensitive)

### SSH Connection Failed
- Error: `Permission denied (publickey)`
- Fix: Ensure public key is in server's `~/.ssh/authorized_keys`

### GitHub Token Not Working
- Error: `fatal: could not read Username for 'https://github.com': No such device or address`
- Fix: Ensure `GITHUB_TOKEN` is set and has `repo` scope

## Quick Reference

| Secret Name | Purpose | Value Source |
|------------|---------|---------------|
| `SSH_PRIVATE_KEY` | SSH access to server | `~/.ssh/id_rsa` or new key |
| `GITHUB_TOKEN` | Git clone authentication | GitHub Settings → Tokens |
| `SERVER_HOST` | Server domain | Your server's domain |
| `SERVER_USER` | SSH user | Usually `root` |

---

**Need help?** Check GitHub Docs: https://docs.github.com/en/actions/security-guides/encrypted-secrets
