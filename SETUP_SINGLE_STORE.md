# Single Store Setup (No Partner Account)

This is the simplest way to run Booth Buddy for one Shopify store. You create a Custom App directly in your store's admin - no Shopify Partner account needed.

## Prerequisites

- Node.js 20+
- PostgreSQL database
- A Shopify store (any plan)

## Step 1: Create a Custom App in Your Store

1. In your Shopify admin, go to **Settings** → **Apps and sales channels**

2. Click **Develop apps** (you may need to enable this first by clicking "Allow custom app development")

3. Click **Create an app**

4. Name it "Booth Buddy" and click **Create app**

5. Click **Configure Admin API scopes** and enable:
   - `read_customers`
   - `write_customers`

6. Click **Save**, then go to **API credentials**

7. Click **Install app** and confirm

8. You'll now see your **Admin API access token** - copy it (you can only see it once!)

Also note your store's myshopify domain (e.g., `my-cool-store.myshopify.com`)

## Step 2: Set Up the Database

**Local:**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb booth_buddy
```

**Or use a cloud database:** [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Fly Postgres](https://fly.io/docs/postgres/)

## Step 3: Clone and Configure

```bash
git clone https://github.com/nervous-net/booth-buddy.git
cd booth-buddy
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/booth_buddy?schema=public"

# From Step 1
SHOPIFY_API_KEY="not-used-for-custom-apps"
SHOPIFY_API_SECRET="not-used-for-custom-apps"
SHOPIFY_SCOPES="read_customers,write_customers"

# Generate with: openssl rand -hex 32
ENCRYPTION_KEY="<generate>"
SESSION_SECRET="<generate>"

APP_URL="https://your-domain.com"
NODE_ENV="production"
```

Generate your keys:
```bash
openssl rand -hex 32  # ENCRYPTION_KEY
openssl rand -hex 32  # SESSION_SECRET
```

## Step 4: Install and Initialize

```bash
npm install
npm run db:generate
npm run db:push
```

Now manually add your store to the database:

```bash
npx prisma studio
```

This opens a web UI. In the **Shop** table, create a new record:

| Field | Value |
|-------|-------|
| shopDomain | `your-store.myshopify.com` |
| accessToken | Your Admin API access token from Step 1 |
| installedAt | Click to set current timestamp |

Save and close Prisma Studio.

## Step 5: Deploy

**Fly.io:**
```bash
fly launch
fly secrets set \
  DATABASE_URL="postgresql://..." \
  ENCRYPTION_KEY="..." \
  SESSION_SECRET="..." \
  APP_URL="https://your-app.fly.dev"
fly deploy
```

**Docker:**
```bash
docker build -t booth-buddy .
docker run -p 8080:8080 \
  -e DATABASE_URL="..." \
  -e ENCRYPTION_KEY="..." \
  -e SESSION_SECRET="..." \
  -e APP_URL="https://your-domain.com" \
  -e NODE_ENV="production" \
  booth-buddy
```

**Local dev:**
```bash
npm run dev
```

## Step 6: Access the Admin

Go to: `https://your-domain.com/admin?shop=your-store.myshopify.com`

You'll see the dashboard where you can create events and generate QR codes.

## Creating Events

1. Click **Create Event**
2. Enter event name and tag (e.g., "Comic Con 2024" → tag: "comic-con-2024")
3. Optionally set start/end dates
4. Print the QR code for your booth

When customers scan and enter their email, they get tagged in your Shopify customer list.

## Troubleshooting

**"Shop not found" error**
- Make sure you added your shop to the database in Step 4
- Check the `shopDomain` matches exactly (include `.myshopify.com`)

**"Invalid access token" errors**
- Custom App tokens don't expire, but make sure you copied it correctly
- The token should start with `shpat_`

**Can't access /admin**
- Add `?shop=your-store.myshopify.com` to the URL

## Differences from Partner App Setup

| Partner App | Custom App (this guide) |
|-------------|------------------------|
| Requires Partner account | No Partner account needed |
| OAuth flow for installation | Manual token configuration |
| Can install on multiple stores | Single store only |
| More complex setup | Simpler setup |

## Rotating Your Access Token

If you need a new token:

1. Go to **Settings** → **Apps** → **Booth Buddy** → **API credentials**
2. Click **Reveal token once** won't work (already revealed)
3. Uninstall and reinstall the app to get a new token
4. Update the token in your database
