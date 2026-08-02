# Fix: SSH Key Error in GitHub Actions

## Problem
```
Load key "/home/runner/.ssh/id_rsa": error in libcrypto
Permission denied (publickey)
```

This means the SSH key format is wrong or corrupted.

---

## Solution: Generate a Fresh SSH Key

### Step 1: Generate New SSH Key on Your Local Machine

```bash
# Generate new key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github_deploy -N ""

# This creates:
# ~/.ssh/github_deploy (private key)
# ~/.ssh/github_deploy.pub (public key)
```

### Step 2: Add Public Key to Server

```bash
cat ~/.ssh/github_deploy.pub | ssh root@sdics.tech 'cat >> ~/.ssh/authorized_keys'
```

### Step 3: Get Private Key Content

```bash
cat ~/.ssh/github_deploy
```

Copy the ENTIRE output (from `-----BEGIN` to `-----END`)

### Step 4: Update GitHub Secret

1. Go to: https://github.com/X-culture24/sdics/settings/secrets/actions
2. Find: `SSH_PRIVATE_KEY`
3. Click: **Update**
4. Paste: [your new private key from Step 3]
5. Click: **Update secret**

### Step 5: Test

```bash
git push origin main
```

Watch: https://github.com/X-culture24/sdics/actions

---

## Why This Happens

- Key might have Windows line endings (CRLF vs LF)
- Key might be corrupted when pasted
- Key might be in wrong format

**Fresh key = solves it!**

---

## Quick Checklist

✅ Key starts with `-----BEGIN RSA PRIVATE KEY-----`
✅ Key ends with `-----END RSA PRIVATE KEY-----`
✅ No extra spaces at start/end
✅ All lines included
✅ Public key added to server

---

Done! Try deployment again. 🚀
