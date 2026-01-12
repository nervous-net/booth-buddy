import axios from 'axios';
import crypto from 'crypto';
import { encrypt, getEnv, ShopifyAPIError } from '@booth-buddy/shared';

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<string> {
  const env = getEnv();

  try {
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: env.SHOPIFY_API_KEY,
        client_secret: env.SHOPIFY_API_SECRET,
        code,
      }
    );

    const accessToken = response.data.access_token;

    // Encrypt the token before storing
    return encrypt(accessToken);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ShopifyAPIError(
        `Failed to exchange code for token: ${error.message}`,
        error
      );
    }
    throw error;
  }
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(shop: string, redirectUri: string): string {
  const env = getEnv();

  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state: generateNonce(),
  });

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

/**
 * Generate a cryptographically secure random nonce for OAuth state
 */
function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify HMAC signature for incoming requests
 */
export function verifyHmac(query: Record<string, string>, hmac: string): boolean {
  const env = getEnv();

  // Remove hmac from query params
  const params = { ...query };
  delete params.hmac;

  // Sort and build query string
  const message = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  // Calculate HMAC
  const calculatedHmac = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');

  return calculatedHmac === hmac;
}

/**
 * Verify webhook HMAC signature
 */
export function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
  const env = getEnv();

  const calculatedHmac = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  return calculatedHmac === hmacHeader;
}
