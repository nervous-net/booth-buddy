import axios, { AxiosInstance, AxiosError } from 'axios';
import { decrypt, ShopifyAPIError, SHOPIFY_API_VERSION } from '@booth-buddy/shared';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>;
}

/**
 * Base Shopify API Client
 * Handles authenticated requests to Shopify Admin GraphQL API
 */
export class ShopifyClientBase {
  protected graphql: AxiosInstance;
  protected shopDomain: string;
  protected accessToken: string;

  constructor(shopDomain: string, encryptedAccessToken: string) {
    this.shopDomain = shopDomain;
    this.accessToken = decrypt(encryptedAccessToken);

    // Create axios instance for GraphQL API
    this.graphql = axios.create({
      baseURL: `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.graphql.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle rate limiting with retry
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter as string) * 1000 : 2000;

          console.warn(`Rate limited by Shopify. Retrying after ${waitTime}ms`);
          await this.sleep(waitTime);

          // Retry the request
          return this.graphql.request(error.config!);
        }

        throw error;
      }
    );
  }

  /**
   * Execute a GraphQL query/mutation
   */
  protected async executeGraphQL<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await this.graphql.post<GraphQLResponse<T>>('', {
      query,
      variables,
    });

    if (response.data.errors?.length) {
      const errorMsg = response.data.errors.map(e => e.message).join(', ');
      throw new ShopifyAPIError(`GraphQL error: ${errorMsg}`);
    }

    if (!response.data.data) {
      throw new ShopifyAPIError('No data returned from GraphQL');
    }

    return response.data.data;
  }

  /**
   * Extract numeric ID from Shopify global ID
   */
  protected extractId(globalId: string): string {
    const parts = globalId.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Convert numeric ID to Shopify global ID
   */
  protected toGlobalId(type: string, id: string): string {
    if (id.startsWith('gid://')) {
      return id;
    }
    return `gid://shopify/${type}/${id}`;
  }

  /**
   * Sleep for a specified duration
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle API errors
   */
  protected handleError(error: unknown, message: string): ShopifyAPIError {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      if (status === 401) {
        return new ShopifyAPIError('Shopify access token is invalid or expired', error);
      }

      if (status === 404) {
        return new ShopifyAPIError('Resource not found', error);
      }

      if (status === 422) {
        const errors = data?.errors;
        return new ShopifyAPIError(
          `Validation error: ${JSON.stringify(errors)}`,
          error
        );
      }

      return new ShopifyAPIError(`${message}: ${error.message}`, error);
    }

    return new ShopifyAPIError(message, error);
  }
}
