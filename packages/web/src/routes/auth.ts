import { Router } from 'express';
import { getEnv } from '@booth-buddy/shared';
import { prisma } from '../index';
import { generateAuthUrl, exchangeCodeForToken, verifyHmac } from '../services/shopify/auth';
import { asyncHandler, errors } from '../middleware/error-handler';

const router = Router();

/**
 * GET /auth - Initiate Shopify OAuth
 */
router.get('/', asyncHandler(async (req, res) => {
  const shop = req.query.shop as string;

  if (!shop) {
    throw errors.missingParameter('shop');
  }

  // Validate shop domain format
  if (!shop.endsWith('.myshopify.com')) {
    throw errors.invalidInput('Invalid shop domain');
  }

  const env = getEnv();
  const redirectUri = `${env.APP_URL}/auth/callback`;
  const authUrl = generateAuthUrl(shop, redirectUri);

  res.redirect(authUrl);
}));

/**
 * GET /auth/callback - Handle OAuth callback from Shopify
 */
router.get('/callback', asyncHandler(async (req, res) => {
  const { shop, code, hmac } = req.query as Record<string, string>;

  if (!shop || !code || !hmac) {
    throw errors.missingParameter('shop, code, or hmac');
  }

  // Verify HMAC signature
  const queryParams = { ...req.query } as Record<string, string>;
  if (!verifyHmac(queryParams, hmac)) {
    throw errors.hmacInvalid();
  }

  // Exchange code for access token
  const encryptedAccessToken = await exchangeCodeForToken(shop, code);

  const env = getEnv();

  // Check if shop already exists
  const existingShop = await prisma.shop.findUnique({
    where: { shopDomain: shop },
  });

  if (existingShop) {
    // Update existing shop
    await prisma.shop.update({
      where: { shopDomain: shop },
      data: {
        accessToken: encryptedAccessToken,
        scopes: env.SHOPIFY_SCOPES,
        updatedAt: new Date(),
      },
    });
    console.log(`✅ Updated shop: ${shop}`);
  } else {
    // Create new shop
    await prisma.shop.create({
      data: {
        shopDomain: shop,
        accessToken: encryptedAccessToken,
        scopes: env.SHOPIFY_SCOPES,
      },
    });
    console.log(`✅ Created new shop: ${shop}`);
  }

  // Redirect to admin dashboard
  res.redirect(`/admin?shop=${encodeURIComponent(shop)}`);
}));

export default router;
