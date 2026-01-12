import { z } from 'zod';

// Environment variable schema with validation
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Shopify
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().default('read_customers,write_customers'),

  // Security
  ENCRYPTION_KEY: z.string().min(32), // For encrypting Shopify access tokens
  SESSION_SECRET: z.string().min(32), // For CSRF protection

  // URLs
  APP_URL: z.string().url(), // Public-facing app URL

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

/**
 * Validate and parse environment variables
 * Call this once at app startup
 */
export function validateEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missing}`);
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Must call validateEnv() first
 */
export function getEnv(): Env {
  if (!env) {
    throw new Error('Environment not validated. Call validateEnv() first.');
  }
  return env;
}
