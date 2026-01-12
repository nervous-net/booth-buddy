import { CustomerOperations } from './customers';

/**
 * Full Shopify client with all operations
 */
export class ShopifyClient extends CustomerOperations {
  // Inherits all customer operations from CustomerOperations
  // Add additional mixins here as needed
}

/**
 * Create a new Shopify client instance
 */
export function createShopifyClient(shopDomain: string, encryptedAccessToken: string): ShopifyClient {
  return new ShopifyClient(shopDomain, encryptedAccessToken);
}
