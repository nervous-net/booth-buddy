# Booth Buddy

A QR code-based customer tagging system for Shopify stores at in-person events. Customers scan a QR code at your booth, enter their email, and get tagged in your Shopify store for follow-up marketing.

## Single Store Setup Guide

### Prerequisites

- Node.js 20+
- PostgreSQL database
- A Shopify store
- A Shopify Partner account (free)

### Step 1: Create a Shopify App

1. Go to [partners.shopify.com](https://partners.shopify.com) and log in (or create a free account)

2. Click **Apps** → **Create app** → **Create app manually**

3. Name it something like "Booth Buddy" and click **Create**

4. In the app settings, configure these URLs:
   - **App URL**: `https://your-domain.com/admin`
   - **Allowed redirection URL(s)**: `https://your-domain.com/auth/callback`

5. Go to **API credentials** and note your:
   - **Client ID** (this is your `SHOPIFY_API_KEY`)
   - **Client secret** (this is your `SHOPIFY_API_SECRET`)

### Step 2: Set Up the Database

You need a PostgreSQL database. Options:

**Local (for development):**
```bash
# macOS with Homebrew
brew install postgresql@16
brew services start postgresql@16
createdb booth_buddy
```

**Cloud options:**
- [Neon](https://neon.tech) - Free tier available
- [Supabase](https://supabase.com) - Free tier available
- [Fly.io Postgres](https://fly.io/docs/postgres/) - Good if deploying to Fly

### Step 3: Clone and Configure

```bash
git clone https://github.com/nervous-net/booth-buddy.git
cd booth-buddy

# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/booth_buddy?schema=public"

# From Shopify Partner Dashboard (Step 1)
SHOPIFY_API_KEY="your_client_id_from_shopify"
SHOPIFY_API_SECRET="your_client_secret_from_shopify"
SHOPIFY_SCOPES="read_customers,write_customers"

# Generate these with: openssl rand -hex 32
ENCRYPTION_KEY="<run openssl rand -hex 32>"
SESSION_SECRET="<run openssl rand -hex 32>"

# Your deployed URL (or http://localhost:3000 for local dev)
APP_URL="https://your-domain.com"

NODE_ENV="production"
```

Generate your security keys:
```bash
echo "ENCRYPTION_KEY: $(openssl rand -hex 32)"
echo "SESSION_SECRET: $(openssl rand -hex 32)"
```

### Step 4: Install and Build

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Build for production
npm run build
```

### Step 5: Deploy

**Option A: Fly.io (Recommended)**

```bash
# Install Fly CLI
brew install flyctl

# Login/signup
fly auth login

# Launch (creates app + postgres)
fly launch

# Set your secrets
fly secrets set \
  SHOPIFY_API_KEY="your_key" \
  SHOPIFY_API_SECRET="your_secret" \
  ENCRYPTION_KEY="your_64_char_key" \
  SESSION_SECRET="your_64_char_key" \
  APP_URL="https://booth-buddy.fly.dev"

# Deploy
fly deploy
```

**Option B: Docker (any host)**

```bash
docker build -t booth-buddy .
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e SHOPIFY_API_KEY="..." \
  -e SHOPIFY_API_SECRET="..." \
  -e ENCRYPTION_KEY="..." \
  -e SESSION_SECRET="..." \
  -e APP_URL="https://your-domain.com" \
  -e NODE_ENV="production" \
  booth-buddy
```

**Option C: Local Development**

```bash
npm run dev
# Runs on http://localhost:3000
```

For local development with Shopify OAuth, you'll need a tunnel:
```bash
# Using ngrok
ngrok http 3000
# Then update APP_URL in .env and Shopify app URLs
```

### Step 6: Install on Your Store

1. Go to: `https://your-domain.com/auth?shop=YOUR-STORE.myshopify.com`

2. Shopify will ask you to authorize the app - click **Install**

3. You'll be redirected to the admin dashboard

### Step 7: Create Your First Event

1. In the admin dashboard, click **Create Event**

2. Fill in:
   - **Event Name**: e.g., "Comic Con 2024"
   - **Tag**: The tag added to customers (e.g., "comic-con-2024")
   - **Start/End Date**: Optional - limits when the QR code works

3. Click **Create** and you'll get a QR code

4. Print the QR code for your booth!

### How It Works

1. Customer scans the QR code at your booth
2. They enter their email address
3. Booth Buddy either:
   - Creates a new customer in Shopify with the event tag, or
   - Adds the event tag to an existing customer
4. You can now segment and market to event attendees in Shopify

### Troubleshooting

**"Permission denied" during OAuth**
- Make sure your Shopify app URLs match your deployed URL exactly
- Check that the callback URL is `https://your-domain.com/auth/callback`

**Database connection errors**
- Verify your `DATABASE_URL` is correct
- Make sure PostgreSQL is running
- For cloud databases, check that your IP is allowlisted

**QR code not working**
- Check that the event is active (within start/end dates if set)
- Verify `APP_URL` matches your actual deployment URL

### Local Development

```bash
# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT
