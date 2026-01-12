# Push to GitHub

The repository needs to be created on GitHub before pushing.

## Option 1: Create via GitHub website

1. Go to https://github.com/new
2. Name it `booth-buddy`, make it private
3. Don't initialize with README (we already have code)
4. Run:
```bash
cd ~/Library/CloudStorage/Dropbox/Github/booth-buddy
git push -u origin main
```

## Option 2: Authenticate gh CLI

```bash
gh auth login
cd ~/Library/CloudStorage/Dropbox/Github/booth-buddy
gh repo create nervous-net/booth-buddy --private --source=. --push
```

## Current state

Remote already configured:
- origin: git@github.com:nervous-net/booth-buddy.git

4 commits ready to push:
- b6bfaef Add Vitest config and QR code service tests
- 5ee6e07 Add deployment config, ESLint, and Dockerfile
- 7c72edf Add routes, views, and complete scan flow
- dd64bd6 Initial project setup with monorepo structure
