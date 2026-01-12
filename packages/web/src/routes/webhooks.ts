import { Router } from 'express';
import crypto from 'crypto';
import { getEnv } from '@booth-buddy/shared';
import { prisma } from '../index';

const router = Router();

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyWebhookHmac(rawBody: Buffer, hmacHeader: string): boolean {
  const env = getEnv();
  const hash = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

/**
 * POST /webhooks/shopify - Handle Shopify webhooks
 *
 * Currently handles:
 * - app/uninstalled: Clean up shop data when app is uninstalled
 */
router.post('/shopify', async (req, res) => {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  const topic = req.headers['x-shopify-topic'] as string;
  const shopDomain = req.headers['x-shopify-shop-domain'] as string;

  if (!hmac || !topic || !shopDomain) {
    console.error('Missing webhook headers');
    return res.status(400).send('Missing headers');
  }

  // Verify HMAC - req.body should be raw buffer for webhooks
  const rawBody = req.body as Buffer;
  if (!verifyWebhookHmac(rawBody, hmac)) {
    console.error(`Invalid webhook HMAC for shop: ${shopDomain}`);
    return res.status(401).send('Invalid HMAC');
  }

  console.log(`Received webhook: ${topic} from ${shopDomain}`);

  try {
    switch (topic) {
      case 'app/uninstalled':
        await handleAppUninstalled(shopDomain);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);
    res.status(500).send('Internal error');
  }
});

/**
 * Handle app/uninstalled webhook
 * Deletes shop and all associated data (events, scans)
 */
async function handleAppUninstalled(shopDomain: string): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { shopDomain },
  });

  if (!shop) {
    console.log(`Shop not found for uninstall: ${shopDomain}`);
    return;
  }

  // Delete shop (cascades to events and scans due to onDelete: Cascade)
  await prisma.shop.delete({
    where: { shopDomain },
  });

  console.log(`Deleted shop and all data: ${shopDomain}`);
}

export default router;
