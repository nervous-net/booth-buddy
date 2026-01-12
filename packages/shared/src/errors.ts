/**
 * Shopify API error class
 */
export class ShopifyAPIError extends Error {
  public readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'ShopifyAPIError';
    this.originalError = originalError;

    // Preserve stack trace
    if (originalError instanceof Error && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}
