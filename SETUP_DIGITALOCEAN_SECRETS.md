# GitHub Actions Setup - DigitalOcean Secrets

Your GitHub repository already has these secrets configured:

- ✅ `DO_HOST` - Your DigitalOcean server domain/IP
- ✅ `DO_SSH_KEY` - Your SSH private key
- ✅ `DO_USER` - SSH user (usually `root`)

## What Was Updated

The GitHub Actions workflow (`.github/workflows/deploy.yml`) now uses these secrets:

```yaml
- name: Setup SSH Key (DO_SSH_KEY)
  run: echo "${{ secrets.DO_SSH_KEY }}" > ~/.ssh/id_rsa

- name: Deploy via Git Clone (DO_HOST)
  run: ssh ${{ secrets.DO_USER }}@${{ secrets.DO_HOST }} ...
```

## How It Works

1. GitHub Actions reads your 3 secrets
2. Creates SSH key from `DO_SSH_KEY`
3. Connects to `DO_USER@DO_HOST`
4. Runs deployment script
5. Clones repo and deploys

## Test Deployment

```bash
git push origin main
```

Watch: https://github.com/X-culture24/sdics/actions

## If SSH Connection Still Fails

The `DO_SSH_KEY` might be corrupted. Fix it:

```bash
# Generate new key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/do_deploy -N ""

# Add to server
cat ~/.ssh/do_deploy.pub | ssh root@[DO_HOST] 'cat >> ~/.ssh/authorized_keys'

# Get private key
cat ~/.ssh/do_deploy

# Update GitHub secret DO_SSH_KEY with new value
```

---

**Ready to deploy!** Push code and watch it go live. 🚀
