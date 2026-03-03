# Booth Buddy Deployment Setup

## Deployment Checklist

### 1. Shopify App Setup (Partner Dashboard)
You need a Shopify app to get API credentials:
- [ ] Create app at [partners.shopify.com](https://partners.shopify.com)
- [ ] Set **App URL**: `https://booth-buddy.fly.dev/admin`
- [ ] Set **Callback URL**: `https://booth-buddy.fly.dev/auth/callback`
- [ ] Copy **Client ID** → `SHOPIFY_API_KEY`
- [ ] Copy **Client Secret** → `SHOPIFY_API_SECRET`

### 2. Generate Security Keys
```bash
# Run these to generate your secrets
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
```

### 3. Deploy to Fly.io
```bash
# Create the app (will also create Postgres)
fly launch --name booth-buddy

# Set secrets
fly secrets set \
  SHOPIFY_API_KEY="your_client_id" \
  SHOPIFY_API_SECRET="your_client_secret" \
  ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  APP_URL="https://booth-buddy.fly.dev"

# Deploy
fly deploy
```

## What's Already Done
| Item | Status |
|------|--------|
| Dockerfile | Multi-stage build ready |
| fly.toml | Configured (sjc region, 512MB) |
| Prisma migrations | Release command in fly.toml |
| Code | Tests passing, clean |

## Summary
You basically just need:
1. **Shopify Partner account** + create an app
2. **Run `fly launch`** to create app + database
3. **Set the secrets**
4. **Deploy**
