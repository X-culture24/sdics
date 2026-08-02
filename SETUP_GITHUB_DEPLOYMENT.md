# GitHub Actions Deployment Setup

Your pipeline needs SSH access to deploy. Follow these steps:

## Step 1: Get Your SSH Private Key

On your local machine, display your SSH private key:
```bash
cat ~/.ssh/id_rsa
```

Copy the ENTIRE output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

## Step 2: Add to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `SSH_KEY`
5. Value: Paste your SSH private key (from Step 1)
6. Click **Add secret**

## Step 3: Update GitHub Workflow

The workflow file (.github/workflows/deploy.yml) needs to use this secret. Add this step at the beginning:

```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan -H sdics.tech >> ~/.ssh/known_hosts
```

This configures SSH before deployment.

## Step 4: Test

Push a small change to main branch:
```bash
git push origin main
```

Watch the GitHub Actions workflow run in the Actions tab.

---

**Important Notes:**
- Your SSH key must be authorized on sdics.tech (in `~/.ssh/authorized_keys` for root user)
- Keep your SSH private key secret - never commit it to git
- GitHub will automatically mask the secret in logs
